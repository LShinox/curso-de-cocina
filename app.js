/* Curso de cocina — app v1. JavaScript puro, sin dependencias, sin red (salvo los archivos de la propia app). */
(function () {
  'use strict';

  /* ------------------------------------------------------------ almacenamiento */
  var KEY = 'cocina.v1';
  var mem = null;
  var DEF_PERFIL = {
    nivel: 'basico', adultos: 2, ninos: 0, bebe: false, bebeMeses: 9, bebeGen: 'la',
    fuego: 'gas', horno: 'electrico', licuadora: true, olla: true, microondas: false, airfryer: false,
    altura: true, sesiones: 3, minutos: 60, gustos: ['todo'], alergias: [], alergiaTxt: '', pais: 'EC', medidas: 'metrico'
  };
  function defaults() {
    return { perfil: null, draft: null, hechas: {}, omitidas: {}, compras: {}, cocinadas: {}, leidoS0: false, tema: 'auto', escala: 100, nivelPlan: 1, logros: {}, plan: null };
  }
  function cargar() {
    var s = defaults();
    try {
      var t = localStorage.getItem(KEY);
      if (t) { var o = JSON.parse(t); for (var k in o) s[k] = o[k]; }
    } catch (e) { if (mem) s = mem; }
    /* v2.8: quien ya tenía perfil sigue igual (Ecuador, en altura, métrico) */
    if (s.perfil) { if (s.perfil.pais == null) s.perfil.pais = 'EC'; if (s.perfil.medidas == null) s.perfil.medidas = 'metrico'; if (s.perfil.altura == null) s.perfil.altura = true; }
    return s;
  }
  var S = cargar();
  function guardar() {
    mem = S;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento: sigue en memoria */ }
  }
  function P() { return S.perfil || DEF_PERFIL; }
  /* Cuestionario en blanco (v2.1): la primera vez no viene ninguna respuesta puesta; cada paso exige responder.
     DEF_PERFIL solo sirve de relleno neutro para calcular cosas antes de tener perfil. */
  function perfilEnBlanco() {
    return { _v: 2, nivel: null, adultos: null, ninos: null, bebe: null, bebeMeses: null, bebeGen: null,
      fuego: null, horno: null, licuadora: null, olla: null, microondas: null, airfryer: null, altura: null, pais: null, medidas: null,
      sesiones: null, minutos: null, gustos: [], alergias: [], alergiaTxt: '', alergiaOk: false };
  }

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
  /* ------------------------------------------------------------ v2.8: país, altura y medidas */
  var PAISES = [['EC', 'Ecuador'], ['CO', 'Colombia'], ['PE', 'Perú'], ['MX', 'México'], ['VE', 'Venezuela'], ['CL', 'Chile'], ['AR', 'Argentina'], ['UY', 'Uruguay'], ['BO', 'Bolivia'], ['ES', 'España'], ['US', 'Estados Unidos'], ['OT', 'Otro']];
  var SYN_DATA = {}, SYN_ALL = [], SYN_CC = null, SYN_RE = null, SYN_MAP = {}, ALT_CAN = {};
  function escRe(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function plW(w) {
    if (/[aeiouáéó]$/.test(w)) return [w + 's'];
    if (/[íú]$/.test(w)) return [w + 'es', w + 's'];
    if (/z$/.test(w)) return [w.slice(0, -1) + 'ces'];
    if (/s$/.test(w)) return [w];
    return [w + 'es'];
  }
  function plurSyn(x) { var w = x.split(' '); w[0] = plW(w[0])[0]; return w.join(' '); }
  /* formas plurales posibles de un nombre canónico (en minúsculas) */
  function plurales(c) {
    var w = c.split(' '), out = [];
    function var_(idx) { out.push(w.map(function (x, i) { return idx.indexOf(i) >= 0 ? plW(x)[0] : x; }).join(' ')); }
    var todos = w.map(function (x, i) { return i; });
    var_([0]); var_([w.length - 1]); var_(todos);
    if (w.length === 1) plW(c).forEach(function (f) { out.push(f); });
    return out.filter(function (f, i) { return f !== c && out.indexOf(f) === i; });
  }
  function synPrep(d) {
    SYN_DATA = (d && typeof d === 'object') ? d : {}; SYN_ALL = []; SYN_CC = null; ALT_CAN = {};
    Object.keys(SYN_DATA).forEach(function (c) {
      var m = SYN_DATA[c]; if (c.charAt(0) === '_' || !m || typeof m !== 'object') return;
      var formas = [];
      Object.keys(m).forEach(function (cc) { var par = String(m[cc]).split('|'); formas.push(par[0]); formas.push(par[1] || plurSyn(par[0])); });
      SYN_ALL.push({ c: norm(c), s: norm(formas.join(' ')) });
    });
  }
  function synMapa() {
    var cc = P().pais || 'EC';
    if (SYN_CC === cc) return;
    SYN_CC = cc; SYN_MAP = {}; SYN_RE = null;
    var formas = [];
    Object.keys(SYN_DATA).forEach(function (c) {
      var v = SYN_DATA[c] && typeof SYN_DATA[c] === 'object' ? SYN_DATA[c][cc] : null;
      if (c.charAt(0) === '_' || !v) return;
      var par = String(v).split('|'), s1 = par[0], s2 = par[1] || plurSyn(s1), cl = c.toLowerCase();
      SYN_MAP[cl] = s1; formas.push(cl);   // un nombre igual al canónico también vale: protege frases largas ("salsa de ají") de un reemplazo parcial
      plurales(cl).forEach(function (f) { if (!SYN_MAP[f]) { SYN_MAP[f] = s2; formas.push(f); } });
    });
    if (!formas.length) return;
    formas.sort(function (a, b) { return b.length - a.length; });
    try { SYN_RE = new RegExp('(^|[^\\p{L}\\p{N}])(' + formas.map(escRe).join('|') + ')(?![\\p{L}\\p{N}])', 'giu'); } catch (e) { SYN_RE = null; }
  }
  /* nombre de ingrediente como se dice en el país del perfil (el texto de los datos usa el nombre canónico) */
  function sn(t) {
    synMapa(); if (!SYN_RE) return t;
    return t.replace(SYN_RE, function (m, pre, nom) {
      var r = SYN_MAP[nom.toLowerCase()]; if (r === undefined) return m;
      if (nom.charAt(0) !== nom.charAt(0).toLowerCase()) r = r.charAt(0).toUpperCase() + r.slice(1);
      return pre + r;
    });
  }
  /* búsqueda: lo que escribe la persona (en cualquier país) → nombres canónicos de los datos */
  function altCanon(w) {
    if (w.length < 3) return [];
    if (ALT_CAN[w]) return ALT_CAN[w];
    var out = []; SYN_ALL.forEach(function (e) { if (e.s.indexOf(w) >= 0 && out.indexOf(e.c) < 0) out.push(e.c); });
    return (ALT_CAN[w] = out);
  }
  function contiene(plano, w) {
    if (plano.indexOf(w) >= 0) return true;
    return altCanon(w).some(function (c) { return plano.indexOf(c) >= 0; });
  }
  /* altura: [[alt:texto]] solo se muestra si el perfil dice que vive en altura */
  function altMarc(t) {
    if (t.indexOf('[[alt:') < 0) return t;
    if (P().altura !== false) return t.replace(/\[\[alt:([\s\S]*?)\]\]/g, '$1');
    return t.replace(/\[\[alt:[\s\S]*?\]\]/g, '').replace(/ {2,}/g, ' ').replace(/ +([.,;:)])/g, '$1').replace(/^\s+|\s+$/g, '');
  }
  function vacio(h) { return !String(h).replace(/<[^>]*>|&nbsp;|\s/g, ''); }
  /* medidas de EE. UU.: oz, lb, fl oz, tazas, qt y °F (las cucharadas y las tazas del curso no cambian) */
  function numT(x) { x = String(x); return /^\d{1,3}(\.\d{3})+$/.test(x) ? parseFloat(x.replace(/\./g, '')) : parseFloat(x.replace(',', '.')); }
  function usTemp(c) {
    var f = c * 9 / 5 + 32;
    if (c <= 100) return Math.round(f);              // seguridad: 74 °C = 165 °F, 71 = 160, 63 = 145
    return f < 250 ? Math.round(f / 5) * 5 : Math.round(f / 25) * 25;   // horno: 180 °C = 350 °F, 200 = 400
  }
  function redQ(v, paso, arriba) { return (arriba ? Math.ceil(v / paso - 1e-9) : Math.round(v / paso)) * paso; }
  /* x en gramos (masa) o mililitros (volumen) → { num, u, n } */
  function usFmt(x, masa, modo) {
    var arriba = modo === 'compra', v;
    if (masa) {
      if (x >= 440) { v = Math.max(0.25, redQ(x / 453.592, 0.25, arriba)); return { num: fracStr(v, false), u: 'lb', n: v }; }
      var oz = x / 28.3495;
      v = oz < 1 ? Math.max(0.25, redQ(oz, 0.25, arriba)) : (oz < 8 ? redQ(oz, 0.5, arriba) : redQ(oz, 1, arriba));
      return { num: fracStr(v, false), u: 'oz', n: v };
    }
    if (x >= 950) { v = redQ(x / 946.353, 0.25, arriba); return { num: fracStr(v, false), u: 'qt', n: v }; }
    if (x >= 60) {
      v = x / 240; if (arriba) v = redQ(v, 0.25, true);
      var tx = fracStr(v, false); v = Math.max(v, 0.25);
      return { num: tx === '0' ? '¼' : tx, u: v > 1.01 ? 'tazas' : 'taza', n: v };
    }
    var fo = x / 29.5735; v = fo < 1 ? Math.max(0.5, redQ(fo, 0.5, arriba)) : redQ(fo, 1, arriba);
    return { num: fracStr(v, false), u: 'fl oz', n: v };
  }
  function usRango(a, b, masa, modo) {
    var A = usFmt(a, masa, modo);
    if (b == null) return A.num + ' ' + A.u;
    var B = usFmt(b, masa, modo);
    return (A.u === B.u ? A.num : A.num + ' ' + A.u) + '-' + B.num + ' ' + B.u;
  }
  var FACT_U = { g: 1, gramo: 1, gramos: 1, kg: 1000, kilo: 1000, kilos: 1000, ml: 1, l: 1000, L: 1000, litro: 1000, litros: 1000 };
  var MASA_U = { g: 1, gramo: 1, gramos: 1, kg: 1, kilo: 1, kilos: 1 };
  function convTxt(t) {
    if (P().medidas !== 'us') return t;
    t = t.replace(/(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*[°º]\s*C(?![\p{L}\p{N}])/gu, function (m, a, b) {
      return usTemp(numT(a)) + (b ? '-' + usTemp(numT(b)) : '') + ' °F';
    });
    return t.replace(/(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(kg|kilos?|gramos?|g|ml|litros?|l|L)(?![\p{L}\p{N}])/gu, function (m, a, b, u) {
      var f = FACT_U[u]; return usRango(numT(a) * f, b ? numT(b) * f : null, !!MASA_U[u], 'receta');
    });
  }
  function tx(t) { return convTxt(sn(esc(t))); }   // etiqueta suelta (compras): nombre del país + medidas

  function inline(t) {
    t = convTxt(sn(altMarc(esc(t))));
    // las referencias del texto a una sesión por su código (p. ej. "sesión 7.2") se muestran con su número en el plan
    t = t.replace(/(sesi[oó]n(?:es)? |a la |\(para )(\d{1,2}\.\d)\b/g, function (m, a, id) { var x = BYID[id]; return x && x.num ? a + x.num : m; });
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
    if (P().medidas === 'us' && FACT_U[p.u] && p.u !== 'l') {
      var fu = FACT_U[p.u], ms = !!MASA_U[p.u];
      return [usRango(p.q * ff * fu, p.q2 != null ? p.q2 * ff * fu : null, ms, modo), 2];
    }
    if (modo === 'compra' && p.q2 == null && (p.u === 'g' || p.u === 'ml') && p.q * ff >= 1000) {
      var k = Math.ceil(p.q * ff / 250) / 4, ks = String(k).replace('.', ',');
      return [p.u === 'g' ? ks + ' kg' : ks + (k > 1 ? ' litros' : ' litro'), 2];
    }
    if (p.u === 'kg' && p.q * ff < 1) return [Math.round(p.q * ff * 1000 / 10) * 10 + ' g', 2];
    var a = redondear(p.q * ff, p.u, modo);
    var txt = a.txt, n = a.n;
    if (p.q2 != null) { var b = redondear(p.q2 * ff, p.u, modo); txt += '-' + b.txt; n = b.n; }
    if (p.s || p.p) txt += ' ' + sn(n > 1 ? p.p : p.s);
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
  var GUSTOS = [['todo', 'De todo'], ['ec', 'Cocina de Ecuador'], ['int', 'Cocina internacional'], ['sin_cerdo', 'Sin cerdo'], ['vegetariano', 'Vegetariano'], ['sin_mariscos', 'Sin mariscos']];

  function tiene(id) {
    var p = P();
    if (id === 'horno') return p.horno !== 'no';
    if (id === 'licuadora') return !!p.licuadora;
    if (id === 'olla_presion') return !!p.olla;
    return true;
  }

  /* ------------------------------------------------------------ plan */
  function sPorSem() { return P().sesiones || 3; }
  /* El plan trabaja por NIVEL (S.nivelPlan): las semanas del plan se cuentan dentro del nivel de cada sesión. */
  function regN(nv) { return REG.filter(function (s) { return (s.nivel || 1) === nv; }); }
  function nivelDisp(nv) { var x = ((D && D.niveles) || []).filter(function (v) { return v.n === nv; })[0]; return !!x && x.estado === 'disponible'; }
  function nivelActual() { var n = S.nivelPlan || 1; return nivelDisp(n) && regN(n).length ? n : 1; }
  function baseNum(nv) { var l = regN(nv); return l.length ? Math.min.apply(null, l.map(function (s) { return s.num; })) : 1; }
  function planSem(s) { return Math.floor((s.num - baseNum(s.nivel || 1)) / sPorSem()) + 1; }
  function totalSemPlan(nv) { return Math.ceil(regN(nv || nivelActual()).length / sPorSem()); }
  function semanasNivel(nv, spw) { return Math.ceil(regN(nv).length / (spw || 3)); }
  /* sesión opcional ("Desde cero"): para quien ya cocina huevos y arroz no cuenta como pendiente ni entra en las compras */
  function opcOff(s) { return !!s.opcional && P().nivel !== 'cero'; }
  function pendiente(s) { return !S.hechas[s.id] && !S.omitidas[s.id] && !opcOff(s); }
  function esInicial(s) { return s.semana <= 2 || !!s.opcional; }   // cuchillo, huevos y arroz (y "Desde cero"): lo que salta quien ya cocina
  function etqSes(s) { return s.extra ? 'Receta extra' : (s.bonus ? 'Bonus' : 'Sesión ' + s.num); }
  function proxima() { var l = regN(nivelActual()); for (var i = 0; i < l.length; i++) if (pendiente(l[i])) return l[i]; return null; }
  function nHechas() { return REG.filter(function (s) { return S.hechas[s.id]; }).length; }
  function nHechasN(nv) { return regN(nv).filter(function (s) { return S.hechas[s.id]; }).length; }
  function nivelCompleto(nv) { var l = regN(nv); return l.length > 0 && l.every(function (s) { return !pendiente(s); }); }

  /* ------------------------------------------------------------ niveles (todo está abierto; el nivel solo sugiere) */
  function nivelNom(n) { var x = ((D && D.niveles) || []).filter(function (v) { return v.n === n; })[0]; return 'Nivel ' + n + (x ? ' · ' + x.nombre : ''); }
  function nivelUsuario() {
    var lvl = 1;
    while (lvl < 3) {
      var ls = REG.filter(function (s) { return (s.nivel || 1) === lvl; });
      if (ls.length && ls.every(function (s) { return !pendiente(s); })) lvl++; else break;
    }
    return Math.max(lvl, nivelActual());
  }
  function diasDesde(iso) {
    if (!iso) return null;
    var a = String(iso).split('-'), h = new Date();
    return Math.round((new Date(h.getFullYear(), h.getMonth(), h.getDate()) - new Date(+a[0], +a[1] - 1, +a[2])) / 864e5);
  }
  function haceTxt(d) { return d <= 0 ? 'hoy' : (d === 1 ? 'ayer' : 'hace ' + d + ' días'); }

  function nivelNota() {
    var n = P().nivel;
    if (n === 'cero') return { txt: 'Desde cero: empieza por la Semana 0 y la sesión "Desde cero" (encender la cocina, medir, hervir y lavar), y repite el tema de huevos y arroz antes de seguir.', link: '#/semana/2', lt: 'Ver el tema de huevos y arroz' };
    if (n === 'basico') return { txt: 'El curso está escrito para tu nivel (huevos y arroz básicos): sigue las sesiones en orden. La sesión "Desde cero" es opcional y ya no cuenta como pendiente.' };
    return { txt: 'Me defiendo o Intermedio: puedes saltar a «Granos y olla de presión». Lee igual la Semana 0, que es de seguridad.', saltar: true };
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
    libres.forEach(function (w) { if (contiene(norm(s.ingPlano), w)) out.push({ k: 'alergia', t: 'Tu alergia "' + w + '" aparece en los ingredientes' }); });
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
    if ((s.nivel || 1) > nivelUsuario()) h += '<span class="chip chip-t">Más técnica: ' + esc(nivelNom(s.nivel)) + '</span>';
    var gu = P().gustos || [];
    if (gu.indexOf(s.cocina) >= 0 && s.cocina !== 'mixta') h += '<span class="chip chip-ok">' + (s.cocina === 'ec' ? 'Cocina de Ecuador' : 'Internacional') + ': coincide con tus gustos</span>';
    return h;
  }

  /* ------------------------------------------------------------ bloques */
  function lista(b) {
    var tag = b.t === 'ol' ? 'ol' : 'ul';
    return '<' + tag + ' class="lista-txt">' + b.items.map(function (it) {
      if (typeof it === 'string') { var ml = md(it); return vacio(ml) ? '' : '<li>' + ml + '</li>'; }
      var mx = md(it.x), sb = it.sub.map(lista).join('');
      return vacio(mx) && vacio(sb) ? '' : '<li>' + mx + sb + '</li>';
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
      case 'p': var mp = md(b.x); return vacio(mp) ? '' : '<p>' + mp + '</p>';
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
    var tab = { hoy: 'hoy', curso: 'curso', semana: 'curso', guia: 'curso', inicio: 'curso', sesion: 'curso', recetas: 'recetas', planificador: 'recetas', logro: 'hoy', compras: 'compras', ajustes: 'ajustes', creditos: 'ajustes' }[nombre] || 'hoy';
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
    var marca = hecha ? '<span class="marca hecha" aria-label="Hecha">' + ico('ok') + '</span>' : (om ? '<span class="marca omit" aria-label="Omitida">–</span>' : '<span class="marca">' + (s.bonus ? '★' : s.num) + '</span>');
    var sub = etqSes(s) + (s.opcional ? ' (opcional)' : '') + ' · ' + esc(SEM[s.semana].titulo) + ' · ' + esc(s.tiempo.replace(/\s*\(.*$/, '').replace(/\.\s*$/, ''));
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
  function listaId(n, nv) { nv = nv || nivelActual(); return n === 'bonus' ? 'bonus' : (nv > 1 ? 'n' + nv + '-' : '') + sPorSem() + '-' + n; }
  function hrefCompras(n, nv) { return '#/compras/' + n + (n !== 'bonus' && nv && nv !== nivelActual() ? '/' + nv : ''); }
  /* Suma una lista de "compra" (de sesiones o de recetas, con repeticiones) en secciones. Compartida por Compras y por el planificador. */
  function armarLista(cs) {
    var f = factor(), acc = {}, desp = {}, planos = {}, extra = [], porSec = {};
    SEC_ORD.forEach(function (t) { porSec[t] = []; });
    cs.forEach(function (c) {
      c.items.forEach(function (e) {
        var a = acc[e.k];
        if (!a) a = acc[e.k] = { e: e, q: 0 };
        a.q = e.kind === 'fijo' ? 1 : a.q + e.q;
      });
      c.desp.forEach(function (d) { desp[d] = 1; });
      c.planos.forEach(function (p) { if (!planos[p.base] || /opcional/.test(planos[p.base].t)) planos[p.base] = p; });
      c.extra.forEach(function (x) { if (extra.indexOf(x.t) < 0) extra.push(x.t); });
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
      porSec[planos[b].sec].push({ k: 'pl.' + b, o: 200, html: tx(planos[b].t) + ' <small class="para-servir">(para servir)</small>' });
    });
    var dA = D.despensa.filter(function (d) { return desp[d]; });
    var dAbar = dA.filter(function (d) { return d !== 'mantequilla'; });
    if (desp.mantequilla) porSec[SEC_ORD[1]].push({ k: 'desp.mantequilla', o: 210, html: 'Mantequilla' });
    extra.forEach(function (t, i) { porSec[SEC_ORD[2]].push({ k: 'x.' + i, o: 220, html: tx(t) }); });
    if (dAbar.length) porSec[SEC_ORD[2]].push({ k: 'desp', o: 230, html: '<strong>Despensa básica:</strong> ' + sn(esc(dAbar.join(', '))) + ' <small class="para-servir">(revisa lo que ya tienes)</small>' });
    return SEC_ORD.map(function (t) { return { titulo: t, rows: porSec[t] }; }).filter(function (x) { return x.rows.length; });
  }
  function listaCompras(n, nv) {
    nv = nv || nivelActual();
    var ses = n === 'bonus' ? [BYID.bonus] : REG.filter(function (s) { return (s.nivel || 1) === nv && planSem(s) === n && !opcOff(s); });
    var notas = [];
    ses.forEach(function (s) {
      var sm = SEM[s.semana].compras;
      (sm.notas || []).forEach(function (t) {
        var ids = t.match(/\b\d+\.\d+\b/g);
        var aplica = !ids || ids.some(function (i) { return ses.some(function (x) { return x.id === i; }); });
        if (aplica && notas.indexOf(t) < 0) notas.push(t);
      });
    });
    return { id: listaId(n, nv), ses: ses, secs: armarLista(ses.map(function (s) { return s.compra; })), notas: notas };
  }
  function progLista(secs, id) {
    var tot = 0, ok = 0;
    secs.forEach(function (sec) { sec.rows.forEach(function (r) { tot++; if (S.compras['c.' + id + '.' + r.k]) ok++; }); });
    return [ok, tot];
  }
  function progCompras(n, nv) { var L = listaCompras(n, nv); return progLista(L.secs, L.id); }

  /* ------------------------------------------------------------ HOY */
  rutas.hoy = function () {
    var p = P(), nv = nivelActual(), nx = proxima(), h = '', lv = regN(nv);
    if (!S.leidoS0) {
      h += '<section class="tarjeta destac"><h2>Antes de empezar</h2><p>La <strong>Semana 0</strong> es de seguridad, equipo y despensa. Léela entera antes de tu primera sesión (30-40 minutos, en dos veces).</p><a class="btn pri" href="#/guia">Leer la Semana 0</a></section>';
    }
    if (nx) {
      var w = planSem(nx);
      h += '<section class="tarjeta proxima"><p class="etq">Próxima sesión · ' + esc(nivelNom(nv)) + ' · Semana ' + w + ' de ' + totalSemPlan() + ' de tu plan</p>' +
        '<h2>' + esc(nx.titulo) + '</h2>' +
        '<p class="meta">' + etqSes(nx) + ' · ' + esc(SEM[nx.semana].titulo) + ' · ' + esc(tiempoT(nx)) + '</p>' +
        '<p>' + md(cap(nx.objetivo)) + '</p><div class="chips">' + chips(nx) + '</div>' +
        '<div class="btns"><a class="btn pri" href="#/cocinando/' + nx.id + '">Cocinar</a><a class="btn sec" href="#/sesion/' + nx.id + '">Ver sesión</a></div></section>';
    } else {
      var sig = nivelDisp(nv + 1) ? nv + 1 : 0;
      h += '<section class="tarjeta destac"><h2>Completaste el ' + esc(nivelNom(nv)) + '</h2><p>Hiciste las ' + lv.length + ' sesiones de este nivel. ' +
        (sig ? 'Puedes pasar al ' + esc(nivelNom(sig)) + ' cuando quieras; el recetario y el planificador siguen a tu disposición.' : 'El siguiente nivel llega pronto. Mientras tanto, repite tus favoritas y usa el recetario y el planificador.') + '</p>' +
        '<div class="btns"><a class="btn pri" href="#/logro/' + nv + '">Ver lo que aprendiste</a>' + (sig ? '<button class="btn sec" data-act="nivel-plan" data-v="' + sig + '">Empezar Nivel ' + sig + '</button>' : '') + '</div>' +
        (nv === 1 && BYID.bonus && !S.hechas.bonus ? '<div class="btns"><a class="btn sec" href="#/sesion/bonus">Hacer el bonus: tacos</a></div>' : '') + '</section>';
    }
    var n = nHechasN(nv);
    h += '<section class="tarjeta"><div class="prog-f"><strong>' + n + ' de ' + lv.length + '</strong><span>sesiones hechas del ' + esc(nivelNom(nv)) + '</span></div>' + barraProgreso(n, lv.length, 'Progreso del Nivel ' + nv) + '</section>';
    h += '<h2 class="gh">¿Qué cocino hoy?</h2><div class="grupo"><a class="fila" href="#/recetas"><span class="fila-t"><strong>Ideas para ' + MOM_ART[momentoAhora()] + '</strong><small>Recetas según la hora, tu equipo y lo que ya dominas</small></span>' + ico('sig', 'sig') + '</a>' +
      '<a class="fila" href="#/planificador"><span class="fila-t"><strong>Menú de la semana</strong><small>' + (planVigente() ? planResumen() : 'Elige tus comidas y arma la lista de compras sumada') + '</small></span>' + ico('sig', 'sig') + '</a></div>';
    if (nx) {
      var w2 = planSem(nx);
      var lista2 = lv.filter(function (s) { return planSem(s) === w2 && !opcOff(s); });
      h += '<h2 class="gh">Esta semana del plan</h2><div class="grupo">' + lista2.map(function (s) { return filaSesion(s, { chips: false }); }).join('') + '</div>';
      var cn = semanaCompras(nx), pc = progCompras(cn);
      h += '<h2 class="gh">Compras</h2><div class="grupo"><a class="fila" href="#/compras/' + cn + '"><span class="fila-t"><strong>Lista de la Semana ' + cn + ' de tu plan</strong><small>' + pc[0] + ' de ' + pc[1] + ' marcados · sesiones ' + lista2.map(function (s) { return s.num; }).join(', ') + '</small></span>' + ico('sig', 'sig') + '</a></div>';
    }
    if (nv === 1) {
      var nota = nivelNota();
      h += '<h2 class="gh">Tu nivel</h2><section class="tarjeta"><p>' + esc(nota.txt) + '</p>';
      if (nota.link) h += '<a class="btn sec" href="' + nota.link + '">' + nota.lt + '</a>';
      if (nota.saltar) {
        var yaSalto = REG.filter(esInicial).every(function (s) { return !pendiente(s); });
        if (!yaSalto) h += '<button class="btn sec" data-act="saltar">Saltar a «Granos y olla de presión» (marca como omitidas las sesiones de cuchillo, huevos y arroz)</button>';
      }
      h += '</section>';
    } else {
      var inf = ((D.niveles || []).filter(function (x) { return x.n === nv; })[0]) || {};
      h += '<h2 class="gh">Tu nivel</h2><section class="tarjeta"><p><strong>' + esc(nivelNom(nv)) + '.</strong> ' + esc(inf.resumen || '') + '</p><p class="pie-c">Puedes volver al Nivel 1 cuando quieras desde la pestaña Curso: todo sigue abierto.</p></section>';
    }
    return pagina({ titulo: 'Hoy' }, h);
  };

  /* ------------------------------------------------------------ CURSO */
  var vistaCurso = 'plan';
  rutas.curso = function (seg) {
    if (seg[1] === 'temas') vistaCurso = 'temas'; else if (seg[1] === 'plan') vistaCurso = 'plan';
    var h = '<div class="seg" role="tablist"><a role="tab" aria-selected="' + (vistaCurso === 'plan') + '" class="' + (vistaCurso === 'plan' ? 'on' : '') + '" href="#/curso/plan" data-replace="1">Mi plan</a>' +
      '<a role="tab" aria-selected="' + (vistaCurso === 'temas') + '" class="' + (vistaCurso === 'temas' ? 'on' : '') + '" href="#/curso/temas" data-replace="1">Por temas</a></div>';
    var nv = nivelActual(), lvN = regN(nv);
    h += '<section class="tarjeta"><p class="etq">' + esc(nivelNom(nv)) + ' · tu plan</p><div class="prog-f"><strong>' + nHechasN(nv) + ' de ' + lvN.length + '</strong><span>sesiones hechas</span></div>' + barraProgreso(nHechasN(nv), lvN.length, 'Progreso del Nivel ' + nv) +
      '<p class="pie-c">' + (nivelCompleto(nv) ? 'Nivel completado. ' : '') + 'Todo está abierto: elige cualquier sesión cuando quieras. El plan solo sugiere el orden.</p>' +
      (nivelCompleto(nv) ? '<div class="btns"><a class="btn pri" href="#/logro/' + nv + '">Ver lo que aprendiste</a></div>' : '') + '</section>';
    h += '<h2 class="gh">Para empezar</h2><div class="grupo">' +
      '<a class="fila" href="#/inicio"><span class="fila-t"><strong>Cómo funciona el curso</strong><small>Plan, reglas básicas, aviso médico</small></span>' + ico('sig', 'sig') + '</a>' +
      '<a class="fila" href="#/guia"><span class="marca' + (S.leidoS0 ? ' hecha' : '') + '">' + (S.leidoS0 ? ico('ok') : '0') + '</span><span class="fila-t"><strong>Semana 0 · Antes de empezar</strong><small>Seguridad, equipo, despensa' + (S.leidoS0 ? ' · leída' : ' · leer primero') + '</small></span>' + ico('sig', 'sig') + '</a></div>';
    if (vistaCurso === 'plan') {
      var tot = totalSemPlan();
      for (var w = 1; w <= tot; w++) {
        var ls = lvN.filter(function (s) { return planSem(s) === w; });
        var hechas = ls.filter(function (s) { return S.hechas[s.id]; }).length;
        h += '<h2 class="gh">Semana ' + w + ' de tu plan <span class="gh-n">' + hechas + '/' + ls.length + '</span></h2><div class="grupo">' + ls.map(function (s) { return filaSesion(s); }).join('') + '</div>';
      }
      if (nv === 1 && BYID.bonus) h += '<h2 class="gh">Extra</h2><div class="grupo">' + filaSesion(BYID.bonus) + '</div>';
      h += '<p class="pie">' + esc(nivelNom(nv)) + ': ' + sPorSem() + ' sesiones por semana · ' + tot + ' semanas. Se cambia en Ajustes.</p>';
    } else {
      (D.niveles || []).filter(function (x) { return nivelDisp(x.n); }).forEach(function (x) {
        var sems = D.semanas.filter(function (sm) { return (sm.nivel || 1) === x.n; });
        h += '<h2 class="gh">' + esc(nivelNom(x.n)) + ' <span class="gh-n">' + sems.length + ' temas</span></h2><div class="grupo">' + sems.map(function (sm) {
          var ls = sm.sesiones.filter(function (i) { return i !== 'bonus'; });
          var hh = ls.filter(function (i) { return S.hechas[i]; }).length;
          return '<a class="fila" href="#/semana/' + sm.n + '"><span class="marca' + (hh === ls.length ? ' hecha' : '') + '">' + (hh === ls.length ? ico('ok') : sm.pos) + '</span><span class="fila-t"><strong>' + esc(sm.titulo) + '</strong><small>' + hh + ' de ' + ls.length + (ls.length === 1 ? ' hecha' : ' hechas') + '</small></span>' + ico('sig', 'sig') + '</a>';
        }).join('') + '</div>';
      });
    }
    h += '<h2 class="gh">Niveles</h2><div class="grupo">' + (D.niveles || []).map(function (x) {
      if (!nivelDisp(x.n)) return '<div class="fila est"><span class="fila-t"><strong>' + esc(nivelNom(x.n)) + '</strong><small>Próximamente · ' + esc(x.resumen) + '</small></span></div>';
      var act = x.n === nv, hn = nHechasN(x.n), tn = regN(x.n).length;
      return '<button class="fila btn-fila" data-act="nivel-plan" data-v="' + x.n + '"' + (act ? ' aria-current="true"' : '') + '><span class="fila-t"><strong>' + esc(nivelNom(x.n)) + (act ? ' · en tu plan' : '') + '</strong><small>' + hn + ' de ' + tn + ' hechas · ' + semanasNivel(x.n, sPorSem()) + ' semanas a ' + sPorSem() + ' por semana' + (act ? '' : ' · tocar para trabajar con este plan') + '</small></span></button>';
    }).join('') + '</div>';
    return pagina({ titulo: 'Curso' }, h);
  };

  rutas.semana = function (seg) {
    var n = parseInt(seg[1], 10), sm = SEM[n];
    if (!sm) return rutas.curso(['curso']);
    var h = '';
    h += bloques(sm.intro);
    sm.antes.forEach(function (e) { h += detalles(e.titulo, bloques(e.bloques), true); });
    h += '<h2 class="gh">Sesiones</h2><div class="grupo">' + sm.sesiones.map(function (i) { return filaSesion(BYID[i]); }).join('') + '</div>';
    sm.despues.forEach(function (e) { h += detalles(e.titulo, bloques(e.bloques), false); });
    var s1 = BYID[sm.sesiones[0]], wp = s1.bonus ? 'bonus' : planSem(s1), pcs = progCompras(wp, s1.nivel || 1);
    h += '<h2 class="gh">Compras</h2><div class="grupo"><a class="fila" href="' + hrefCompras(wp, s1.nivel || 1) + '"><span class="fila-t"><strong>' + (wp === 'bonus' ? 'Lista de compras del bonus' : 'Lista de compras de la Semana ' + wp + ' de tu plan') + '</strong><small>' + (wp === 'bonus' ? '' : 'Incluye la ' + etqSes(s1).toLowerCase() + ' · ') + pcs[0] + ' de ' + pcs[1] + ' marcados</small></span>' + ico('sig', 'sig') + '</a></div>';
    var ant = D.semanas[sm.pos - 2], sig = D.semanas[sm.pos];
    if (ant || sig) {
      h += '<div class="grupo nav2">' + (ant ? '<a class="fila" href="#/semana/' + ant.n + '">‹ ' + esc(ant.titulo) + '</a>' : '') + (sig ? '<a class="fila" href="#/semana/' + sig.n + '">' + esc(sig.titulo) + ' ›</a>' : '') + '</div>';
    }
    return pagina({ titulo: 'Tema ' + sm.pos + ' de ' + D.semanas.length, sub: esc(sm.titulo), atras: '#/curso' }, h);
  };

  rutas.inicio = function () {
    var i = D.inicio;
    var h = '<p class="lead">' + md(i.intro) + '</p>' + bloques(i.bloques);
    (D.niveles || []).filter(function (x) { return nivelDisp(x.n); }).forEach(function (x) {
      var sems = D.semanas.filter(function (sm) { return (sm.nivel || 1) === x.n; });
      h += '<h2 class="gh">' + esc(nivelNom(x.n)) + ' <span class="gh-n">' + sems.length + ' temas</span></h2><div class="grupo">' + sems.map(function (sm) {
        return '<a class="fila" href="#/semana/' + sm.n + '"><span class="marca">' + sm.pos + '</span><span class="fila-t"><strong>' + esc(sm.titulo) + '</strong><small>' + sm.sesiones.map(function (id) { return id === 'bonus' ? 'Bonus' : 'Sesión ' + BYID[id].num; }).join(' · ') + '</small></span>' + ico('sig', 'sig') + '</a>';
      }).join('') + '</div>';
    });
    return pagina({ titulo: 'Cómo funciona', atras: '#/curso' }, h);
  };

  rutas.guia = function () {
    var g = D.guia, p = P(), h = bloques(g.intro);
    g.secciones.forEach(function (sec, i) {
      if (sec.bebe && !p.bebe) return;
      if (sec.titulo.indexOf('altura') >= 0 && p.altura === false) return;
      var abierto = (i === 0) || (sec.titulo.indexOf('altura') >= 0 && p.altura);
      var extra = '';
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
    var sm = s.extra ? null : SEM[s.semana];
    h += '<p class="meta2">' + (s.extra ? 'Receta extra · ' + esc(cap(String(s.seccion || '').replace(/\s*\(.*$/, '').toLowerCase())) : (s.bonus ? 'Bonus' : 'Sesión ' + s.num + ' de ' + REG.length) + ' · ' + esc(sm.titulo)) + '</p>';
    if (s.opcional) h += '<section class="tarjeta aviso-n"><p><strong>Sesión opcional.</strong> Es para quien nunca ha cocinado. Si ya haces huevos y arroz con soltura' + (opcOff(s) ? ' (como dice tu perfil)' : '') + ', puedes saltarla: el curso sigue igual y no cuenta como pendiente.</p></section>';
    if ((s.nivel || 1) > nivelUsuario()) h += '<section class="tarjeta aviso-n"><p><strong>Más técnica.</strong> Esta sesión es de ' + esc(nivelNom(s.nivel)) + ': conviene haber hecho antes el ' + esc(nivelNom(s.nivel - 1)) + '. Puedes abrirla y leerla cuando quieras; es solo una sugerencia, no un bloqueo.</p></section>';
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
    if (p.altura === false) h += '<p class="nota-p">Los tiempos del curso se probaron en altura; a menor altura pueden ser algo más cortos: guíate por las señales de cada paso.</p>';
    // antes de la semana
    if (sm) sm.antes.forEach(function (e) { h += detalles('Antes de cocinar esta semana: ' + e.titulo, bloques(e.bloques), sm.sesiones[0] === s.id || /Seguridad/.test(e.titulo)); });
    if (!s.extra) h += '<section class="bloque"><h2>Objetivo</h2><p>' + md(cap(s.objetivo)) + '</p></section>';
    if (s.tecnica) h += '<section class="bloque"><h2>Técnica' + (s.tecnica.titulo ? ': ' + md(s.tecnica.titulo) : ' que aprendes') + '</h2>' + bloques(s.tecnica.bloques) + ilusHtml(s.ilus) + '</section>';
    else if (s.ilus) h += '<section class="bloque">' + ilusHtml(s.ilus) + '</section>';
    (s.extras || []).forEach(function (e) { h += '<section class="bloque"><h2>' + md(e.titulo) + '</h2>' + bloques(e.bloques) + '</section>'; });
    s.recetas.forEach(function (r, ri) {
      h += '<section class="bloque receta" id="rec-' + ri + '"><h2>Receta' + (r.etiqueta ? ' ' + r.etiqueta : '') + ': ' + md(cap(r.titulo)) + '</h2>' + ((r.etiquetas || []).indexOf('ecuador') >= 0 ? '<p class="chips"><span class="chip chip-ec">Cocina de Ecuador</span></p>' : '');
      if (r.rinde) h += '<p class="rinde">Receta base: ' + md(r.rinde) + '.</p>';
      h += bloques(r.intro);
      h += '<h3 class="h3">Ingredientes</h3>' + ingredientesHtml(r, f);
      h += '<h3 class="h3">Pasos</h3><ol class="pasos">' + r.pasos.map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ol>' + notaTiempos();
      h += bloques(r.notas);
      if (r.seguridad) h += '<h3 class="h3">Seguridad</h3><p>' + md(r.seguridad) + '</p>';
      var cu = S.cocinadas[r.rid], hoyOk = cu === hoyISO(), dc = cu ? diasDesde(cu) : null;
      h += '<div class="cocine"><button class="btn ' + (hoyOk ? 'ok' : 'sec') + '" data-act="cocine" data-rid="' + esc(r.rid) + '">' + (hoyOk ? 'Cocinada hoy ✓ (deshacer)' : 'Lo cociné hoy') + '</button>' +
        (dc !== null && !hoyOk ? '<small>Última vez: ' + haceTxt(dc) + '</small>' : '') + '</div></section>';
    });
    if (p.bebe) h += stageBebe(s);
    if (s.errores.length || s.salioBien.length) {
      h += '<section class="bloque"><h2>Errores comunes y cómo saber si salió bien</h2><ul class="lista-txt">' + s.errores.map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ul>' +
        s.salioBien.map(function (t) { return '<p class="salio">' + md(t) + '</p>'; }).join('') + '</section>';
    }
    if (s.reto) h += '<section class="bloque"><h2>Reto opcional</h2><p>' + md(s.reto) + '</p></section>';
    h += '<div class="relleno-accion"></div>';
    var hecha = S.hechas[s.id];
    if (s.extra) h += '<div class="accion-fija"><a class="btn pri" href="#/cocinando/' + s.id + '">Cocinar</a><a class="btn sec" href="#/recetas">Ver recetas</a></div>';
    else h += '<div class="accion-fija"><a class="btn pri" href="#/cocinando/' + s.id + '">Cocinar</a><button class="btn ' + (hecha ? 'sec' : 'ok') + '" data-act="hecha" data-id="' + s.id + '">' + (hecha ? 'Hecha ✓ (deshacer)' : 'Marcar como hecha') + '</button></div>';
    return pagina({ titulo: s.titulo, atras: s.extra ? '#/recetas' : '#/curso' }, h);
  };
  rutas.sesion.post = function (seg) {
    if (seg[2] && navPush) {   // llegó desde el recetario: baja a esa receta
      var el = document.getElementById('rec-' + String(seg[2]).replace(/^r/, ''));
      if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 0);
    }
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
      var hecha = S.hechas[s.id], cuh = S.cocinadas[s.recetas[0].rid] === hoyISO();
      if (s.extra) body = '<p class="ck-etq">Fin de la receta</p><h1 class="ck-t">¡Listo!</h1><p class="ck-paso peq">Guarda lo que sobre en recipientes tapados, dentro de la primera hora (arroz: enfríalo rápido y úsalo en 1 día).</p>' +
        '<div class="ck-fin"><button class="btn ' + (cuh ? 'ok' : 'sec') + '" data-act="cocine" data-rid="' + esc(s.recetas[0].rid) + '">' + (cuh ? 'Cocinada hoy ✓ (deshacer)' : 'Lo cociné hoy') + '</button><a class="btn sec" href="#/sesion/' + s.id + '">Volver a la receta</a></div>';
      else body = '<p class="ck-etq">Fin de la sesión</p><h1 class="ck-t">¡Listo!</h1><p class="ck-paso peq">Guarda lo que sobre en recipientes tapados, dentro de la primera hora (arroz: enfríalo rápido y úsalo en 1 día).</p>' +
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
    var nx = proxima(), esB = seg[1] === 'bonus';
    var nv = esB ? 1 : (parseInt(seg[2], 10) || nivelActual());
    if (!nivelDisp(nv)) nv = nivelActual();
    var tot = totalSemPlan(nv);
    var n = esB ? 'bonus' : (parseInt(seg[1], 10) || (nx ? semanaCompras(nx) : 1));
    if (!esB) n = Math.min(tot, Math.max(1, n));
    var L = listaCompras(n, nv), f = factor(), pc = progCompras(n, nv);
    var h = '';
    var pl = planVigente();
    if (pl && !esB) h += '<div class="grupo"><a class="fila" href="#/planificador/compras"><span class="fila-t"><strong>Compras de tu menú de la semana</strong><small>' + planResumen() + ' · ' + progPlan().join(' de ') + ' marcados</small></span>' + ico('sig', 'sig') + '</a></div>';
    if (!esB) {
      h += '<div class="sel-sem"><a class="btn-sm" href="' + hrefCompras(Math.max(1, n - 1), nv) + '" data-replace="1" aria-label="Semana anterior"' + (n === 1 ? ' aria-disabled="true"' : '') + '>‹</a><strong>Semana ' + n + ' de ' + tot + ' de tu plan' + (nv > 1 ? ' · Nivel ' + nv : '') + '</strong><a class="btn-sm" href="' + hrefCompras(Math.min(tot, n + 1), nv) + '" data-replace="1" aria-label="Semana siguiente"' + (n === tot ? ' aria-disabled="true"' : '') + '>›</a></div>';
    } else {
      h += '<div class="sel-sem"><a class="btn-sm" href="#/compras/' + totalSemPlan(1) + '/1" data-replace="1" aria-label="Volver a la última semana">‹</a><strong>Extra · bonus de tacos</strong><span class="btn-sm" aria-hidden="true"></span></div>';
    }
    h += '<section class="tarjeta"><div class="prog-f"><strong>' + pc[0] + ' de ' + pc[1] + '</strong><span>marcados</span></div>' + barraProgreso(pc[0], pc[1], 'Lista de compras') +
      '<p class="pie-c">Suma los ingredientes de las sesiones de ' + (esB ? 'este extra' : 'esta semana de tu plan') + ': <strong>' + L.ses.map(function (s) { return s.bonus ? 'bonus' : s.num; }).join(', ') + '</strong>. Cantidades ×' + fmtF(f) + ' para tus porciones, redondeadas hacia arriba. Marca lo que ya tienes en casa.</p></section>';
    h += seccionesCompras(L.secs, L.id);
    L.notas.forEach(function (t) { h += '<p class="pie">' + md(t) + '</p>'; });
    if (!esB && BYID.bonus && nv === 1 && n === tot) h += '<div class="grupo"><a class="fila" href="#/compras/bonus"><span class="fila-t"><strong>Lista del bonus: tacos</strong><small>Sesión extra, fuera del plan</small></span>' + ico('sig', 'sig') + '</a></div>';
    h += '<div class="acciones-pie"><button class="btn sec" data-act="desmarcar" data-n="' + L.id + '">Desmarcar toda la lista</button></div>';
    return pagina({ titulo: 'Compras' }, h);
  };
  function seccionesCompras(secs, id) {
    var h = '';
    secs.forEach(function (sec) {
      h += '<h2 class="gh">' + esc(sec.titulo) + '</h2><div class="grupo">' + sec.rows.map(function (r) {
        var k = 'c.' + id + '.' + r.k, on = !!S.compras[k];
        return '<label class="fila chk' + (on ? ' on' : '') + '"><input type="checkbox" data-act="chk" data-k="' + esc(k) + '" data-l="' + id + '"' + (on ? ' checked' : '') + '><span class="caja">' + ico('ok') + '</span><span class="fila-t">' + r.html + '</span></label>';
      }).join('') + '</div>';
    });
    return h;
  }

  /* ------------------------------------------------------------ CONTROLES DE PERFIL */
  function ctlSeg(key, opts, val, etq) {
    return '<div class="ctl"><span class="ctl-e" id="l_' + key + '">' + etq + '</span><div class="segc" role="radiogroup" aria-labelledby="l_' + key + '">' + opts.map(function (o) {
      return '<button type="button" role="radio" aria-checked="' + (o[0] === val) + '" class="' + (o[0] === val ? 'on' : '') + '" data-act="set" data-k="' + key + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div></div>';
  }
  function ctlStep(key, val, min, max, etq, sufijo, ini) {
    var vacio = (val === null || val === undefined);
    var ia = ' data-ini="' + (ini === undefined ? min : ini) + '"';
    return '<div class="ctl fila-ctl"><span class="ctl-e" id="l_' + key + '">' + etq + '</span><div class="stepper" role="group" aria-labelledby="l_' + key + '">' +
      '<button type="button" class="st-b" data-act="step" data-k="' + key + '" data-d="-1" data-min="' + min + '" data-max="' + max + '"' + ia + ' aria-label="Menos"' + (!vacio && val <= min ? ' disabled' : '') + '>−</button>' +
      '<output class="st-v" aria-live="polite">' + (vacio ? '<span aria-label="sin responder">—</span>' : val + (sufijo || '')) + '</output>' +
      '<button type="button" class="st-b" data-act="step" data-k="' + key + '" data-d="1" data-min="' + min + '" data-max="' + max + '"' + ia + ' aria-label="Más"' + (!vacio && val >= max ? ' disabled' : '') + '>+</button></div></div>';
  }
  /* Sí / No (reemplaza al interruptor: así una pregunta sin responder se ve sin responder) */
  function ctlSn(key, val, etq, desc) {
    var si = val === true, no = val === false;
    return '<div class="ctl"><span class="ctl-e" id="l_' + key + '"><strong class="ctl-s">' + etq + '</strong>' + (desc ? '<small class="ctl-d">' + desc + '</small>' : '') + '</span>' +
      '<div class="segc" role="radiogroup" aria-labelledby="l_' + key + '">' +
      '<button type="button" role="radio" aria-checked="' + si + '" class="' + (si ? 'on' : '') + '" data-act="setb" data-k="' + key + '" data-v="1">Sí</button>' +
      '<button type="button" role="radio" aria-checked="' + no + '" class="' + (no ? 'on' : '') + '" data-act="setb" data-k="' + key + '" data-v="0">No</button></div></div>';
  }
  function ctlSw(key, val, etq, desc) {
    return '<button type="button" role="switch" aria-checked="' + !!val + '" class="ctl fila-ctl sw' + (val ? ' on' : '') + '" data-act="tog" data-k="' + key + '"><span class="ctl-e"><strong>' + etq + '</strong>' + (desc ? '<small>' + desc + '</small>' : '') + '</span><span class="sw-pill"><i></i></span></button>';
  }
  function ctlChips(key, opts, arr, etq, ninguna) {
    return '<div class="ctl"><span class="ctl-e">' + etq + '</span><div class="chipsel">' + (ninguna ?
      '<button type="button" aria-pressed="' + ninguna.on + '" class="cs' + (ninguna.on ? ' on' : '') + '" data-act="multi" data-k="' + key + '" data-v="ninguna">' + (ninguna.on ? '✓ ' : '') + 'Ninguna</button>' : '') + opts.map(function (o) {
      var on = arr.indexOf(o[0]) >= 0;
      return '<button type="button" aria-pressed="' + on + '" class="cs' + (on ? ' on' : '') + '" data-act="multi" data-k="' + key + '" data-v="' + o[0] + '">' + (on ? '✓ ' : '') + esc(o[1]) + '</button>';
    }).join('') + '</div></div>';
  }
  var PASOS = ['bienvenida', 'nivel', 'personas', 'equipo', 'lugar', 'tiempo', 'gustos', 'resumen'];
  function formNivel(p) {
    return '<div class="grupo">' + NIVELES.map(function (n) {
      var on = p.nivel === n[0];
      return '<button type="button" role="radio" aria-checked="' + on + '" class="fila radio' + (on ? ' on' : '') + '" data-act="set" data-k="nivel" data-v="' + n[0] + '"><span class="fila-t"><strong>' + n[1] + '</strong><small>' + n[2] + '</small></span><span class="rd">' + (on ? ico('ok') : '') + '</span></button>';
    }).join('') + '</div>';
  }
  function formPersonas(p) {
    var h = '<div class="grupo form">' + ctlStep('adultos', p.adultos, 1, 8, 'Adultos', '') + ctlStep('ninos', p.ninos, 0, 6, 'Niños', '') + '</div>';
    h += '<p class="pie">Las recetas están escritas para 2 adultos. Cada niño cuenta como media porción.</p>';
    h += '<div class="grupo form">' + ctlSn('bebe', p.bebe, '¿Hay un bebé en casa?', 'Si lo hay, cada sesión muestra el apartado "Para la bebé" de su edad.');
    if (p.bebe) {
      h += ctlStep('bebeMeses', p.bebeMeses, 0, 36, 'Edad del bebé', ' meses', 9);
      h += ctlSeg('bebeGen', [['la', 'La bebé'], ['el', 'El bebé'], ['tu', 'Tu bebé']], p.bebeGen, 'Cómo lo nombramos');
    }
    h += '</div>';
    if (p.bebe) h += '<p class="pie">El bebé no cuenta para las porciones. Todo lo del bebé es información general: manda tu pediatra.</p>';
    return h;
  }
  function formEquipo(p) {
    var h = '<div class="grupo form">' + ctlSeg('fuego', [['gas', 'A gas'], ['electrica', 'Eléctrica'], ['induccion', 'Inducción']], p.fuego, 'Cocina') +
      ctlSeg('horno', [['electrico', 'Eléctrico'], ['gas', 'A gas'], ['no', 'No tengo']], p.horno, 'Horno') + '</div>';
    h += '<div class="grupo form">' + ctlSn('licuadora', p.licuadora, 'Licuadora') + ctlSn('olla', p.olla, 'Olla de presión') + ctlSn('microondas', p.microondas, 'Microondas', 'El curso no lo necesita.') + ctlSn('airfryer', p.airfryer, 'Air fryer', 'El curso no lo necesita.') + '</div>';
    return h;
  }
  function ctlPais(val) {
    return '<div class="ctl"><span class="ctl-e" id="l_pais"><strong class="ctl-s">¿En qué país cocinas?</strong><small class="ctl-d">Los ingredientes se muestran con el nombre que les das allá (jitomate, palta, choclo…).</small></span><div class="chipsel" role="radiogroup" aria-labelledby="l_pais">' + PAISES.map(function (o) {
      var on = o[0] === val;
      return '<button type="button" role="radio" aria-checked="' + on + '" class="cs' + (on ? ' on' : '') + '" data-act="set" data-k="pais" data-v="' + o[0] + '">' + (on ? '✓ ' : '') + esc(o[1]) + '</button>';
    }).join('') + '</div></div>';
  }
  function formLugar(p) {
    return '<div class="grupo form">' + ctlPais(p.pais) + '</div><div class="grupo form">' +
      ctlSn('altura', p.altura, '¿Vives en altura (más de ~2.000 m)?', 'Si dices que sí, añadimos los avisos de altura: el agua hierve a menos temperatura y casi todo tarda más.') + '</div><div class="grupo form">' +
      ctlSeg('medidas', [['metrico', 'Métricas'], ['us', 'EE. UU.']], p.medidas, 'Medidas') + '</div>' +
      '<p class="pie">Métricas: gramos, mililitros y °C. EE. UU.: onzas, libras, tazas y °F. Las cucharadas y las tazas de las recetas no cambian.</p>';
  }
  function formTiempo(p) {
    return '<div class="grupo form">' + ctlSeg('sesiones', [[2, '2'], [3, '3'], [4, '4']], p.sesiones, 'Sesiones por semana') +
      ctlSeg('minutos', [[30, '30'], [45, '45'], [60, '60'], [90, '90'], [120, '120']], p.minutos, 'Minutos por sesión') + '</div>' +
      '<p class="pie">' + (p.sesiones ? 'Con ' + p.sesiones + ' sesiones por semana, el Nivel 1 (' + regN(1).length + ' sesiones) son ' + semanasNivel(1, p.sesiones) + ' semanas' + (nivelDisp(2) ? ' y el Nivel 2 (' + regN(2).length + ' sesiones), ' + semanasNivel(2, p.sesiones) + ' semanas' : '') + ', en el mismo orden.' : 'Según cuántas sesiones hagas por semana, cada nivel se reparte en más o menos semanas, en el mismo orden. Puedes abrir cualquiera cuando quieras.') + '</p>';
  }
  function formGustos(p) {
    return '<div class="grupo form">' + ctlChips('gustos', GUSTOS, p.gustos, 'Gustos') + ctlChips('alergias', ALER, p.alergias, 'Alergias o intolerancias', { on: p.alergias.length === 0 && p.alergiaOk !== false }) +
      '<div class="ctl"><label class="ctl-e" for="alergiaTxt">Otras alergias (opcional)</label><input id="alergiaTxt" class="txt" type="text" autocomplete="off" value="' + esc(p.alergiaTxt) + '" data-text="alergiaTxt" placeholder="Ej.: kiwi, sésamo"></div></div>' +
      '<p class="pie">Las sesiones que no encajan se marcan con un aviso, pero no se esconden.</p>';
  }
  function resumenPerfil(p) {
    if (faltan(p).length) return '';
    var nv = NIVELES.filter(function (n) { return n[0] === p.nivel; })[0][1];
    var rows = [
      ['Nivel', nv], ['Personas', p.adultos + ' adulto(s)' + (p.ninos ? ', ' + p.ninos + ' niño(s)' : '') + (p.bebe ? ', bebé de ' + p.bebeMeses + ' meses' : '')],
      ['Cocina', { gas: 'A gas', electrica: 'Eléctrica', induccion: 'Inducción' }[p.fuego] + ' · horno ' + { electrico: 'eléctrico', gas: 'a gas', no: 'no' }[p.horno]],
      ['País y medidas', (PAISES.filter(function (x) { return x[0] === p.pais; })[0] || ['', ''])[1] + ' · ' + (p.altura ? 'en altura' : 'no en altura') + ' · medidas ' + (p.medidas === 'us' ? 'de EE. UU.' : 'métricas')],
      ['Equipo', [p.licuadora ? 'licuadora' : '', p.olla ? 'olla de presión' : '', p.microondas ? 'microondas' : '', p.airfryer ? 'air fryer' : ''].filter(Boolean).join(', ') || 'ninguno extra'],
      ['Tiempo', p.sesiones + ' sesiones por semana · ' + p.minutos + ' min'],
      ['Gustos', p.gustos.map(function (g) { return GUSTOS.filter(function (x) { return x[0] === g; })[0][1]; }).join(', ')],
      ['Alergias', p.alergias.map(function (a) { return ALER_NOM[a]; }).concat(p.alergiaTxt ? [p.alergiaTxt] : []).join(', ') || 'ninguna']
    ];
    return '<div class="grupo">' + rows.map(function (r) { return '<div class="fila est"><span class="fila-t"><small>' + r[0] + '</small><strong>' + esc(r[1]) + '</strong></span></div>'; }).join('') + '</div>';
  }
  var TIT_PASO = { lugar: ['¿Dónde cocinas?', 'Ajustamos los nombres, la altura y las medidas.'], nivel: ['¿Cuál es tu nivel?', 'Elige el que más se parezca.'], personas: ['¿Para quién cocinas?', 'Ajustamos las cantidades.'], equipo: ['¿Qué tienes en la cocina?', 'Avisamos si una receta necesita algo que no tienes.'], tiempo: ['¿Cuánto tiempo tienes?', 'Armamos el plan con tu ritmo.'], gustos: ['¿Qué te gusta y qué evitas?', 'Marca gustos y alergias.'], resumen: ['Todo listo', 'Revisa tu perfil. Lo puedes cambiar en Ajustes.'] };

  rutas.bienvenida = function (seg) {
    var n = parseInt(seg[1], 10) || 0;
    if (!S.draft || S.draft._v !== 2) { S.draft = perfilEnBlanco(); guardar(); }
    var p = S.draft, nombre = PASOS[n] || 'bienvenida';
    var h = '<main class="vista-in onb" id="main" tabindex="-1">';
    if (n === 0) {
      h += '<header class="tit"><h1 id="h1">Curso de cocina</h1><p class="sub-t">De cero a cocinar con confianza. Nivel 1 · Básico: unas ' + semanasNivel(1, 3) + ' semanas.</p></header>' +
        '<section class="tarjeta"><p>Antes de empezar te hacemos 6 preguntas rápidas para ajustar porciones, plan y equipo a tu casa.</p><ul class="lista-txt"><li>Todo se guarda <strong>solo en este dispositivo</strong>.</li><li>Sin cuentas, sin anuncios, sin rastreo.</li><li>Funciona sin internet una vez abierta.</li></ul></section>';
    } else {
      h += '<div class="onb-prog" aria-hidden="true"><span style="width:' + Math.round(n * 100 / (PASOS.length - 1)) + '%"></span></div><header class="tit"><p class="etq">Paso ' + n + ' de ' + (PASOS.length - 1) + '</p><h1 id="h1">' + TIT_PASO[nombre][0] + '</h1><p class="sub-t">' + TIT_PASO[nombre][1] + '</p></header><div id="formArea">' + formAreaHtml(n, p) + '</div>';
    }
    h += '<div class="relleno-accion"></div></main>';
    h += onbNav(n, p);
    return h;
  };
  /* ---- cuestionario: cada paso exige responder ---- */
  function respondido(nombre, p) {
    switch (nombre) {
      case 'nivel': return p.nivel !== null && p.nivel !== undefined;
      case 'personas': return p.adultos != null && p.ninos != null && p.bebe != null && (!p.bebe || (p.bebeMeses != null && p.bebeGen != null));
      case 'equipo': return ['fuego', 'horno', 'licuadora', 'olla', 'microondas', 'airfryer'].every(function (k) { return p[k] !== null && p[k] !== undefined; });
      case 'lugar': return p.pais != null && p.altura != null && p.medidas != null;
      case 'tiempo': return p.sesiones != null && p.minutos != null;
      case 'gustos': return p.gustos.length > 0 && p.alergiaOk !== false;
    }
    return true;
  }
  function faltan(p) { return PASOS.filter(function (nm) { return !respondido(nm, p); }); }
  var NOM_PASO = { nivel: 'Nivel', personas: 'Personas', equipo: 'Equipo', lugar: 'País y medidas', tiempo: 'Tiempo', gustos: 'Gustos y alergias' };
  function formAreaHtml(n, p) {
    var nombre = PASOS[n], h = formPaso(nombre, p);
    if (nombre === 'resumen') {
      var fl = faltan(p);
      if (fl.length) h += '<p class="pie falta" role="status">Falta responder: ' + fl.map(function (nm) { return '<a href="#/bienvenida/' + PASOS.indexOf(nm) + '">' + NOM_PASO[nm] + '</a>'; }).join(', ') + '.</p>';
    } else if (n > 0 && !respondido(nombre, p)) {
      h += '<p class="pie falta" role="status">Responde todas las preguntas de esta pantalla para continuar.</p>';
    }
    return h;
  }
  function onbNav(n, p) {
    var ult = PASOS.length - 1, ok = n === 0 || (n < ult ? respondido(PASOS[n], p) : faltan(p).length === 0);
    return '<div class="accion-fija onb-nav" id="onbNav">' + (n > 0 ? '<button class="btn sec" data-act="atras" data-padre="#/bienvenida/' + (n - 1) + '">Atrás</button>' : '') +
      (n < ult ? (ok ? '<a class="btn pri" href="#/bienvenida/' + (n + 1) + '">' + (n === 0 ? 'Empezar' : 'Siguiente') + '</a>' : '<button class="btn pri" disabled aria-disabled="true">Siguiente</button>')
        : '<button class="btn pri" data-act="fin-onb"' + (ok ? '' : ' disabled aria-disabled="true"') + '>Guardar y entrar</button>') + '</div>';
  };
  function formPaso(nombre, p) {
    return { nivel: formNivel, personas: formPersonas, equipo: formEquipo, lugar: formLugar, tiempo: formTiempo, gustos: formGustos, resumen: resumenPerfil }[nombre](p);
  }

  /* ------------------------------------------------------------ RECETAS · ¿Qué cocino hoy? */
  var MOMS = [['desayuno', 'Desayuno'], ['almuerzo', 'Almuerzo'], ['merienda', 'Merienda'], ['cena', 'Cena'], ['postre', 'Postre'], ['bebida', 'Bebida']];
  var MOM_NOM = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', merienda: 'Merienda', cena: 'Cena', postre: 'Postre', bebida: 'Bebida' };
  var MOM_ART = { desayuno: 'el desayuno', almuerzo: 'el almuerzo', merienda: 'la merienda', cena: 'la cena', postre: 'el postre', bebida: 'tomar algo' };
  var RECS = [];
  var RF = { cocina: 'todos', momento: 'todos', tiempo: 'todos', nivel: 'todos', q: '', eq: true, perfil: true, mas: false };   // filtros del recetario
  var REC = { m: null, pag: 0 };                                                                            // recomendador
  var HORA_SIM = null;
  function horaActual() { return HORA_SIM !== null ? HORA_SIM : new Date().getHours(); }
  function momentoAhora() {
    var h = horaActual();
    return h >= 5 && h < 11 ? 'desayuno' : (h >= 11 && h < 16 ? 'almuerzo' : (h >= 16 && h < 19 ? 'merienda' : 'cena'));
  }
  /* recetas extra (curso.json > extras): pseudo-sesiones solo para el recetario, el recomendador y el planificador.
     No entran en SES ni en REG, así que no cuentan para el plan del curso, las sesiones hechas ni los logros. */
  var EXT = [];
  function extraSes(e) {
    return { id: e.id, extra: true, nivel: e.nivel || 1, titulo: e.titulo, tiempo: e.tiempo, min: e.minutos, seccion: e.seccion,
      equipo: (e.equipo || []).map(function (id) { return { id: id }; }), tags: e.tags || {}, ingPlano: e.ingPlano || '',
      recetas: [e], bebe: e.bebe, errores: [], salioBien: [] };
  }
  function armarRecs() {
    RECS = [];
    SES.concat(EXT).forEach(function (s) {
      s.recetas.forEach(function (r, ri) {
        var ing = r.ingredientes.map(function (g) {
          return g.items.map(function (it) { return it.parts.map(function (p) { return typeof p === 'string' ? p : (p.s || '') + ' ' + (p.p || ''); }).join(''); }).join(' ');
        }).join(' ');
        var it = { id: r.rid, s: s, r: r, ri: ri, plano: norm(r.titulo + ' ' + ing) }; RECS.push(it); RBY[r.rid] = it;
      });
    });
  }
  /* por qué una receta no encaja con el perfil (no se esconde sola: depende de los interruptores) */
  function compatRec(x) {
    var p = P(), mot = [], et = x.r.etiquetas || [];
    (x.r.equipo || []).forEach(function (id) { if (!tiene(id)) mot.push({ k: 'equipo', t: 'Necesita: ' + EQ_NOM[id] }); });
    (p.alergias || []).forEach(function (a) { if (et.indexOf(a) >= 0) mot.push({ k: 'alergia', t: 'Alergia a ' + ALER_NOM[a].toLowerCase() }); });
    String(p.alergiaTxt || '').split(/[,;\n]/).map(function (w) { return norm(w.trim()); }).filter(function (w) { return w.length > 2; })
      .forEach(function (w) { if (contiene(x.plano, w)) mot.push({ k: 'alergia', t: 'Lleva "' + w + '"' }); });
    var g = p.gustos || [];
    if (g.indexOf('vegetariano') >= 0 && x.r.tipo === 'plato' && et.indexOf('vegetariano') < 0) mot.push({ k: 'gusto', t: 'Lleva carne o pescado' });
    if (g.indexOf('sin_cerdo') >= 0 && et.indexOf('cerdo') >= 0) mot.push({ k: 'gusto', t: 'Lleva cerdo' });
    if (g.indexOf('sin_mariscos') >= 0 && et.indexOf('mariscos') >= 0) mot.push({ k: 'gusto', t: 'Lleva mariscos' });
    return mot;
  }
  function jitter(id) { var s = id + hoyISO(), h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return (h % 100) / 100; }
  function puntaje(x) {
    var sc = 0, u = S.cocinadas[x.id], d = u ? diasDesde(u) : null, nx = proxima(), num = x.s.num || REG.length + 1, nn = nx ? nx.num : REG.length + 1;
    if (x.s.extra) sc += 0.6;                                                   // receta extra: sin plan de curso, entra en igualdad
    else if (S.hechas[x.s.id]) sc += 3;                                         // ya la dominas
    else sc += 1 - Math.min(1, Math.max(0, num - nn) / 30);                     // si no, las más cercanas a tu plan
    if (d === null) sc += 2;                                                    // nunca anotada en casa
    else sc += Math.min(Math.max(d, 0), 30) / 10 - (d < 1 ? 6 : (d < 4 ? 3 : 0));   // cocinada hace poco: baja
    return sc + jitter(x.id);
  }
  function ranking(m) {
    return RECS.filter(function (x) { return x.r.tipo === 'plato' && x.r.momento.indexOf(m) >= 0 && compatRec(x).length === 0; })
      .map(function (x) { return { x: x, sc: puntaje(x) }; }).sort(function (a, b) { return b.sc - a.sc; }).map(function (z) { return z.x; });
  }
  function razon(x) {
    var u = S.cocinadas[x.id], d = u ? diasDesde(u) : null;
    if (d !== null) return 'La cocinaste ' + haceTxt(d);
    if (x.s.extra) return 'Receta extra · todavía no la anotas';
    if (S.hechas[x.s.id]) return 'Ya la dominas (sesión hecha)';
    return 'Todavía no la has hecho';
  }
  function hrefRec(x) { return '#/sesion/' + x.s.id + '/r' + x.ri; }
  function recomHtml() {
    var m = REC.m || momentoAhora(), lista = ranking(m), n = lista.length, h = '';
    h += '<section class="tarjeta recom"><p class="etq">¿Qué cocino hoy?</p><h2>Ideas para ' + MOM_ART[m] + '</h2>';
    h += '<div class="chipsel mom" role="group" aria-label="Momento del día">' + MOMS.map(function (o) {
      return '<button type="button" class="cs' + (o[0] === m ? ' on' : '') + '" aria-pressed="' + (o[0] === m) + '" data-act="rec-mom" data-v="' + o[0] + '">' + o[1] + (!REC.m && o[0] === m && o[0] !== 'postre' ? ' · ahora' : '') + '</button>';
    }).join('') + '</div>';
    if (!n) {
      h += '<p class="pie-c">Con tu equipo y tu perfil no hay recetas para este momento. Prueba otro momento, o revisa tu equipo y tus alergias en Ajustes.</p>';
    } else {
      var k = Math.min(3, n), items = [];
      for (var i = 0; i < k; i++) items.push(lista[(REC.pag * 3 + i) % n]);
      h += '<div class="grupo">' + items.map(function (x) {
        return '<a class="fila" href="' + hrefRec(x) + '"><span class="fila-t"><strong>' + md(cap(x.r.titulo)) + '</strong><small>~' + x.r.minutos + ' min · ' + etqSes(x.s) + '</small><small class="razon">' + esc(razon(x)) + '</small></span>' + ico('sig', 'sig') + '</a>';
      }).join('') + '</div>';
      h += n > 3 ? '<div class="btns"><button class="btn sec" data-act="rec-otra">Otra opción</button></div>' : '<p class="pie-c">Solo hay ' + n + (n === 1 ? ' opción' : ' opciones') + ' para este momento con tu perfil.</p>';
    }
    return h + '</section>';
  }
  function buscaTok(plano, w) {
    if (plano.indexOf(w) >= 0) return true;
    if (w.length > 3 && w.slice(-2) === 'es' && plano.indexOf(w.slice(0, -2)) >= 0) return true;
    return w.length > 3 && w.slice(-1) === 's' && plano.indexOf(w.slice(0, -1)) >= 0;
  }
  function filtrar() {
    var q = norm(RF.q).split(/[\s,;]+/).filter(function (w) { return w.length > 1; }), out = [], ocultas = 0, uN = nivelUsuario();
    RECS.forEach(function (x) {
      var r = x.r;
      if (RF.momento === 'bebe') { if (r.momento.indexOf('bebe') < 0) return; }
      else if (RF.momento === 'base') { if (r.tipo !== 'base') return; }
      else if (RF.momento !== 'todos' && r.momento.indexOf(RF.momento) < 0) return;
      if (RF.cocina === 'ecuador' && (r.etiquetas || []).indexOf('ecuador') < 0) return;
      if (RF.tiempo === '20' && r.minutos > 20) return;
      if (RF.tiempo === '45' && r.minutos > 45) return;
      if (RF.tiempo === 'mas' && r.minutos <= 45) return;
      if (RF.nivel !== 'todos' && (x.s.nivel || 1) !== +RF.nivel) return;
      if (q.length && !q.every(function (w) { return buscaTok(x.plano, w) || altCanon(w).some(function (c) { return buscaTok(x.plano, c); }); })) return;
      var mot = compatRec(x);
      var oculta = mot.some(function (m) { return m.k === 'equipo' ? RF.eq : RF.perfil; });
      if (oculta) { ocultas++; return; }
      out.push({ x: x, mot: mot, nivelAlto: (x.s.nivel || 1) > uN });
    });
    return { out: out, ocultas: ocultas };
  }
  function filaRec(z) {
    var x = z.x, r = x.r, s = x.s, u = S.cocinadas[x.id], d = u ? diasDesde(u) : null;
    var mom = r.momento.filter(function (m) { return MOM_NOM[m]; }).map(function (m) { return MOM_NOM[m].toLowerCase(); }).join(', ');
    var ch = '';
    z.mot.forEach(function (m) { ch += '<span class="chip chip-' + (m.k === 'equipo' ? 'eq' : m.k) + '">' + (m.k === 'alergia' ? 'Atención: ' : (m.k === 'gusto' ? 'Aviso: ' : '')) + esc(m.t) + '</span>'; });
    if (z.nivelAlto) ch += '<span class="chip chip-t">Más técnica: ' + esc(nivelNom(s.nivel)) + '</span>';
    if ((r.etiquetas || []).indexOf('ecuador') >= 0) ch += '<span class="chip chip-ec">Cocina de Ecuador</span>';
    if (P().bebe && r.momento.indexOf('bebe') >= 0) ch += '<span class="chip chip-ok">Con porción para el bebé</span>';
    return '<a class="fila" href="' + hrefRec(x) + '"><span class="fila-t"><strong>' + md(cap(r.titulo)) + '</strong>' +
      '<small>~' + r.minutos + ' min · ' + (r.tipo === 'base' ? 'Salsa o base' : esc(cap(mom))) + '</small>' +
      '<small>' + etqSes(s) + ' · Nivel ' + (s.nivel || 1) + (d !== null ? ' · Cocinada ' + haceTxt(d) : '') + '</small>' +
      (ch ? '<span class="chips">' + ch + '</span>' : '') + '</span>' + ico('sig', 'sig') + '</a>';
  }
  function listaRecHtml() {
    var f = filtrar(), h = '';
    var cuenta = f.out.length + (f.out.length === 1 ? ' receta' : ' recetas') + (f.ocultas ? ' · ' + f.ocultas + ' oculta' + (f.ocultas > 1 ? 's' : '') + ' por tu equipo o tu perfil' : '');
    if (!f.out.length) {
      h = '<section class="tarjeta"><p>' + (RF.nivel !== 'todos' && RF.nivel !== '1' ? 'Todavía no hay recetas de ese nivel: llegan pronto.' : 'Ninguna receta con esos filtros.') + '</p><button class="btn sec" data-act="rf-clear">Quitar filtros</button></section>';
    } else h = '<div class="grupo">' + f.out.map(filaRec).join('') + '</div>';
    return { cuenta: cuenta, html: h };
  }
  function chipRf(k, v, txt) {
    var on = RF[k] === v;
    return '<button type="button" class="cs' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="rf" data-k="' + k + '" data-v="' + v + '">' + (on ? '✓ ' : '') + txt + '</button>';
  }
  function filtrosHtml() {
    var h = '<div class="grupo form"><div class="ctl"><span class="ctl-e">Momento</span><div class="chipsel">' +
      chipRf('momento', 'todos', 'Todos') + MOMS.map(function (o) { return chipRf('momento', o[0], o[1]); }).join('') + chipRf('momento', 'bebe', 'Para el bebé') + chipRf('momento', 'base', 'Salsas y bases') + '</div></div>' +
      '<div class="ctl"><span class="ctl-e">Cocina</span><div class="chipsel">' + chipRf('cocina', 'todos', 'Todas') + chipRf('cocina', 'ecuador', 'Cocina de Ecuador') + '</div></div></div>';
    var activos = (RF.tiempo !== 'todos' ? 1 : 0) + (RF.nivel !== 'todos' ? 1 : 0) + (RF.eq ? 0 : 1) + (RF.perfil ? 0 : 1);
    h += '<details class="desp" id="recMas"' + (RF.mas ? ' open' : '') + '><summary><span>Más filtros' + (activos ? ' · ' + activos + ' cambiado' + (activos > 1 ? 's' : '') : '') + '</span>' + ico('sig', 'flecha') + '</summary><div class="desp-c">' +
      '<div class="ctl"><span class="ctl-e">Tiempo</span><div class="chipsel">' + chipRf('tiempo', 'todos', 'Cualquiera') + chipRf('tiempo', '20', 'Hasta 20 min') + chipRf('tiempo', '45', 'Hasta 45 min') + chipRf('tiempo', 'mas', 'Más de 45 min') + '</div></div>' +
      '<div class="ctl"><span class="ctl-e">Nivel</span><div class="chipsel">' + chipRf('nivel', 'todos', 'Todos') + (D.niveles || []).map(function (nv) { return chipRf('nivel', String(nv.n), 'Nivel ' + nv.n + (nv.estado !== 'disponible' ? ' · pronto' : '')); }).join('') + '</div></div>' +
      '<div class="ctl"><span class="ctl-e">Según tu perfil</span><div class="chipsel">' +
      '<button type="button" class="cs' + (RF.eq ? ' on' : '') + '" aria-pressed="' + RF.eq + '" data-act="rf-tog" data-k="eq">' + (RF.eq ? '✓ ' : '') + 'Solo con mi equipo</button>' +
      '<button type="button" class="cs' + (RF.perfil ? ' on' : '') + '" aria-pressed="' + RF.perfil + '" data-act="rf-tog" data-k="perfil">' + (RF.perfil ? '✓ ' : '') + 'Respetar alergias y gustos</button></div></div>' +
      '</div></details>';
    return h;
  }
  rutas.recetas = function () {
    REC.m = null; REC.pag = 0;
    var l = listaRecHtml(), h = '<div id="recRecom">' + recomHtml() + '</div>';
    h = '<div class="grupo"><a class="fila" href="#/planificador"><span class="fila-t"><strong>Menú de la semana</strong><small>' + (planVigente() ? planResumen() + ' · ver o cambiar' : 'Elige tus comidas y arma la lista de compras sumada') + '</small></span>' + ico('sig', 'sig') + '</a></div>' + h;
    h += '<div class="buscar"><label class="ctl-e" for="recQ">Buscar por ingrediente o nombre</label><input id="recQ" class="txt" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder="Ej.: huevo, pollo, papa" value="' + esc(RF.q) + '" data-rf="q"></div>';
    h += '<div id="recFiltros">' + filtrosHtml() + '</div>';
    h += '<p class="pie" id="recCuenta" role="status" aria-live="polite">' + esc(l.cuenta) + '</p><div id="recLista">' + l.html + '</div>';
    return pagina({ titulo: 'Recetas', sub: 'Las recetas del curso y ' + EXT.length + ' extras, para elegir qué cocinar.' }, h);
  };
  function refrescarLista() {
    var l = listaRecHtml(), a = $('#recLista'), b = $('#recCuenta');
    if (a) a.innerHTML = l.html;
    if (b) b.textContent = l.cuenta;
  }
  function refrescarRec() {
    var fl = $('#recFiltros'); if (fl) fl.innerHTML = filtrosHtml();
    refrescarLista();
  }
  function refrescarRecom() { var r = $('#recRecom'); if (r) r.innerHTML = recomHtml(); }
  function refocus(act, k, v) {
    var sel = '[data-act="' + act + '"]' + (k ? '[data-k="' + k + '"]' : '') + (v ? '[data-v="' + v + '"]' : ''), el = document.querySelector(sel);
    if (el) el.focus();
  }
  /* ------------------------------------------------------------ PLANIFICADOR SEMANAL */
  /* S.plan = { cfg: { dias, comidas }, slots: { 'lun|almuerzo': rid, ... } | null, seed, fecha }.
     Propone recetas ya cocinadas o de sesiones hechas; si faltan, las de tu nivel. Respeta equipo, alergias, gustos y bebé.
     La lista de compras suma la "compra" de cada receta (la misma lógica que Compras). */
  var DIAS = [['lun', 'Lunes'], ['mar', 'Martes'], ['mie', 'Miércoles'], ['jue', 'Jueves'], ['vie', 'Viernes'], ['sab', 'Sábado'], ['dom', 'Domingo']];
  var DIA_NOM = {}; DIAS.forEach(function (d) { DIA_NOM[d[0]] = d[1]; });
  var COMIDAS = [['desayuno', 'Desayuno'], ['almuerzo', 'Almuerzo'], ['merienda', 'Merienda'], ['cena', 'Cena']];
  var PL_MAS = false;
  var PL_DEF = { dias: ['lun', 'mar', 'mie', 'jue', 'vie'], comidas: ['almuerzo', 'cena'] };
  var RBY = {};
  function planEnsure() {
    if (!S.plan || !S.plan.cfg) S.plan = { cfg: { dias: PL_DEF.dias.slice(), comidas: PL_DEF.comidas.slice() }, slots: null, seed: 0, fecha: null };
    return S.plan;
  }
  function planVigente() { return !!(S.plan && S.plan.slots && planKeys().some(function (k) { return S.plan.slots[k]; })); }
  function planKeys() {
    var c = (S.plan && S.plan.cfg) || PL_DEF, out = [];
    DIAS.forEach(function (d) { if (c.dias.indexOf(d[0]) < 0) return; COMIDAS.forEach(function (m) { if (c.comidas.indexOf(m[0]) >= 0) out.push(d[0] + '|' + m[0]); }); });
    return out;
  }
  function planResumen() {
    var ks = planKeys().filter(function (k) { return S.plan.slots && S.plan.slots[k]; }), dist = {};
    ks.forEach(function (k) { dist[S.plan.slots[k]] = 1; });
    return ks.length + (ks.length === 1 ? ' comida' : ' comidas') + ' · ' + Object.keys(dist).length + (Object.keys(dist).length === 1 ? ' receta' : ' recetas');
  }
  function jit2(id, seed) { var s = id + '#' + seed, h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return (h % 100) / 100; }
  /* candidatas para una comida, de mejor a peor: 1.º ya cocinadas / de sesiones hechas, 2.º de tu nivel, 3.º el resto; con bebé, las que traen su porción primero */
  function candPlan(comida, dia, seed) {
    var baby = !!P().bebe, nvA = nivelActual(), fin = dia === 'sab' || dia === 'dom';
    return RECS.filter(function (x) { return x.r.tipo === 'plato' && x.r.momento.indexOf(comida) >= 0 && compatRec(x).length === 0; }).map(function (x) {
      var hecha = !!S.hechas[x.s.id] || !!S.cocinadas[x.id], tier = hecha ? 2 : ((x.s.nivel || 1) <= nvA ? 1 : 0);
      var apta = x.r.momento.indexOf('bebe') >= 0, sc = tier * 10 + puntaje(x) + jit2(x.id, seed);
      if (!fin) sc += x.r.minutos > 45 ? -1.5 : (x.r.minutos <= 20 ? 0.3 : 0);
      if (baby && !apta) sc -= 40;
      return { x: x, sc: sc, sinBebe: baby && !apta };
    }).sort(function (a, b) { return b.sc - a.sc; });
  }
  function planRellenar(slots, seed) {
    var usados = {};
    planKeys().forEach(function (k) { if (slots[k]) usados[slots[k]] = (usados[slots[k]] || 0) + 1; });
    planKeys().forEach(function (k) {
      if (slots[k]) return;
      var pr = k.split('|'), c = candPlan(pr[1], pr[0], seed), pick = null, i;
      for (i = 0; i < c.length; i++) if (!usados[c[i].x.id]) { pick = c[i]; break; }
      if (!pick && c.length) { pick = c[0]; for (i = 1; i < c.length; i++) if ((usados[c[i].x.id] || 0) < (usados[pick.x.id] || 0)) pick = c[i]; }
      slots[k] = pick ? pick.x.id : null;
      if (pick) usados[pick.x.id] = (usados[pick.x.id] || 0) + 1;
    });
    return slots;
  }
  function planSync() {   // tras cambiar días o comidas: se quita lo que sobra y se rellena lo que falta
    var pl = planEnsure(); if (!pl.slots) return;
    var ks = planKeys(), nuevo = {};
    ks.forEach(function (k) { if (pl.slots[k]) nuevo[k] = pl.slots[k]; });
    pl.slots = planRellenar(nuevo, pl.seed);
  }
  function planArmar(otraVez) {
    var pl = planEnsure();
    pl.seed = otraVez ? (pl.seed || 0) + 1 : (pl.seed || 0);
    pl.slots = planRellenar({}, pl.seed); pl.fecha = hoyISO();
    Object.keys(S.compras).forEach(function (kk) { if (kk.indexOf('c.plan.') === 0) delete S.compras[kk]; });
  }
  function planCambiar(key) {
    var pl = planEnsure(), pr = key.split('|'), c = candPlan(pr[1], pr[0], pl.seed), actual = pl.slots[key], otras = {};
    planKeys().forEach(function (k) { if (k !== key && pl.slots[k]) otras[pl.slots[k]] = 1; });
    if (!c.length) return false;
    var ix = -1, i; for (i = 0; i < c.length; i++) if (c[i].x.id === actual) ix = i;
    for (var pasada = 0; pasada < 2; pasada++) {
      for (i = 1; i <= c.length; i++) {
        var z = c[(ix + i + c.length) % c.length].x;
        if (z.id === actual) continue;
        if (pasada === 0 && otras[z.id]) continue;
        pl.slots[key] = z.id; return true;
      }
    }
    return false;
  }
  function listaPlan() {
    var cs = [], rids = [];
    planKeys().forEach(function (k) { var id = S.plan && S.plan.slots && S.plan.slots[k]; if (id && RBY[id]) { cs.push(RBY[id].r.compra); rids.push(id); } });
    return { secs: armarLista(cs), rids: rids };
  }
  function progPlan() { return progLista(listaPlan().secs, 'plan'); }

  function chipPl(act, v, on, txt) {
    return '<button type="button" class="cs' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="' + act + '" data-v="' + v + '">' + (on ? '✓ ' : '') + txt + '</button>';
  }
  function planConfigHtml(pl) {
    var c = pl.cfg;
    return '<div class="ctl"><span class="ctl-e">Días</span><div class="chipsel">' + DIAS.map(function (d) { return chipPl('plan-dia', d[0], c.dias.indexOf(d[0]) >= 0, d[1].slice(0, 3)); }).join('') + '</div></div>' +
      '<div class="ctl"><span class="ctl-e">Comidas de cada día</span><div class="chipsel">' + COMIDAS.map(function (m) { return chipPl('plan-comida', m[0], c.comidas.indexOf(m[0]) >= 0, m[1]); }).join('') + '</div></div>';
  }
  function filaPlan(key) {
    var pl = S.plan, id = pl.slots[key], x = id ? RBY[id] : null, pr = key.split('|'), mom = MOM_NOM[pr[1]];
    if (!x) return '<div class="plan-fila"><div class="fila est"><span class="fila-t"><small class="etq-m">' + mom + '</small><strong>Sin receta</strong><small>Con tu equipo y tu perfil no hay recetas para esta comida.</small></span></div></div>';
    var u = S.cocinadas[x.id], d = u ? diasDesde(u) : null, baby = !!P().bebe, apta = x.r.momento.indexOf('bebe') >= 0, ch = '';
    if (baby) ch += apta ? '<span class="chip chip-ok">Con porción para el bebé</span>' : '<span class="chip chip-t">Sin porción para el bebé</span>';
    if ((x.s.nivel || 1) > nivelUsuario()) ch += '<span class="chip chip-t">Más técnica: ' + esc(nivelNom(x.s.nivel)) + '</span>';
    return '<div class="plan-fila"><a class="fila" href="' + hrefRec(x) + '"><span class="fila-t"><small class="etq-m">' + mom + '</small><strong>' + md(cap(x.r.titulo)) + '</strong>' +
      '<small>~' + x.r.minutos + ' min · ' + etqSes(x.s) + (d !== null ? ' · cocinada ' + haceTxt(d) : (x.s.extra ? '' : (S.hechas[x.s.id] ? ' · sesión hecha' : ' · aún no la haces'))) + '</small>' +
      (ch ? '<span class="chips">' + ch + '</span>' : '') + '</span></a>' +
      '<button type="button" class="plan-camb" data-act="plan-cambiar" data-v="' + key + '" aria-label="Cambiar ' + esc(x.r.titulo) + ' (' + DIA_NOM[pr[0]] + ', ' + mom.toLowerCase() + ')">Cambiar</button></div>';
  }
  rutas.planificador = function (seg) {
    var pl = planEnsure(), vc = seg[1] === 'compras' && planVigente(), h = '';
    if (planVigente()) {
      h += '<div class="seg" role="tablist"><a role="tab" aria-selected="' + !vc + '" class="' + (vc ? '' : 'on') + '" href="#/planificador" data-replace="1">Menú</a>' +
        '<a role="tab" aria-selected="' + vc + '" class="' + (vc ? 'on' : '') + '" href="#/planificador/compras" data-replace="1">Lista de compras</a></div>';
    }
    if (!planVigente()) {
      h += '<section class="tarjeta"><p class="etq">Menú de la semana</p><h2>Elige tus comidas</h2><p>Marca los días y las comidas que quieres planear. Proponemos recetas que ya cocinaste o de sesiones que ya hiciste; si faltan, las de tu nivel. Respetamos tu equipo, tus alergias y tus gustos' + (P().bebe ? ', y buscamos que tengan porción para el bebé' : '') + '.</p></section>';
      h += '<div class="grupo form" id="planCfg">' + planConfigHtml(pl) + '</div>';
      h += '<p class="pie" role="status">' + planKeys().length + (planKeys().length === 1 ? ' comida' : ' comidas') + ' en la semana.</p>';
      h += '<div class="acciones-pie"><button class="btn pri" data-act="plan-armar"' + (planKeys().length ? '' : ' disabled') + '>Armar mi menú</button></div>';
      return pagina({ titulo: 'Menú de la semana', atras: '#/recetas', sub: 'Planifica y compra de una vez.' }, h);
    }
    if (vc) {
      var L = listaPlan(), pc = progLista(L.secs, 'plan'), cnt = {};
      L.rids.forEach(function (r) { cnt[r] = (cnt[r] || 0) + 1; });
      h += '<section class="tarjeta"><div class="prog-f"><strong>' + pc[0] + ' de ' + pc[1] + '</strong><span>marcados</span></div>' + barraProgreso(pc[0], pc[1], 'Lista de compras del menú') +
        '<p class="pie-c">Suma los ingredientes de las ' + L.rids.length + ' comidas del menú (' + Object.keys(cnt).length + ' recetas distintas). Cantidades ×' + fmtF(factor()) + ' para tus porciones, redondeadas hacia arriba. Marca lo que ya tienes en casa.</p></section>';
      h += seccionesCompras(L.secs, 'plan');
      h += '<h2 class="gh">Recetas del menú</h2><div class="grupo">' + Object.keys(cnt).map(function (r) {
        var x = RBY[r];
        return '<a class="fila" href="' + hrefRec(x) + '"><span class="fila-t"><strong>' + md(cap(x.r.titulo)) + '</strong><small>' + (cnt[r] > 1 ? cnt[r] + ' veces en la semana · ' : '') + etqSes(x.s) + '</small></span>' + ico('sig', 'sig') + '</a>';
      }).join('') + '</div>';
      h += '<div class="acciones-pie"><button class="btn sec" data-act="desmarcar" data-n="plan">Desmarcar toda la lista</button></div>';
      return pagina({ titulo: 'Compras del menú', atras: '#/recetas' }, h);
    }
    var ks = planKeys(), dias = DIAS.filter(function (d) { return pl.cfg.dias.indexOf(d[0]) >= 0; });
    h += '<p class="pie-c plan-res" role="status">' + planResumen() + (pl.fecha ? ' · armado el ' + pl.fecha.split('-').reverse().join('/') : '') + '</p>';
    dias.forEach(function (d) {
      var kd = ks.filter(function (k) { return k.indexOf(d[0] + '|') === 0; });
      h += '<h2 class="gh">' + d[1] + '</h2><div class="grupo">' + kd.map(filaPlan).join('') + '</div>';
    });
    h += '<div class="grupo"><a class="fila" href="#/planificador/compras"><span class="fila-t"><strong>Ver la lista de compras</strong><small>' + progPlan().join(' de ') + ' marcados · todo sumado</small></span>' + ico('sig', 'sig') + '</a></div>';
    h += '<details class="desp" id="planMas"' + (PL_MAS ? ' open' : '') + '><summary><span>Cambiar días y comidas</span>' + ico('sig', 'flecha') + '</summary><div class="desp-c" id="planCfg">' + planConfigHtml(pl) + '</div></details>';
    h += '<div class="acciones-pie"><button class="btn sec" data-act="plan-nuevo">Armar de nuevo</button><button class="btn sec" data-act="plan-borrar">Borrar el menú</button></div>';
    return pagina({ titulo: 'Menú de la semana', atras: '#/recetas', sub: 'Toca “Cambiar” en cualquier plato para ver otra opción.' }, h);
  };

  /* ------------------------------------------------------------ LOGRO (al completar un nivel) */
  rutas.logro = function (seg) {
    var nv = parseInt(seg[1], 10) || nivelActual();
    if (!nivelDisp(nv) || !nivelCompleto(nv)) return rutas.curso(['curso']);
    var lv = regN(nv), hs = nHechasN(nv), om = lv.filter(function (s) { return !S.hechas[s.id] && S.omitidas[s.id]; }).length, h = '';
    var rcs = RECS.filter(function (x) { return !x.s.extra && (x.s.nivel || 1) === nv; }), cocinadas = rcs.filter(function (x) { return S.cocinadas[x.id]; }).length;
    h += '<section class="tarjeta destac logro"><p class="etq">Nivel completado</p><h2>¡Terminaste el ' + esc(nivelNom(nv)) + '!</h2><p>Hiciste ' + hs + ' de las ' + lv.length + ' sesiones' + (om ? ' (' + om + ' omitida' + (om > 1 ? 's' : '') + ')' : '') + '. ' +
      'El nivel tiene ' + rcs.length + ' recetas' + (cocinadas ? ' y ya anotaste ' + cocinadas + ' cocinadas en casa' : '') + '.</p></section>';
    h += '<h2 class="gh">Lo que aprendiste</h2><div class="grupo">' + D.semanas.filter(function (sm) { return (sm.nivel || 1) === nv; }).map(function (sm) {
      var ts = sm.sesiones.filter(function (i) { return i !== 'bonus'; }).map(function (i) { return BYID[i].titulo; });
      return '<a class="fila" href="#/semana/' + sm.n + '"><span class="marca hecha">' + ico('ok') + '</span><span class="fila-t"><strong>' + esc(sm.titulo) + '</strong><small>' + esc(ts.join(' · ')) + '</small></span>' + ico('sig', 'sig') + '</a>';
    }).join('') + '</div>';
    var sig = nivelDisp(nv + 1) ? nv + 1 : 0, inf = (D.niveles || []).filter(function (x) { return x.n === sig; })[0];
    if (sig) {
      h += '<section class="tarjeta"><p class="etq">Lo que sigue</p><h2>' + esc(nivelNom(sig)) + '</h2><p>' + esc(inf ? inf.resumen : '') + '</p>' +
        '<div class="btns"><button class="btn pri" data-act="nivel-plan" data-v="' + sig + '">Empezar Nivel ' + sig + '</button></div></section>';
    } else {
      var prox = (D.niveles || []).filter(function (x) { return x.n === nv + 1; })[0];
      h += '<section class="tarjeta"><p class="etq">Lo que sigue</p><h2>' + (prox ? esc(nivelNom(prox.n)) + ' · pronto' : 'Más adelante') + '</h2><p>' + (prox ? esc(prox.resumen) + ' ' : '') + 'Llega en una próxima versión de la app.</p></section>';
    }
    h += '<section class="tarjeta"><p class="etq">Sigue disponible</p><h2>Tu cocina de todos los días</h2><p>El recetario y el planificador semanal no se van: úsalos para decidir qué cocinar cada día y para hacer las compras de la semana en una sola lista.</p>' +
      '<div class="btns"><a class="btn sec" href="#/recetas">Recetario</a><a class="btn sec" href="#/planificador">Menú de la semana</a></div>' +
      (nv === 1 && BYID.bonus && !S.hechas.bonus ? '<div class="btns"><a class="btn sec" href="#/sesion/bonus">Hacer el bonus: tacos</a></div>' : '') + '</section>';
    return pagina({ titulo: 'Tu logro', sub: esc(nivelNom(nv)), atras: '#/hoy' }, h);
  };

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
      '<div class="fila est"><span class="fila-t"><strong>Versión</strong><small>2.8 · ' + REG.length + ' sesiones en 3 niveles + Semana 0, con ' + RECS.length + ' recetas (' + EXT.length + ' extras), menú semanal, ilustraciones y fotos</small></span></div></div>';
    return pagina({ titulo: 'Ajustes' }, h);
  };

  /* ------------------------------------------------------------ CRÉDITOS */
  rutas.creditos = function () {
    var fs = SES.filter(function (s) { return s.foto; });
    var h = '<p class="lead">Las ilustraciones de técnicas están dibujadas para esta app. Las fotos de platos son de Unsplash.</p>';
    h += '<h2 class="gh">Fotos de platos · Unsplash</h2><div class="grupo">' + fs.map(function (s) {
      var f = s.foto;
      return '<a class="fila cred" href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer"><span class="fila-t"><strong>' + esc(f.alt) + '</strong><small>Foto de ' + esc(f.autor) + ' · ' + etqSes(s).toLowerCase() + '</small></span></a>';
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
      '<div class="grupo form"><p class="g-t">País y medidas</p>' + formLugar(p).replace(/<div class="grupo form">/g, '<div class="interno">').replace(/<p class="pie">[^<]*<\/p>/g, '') + '</div>' +
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
    if (onb && fa) { var nn = parseInt(ruta()[1], 10) || 0; fa.innerHTML = formAreaHtml(nn, S.draft); var nv = $('#onbNav'); if (nv) nv.outerHTML = onbNav(nn, S.draft); }
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
        p = objetivoP();
        if (p[k] === null || p[k] === undefined) p[k] = parseInt(t.getAttribute('data-ini'), 10);   // primera vez: sale de "—" y queda el valor que ves
        else p[k] = Math.min(+t.getAttribute('data-max'), Math.max(+t.getAttribute('data-min'), p[k] + parseInt(t.getAttribute('data-d'), 10)));
        guardar(); refrescarForm(); break;
      case 'setb': p = objetivoP(); p[k] = (v === '1'); guardar(); refrescarForm(); break;
      case 'tog': p = objetivoP(); p[k] = !p[k]; guardar(); refrescarForm(); break;
      case 'multi':
        p = objetivoP(); var arr = p[k], ix = arr.indexOf(v), enOnb = ruta()[0] === 'bienvenida';
        if (v === 'ninguna') { arr.length = 0; p.alergiaOk = true; }
        else if (ix >= 0) arr.splice(ix, 1); else {
          if (k === 'gustos') { if (v === 'todo') arr.length = 0; else { var tx = arr.indexOf('todo'); if (tx >= 0) arr.splice(tx, 1); } }
          arr.push(v);
        }
        if (k === 'alergias' && arr.length) p.alergiaOk = true;
        if (k === 'gustos' && arr.length === 0 && !enOnb) arr.push('todo');
        guardar(); refrescarForm(); break;
      case 'fin-onb':
        if (faltan(S.draft).length) { refrescarForm(); break; }
        var pf = {}; for (var kd in DEF_PERFIL) pf[kd] = (S.draft[kd] === null || S.draft[kd] === undefined) ? DEF_PERFIL[kd] : S.draft[kd];
        S.perfil = JSON.parse(JSON.stringify(pf)); S.draft = null; guardar();
        location.replace('#/hoy'); break;
      case 'hecha':
        if (S.hechas[t.getAttribute('data-id')]) delete S.hechas[t.getAttribute('data-id')]; else { S.hechas[t.getAttribute('data-id')] = hoyISO(); delete S.omitidas[t.getAttribute('data-id')]; toast('Sesión marcada como hecha'); }
        guardar();
        var sh = BYID[t.getAttribute('data-id')];
        if (sh && !sh.bonus && S.hechas[sh.id] && nivelCompleto(sh.nivel || 1) && !S.logros[sh.nivel || 1]) { S.logros[sh.nivel || 1] = hoyISO(); guardar(); ir('#/logro/' + (sh.nivel || 1)); break; }
        render(); break;
      case 's0': S.leidoS0 = v === '1'; guardar(); render(); toast(S.leidoS0 ? 'Semana 0 marcada como leída' : 'Marca quitada'); break;
      case 'saltar':
        REG.forEach(function (s) { if (esInicial(s) && pendiente(s)) S.omitidas[s.id] = hoyISO(); });
        guardar(); render(); toast('Semanas 1 y 2 omitidas'); break;
      case 'nivel-plan':
        S.nivelPlan = parseInt(v, 10); guardar(); toast('Plan: ' + nivelNom(S.nivelPlan));
        if (ruta()[0] === 'logro') ir('#/hoy'); else render();
        break;
      case 'plan-armar': planArmar(false); guardar(); render(); break;
      case 'plan-nuevo': planArmar(true); guardar(); render(); toast('Menú armado de nuevo'); break;
      case 'plan-borrar':
        S.plan.slots = null; Object.keys(S.compras).forEach(function (kk) { if (kk.indexOf('c.plan.') === 0) delete S.compras[kk]; });
        guardar(); render(); break;
      case 'plan-cambiar': if (!planCambiar(v)) toast('No hay otra opción para esta comida'); guardar(); render(); break;
      case 'plan-dia': case 'plan-comida':
        var pc2 = planEnsure().cfg, lst = act === 'plan-dia' ? pc2.dias : pc2.comidas, ix2 = lst.indexOf(v);
        if (ix2 >= 0) { if (lst.length > 1) lst.splice(ix2, 1); } else lst.push(v);
        planSync(); guardar(); render(); break;
      case 'cocine':
        var rid = t.getAttribute('data-rid');
        if (S.cocinadas[rid] === hoyISO()) { delete S.cocinadas[rid]; toast('Marca quitada'); } else { S.cocinadas[rid] = hoyISO(); toast('Anotado: lo cociné hoy'); }
        guardar(); render(); break;
      case 'rf': RF[k] = v; refrescarRec(); refocus('rf', k, v); break;
      case 'rf-tog': RF[k] = !RF[k]; refrescarRec(); refocus('rf-tog', k); break;
      case 'rf-clear': RF.cocina = 'todos'; RF.momento = 'todos'; RF.tiempo = 'todos'; RF.nivel = 'todos'; RF.q = ''; var qi = $('#recQ'); if (qi) qi.value = ''; refrescarRec(); break;
      case 'rec-mom': REC.m = v; REC.pag = 0; refrescarRecom(); refocus('rec-mom', null, v); break;
      case 'rec-otra': REC.pag += 1; refrescarRecom(); refocus('rec-otra'); break;
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
        else { S.hechas = {}; S.omitidas = {}; S.compras = {}; S.cocinadas = {}; S.logros = {}; S.plan = null; S.nivelPlan = 1; S.leidoS0 = false; CK.id = null; guardar(); msgAjustes = 'Progreso borrado.'; render(); }
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
      var lid = t.getAttribute('data-l'), pc, pf = $('.prog-f');
      if (lid === 'plan') pc = progPlan(); else { var lp = lid.split('-'); pc = progCompras(lid === 'bonus' ? 'bonus' : parseInt(lp[lp.length - 1], 10), lid.charAt(0) === 'n' ? parseInt(lid.slice(1), 10) : 1); }
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
    else if (t.matches && t.matches('input[data-rf]')) { RF[t.getAttribute('data-rf')] = t.value; refrescarLista(); }
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
  document.addEventListener('toggle', function (e) { if (e.target && e.target.id === 'recMas') RF.mas = e.target.open; if (e.target && e.target.id === 'planMas') PL_MAS = e.target.open; }, true);
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; });
  window.addEventListener('popstate', function () { /* hashchange ya re-renderiza */ });
  window.addEventListener('hashchange', render);

  /* ------------------------------------------------------------ arranque */
  function arrancar() {
    vista = $('#vista'); tabbar = $('#tabbar');
    aplicarTema();
    if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarTema); } catch (e) { /* ignorar */ } }
    var pSin = fetch('data/sinonimos.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    fetch('data/curso.json').then(function (r) { return r.json(); }).then(function (d) {
      return pSin.then(function (sj) { synPrep(sj); return d; });
    }).then(function (d) {
      D = d; SES = d.sesiones; SES.forEach(function (s) { BYID[s.id] = s; }); REG = SES.filter(function (s) { return !s.bonus; });
      EXT = (d.extras || []).map(extraSes); EXT.forEach(function (s) { BYID[s.id] = s; }); armarRecs();
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
  window.__cocina = { setHora: function (h) { HORA_SIM = h; render(); }, RECS: function () { return RECS; }, nivelUsuario: nivelUsuario, fmtParte: fmtParte, factor: factor, S: function () { return S; }, bebeT: bebeT, listaCompras: listaCompras, partes: partes, sn: sn, convTxt: convTxt, inline: inline, D: function () { return D; }, REG: function () { return REG; } };
})();
