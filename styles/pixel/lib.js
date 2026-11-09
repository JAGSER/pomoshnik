// PIXEL — шаблон стиля «Пиксель-арт 16 бит» для движка роликов «Помощник AI».
// Мир рисуется в буфере 180×320 (1 пиксель мира = 6×6 px кадра) и один раз увеличивается без сглаживания.
// Интерфейс (текст, HUD, панели) рисуется прямо в кадр теми же функциями в тех же единицах, сетка совпадает.
const PIXEL = (() => {
  const BW = 180, BH = 320, S = 6, W = 1080, H = 1920, GY = 236;
  const SAFE = { x0: 10, x1: 170, y0: 19, y1: 281 };
  const P = {
    ink: '#120d26', ink2: '#2a2150',
    star: '#ffffff', star2: '#c2bdff', star3: '#7570c0',
    moon: '#f6eed4', moon2: '#e0d3a8', moon3: '#bdae82',
    st0: '#8a87a6', st1: '#68657f', st2: '#514e6a', st3: '#3d3a55', st4: '#2c2941', mortar: '#1c1930', pit: '#06041a',
    hill0: '#2e2563', hill1: '#211a4d', castle: '#1a1440',
    cyan: '#62e6ff', ice: '#c8f7ff', blue: '#3b86ff', violet: '#8d5cff', deep: '#5638d0',
    f0: '#fff8c8', f1: '#ffd64a', f2: '#ff8f2e', f3: '#e8452c', f4: '#a02436',
    gold: '#ffcc45', gold2: '#d18a22', red: '#ff4b5c', red2: '#a8203a', green: '#68e08a', green2: '#278a52',
    white: '#ffffff', ui: '#1a1544', ui2: '#2a2270', uiL: '#ece8ff', uiM: '#968ee0', uiD: '#0b0822',
  };
  const SKY = {
    night: ['#07061a', '#0b0a27', '#110f35', '#171444', '#1f1a55', '#282166', '#332a78', '#40338a'],
    dull: ['#08080f', '#0c0c17', '#11111f', '#161628', '#1b1b31', '#21213a', '#282844', '#30304f'],
    dawn: ['#17154a', '#2b2468', '#4a2f80', '#7a3a8a', '#ad4c86', '#dc6c78', '#f39a6c', '#ffc78a'],
    day: ['#2e5ccc', '#3b6dd8', '#4a7fe3', '#5c92ec', '#71a6f2', '#8abaf7', '#a6cdfb', '#c6e1fd'],
    dusk: ['#120f3a', '#21195a', '#38236e', '#572b7a', '#82397a', '#b2496e', '#dc6c5e', '#f29d5c'],
    storm: ['#050510', '#090918', '#0d0d20', '#121228', '#171731', '#1d1d3a', '#242444', '#2b2b4f'],
    magic: ['#0a0420', '#130834', '#1e0c4a', '#2a1060', '#381478', '#481a8e', '#5a22a4', '#6e2eba'],
    warm: ['#140c2c', '#22143e', '#341c4c', '#4c2654', '#6a3456', '#8e4654', '#b45e4e', '#da7c48'],
  };
  const HILLS = { night: ['#2e2563', '#211a4d', '#1a1440'], dull: ['#20203a', '#18182c', '#131326'], dawn: ['#3a2a6a', '#2a1f52', '#22184a'],
    day: ['#4a8ac8', '#2f6aa0', '#2a5a8a'], dusk: ['#3a2466', '#2a1a4e', '#22163f'], storm: ['#1c1c34', '#141428', '#101022'],
    magic: ['#2c1266', '#200c4e', '#1a0a40'], warm: ['#3a1e4c', '#2a163c', '#22122f'] };

  // ---------- время и числа ----------
  const cl = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, x) => a + (b - a) * x;
  const pr = (t, a, b) => cl((t - a) / (b - a));
  const eo = (x) => 1 - Math.pow(1 - cl(x), 3);
  const ei = (x) => Math.pow(cl(x), 3);
  const eio = (x) => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const eb = (x) => { x = cl(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const spring = (lt, f = 2, d = 6) => (lt <= 0 ? 0 : 1 - Math.exp(-d * lt) * Math.cos(6.2832 * f * lt));
  const decay = (lt, f = 2, d = 7) => (lt < 0 ? 0 : Math.exp(-d * lt) * Math.cos(6.2832 * f * lt));
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const rnd = (seed) => { let s = (Math.abs(Math.floor(seed * 9973)) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const kf = (keys, t, ease) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const a = keys[i - 1], b = keys[i]; return lerp(a[1], b[1], (ease || eo)((t - a[0]) / (b[0] - a[0]))); }
    return keys[keys.length - 1][1];
  };
  const hold = (keys, t) => { let v = keys[0][1]; for (const k of keys) if (t >= k[0]) v = k[1]; return v; };
  const since = (times, t) => { let s = 1e9; for (const x of times) if (t >= x) s = t - x; return s; };
  const fr = (t, fps, n) => { const f = Math.floor(t * fps); return ((f % n) + n) % n; };
  const blink = (t, hz = 2) => Math.floor(t * hz * 2) % 2 === 0;
  const ri = Math.round;
  const un = (c) => (c.canvas.width >= W ? S : 1);
  const HX = new Map();
  const hex = (c) => { let v = HX.get(c); if (!v) { const n = parseInt(c.slice(1), 16); v = [n >> 16, (n >> 8) & 255, n & 255]; HX.set(c, v); } return v; };
  const CACHE = new Map();
  const cached = (key, fn) => { let v = CACHE.get(key); if (v === undefined) { v = fn(); CACHE.set(key, v); } return v; };

  // ---------- примитивы (координаты в пикселях мира; в кадре те же единицы ×6) ----------
  function rect(c, x, y, w, h, col) { if (w <= 0 || h <= 0) return; const u = un(c); if (col) c.fillStyle = col; c.fillRect(ri(x) * u, ri(y) * u, ri(w) * u, ri(h) * u); }
  function px(c, x, y, col) { rect(c, x, y, 1, 1, col); }
  function line(c, x0, y0, x1, y1, col) {
    x0 = ri(x0); y0 = ri(y0); x1 = ri(x1); y1 = ri(y1); const u = un(c); c.fillStyle = col;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0;
    for (;;) { c.fillRect(x0 * u, y0 * u, u, u); if ((x0 === x1 && y0 === y1) || n++ > 400) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  function disc(c, cx, cy, r, col) {
    cx = ri(cx); cy = ri(cy); r = Math.max(0, ri(r)); const u = un(c); c.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) { const dx = Math.floor(Math.sqrt((r + 0.5) * (r + 0.5) - dy * dy)); c.fillRect((cx - dx) * u, (cy + dy) * u, (2 * dx + 1) * u, u); }
  }
  function ring(c, cx, cy, r, col, gaps = 0, seed = 1) {
    cx = ri(cx); cy = ri(cy); r = ri(r); if (r < 1) return px(c, cx, cy, col); const u = un(c); c.fillStyle = col;
    let x = r, y = 0, e = 1 - r, i = 0;
    while (x >= y) {
      const pts = [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]];
      for (const p of pts) { i++; if (gaps > 0 && hash(i * 7.3 + seed) < gaps) continue; c.fillRect((cx + p[0]) * u, (cy + p[1]) * u, u, u); }
      y++; if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; }
    }
  }
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const PAT = new Map();
  function pat(c, col, lvl) {
    const u = un(c), key = col + lvl + '|' + u; let p = PAT.get(key);
    if (!p) { const cv = new OffscreenCanvas(4 * u, 4 * u), x = cv.getContext('2d'); x.fillStyle = col; for (let i = 0; i < 16; i++) if (BAY[i] < lvl) x.fillRect((i % 4) * u, ((i / 4) | 0) * u, u, u); p = c.createPattern(cv, 'repeat'); PAT.set(key, p); }
    return p;
  }
  function dith(c, x, y, w, h, col, lvl) { lvl = ri(cl(lvl, 0, 16)); if (lvl <= 0) return; if (lvl >= 16) return rect(c, x, y, w, h, col); c.fillStyle = pat(c, col, lvl); const u = un(c); c.fillRect(ri(x) * u, ri(y) * u, ri(w) * u, ri(h) * u); }
  function ddisc(c, cx, cy, rx, ry, col, lvl) { // эллипс-тень с дизерингом
    cx = ri(cx); cy = ri(cy); for (let dy = -ry; dy <= ry; dy++) { const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5))))); dith(c, cx - dx, cy + dy, 2 * dx + 1, 1, col, lvl); }
  }
  // кэшированный холст → увеличенная копия для кадра (×6), рисуем всегда 1:1 на целых координатах
  const UP = new WeakMap();
  function up(cv) { let u = UP.get(cv); if (!u) { u = new OffscreenCanvas(cv.width * S, cv.height * S); const x = u.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(cv, 0, 0, u.width, u.height); UP.set(cv, u); } return u; }
  function spr(c, cv, x, y) { if (!cv) return; const u = un(c); c.drawImage(u === 1 ? cv : up(cv), ri(x) * u, ri(y) * u); }

  // ---------- спрайты: сетка материалов → автосвет сверху, тень снизу-справа, контур ----------
  const RAMP = [null,
    ['#5b6190', '#a8b0d8', '#e8ecfc'], ['#0b0818', '#0b0818', '#0b0818'], ['#ffe46a', '#ffe46a', '#ffe46a'], ['#a8302e', '#ee5a38', '#ff9b5e'],
    ['#b06e1c', '#f2b636', '#ffe58a'], ['#3c2217', '#6a3e28', '#9a6242'], ['#28264a', '#3f3c6e', '#5c5896'], ['#ffffff', '#ffffff', '#ffffff'],
    ['#5a3420', '#8a5530', '#b8804a'], ['#2e2c46', '#4e4c6a', '#75728f'], ['#1e6ab8', '#4cc4f4', '#b6f2ff'], ['#8c1830', '#e8384e', '#ff8a8a'],
    ['#b8a47a', '#ecdfb8', '#fff8e0'], ['#b8406e', '#f07aa0', '#ffc0d4'], ['#1f7a4a', '#4ec47a', '#a8f0b0'], ['#120d26', '#120d26', '#120d26'],
    ['#3e3a5c', '#6a6690', '#9a96c0'], ['#5a2fb8', '#8d5cff', '#c4a8ff'], ['#c0601a', '#ffa82a', '#fff0a0'], ['#6a6888', '#b8b4d8', '#f0eeff']];
  const AM = { S: [1, 0], s: [1, 1], 1: [1, 3], V: [2, 2], E: [3, 2], R: [4, 0], r: [4, 1], G: [5, 0], g: [5, 1], 5: [5, 3], B: [6, 0], b: [6, 1],
    L: [7, 0], W: [8, 2], D: [9, 0], d: [9, 1], T: [10, 0], t: [10, 1], C: [11, 0], c: [11, 1], 3: [11, 3], H: [12, 0], h: [12, 1], 4: [12, 3],
    M: [13, 0], m: [13, 1], P: [14, 0], p: [14, 1], N: [15, 0], n: [15, 1], K: [16, 2], I: [17, 0], i: [17, 1], U: [18, 0], u: [18, 1], O: [19, 0], o: [19, 1], A: [20, 0], a: [20, 1] };
  const grid = (w, h) => ({ w, h, m: new Uint8Array(w * h), s: new Uint8Array(w * h) });
  function gset(g, x, y, m, s = 0) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= g.w || y >= g.h) return; g.m[y * g.w + x] = m; g.s[y * g.w + x] = s; }
  function grect(g, x, y, w, h, m, s = 0) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) gset(g, x + i, y + j, m, s); }
  function gart(g, rows, ox = 0, oy = 0, sc = 1) { rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const e = AM[r[x]]; if (e) for (let j = 0; j < sc; j++) for (let i = 0; i < sc; i++) gset(g, ox + x * sc + i, oy + y * sc + j, e[0], e[1]); } }); }
  function gflip(g) { const o = grid(g.w, g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { o.m[y * g.w + g.w - 1 - x] = g.m[y * g.w + x]; o.s[y * g.w + g.w - 1 - x] = g.s[y * g.w + x]; } return o; }
  function bake(g, o = {}) {
    const { w, h, m, s } = g, ow = w + 2, oh = h + 2, cv = new OffscreenCanvas(ow, oh), x = cv.getContext('2d'), id = x.createImageData(ow, oh), d = id.data;
    const at = (a, b) => (a < 0 || b < 0 || a >= w || b >= h ? 0 : m[b * w + a]);
    for (let yy = -1; yy <= h; yy++) for (let xx = -1; xx <= w; xx++) {
      const mm = at(xx, yy); let col = null;
      if (mm) { let sh = s[yy * w + xx]; if (!sh) sh = at(xx, yy - 1) !== mm ? 3 : at(xx, yy + 1) !== mm || at(xx + 1, yy) !== mm ? 1 : 2; col = o.white || RAMP[mm][sh - 1]; }
      else if (o.out !== null && (at(xx - 1, yy) || at(xx + 1, yy) || at(xx, yy - 1) || at(xx, yy + 1))) col = o.out || P.ink;
      if (col) { const i = ((yy + 1) * ow + xx + 1) * 4, v = hex(col); d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255; }
    }
    x.putImageData(id, 0, 0); return cv;
  }
  const ART = {
    heart: ['.HH...HH.', 'H4HH.HHHH', 'H4HHHHHHH', 'HHHHHHHHH', '.HHHHHHH.', '..HHHHH..', '...HHH...', '....H....'],
    heart0: ['.ii...ii.', 'iiii.iiii', 'iiiiiiiii', 'iiiiiiiii', '.iiiiiii.', '..iiiii..', '...iii...', '....i....'],
    star: ['....G....', '....G....', '...G5G...', 'GGGG5GGGG', '.GGGGGGG.', '..GGGGG..', '..GGGGG..', '.GGG.GGG.', '.GG...GG.'],
    cup: ['GGGGGGGGGGG', 'G.G5GGGGG.G', 'G.G5GGGGG.G', '.GG5GGGGGG.', '..GGGGGGG..', '...GGGGG...', '....GGG....', '....GGG....', '...GGGGG...', '..ggggggg..'],
    cake: ['.....HH.....', '....H4HH....', '..MMMMMMMM..', '.MMMMMMMMMM.', '.MPMMPMMPMM.', '.PPPPPPPPPP.', '.OOOOOOOOOO.', '.OOOOOOOOOO.', '.PPPPPPPPPP.', '.OOOOOOOOOO.', '.oooooooooo.'],
    mug: ['..A..A...', '.A..A....', '..A..A...', 'PPPPPPP..', 'PdddddPPP', 'PPPPPPP.P', 'PPPPPPP.P', 'PPPPPPPPP', 'PPPPPPP..', '.ppppp...'],
    gift: ['..GG.GG...', '...GGG....', 'CCCCGCCCCC', 'CCCCGCCCCC', '.UUUGUUUU.', '.UUUGUUUU.', '.UUUGUUUU.', '.UUUGUUUU.', '.uuuguuuu.'],
    gem: ['....C....', '...333...', '..C3CCC..', '.C3CCCCC.', 'CCCCCCCCC', '.CCCCCCc.', '..CCCcc..', '...Ccc...', '....c....'],
    coin: ['..GGGG..', '.G5GGGG.', 'G5GGgGGG', 'G5GGgGGG', 'GGGGgGGG', 'GGGGgGGG', '.GGGGGg.', '..gggg..'],
    check: ['........N', '.......NN', '......NN.', 'N....NN..', 'NN..NN...', '.NNNN....', '..NN.....'],
    cross: ['HH....HH', 'HHH..HHH', '.HHHHHH.', '..HHHH..', '..HHHH..', '.HHHHHH.', 'HHH..HHH', 'HH....HH'],
    warn: ['......G......', '.....GGG.....', '.....GKG.....', '....GGKGG....', '....GGKGG....', '...GGGKGGG...', '...GGGKGGG...', '..GGGGGGGGG..', '..GGGGKGGGG..', '.GGGGGGGGGGG.', 'GGGGGGGGGGGGG'],
    hand: ['...MM......', '...MM......', '...MM......', '...MMMMM...', '...MMMMMMM.', 'MM.MMMMMMMM', 'MMMMMMMMMMM', '.MMMMMMMMMM', '.MMMMMMMMM.', '..MMMMMMMM.', '...MMMMMM..'],
    bolt: ['...GG', '..GG.', '.GG..', 'GGGGG', '..GG.', '.GG..', 'GG...'],
    fish: ['....AAA.....', '..AAAAAAA..A', '.AKAAAAAAAAA', 'AAAAAAAAAAA.', '.aaaaaaa..aa', '...aaaa.....'],
    flat: ['..DDDDDD..', '.DDKDDKDD.', 'DDDDDDDDDD', 'DdDDdDDdDD', '.dDDDDDDd.', '..dddddd..', '....dd....', '...d..d...'],
    peach: ['....N...', '...NN...', '.OOPOOO.', 'OOPOOOOO', 'OPOOOOOO', 'OOOOOOOo', '.OOOOOo.', '..oooo..'],
    apple: ['....D...', '...DN...', '.HHHHHH.', 'HH4HHHHH', 'H4HHHHHH', 'HHHHHHHh', '.HHHHHh.', '..hhhh..'],
    bread: ['..MMMMMM..', '.MDMMDMMM.', 'MMMMMMMMMM', 'MmmmmmmmMM'],
    note: ['...KK', '...KK', '...K.', '...K.', '.KKK.', 'KKKK.', '.KK..'],
    book: ['UUUUUUUUU.', 'U5UUUUUUUu', 'UUUUUUUUUu', 'UUUGGGUUUu', 'UUUUUUUUUu', 'UUUUUUUUUu', 'MMMMMMMMMu', '.uuuuuuuuu'],
  };
  function artCv(name, sc = 1, flip = false) { return cached('art' + name + sc + flip, () => { const rows = ART[name], w = Math.max(...rows.map((r) => r.length)), g = grid(w * sc, rows.length * sc); gart(g, rows, 0, 0, sc); return bake(flip ? gflip(g) : g); }); }
  function icon(c, name, x, y, o = {}) { const cv = artCv(name, o.sc || 1, !!o.flip); spr(c, cv, x - (cv.width >> 1), y - (cv.height >> 1)); return cv; }

  // ---------- пиксельный шрифт 5×8 (кириллица, латиница, цифры, знаки); рукопись не нужна ----------
  const FONT = {
    'А': '.###.|#...#|#...#|#...#|#####|#...#|#...#|#...#', 'Б': '#####|#....|#....|####.|#...#|#...#|#...#|####.', 'В': '####.|#...#|#...#|####.|#...#|#...#|#...#|####.',
    'Г': '#####|#....|#....|#....|#....|#....|#....|#....', 'Д': '.###.|.#.#.|.#.#.|.#.#.|.#.#.|.#.#.|.#.#.|#####|#...#', 'Е': '#####|#....|#....|####.|#....|#....|#....|#####',
    'Ё': '.#.#.|.....|#####|#....|####.|#....|#....|#####', 'Ж': '#.#.#|#.#.#|.###.|..#..|.###.|#.#.#|#.#.#|#.#.#', 'З': '.###.|#...#|....#|..##.|....#|....#|#...#|.###.',
    'И': '#...#|#...#|#..##|#.#.#|#.#.#|##..#|#...#|#...#', 'Й': '.#.#.|..#..|#...#|#..##|#.#.#|##..#|#...#|#...#', 'К': '#...#|#..#.|#.#..|##...|##...|#.#..|#..#.|#...#',
    'Л': '..###|.#..#|.#..#|.#..#|.#..#|.#..#|.#..#|#...#', 'М': '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#|#...#', 'Н': '#...#|#...#|#...#|#####|#...#|#...#|#...#|#...#',
    'О': '.###.|#...#|#...#|#...#|#...#|#...#|#...#|.###.', 'П': '#####|#...#|#...#|#...#|#...#|#...#|#...#|#...#', 'Р': '####.|#...#|#...#|#...#|####.|#....|#....|#....',
    'С': '.###.|#...#|#....|#....|#....|#....|#...#|.###.', 'Т': '#####|..#..|..#..|..#..|..#..|..#..|..#..|..#..', 'У': '#...#|#...#|#...#|#...#|.####|....#|#...#|.###.',
    'Ф': '..#..|.###.|#.#.#|#.#.#|#.#.#|.###.|..#..|..#..', 'Х': '#...#|#...#|.#.#.|..#..|..#..|.#.#.|#...#|#...#', 'Ц': '#..#.|#..#.|#..#.|#..#.|#..#.|#..#.|#..#.|#####|....#',
    'Ч': '#...#|#...#|#...#|#...#|.####|....#|....#|....#', 'Ш': '#.#.#|#.#.#|#.#.#|#.#.#|#.#.#|#.#.#|#.#.#|#####', 'Щ': '#.#.#|#.#.#|#.#.#|#.#.#|#.#.#|#.#.#|#.#.#|#####|....#',
    'Ъ': '##...|.#...|.#...|.###.|.#..#|.#..#|.#..#|.###.', 'Ы': '#...#|#...#|#...#|##..#|#.#.#|#.#.#|#.#.#|##..#', 'Ь': '#....|#....|#....|####.|#...#|#...#|#...#|####.',
    'Э': '.###.|#...#|....#|.####|....#|....#|#...#|.###.', 'Ю': '#..#.|#.#.#|#.#.#|###.#|#.#.#|#.#.#|#.#.#|#..#.', 'Я': '.####|#...#|#...#|#...#|.####|..#.#|.#..#|#...#',
    '0': '.###.|#...#|#..##|#.#.#|#.#.#|##..#|#...#|.###.', '1': '..#..|.##..|#.#..|..#..|..#..|..#..|..#..|#####', '2': '.###.|#...#|....#|...#.|..#..|.#...|#....|#####',
    '3': '#####|...#.|..#..|.###.|....#|....#|#...#|.###.', '4': '...#.|..##.|.#.#.|#..#.|#..#.|#####|...#.|...#.', '5': '#####|#....|#....|####.|....#|....#|#...#|.###.',
    '6': '.###.|#....|#....|####.|#...#|#...#|#...#|.###.', '7': '#####|....#|...#.|..#..|.#...|.#...|.#...|.#...', '8': '.###.|#...#|#...#|.###.|#...#|#...#|#...#|.###.',
    '9': '.###.|#...#|#...#|#...#|.####|....#|....#|.###.',
    'D': '####.|#...#|#...#|#...#|#...#|#...#|#...#|####.', 'F': '#####|#....|#....|####.|#....|#....|#....|#....', 'G': '.###.|#...#|#....|#....|#.###|#...#|#...#|.###.',
    'I': '###|.#.|.#.|.#.|.#.|.#.|.#.|###', 'J': '..###|...#.|...#.|...#.|...#.|#..#.|#..#.|.##..', 'L': '#....|#....|#....|#....|#....|#....|#....|#####',
    'N': '#...#|##..#|##..#|#.#.#|#.#.#|#..##|#..##|#...#', 'Q': '.###.|#...#|#...#|#...#|#...#|#.#.#|#..#.|.##.#', 'R': '####.|#...#|#...#|####.|#.#..|#..#.|#...#|#...#',
    'S': '.###.|#...#|#....|.###.|....#|....#|#...#|.###.', 'U': '#...#|#...#|#...#|#...#|#...#|#...#|#...#|.###.', 'V': '#...#|#...#|#...#|#...#|#...#|.#.#.|.#.#.|..#..',
    'W': '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|##.##|#...#', 'Y': '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..|..#..', 'Z': '#####|....#|...#.|..#..|.#...|#....|#....|#####',
    ' ': '..|..|..|..|..|..|..|..', '.': '.|.|.|.|.|.|.|#', ',': '..|..|..|..|..|..|.#|.#|#.', '!': '.#|.#|.#|.#|.#|.#|..|.#', '?': '.###.|#...#|....#|...#.|..#..|..#..|.....|..#..',
    ':': '.|.|#|.|.|#|.|.', ';': '..|..|.#|..|..|.#|.#|#.', '-': '....|....|....|....|####|....|....|....', '+': '.....|.....|..#..|..#..|#####|..#..|..#..|.....',
    '=': '....|....|....|####|....|####|....|....', '/': '....#|...#.|...#.|..#..|..#..|.#...|.#...|#....', '%': '##..#|##..#|...#.|..#..|..#..|.#...|#..##|#..##',
    '×': '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#|.....', '«': '.....|..#.#|.#.#.|#.#..|.#.#.|..#.#|.....|.....', '»': '.....|#.#..|.#.#.|..#.#|.#.#.|#.#..|.....|.....',
    '"': '#.#|#.#|...|...|...|...|...|...', "'": '#|#|.|.|.|.|.|.', '(': '..#|.#.|#..|#..|#..|#..|.#.|..#', ')': '#..|.#.|..#|..#|..#|..#|.#.|#..',
    '<': '...#|..#.|.#..|#...|.#..|..#.|...#|....', '>': '#...|.#..|..#.|...#|..#.|.#..|#...|....', '▶': '#...|##..|###.|####|###.|##..|#...|....',
    '▼': '.....|.....|#####|.###.|..#..|.....|.....|.....', '♥': '.....|.#.#.|#####|#####|#####|.###.|..#..|.....', '★': '..#..|..#..|#####|.###.|.###.|.#.#.|#...#|.....',
    '✓': '.....|....#|...##|#.##.|###..|.#...|.....|.....', '✕': '#...#|##.##|.###.|..#..|.###.|##.##|#...#|.....', '↑': '..#..|.###.|#.#.#|..#..|..#..|..#..|..#..|.....',
    '→': '.....|...#.|....#|#####|....#|...#.|.....|.....', '·': '.|.|.|.|#|.|.|.', '№': '#..#..|##.#..|#.##..|#..#.#|#..#..|#..#.#|......|......', '₽': '.####.|.#...#|.#...#|.####.|.#....|####..|.#....|.#....',
  };
  const LAT = { A: 'А', B: 'В', C: 'С', E: 'Е', H: 'Н', K: 'К', M: 'М', O: 'О', P: 'Р', T: 'Т', X: 'Х', '—': '-', '–': '-' };
  const GLY = new Map();
  function gly(ch) {
    let g = GLY.get(ch); if (g) return g;
    let k = FONT[ch] ? ch : ch.toUpperCase(); if (!FONT[k] && LAT[k]) k = LAT[k];
    const rows = (FONT[k] || FONT[' ']).split('|'); g = { w: rows[0].length, rows }; GLY.set(ch, g); return g;
  }
  const TS = {
    w: { f1: '#ffffff', f2: '#e2ddff', ext: '#5a4fa8' }, y: { f1: '#fff4a8', f2: '#ffc23a', ext: '#b0581a' }, c: { f1: '#e8fcff', f2: '#62dcff', ext: '#2a5ec8' },
    r: { f1: '#ffd8d8', f2: '#ff4b5c', ext: '#8c1830' }, g: { f1: '#e8ffea', f2: '#64e08a', ext: '#1f7a4a' }, o: { f1: '#fff0c4', f2: '#ff9a3a', ext: '#a8401e' },
    v: { f1: '#f0e8ff', f2: '#b694ff', ext: '#4a2fa0' }, k: { f1: '#2c2552', f2: '#140f2c', ext: null, out: null }, d: { f1: '#9a94c8', f2: '#7a74b0', ext: '#2a2150' },
  };
  const STY = new Map();
  function sty(o) {
    const s = o.s || 1, b = o.bold != null ? +!!o.bold : s >= 2 ? 1 : 0, col = o.col || 'w', e = o.ext === false ? 0 : s >= 2 ? s : 1, key = s + '|' + b + '|' + (typeof col === 'object' ? col.f1 + col.f2 + col.ext : col) + '|' + e;
    let st = STY.get(key); if (st) return st;
    const base = typeof col === 'object' ? col : TS[col] || TS.w;
    st = { s, b, e, key, f1: base.f1, f2: base.f2, out: base.out === null ? null : base.out || P.ink, ext: s >= 2 ? base.ext || P.ink : base.out === null ? null : P.ink, glyphs: new Map() };
    STY.set(key, st); return st;
  }
  function gspr(ch, st) {
    let cv = st.glyphs.get(ch); if (cv) return cv;
    const g = gly(ch), s = st.s, b = st.b, e = st.ext ? st.e : 0, gw = g.w * s + b, cw = gw + 2, chh = 9 * s + 2 + e, A = new Uint8Array(cw * chh);
    for (let r = 0; r < g.rows.length; r++) for (let x = 0; x < g.w; x++) if (g.rows[r][x] === '#')
      for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s + b; xx++) A[(1 + r * s + yy) * cw + 1 + x * s + xx] = r * s + yy < s * 4 ? 1 : 2;
    if (e) for (let Y = chh - 1; Y >= 0; Y--) for (let X = 0; X < cw; X++) if (!A[Y * cw + X]) for (let k = 1; k <= e; k++) { const q = Y - k; if (q >= 0 && (A[q * cw + X] === 1 || A[q * cw + X] === 2)) { A[Y * cw + X] = 3; break; } }
    if (st.out) { const B = A.slice(); for (let Y = 0; Y < chh; Y++) for (let X = 0; X < cw; X++) if (!B[Y * cw + X]) {
      let n = 0; for (let j = -1; j <= 1 && !n; j++) for (let i = -1; i <= 1; i++) { const xx = X + i, yy = Y + j; if (xx >= 0 && yy >= 0 && xx < cw && yy < chh && B[yy * cw + xx]) { n = 1; break; } }
      if (n) A[Y * cw + X] = 4; } }
    cv = new OffscreenCanvas(cw, chh); const x = cv.getContext('2d'), id = x.createImageData(cw, chh), d = id.data, C = [null, hex(st.f1), hex(st.f2), st.ext ? hex(st.ext) : null, st.out ? hex(st.out) : null];
    for (let i = 0; i < A.length; i++) if (A[i] && C[A[i]]) { const v = C[A[i]]; d[i * 4] = v[0]; d[i * 4 + 1] = v[1]; d[i * 4 + 2] = v[2]; d[i * 4 + 3] = 255; }
    x.putImageData(id, 0, 0); st.glyphs.set(ch, cv); return cv;
  }
  function tw(str, s = 1, b = s >= 2 ? 1 : 0) { let w = 0, n = 0; for (const ch of String(str)) { w += gly(ch).w * s + b; n++; } return n ? w + (n - 1) * s : 0; }
  // текст одной строкой; x,y — левый верх буквы (al:'c' — центр по x, 'r' — правый край); o.n — сколько букв видно
  function text(c, str, x, y, o = {}) {
    if (!c) return 0; str = String(str); const st = sty(o), w = tw(str, st.s, st.b); let pen = ri(o.al === 'c' ? x - w / 2 : o.al === 'r' ? x - w : x), i = 0; y = ri(y);
    for (const ch of str) { if (o.n != null && i >= o.n) break; if (ch !== ' ') spr(c, gspr(ch, st), pen - 1, y - 1 + (o.dy ? o.dy(i) : 0)); pen += gly(ch).w * st.s + st.b + st.s; i++; }
    return w;
  }
  const LY = new Map();
  function layout(str, s, b, max) {
    const key = str + '|' + s + '|' + b + '|' + max; let L = LY.get(key); if (L) return L;
    const gap = tw(' ', s, b) + 2 * s, lines = [];
    for (const para of String(str).split(/\n|\|/)) {
      let cur = [], cw = 0;
      for (const raw of para.split(' ').filter(Boolean)) {
        const k = raw[0] === '*', t = (k ? raw.slice(1) : raw).replace(/_/g, ' '), ww = tw(t, s, b);
        if (cur.length && max && cw + gap + ww > max) { lines.push({ ws: cur, w: cw }); cur = []; cw = 0; }
        const x = cur.length ? cw + gap : 0; cur.push({ t, k, w: ww, x }); cw = x + ww;
      }
      lines.push({ ws: cur, w: cw });
    }
    L = { lines, w: Math.max(...lines.map((l) => l.w)), lh: 11 * s + (s >= 2 ? s : 0) }; L.h = L.lines.length * L.lh; LY.set(key, L); return L;
  }
  // текст по словам в такт фразе: '*слово' — ключевое (цвет kc), '_' — неразрывный пробел, '|' — перенос
  function words(c, lt, t0, str, x, y, o = {}) {
    const s = o.s || 1, b = o.bold != null ? +!!o.bold : s >= 2 ? 1 : 0, L = layout(str, s, b, o.max || 160);
    if (!c) return L;
    const gap = o.gap ?? 0.16, cps = o.cps ?? 40, lh = o.lh || L.lh, st = { s, bold: b, col: o.col || 'w', ext: o.ext }, ks = { s, bold: b, col: o.kc || 'y', ext: o.ext };
    let j = 0;
    L.lines.forEach((ln, li) => {
      const lx = o.al === 'c' ? x - ln.w / 2 : o.al === 'r' ? x - ln.w : x, ly = y + li * lh;
      for (const wd of ln.ws) {
        const ts = t0 + (o.at ? (o.at[j] != null ? o.at[j] : o.at[o.at.length - 1] + (j - o.at.length + 1) * gap) : j * gap), a = lt - ts;
        if (a >= 0) {
          let n = Math.min(wd.t.length, 1 + Math.floor(a * cps));
          if (o.out != null) { const q = (lt - o.out - 0.03 * j) / 0.14; if (q >= 1) { j++; continue; } if (q > 0) n = Math.min(n, Math.round(wd.t.length * (1 - q))); }
          const rise = ri((1 - eo(a / 0.2)) * (2 + s)), drop = o.drop ? (i) => -ri((1 - eo((a - i * 0.035) / 0.16)) * 7 * s) : null;
          const sty_ = wd.k ? ks : st;
          if (drop) { const nn = Math.min(wd.t.length, Math.max(0, Math.floor(a / 0.035) + 1)); n = Math.min(n, nn); }
          text(c, wd.t, lx + wd.x, ly + rise, Object.assign({}, sty_, { n, dy: drop }));
          if (wd.k && a > 0.22 && a < 0.62 && n === wd.t.length) { // блик по ключевому слову
            const gi = Math.floor(((a - 0.22) / 0.4) * (wd.t.length + 1)); let pen = lx + wd.x, i = 0;
            for (const ch of wd.t) { if (i === gi && ch !== ' ') spr(c, gspr(ch, sty({ s, bold: b, col: 'w', ext: o.ext })), pen - 1, ly + rise - 1); pen += gly(ch).w * s + b + s; i++; }
          }
        }
        j++;
      }
    });
    return L;
  }
  const title = (c, lt, t0, str, x, y, o = {}) => words(c, lt, t0, str, x, y, Object.assign({ s: 2, drop: true, gap: 0.22, al: 'c' }, o));
  // штамп: слово «впечатывается» с крупного размера за 3 кадра; вернёт силу тряски 0…1
  function stamp(c, lt, t0, str, x, y, o = {}) {
    const a = lt - t0; if (a < 0 || (o.out != null && lt > o.out)) return 0;
    const f = Math.floor(a * 30), s0 = o.s || 2; let s = f === 0 ? s0 + 2 : f === 1 ? s0 + 1 : s0; while (s > s0 && tw(str, s, 1) + (o.box ? 12 : 0) > 168) s--;
    const w = tw(str, s, 1), hh = 9 * s;
    if (o.box) { const bw = w + 12, bh = hh + 10; panel(c, x - bw / 2, y - bh / 2, bw, bh, { bg: o.box === true ? P.ui : o.box }); }
    text(c, str, x, y - hh / 2 + 1, { s, col: f <= 1 ? 'w' : o.col || 'y', al: 'c' });
    return f < 8 ? (8 - f) / 8 : 0;
  }
  // всплывающая надпись «+1»: подъём, мигание и исчезновение
  function popup(c, lt, t0, str, x, y, o = {}) {
    const a = lt - t0, life = o.life || 1.1; if (a < 0 || a > life) return;
    if (a > life - 0.3 && Math.floor(a * 15) % 2) return;
    text(c, str, x, y - ri(eo(a / 0.6) * (o.rise ?? 14)), { s: o.s || 1, col: o.col || 'y', al: 'c' });
  }
  // лента-баннер через весь экран (интерфейс: пружина с перелётом)
  function banner(c, lt, t0, str, y, o = {}) {
    const a = lt - t0; if (a < 0) return; const s = o.s || 2, w = tw(str, s, 1) + 26, h = 9 * s + 10, cx = o.x ?? 90;
    let x = lerp(-w - 8, cx - w / 2, spring(a, 1.4, 6.5)); if (o.out != null && lt > o.out) { const q = ei((lt - o.out) / 0.22); if (q >= 1) return; x += q * (BW + w); }
    const col = o.bg || P.red2, c2 = o.bg2 || P.red;
    rect(c, x - 6, y + 4, 8, h, P.ink); rect(c, x - 5, y + 5, 6, h - 2, col); rect(c, x + w - 2, y + 4, 8, h, P.ink); rect(c, x + w - 1, y + 5, 6, h - 2, col);
    rect(c, x, y - 1, w, h + 2, P.ink); rect(c, x + 1, y, w - 2, h, c2); rect(c, x + 1, y, w - 2, 2, '#ff9aa6'); rect(c, x + 1, y + h - 2, w - 2, 2, col);
    text(c, str, x + w / 2, y + 5, { s, col: o.col || 'w', al: 'c' });
  }
  function panel(c, x, y, w, h, o = {}) {
    x = ri(x); y = ri(y); w = ri(w); h = ri(h);
    if (o.shadow !== false) { dith(c, x + 2, y + h, w - 1, 2, P.ink, 10); dith(c, x + w, y + 2, 2, h - 1, P.ink, 10); }
    rect(c, x + 1, y, w - 2, h, P.ink); rect(c, x, y + 1, w, h - 2, P.ink);
    rect(c, x + 1, y + 1, w - 2, h - 2, o.hi || P.uiL); rect(c, x + 2, y + 2, w - 4, h - 4, o.mid || P.uiM);
    rect(c, x + 3, y + 3, w - 6, h - 6, o.bg || P.ui); if (o.bg2 !== null) rect(c, x + 3, y + 3, w - 6, Math.max(1, (h - 6) >> 2), o.bg2 || P.ui2);
  }
  function bar(c, x, y, w, h, f, o = {}) {
    f = cl(f); rect(c, x, y, w, h, P.ink); rect(c, x + 1, y + 1, w - 2, h - 2, P.uiD);
    const fw = ri((w - 2) * f), col = o.col || P.cyan;
    if (fw > 0) { rect(c, x + 1, y + 1, fw, h - 2, o.flash ? '#ffffff' : col); if (!o.flash) { rect(c, x + 1, y + 1, fw, 1, o.hi || P.ice); rect(c, x + 1, y + h - 2, fw, 1, o.lo || P.blue); } }
    const seg = o.seg || 0; if (seg) for (let i = 1; i < seg; i++) rect(c, x + ri((w * i) / seg), y + 1, 1, h - 2, P.ink);
  }
  function button(c, x, y, w, h, label, o = {}) {
    const pd = o.down ? 2 : 0; if (!o.down) rect(c, x + 1, y + h, w - 2, 2, P.ink);
    panel(c, x, y + pd, w, h, { bg: o.bg || P.gold2, bg2: o.bg2 || P.gold, hi: '#fff4c0', mid: o.mid || '#e0a030', shadow: false });
    text(c, label, x + w / 2, y + pd + (h - 9 * (o.s || 2)) / 2 + 1, { s: o.s || 2, col: o.col || 'w', al: 'c' });
  }
  // счётчик-одометр: v дробное → цифры прокручиваются
  function num(c, v, x, y, o = {}) {
    const s = o.s || 1, b = s >= 2 ? 1 : 0, pad = o.pad || 1, iv = Math.floor(v + 1e-6), f = v - iv, a = String(iv).padStart(pad, '0'), w = tw(a, s, b);
    const x0 = ri(o.al === 'c' ? x - w / 2 : o.al === 'r' ? x - w : x);
    if (!o.roll || f < 0.02) { text(c, a, x0, y, Object.assign({}, o, { al: 'l' })); return w; }
    const nb = String(iv + 1).padStart(pad, '0'), u = un(c), lh = 9 * s + 3, sh = ri(eio(f) * lh); o = Object.assign({}, o, { al: 'l' });
    c.save(); c.beginPath(); c.rect((x0 - 1) * u, (y - 1) * u, (w + 3) * u, (9 * s + 3 + (s >= 2 ? s : 1)) * u); c.clip();
    let pen = x0;
    for (let i = 0; i < a.length; i++) { const sw = gly(a[i]).w * s + b; if (a[i] === nb[i]) text(c, a[i], pen, y, o); else { text(c, a[i], pen, y - sh, o); text(c, nb[i] || '', pen, y + lh - sh, o); } pen += sw + s; }
    c.restore(); return w;
  }
  function dialog(c, lt, t0, str, x, y, w, o = {}) { // окно RPG с печатающимся текстом и мигающим ▼
    const L = layout(str, 1, 0, w - 14), h = L.h + 12, a = lt - t0; if (a < 0) return h;
    const op = eo(a / 0.18), hh = Math.max(6, ri(h * op)); panel(c, x, y + (h - hh) / 2, w, hh, o); if (op < 1) return h;
    let left = Math.floor((a - 0.18) * (o.cps || 28));
    L.lines.forEach((ln, li) => { for (const wd of ln.ws) { if (left <= 0) return; const n = Math.min(wd.t.length, left); text(c, wd.t, x + 7 + wd.x, y + 7 + li * 11, { col: wd.k ? 'y' : 'w', n }); left -= wd.t.length + 1; } });
    if (left > 0 && blink(lt, 2.5)) text(c, '▼', x + w - 12, y + h - 9, { col: 'y' });
    return h;
  }

  // ---------- небо, звёзды, луна, холмы, стена ----------
  function skyCv(pal, h) {
    return cached('sky' + pal.join() + h, () => {
      const cv = new OffscreenCanvas(BW, BH), x = cv.getContext('2d'), id = x.createImageData(BW, BH), d = id.data, n = pal.length;
      for (let y = 0; y < BH; y++) {
        const pos = Math.min(n - 1, (y / h) * (n - 1)), i = Math.floor(pos), f = pos - i, lv = f < 0.62 ? 0 : f < 0.75 ? 4 : f < 0.88 ? 8 : 12;
        for (let X = 0; X < BW; X++) { const v = hex(BAY[(X & 3) + ((y & 3) << 2)] < lv ? pal[Math.min(n - 1, i + 1)] : pal[i]), k = (y * BW + X) * 4; d[k] = v[0]; d[k + 1] = v[1]; d[k + 2] = v[2]; d[k + 3] = 255; }
      }
      x.putImageData(id, 0, 0); return cv;
    });
  }
  function sky(c, pal = 'night', o = {}) { const p = typeof pal === 'string' ? SKY[pal] || SKY.night : pal; spr(c, skyCv(p, o.h || 250), 0, 0); }
  function stars(c, t, o = {}) {
    const n = o.n || 70, r = rnd(o.seed || 3), y1 = o.y1 || 200, u = un(c);
    for (let i = 0; i < n; i++) {
      const x = Math.floor(r() * BW), y = Math.floor(r() * y1), k = r(), ph = r() * 10, sp = 0.6 + r() * 1.6;
      const tw_ = hash(i * 3.7 + Math.floor(t * sp + ph)), br = k > 0.9 ? 3 : k > 0.6 ? 2 : 1, lv = tw_ > 0.85 ? Math.min(3, br + 1) : tw_ < 0.12 ? br - 1 : br;
      if (lv <= 0 || (o.dim && lv < 2)) continue;
      c.fillStyle = lv === 3 ? P.star : lv === 2 ? P.star2 : P.star3; c.fillRect(x * u, y * u, u, u);
      if (lv === 3 && k > 0.94 && tw_ > 0.5) { c.fillStyle = P.star3; c.fillRect((x - 1) * u, y * u, u, u); c.fillRect((x + 1) * u, y * u, u, u); c.fillRect(x * u, (y - 1) * u, u, u); c.fillRect(x * u, (y + 1) * u, u, u); }
    }
  }
  function moon(c, x, y, o = {}) {
    const r = o.r || 12, cv = cached('moon' + r, () => {
      const g = grid(2 * r + 1, 2 * r + 1);
      for (let j = 0; j <= 2 * r; j++) for (let i = 0; i <= 2 * r; i++) { const nx = (i - r) / (r + 0.5), ny = (j - r) / (r + 0.5); if (nx * nx + ny * ny <= 1) gset(g, i, j, 13, nx * 0.6 + ny * 0.7 > 0.55 ? 1 : -nx * 0.6 - ny * 0.7 > 0.5 ? 3 : 2); }
      [[-0.35, -0.2, 0.22], [0.25, 0.3, 0.16], [0.35, -0.35, 0.1], [-0.1, 0.45, 0.09], [-0.5, 0.25, 0.07]].forEach(([a, b, q]) => { const cr = Math.max(1, ri(q * r)); for (let j = -cr; j <= cr; j++) for (let i = -cr; i <= cr; i++) if (i * i + j * j <= cr * cr + 0.5) { const X = ri(r + a * r + i), Y = ri(r + b * r + j); if (g.m[Y * g.w + X]) gset(g, X, Y, 13, j < 0 && i < 0 ? 1 : 2); } });
      return bake(g, { out: null });
    });
    if (o.halo !== false) { ring(c, x, y, r + 3, P.star3, 0.55, 2); ring(c, x, y, r + 6, P.star3, 0.8, 5); }
    spr(c, cv, x - r - 1, y - r - 1);
  }
  function sun(c, x, y, t, o = {}) {
    const r = o.r || 10, cc = o.col ? colr(o.col) : null, c0 = cc ? tone(cc, 0.6) : P.f0, c1 = cc || P.f1, c2 = cc ? tone(cc, -0.2) : P.f2;
    if (o.rays !== false) for (let i = 0; i < 8; i++) { const a = i * 0.785 + Math.floor(t * 4) * 0.2, l = r + 4 + (i % 2) * 3; line(c, x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), x + Math.cos(a) * l, y + Math.sin(a) * l, c1); }
    disc(c, x, y, r + 1, c2); disc(c, x, y, r, c1); disc(c, x - 2, y - 2, r - 4, c0);
  }
  function cloud(c, x, y, o = {}) {
    const w = o.w || 34, k = o.seed || 1, cv = cached('cl' + w + k + (o.col || ''), () => {
      const h = ri(w * 0.42), cvv = new OffscreenCanvas(w, h), xx = cvv.getContext('2d'), r = rnd(k), c1 = o.col || '#eef2ff', c2 = o.col2 || '#b9c4ee';
      const blobs = []; for (let i = 0; i < 5; i++) blobs.push([ri(w * (0.18 + 0.64 * (i / 4))), ri(h * 0.62 - r() * h * 0.25), ri(h * (0.28 + r() * 0.2))]);
      blobs.forEach((b) => disc(xx, b[0], b[1] + 1, b[2], c2)); blobs.forEach((b) => disc(xx, b[0], b[1] - 1, b[2] - 1, c1)); rect(xx, 2, h - 3, w - 4, 3, c2); return cvv;
    });
    spr(c, cv, x - (w >> 1), y);
  }
  function hillCv(seed, hm, k, trees, col, rim) {
    return cached('hill' + seed + hm + k + trees + col, () => {
      const cv = new OffscreenCanvas(360, hm + 2), x = cv.getContext('2d'), r = rnd(seed), T = [];
      if (trees) for (let i = 0; i < 26; i++) T.push([ri(r() * 360), 4 + ri(r() * hm * 0.55)]);
      for (let X = 0; X < 360; X++) {
        const a = (X / 360) * 6.2832; let hh = hm * (0.55 + 0.25 * Math.sin(a * 2 + seed) + 0.12 * Math.sin(a * 5 + seed * 2) + 0.08 * Math.sin(a * 9 + seed * 3)) * k;
        for (const t of T) { const dx = Math.min(Math.abs(X - t[0]), 360 - Math.abs(X - t[0])); hh = Math.max(hh, hm * 0.4 * k + t[1] - Math.floor(dx * 1.4) - (dx % 3 === 2 ? 1 : 0)); }
        hh = ri(Math.min(hm, hh)); rect(x, X, hm + 2 - hh, 1, hh, col); if (rim) rect(x, X, hm + 2 - hh, 1, 1, rim);
      }
      return cv;
    });
  }
  function hills(c, t, o = {}) {
    const hm = o.h || 26, cv = hillCv(o.seed || 1, hm, o.k || 1, !!o.trees, o.col || P.hill0, o.rim), off = ((Math.floor((o.scroll || 0) + t * (o.speed || 0)) % 360) + 360) % 360, y = (o.y ?? GY) - hm - 2;
    spr(c, cv, -off, y); spr(c, cv, 360 - off, y); if (off > 180) spr(c, cv, 720 - off, y);
    rect(c, 0, y + hm + 2, BW, (o.fill ?? 8), o.col || P.hill0);
  }
  function castle(c, x, y, t, o = {}) { // далёкий замок-силуэт с окнами
    const col = o.col || P.castle, cv = cached('castle' + col, () => {
      const cvv = new OffscreenCanvas(44, 46), xx = cvv.getContext('2d'), tw2 = (X, w, h) => { rect(xx, X, 46 - h, w, h, col); for (let i = 0; i < w; i += 2) rect(xx, X + i, 44 - h, 1, 2, col); };
      rect(xx, 2, 30, 40, 16, col); for (let i = 2; i < 42; i += 3) rect(xx, i, 28, 2, 2, col); tw2(4, 7, 30); tw2(18, 9, 42); tw2(34, 7, 26);
      for (let j = 0; j < 4; j++) rect(xx, 22 - j, 2 + j, 1 + 2 * j, 1, col); return cvv;
    });
    spr(c, cv, x - 22, y - 46);
    const win = [[7, 22], [22, 12], [22, 20], [37, 26], [12, 36], [28, 34]];
    win.forEach((w, i) => { if (hash(i * 5.1 + Math.floor(t * 0.8 + i)) > 0.2) rect(c, x - 22 + w[0], y - 46 + w[1], 1, 2, i % 2 ? P.f1 : P.gold); });
  }
  function wallCv(h) {
    return cached('wall' + h, () => {
      const cv = new OffscreenCanvas(96, h), x = cv.getContext('2d'), r = rnd(7);
      rect(x, 0, 0, 96, h, P.st2); rect(x, 0, 0, 96, 1, P.st0); rect(x, 0, 1, 96, 6, P.st1);
      for (let X = 0; X < 96; X += 16) { rect(x, X + 15, 1, 1, 6, P.mortar); rect(x, X, 1, 1, 1, P.st0); }
      rect(x, 0, 7, 96, 1, P.mortar); rect(x, 0, 8, 96, 2, P.st4);
      for (let row = 0, Y = 10; Y < h; row++, Y += 8) {
        const off = row % 2 ? 6 : 0, dk = Y > 34 ? 2 : Y > 20 ? 1 : 0, base = [P.st2, P.st3, P.st4][dk], hi = [P.st1, P.st2, P.st3][dk];
        rect(x, 0, Y, 96, 7, base); rect(x, 0, Y, 96, 1, hi); rect(x, 0, Y + 7, 96, 1, P.mortar);
        for (let X = -off; X < 96; X += 12) { rect(x, X + 11, Y, 1, 7, P.mortar); rect(x, X + 10, Y + 1, 1, 6, [P.st3, P.st4, P.mortar][dk]); }
      }
      for (let i = 0; i < 260; i++) { const X = Math.floor(r() * 96), Y = 1 + Math.floor(r() * (h - 2)), v = r(); const cur = Y < 7 ? (v < 0.5 ? P.st0 : P.st3) : v < 0.5 ? P.st1 : P.st4; rect(x, X, Y, 1, 1, cur); }
      for (let Y = 40; Y < h; Y++) dith(x, 0, Y, 96, 1, P.pit, ri(cl((Y - 40) / 40) * 16));
      return cv;
    });
  }
  // каменная стена-платформа; y — верх (по нему ходят), scroll — сдвиг, gaps — [[x, w]] провалы в координатах кадра
  function wall(c, y = GY, o = {}) {
    const h = BH - y, cv = wallCv(h + 2), off = ((Math.floor(o.scroll || 0) % 96) + 96) % 96;
    for (let X = -off; X < BW; X += 96) spr(c, cv, X, y);
    for (const g of o.gaps || []) {
      const gx = ri(g[0]), gw = ri(g[1]); rect(c, gx, y, gw, h, P.pit); dith(c, gx, y, gw, 3, P.st4, 6);
      rect(c, gx - 1, y, 1, h, P.mortar); rect(c, gx + gw, y, 1, h, P.mortar); px(c, gx - 2, y, P.mortar); px(c, gx + gw + 1, y + 1, P.mortar);
    }
  }
  function backdrop(c, t, o = {}) { // всё ночное окружение одним вызовом
    const pal = o.sky || 'night', hc = HILLS[pal] || HILLS.night, gy = o.gy ?? GY;
    sky(c, pal);
    if (o.stars !== false) stars(c, t, { n: o.n || 70, y1: gy - 40, seed: o.seed || 3, dim: pal === 'day' || pal === 'dawn' });
    if (o.moon !== false && pal !== 'day') moon(c, o.mx ?? 136, o.my ?? 150, { r: o.mr || 12, halo: o.halo });
    if (o.sun) sun(c, o.sun[0], o.sun[1], t, { col: o.sunCol });
    if (o.hills !== false) {
      const sc = (o.scroll || 0);
      hills(c, t, { y: gy - 14, h: 30, col: hc[0], seed: 4, k: 0.9, scroll: sc * 0.25, fill: 16 });
      if (o.castle !== false) castle(c, ri((o.cx ?? 44) - sc * 0.25), gy - 30, t, { col: hc[2] });
      hills(c, t, { y: gy, h: 22, col: hc[1], seed: 9, k: 0.8, trees: true, scroll: sc * 0.5, fill: 2 });
    }
    if (o.mid) o.mid(c);
    if (o.ground) ground(c, gy, { kind: o.ground, scroll: o.scroll, gaps: o.gaps }); else if (o.wall !== false) wall(c, gy, { scroll: o.scroll, gaps: o.gaps });
  }

  // ---------- эффекты (всё по t, без накопления) ----------
  function flame(c, x, y, h, t, o = {}) {
    if (h < 1.5) return; const f = Math.floor(t * (o.fps || 12)) + (o.seed || 0) * 17, lean = o.lean || 0, wm = Math.max(1.6, h * 0.36 * (o.wide || 1)), cols = o.cols || [P.f3, P.f2, P.f1, P.f0];
    for (let r = 0; r < h; r++) {
      const q = r / h; let hw = wm * Math.sqrt(Math.max(0, 1 - Math.pow(q, 1.7))) * (q < 0.2 ? 0.8 + q : 1) * (0.84 + 0.32 * hash(f * 13.1 + r * 7.7));
      const cx = x + 0.5 + lean * q * q + (hash(f * 5.3 + (r >> 1)) - 0.5) * q * 2.2, yy = y - r;
      const sp = (k, col) => { const w = Math.max(1, ri(2 * hw * k)); rect(c, ri(cx - w / 2), yy, w, 1, col); };
      sp(1, cols[0]); if (hw > 1.1) sp(0.68, cols[1]); if (q < 0.72 && hw > 1.4) sp(0.42, cols[2]); if (q < 0.4 && hw > 1.9) sp(0.2, cols[3]);
    }
    if (h > 6) for (let i = 0; i < 3; i++) { const k = (t * 1.6 + i / 3 + (o.seed || 0) * 0.37) % 1, sx = x + ri((hash(i + Math.floor(t * 1.6 + i / 3) * 3.3) - 0.5) * h * 0.6) + ri(lean * 0.5); if (k < 0.8) px(c, sx, y - h - ri(k * h * 0.7), k < 0.4 ? P.f1 : P.f3); }
  }
  function smoke(c, x, y, t) { for (let i = 0; i < 4; i++) { const k = (t * 0.9 + i / 4) % 1; px(c, x + ri(Math.sin(k * 6 + i) * 2), y - ri(k * 10), k < 0.5 ? '#6a6688' : '#3c3a58'); } }
  function glowCv(r, col, lvl) {
    return cached('gl' + r + col + lvl, () => {
      const n = 2 * r + 1, cv = new OffscreenCanvas(n, n), x = cv.getContext('2d'), id = x.createImageData(n, n), d = id.data, v = hex(col);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const q = Math.hypot(i - r, j - r) / (r + 0.5); if (q > 1) continue; const L = 16 * lvl * Math.pow(1 - q, 1.3); if (BAY[(i & 3) + ((j & 3) << 2)] < L) { const k = (j * n + i) * 4; d[k] = v[0]; d[k + 1] = v[1]; d[k + 2] = v[2]; d[k + 3] = 255; } }
      x.putImageData(id, 0, 0); return cv;
    });
  }
  function glow(c, x, y, r, col = P.f1, lvl = 0.8) { r = ri(r); if (r < 1) return; spr(c, glowCv(r, col, ri(lvl * 8) / 8), x - r, y - r); }
  function burst(c, lt, x, y, o = {}) {
    const n = o.n || 14, life = o.life || 0.7, sp = o.sp || 70, gr = o.g ?? 110, cols = o.cols || [P.white, P.f1, P.f2, P.f3], r = rnd(o.seed || 1);
    if (lt < 0 || lt > life * 1.25) return;
    for (let i = 0; i < n; i++) {
      const a = (o.a0 ?? 0) + (o.arc ?? 6.2832) * ((i + r() * 0.8) / n), v = sp * (0.4 + 0.8 * r()), L = life * (0.55 + 0.7 * r());
      if (lt > L) continue; const q = lt / L, tt = lt * (1 - 0.4 * q), sz = q < 0.35 && o.big !== false ? 2 : 1;
      rect(c, ri(x + Math.cos(a) * v * tt) - (sz >> 1), ri(y + Math.sin(a) * v * tt + 0.5 * gr * lt * lt) - (sz >> 1), sz, sz, cols[Math.min(cols.length - 1, Math.floor(q * cols.length))]);
    }
  }
  function sparkle(c, x, y, ph, col = P.white) { // крестик-искра; ph 0…1
    if (ph <= 0 || ph >= 1) return; const s = ri(Math.sin(ph * Math.PI) * 3.2); x = ri(x); y = ri(y);
    px(c, x, y, col); if (s >= 1) { rect(c, x - s, y, 2 * s + 1, 1, col); rect(c, x, y - s, 1, 2 * s + 1, col); } if (s >= 3) { px(c, x - 1, y - 1, col); px(c, x + 1, y + 1, col); px(c, x + 1, y - 1, col); px(c, x - 1, y + 1, col); }
  }
  function twinkles(c, t, x, y, w, h, o = {}) { const n = o.n || 6; for (let i = 0; i < n; i++) { const per = 0.9 + hash(i * 2.1 + (o.seed || 0)) * 0.8, k = t / per + hash(i * 9.7), cyc = Math.floor(k); sparkle(c, x + hash(i * 3.3 + cyc * 1.7) * w, y + hash(i * 5.9 + cyc * 2.3) * h, (k - cyc) * 1.6, o.col || P.white); } }
  function magic(c, t, x, y, r, o = {}) { // вихрь магических пикселей
    const n = o.n || 26, cols = o.cols || [P.cyan, P.ice, P.violet, P.white, P.blue];
    for (let i = 0; i < n; i++) {
      const sp = (1.6 + (i % 3) * 0.7) * (o.dir || 1), a = hash(i * 1.7) * 6.28 + t * sp, rr = r * (0.45 + 0.55 * hash(i * 4.1)), ey = o.flat ?? 0.55;
      if (hash(i * 7.7 + Math.floor(t * 14)) < 0.18) continue; const X = x + Math.cos(a) * rr, Y = y + Math.sin(a) * rr * ey;
      px(c, X, Y, cols[i % cols.length]); if (i % 3 === 0) px(c, x + Math.cos(a - 0.25) * rr, y + Math.sin(a - 0.25) * rr * ey, cols[(i + 2) % cols.length]);
    }
  }
  function shock(c, lt, x, y, o = {}) { const d = o.dur || 0.45; if (lt < 0 || lt > d) return; const q = lt / d; ring(c, x, y, ri(lerp(o.r0 || 3, o.r || 30, eo(q))), o.col || P.white, q * 0.85, 3); if (q < 0.5) ring(c, x, y, ri(lerp(o.r0 || 3, o.r || 30, eo(q)) * 0.7), o.col2 || P.cyan, q * 1.4 + 0.2, 7); }
  function beam(c, x, y0, y1, t, o = {}) {
    const w = (o.w || 12) + (Math.floor(t * 15) % 2), col = o.col || P.cyan, h = y1 - y0;
    dith(c, x - w, y0, 2 * w, h, col, 5); dith(c, x - w + 3, y0, 2 * w - 6, h, col, 10); rect(c, x - w / 2 + 1, y0, w - 2, h, o.c2 || P.ice); rect(c, x - 2, y0, 4, h, P.white);
    for (let i = 0; i < 10; i++) { const k = (t * 1.3 + i / 10) % 1; px(c, x + ri((hash(i * 3.1) - 0.5) * 2 * w), y1 - ri(k * h), k < 0.5 ? P.white : col); }
  }
  function raysBase(R) { return cached('rb' + R, () => { const m = 2 * R + 1, A = new Float32Array(m * m), Q = new Float32Array(m * m); for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const dx = i - R, dy = j - R; A[j * m + i] = Math.atan2(dy, dx) / 6.2832; Q[j * m + i] = Math.hypot(dx, dy) / R; } return { A, Q }; }); }
  function raysCv(R, n, col, f, lvl) {
    return cached('ray' + R + n + col + f + lvl, () => {
      const m = 2 * R + 1, cv = new OffscreenCanvas(m, m), x = cv.getContext('2d'), id = x.createImageData(m, m), d = id.data, v = hex(col), { A, Q } = raysBase(R), ph = f / 6;
      for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const k0 = j * m + i, q = Q[k0]; if (q > 1 || q < 0.08) continue; const a = A[k0] * n + ph; if (a - Math.floor(a) > 0.5) continue; if (BAY[(i & 3) + ((j & 3) << 2)] < 16 * lvl * (1 - q)) { const k = k0 * 4; d[k] = v[0]; d[k + 1] = v[1]; d[k + 2] = v[2]; d[k + 3] = 255; } }
      x.putImageData(id, 0, 0); return cv;
    });
  }
  function rays(c, x, y, t, o = {}) { const R = o.r || 80; spr(c, raysCv(R, o.n || 12, o.col || P.f1, fr(t, o.fps || 5, 6), o.lvl || 0.55), x - R, y - R); }
  function aura(c, x, y, t, o = {}) { // огненная аура вокруг героя
    const k = fr(t, 10, 3); for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42, R = (o.r || 17) + (hash(i + k * 7) * 3) | 0; flame(c, x + Math.cos(a) * R * 0.75, y - 16 + Math.sin(a) * R * 0.9 + 6, 6 + ((i + k) % 3) * 2, t, { seed: i, lean: Math.cos(a) * 3 }); }
  }
  function bolt(c, x0, y0, x1, y1, seed, o = {}) {
    const r = rnd(seed), n = o.n || 6; let px0 = x0, py0 = y0;
    for (let i = 1; i <= n; i++) { const q = i / n, nx = lerp(x0, x1, q) + (i < n ? (r() - 0.5) * (o.j || 10) : 0), ny = lerp(y0, y1, q) + (i < n ? (r() - 0.5) * 4 : 0); line(c, px0 + 1, py0, nx + 1, ny, o.col || P.violet); line(c, px0, py0, nx, ny, P.white); px0 = nx; py0 = ny; }
  }
  function rain(c, t, o = {}) { const n = o.n || 60, sp = o.sp || 260; c.fillStyle = o.col || '#5a5f9a'; const u = un(c); for (let i = 0; i < n; i++) { const x = Math.floor((hash(i * 1.3) * BW + t * (o.wind || -30)) % BW + BW) % BW, y = Math.floor((hash(i * 7.1) * BH + t * sp) % BH); c.fillRect(x * u, y * u, u, 4 * u); } }
  function fireflies(c, t, o = {}) { const n = o.n || 10; for (let i = 0; i < n; i++) { const x = (o.x || 0) + hash(i * 2.3) * (o.w || BW) + Math.sin(t * 0.8 + i) * 6, y = (o.y || 120) + hash(i * 4.7) * (o.h || 100) + Math.sin(t * 1.1 + i * 2) * 5; if (hash(i + Math.floor(t * 3 + i)) > 0.25) px(c, x, y, i % 3 ? P.f1 : P.green); } }
  function dust(c, lt, x, y, o = {}) { if (lt < 0 || lt > 0.5) return; const q = lt / 0.5; for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1, d = 2 + i * 2; px(c, x + s * ri(d * eo(q) + 2), y - ri(eo(q) * (1 + (i % 3))), q < 0.5 ? P.st0 : P.st1); } }
  function speed(c, t, o = {}) { const n = o.n || 10; for (let i = 0; i < n; i++) { const y = (o.y || 40) + Math.floor(hash(i * 3.3) * (o.h || 200)), len = 8 + ri(hash(i * 1.9) * 18), x = BW - ((t * (o.sp || 240) + hash(i * 5.5) * 400) % (BW + 60)); rect(c, x, y, len, 1, o.col || P.star3); } }

  // ---------- герой: рыцарь-огонёк (шлем с плюмажем-пламенем = мотивация) ----------
  const HN = { idle: 2, run: 4, walk: 4, jump: 1, fall: 2, hurt: 2, cheer: 2, power: 2, press: 1, sad: 2, point: 1 };
  const HF = { idle: 2.5, run: 12, walk: 8, fall: 8, hurt: 10, cheer: 6, power: 8, sad: 2 };
  function heroBy(pose, f) { return pose === 'idle' ? f : pose === 'run' || pose === 'walk' ? (f % 2 ? -1 : 0) : pose === 'jump' ? -1 : pose === 'cheer' ? (f ? 0 : -1) : pose === 'sad' ? 1 : pose === 'hurt' ? f : 0; }
  function heroGrid(pose, f, eyesO) {
    const g = grid(28, 34), by = heroBy(pose, f);
    let legs = [[10, 0], [15, 0]], aB = 'down', aF = 'down', eyes = 'n', tail = f % 2;
    if (pose === 'run') { legs = [[[8, 1], [17, 0]], [[12, 2], [14, 0]], [[17, 0], [8, 1]], [[14, 0], [12, 2]]][f]; aB = f < 2 ? 'fw' : 'down'; aF = f < 2 ? 'down' : 'fw'; tail = 2 + (f % 2); }
    else if (pose === 'walk') { legs = [[[9, 0], [16, 0]], [[11, 1], [14, 0]], [[16, 0], [9, 0]], [[14, 0], [11, 1]]][f]; }
    else if (pose === 'jump') { legs = [[10, 2], [16, 3]]; aB = 'up'; aF = 'up'; eyes = 'o'; tail = 2; }
    else if (pose === 'fall') { legs = [[8, 0], [17, 0]]; aB = 'up'; aF = 'up'; eyes = 'o'; }
    else if (pose === 'hurt') { legs = [[9, 0], [16, 0]]; aB = 'out'; aF = 'out'; eyes = 'x'; }
    else if (pose === 'cheer') { legs = [[9, 0], [16, 0]]; aB = 'up'; aF = 'up'; eyes = 'h'; }
    else if (pose === 'power') { legs = [[8, 0], [17, 0]]; aB = 'out'; aF = 'out'; eyes = 'g'; tail = 2 + f; }
    else if (pose === 'press' || pose === 'point') { aF = 'fwd'; }
    else if (pose === 'sad') { eyes = 's'; }
    if (eyesO) eyes = eyesO;
    const leg = (x0, lift, dk) => { const top = 27 + by, bot = 31 - lift; grect(g, x0, top, 3, Math.max(1, bot - top), 7, dk ? 1 : 0); grect(g, x0, bot, 4, 3, 6, dk ? 1 : 0); };
    const arm = (k, back) => {
      const s = back ? 1 : 0;
      if (k === 'down') { const x = back ? 8 : 19; grect(g, x, 22 + by, 2, 4, 1, s); grect(g, x, 26 + by, 2, 2, 1, back ? 1 : 3); }
      else if (k === 'fw') { const x = back ? 9 : 19; grect(g, x, 22 + by, 2, 3, 1, s); grect(g, x + 2, 24 + by, 2, 2, 1, s); }
      else if (k === 'up') { const x = back ? 7 : 20; grect(g, x, 15 + by, 2, 7, 1, s); grect(g, x - (back ? 1 : 0), 13 + by, 3, 2, 1, back ? 1 : 3); }
      else if (k === 'out') { if (back) { grect(g, 5, 22 + by, 4, 2, 1, 1); grect(g, 3, 21 + by, 2, 3, 1, 1); } else { grect(g, 19, 22 + by, 4, 2, 1); grect(g, 23, 21 + by, 2, 3, 1, 3); } }
      else if (k === 'fwd') { grect(g, 19, 23 + by, 5, 2, 1); grect(g, 24, 22 + by, 3, 3, 1, 3); }
    };
    leg(legs[0][0], legs[0][1], true); arm(aB, true);
    grect(g, 10, 21 + by, 9, 6, 1); grect(g, 10, 26 + by, 9, 1, 5); gset(g, 14, 26 + by, 8, 2);
    gset(g, 14, 22 + by, 19, 3); grect(g, 13, 23 + by, 3, 2, 19, 0); gset(g, 14, 24 + by, 4, 2);
    leg(legs[1][0], legs[1][1], false);
    grect(g, 9, 20 + by, 11, 2, 4);
    const T = [[[6, 20, 3, 2], [4, 21, 3, 2], [3, 23, 2, 1]], [[6, 20, 3, 2], [4, 22, 3, 2], [2, 23, 3, 1]], [[5, 20, 4, 2], [2, 21, 4, 2], [0, 20, 3, 1]], [[5, 20, 4, 2], [2, 20, 4, 2], [0, 21, 3, 1]]][tail];
    T.forEach(([x, y, w, h], i) => grect(g, x, y + by, w, h, 4, i ? 1 : 0));
    arm(aF, false);
    const cx = 14, cy = 12.5 + by, rx = 8.3, ry = 7.6;
    for (let y = 0; y < 34; y++) for (let x = 0; x < 28; x++) { const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry; if (nx * nx + ny * ny <= 1) gset(g, x, y, 1, -0.6 * nx - 0.8 * ny > 0.52 ? 3 : 0.55 * nx + 0.83 * ny > 0.56 ? 1 : 2); }
    gset(g, 9, 8 + by, 8, 2); gset(g, 10, 7 + by, 8, 2); gset(g, 8, 10 + by, 8, 2);
    for (let x = 0; x < 28; x++) if (g.m[(18 + by) * 28 + x] === 1) gset(g, x, 18 + by, 5, 0);
    for (let y = 11 + by; y <= 14 + by; y++) for (let x = 13; x < 28; x++) if (g.m[y * 28 + x] === 1) gset(g, x, y, 2, 2);
    const E = (pts, m = 3) => pts.forEach(([x, y]) => gset(g, x, y + by, m, 2));
    if (eyes === 'h') E([[15, 13], [16, 12], [17, 13], [19, 13], [20, 12], [21, 13]]);
    else if (eyes === 'x') E([[15, 11], [17, 11], [16, 12], [15, 13], [17, 13], [19, 11], [21, 11], [20, 12], [19, 13], [21, 13]], 8);
    else if (eyes === 'o') E([[16, 12], [17, 12], [16, 13], [17, 13], [20, 12], [21, 12], [20, 13], [21, 13]]);
    else if (eyes === 's') E([[15, 13], [16, 13], [17, 13], [19, 13], [20, 13], [21, 13]]);
    else if (eyes === 'g') E([[16, 12], [16, 13], [20, 12], [20, 13]], 8);
    else E([[16, 12], [16, 13], [20, 12], [20, 13]]);
    grect(g, 13, 3 + by, 3, 3, 5);
    return g;
  }
  const FIRE = [0, 7, 11, 17];
  // x — центр, y — уровень земли (ступни стоят на y). o: pose, t, dir (1|-1), fire 0…3, eyes, white, aura, shadow, lean
  function hero(c, x, y, o = {}) {
    const pose = HN[o.pose] ? o.pose : 'idle', n = HN[pose], t = o.t || 0, f = n > 1 ? fr(t, o.fps || HF[pose] || 6, n) : 0, dir = o.dir === -1 ? -1 : 1, eyes = o.eyes || '';
    const cv = cached('hero' + pose + f + dir + eyes + (o.white ? 'w' : ''), () => { const g = heroGrid(pose, f, eyes); return bake(dir < 0 ? gflip(g) : g, { white: o.white ? '#ffffff' : null }); });
    x = ri(x); y = ri(y); const by = heroBy(pose, f);
    if (o.shadow !== false) ddisc(c, x, y + 1, 9, 1, P.ink, 9);
    if (o.aura) aura(c, x, y, t, { r: 17 });
    spr(c, cv, x - 15, y - 35);
    const fi = o.fire ?? 1, fh = fi <= 0 ? 0 : fi >= 3 ? FIRE[3] : lerp(FIRE[Math.floor(fi)], FIRE[Math.ceil(fi)], fi - Math.floor(fi)), fx = x + (dir < 0 ? -1 : 0), fy = y - 35 + 3 + by;
    if (fh >= 1.5) { if (fh > 9) glow(c, fx, fy - fh * 0.4, ri(fh * 0.9), P.f2, 0.35); flame(c, fx - 1, fy, fh, t, { lean: o.lean ?? (pose === 'run' ? -dir * 4 : 0), wide: 1.05 }); }
    else if (o.smoke !== false) smoke(c, fx, fy, t);
  }
  // ---------- предметы мира ----------
  function chest(c, x, y, open = 0) {
    const st = open < 0.34 ? 0 : open < 0.67 ? 1 : 2, cv = cached('chest' + st, () => {
      const g = grid(24, 24); grect(g, 1, 13, 22, 10, 9); grect(g, 3, 13, 2, 10, 5); grect(g, 19, 13, 2, 10, 5); grect(g, 1, 22, 22, 1, 9, 1);
      if (st === 0) { grect(g, 1, 7, 22, 6, 9); grect(g, 2, 6, 20, 1, 9); grect(g, 3, 6, 2, 7, 5); grect(g, 19, 6, 2, 7, 5); grect(g, 1, 12, 22, 1, 9, 1); }
      else if (st === 1) { grect(g, 1, 5, 22, 4, 9); grect(g, 2, 4, 20, 1, 9); grect(g, 3, 4, 2, 5, 5); grect(g, 19, 4, 2, 5, 5); grect(g, 2, 9, 20, 4, 16, 2); grect(g, 4, 11, 16, 2, 19, 3); }
      else { grect(g, 2, 2, 20, 4, 9, 1); grect(g, 3, 2, 2, 4, 5, 1); grect(g, 19, 2, 2, 4, 5, 1); grect(g, 2, 6, 20, 7, 16, 2); grect(g, 3, 10, 18, 3, 19, 3); grect(g, 5, 9, 14, 1, 19, 2); }
      grect(g, 10, 12, 4, 5, 5); gset(g, 11, 14, 16, 2); gset(g, 12, 14, 16, 2); gset(g, 11, 15, 16, 2); return bake(g);
    });
    spr(c, cv, ri(x) - 13, ri(y) - 25);
  }
  function orb(c, x, y, t, o = {}) { // кристалл опыта: вращается кадрами; sc — целый масштаб
    const sc = o.sc || 1, k = fr(t, 10, 4), wv = [9, 7, 3, 7][k] * sc, hh = 9 * sc, cv = cached('orb' + wv + '|' + sc, () => { const rows = ART.gem, g = grid(wv, hh); for (let j = 0; j < hh; j++) for (let i = 0; i < wv; i++) { const e = AM[rows[Math.floor(j / sc)][Math.floor(((i + 0.5) / wv) * 9)]]; if (e) gset(g, i, j, e[0], e[1]); } return bake(g); });
    if (o.glow !== 0) glow(c, x, y, o.glow || 9 * sc, P.cyan, 0.45); spr(c, cv, ri(x) - (cv.width >> 1), ri(y + Math.sin(t * 4) * 1.4 * sc) - (cv.height >> 1));
  }
  function bubble(c, x, y, w, h, o = {}) { // облачко-реплика; x,y — левый верх; tx,ty — куда хвост; think — кружочки
    x = ri(x); y = ri(y); const tx = o.tx ?? x + 4, ty = o.ty ?? y + h + 7;
    if (o.think) { const mx = ri(lerp(x + w / 2, tx, 0.5)), my = ri(lerp(y + h, ty, 0.5)); disc(c, mx, my, 2, P.ink); disc(c, mx, my, 1, P.white); rect(c, tx - 1, ty - 1, 3, 3, P.ink); px(c, tx, ty, P.white); }
    else { const bx = ri(x + w * 0.3); for (let i = 0; i <= 6; i++) { const q = i / 6, X = ri(lerp(bx, tx, q)), Y = ri(lerp(y + h - 2, ty, q)), hw = ri((1 - q) * 3); rect(c, X - hw - 1, Y, hw * 2 + 3, 2, P.ink); rect(c, X - hw, Y, hw * 2 + 1, 1, P.white); } }
    rect(c, x + 1, y, w - 2, h, P.ink); rect(c, x, y + 1, w, h - 2, P.ink); rect(c, x + 1, y + 1, w - 2, h - 2, P.white); rect(c, x + 2, y + h - 2, w - 4, 1, '#c8c4e8');
  }
  function clip(c, rects, fn) { const u = un(c); c.save(); c.beginPath(); for (const r of rects) c.rect(ri(r[0]) * u, ri(r[1]) * u, ri(r[2]) * u, ri(r[3]) * u); c.clip(); fn(); c.restore(); }
  function block(c, x, y, o = {}) { // каменный блок-день 16×16 с подписью
    const gold = !!o.gold, by = o.bump ? -ri(Math.sin(cl(o.bump) * Math.PI) * 4) : 0, cv = cached('blk' + gold, () => { const g = grid(16, 16); grect(g, 0, 0, 16, 16, gold ? 5 : 10); grect(g, 1, 1, 14, 1, gold ? 5 : 10, 3); grect(g, 1, 1, 1, 14, gold ? 5 : 10, 3); grect(g, 1, 14, 14, 1, gold ? 5 : 10, 1); grect(g, 14, 1, 1, 14, gold ? 5 : 10, 1); [[2, 2], [13, 2], [2, 13], [13, 13]].forEach(([a, b]) => gset(g, a, b, 16, 2)); return bake(g); });
    spr(c, cv, ri(x) - 9, ri(y) - 9 + by); if (o.label != null) text(c, String(o.label), x, y - 4 + by, { col: gold ? 'k' : 'w', al: 'c' });
    if (gold && o.t != null) sparkle(c, x + 6, y - 7 + by, (o.t * 1.4) % 1);
  }
  function flag(c, x, y, t, o = {}) {
    const h = o.h || 44, up = cl(o.up ?? 1), col = o.col || P.red, dk = o.dk || P.red2, top = ri(y - h + 3 + (1 - up) * (h - 18));
    rect(c, x - 1, y - h - 1, 4, h + 1, P.ink); rect(c, x, y - h, 2, h, '#b8b4d8'); rect(c, x + 1, y - h, 1, h, '#6a6690'); disc(c, x + 1, y - h - 2, 2, P.ink); disc(c, x + 1, y - h - 2, 1, P.gold);
    for (let i = 0; i < 18; i++) { const off = ri(Math.sin(t * 7 - i * 0.55) * (i / 18) * 1.8); rect(c, x + 2 + i, top + off - 1, 1, 13, P.ink); rect(c, x + 2 + i, top + off, 1, 11, i < 2 ? dk : col); px(c, x + 2 + i, top + off, '#ff9aa6'); }
    const mo = ri(Math.sin(t * 7 - 9 * 0.55) * 0.9); if (o.mark !== false) icon(c, o.mark || 'star', x + 11, top + 5 + mo);
  }
  function hourglass(c, x, y, p, t) { // песочные часы; p 0…1 — сколько пересыпалось
    const q = ri(cl(p) * 12), sf = p > 0 && p < 1 ? fr(t, 12, 2) : 9, cv = cached('hg' + q + sf, () => {
      const g = grid(18, 30); grect(g, 0, 0, 18, 3, 9); grect(g, 0, 27, 18, 3, 9); grect(g, 1, 3, 2, 24, 9, 1); grect(g, 15, 3, 2, 24, 9, 1);
      const hw = (r) => (r < 11 ? 6 - Math.max(0, r - 4) * 0.75 : 1); const ys = (r) => 3 + r;
      for (let r = 0; r < 12; r++) { const w = Math.max(1, ri(hw(r))); grect(g, 9 - w, ys(r), 2 * w, 1, 20, 1); grect(g, 9 - w, 26 - r, 2 * w, 1, 20, 1); }
      const topN = 12 - q; for (let r = 11; r >= 12 - topN && r >= 3; r--) { const w = Math.max(1, ri(hw(r)) - 1); grect(g, 9 - w, ys(r), 2 * w, 1, 5); }
      for (let r = 0; r < Math.min(10, q); r++) { const w = Math.max(1, Math.min(ri(hw(r)) - 1, q - r)); grect(g, 9 - w, 26 - r, 2 * w, 1, 5); }
      if (sf !== 9) for (let yy = 15; yy < 26 - Math.min(10, q); yy++) if ((yy + sf) % 2) gset(g, 8 + ((yy >> 1) % 2), yy, 5, 3);
      return bake(g);
    });
    spr(c, cv, ri(x) - 10, ri(y) - 31);
  }
  function torch(c, x, y, t) { glow(c, x, y - 9, 12, P.f2, 0.35); rect(c, x - 1, y - 4, 3, 6, P.ink); rect(c, x, y - 3, 1, 5, '#6a6690'); rect(c, x - 2, y - 5, 5, 2, P.gold2); flame(c, x, y - 6, 7, t, { seed: x }); }
  function cell(c, x, y, w, h, o = {}) { // клетка календаря/серии: state 0 пусто, 1 огонёк, -1 пропуск; a — время с момента смены
    const a = o.a ?? 9, st = o.state || 0, fl = a >= 0 && a < 0.1;
    rect(c, x, y, w, h, P.ink); rect(c, x + 1, y + 1, w - 2, h - 2, fl ? '#ffffff' : st === 1 ? '#3a2a1a' : st === -1 ? '#3a0f20' : P.ui);
    if (!fl) { rect(c, x + 1, y + 1, w - 2, 1, st === 1 ? P.gold2 : st === -1 ? P.red2 : P.ui2); }
    if (o.label) text(c, o.label, x + w / 2, y + 3, { col: st ? (st === 1 ? 'y' : 'r') : 'd', al: 'c' });
    const cy = y + (o.label ? h - 3 : h / 2 + 5);
    if (st === 1 && !fl) { const s = a < 0.25 ? eo(a / 0.25) : 1; flame(c, x + w / 2 - 1, cy, ri(lerp(3, Math.min(9, h * 0.5), s)), (o.t || 0) + x * 0.13, { seed: x }); }
    if (st === -1 && !fl) icon(c, 'cross', x + w / 2, cy - 4);
  }
  // ---------- HUD игры: уровень, опыт, жизни, день ----------
  function hud(c, s) {
    const sh = s.show ?? 1; if (sh <= 0) return; const t = s.t || 0, oy = -ri((1 - eb(sh)) * 34);
    panel(c, 10, 18 + oy, 104, 30); panel(c, 116, 18 + oy, 54, 30);
    const lf = (s.lvT ?? 9) < 0.7, lc = lf && blink(t, 8) ? 'w' : 'y';
    text(c, s.lvL || '', 16, 23 + oy, { col: 'y' }); text(c, String(s.lv ?? 1), 33, 22 + oy, { s: 2, col: lc, al: 'c' });
    if (lf) for (let i = 0; i < 3; i++) sparkle(c, 33 + (i - 1) * 12, 20 + oy + (i % 2) * 18, ((s.lvT || 0) * 2.2 + i * 0.3) % 1, P.f0);
    text(c, s.xpL || '', 47, 23 + oy, { col: 'd' });
    const xf = (s.xpT ?? 9) < 0.3 && blink(t, 10); bar(c, 47, 34 + oy, 62, 7, s.xp ?? 0, { seg: 8, flash: xf });
    const hp = s.hp ?? 3, mx = s.max ?? 3, ht = s.hpT ?? 9;
    for (let i = 0; i < mx; i++) { const hx = 131 + i * 12, hy = 26 + oy; if (i < hp) icon(c, 'heart', hx, hy); else if (i === ri(hp) && ht < 0.7) { const q = ht / 0.7; if (Math.floor(ht * 14) % 2) { spr(c, artCv('heart'), hx - 5 - ri(q * 4), hy - 5 + ri(q * q * 10)); } } else icon(c, 'heart0', hx, hy); }
    if (s.danger && hp >= 1 && blink(t, 3)) icon(c, 'heart0', 131 + (ri(hp) - 1) * 12, 26 + oy);
    text(c, s.dayL || '', 121, 34 + oy, { col: 'd' }); num(c, s.day ?? 0, 165, 34 + oy, { pad: 2, roll: true, col: s.dayCol || 'w', al: 'r' });
  }

  // ---------- типовые объекты: люди, дома, деревья, транспорт, животные, природа, улица ----------
  // цвет любого объекта: '#rrggbb' или имя из NC; из него строится своя тройка тонов (тень/основа/свет) в языке спрайтов
  const NC = { red: '#e8384e', pink: '#ff7aa8', rose: '#ff9ab8', orange: '#ff8f2e', yellow: '#ffd23a', gold: '#ffcc45', green: '#4ec47a', dkgreen: '#2f8a4e',
    blue: '#3b6dd8', navy: '#2a3a8a', sky: '#6cc4ff', cyan: '#62e6ff', violet: '#8d5cff', purple: '#9a3aa8', white: '#f4f2ff', gray: '#9a96b8', grey: '#9a96b8',
    dkgray: '#5c5878', black: '#2a2640', brown: '#8a5530', ginger: '#e07a2a', beige: '#ecdfb8', cream: '#fff0c8', silver: '#c8c8dc', blond: '#f0cf6a', skin: '#f2c29a', tan: '#c88a5a', dark: '#7a4a2a' };
  const colr = (c, d) => { c = typeof c === 'string' && c ? c : d; if (!c || typeof c !== 'string') return c; if (NC[c]) return NC[c]; return c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c; };
  const mix = (a, b, k) => { const p = hex(a), q = hex(b); return '#' + [0, 1, 2].map((j) => ri(p[j] + (q[j] - p[j]) * k).toString(16).padStart(2, '0')).join(''); };
  const MT = new Map();
  function mat(col) { col = colr(col); let i = MT.get(col); if (i == null) { RAMP.push([mix(col, '#120d26', 0.4), col, mix(col, '#fff6dc', 0.42)]); i = RAMP.length - 1; MT.set(col, i); } return i; }
  const tone = (col, k) => (k < 0 ? mix(colr(col), '#120d26', -k) : mix(colr(col), '#fff6dc', k));
  function gline(g, x0, y0, x1, y1, m, s = 0, wd = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) grect(g, ri(lerp(x0, x1, i / n)), ri(lerp(y0, y1, i / n)), wd, wd, m, s); }
  function gdisc(g, cx, cy, r, m, s = 0) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.8) gset(g, cx + i, cy + j, m, s); }
  function gscale(g, k) { if (k <= 1) return g; const o = grid(g.w * k, g.h * k); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const i = ((y / k) | 0) * g.w + ((x / k) | 0); o.m[y * o.w + x] = g.m[i]; o.s[y * o.w + x] = g.s[i]; } return o; }
  const sbake = (key, sc, dir, fn) => cached(key + '|' + sc + '|' + dir, () => { let g = fn(); if (sc > 1) g = gscale(g, sc); if (dir < 0) g = gflip(g); return bake(g); });
  function sput(c, cv, x, y, dy = 0) { const l = ri(x) - (cv.width >> 1), t = ri(y) - cv.height + 1 + dy; spr(c, cv, l, t); return { l, t, w: cv.width, h: cv.height }; }
  const gpt = (b, gw, gx, gy, sc, dir) => { let X = gx * sc + (sc >> 1); if (dir < 0) X = gw * sc - 1 - X; return [b.l + 1 + X, b.t + 1 + gy * sc + (sc >> 1)]; };

  // человек: x — центр, y — земля. age adult|kid|old; pose stand walk run wave cheer dance shout hold read sit
  const AGES = { adult: [8, 8, 8, 10, 9, 8], kid: [7, 7, 6, 7, 6, 6], old: [8, 8, 8, 10, 8, 8] }; // голова w h, торс w h, ноги, рука
  const PN = { stand: 1, walk: 4, run: 4, wave: 2, cheer: 2, dance: 4, shout: 2, hold: 1, read: 1, sit: 1 };
  const PF = { walk: 7, run: 11, wave: 4, cheer: 5, dance: 5, shout: 5 };
  function personGrid(q, pose, f) {
    const [hw, hh, tw, th, lh, al] = AGES[q.age], W = 26, cx = 13, top = 3, H = top + hh + th + lh, g = grid(W, H), kid = q.age === 'kid';
    const sk = mat(q.skin), hr = mat(q.hair), sh = mat(q.shirt), pa = mat(q.pants), so = mat(q.shoes), K = 16, ty = top + hh, ly = ty + th, x0 = cx - (tw >> 1), x1 = x0 + tw, hx = cx - (hw >> 1), lw = kid ? 2 : 3;
    const sit = pose === 'sit';
    const leg = (x, lift, len = lh) => { grect(g, x, ly, lw, len - lift - 2, pa); grect(g, x, ly + len - lift - 2, lw, 2, so); };
    let lL = 0, lR = 0, dL = 0, dR = 0;
    if (pose === 'walk') [[dL, dR, lL, lR]] = [[[-1, 1, 0, 0], [0, 0, 2, 0], [1, -1, 0, 0], [0, 0, 0, 2]][f]];
    if (pose === 'run') [[dL, dR, lL, lR]] = [[[-2, 2, 0, 1], [0, 0, 3, 0], [2, -2, 1, 0], [0, 0, 0, 3]][f]];
    if (pose === 'dance') [[dL, dR, lL, lR]] = [[[0, 0, 0, 0], [-2, 0, 3, 0], [0, 0, 0, 0], [0, 2, 0, 3]][f]];
    if (sit) { const k = lh >> 1; grect(g, x0 - 1, ly, tw + 2, 3, pa); leg(cx - lw, 0, lh - k + 2); leg(cx + 1, 0, lh - k + 2); }
    else { leg(cx - lw + dL, lL); leg(cx + 1 + dR, lR); }
    if (q.dress) for (let j = 0; j < (lh >> 1) + 1; j++) grect(g, x0 - (j >> 1), ly + j, tw + 2 * (j >> 1), 1, sh);
    grect(g, x0, ty, tw, th, sh); grect(g, x0 + 1, ty, tw - 2, 1, sh, 3);
    if (q.apron) { const am = mat(q.apron); grect(g, x0 + 1, ty + 3, tw - 2, th - 3 + (sit ? 0 : 3), am); grect(g, x0 + 1, ty, 1, 3, am, 1); grect(g, x1 - 2, ty, 1, 3, am, 1); }
    if (q.bag) { const bm = mat(q.bag); grect(g, x1, ty + 1, 3, th - 2, bm); grect(g, x0 + 1, ty, 1, 4, bm, 1); grect(g, x1 - 2, ty, 1, 4, bm, 1); }
    let hand = [x1 + 1, ty + al - 1];
    const arm = (side, k) => {
      const xa = side < 0 ? x0 - 2 : x1, out = side < 0 ? -1 : 1;
      if (k === 'down') { grect(g, xa, ty + 1, 2, al - 2, sh); grect(g, xa, ty + al - 1, 2, 2, sk); return [xa + 1, ty + al]; }
      if (k === 'up') { const xu = xa + out; grect(g, xu, ty + 3 - al, 2, al - 1, sh); grect(g, xu, ty + 1 - al, 2, 2, sk); return [xu + 1, ty + 1 - al]; }
      if (k === 'out') { const xs = side < 0 ? x0 - al : x1; grect(g, xs, ty + 1, al, 2, sh); grect(g, side < 0 ? xs : xs + al - 2, ty + 1, 2, 2, sk); return [side < 0 ? xs : xs + al - 1, ty + 2]; }
      if (k === 'diag') { let X = xa, Y = ty + 1; for (let i = 0; i < al - 3; i++) { grect(g, X, Y, 2, 2, sh); X += out; Y -= 1; } grect(g, X, Y - 1, 2, 2, sk); return [X + 1, Y - 1]; }
      if (k === 'hold') { grect(g, xa, ty + 1, 2, (th >> 1) + 1, sh); grect(g, side < 0 ? xa + 1 : xa - 1, ty + (th >> 1) + 1, 2, 2, sk); return [side < 0 ? xa + 2 : xa, ty + (th >> 1) + 2]; }
      if (k === 'mouth') { grect(g, xa, ty - 2, 2, 4, sh); grect(g, xa - 1, ty - 3, 2, 2, sk); return [xa, ty - 3]; }
      return hand;
    };
    const A = { stand: ['down', 'down'], walk: f % 2 ? ['down', 'down'] : ['down', 'down'], run: ['out', 'diag'], wave: ['down', f ? 'diag' : 'up'], cheer: f ? ['diag', 'diag'] : ['up', 'up'],
      dance: [['up', 'diag'], ['out', 'out'], ['diag', 'up'], ['up', 'up']][f], shout: [f ? 'diag' : 'out', 'mouth'], hold: ['down', 'hold'], read: ['hold', 'hold'], sit: ['down', 'down'] }[pose];
    if (pose === 'run' && f >= 2) A.reverse();
    arm(-1, A[0]); hand = arm(1, A[1]);
    if (pose === 'read') hand = [cx, ty + (th >> 1) + 2];
    grect(g, hx, top, hw, hh, sk); [[hx, top], [hx + hw - 1, top], [hx, top + hh - 1], [hx + hw - 1, top + hh - 1]].forEach(([a, b]) => gset(g, a, b, 0));
    const st = q.style;
    if (st === 'long') { grect(g, hx - 1, top + 1, 1, hh + 3, hr); grect(g, hx + hw, top + 1, 1, hh + 3, hr); }
    if (st !== 'none') { grect(g, hx, top, hw, 2, hr); gset(g, hx, top + 2, hr); gset(g, hx + hw - 1, top + 2, hr); gset(g, hx + 1, top - 1 + 0, 0); }
    if (st === 'bun') grect(g, cx - 2, top - 2, 4, 2, hr);
    if (st === 'curly') { grect(g, hx - 1, top - 1, hw + 2, 3, hr); gset(g, hx - 1, top + 3, hr); gset(g, hx + hw, top + 3, hr); }
    const ey = top + (hh >> 1);
    if (q.glasses) grect(g, hx + 1, ey, hw - 2, 1, mat('#c8c8dc'), 2);
    gset(g, hx + 2, ey, K, 2); gset(g, hx + hw - 3, ey, K, 2);
    if (kid) { gset(g, hx + 1, ey + 1, mat('#ff9ab8'), 2); gset(g, hx + hw - 2, ey + 1, mat('#ff9ab8'), 2); }
    if (pose === 'shout' || q.mouth === 'o') grect(g, cx - 1, top + hh - 3, 2, 2, mat('#7a1a2a'), 2); else grect(g, cx - 1, top + hh - 2, 2, 1, sk, 1);
    const hm = mat(q.hatCol);
    if (q.hat === 'helmet') { grect(g, hx - 1, top - 1, hw + 2, 3, hm); grect(g, hx - 2, top + 2, hw + 4, 1, hm, 1); }
    else if (q.hat === 'cap') { grect(g, hx, top - 1, hw, 3, hm); grect(g, cx, top + 1, (hw >> 1) + 3, 1, hm, 1); }
    else if (q.hat === 'scarf') { grect(g, hx - 1, top - 1, hw + 2, 3, hm); grect(g, hx - 1, top + 2, 1, hh - 2, hm); grect(g, hx + hw, top + 2, 1, hh - 2, hm); grect(g, cx - 1, top + hh, 2, 2, hm, 1); }
    else if (q.hat === 'beanie') { grect(g, hx - 1, top - 2, hw + 2, 4, hm); gset(g, cx, top - 3, hm, 3); }
    g.hand = hand; g.cx = cx; return g;
  }
  function person(c, x, y, o = {}) {
    const pose = PN[o.pose] ? o.pose : 'stand', n = PN[pose], t = o.t || 0, f = n > 1 ? fr(t + (o.ph || 0), o.fps || PF[pose] || 6, n) : 0, dir = o.dir === -1 ? -1 : 1, sc = o.sc || 1, age = AGES[o.age] ? o.age : 'adult';
    const q = { age, skin: colr(o.skin, 'skin'), hair: colr(o.hair, age === 'old' ? '#e2deec' : '#5a3420'), shirt: colr(o.shirt, 'blue'), pants: colr(o.pants, '#3f3c6e'), shoes: colr(o.shoes, '#3c2217'),
      hat: o.hat || '', hatCol: colr(o.hatCol, o.hat === 'scarf' ? 'red' : 'yellow'), style: o.style || (age === 'old' ? 'bun' : 'short'), bag: o.bag ? colr(o.bag, 'red') : '', apron: o.apron ? colr(o.apron, 'white') : '',
      dress: !!o.dress, glasses: o.glasses ?? age === 'old', mouth: o.mouth || '' };
    const key = 'pp' + q.age + q.skin + q.hair + q.shirt + q.pants + q.shoes + q.hat + q.hatCol + q.style + q.bag + q.apron + q.dress + q.glasses + q.mouth + pose + f;
    let gref = null; const cv = sbake(key, sc, dir, () => (gref = personGrid(q, pose, f)));
    const meta = cached('pm' + key, () => gref || personGrid(q, pose, f));
    const bob = (pose === 'run' || pose === 'dance' || pose === 'cheer') && f % 2 ? -1 : 0, k = pose === 'sit' ? (AGES[age][4] >> 1) - 2 : 0;
    if (o.shadow !== false && !k) ddisc(c, x, y + 1, 5 * sc, 1, P.ink, 7);
    const b = sput(c, cv, x, y, (bob + k) * sc), h = gpt(b, 26, meta.hand[0], meta.hand[1], sc, dir);
    const it = o.item || (pose === 'read' ? 'book' : ''); if (it) icon(c, it, h[0], h[1] - 2, { sc: o.isc || sc, flip: dir < 0 });
    return { x: ri(x), y: b.t + 3 * sc, top: b.t + 1 + 3 * sc, hx: h[0], hy: h[1] };
  }
  // толпа: n разных людей в ряд от x0 до x1; poses — список поз по очереди; each(i) — свои параметры i-го
  function crowd(c, x0, x1, y, t, o = {}) {
    const n = o.n || 5, r = rnd(o.seed || 5), SH = ['red', 'blue', 'green', 'yellow', 'violet', 'orange', 'pink', 'sky', 'cream'], HR = ['#5a3420', '#2a2640', '#f0cf6a', '#a8401e', '#3c2217', '#e2deec'], PA = ['#3f3c6e', '#2a3a8a', '#5c5878', '#6a3e28'];
    const poses = o.poses || [o.pose || 'stand'], res = [];
    for (let i = 0; i < n; i++) {
      const a = r(), b = r(), d = r(), e = r(), ph = r(), dr = r(), age = o.ages ? o.ages[i % o.ages.length] : a < 0.22 ? 'kid' : a > 0.88 ? 'old' : 'adult';
      const p = Object.assign({ age, pose: poses[i % poses.length], t, ph: ph * 2, shirt: SH[(b * SH.length) | 0], hair: age === 'old' ? '' : HR[(d * 5) | 0], pants: PA[(e * 4) | 0], dress: age !== 'kid' && e > 0.6, style: e > 0.6 ? 'long' : '', dir: o.dir || (dr < 0.5 ? 1 : -1) }, o.each ? o.each(i) : {});
      res.push(person(c, n > 1 ? lerp(x0, x1, i / (n - 1)) : (x0 + x1) / 2, y, p));
    }
    return res;
  }

  // окна, которые горят/гаснут: lit 0…1 — доля горящих (порядок по seed), каждое окно со своей задержкой
  function wins(c, b, L, o) {
    const lit = o.lit ?? 0, seed = o.seed || 1, fc = colr(o.light, P.f1);
    for (let i = 0; i < L.length; i++) { const w = L[i]; if (hash(i * 7.31 + seed) < lit) { const X = b.l + 1 + w[0], Y = b.t + 1 + w[1]; rect(c, X, Y, w[2], w[3], fc); rect(c, X, Y, w[2], 1, P.f0); if (w[2] > 4) rect(c, X + (w[2] >> 1), Y, 1, w[3], w[4]); } }
  }
  function winG(g, X, Y, w, h, gl, fr_, list, fcol) { grect(g, X - 1, Y - 1, w + 2, h + 2, fr_); grect(g, X, Y, w, h, gl); if (w > 4) grect(g, X + (w >> 1), Y, 1, h, fr_); grect(g, X, Y, 1, 1, gl, 3); list.push([X, Y, w, h, fcol]); }
  // дом: x — центр, y — земля; wall roof door glass; lit 0…1
  function house(c, x, y, o = {}) {
    const w = o.w || 30, h = o.h || 20, wall = colr(o.wall, 'beige'), roof = colr(o.roof, 'red'), gls = colr(o.glass, '#3f3c6e'), door = colr(o.door, 'brown');
    const S_ = cached('hs' + w + h + wall + roof + gls + door, () => {
      const rh = ri(w * 0.38), g = grid(w + 4, h + rh), wm = mat(wall), rm = mat(roof), fm = mat(tone(wall, 0.5)), L = [];
      grect(g, w - 6, 1, 3, rh, mat('#a8302e'));
      for (let j = 0; j < rh; j++) { const hw = ri(((w + 4) / 2) * (j + 1) / rh); grect(g, ri((w + 4) / 2) - hw, j, hw * 2, 1, rm, j === rh - 1 ? 1 : 0); }
      grect(g, 2, rh, w, h, wm); const dx = 2 + ri(w * 0.66); grect(g, dx, rh + h - 11, 6, 11, mat(door)); gset(g, dx + 4, rh + h - 6, 5, 3);
      for (let X = 5; X + 7 <= dx - 1; X += 10) winG(g, X, rh + 5, 7, 6, mat(gls), fm, L, tone(wall, 0.5));
      if (h >= 26) winG(g, dx - 1, rh + 3, 7, 5, mat(gls), fm, L, tone(wall, 0.5));
      return { cv: bake(g), L };
    });
    const b = sput(c, S_.cv, x, y); wins(c, b, S_.L, o); return { l: b.l, t: b.t, w: b.w, h: b.h };
  }
  // многоэтажка: fl этажей, cols окон в ряд; build 0…1 — стройка (виден низ, сверху каркас); вернёт верх построенного
  function tower(c, x, y, o = {}) {
    const fl = o.fl || 5, cols = o.cols || 3, wall = colr(o.wall, '#c8c4dc'), gls = colr(o.glass, '#3f3c6e'), fh = 11, w = cols * 9 + 5, h = fl * fh + 4;
    const S_ = cached('tw' + fl + cols + wall + gls, () => {
      const g = grid(w, h), wm = mat(wall), fm = mat(tone(wall, 0.45)), L = [];
      grect(g, 0, 4, w, h - 4, wm); grect(g, 0, 2, w, 2, mat(tone(wall, -0.25))); for (let i = 0; i < w; i += 4) grect(g, i, 0, 2, 2, mat(tone(wall, -0.25)));
      for (let j = 0; j < fl; j++) { grect(g, 0, 4 + j * fh, w, 1, wm, 1); for (let i = 0; i < cols; i++) { const X = 4 + i * 9, Y = 7 + j * fh; if (j === fl - 1 && i === (cols >> 1)) continue; winG(g, X, Y, 5, 6, mat(gls), fm, L, tone(wall, 0.45)); } }
      const dx = 4 + (cols >> 1) * 9; grect(g, dx - 1, h - 9, 7, 9, mat('#6a3e28')); grect(g, dx - 2, h - 10, 9, 1, mat(tone(wall, -0.3)));
      return { cv: bake(g), L };
    });
    const bd = cl(o.build ?? 1), shown = ri((h + 2) * bd), l = ri(x) - (S_.cv.width >> 1), t = ri(y) - S_.cv.height + 1, b = { l, t };
    if (bd >= 1) { spr(c, S_.cv, l, t); wins(c, b, S_.L, o); }
    else {
      clip(c, [[l, t + S_.cv.height - shown, S_.cv.width, shown]], () => { spr(c, S_.cv, l, t); wins(c, b, S_.L, o); });
      const top = t + S_.cv.height - shown; for (let i = 0; i < 2; i++) { const Y = top - (i + 1) * fh; if (Y < t) break; rect(c, l, Y, S_.cv.width, 1, P.st1); for (let X = l; X < l + S_.cv.width; X += 9) rect(c, X, Y, 1, fh, P.st1); line(c, l, Y + fh, l + 9, Y, P.st2); }
    }
    return { l, t, w: S_.cv.width, h: S_.cv.height, top: bd >= 1 ? t : t + S_.cv.height - shown };
  }
  function signPlate(c, cx, y, str, o = {}) { if (!str) return; const s = o.s || 1, w = tw(str, s) + 8, h = 9 * s + 5; rect(c, cx - (w >> 1) - 1, y - 1, w + 2, h + 2, P.ink); rect(c, cx - (w >> 1), y, w, h, colr(o.bg, P.ui)); rect(c, cx - (w >> 1), y, w, 1, tone(colr(o.bg, P.ui), 0.3)); text(c, str, cx, y + 3, { s, col: o.col || 'y', al: 'c' }); }
  // магазин/кафе: awning полосы aw/aw2, sign — вывеска (текст только из параметра), tables — столик у входа (кафе)
  function shop(c, x, y, o = {}) {
    const w = o.w || 46, h = o.h || 38, wall = colr(o.wall, 'cream'), aw = colr(o.aw, 'red'), aw2 = colr(o.aw2, 'white'), gls = colr(o.glass, '#5c92ec');
    const S_ = cached('sh' + w + h + wall + aw + aw2 + gls, () => {
      const g = grid(w, h), wm = mat(wall), fm = mat(tone(wall, -0.3)), am = mat(aw), am2 = mat(aw2), L = [];
      grect(g, 0, 0, w, h, wm); grect(g, 0, 0, w, 2, fm);
      const dx = (w >> 1) - 3; grect(g, dx, h - 14, 7, 14, mat('#6a3e28')); grect(g, dx + 1, h - 13, 5, 5, mat(gls)); gset(g, dx + 5, h - 6, 5, 3);
      winG(g, 3, h - 13, dx - 6, 10, mat(gls), fm, L, tone(wall, -0.3)); winG(g, dx + 10, h - 13, w - dx - 13, 10, mat(gls), fm, L, tone(wall, -0.3));
      const ay = h - 20; for (let X = 0; X < w; X++) { const m = ((X / 4) | 0) % 2 ? am2 : am; grect(g, X, ay, 1, 4, m); if (X % 4 !== 3) gset(g, X, ay + 4, m, 1); }
      return { cv: bake(g), L, ay };
    });
    const b = sput(c, S_.cv, x, y); wins(c, b, S_.L, o); signPlate(c, x, b.t + 3, o.sign, o);
    if (o.tables) table(c, x + (w >> 1) + 9, y, { umbrella: aw });
    return { l: b.l, t: b.t, w: b.w, h: b.h };
  }
  const cafe = (c, x, y, o = {}) => shop(c, x, y, Object.assign({ aw: 'blue', aw2: 'white', tables: true }, o));
  // школа: fl этажей, портик с колоннами, вывеска sign
  function school(c, x, y, o = {}) {
    const w = o.w || 70, fl = o.fl || 2, wall = colr(o.wall, '#e8b878'), roof = colr(o.roof, '#a8302e'), gls = colr(o.glass, '#5c92ec'), h = fl * 13 + 6;
    const S_ = cached('sc' + w + fl + wall + roof + gls, () => {
      const g = grid(w, h + 10), wm = mat(wall), fm = mat('#f4f2ff'), L = [], cx = w >> 1;
      for (let j = 0; j < 10; j++) { const hw = ri(13 * (j + 1) / 10); grect(g, cx - hw, j, hw * 2, 1, mat(roof)); }
      grect(g, 0, 10, w, h, wm); grect(g, 0, 10, w, 3, mat(roof));
      for (let j = 0; j < fl; j++) for (let X = 4; X + 6 < w - 2; X += 9) { if (Math.abs(X + 3 - cx) < 11) continue; winG(g, X, 16 + j * 13, 6, 7, mat(gls), fm, L, '#f4f2ff'); }
      grect(g, cx - 10, 10, 20, h, mat(tone(wall, 0.25))); for (const X of [cx - 9, cx - 4, cx + 3, cx + 8]) grect(g, X, 16, 2, h - 6, fm);
      grect(g, cx - 3, h, 7, 10, mat('#6a3e28')); grect(g, cx - 12, h + 8, 24, 2, mat('#9a96b8'));
      return { cv: bake(g), L };
    });
    const b = sput(c, S_.cv, x, y); wins(c, b, S_.L, o); signPlate(c, x, b.t + 12, o.sign, o); return { l: b.l, t: b.t, w: b.w, h: b.h };
  }
  // прилавок рынка: goods — имена значков на прилавке; mid(c) — нарисовать продавца между навесом и прилавком
  function stall(c, x, y, o = {}) {
    const w = o.w || 44, aw = colr(o.aw, 'red'), aw2 = colr(o.aw2, 'white'), wood = colr(o.col, 'brown');
    const back = cached('stb' + w + aw + aw2, () => { const g = grid(w, 34), am = mat(aw), am2 = mat(aw2), pm = mat('#6a3e28'); grect(g, 1, 6, 2, 28, pm); grect(g, w - 3, 6, 2, 28, pm); for (let X = 0; X < w; X++) { const m = ((X / 4) | 0) % 2 ? am2 : am; grect(g, X, 0, 1, 6, m); if (X % 4 !== 3) gset(g, X, 6, m, 1); } return bake(g); });
    const front = cached('stf' + w + wood, () => { const g = grid(w, 13), wm = mat(wood); grect(g, 0, 0, w, 13, wm); grect(g, 0, 0, w, 2, mat(tone(wood, 0.35))); for (let X = 6; X < w; X += 8) grect(g, X, 3, 1, 10, wm, 1); return bake(g); });
    const b = sput(c, back, x, y); if (o.mid) o.mid(c); sput(c, front, x, y);
    const gs = o.goods || []; gs.forEach((n, i) => icon(c, n, ri(x - w / 2 + (w * (i + 0.5)) / gs.length), y - 15, { sc: o.gsc || 1 }));
    return { l: b.l, t: b.t, w: b.w, top: y - 13 };
  }
  function table(c, x, y, o = {}) { const cv = cached('tb' + (o.umbrella || '') + (o.col || ''), () => { const g = grid(18, o.umbrella ? 30 : 12), tm = mat(colr(o.col, 'white')), H = g.h; grect(g, 2, H - 10, 14, 2, tm); grect(g, 8, H - 8, 2, 8, mat('#5c5878')); grect(g, 5, H - 1, 8, 1, mat('#5c5878')); if (o.umbrella) { const um = mat(colr(o.umbrella)); grect(g, 8, 4, 1, H - 14, mat('#9a96b8')); for (let j = 0; j < 5; j++) grect(g, 8 - 2 - j * 2, j, 5 + j * 4, 1, um, j === 4 ? 1 : 0); } return bake(g); }); sput(c, cv, x, y); if (o.item) icon(c, o.item, x, y - 12); }
  function bench(c, x, y, o = {}) { const w = o.w || 24, cv = cached('bn' + w + (o.col || ''), () => { const g = grid(w, 10), m = mat(colr(o.col, 'brown')), k = mat('#3d3a55'); grect(g, 0, 0, w, 2, m); grect(g, 0, 4, w, 2, m); grect(g, 2, 6, 2, 4, k); grect(g, w - 4, 6, 2, 4, k); return bake(g); }); sput(c, cv, x, y); }
  function shelf(c, x, y, w, h, o = {}) { const cv = cached('sf' + w + h + (o.seed || 1), () => { const g = grid(w, h), r = rnd(o.seed || 1), BK = ['red', 'blue', 'green', 'yellow', 'violet', 'orange', 'cream', 'sky'].map(mat); grect(g, 0, 0, w, h, mat('#6a3e28')); for (let Y = 2; Y + 12 <= h; Y += 13) { let X = 2; while (X < w - 3) { const bw = 2 + ((r() * 3) | 0), bh = 7 + ((r() * 4) | 0); grect(g, X, Y + 11 - bh, Math.min(bw, w - 2 - X), bh, BK[(r() * BK.length) | 0]); X += bw; } grect(g, 0, Y + 11, w, 2, mat('#8a5530'), 3); } return bake(g); }); spr(c, cv, ri(x), ri(y)); }

  // деревья: kind leaf (лиственное) | oak (дуб, крона шире) | pine (ель) | palm; h, col, trunk; t — покачивание
  function tree(c, x, y, o = {}) {
    const kind = o.kind || 'leaf', h = o.h || (kind === 'pine' ? 36 : kind === 'oak' ? 40 : 32), col = colr(o.col, kind === 'pine' ? '#2f8a4e' : '#4ec47a'), tr = colr(o.trunk, '#6a3e28'), f = o.t != null ? fr(o.t + x * 0.07, 1.4, 2) : 0, sd = o.seed || 1;
    const cv = sbake('tr' + kind + h + col + tr + f + sd, 1, 1, () => {
      const w = kind === 'oak' ? ri(h * 1.05) : kind === 'pine' ? ri(h * 0.62) : kind === 'palm' ? ri(h * 0.9) : ri(h * 0.78), g = grid(w, h), cm = mat(col), tm = mat(tr), r = rnd(sd), cx = w >> 1;
      if (kind === 'pine') { grect(g, cx - 1, h - 5, 3, 5, tm); for (let k = 0; k < 4; k++) { const y0 = ri(k * h * 0.2), th = ri(h * 0.34), sh = k < 2 ? f : 0; for (let j = 0; j < th && y0 + j < h - 4; j++) { const hw = ri(((j + 1) / th) * (w / 2) * (0.5 + 0.17 * k)); grect(g, cx - hw + sh, y0 + j, hw * 2 + 1, 1, cm, j === th - 1 ? 1 : 0); } } }
      else if (kind === 'palm') { gline(g, cx + 3, h - 1, cx, ri(h * 0.25), tm, 0, 2); for (let k = 0; k < 6; k++) { const a = -2.6 + k * 0.85 + f * 0.08; gline(g, cx, ri(h * 0.25), ri(cx + Math.cos(a) * w * 0.48), ri(h * 0.25 + Math.sin(a) * h * 0.12 + Math.abs(Math.cos(a)) * h * 0.18), cm, 0, 2); } }
      else {
        const oak = kind === 'oak', ty = ri(h * (oak ? 0.5 : 0.55)); grect(g, cx - (oak ? 2 : 1), ty, oak ? 5 : 3, h - ty, tm); if (oak) { gline(g, cx, ty + 4, cx - 7, ty - 2, tm); gline(g, cx, ty + 3, cx + 7, ty - 3, tm); grect(g, cx - 4, h - 2, 9, 2, tm); }
        const R = ri(h * (oak ? 0.2 : 0.22)), n = oak ? 8 : 5; for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + r(), d = i === 0 ? 0 : R * 0.9; gdisc(g, ri(cx + Math.cos(a) * d * (oak ? 1.5 : 1.1)) + f, ri(h * (oak ? 0.32 : 0.33) + Math.sin(a) * d * 0.8), R, cm); }
        for (let i = 0; i < w * h * 0.08; i++) { const X = (r() * w) | 0, Y = (r() * h * 0.7) | 0; if (g.m[Y * w + X] === cm) gset(g, X, Y, cm, Y < h * 0.3 && X < cx ? 3 : 1); }
      }
      return g;
    });
    sput(c, cv, x, y);
  }
  function grass(c, x, y, w, o = {}) { const col = colr(o.col, '#4ec47a'), hh = o.h || 4, f = o.t != null ? fr(o.t, 2, 2) : 0, cv = cached('gr' + w + col + hh + f, () => { const g = grid(w, hh + 2), m = mat(col); grect(g, 0, hh, w, 2, m); for (let X = 0; X < w; X += 2) { const bh = 1 + ((hash(X * 3.1) * hh) | 0); grect(g, X + (bh > 2 ? f : 0), hh - bh, 1, bh, m, 3); } return bake(g, { out: null }); }); spr(c, cv, ri(x), ri(y) - hh - 1); }
  function bush(c, x, y, o = {}) { const w = o.w || 16, col = colr(o.col, '#3aa860'); sput(c, sbake('bu' + w + col + (o.flowers || ''), 1, 1, () => { const g = grid(w, ri(w * 0.6)), m = mat(col), r = rnd(w); for (let i = 0; i < 4; i++) gdisc(g, ri(w * (0.25 + 0.5 * i / 3)), ri(g.h * 0.6 - r() * 2), ri(g.h * 0.42), m); if (o.flowers) for (let i = 0; i < w / 3; i++) gset(g, (r() * w) | 0, (r() * g.h * 0.7) | 0, mat(colr(o.flowers)), 2); return g; }), x, y); }
  // падающие листья в прямоугольнике x,y,w,h; cols — цвета; rest — сколько лежит на земле (нижний край)
  function leaves(c, t, x, y, w, h, o = {}) {
    const n = o.n || 12, cols = (o.cols || ['orange', 'red', 'yellow']).map((k) => colr(k)), r = rnd(o.seed || 9);
    for (let i = 0; i < n; i++) { const x0 = r() * w, sp = 0.18 + r() * 0.2, ph = r(), q = (t * sp + ph) % 1, X = x + x0 + Math.sin(t * 2.4 + i) * 4, Y = y + q * h, col = cols[i % cols.length]; rect(c, X, Y, 2, fr(t + i * 0.3, 4, 2) ? 1 : 2, col); px(c, X + 1, Y - 1, tone(col, -0.3)); }
    for (let i = 0; i < (o.rest || 0); i++) { const col = cols[i % cols.length]; rect(c, x + r() * w, y + h - (r() * 2 | 0), 2, 1, col); }
  }

  // транспорт: x — центр, y — земля (низ колёс); col, dir, t, move (колёса крутятся)
  function wheel(g, cx, cy, r, f) { gdisc(g, cx, cy, r, 16); gdisc(g, cx, cy, r - 2, 20, 2); gset(g, cx, cy, 16, 2); const a = f * 0.8; gset(g, ri(cx + Math.cos(a) * (r - 2)), ri(cy + Math.sin(a) * (r - 2)), 16, 2); }
  function car(c, x, y, o = {}) {
    const col = colr(o.col, 'red'), dir = o.dir === -1 ? -1 : 1, f = o.move ? fr(o.t || 0, 10, 4) : 0, sc = o.sc || 1;
    sput(c, sbake('car' + col + f, sc, dir, () => { const g = grid(32, 15), m = mat(col), gl = mat('#a6cdfb'); grect(g, 0, 6, 32, 6, m); gset(g, 0, 6, 0); grect(g, 7, 1, 16, 6, m); grect(g, 9, 2, 6, 4, gl); grect(g, 16, 2, 6, 4, gl); for (let j = 1; j < 6; j++) gset(g, 22 + j, j + 1, j < 5 ? gl : m); grect(g, 22, 1, 1, 6, m); gset(g, 31, 7, mat('#ffe46a'), 2); gset(g, 0, 7, mat('#e8384e'), 2); grect(g, 0, 11, 32, 1, m, 1); wheel(g, 7, 12, 3, f); wheel(g, 24, 12, 3, f); return g; }), x, y);
  }
  function bus(c, x, y, o = {}) {
    const col = colr(o.col, 'blue'), col2 = colr(o.col2, 'white'), dir = o.dir === -1 ? -1 : 1, f = o.move ? fr(o.t || 0, 10, 4) : 0, pax = o.pax ?? 3;
    const cv = sbake('bus' + col + col2 + f + pax, 1, dir, () => {
      const g = grid(66, 30), m = mat(col), m2 = mat(col2), gl = mat('#a6cdfb'), sk = mat('skin'), hr = mat('#5a3420');
      grect(g, 0, 2, 66, 22, m); [[0, 2], [65, 2], [0, 23]].forEach(([a, b]) => gset(g, a, b, 0)); grect(g, 0, 15, 66, 2, m2); grect(g, 0, 21, 66, 3, m, 1);
      for (let i = 0; i < 5; i++) { const X = 4 + i * 9; grect(g, X, 5, 7, 8, gl); if (i < pax) { grect(g, X + 2, 9, 3, 4, sk); grect(g, X + 2, 8, 3, 1, hr); } }
      grect(g, 50, 5, 6, 16, gl); grect(g, 52, 5, 1, 16, m, 1); grect(g, 59, 4, 6, 11, gl); gset(g, 65, 19, mat('#ffe46a'), 2); gset(g, 0, 19, mat('#e8384e'), 2);
      wheel(g, 12, 24, 4, f); wheel(g, 54, 24, 4, f); return g;
    });
    const b = sput(c, cv, x, y);
    if (o.num != null) { const s = String(o.num), wv = tw(s) + 6, X = dir > 0 ? b.l + 1 + 38 : b.l + 1 + 27, Y = b.t + 1 + 14; rect(c, X - (wv >> 1) - 1, Y - 2, wv + 2, 12, P.ink); rect(c, X - (wv >> 1), Y - 1, wv, 10, '#ffe46a'); text(c, s, X, Y, { col: 'k', al: 'c' }); }
    return b;
  }
  // велосипедист: цвета человека (shirt hair pants skin hat hatCol) + col рамы
  function bike(c, x, y, o = {}) {
    const dir = o.dir === -1 ? -1 : 1, f = fr(o.t || 0, o.move === false ? 0.001 : 9, 4), q = [colr(o.col, 'red'), colr(o.shirt, 'green'), colr(o.hair, '#5a3420'), colr(o.pants, '#3f3c6e'), colr(o.skin, 'skin'), o.hat || '', colr(o.hatCol, 'yellow')];
    sput(c, sbake('bk' + q.join() + f, o.sc || 1, dir, () => {
      const g = grid(32, 32), fm = mat(q[0]), sh = mat(q[1]), hr = mat(q[2]), pa = mat(q[3]), sk = mat(q[4]);
      const wl = (cx) => { for (let a = 0; a < 6.28; a += 0.2) gset(g, ri(cx + Math.cos(a) * 5), ri(25 + Math.sin(a) * 5), 16); gset(g, cx, 25, 20); const s = f * 0.8; gline(g, cx, 25, ri(cx + Math.cos(s) * 4), ri(25 + Math.sin(s) * 4), 20); };
      wl(6); wl(25); gline(g, 6, 25, 14, 25, fm); gline(g, 14, 25, 11, 16, fm); gline(g, 11, 17, 22, 17, fm); gline(g, 14, 25, 22, 17, fm); gline(g, 22, 15, 25, 25, fm); grect(g, 20, 13, 4, 1, 20); grect(g, 9, 15, 5, 1, 16);
      const pa_ = f * 1.57, px_ = ri(14 + Math.cos(pa_) * 3), py_ = ri(25 + Math.sin(pa_) * 3), qx = ri(14 - Math.cos(pa_) * 3), qy = ri(25 - Math.sin(pa_) * 3);
      gline(g, 12, 14, ri((12 + qx) / 2 + 3), ri((14 + qy) / 2 - 1), pa, 1, 2); gline(g, ri((12 + qx) / 2 + 3), ri((14 + qy) / 2 - 1), qx, qy, pa, 1, 2);
      gline(g, 12, 14, 15, 6, sh, 0, 3); gline(g, 16, 8, 21, 13, sh, 0, 2); grect(g, 21, 12, 2, 2, sk);
      gline(g, 12, 14, ri((12 + px_) / 2 + 3), ri((14 + py_) / 2 - 1), pa, 0, 2); gline(g, ri((12 + px_) / 2 + 3), ri((14 + py_) / 2 - 1), px_, py_, pa, 0, 2); grect(g, px_ - 1, py_, 3, 1, 16);
      grect(g, 14, 0, 6, 6, sk); grect(g, 14, 0, 6, 2, hr); gset(g, 14, 2, hr); gset(g, 18, 3, 16, 2);
      if (q[5] === 'helmet' || q[5] === 'cap') { grect(g, 13, -1 + 0, 8, 2, mat(q[6])); }
      return g;
    }), x, y);
  }
  // лодка: y — линия воды; crew — список параметров людей на борту; motor — дым мотора; move — бурун за кормой
  function boat(c, x, y, t, o = {}) {
    const col = colr(o.col, 'red'), col2 = colr(o.col2, 'white'), dir = o.dir === -1 ? -1 : 1, len = o.len || 40, bob = ri(Math.sin(t * 2.3 + x * 0.3) * 1), Y = y + bob;
    const cab = o.cabin !== false, cv = sbake('bt' + col + col2 + len + cab, 1, dir, () => { const g = grid(len, 16), m = mat(col), m2 = mat(col2); for (let j = 0; j < 8; j++) grect(g, ri(j * 0.5), 8 + j, len - ri(j * 0.5) - j * 2, 1, m, j === 7 ? 1 : 0); grect(g, 0, 8, len, 2, m2); if (cab) { const cx0 = ri(len * 0.5); grect(g, cx0, 0, ri(len * 0.3), 8, m2); grect(g, cx0 + 2, 2, 4, 3, mat('#5c92ec')); grect(g, cx0 + 7, 2, 4, 3, mat('#5c92ec')); grect(g, cx0 - 1, 0, ri(len * 0.3) + 2, 1, m, 1); } return g; });
    const crew = o.crew || []; crew.forEach((p, i) => person(c, x + (dir > 0 ? -len * 0.32 + i * 9 : len * 0.32 - i * 9), Y + 1, Object.assign({ t, shadow: false, dir }, p)));
    const b = sput(c, cv, x, Y + 2);
    if (o.motor) { const mx = dir > 0 ? b.l - 2 : b.l + b.w + 1; rect(c, mx - 2, Y - 8, 5, 7, P.ink); rect(c, mx - 1, Y - 7, 3, 5, '#5c5878'); smoke(c, mx, Y - 9, t); }
    if (o.move) for (let i = 0; i < 4; i++) { const wx = dir > 0 ? b.l - 4 - i * 6 - ((t * 20) % 6) : b.l + b.w + 4 + i * 6 + ((t * 20) % 6); rect(c, wx, y + 2 + (i % 2), 4 - (i >> 1), 1, '#e8f4ff'); }
    return b;
  }

  // животные: x — центр, y — земля; col; pose stand|walk|run|sit|sleep; dir; t
  function dog(c, x, y, o = {}) {
    const col = colr(o.col, 'ginger'), pose = o.pose || 'stand', dir = o.dir === -1 ? -1 : 1, t = o.t || 0, f = pose === 'walk' || pose === 'run' ? fr(t, pose === 'run' ? 12 : 7, 4) : fr(t, 3, 2), sc = o.sc || 1;
    const b = sput(c, sbake('dg' + col + pose + f, sc, dir, () => {
      const g = grid(24, 16), m = mat(col), be = mat(tone(col, 0.55)), K = 16, ear = mat(tone(col, -0.35));
      if (pose === 'sleep') { grect(g, 3, 9, 13, 7, m); grect(g, 4, 14, 11, 2, be); grect(g, 0, 12, 4, 2, m); grect(g, 0, 11, 2, 1, m, 3); grect(g, 13, 4, 7, 8, m); grect(g, 19, 8, 4, 4, m); gset(g, 22, 8, K, 2); grect(g, 13, 4, 3, 6, ear); grect(g, 17, 7, 2, 1, K, 2); grect(g, 15, 13, 8, 3, be); return g; }
      if (pose === 'sit') { grect(g, 7, 6, 8, 8, m); grect(g, 5, 11, 7, 5, m); grect(g, 13, 10, 2, 6, m); grect(g, 13, 1, 7, 6, m); grect(g, 19, 3, 3, 3, m); gset(g, 21, 3, K, 2); gset(g, 17, 3, K, 2); grect(g, 13, 1, 3, 4, ear); grect(g, 10, 8, 4, 5, be); grect(g, 3, 13 - f, 3, 2, m); return g; }
      const lg = pose === 'stand' ? [0, 0, 0, 0] : [[1, -1, -1, 1], [0, 0, 0, 0], [-1, 1, 1, -1], [0, 0, 0, 0]][f];
      [[5, 0], [8, 1], [14, 2], [17, 3]].forEach(([X, i]) => grect(g, X + lg[i], 11, 2, 5, m, i % 2 ? 0 : 1));
      grect(g, 4, 5, 16, 7, m); grect(g, 6, 10, 12, 2, be); grect(g, 16, 1, 6, 7, m); grect(g, 21, 4, 3, 3, m); gset(g, 23, 4, K, 2); gset(g, 19, 3, K, 2); grect(g, 16, 1, 3, 5, ear); grect(g, 22, 7, 1, 1, mat('#ff7aa8'), 2);
      const tl = [[2, 4], [1, 3], [1, 2]]; tl.forEach(([X, Y]) => gset(g, X + (f % 2 && pose !== 'run' ? 1 : 0), Y, m)); grect(g, 2, 5, 2, 2, m);
      return g;
    }), x, y);
    if (pose === 'sleep' && o.zzz !== false) for (let i = 0; i < 3; i++) { const a = (t * 0.7 + i / 3) % 1, X = ri((dir > 0 ? b.l + b.w - 4 : b.l + 4) + a * 8 * dir), Y = ri(b.t - 2 - a * 14), s = 1 + (i === 2 ? 1 : 0); if (a < 0.9) { rect(c, X, Y, 3 * s, 1, P.uiL); px(c, X + s, Y + 1, P.uiL); rect(c, X, Y + 2, 3 * s, 1, P.uiL); } }
    return b;
  }
  function cat(c, x, y, o = {}) {
    const col = colr(o.col, 'gray'), pose = o.pose || 'sit', dir = o.dir === -1 ? -1 : 1, f = fr(o.t || 0, pose === 'walk' ? 7 : 2, pose === 'walk' ? 4 : 2);
    return sput(c, sbake('ct' + col + pose + f, o.sc || 1, dir, () => {
      const g = grid(18, 14), m = mat(col), K = 16, be = mat(tone(col, 0.5));
      if (pose === 'walk') { const lg = [[1, -1], [0, 0], [-1, 1], [0, 0]][f]; [[3, 0], [6, 1], [10, 1], [13, 0]].forEach(([X, i]) => grect(g, X + lg[i], 10, 1, 4, m)); grect(g, 2, 6, 13, 5, m); grect(g, 12, 2, 6, 5, m); gset(g, 12, 1, m); gset(g, 17, 1, m); gset(g, 16, 4, K, 2); gset(g, 14, 4, K, 2); gline(g, 2, 6, 0, 1, m); return g; }
      grect(g, 5, 6, 7, 8, m); grect(g, 6, 9, 4, 5, be); grect(g, 5, 1, 7, 6, m); gset(g, 5, 0, m); gset(g, 11, 0, m); gset(g, 7, 3, K, 2); gset(g, 10, 3, K, 2); gset(g, 8, 5, mat('#ff7aa8'), 2); gline(g, 12, 13, 15, 11 - f, m); gline(g, 15, 11 - f, 15, 7 - f, m); return g;
    }), x, y);
  }
  // птица (чайка): x,y — центр; fly — машет крыльями
  function bird(c, x, y, t, o = {}) {
    const col = colr(o.col, 'white'), f = o.fly === false ? 2 : fr(t + x * 0.13, o.fps || 5, 2), dir = o.dir === -1 ? -1 : 1, sc = o.sc || 1;
    const cv = sbake('bd' + col + f, sc, dir, () => { const g = grid(11, 6), m = mat(col), wg = mat(tone(col, -0.25)), bk = mat('#ffa82a');
      if (f === 0) { gline(g, 0, 0, 4, 3, wg); gline(g, 10, 0, 6, 3, wg); grect(g, 4, 3, 4, 2, m); gset(g, 8, 3, bk, 2); }
      else if (f === 1) { gline(g, 0, 4, 4, 3, wg); gline(g, 10, 4, 6, 3, wg); grect(g, 4, 2, 4, 2, m); gset(g, 8, 2, bk, 2); }
      else { grect(g, 3, 1, 5, 3, m); grect(g, 2, 2, 4, 2, wg); grect(g, 7, 0, 2, 2, m); gset(g, 9, 1, bk, 2); gset(g, 4, 4, bk); gset(g, 6, 4, bk); }
      return g; });
    spr(c, cv, ri(x) - (cv.width >> 1), ri(y) - (cv.height >> 1));
  }

  // природа: море от y вниз; col; glint [x, col] — дорожка от солнца/луны
  function sea(c, y, t, o = {}) {
    const col = colr(o.col, '#2f6ad0'), h = o.h ?? BH - y, lt = tone(col, 0.45), dk = tone(col, -0.3);
    rect(c, 0, y, BW, h, col); rect(c, 0, y, BW, 1, lt); dith(c, 0, y + ri(h * 0.45), BW, h - ri(h * 0.45), dk, 6);
    for (let j = 0; j * 5 + 3 < h; j++) { const Y = y + 3 + j * 5, sp = (j % 2 ? 1 : -1) * (6 + j), r = rnd(j + 3); for (let i = 0; i < 5; i++) { const X = ((r() * 220 + t * sp) % 220 + 220) % 220 - 20, L = 3 + ((r() * 6) | 0); rect(c, X, Y, L, 1, lt); } }
    if (o.glint) { const [gx, gc] = o.glint; for (let j = 0; j * 3 < Math.min(h, 60); j++) { const w = ri(lerp(10, 3, (j * 3) / 60) + Math.sin(t * 3 + j) * 1.5); if ((j + Math.floor(t * 4)) % 3) rect(c, gx - (w >> 1), y + 1 + j * 3, w, 1, colr(gc)); } }
  }
  // уличные мелочи: фонарь (on 0…1), гирлянда (on — доля зажжённых слева направо), доска с текстом
  function lamp(c, x, y, t, o = {}) {
    const h = o.h || 36, on = o.on ?? 1, col = colr(o.col, '#3d3a55'), lc = colr(o.light, P.f1);
    if (on > 0) glow(c, x + 4, y - h + 4, ri(12 + 3 * on), lc, 0.4 * on);
    rect(c, x - 1, y - h, 3, h, P.ink); rect(c, x, y - h + 1, 1, h - 1, col); rect(c, x - 2, y - 3, 5, 3, P.ink); rect(c, x, y - h - 1, 6, 2, P.ink); rect(c, x + 3, y - h, 4, 4, P.ink); rect(c, x + 4, y - h + 1, 2, 2, on > 0 ? P.f0 : '#5c5878');
  }
  function garland(c, x0, y0, x1, y1, t, o = {}) {
    const sag = o.sag ?? 8, n = o.n || 9, on = o.on ?? 1, cols = (o.cols || ['red', 'yellow', 'green', 'sky', 'pink']).map((k) => colr(k)), P_ = (q) => [lerp(x0, x1, q), lerp(y0, y1, q) + sag * 4 * q * (1 - q)];
    let prev = P_(0); for (let i = 1; i <= 24; i++) { const p = P_(i / 24); line(c, prev[0], prev[1], p[0], p[1], P.ink); prev = p; }
    for (let i = 0; i < n; i++) { const q = (i + 0.5) / n, [X, Y] = P_(q), lit = q < on, cc = cols[i % cols.length]; rect(c, X, Y + 1, 1, 1, P.ink); if (lit) { if (hash(i + Math.floor(t * 3)) > 0.15) glow(c, X, Y + 3, 4, cc, 0.5); rect(c, X - 1, Y + 2, 3, 3, P.ink); rect(c, X, Y + 2, 1, 3, cc); px(c, X, Y + 2, P.f0); } else { rect(c, X - 1, Y + 2, 3, 3, P.ink); px(c, X, Y + 3, '#5c5878'); } }
  }
  // доска/табличка: x,y — левый верх; str — строки через '|'; kind chalk (мел) | wood | plate; stand — ножки до земли gy
  const CHALK = { f1: '#f6f4ec', f2: '#dcd8cc', out: null };
  function board(c, x, y, w, h, str, o = {}) {
    const kind = o.kind || 'chalk', s = o.s || 1, fr_ = kind === 'plate' ? P.ink : '#8a5530', bg = colr(o.bg, kind === 'chalk' ? '#2f5a40' : kind === 'wood' ? '#c88a4a' : '#fff0c8');
    if (o.stand) { const gy = o.stand === true ? GY : o.stand; rect(c, x + 3, y + h, 2, gy - y - h, P.ink); rect(c, x + w - 5, y + h, 2, gy - y - h, P.ink); }
    rect(c, x, y, w, h, P.ink); rect(c, x + 1, y + 1, w - 2, h - 2, fr_); rect(c, x + 3, y + 3, w - 6, h - 6, bg); if (kind === 'chalk') dith(c, x + 3, y + 3, w - 6, h - 6, '#4a7a5a', 2);
    const lines = String(str || '').split('|'), lh = 11 * s, top = y + ri((h - lines.length * lh) / 2) + 1;
    lines.forEach((ln, i) => text(c, ln, x + w / 2, top + i * lh, { s, col: kind === 'chalk' ? CHALK : o.col || 'k', al: 'c', n: o.n != null ? Math.max(0, o.n - lines.slice(0, i).join('').length) : null }));
  }
  // строительный кран: x — центр башни, y — земля; h, arm, col; hook 0…1 — длина троса; at 0…1 — тележка по стреле; load — плита
  function crane(c, x, y, t, o = {}) {
    const h = o.h || 120, arm = o.arm || 70, col = colr(o.col, 'yellow'), dir = o.dir === -1 ? -1 : 1, K = 16;
    const cv = sbake('cr' + h + arm + col, 1, dir, () => { const g = grid(arm + 28, h), m = mat(col), x0 = 22; for (let Y = 12; Y < h; Y++) { gset(g, x0, Y, m); gset(g, x0 + 5, Y, m); } for (let Y = 14; Y < h - 6; Y += 6) { gline(g, x0, Y, x0 + 5, Y + 6, m, 1); gline(g, x0 + 5, Y, x0, Y + 6, m, 1); } grect(g, x0 - 2, h - 3, 10, 3, mat('#5c5878'));
      for (let X = 0; X < arm + 28; X++) { gset(g, X, 6, m); gset(g, X, 10, m); if (X % 6 === 0) gline(g, X, 6, X + 3, 10, m, 1); } grect(g, 2, 4, 10, 9, mat('#5c5878')); grect(g, x0 + 1, 10, 6, 7, m); grect(g, x0 + 3, 12, 3, 3, mat('#a6cdfb')); gline(g, x0 + 2, 0, 0, 6, K); gline(g, x0 + 2, 0, arm + 27, 6, K); grect(g, x0 + 1, 0, 3, 6, m); return g; });
    const W_ = arm + 28, l = dir > 0 ? ri(x) - 25 : ri(x) - (W_ - 25) + 1, b = { l, t: ri(y) - cv.height + 1, w: cv.width }; spr(c, cv, b.l, b.t); const hxw = 27 + ri((arm - 4) * (o.at ?? 0.8)), hx = dir > 0 ? b.l + 1 + hxw : b.l + W_ - hxw, ty = b.t + 1 + 11, hy = ty + ri((h - 20) * cl(o.hook ?? 0.5));
    rect(c, hx - 2, ty - 1, 5, 2, P.ink); rect(c, hx, ty, 1, hy - ty, P.ink); rect(c, hx - 1, hy, 3, 2, P.ink);
    if (o.load) { const lw = o.lw || 22, sw = ri(Math.sin(t * 1.5) * 1); line(c, hx, hy + 2, hx - (lw >> 1) + 2 + sw, hy + 7, P.ink); line(c, hx, hy + 2, hx + (lw >> 1) - 2 + sw, hy + 7, P.ink); rect(c, hx - (lw >> 1) + sw, hy + 7, lw, 5, P.ink); rect(c, hx - (lw >> 1) + 1 + sw, hy + 8, lw - 2, 3, typeof o.load === 'string' && o.load[0] === '#' ? o.load : '#b8b4d8'); rect(c, hx - (lw >> 1) + 1 + sw, hy + 8, lw - 2, 1, '#e0dcf0'); }
    return { hx, hy, top: b.t };
  }
  // земля вместо стены: kind road (дорога с разметкой) | street (тротуар + дорога) | grass | sand | pave (плитка) | floor (деревянный пол) | wall (стена замка)
  function ground(c, y = GY, o = {}) {
    const kind = o.kind || 'street'; if (kind === 'wall') return wall(c, y, o);
    const h = BH - y, col = colr(o.col, ''), cv = cached('gd' + kind + h + col, () => {
      const cv_ = new OffscreenCanvas(96, h + 2), x = cv_.getContext('2d'), r = rnd(11), sp = (n, a, b) => { for (let i = 0; i < n; i++) rect(x, (r() * 96) | 0, a + ((r() * (b - a)) | 0), 1, 1, i % 2 ? '#2c2941' : '#68657f'); };
      const road = (Y) => { rect(x, 0, Y, 96, h - Y + 2, '#3d3a55'); rect(x, 0, Y, 96, 2, '#9a96b8'); rect(x, 0, Y + 2, 96, 1, '#2c2941'); sp(120, Y + 3, h); for (let X = 0; X < 96; X += 24) rect(x, X, Y + 14, 12, 2, '#e8e0b0'); };
      if (kind === 'road') road(0);
      else if (kind === 'street') { rect(x, 0, 0, 96, 9, colr(col, '#b8b4d0')); for (let X = 0; X < 96; X += 8) rect(x, X, 0, 1, 9, '#8a87a6'); rect(x, 0, 0, 96, 1, '#e0dcf0'); rect(x, 0, 9, 96, 2, '#68657f'); road(11); }
      else if (kind === 'grass') { rect(x, 0, 0, 96, h + 2, colr(col, '#3aa860')); rect(x, 0, 0, 96, 1, '#a8f0b0'); for (let i = 0; i < 160; i++) rect(x, (r() * 96) | 0, 1 + ((r() * h) | 0), 1, 1, i % 3 ? '#2f8a4e' : '#68e08a'); for (let Y = 30; Y < h; Y++) dith(x, 0, Y, 96, 1, '#1f5a3a', ri(cl((Y - 30) / 40) * 12)); }
      else if (kind === 'sand') { rect(x, 0, 0, 96, h + 2, colr(col, '#ecd29a')); rect(x, 0, 0, 96, 1, '#fff0c8'); for (let i = 0; i < 160; i++) rect(x, (r() * 96) | 0, 1 + ((r() * h) | 0), 1, 1, i % 2 ? '#c8a868' : '#fff0c8'); }
      else if (kind === 'pave') { rect(x, 0, 0, 96, h + 2, colr(col, '#b8a4c8')); for (let Y = 0; Y < h; Y += 6) { rect(x, 0, Y, 96, 1, '#7a6a90'); for (let X = (Y / 6) % 2 ? 0 : 6; X < 96; X += 12) rect(x, X, Y, 1, 6, '#7a6a90'); } rect(x, 0, 0, 96, 1, '#e8dcf0'); }
      else if (kind === 'floor') { rect(x, 0, 0, 96, h + 2, colr(col, '#a8683a')); for (let Y = 0; Y < h; Y += 5) { rect(x, 0, Y, 96, 1, '#6a3e28'); for (let X = ((Y / 5) * 17) % 32; X < 96; X += 32) rect(x, X, Y, 1, 5, '#6a3e28'); } rect(x, 0, 0, 96, 2, '#5a3420'); }
      for (let Y = 40; Y < h; Y++) dith(x, 0, Y, 96, 1, P.pit, ri(cl((Y - 40) / 50) * 10));
      return cv_;
    });
    const off = ((Math.floor(o.scroll || 0) % 96) + 96) % 96; for (let X = -off; X < BW; X += 96) spr(c, cv, X, y);
  }
  // город-силуэт на горизонте: n домов, col; lit — доля горящих окон
  function skyline(c, y, t, o = {}) {
    const col = colr(o.col, '#2a2150'), n = o.n || 9, r = rnd(o.seed || 4), lit = o.lit ?? 0.5, wc_ = colr(o.light, P.f1);
    let X = -4; for (let i = 0; i < n * 3 && X < BW; i++) { const w = 14 + ((r() * 14) | 0), h = 18 + ((r() * 40) | 0); rect(c, X, y - h, w, h, col); rect(c, X, y - h, w, 1, tone(col, 0.2)); for (let yy = y - h + 4; yy < y - 4; yy += 6) for (let xx = X + 3; xx < X + w - 3; xx += 5) if (hash(xx * 1.7 + yy * 3.1 + (o.seed || 4)) < lit) rect(c, xx, yy, 2, 3, wc_); X += w + 1; }
  }

  // ---------- кадр, камера, склейки ----------
  let K = null, TT = 0; const WB = new OffscreenCanvas(BW, BH), wc = WB.getContext('2d'), MB = new OffscreenCanvas(BW, BH), mc = MB.getContext('2d');
  wc.imageSmoothingEnabled = false; mc.imageSmoothingEnabled = false;
  function begin(t, k) { K = k; TT = t; wc.setTransform(1, 0, 0, 1, 0, 0); wc.globalAlpha = 1; wc.fillStyle = P.pit; wc.fillRect(0, 0, BW, BH); return wc; }
  function cuts(t, list) { let i = 0; while (i < list.length - 1 && t >= list[i + 1]) i++; const t0 = list[i], t1 = i < list.length - 1 ? list[i + 1] : K ? K.duration : t0 + 4; return { i, lt: t - t0, t0, t1, d: t1 - t0, p: cl((t - t0) / (t1 - t0)) }; }
  function shakeOf(t, a) { if (!a) return [0, 0]; const f = Math.floor(t * 30); return [ri((hash(f * 1.31) - 0.5) * 2 * a), ri((hash(f * 2.17 + 4) - 0.5) * 2 * a)]; }
  // вывод мира в кадр: cam {z, fx, fy, dx, dy, shake, mosaic, iris:{x,y,r}, flash 0…1}; возвращает контекст кадра для интерфейса
  function show(cam = {}) {
    const g = K.g; g.imageSmoothingEnabled = false;
    if (cam.iris) { const { x, y, r } = cam.iris; wc.fillStyle = '#000000'; for (let yy = 0; yy < BH; yy++) { const dy = yy - y; if (Math.abs(dy) > r) { wc.fillRect(0, yy, BW, 1); continue; } const dx = Math.floor(Math.sqrt(r * r - dy * dy)); wc.fillRect(0, yy, Math.max(0, x - dx), 1); wc.fillRect(x + dx + 1, yy, BW, 1); } }
    let z = cam.z || 1; const sa = cam.shake || 0; if (sa) z = Math.max(z, 1 + (4 * sa) / BW);
    const fx = cam.fx ?? BW / 2, fy = cam.fy ?? BH / 2, sc = S * z, [sx, sy] = shakeOf(TT, sa);
    let dx = fx * S - fx * sc - (cam.dx || 0) * sc + sx * S, dy = fy * S - fy * sc - (cam.dy || 0) * sc + sy * S;
    dx = Math.min(0, Math.max(W - BW * sc, dx)); dy = Math.min(0, Math.max(H - BH * sc, dy));
    const m = Math.max(1, Math.floor(cam.mosaic || 1));
    if (m > 1) { const mw = Math.ceil(BW / m), mh = Math.ceil(BH / m); mc.drawImage(WB, 0, 0, BW, BH, 0, 0, mw, mh); g.drawImage(MB, 0, 0, mw, mh, ri(dx), ri(dy), ri(mw * m * sc), ri(mh * m * sc)); }
    else g.drawImage(WB, 0, 0, BW, BH, ri(dx), ri(dy), ri(BW * sc), ri(BH * sc));
    if (cam.flash > 0) { g.fillStyle = pat(g, '#ffffff', ri(cl(cam.flash) * 9)); g.fillRect(0, 0, W, H); }
    return g;
  }
  // склейки: kinds[i] — как входим в сцену i: 'cut' (толчок камеры), 'slam' (толчок+тряска), 'flash', 'mosaic' (SNES-мозаика), 'iris'
  function run(t, k, o) {
    const sc = cuts(t, o.cuts), S_ = o.scenes[sc.i] || {}, kind = (o.tr && o.tr[sc.i]) || 'cut', nk = (o.tr && o.tr[sc.i + 1]) || 'cut', lt = sc.lt, tl = sc.t1 - t;
    const w = begin(t, k); if (S_.w) S_.w(w, lt, t, sc);
    const cam = Object.assign({ z: 1, fx: 90, fy: 160 }, S_.cam ? S_.cam(lt, t, sc) : {});
    if (sc.i > 0) {
      if (/cut|slam|flash/.test(kind)) cam.z *= 1 + (kind === 'cut' ? 0.05 : 0.09) * Math.max(0, decay(lt, 1.3, 6));
      if (/slam/.test(kind) && lt < 0.4) cam.shake = Math.max(cam.shake || 0, 2.2 * (1 - lt / 0.4));
      if (/flash/.test(kind) && lt < 0.1) cam.flash = 1 - lt / 0.1;
      if (/mosaic/.test(kind) && lt < 0.2) cam.mosaic = [6, 5, 4, 3, 2, 1][Math.min(5, Math.floor(lt * 30))];
      if (/iris/.test(kind) && lt < 0.45) { const q = eo(lt / 0.45); cam.iris = { x: o.irisAt ? o.irisAt[0] : 90, y: o.irisAt ? o.irisAt[1] : 200, r: ri(lerp(10, 230, q)) }; }
    }
    if (sc.i < o.cuts.length - 1) {
      if (/mosaic/.test(nk) && tl < 0.14) cam.mosaic = [2, 3, 4, 5, 6][Math.min(4, Math.floor((0.14 - tl) * 30))];
      if (/iris/.test(nk) && tl < 0.35) { const q = eio(1 - tl / 0.35); cam.iris = { x: o.irisAt ? o.irisAt[0] : 90, y: o.irisAt ? o.irisAt[1] : 200, r: ri(lerp(230, 10, q)) }; }
    }
    const g = show(cam); if (S_.u) S_.u(g, lt, t, sc); if (o.hud) o.hud(g, t, sc); return sc;
  }

  return {
    BW, BH, S, W, H, GY, SAFE, P, SKY, cl, lerp, pr, eo, ei, eio, eb, spring, decay, hash, rnd, kf, hold, since, fr, blink,
    rect, px, line, disc, ring, dith, ddisc, spr, grid, gset, grect, gart, bake, ART, icon, artCv,
    text, tw, layout, words, title, stamp, popup, banner, panel, bar, button, num, dialog,
    sky, stars, moon, sun, cloud, hills, castle, wall, backdrop,
    flame, smoke, glow, burst, sparkle, twinkles, magic, shock, beam, rays, aura, bolt, rain, fireflies, dust, speed,
    NC, colr, tone, mat, person, crowd, house, tower, shop, cafe, school, stall, table, bench, shelf, tree, grass, bush, leaves,
    car, bus, bike, boat, dog, cat, bird, sea, lamp, garland, board, crane, ground, skyline,
    hero, chest, orb, bubble, clip, block, flag, hourglass, torch, cell, hud,
    begin, show, cuts, run, shakeOf,
  };
})();
