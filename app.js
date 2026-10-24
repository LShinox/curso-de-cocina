/* Curso de cocina — app v1. JavaScript puro, sin dependencias, sin red (salvo los archivos de la propia app). */
(function () {
  'use strict';

  /* ------------------------------------------------------------ almacenamiento */
  var KEY = 'cocina.v1';
  var mem = null;
  var DEF_PERFIL = {
    nivel: 'basico', adultos: 2, ninos: 0, bebe: false, bebeMeses: 9, bebeGen: 'la',
    fuego: 'gas', horno: 'electrico', licuadora: true, olla: true, microondas: false, airfryer: false,
    altura: true, sesiones: 3, minutos: 60, gustos: ['todo'], alergias: [], alergiaTxt: ''
  };
  function defaults() {
    return { perfil: null, draft: null, hechas: {}, omitidas: {}, compras: {}, leidoS0: false, tema: 'auto', escala: 100 };
  }
  function cargar() {
    var s = defaults();
    try {
      var t = localStorage.getItem(KEY);
      if (t) { var o = JSON.parse(t); for (var k in o) s[k] = o[k]; }
    } catch (e) { if (mem) s = mem; }
    return s;
  }
  var S = cargar();
  function guardar() {
    mem = S;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento: sigue en memoria */ }
  }
  function P() { return S.perfil || DEF_PERFIL; }

  /* ------------------------------------------------------------ utilidades */
  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function norm(t) { return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function hoyISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  /* texto sobre el bebé según género elegido */
  function bebeT(t) {
    var g = P().bebeGen;
    if (g === 'la') return t;
    var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
    var rep = function (re, a, b) { t = t.replace(re, function (m) { return m.charAt(0) === m.charAt(0).toUpperCase() ? cap(a) : a; }); };
    if (g === 'el') {
      rep(/\bde la bebé(?![A-Za-zÁÉÍÓÚáéíóúñ])/gi, 'del bebé'); rep(/\ba la bebé(?![A-Za-zÁÉÍÓÚáéíóúñ])/gi, 'al bebé');
      rep(/\bla bebé(?![A-Za-zÁÉÍÓÚáéíóúñ])/gi, 'el bebé'); rep(/\buna bebé(?![A-Za-zÁÉÍÓÚáéíóúñ])/gi, 'un bebé');
      rep(/\bella\b/gi, 'él');
      t = t.replace(/\bsentada\b/g, 'sentado').replace(/\bderecha\b/g, 'derecho').replace(/\bvigilada\b/g, 'vigilado');
    } else {
      rep(/\bde la bebé(?![A-Za-zÁÉÍÓÚáéíóúñ])/gi, 'de tu bebé'); rep(/\ba la bebé(?![A-Za-zÁÉÍÓÚáéíóúñ])/gi, 'a tu bebé');
      rep(/\bla bebé(?![A-Za-zÁÉÍÓÚáéíóúñ])/gi, 'tu bebé'); rep(/\buna bebé(?![A-Za-zÁÉÍÓÚáéíóúñ])/gi, 'un bebé');
      rep(/\bella\b/gi, 'tu bebé');
      t = t.replace(/\bsentada\b/g, 'sentado/a').replace(/\bderecha\b/g, 'derecho/a').replace(/\bvigilada\b/g, 'vigilado/a');
    }
    return t;
  }
  function inline(t) {
    t = esc(t);
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    return t;
  }
  function md(t) { return inline(bebeT(t)); }
  function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  function tiempoT(s) { return String(s.tiempo).replace(/\.\s*$/, ''); }

  /* fracciones y escalado */
  var FR = [[0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'], [1, '']];
  function fracStr(v, allowEighths) {
    var ent = Math.floor(v + 1e-9), rest = v - ent, best = FR[0], bd = 9;
    FR.forEach(function (f) {
      if (!allowEighths && (f[0] === 1 / 8 || f[0] === 3 / 8 || f[0] === 5 / 8 || f[0] === 7 / 8)) return;
      var d = Math.abs(rest - f[0]); if (d < bd) { bd = d; best = f; }
    });
    if (best[0] === 1) { ent += 1; best = FR[0]; }
    if (ent === 0 && best[1] === '') return '0';
    return (ent ? String(ent) : '') + best[1];
  }
  var VOL = { taza: 1, cucharada: 1, cucharadita: 1, litro: 1, l: 1 };
  var ENTERO = { diente: 1, rama: 1, ramita: 1, hoja: 1, rebanada: 1, cuadrado: 1, tallo: 1, bolita: 1, rodaja: 1 };
  function redondear(v, u, modo) {
    // devuelve {txt, n} donde n es el valor redondeado (para elegir singular/plural)
    if (u === 'g' || u === 'ml') {
      var r = v < 20 ? Math.round(v) : (v < 100 ? Math.round(v / 5) * 5 : Math.round(v / 10) * 10);
      if (modo === 'compra') r = Math.ceil(v / 10) * 10;
      return { txt: String(Math.max(r, 1)), n: r };
    }
    if (u === 'kg') {
      var k = modo === 'compra' ? Math.ceil(v * 4) / 4 : Math.round(v * 20) / 20;
      return { txt: String(k).replace('.', ','), n: k };
    }
    if (VOL[u]) {
      var a = u === 'cucharadita' || u === 'cucharada';
      var rv;
      if (a) rv = v < 0.2 ? Math.round(v * 8) / 8 : Math.round(v * 4) / 4;   // ⅛ solo para pizcas; después, de ¼ en ¼
      else rv = Math.round(v * 4) / 4;
      if (rv === 0) rv = a ? 1 / 8 : 1 / 4;
      return { txt: fracStr(rv, a), n: rv };
    }
    if (ENTERO[u]) { var e = Math.max(1, Math.round(v)); return { txt: String(e), n: e }; }
    var c;
    if (modo === 'compra') c = Math.max(1, Math.ceil(v - 0.15));   // 0,15: una cucharadita de jugo no obliga a comprar otro limón
    else c = v < 1 ? Math.max(0.25, Math.round(v * 4) / 4) : Math.round(v * 2) / 2;   // ¼ de cebolla sigue siendo ¼, no ½
    return { txt: fracStr(c, false), n: c };
  }
  /* devuelve [texto, valor redondeado]; el valor sirve para concordar los participios que siguen */
  function fmtParteN(p, f, modo) {
    var ff = p.fix ? 1 : f;
    if (p.u === '' && !p.s && p.fix) return [fracStr(p.q, false), p.q];   // fracción fija (p. ej. ⅔ de la olla)
    if (modo === 'compra' && p.q2 == null && (p.u === 'g' || p.u === 'ml') && p.q * ff >= 1000) {
      var k = Math.ceil(p.q * ff / 250) / 4, ks = String(k).replace('.', ',');
      return [p.u === 'g' ? ks + ' kg' : ks + (k > 1 ? ' litros' : ' litro'), 2];
    }
    if (p.u === 'kg' && p.q * ff < 1) return [Math.round(p.q * ff * 1000 / 10) * 10 + ' g', 2];
    var a = redondear(p.q * ff, p.u, modo);
    var txt = a.txt, n = a.n;
    if (p.q2 != null) { var b = redondear(p.q2 * ff, p.u, modo); txt += '-' + b.txt; n = b.n; }
    if (p.s || p.p) txt += ' ' + (n > 1 ? p.p : p.s);
    return [txt, n];
  }
  function fmtParte(p, f, modo) { return fmtParteN(p, f, modo)[0]; }
  /* concordancia en número de los participios que siguen a un conteo: "1 diente de ajo picado" / "3 dientes de ajo picados" */
  var CONC_PART = /\b(lavad|picad|pelad|rallad|machacad|remojad|desmenuzad|cortad|batid)([oa])s?\b((?:\s+muy)?\s+(?:fin|enter)[oa]s?\b)?/g;
  var CONC_PEQ = /\b(ajo|zucchini)(\s+)pequeñ([oa])s?\b/g;
  function concuerda(t, plural) {
    var s = plural ? 's' : '';
    t = t.replace(CONC_PART, function (m, base, g, rest, off, whole) {
      if (whole.slice(Math.max(0, off - 6), off) === 'pluma ') return m;   // "pluma lavada" concuerda con pluma, no con la cebolla
      return base + g + s + (rest ? rest.replace(/(fin|enter)([oa])s?/, '$1$2' + s) : '');
    });
    return t.replace(CONC_PEQ, function (m, a, sp, g) { return a + sp + 'pequeñ' + g + s; });
  }
  var CONTABLE = { '': 1, diente: 1, rebanada: 1, hoja: 1, rama: 1, ramita: 1, tallo: 1, rodaja: 1, cuadrado: 1 };
  function partes(parts, f, modo) {
    var cur = null;
    return parts.map(function (p) {
      if (typeof p === 'string') return inline(cur === null ? p : concuerda(p, cur > 1));
      var r = fmtParteN(p, f, modo);
      if (CONTABLE[p.u] && (p.u !== '' || p.s)) cur = r[1];
      return '<span class="cant">' + esc(r[0]) + '</span>';
    }).join('');
  }
  function factor() { var p = P(); return Math.max(0.25, (p.adultos + 0.5 * p.ninos) / 2); }
  /* los tiempos NO se escalan: con más de 4 personas se avisa de forma discreta */
  function notaTiempos() {
    var p = P();
    return (p.adultos + p.ninos > 4) ? '<p class="nota-t">Con más cantidad, los tiempos pueden alargarse: guíate por las señales de cada paso.</p>' : '';
  }
  function fmtF(f) { return String(Math.round(f * 100) / 100).replace('.', ','); }

  /* ------------------------------------------------------------ datos */
  var D = null, SES = [], REG = [], BYID = {}, SEM = {};
  var ICON = {
    hoy: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8"/>',
    curso: '<path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v13H7.5A2.5 2.5 0 0 1 5 17.5z"/><path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H18"/><path d="M9 8.5h5"/>',
    compras: '<path d="M3.5 5h2.2l2 10.5h9.6l2-7.5H7"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/>',
    ajustes: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
    atras: '<path d="M15 5l-7 7 7 7"/>',
    cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
    ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    sig: '<path d="M9 5l7 7-7 7"/>'
  };
  function ico(n, cls) { return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + '</svg>'; }

  var EQ_NOM = { olla_presion: 'olla de presión', horno: 'horno', licuadora: 'licuadora' };
  var ALER = [['huevo', 'Huevo'], ['lacteos', 'Leche y lácteos'], ['trigo', 'Trigo / gluten'], ['mani', 'Maní'], ['frutos_secos', 'Frutos secos'],
    ['soya', 'Soya'], ['pescado', 'Pescado'], ['mariscos', 'Mariscos'], ['ajonjoli', 'Ajonjolí'], ['coco', 'Coco']];
  var ALER_NOM = {}; ALER.forEach(function (a) { ALER_NOM[a[0]] = a[1]; });
  var NIVELES = [
    ['cero', 'Desde cero', 'Casi no he cocinado.'],
    ['basico', 'Huevos y arroz básicos', 'Sé hacer un huevo y un arroz sencillo.'],
    ['defiendo', 'Me defiendo', 'Cocino platos sencillos sin receta.'],
    ['intermedio', 'Intermedio', 'Sigo recetas con confianza y quiero más técnica.']
  ];
  var GUSTOS = [['todo', 'De todo'], ['ec', 'Cocina ecuatoriana'], ['int', 'Cocina internacional'], ['sin_cerdo', 'Sin cerdo'], ['vegetariano', 'Vegetariano'], ['sin_mariscos', 'Sin mariscos']];

  function tiene(id) {
    var p = P();
    if (id === 'horno') return p.horno !== 'no';
    if (id === 'licuadora') return !!p.licuadora;
    if (id === 'olla_presion') return !!p.olla;
    return true;
  }

  /* ------------------------------------------------------------ plan */
  function sPorSem() { return P().sesiones || 3; }
  function planSem(s) { return Math.floor((s.num - 1) / sPorSem()) + 1; }
  function totalSemPlan() { return Math.ceil(REG.length / sPorSem()); }
  function pendiente(s) { return !S.hechas[s.id] && !S.omitidas[s.id]; }
  function proxima() { for (var i = 0; i < REG.length; i++) if (pendiente(REG[i])) return REG[i]; return null; }
  function nHechas() { return REG.filter(function (s) { return S.hechas[s.id]; }).length; }

  function nivelNota() {
    var n = P().nivel;
    if (n === 'cero') return { txt: 'Desde cero: empieza por la Semana 0 y repite la Semana 2 (huevos y arroz) antes de seguir.', link: '#/semana/2', lt: 'Ver Semana 2' };
    if (n === 'basico') return { txt: 'El curso está escrito para tu nivel (huevos y arroz básicos): sigue las sesiones en orden.' };
    return { txt: 'Me defiendo o Intermedio: puedes saltar a la Semana 3. Lee igual la Semana 0, que es de seguridad.', saltar: true };
  }

  /* ------------------------------------------------------------ avisos por sesión */
  function corto(t) { t = String(t); return t.length > 60 ? t.slice(0, 57).replace(/[\s,(]+$/, '') + '…' : t; }
  function avisos(s) {
    var p = P(), out = [];
    var tg = s.tags || {};
    (p.alergias || []).forEach(function (k) {
      if (tg[k]) out.push({ k: 'alergia', t: 'Alergia a ' + ALER_NOM[k].toLowerCase() + ': lleva ' + corto(tg[k].ej.toLowerCase()) + (tg[k].opcional ? ' (opcional en la receta)' : '') });
    });
    var libres = String(p.alergiaTxt || '').split(/[,;\n]/).map(function (x) { return norm(x.trim()); }).filter(function (x) { return x.length > 2; });
    libres.forEach(function (w) { if (norm(s.ingPlano).indexOf(w) >= 0) out.push({ k: 'alergia', t: 'Tu alergia "' + w + '" aparece en los ingredientes' }); });
    var g = p.gustos || [];
    if (g.indexOf('sin_cerdo') >= 0 && tg.cerdo) out.push({ k: 'gusto', t: 'Tiene cerdo (' + corto(tg.cerdo.ej.toLowerCase()) + ')' + (tg.cerdo.opcional ? ', opcional' : '') });
    if (g.indexOf('vegetariano') >= 0 && tg.carne) out.push({ k: 'gusto', t: 'No es vegetariana (' + corto(tg.carne.ej.toLowerCase()) + ')' + (tg.carne.opcional ? ', opcional' : '') });
    if (g.indexOf('sin_mariscos') >= 0 && tg.mariscos) out.push({ k: 'gusto', t: 'Tiene mariscos (' + corto(tg.mariscos.ej.toLowerCase()) + ')' });
    return out;
  }
  function equipoFaltante(s) {
    var out = [];
    (s.equipo || []).forEach(function (e) {
      if (tiene(e.id)) return;
      var nom = EQ_NOM[e.id];
      var t = e.nivel === 'opcional' ? 'Opcional: ' + nom : 'Necesita: ' + nom + (e.nivel === 'parcial' ? ' (solo para ' + e.parte + ')' : '');
      var alt = e.alt ? 'Alternativa: ' + e.alt : 'Sin alternativa todavía en el curso.';
      out.push({ t: t, alt: alt, nivel: e.nivel });
    });
    return out;
  }
  function chips(s, compacto) {
    var h = '';
    equipoFaltante(s).forEach(function (e) { h += '<span class="chip chip-eq' + (e.nivel === 'opcional' ? ' suave' : '') + '">' + esc(e.t) + '</span>'; });
    avisos(s).forEach(function (a) { h += '<span class="chip chip-' + a.k + '">' + (a.k === 'alergia' ? 'Atención: ' : 'Aviso: ') + esc(a.t) + '</span>'; });
    if (s.max && s.max > P().minutos * 1.0 && !compacto) h += '<span class="chip chip-t">Dura ~' + s.max + ' min (tienes ' + P().minutos + ')</span>';
    var gu = P().gustos || [];
    if (gu.indexOf(s.cocina) >= 0 && s.cocina !== 'mixta') h += '<span class="chip chip-ok">' + (s.cocina === 'ec' ? 'Ecuatoriana' : 'Internacional') + ': coincide con tus gustos</span>';
    return h;
  }

  /* ------------------------------------------------------------ bloques */
  function lista(b) {
    var tag = b.t === 'ol' ? 'ol' : 'ul';
    return '<' + tag + ' class="lista-txt">' + b.items.map(function (it) {
      if (typeof it === 'string') return '<li>' + md(it) + '</li>';
      return '<li>' + md(it.x) + it.sub.map(lista).join('') + '</li>';
    }).join('') + '</' + tag + '>';
  }
  /* ilustraciones propias (SVG en línea para que sigan el tema claro/oscuro) y fotos de platos */
  var svgCache = {};
  function ilusHtml(arr) {
    return (arr || []).map(function (i) {
      return '<figure class="ilu"><div class="ilu-in" data-svg="' + esc(i.f) + '" role="img" aria-label="' + esc(i.alt) + '" style="aspect-ratio:' + i.w + '/' + i.h + '"></div>' +
        (i.pie ? '<figcaption>' + esc(i.pie) + '</figcaption>' : '') + '</figure>';
    }).join('');
  }
  function cargarIlus() {
    Array.prototype.forEach.call(document.querySelectorAll('.ilu-in[data-svg]'), function (el) {
      var u = el.getAttribute('data-svg');
      if (svgCache[u]) { el.innerHTML = svgCache[u]; return; }
      fetch(u).then(function (r) { return r.text(); }).then(function (t) {
        t = t.replace(/<title>[^<]*<\/title>/, '').replace(/ width="\d+" height="\d+"/, '').replace(' role="img"', ' aria-hidden="true" focusable="false"');
        svgCache[u] = t;
        if (el.isConnected) el.innerHTML = t;
      }).catch(function () { /* sin la ilustración la sesión se lee igual: el texto lo dice todo */ });
    });
  }
  function fotoHtml(s) {
    var f = s.foto; if (!f) return '';
    return '<figure class="foto"><img src="' + esc(f.f) + '" alt="' + esc(f.alt) + '" width="' + f.w + '" height="' + f.h + '" loading="lazy" decoding="async">' +
      '<figcaption>Foto de referencia de Unsplash (' + esc(f.autor) + '); tu plato puede verse distinto. <a href="#/creditos">Créditos</a></figcaption></figure>';
  }
  function bloque(b) {
    switch (b.t) {
      case 'ilu': return ilusHtml([b.ilu]);
      case 'p': return '<p>' + md(b.x) + '</p>';
      case 'sub': return '<h4 class="sub">' + md(b.x) + '</h4>';
      case 'h3': return '<h3 class="h3">' + md(b.x) + '</h3>';
      case 'h4': return '<h4 class="sub">' + md(b.x) + '</h4>';
      case 'quote': return '<blockquote class="aviso-b">' + md(b.x) + '</blockquote>';
      case 'ul': case 'ol': return lista(b);
      case 'table':
        return '<div class="tabla-wrap"><table><thead><tr>' + b.head.map(function (c) { return '<th>' + md(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          b.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + md(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    }
    return '';
  }
  function bloques(arr) { return (arr || []).map(bloque).join(''); }
  function detalles(titulo, cuerpo, abierto, cls) {
    return '<details class="desp ' + (cls || '') + '"' + (abierto ? ' open' : '') + '><summary><span>' + md(titulo) + '</span>' + ico('sig', 'flecha') + '</summary><div class="desp-c">' + cuerpo + '</div></details>';
  }

  /* ------------------------------------------------------------ enrutador */
  var maxIdx = 0, scrollPos = {}, navPush = false, lastHash = '';
  function ruta() {
    var h = location.hash.replace(/^#\/?/, '');
    var seg = h ? h.split('/') : [];
    return seg;
  }
  function ir(h) { location.hash = h; }
  function profundidad() { return (history.state && history.state.i) || 0; }
  function volver(padre) { if (profundidad() > 0) history.back(); else location.replace(padre); }

  var vista = null, tabbar = null, barraEl = null;
  function setTab(nombre) {
    Array.prototype.forEach.call(tabbar.querySelectorAll('a'), function (a) {
      var on = a.getAttribute('data-tab') === nombre;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function pagina(opts, cuerpo) {
    // opts: titulo, atras (hash padre), sub, extra (html en cabecera)
    var barra = '<div class="barra" id="barra"><div class="barra-in">' +
      (opts.atras ? '<button class="btn-atras" data-act="atras" data-padre="' + esc(opts.atras) + '" aria-label="Atrás">' + ico('atras') + '<span>Atrás</span></button>' : '<span class="barra-vacio"></span>') +
      '<span class="barra-t" id="barraT">' + esc(opts.titulo) + '</span><span class="barra-vacio"></span></div></div>';
    return barra + '<main class="vista-in" id="main" tabindex="-1"><header class="tit"><h1 id="h1">' + esc(opts.titulo) + '</h1>' +
      (opts.sub ? '<p class="sub-t">' + opts.sub + '</p>' : '') + '</header>' + cuerpo + '</main>';
  }

  var rutas = {};
  var obs = null;
  function render() {
    var seg = ruta();
    var h = location.hash;
    // índice de historial
    if (!(history.state && typeof history.state.i === 'number')) { maxIdx += 1; try { history.replaceState({ i: maxIdx }, '', location.href); } catch (e) { /* ignorar */ } }
    else maxIdx = Math.max(maxIdx, history.state.i);
    if (lastHash) scrollPos[lastHash] = window.scrollY;
    lastHash = h;

    if (!S.perfil && seg[0] !== 'bienvenida') { location.replace('#/bienvenida/0'); return; }
    var nombre = seg[0] || 'hoy';
    var fn = rutas[nombre] || rutas.hoy;
    var oculta = (nombre === 'bienvenida' || nombre === 'cocinando');
    tabbar.hidden = oculta;
    document.body.classList.toggle('sin-tab', oculta);
    if (nombre !== 'cocinando') wake(false);
    var tab = { hoy: 'hoy', curso: 'curso', semana: 'curso', guia: 'curso', inicio: 'curso', sesion: 'curso', compras: 'compras', ajustes: 'ajustes', creditos: 'ajustes' }[nombre] || 'hoy';
    setTab(tab);
    var html = fn(seg);
    vista.innerHTML = html;
    document.title = (($('#h1') || {}).textContent || 'Curso de cocina') + ' · Cocina';
    if (obs) obs.disconnect();
    var h1 = $('#h1'), barra = $('#barra');
    if (h1 && barra && 'IntersectionObserver' in window) {
      obs = new IntersectionObserver(function (en) { barra.classList.toggle('visible', !en[0].isIntersecting); }, { rootMargin: '-8px 0px 0px 0px' });
      obs.observe(h1);
    }
    cargarIlus();
    if (fn.post) fn.post(seg);
    var y =(!navPush && scrollPos[h]) ? scrollPos[h] : 0;
    navPush = false;
    window.scrollTo(0, y);
  }

  /* ------------------------------------------------------------ componentes */
  function filaSesion(s, opts) {
    opts = opts || {};
    var hecha = S.hechas[s.id], om = S.omitidas[s.id];
    var marca = hecha ? '<span class="marca hecha" aria-label="Hecha">' + ico('ok') + '</span>' : (om ? '<span class="marca omit" aria-label="Omitida">–</span>' : '<span class="marca">' + (s.bonus ? '★' : s.id) + '</span>');
    var sub = (s.bonus ? 'Bonus' : 'Sesión ' + s.id) + ' · ' + esc(D.semanas[s.semana - 1].titulo) + ' · ' + esc(s.tiempo.replace(/\s*\(.*$/, '').replace(/\.\s*$/, ''));
    return '<a class="fila' + (opts.destacada ? ' destacada' : '') + '" href="#/sesion/' + s.id + '">' + marca +
      '<span class="fila-t"><strong>' + esc(s.titulo) + '</strong><small>' + sub + '</small>' +
      (opts.chips === false ? '' : '<span class="chips">' + chips(s, true) + '</span>') + '</span>' + ico('sig', 'sig') + '</a>';
  }
  function barraProgreso(a, b, etiqueta) {
    var pct = b ? Math.round(a * 100 / b) : 0;
    return '<div class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="' + b + '" aria-valuenow="' + a + '" aria-label="' + esc(etiqueta) + '"><span style="width:' + pct + '%"></span></div>';
  }
  /* ---- lista de compras según el PLAN de la persona ----
     Cada sesión trae su propia lista (s.compra, generada de las recetas). La "semana" de compras es
     la semana del plan (2, 3 o 4 sesiones): se suman las cantidades de esas sesiones cuando la unidad es la misma. */
  var SEC_ORD = ['Verdulería', 'Carnes, pescados, lácteos y huevos', 'Abarrotes'];
  function semanaCompras(s) { return s ? planSem(s) : 1; }
  function listaId(n) { return n === 'bonus' ? 'bonus' : sPorSem() + '-' + n; }
  function listaCompras(n) {
    var ses = n === 'bonus' ? [BYID.bonus] : REG.filter(function (s) { return planSem(s) === n; });
    var f = factor(), acc = {}, desp = {}, planos = {}, extra = [], notas = [], porSec = {};
    SEC_ORD.forEach(function (t) { porSec[t] = []; });
    ses.forEach(function (s) {
      var c = s.compra;
      c.items.forEach(function (e) {
        var a = acc[e.k];
        if (!a) a = acc[e.k] = { e: e, q: 0 };
        a.q = e.kind === 'fijo' ? 1 : a.q + e.q;
      });
      c.desp.forEach(function (d) { desp[d] = 1; });
      c.planos.forEach(function (p) { if (!planos[p.base] || /opcional/.test(planos[p.base].t)) planos[p.base] = p; });
      c.extra.forEach(function (x) { if (extra.indexOf(x.t) < 0) extra.push(x.t); });
      var sm = D.semanas[s.semana - 1].compras;
      (sm.notas || []).forEach(function (t) {
        var ids = t.match(/\b\d+\.\d+\b/g);
        var aplica = !ids || ids.some(function (i) { return ses.some(function (x) { return x.id === i; }); });
        if (aplica && notas.indexOf(t) < 0) notas.push(t);
      });
    });
    var claves = {};
    Object.keys(acc).forEach(function (k) {
      var a = acc[k], e = a.e, html;
      if (e.opc && acc[k.replace(/\|opc$/, '')]) return;   // lo opcional no se repite si ya se compra
      claves[e.key] = 1;
      if (e.kind === 'ajo') {
        var cab = Math.max(1, Math.ceil(a.q * f / 10 - 1e-9));
        html = '<span class="cant">' + cab + ' ' + (cab > 1 ? 'cabezas' : 'cabeza') + '</span> de ajo' + (e.opc ? ' (opcional)' : '');
      } else {
        var parts = JSON.parse(JSON.stringify(e.parts));
        if (e.kind === 'suma') parts[0].q = a.q;
        html = partes(parts, f, 'compra');
      }
      porSec[e.sec].push({ k: k, o: e.o, opc: e.opc, html: html });
    });
    Object.keys(porSec).forEach(function (t) { porSec[t].sort(function (x, y) { return (x.opc - y.opc) || (x.o - y.o); }); });
    Object.keys(planos).forEach(function (b) {
      if (claves[b]) return;
      porSec[planos[b].sec].push({ k: 'pl.' + b, o: 200, html: esc(planos[b].t) + ' <small class="para-servir">(para servir)</small>' });
    });
    var dA = D.despensa.filter(function (d) { return desp[d]; });
    var dAbar = dA.filter(function (d) { return d !== 'mantequilla'; });
    if (desp.mantequilla) porSec[SEC_ORD[1]].push({ k: 'desp.mantequilla', o: 210, html: 'Mantequilla' });
    extra.forEach(function (t, i) { porSec[SEC_ORD[2]].push({ k: 'x.' + i, o: 220, html: esc(t) }); });
    if (dAbar.length) porSec[SEC_ORD[2]].push({ k: 'desp', o: 230, html: '<strong>Despensa básica:</strong> ' + esc(dAbar.join(', ')) + ' <small class="para-servir">(revisa lo que ya tienes)</small>' });
    var secs = SEC_ORD.map(function (t) { return { titulo: t, rows: porSec[t] }; }).filter(function (x) { return x.rows.length; });
    return { id: listaId(n), ses: ses, secs: secs, notas: notas };
  }
  function progCompras(n) {
    var L = listaCompras(n), tot = 0, ok = 0;
    L.secs.forEach(function (sec) { sec.rows.forEach(function (r) { tot++; if (S.compras['c.' + L.id + '.' + r.k]) ok++; }); });
    return [ok, tot];
  }

  /* ------------------------------------------------------------ HOY */
  rutas.hoy = function () {
    var p = P(), nx = proxima(), h = '';
    var nota = nivelNota();
    if (!S.leidoS0) {
      h += '<section class="tarjeta destac"><h2>Antes de empezar</h2><p>La <strong>Semana 0</strong> es de seguridad, equipo y despensa. Léela entera antes de tu primera sesión (30-40 minutos, en dos veces).</p><a class="btn pri" href="#/guia">Leer la Semana 0</a></section>';
    }
    if (nx) {
      var w = planSem(nx);
      h += '<section class="tarjeta proxima"><p class="etq">Próxima sesión · Semana ' + w + ' de ' + totalSemPlan() + ' de tu plan</p>' +
        '<h2>' + esc(nx.titulo) + '</h2>' +
        '<p class="meta">Sesión ' + nx.id + ' · ' + esc(D.semanas[nx.semana - 1].titulo) + ' · ' + esc(tiempoT(nx)) + '</p>' +
        '<p>' + md(cap(nx.objetivo)) + '</p><div class="chips">' + chips(nx) + '</div>' +
        '<div class="btns"><a class="btn pri" href="#/cocinando/' + nx.id + '">Cocinar</a><a class="btn sec" href="#/sesion/' + nx.id + '">Ver sesión</a></div></section>';
    } else {
      h += '<section class="tarjeta destac"><h2>Curso completado</h2><p>Hiciste las ' + REG.length + ' sesiones. Repite tus favoritas hasta cocinarlas sin mirar la receta.</p>' +
        (BYID.bonus && !S.hechas.bonus ? '<a class="btn pri" href="#/sesion/bonus">Hacer el bonus: tacos</a>' : '') + '</section>';
    }
    var n = nHechas();
    h += '<section class="tarjeta"><div class="prog-f"><strong>' + n + ' de ' + REG.length + '</strong><span>sesiones hechas</span></div>' + barraProgreso(n, REG.length, 'Progreso del curso') + '</section>';
    if (nx) {
      var w2 = planSem(nx);
      var lista2 = REG.filter(function (s) { return planSem(s) === w2; });
      h += '<h2 class="gh">Esta semana del plan</h2><div class="grupo">' + lista2.map(function (s) { return filaSesion(s, { chips: false }); }).join('') + '</div>';
      var cn = semanaCompras(nx), pc = progCompras(cn);
      h += '<h2 class="gh">Compras</h2><div class="grupo"><a class="fila" href="#/compras/' + cn + '"><span class="fila-t"><strong>Lista de la Semana ' + cn + ' de tu plan</strong><small>' + pc[0] + ' de ' + pc[1] + ' marcados · sesiones ' + lista2.map(function (s) { return s.id; }).join(', ') + '</small></span>' + ico('sig', 'sig') + '</a></div>';
    }
    h += '<h2 class="gh">Tu nivel</h2><section class="tarjeta"><p>' + esc(nota.txt) + '</p>';
    if (nota.link) h += '<a class="btn sec" href="' + nota.link + '">' + nota.lt + '</a>';
    if (nota.saltar) {
      var yaSalto = REG.filter(function (s) { return s.semana <= 2; }).every(function (s) { return !pendiente(s); });
      if (!yaSalto) h += '<button class="btn sec" data-act="saltar">Saltar a la Semana 3 (marca 1 y 2 como omitidas)</button>';
    }
    h += '</section>';
    return pagina({ titulo: 'Hoy' }, h);
  };

  /* ------------------------------------------------------------ CURSO */
  var vistaCurso = 'plan';
  rutas.curso = function (seg) {
    if (seg[1] === 'temas') vistaCurso = 'temas'; else if (seg[1] === 'plan') vistaCurso = 'plan';
    var h = '<div class="seg" role="tablist"><a role="tab" aria-selected="' + (vistaCurso === 'plan') + '" class="' + (vistaCurso === 'plan' ? 'on' : '') + '" href="#/curso/plan" data-replace="1">Mi plan</a>' +
      '<a role="tab" aria-selected="' + (vistaCurso === 'temas') + '" class="' + (vistaCurso === 'temas' ? 'on' : '') + '" href="#/curso/temas" data-replace="1">Por temas</a></div>';
    h += '<h2 class="gh">Para empezar</h2><div class="grupo">' +
      '<a class="fila" href="#/inicio"><span class="fila-t"><strong>Cómo funciona el curso</strong><small>Plan, reglas básicas, aviso médico</small></span>' + ico('sig', 'sig') + '</a>' +
      '<a class="fila" href="#/guia"><span class="marca' + (S.leidoS0 ? ' hecha' : '') + '">' + (S.leidoS0 ? ico('ok') : '0') + '</span><span class="fila-t"><strong>Semana 0 · Antes de empezar</strong><small>Seguridad, equipo, despensa' + (S.leidoS0 ? ' · leída' : ' · leer primero') + '</small></span>' + ico('sig', 'sig') + '</a></div>';
    if (vistaCurso === 'plan') {
      var tot = totalSemPlan();
      for (var w = 1; w <= tot; w++) {
        var ls = REG.filter(function (s) { return planSem(s) === w; });
        var hechas = ls.filter(function (s) { return S.hechas[s.id]; }).length;
        h += '<h2 class="gh">Semana ' + w + ' de tu plan <span class="gh-n">' + hechas + '/' + ls.length + '</span></h2><div class="grupo">' + ls.map(function (s) { return filaSesion(s); }).join('') + '</div>';
      }
      if (BYID.bonus) h += '<h2 class="gh">Extra</h2><div class="grupo">' + filaSesion(BYID.bonus) + '</div>';
      h += '<p class="pie">' + sPorSem() + ' sesiones por semana · ' + tot + ' semanas. Se cambia en Ajustes.</p>';
    } else {
      h += '<h2 class="gh">Las 10 semanas</h2><div class="grupo">' + D.semanas.map(function (sm) {
        var ls = sm.sesiones.filter(function (i) { return i !== 'bonus'; });
        var hh = ls.filter(function (i) { return S.hechas[i]; }).length;
        return '<a class="fila" href="#/semana/' + sm.n + '"><span class="marca' + (hh === ls.length ? ' hecha' : '') + '">' + (hh === ls.length ? ico('ok') : sm.n) + '</span><span class="fila-t"><strong>Semana ' + sm.n + ' · ' + esc(sm.titulo) + '</strong><small>' + hh + ' de ' + ls.length + ' hechas</small></span>' + ico('sig', 'sig') + '</a>';
      }).join('') + '</div>';
    }
    return pagina({ titulo: 'Curso' }, h);
  };

  rutas.semana = function (seg) {
    var n = parseInt(seg[1], 10), sm = D.semanas[n - 1];
    if (!sm) return rutas.curso(['curso']);
    var h = '';
    h += bloques(sm.intro);
    sm.antes.forEach(function (e) { h += detalles(e.titulo, bloques(e.bloques), true); });
    h += '<h2 class="gh">Sesiones</h2><div class="grupo">' + sm.sesiones.map(function (i) { return filaSesion(BYID[i]); }).join('') + '</div>';
    sm.despues.forEach(function (e) { h += detalles(e.titulo, bloques(e.bloques), false); });
    var s1 = BYID[sm.sesiones[0]], wp = s1.bonus ? 'bonus' : planSem(s1), pcs = progCompras(wp);
    h += '<h2 class="gh">Compras</h2><div class="grupo"><a class="fila" href="#/compras/' + wp + '"><span class="fila-t"><strong>' + (wp === 'bonus' ? 'Lista de compras del bonus' : 'Lista de compras de la Semana ' + wp + ' de tu plan') + '</strong><small>' + (wp === 'bonus' ? '' : 'Incluye la sesión ' + s1.id + ' · ') + pcs[0] + ' de ' + pcs[1] + ' marcados</small></span>' + ico('sig', 'sig') + '</a></div>';
    if (n > 1 || n < 10) {
      h += '<div class="grupo nav2">' + (n > 1 ? '<a class="fila" href="#/semana/' + (n - 1) + '">‹ Semana ' + (n - 1) + '</a>' : '') + (n < 10 ? '<a class="fila" href="#/semana/' + (n + 1) + '">Semana ' + (n + 1) + ' ›</a>' : '') + '</div>';
    }
    return pagina({ titulo: 'Semana ' + n, sub: esc(sm.titulo), atras: '#/curso' }, h);
  };

  rutas.inicio = function () {
    var i = D.inicio;
    var h = '<p class="lead">' + md(i.intro) + '</p>' + bloques(i.bloques);
    h += '<h2 class="gh">Las 10 semanas</h2><div class="grupo">' + D.semanas.map(function (sm) {
      return '<a class="fila" href="#/semana/' + sm.n + '"><span class="marca">' + sm.n + '</span><span class="fila-t"><strong>' + esc(sm.titulo) + '</strong><small>' + sm.sesiones.map(function (id) { return id === 'bonus' ? 'Bonus' : id; }).join(' · ') + '</small></span>' + ico('sig', 'sig') + '</a>';
    }).join('') + '</div>';
    return pagina({ titulo: 'Cómo funciona', atras: '#/curso' }, h);
  };

  rutas.guia = function () {
    var g = D.guia, p = P(), h = bloques(g.intro);
    g.secciones.forEach(function (sec, i) {
      if (sec.bebe && !p.bebe) return;
      var abierto = (i === 0) || (sec.titulo.indexOf('altura') >= 0 && p.altura);
      var extra = '';
      if (sec.titulo.indexOf('altura') >= 0 && !p.altura) extra = '<p class="nota-p">Tu perfil dice que no cocinas en altura: los tiempos del curso están ajustados a ~2.800 m; a nivel del mar pueden ser más cortos. Prueba antes de dar por listo.</p>';
      if (sec.gas) extra = (p.fuego !== 'gas' ? '<p class="nota-p">Tu cocina no es a gas: la parte de "Gas y fuego" no aplica, pero el resto (cuchillo, aceite caliente, contaminación cruzada, temperaturas, conservación) sí. Fuego medio = nivel medio de tu cocina.</p>' : '');
      h += detalles(sec.titulo, extra + bloques(sec.bloques), abierto);
    });
    h += '<div class="acciones-pie">' + (S.leidoS0 ? '<p class="ok-t">Marcada como leída.</p><button class="btn sec" data-act="s0" data-v="0">Quitar la marca</button>' : '<button class="btn pri" data-act="s0" data-v="1">Marcar la Semana 0 como leída</button>') + '</div>';
    return pagina({ titulo: 'Semana 0', sub: 'Antes de empezar', atras: '#/curso' }, h);
  };

  /* ------------------------------------------------------------ SESIÓN */
  function stageBebe(s) {
    var p = P(), m = p.bebeMeses, b = s.bebe, h = '';
    var titulo = bebeT('Para la bebé');
    if (m < 6) {
      return '<section class="tarjeta bebe"><h2>' + esc(titulo) + '</h2><p>Antes de los 6 meses la alimentación es solo leche (materna o fórmula): nada de este curso aplica. Consulta con tu pediatra.</p></section>';
    }
    var enc = m >= 12 ? 'Desde 1 año' : (m >= 9 ? '9-12 meses' : 'Referencia: 9-12 meses');
    h += '<section class="tarjeta bebe"><h2>' + esc(titulo) + ' <span class="etapa">' + enc + '</span></h2>';
    if (m < 9) h += '<p class="nota-p">Tu bebé tiene ' + m + ' meses: el curso está escrito desde los 9 meses. Esto es solo una referencia; el pediatra decide qué y cuándo.</p>';
    if (m >= 12) {
      if (b.desde1.length) h += '<ul class="lista-txt">' + b.desde1.map(function (t) { return '<li><strong>Desde que cumpla 1 año:</strong> ' + md(t) + '</li>'; }).join('') + '</ul>';
      if (b.comun.length) h += '<ul class="lista-txt">' + b.comun.map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ul>';
    } else {
      h += '<ul class="lista-txt">' + b.ahora.map(function (t) { return '<li><strong>' + (m >= 9 ? 'Ahora · 9-12 meses:' : '9-12 meses:') + '</strong> ' + md(t) + '</li>'; }).join('') + b.comun.map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ul>';
      if (b.desde1.length) h += '<details class="mini"><summary>Cuando cumpla 1 año</summary><ul class="lista-txt">' + b.desde1.map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ul></details>';
    }
    (b.extra || []).forEach(function (x) { h += bloque(x); });
    h += '<p class="pie-b">Lo que diga tu pediatra manda.</p></section>';
    return h;
  }
  function ingredientesHtml(r, f) {
    var h = '';
    r.ingredientes.forEach(function (g) {
      if (g.titulo) h += '<h4 class="sub">' + md(g.titulo) + '</h4>';
      h += '<ul class="ing">' + g.items.map(function (it) { return '<li>' + partes(it.parts, f, 'receta') + '</li>'; }).join('') + '</ul>';
    });
    return h;
  }
  rutas.sesion = function (seg) {
    var s = BYID[seg[1]];
    if (!s) return rutas.curso(['curso']);
    var p = P(), f = factor(), h = '';
    var sm = D.semanas[s.semana - 1];
    h += '<p class="meta2">' + (s.bonus ? 'Bonus' : 'Sesión ' + s.id + ' de 30') + ' · ' + esc(sm.titulo) + '</p>';
    h += fotoHtml(s);
    h += '<div class="chips grande"><span class="chip chip-t0">' + esc(tiempoT(s)) + '</span>' + chips(s) + '</div>';
    // advertencias detalladas
    var eqf = equipoFaltante(s), av = avisos(s), det = '';
    eqf.forEach(function (e) { det += '<li><strong>' + esc(e.t) + '.</strong> ' + esc(e.alt) + '</li>'; });
    av.forEach(function (a) { det += '<li><strong>' + (a.k === 'alergia' ? 'Atención.' : 'Aviso.') + '</strong> ' + esc(a.t) + '. No lo escondemos: decide tú.</li>'; });
    if (s.max && s.max > p.minutos) det += '<li><strong>Tiempo.</strong> Esta sesión dura ~' + s.max + ' min y tu perfil dice ' + p.minutos + '. Puedes dejar la parte de reto o repartirla en dos días.</li>';
    if (det) h += '<section class="tarjeta aviso-c"><ul class="lista-txt">' + det + '</ul></section>';
    // porciones
    var perso = p.adultos + ' adulto' + (p.adultos > 1 ? 's' : '') + (p.ninos ? ' + ' + p.ninos + ' niño' + (p.ninos > 1 ? 's' : '') : '');
    h += '<section class="tarjeta porc"><strong>Porciones:</strong> ' + perso + ' · cantidades ×' + fmtF(f) + ' (el curso está escrito para 2 adultos; cada niño cuenta como media porción). <a href="#/ajustes">Cambiar</a>';
    if (f > 1.01) {
      h += '<br><small>Los pasos y los tiempos se mantienen; sazona de a poco y cocina en tandas si no cabe en la sartén.' + ((s.equipo || []).some(function (e) { return e.id === 'olla_presion'; }) ? ' En la olla de presión respeta el límite de llenado (2/3, o la mitad con granos).' : '') + '</small>';
    }
    h += '</section>';
    if (p.altura === false) h += '<p class="nota-p">Los tiempos del curso están ajustados a ~2.800 m de altura; a nivel del mar pueden ser más cortos: prueba antes de dar por listo.</p>';
    // antes de la semana
    sm.antes.forEach(function (e) { h += detalles('Antes de cocinar esta semana: ' + e.titulo, bloques(e.bloques), sm.sesiones[0] === s.id || /Seguridad/.test(e.titulo)); });
    h += '<section class="bloque"><h2>Objetivo</h2><p>' + md(cap(s.objetivo)) + '</p></section>';
    if (s.tecnica) h += '<section class="bloque"><h2>Técnica' + (s.tecnica.titulo ? ': ' + md(s.tecnica.titulo) : ' que aprendes') + '</h2>' + bloques(s.tecnica.bloques) + ilusHtml(s.ilus) + '</section>';
    else if (s.ilus) h += '<section class="bloque">' + ilusHtml(s.ilus) + '</section>';
    (s.extras || []).forEach(function (e) { h += '<section class="bloque"><h2>' + md(e.titulo) + '</h2>' + bloques(e.bloques) + '</section>'; });
    s.recetas.forEach(function (r, ri) {
      h += '<section class="bloque receta"><h2>Receta' + (r.etiqueta ? ' ' + r.etiqueta : '') + ': ' + md(cap(r.titulo)) + '</h2>';
      if (r.rinde) h += '<p class="rinde">Receta base: ' + md(r.rinde) + '.</p>';
      h += bloques(r.intro);
      h += '<h3 class="h3">Ingredientes</h3>' + ingredientesHtml(r, f);
      h += '<h3 class="h3">Pasos</h3><ol class="pasos">' + r.pasos.map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ol>' + notaTiempos();
      h += bloques(r.notas) + '</section>';
    });
    if (p.bebe) h += stageBebe(s);
    if (s.errores.length || s.salioBien.length) {
      h += '<section class="bloque"><h2>Errores comunes y cómo saber si salió bien</h2><ul class="lista-txt">' + s.errores.map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ul>' +
        s.salioBien.map(function (t) { return '<p class="salio">' + md(t) + '</p>'; }).join('') + '</section>';
    }
    if (s.reto) h += '<section class="bloque"><h2>Reto opcional</h2><p>' + md(s.reto) + '</p></section>';
    h += '<div class="relleno-accion"></div>';
    var hecha = S.hechas[s.id];
    h += '<div class="accion-fija"><a class="btn pri" href="#/cocinando/' + s.id + '">Cocinar</a><button class="btn ' + (hecha ? 'sec' : 'ok') + '" data-act="hecha" data-id="' + s.id + '">' + (hecha ? 'Hecha ✓ (deshacer)' : 'Marcar como hecha') + '</button></div>';
    return pagina({ titulo: s.titulo, atras: '#/curso' }, h);
  };

  /* ------------------------------------------------------------ COCINANDO */
  var CK = { id: null, i: 0, wake: null };
  function pasosCocina(s) {
    var out = [], f = factor();
    s.recetas.forEach(function (r, ri) {
      out.push({ tipo: 'ing', r: r, ri: ri });
      r.pasos.forEach(function (t, i) { out.push({ tipo: 'paso', r: r, ri: ri, n: i + 1, tot: r.pasos.length, t: t }); });
    });
    out.push({ tipo: 'fin' });
    return out;
  }
  rutas.cocinando = function (seg) {
    var s = BYID[seg[1]];
    if (!s) return rutas.curso(['curso']);
    if (CK.id !== s.id) { CK.id = s.id; CK.i = 0; }
    var st = pasosCocina(s), i = Math.min(CK.i, st.length - 1), cur = st[i], f = factor();
    var body = '';
    var rotulo = cur.r ? (s.recetas.length > 1 ? 'Receta ' + (cur.r.etiqueta || (cur.ri + 1)) + ': ' : '') + cap(cur.r.titulo) : s.titulo;
    if (cur.tipo === 'ing') {
      body = '<p class="ck-etq">Antes de empezar · prepara todo</p><h1 class="ck-t">' + md(rotulo) + '</h1><div class="ck-cuerpo ing-ck">' + ingredientesHtml(cur.r, f) + notaTiempos() + '</div>';
    } else if (cur.tipo === 'paso') {
      body = '<p class="ck-etq">' + md(rotulo) + ' · paso ' + cur.n + ' de ' + cur.tot + '</p><p class="ck-paso" id="ckPaso">' + md(cur.t) + '</p>';
    } else {
      var hecha = S.hechas[s.id];
      body = '<p class="ck-etq">Fin de la sesión</p><h1 class="ck-t">¡Listo!</h1><p class="ck-paso peq">Guarda lo que sobre en recipientes tapados, dentro de la primera hora (arroz: enfríalo rápido y úsalo en 1 día).</p>' +
        '<div class="ck-fin"><button class="btn ' + (hecha ? 'sec' : 'ok') + '" data-act="hecha" data-id="' + s.id + '" data-vuelve="1">' + (hecha ? 'Ya está marcada como hecha' : 'Marcar como hecha') + '</button><a class="btn sec" href="#/sesion/' + s.id + '">Volver a la sesión</a></div>';
    }
    var tot = st.length - 1;
    var h = '<div class="ck"><div class="ck-top"><button class="btn-cerrar" data-act="atras" data-padre="#/sesion/' + s.id + '" aria-label="Salir del modo cocinando">' + ico('cerrar') + '</button>' +
      '<div class="ck-prog"><span style="width:' + Math.round(i * 100 / tot) + '%"></span></div><span class="ck-n">' + i + '/' + tot + '</span></div>' +
      '<div class="ck-main" id="ckMain">' + body + '</div>' +
      '<div class="ck-nav"><button class="btn sec ck-b" data-act="ckprev"' + (i === 0 ? ' disabled' : '') + '>‹ Anterior</button>' +
      (cur.tipo === 'fin' ? '' : '<button class="btn pri ck-b" data-act="cknext">' + (i === tot - 0 - 1 ? 'Terminar' : 'Siguiente ›') + '</button>') + '</div>' +
      '<p class="ck-wake" id="ckWake" aria-live="polite"></p></div>';
    return h;
  };
  rutas.cocinando.post = function () {
    wake(true).then(function (ok) {
      var el = $('#ckWake'); if (!el) return;
      el.textContent = ok ? 'Pantalla encendida mientras cocinas.' : 'Tu navegador no puede mantener la pantalla encendida; ajusta el apagado automático si hace falta.';
    });
  };
  var wl = null;
  function wake(on) {
    try {
      if (on) {
        if (!('wakeLock' in navigator)) return Promise.resolve(false);
        if (wl) return Promise.resolve(true);
        return navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener('release', function () { wl = null; }); return true; }, function () { return false; });
      }
      if (wl) { var l = wl; wl = null; return l.release().then(function () { return false; }, function () { return false; }); }
    } catch (e) { /* sin wake lock */ }
    return Promise.resolve(false);
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && ruta()[0] === 'cocinando') wake(true);
  });

  /* ------------------------------------------------------------ COMPRAS */
  rutas.compras = function (seg) {
    var nx = proxima(), tot = totalSemPlan();
    var n = seg[1] === 'bonus' ? 'bonus' : (parseInt(seg[1], 10) || semanaCompras(nx));
    if (n !== 'bonus') n = Math.min(tot, Math.max(1, n));
    var L = listaCompras(n), f = factor(), pc = progCompras(n), esB = n === 'bonus';
    var h = '';
    if (!esB) {
      h += '<div class="sel-sem"><a class="btn-sm" href="#/compras/' + Math.max(1, n - 1) + '" data-replace="1" aria-label="Semana anterior"' + (n === 1 ? ' aria-disabled="true"' : '') + '>‹</a><strong>Semana ' + n + ' de ' + tot + ' de tu plan</strong><a class="btn-sm" href="#/compras/' + Math.min(tot, n + 1) + '" data-replace="1" aria-label="Semana siguiente"' + (n === tot ? ' aria-disabled="true"' : '') + '>›</a></div>';
    } else {
      h += '<div class="sel-sem"><a class="btn-sm" href="#/compras/' + tot + '" data-replace="1" aria-label="Volver a la última semana">‹</a><strong>Extra · bonus de tacos</strong><span class="btn-sm" aria-hidden="true"></span></div>';
    }
    h += '<section class="tarjeta"><div class="prog-f"><strong>' + pc[0] + ' de ' + pc[1] + '</strong><span>marcados</span></div>' + barraProgreso(pc[0], pc[1], 'Lista de compras') +
      '<p class="pie-c">Suma los ingredientes de las sesiones de ' + (esB ? 'este extra' : 'esta semana de tu plan') + ': <strong>' + L.ses.map(function (s) { return s.bonus ? 'bonus' : s.id; }).join(', ') + '</strong>. Cantidades ×' + fmtF(f) + ' para tus porciones, redondeadas hacia arriba. Marca lo que ya tienes en casa.</p></section>';
    L.secs.forEach(function (sec) {
      h += '<h2 class="gh">' + esc(sec.titulo) + '</h2><div class="grupo">' + sec.rows.map(function (r) {
        var k = 'c.' + L.id + '.' + r.k, on = !!S.compras[k];
        return '<label class="fila chk' + (on ? ' on' : '') + '"><input type="checkbox" data-act="chk" data-k="' + esc(k) + '" data-l="' + L.id + '"' + (on ? ' checked' : '') + '><span class="caja">' + ico('ok') + '</span><span class="fila-t">' + r.html + '</span></label>';
      }).join('') + '</div>';
    });
    L.notas.forEach(function (t) { h += '<p class="pie">' + md(t) + '</p>'; });
    if (!esB && BYID.bonus && n === tot) h += '<div class="grupo"><a class="fila" href="#/compras/bonus"><span class="fila-t"><strong>Lista del bonus: tacos</strong><small>Sesión extra, fuera del plan</small></span>' + ico('sig', 'sig') + '</a></div>';
    h += '<div class="acciones-pie"><button class="btn sec" data-act="desmarcar" data-n="' + L.id + '">Desmarcar toda la lista</button></div>';
    return pagina({ titulo: 'Compras' }, h);
  };

  /* ------------------------------------------------------------ CONTROLES DE PERFIL */
  function ctlSeg(key, opts, val, etq) {
    return '<div class="ctl"><span class="ctl-e" id="l_' + key + '">' + etq + '</span><div class="segc" role="radiogroup" aria-labelledby="l_' + key + '">' + opts.map(function (o) {
      return '<button type="button" role="radio" aria-checked="' + (o[0] === val) + '" class="' + (o[0] === val ? 'on' : '') + '" data-act="set" data-k="' + key + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div></div>';
  }
  function ctlStep(key, val, min, max, etq, sufijo) {
    return '<div class="ctl fila-ctl"><span class="ctl-e" id="l_' + key + '">' + etq + '</span><div class="stepper" role="group" aria-labelledby="l_' + key + '">' +
      '<button type="button" class="st-b" data-act="step" data-k="' + key + '" data-d="-1" data-min="' + min + '" data-max="' + max + '" aria-label="Menos"' + (val <= min ? ' disabled' : '') + '>−</button>' +
      '<output class="st-v" aria-live="polite">' + val + (sufijo || '') + '</output>' +
      '<button type="button" class="st-b" data-act="step" data-k="' + key + '" data-d="1" data-min="' + min + '" data-max="' + max + '" aria-label="Más"' + (val >= max ? ' disabled' : '') + '>+</button></div></div>';
  }
  function ctlSw(key, val, etq, desc) {
    return '<button type="button" role="switch" aria-checked="' + !!val + '" class="ctl fila-ctl sw' + (val ? ' on' : '') + '" data-act="tog" data-k="' + key + '"><span class="ctl-e"><strong>' + etq + '</strong>' + (desc ? '<small>' + desc + '</small>' : '') + '</span><span class="sw-pill"><i></i></span></button>';
  }
  function ctlChips(key, opts, arr, etq) {
    return '<div class="ctl"><span class="ctl-e">' + etq + '</span><div class="chipsel">' + opts.map(function (o) {
      var on = arr.indexOf(o[0]) >= 0;
      return '<button type="button" aria-pressed="' + on + '" class="cs' + (on ? ' on' : '') + '" data-act="multi" data-k="' + key + '" data-v="' + o[0] + '">' + (on ? '✓ ' : '') + esc(o[1]) + '</button>';
    }).join('') + '</div></div>';
  }
  var PASOS = ['bienvenida', 'nivel', 'personas', 'equipo', 'tiempo', 'gustos', 'resumen'];
  function formNivel(p) {
    return '<div class="grupo">' + NIVELES.map(function (n) {
      var on = p.nivel === n[0];
      return '<button type="button" role="radio" aria-checked="' + on + '" class="fila radio' + (on ? ' on' : '') + '" data-act="set" data-k="nivel" data-v="' + n[0] + '"><span class="fila-t"><strong>' + n[1] + '</strong><small>' + n[2] + '</small></span><span class="rd">' + (on ? ico('ok') : '') + '</span></button>';
    }).join('') + '</div>';
  }
  function formPersonas(p) {
    var h = '<div class="grupo form">' + ctlStep('adultos', p.adultos, 1, 8, 'Adultos', '') + ctlStep('ninos', p.ninos, 0, 6, 'Niños', '') + '</div>';
    h += '<p class="pie">Las recetas están escritas para 2 adultos. Cada niño cuenta como media porción.</p>';
    h += '<div class="grupo form">' + ctlSw('bebe', p.bebe, '¿Hay un bebé en casa?', 'Si lo hay, cada sesión muestra el apartado "Para la bebé" de su edad.');
    if (p.bebe) {
      h += ctlStep('bebeMeses', p.bebeMeses, 0, 36, 'Edad del bebé', ' meses');
      h += ctlSeg('bebeGen', [['la', 'La bebé'], ['el', 'El bebé'], ['tu', 'Tu bebé']], p.bebeGen, 'Cómo lo nombramos');
    }
    h += '</div>';
    if (p.bebe) h += '<p class="pie">El bebé no cuenta para las porciones. Todo lo del bebé es información general: manda tu pediatra.</p>';
    return h;
  }
  function formEquipo(p) {
    var h = '<div class="grupo form">' + ctlSeg('fuego', [['gas', 'A gas'], ['electrica', 'Eléctrica'], ['induccion', 'Inducción']], p.fuego, 'Cocina') +
      ctlSeg('horno', [['electrico', 'Eléctrico'], ['gas', 'A gas'], ['no', 'No tengo']], p.horno, 'Horno') + '</div>';
    h += '<div class="grupo form">' + ctlSw('licuadora', p.licuadora, 'Licuadora') + ctlSw('olla', p.olla, 'Olla de presión') + ctlSw('microondas', p.microondas, 'Microondas', 'El curso no lo necesita.') + ctlSw('airfryer', p.airfryer, 'Air fryer', 'El curso no lo necesita.') + '</div>';
    h += '<div class="grupo form">' + ctlSw('altura', p.altura, 'Cocino en altura (~2.800 m, ej. Quito)', 'Los tiempos del curso están ajustados a esa altura.') + '</div>';
    return h;
  }
  function formTiempo(p) {
    return '<div class="grupo form">' + ctlSeg('sesiones', [[2, '2'], [3, '3'], [4, '4']], p.sesiones, 'Sesiones por semana') +
      ctlSeg('minutos', [[30, '30'], [45, '45'], [60, '60'], [90, '90'], [120, '120']], p.minutos, 'Minutos por sesión') + '</div>' +
      '<p class="pie">Con ' + p.sesiones + ' sesiones por semana, las 30 sesiones se reparten en ' + Math.ceil(30 / p.sesiones) + ' semanas, en el mismo orden.</p>';
  }
  function formGustos(p) {
    return '<div class="grupo form">' + ctlChips('gustos', GUSTOS, p.gustos, 'Gustos') + ctlChips('alergias', ALER, p.alergias, 'Alergias o intolerancias') +
      '<div class="ctl"><label class="ctl-e" for="alergiaTxt">Otras alergias (opcional)</label><input id="alergiaTxt" class="txt" type="text" autocomplete="off" value="' + esc(p.alergiaTxt) + '" data-text="alergiaTxt" placeholder="Ej.: kiwi, sésamo"></div></div>' +
      '<p class="pie">Las sesiones que no encajan se marcan con un aviso, pero no se esconden.</p>';
  }
  function resumenPerfil(p) {
    var nv = NIVELES.filter(function (n) { return n[0] === p.nivel; })[0][1];
    var rows = [
      ['Nivel', nv], ['Personas', p.adultos + ' adulto(s)' + (p.ninos ? ', ' + p.ninos + ' niño(s)' : '') + (p.bebe ? ', bebé de ' + p.bebeMeses + ' meses' : '')],
      ['Cocina', { gas: 'A gas', electrica: 'Eléctrica', induccion: 'Inducción' }[p.fuego] + ' · horno ' + { electrico: 'eléctrico', gas: 'a gas', no: 'no' }[p.horno]],
      ['Equipo', [p.licuadora ? 'licuadora' : '', p.olla ? 'olla de presión' : '', p.microondas ? 'microondas' : '', p.airfryer ? 'air fryer' : ''].filter(Boolean).join(', ') || 'ninguno extra'],
      ['Tiempo', p.sesiones + ' sesiones por semana · ' + p.minutos + ' min'],
      ['Gustos', p.gustos.map(function (g) { return GUSTOS.filter(function (x) { return x[0] === g; })[0][1]; }).join(', ')],
      ['Alergias', p.alergias.map(function (a) { return ALER_NOM[a]; }).concat(p.alergiaTxt ? [p.alergiaTxt] : []).join(', ') || 'ninguna']
    ];
    return '<div class="grupo">' + rows.map(function (r) { return '<div class="fila est"><span class="fila-t"><small>' + r[0] + '</small><strong>' + esc(r[1]) + '</strong></span></div>'; }).join('') + '</div>';
  }
  var TIT_PASO = { nivel: ['¿Cuál es tu nivel?', 'Elige el que más se parezca.'], personas: ['¿Para quién cocinas?', 'Ajustamos las cantidades.'], equipo: ['¿Qué tienes en la cocina?', 'Avisamos si una receta necesita algo que no tienes.'], tiempo: ['¿Cuánto tiempo tienes?', 'Armamos el plan con tu ritmo.'], gustos: ['¿Qué te gusta y qué evitas?', 'Marca gustos y alergias.'], resumen: ['Todo listo', 'Revisa tu perfil. Lo puedes cambiar en Ajustes.'] };

  rutas.bienvenida = function (seg) {
    var n = parseInt(seg[1], 10) || 0;
    if (!S.draft) { S.draft = JSON.parse(JSON.stringify(DEF_PERFIL)); guardar(); }
    var p = S.draft, nombre = PASOS[n] || 'bienvenida';
    var h = '<main class="vista-in onb" id="main" tabindex="-1">';
    if (n === 0) {
      h += '<header class="tit"><h1 id="h1">Curso de cocina</h1><p class="sub-t">De cero a cocinar con confianza, en 10 semanas.</p></header>' +
        '<section class="tarjeta"><p>Antes de empezar te hacemos 5 preguntas rápidas para ajustar porciones, plan y equipo a tu casa.</p><ul class="lista-txt"><li>Todo se guarda <strong>solo en este dispositivo</strong>.</li><li>Sin cuentas, sin anuncios, sin rastreo.</li><li>Funciona sin internet una vez abierta.</li></ul></section>';
    } else {
      h += '<div class="onb-prog" aria-hidden="true"><span style="width:' + Math.round(n * 100 / (PASOS.length - 1)) + '%"></span></div><header class="tit"><p class="etq">Paso ' + n + ' de ' + (PASOS.length - 1) + '</p><h1 id="h1">' + TIT_PASO[nombre][0] + '</h1><p class="sub-t">' + TIT_PASO[nombre][1] + '</p></header><div id="formArea">' + formPaso(nombre, p) + '</div>';
    }
    h += '<div class="relleno-accion"></div></main>';
    h += '<div class="accion-fija onb-nav">' + (n > 0 ? '<button class="btn sec" data-act="atras" data-padre="#/bienvenida/' + (n - 1) + '">Atrás</button>' : '') +
      (n < PASOS.length - 1 ? '<a class="btn pri" href="#/bienvenida/' + (n + 1) + '">' + (n === 0 ? 'Empezar' : 'Siguiente') + '</a>' : '<button class="btn pri" data-act="fin-onb">Guardar y entrar</button>') + '</div>';
    return h;
  };
  function formPaso(nombre, p) {
    return { nivel: formNivel, personas: formPersonas, equipo: formEquipo, tiempo: formTiempo, gustos: formGustos, resumen: resumenPerfil }[nombre](p);
  }

  /* ------------------------------------------------------------ AJUSTES */
  var deferredInstall = null, msgAjustes = '';
  rutas.ajustes = function () {
    var p = S.perfil, h = '';
    h += '<h2 class="gh">Perfil</h2><div id="formPerfil">' + formAjustes(p) + '</div>';
    h += '<h2 class="gh">Apariencia</h2><div class="grupo form">' + ctlSeg('tema', [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']], S.tema, 'Tema') +
      ctlSeg('escala', [[90, 'A−'], [100, 'A'], [115, 'A+'], [130, 'A++']], S.escala, 'Tamaño de letra') + '</div>';
    h += '<h2 class="gh">Tu progreso</h2><div class="grupo form"><div class="fila est"><span class="fila-t"><strong>' + nHechas() + ' de ' + REG.length + ' sesiones hechas</strong><small>' + Object.keys(S.omitidas).length + ' omitidas</small></span></div>' +
      '<button class="fila btn-fila" data-act="exportar"><span class="fila-t"><strong>Exportar progreso</strong><small>Descarga un archivo .json con tu perfil y progreso</small></span></button>' +
      '<label class="fila btn-fila"><span class="fila-t"><strong>Importar progreso</strong><small>Carga un archivo .json exportado antes</small></span><input type="file" id="fileImp" accept="application/json,.json" class="oculto"></label></div>';
    if (msgAjustes) h += '<p class="msg" role="status">' + esc(msgAjustes) + '</p>';
    h += '<h2 class="gh">Reiniciar</h2><div class="grupo form"><div id="zonaReset"><button class="fila btn-fila peligro" data-act="reset-ask" data-v="progreso"><span class="fila-t"><strong>Borrar solo el progreso</strong><small>Sesiones hechas, omitidas y listas de compras</small></span></button>' +
      '<button class="fila btn-fila peligro" data-act="reset-ask" data-v="todo"><span class="fila-t"><strong>Borrar todo y volver al cuestionario</strong><small>Perfil y progreso</small></span></button></div></div>';
    h += '<h2 class="gh">Esta app</h2><div class="grupo form">' +
      '<div class="fila est"><span class="fila-t"><strong>Uso sin internet</strong><small id="swEstado">Comprobando…</small></span></div>' +
      (deferredInstall ? '<button class="fila btn-fila" data-act="instalar"><span class="fila-t"><strong>Instalar en el teléfono</strong><small>Añade la app a la pantalla de inicio</small></span></button>' : '<div class="fila est"><span class="fila-t"><strong>Instalar</strong><small>En Android (Chrome o Samsung Internet): menú ⋮ → "Instalar app" o "Añadir a la pantalla de inicio". En iPhone: Compartir → "Añadir a pantalla de inicio".</small></span></div>') +
      '<div class="fila est"><span class="fila-t"><strong>Privacidad</strong><small>Sin cuentas, sin rastreo y sin llamadas a internet. Tus datos viven solo en este dispositivo.</small></span></div>' +
      '<div class="fila est"><span class="fila-t"><strong>Aviso</strong><small>Curso informativo de cocina casera. No reemplaza el consejo del pediatra ni del médico.</small></span></div>' +
      '<a class="fila" href="#/creditos"><span class="fila-t"><strong>Créditos</strong><small>Fotos de platos, ilustraciones y licencias</small></span>' + ico('sig', 'sig') + '</a>' +
      '<div class="fila est"><span class="fila-t"><strong>Versión</strong><small>2.0 · curso de 10 semanas + Semana 0, con ilustraciones y fotos</small></span></div></div>';
    return pagina({ titulo: 'Ajustes' }, h);
  };

  /* ------------------------------------------------------------ CRÉDITOS */
  rutas.creditos = function () {
    var fs = SES.filter(function (s) { return s.foto; });
    var h = '<p class="lead">Las ilustraciones de técnicas están dibujadas para esta app. Las fotos de platos son de Unsplash.</p>';
    h += '<h2 class="gh">Fotos de platos · Unsplash</h2><div class="grupo">' + fs.map(function (s) {
      var f = s.foto;
      return '<a class="fila cred" href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer"><span class="fila-t"><strong>' + esc(f.alt) + '</strong><small>Foto de ' + esc(f.autor) + ' · sesión ' + (s.bonus ? 'bonus' : s.id) + '</small></span></a>';
    }).join('') + '</div>';
    h += '<p class="pie">Se usan con la Licencia Unsplash (uso libre; se acredita igual). Tocar una foto abre su página en Unsplash, con conexión. Son fotos de referencia: tu plato puede verse distinto.</p>';
    h += '<h2 class="gh">Ilustraciones y letra</h2><div class="grupo form"><div class="fila est"><span class="fila-t"><strong>Ilustraciones de técnicas</strong><small>Dibujadas con código para esta app (cortes, agarre del cuchillo, punto del huevo, arroz, olla de presión, temperaturas y tablas). Sin licencia de terceros.</small></span></div>' +
      '<div class="fila est"><span class="fila-t"><strong>Íconos</strong><small>Íconos propios de trazo simple; no se usa ningún paquete externo.</small></span></div>' +
      '<div class="fila est"><span class="fila-t"><strong>Letra</strong><small>La del sistema de tu teléfono; no se descarga ninguna.</small></span></div></div>';
    return pagina({ titulo: 'Créditos', atras: '#/ajustes' }, h);
  };
  rutas.ajustes.post = function () {
    var el = $('#swEstado'); if (!el) return;
    if (!('serviceWorker' in navigator)) { el.textContent = 'Este navegador no admite service worker: la app necesita abrirse con conexión.'; return; }
    if (!/^https?:$/.test(location.protocol)) { el.textContent = 'No disponible al abrir el archivo directamente; se activa desde un servidor (local o GitHub Pages).'; return; }
    navigator.serviceWorker.getRegistration().then(function (r) {
      el.textContent = r && r.active ? 'Activo: todo el curso queda guardado en el dispositivo.' : 'Preparándose: abre la app una vez con conexión.';
    }, function () { el.textContent = 'No se pudo comprobar.'; });
  };
  function formAjustes(p) {
    return '<div class="grupo form"><p class="g-t">Nivel</p>' + formNivel(p).replace('class="grupo"', 'class="interno"') + '</div>' +
      '<div class="grupo form"><p class="g-t">Personas</p>' + formPersonas(p).replace(/<div class="grupo form">/g, '<div class="interno">').replace(/<p class="pie">[^<]*<\/p>/g, '') + '</div>' +
      '<div class="grupo form"><p class="g-t">Equipo</p>' + formEquipo(p).replace(/<div class="grupo form">/g, '<div class="interno">') + '</div>' +
      '<div class="grupo form"><p class="g-t">Tiempo</p>' + formTiempo(p).replace(/<div class="grupo form">/g, '<div class="interno">').replace(/<p class="pie">[^<]*<\/p>/g, '') + '</div>' +
      '<div class="grupo form"><p class="g-t">Gustos y alergias</p>' + formGustos(p).replace(/<div class="grupo form">/g, '<div class="interno">').replace(/<p class="pie">[^<]*<\/p>/g, '') + '</div>';
  }

  /* ------------------------------------------------------------ acciones */
  function aplicarTema() {
    document.documentElement.setAttribute('data-tema', S.tema || 'auto');
    document.documentElement.style.fontSize = (S.escala || 100) + '%';
    var mt = document.querySelector('meta[name="theme-color"]');
    var osc = S.tema === 'oscuro' || (S.tema !== 'claro' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    if (mt) mt.setAttribute('content', osc ? '#1c1c1e' : '#f2f2f7');
  }
  function refrescarForm() {
    var onb = ruta()[0] === 'bienvenida';
    var fa = $('#formArea'), fp = $('#formPerfil');
    if (onb && fa) { fa.innerHTML = formPaso(PASOS[parseInt(ruta()[1], 10)], S.draft); }
    else if (fp) { fp.innerHTML = formAjustes(S.perfil); }
  }
  function objetivoP() { return ruta()[0] === 'bienvenida' ? S.draft : S.perfil; }
  function toast(t) { var e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('on'); }, 2600); }

  function descargar(nombre, texto) {
    try {
      var b = new Blob([texto], { type: 'application/json' }), u = URL.createObjectURL(b), a = document.createElement('a');
      a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(u); }, 1500);
      return true;
    } catch (e) { return false; }
  }

  document.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-skip]')) { ev.preventDefault(); var mn = $('#main'); if (mn) mn.focus(); return; }
    var a = ev.target.closest('a[href^="#/"]');
    if (a) {
      navPush = true;
      if (a.getAttribute('aria-disabled') === 'true') { ev.preventDefault(); return; }
      if (a.hasAttribute('data-replace')) { ev.preventDefault(); location.replace(a.getAttribute('href')); return; }
      // pestaña activa: vuelve a su raíz
      if (a.parentNode === tabbar || a.closest('#tabbar')) {
        if (a.classList.contains('on') && location.hash === a.getAttribute('href')) { ev.preventDefault(); window.scrollTo({ top: 0, behavior: 'auto' }); }
      }
    }
    var t = ev.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act'), k = t.getAttribute('data-k'), v = t.getAttribute('data-v');
    var p;
    switch (act) {
      case 'atras': volver(t.getAttribute('data-padre') || '#/hoy'); break;
      case 'set':
        p = objetivoP(); p[k] = /^\d+$/.test(v) ? parseInt(v, 10) : v;
        if (k === 'tema' || k === 'escala') { S[k] = p[k]; delete p[k]; S.perfil && null; }
        guardar(); aplicarTema(); refrescarSegun(k); break;
      case 'step':
        p = objetivoP(); p[k] = Math.min(+t.getAttribute('data-max'), Math.max(+t.getAttribute('data-min'), p[k] + parseInt(t.getAttribute('data-d'), 10)));
        guardar(); refrescarForm(); break;
      case 'tog': p = objetivoP(); p[k] = !p[k]; guardar(); refrescarForm(); break;
      case 'multi':
        p = objetivoP(); var arr = p[k], ix = arr.indexOf(v);
        if (ix >= 0) arr.splice(ix, 1); else {
          if (k === 'gustos') { if (v === 'todo') arr.length = 0; else { var tx = arr.indexOf('todo'); if (tx >= 0) arr.splice(tx, 1); } }
          arr.push(v);
        }
        if (k === 'gustos' && arr.length === 0) arr.push('todo');
        guardar(); refrescarForm(); break;
      case 'fin-onb':
        S.perfil = JSON.parse(JSON.stringify(S.draft)); S.draft = null; guardar();
        location.replace('#/hoy'); break;
      case 'hecha':
        if (S.hechas[t.getAttribute('data-id')]) delete S.hechas[t.getAttribute('data-id')]; else { S.hechas[t.getAttribute('data-id')] = hoyISO(); delete S.omitidas[t.getAttribute('data-id')]; toast('Sesión marcada como hecha'); }
        guardar(); render(); break;
      case 's0': S.leidoS0 = v === '1'; guardar(); render(); toast(S.leidoS0 ? 'Semana 0 marcada como leída' : 'Marca quitada'); break;
      case 'saltar':
        REG.forEach(function (s) { if (s.semana <= 2 && pendiente(s)) S.omitidas[s.id] = hoyISO(); });
        guardar(); render(); toast('Semanas 1 y 2 omitidas'); break;
      case 'chk': break; // lo maneja change
      case 'desmarcar':
        Object.keys(S.compras).forEach(function (kk) { if (kk.indexOf('c.' + t.getAttribute('data-n') + '.') === 0) delete S.compras[kk]; });   // data-n = id de la lista (p. ej. 3-2 o bonus)
        guardar(); render(); break;
      case 'ckprev': CK.i = Math.max(0, CK.i - 1); render(); break;
      case 'cknext': CK.i += 1; render(); break;
      case 'exportar':
        var obj = { app: 'cocina-curso', v: 1, exportado: new Date().toISOString(), datos: S };
        msgAjustes = descargar('cocina-progreso-' + hoyISO() + '.json', JSON.stringify(obj, null, 1)) ? 'Archivo descargado.' : 'No se pudo descargar en este navegador.';
        render(); break;
      case 'reset-ask':
        $('#zonaReset').innerHTML = '<div class="fila est"><span class="fila-t"><strong>' + (v === 'todo' ? '¿Borrar perfil y progreso?' : '¿Borrar el progreso?') + '</strong><small>No se puede deshacer. Si quieres, exporta antes tu progreso.</small></span></div><div class="btns pad"><button class="btn sec" data-act="reset-no">Cancelar</button><button class="btn peli" data-act="reset-ok" data-v="' + v + '">Sí, borrar</button></div>';
        break;
      case 'reset-no': render(); break;
      case 'reset-ok':
        if (v === 'todo') { var tema = S.tema, esc2 = S.escala; S = defaults(); S.tema = tema; S.escala = esc2; guardar(); location.replace('#/bienvenida/0'); }
        else { S.hechas = {}; S.omitidas = {}; S.compras = {}; S.leidoS0 = false; CK.id = null; guardar(); msgAjustes = 'Progreso borrado.'; render(); }
        break;
      case 'instalar':
        if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; }
        break;
    }
  });
  function refrescarSegun(k) {
    if (k === 'tema' || k === 'escala') { render(); return; }
    refrescarForm();
  }
  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.matches('input[data-act="chk"]')) {
      var k = t.getAttribute('data-k');
      if (t.checked) S.compras[k] = 1; else delete S.compras[k];
      guardar(); t.closest('label').classList.toggle('on', t.checked);
      var lid = t.getAttribute('data-l'), n = lid === 'bonus' ? 'bonus' : parseInt(lid.split('-')[1], 10), pc = progCompras(n), pf = $('.prog-f');
      if (pf) { pf.innerHTML = '<strong>' + pc[0] + ' de ' + pc[1] + '</strong><span>marcados</span>'; var pr = $('.progreso span'); if (pr) pr.style.width = Math.round(pc[0] * 100 / pc[1]) + '%'; }
    } else if (t.id === 'fileImp' && t.files && t.files[0]) {
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var o = JSON.parse(rd.result);
          if (!o || o.app !== 'cocina-curso' || !o.datos || typeof o.datos !== 'object') throw new Error('formato');
          var nuevo = defaults(); for (var kk in o.datos) nuevo[kk] = o.datos[kk];
          if (!nuevo.perfil) throw new Error('perfil');
          S = nuevo; guardar(); aplicarTema(); msgAjustes = 'Progreso importado.';
        } catch (e) { msgAjustes = 'Ese archivo no es un progreso de esta app.'; }
        render();
      };
      rd.readAsText(t.files[0]);
    }
  });
  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.matches && t.matches('input[data-text]')) { var p = objetivoP(); p[t.getAttribute('data-text')] = t.value; guardar(); }
  });
  /* deslizar en modo cocinando */
  var tx0 = null;
  document.addEventListener('touchstart', function (e) { tx0 = (ruta()[0] === 'cocinando' && e.touches.length === 1) ? e.touches[0].clientX : null; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (tx0 === null) return;
    var dx = e.changedTouches[0].clientX - tx0; tx0 = null;
    if (Math.abs(dx) > 70) { if (dx < 0) { var b = $('[data-act="cknext"]'); if (b) b.click(); } else { var c = $('[data-act="ckprev"]'); if (c && !c.disabled) c.click(); } }
  }, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (ruta()[0] !== 'cocinando') return;
    if (e.key === 'ArrowRight') { var b = $('[data-act="cknext"]'); if (b) b.click(); }
    if (e.key === 'ArrowLeft') { var c = $('[data-act="ckprev"]'); if (c && !c.disabled) c.click(); }
  });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; });
  window.addEventListener('popstate', function () { /* hashchange ya re-renderiza */ });
  window.addEventListener('hashchange', render);

  /* ------------------------------------------------------------ arranque */
  function arrancar() {
    vista = $('#vista'); tabbar = $('#tabbar');
    aplicarTema();
    if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarTema); } catch (e) { /* ignorar */ } }
    fetch('data/curso.json').then(function (r) { return r.json(); }).then(function (d) {
      D = d; SES = d.sesiones; SES.forEach(function (s) { BYID[s.id] = s; }); REG = SES.filter(function (s) { return !s.bonus; });
      d.semanas.forEach(function (s) { SEM[s.n] = s; });
      if (!location.hash) { location.replace('#/hoy'); } else render();
    }).catch(function () {
      vista.innerHTML = '<main class="vista-in"><header class="tit"><h1>No se pudo cargar el curso</h1></header><p>Abre la app con conexión una vez o recarga la página.</p></main>';
    });
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* sin SW: sigue funcionando en línea */ }); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();

  /* exposición mínima para pruebas manuales */
  window.__cocina = { fmtParte: fmtParte, factor: factor, S: function () { return S; }, bebeT: bebeT, listaCompras: listaCompras, partes: partes, D: function () { return D; }, REG: function () { return REG; } };
})();
