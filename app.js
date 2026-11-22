/* 에이~ 안 죽어 — 일상 사고 모의 실험실 (물리 계산은 lab-sim.js)
   판정은 재미용 추정치이며 의학적 근거가 아닙니다. 결과마다 안전 수칙을 함께 보여 줍니다. */
'use strict';

const L = window.LabSim;
const VCOLOR = { ok: '#2f9e6b', ouch: '#f5a524', hospital: '#f76b15', danger: '#e5484d' };
let last = store.sget('al-last', null);

Router.on('/', root => {
  const wrap = h('<div class="split center"></div>');
  root.append(wrap);
  wrap.append(h(`
    <section class="hero">
      <div class="dummy" id="dummy">🧍</div>
      <h1>"에이~ 안 죽어"<br>진짜일까?</h1>
      <p class="muted">일상에서 "이 정도는 괜찮겠지" 하는 순간들을 실험 인형 <b>안죽이</b>로 대신 실험해 봐요.</p>
    </section>`));
  const list = h('<section class="exps"></section>');
  L.EXPERIMENTS.forEach(e => list.append(h(`<a class="exp card" href="#/lab?id=${e.id}"><span class="ee">${e.emoji}</span><span><b>${esc(e.name)}</b><span class="muted small">${esc(e.desc)}</span></span></a>`)));
  wrap.append(list);
  root.append(h(`<div class="notice" style="margin-top:16px">재미를 위한 2D 물리 시뮬레이션이에요. 수치는 추정치이고 의학적 판단이 아니에요. 실제로 따라 하지 마세요.</div>`));
  /* 첫 화면 데모: 안죽이가 킥보드를 타다 돌부리에 걸려 넘어지는 장면을 반복 (동작 줄이기면 그림 글자만) */
  if (!window.Matter || Motion.reduced) return;
  const cv = h(`<canvas class="demo" width="${L.W}" height="${L.H}" role="img" aria-label="실험 인형 안죽이가 킥보드를 타다 돌부리에 걸려 넘어지는 데모"></canvas>`);
  $('#dummy').replaceWith(cv);
  const c2 = cv.getContext('2d');
  let sim, raf = 0, hold = 0;
  const start = () => { sim = L.create(window.Matter, 'kick', Object.assign(L.defaults('kick'), { speed: 4 })); hold = 0; };
  const tick = () => {
    if (sim.state.t < 2.4) sim.step(); else hold++;
    const ims = sim.state.impacts, lastHit = ims[ims.length - 1], t = sim.state.t;
    const faceKind = lastHit && t - lastHit.t < 0.8 ? 'hospital' : lastHit ? 'ouch' : sim.state.lostBalance ? 'fall' : 'idle';
    drawWorld(c2, sim, { face: faceKind, t: t + hold / 60, impacts: ims, stars: lastHit && t - lastHit.t > 0.5 ? 3 : 0, view: { s: 1.5, x: 410, y: 380 } });
    if (hold > 60) start();
    raf = requestAnimationFrame(tick);
  };
  start(); raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
});

/* ---------- 실험실 ---------- */
/* 앱 전용 효과음(공용 Sfx에 추가): 쿵(부딪힘), 쾅(도장) */
Sfx.SOUNDS.thud = [[140, 0, .16, 'sine', .3, 45], [90, .02, .12, 'triangle', .15, 40]];
Sfx.SOUNDS.stamp = [[220, 0, .05, 'square', .12, 80], [110, .04, .14, 'sine', .25, 50]];

/* 표정: idle(평소) fall(으악) 그리고 판정별 ok(헤헤) ouch(아야) hospital(어질) danger(기절) */
function face(c2, kind, up) {
  c2.fillStyle = '#222'; c2.strokeStyle = '#222'; c2.lineWidth = 1.6; c2.lineCap = 'round';
  const E = up ? [[-4, -4], [4, -4]] : [[2, -3], [7, -3]];
  const m = up ? [0, 3] : [4.5, 3.5];
  const line = (x1, y1, x2, y2) => { c2.beginPath(); c2.moveTo(x1, y1); c2.lineTo(x2, y2); c2.stroke(); };
  if (kind === 'fall') {                                   // 동그란 눈 + 벌린 입
    E.forEach(([x, y]) => { c2.beginPath(); c2.arc(x, y, 2.4, 0, Math.PI * 2); c2.stroke(); c2.beginPath(); c2.arc(x, y, 1, 0, Math.PI * 2); c2.fill(); });
    c2.beginPath(); c2.ellipse(m[0], m[1] + 1, 2.2, 2.8, 0, 0, Math.PI * 2); c2.fill();
  } else if (kind === 'ok') {                              // ^^ 웃는 눈
    E.forEach(([x, y]) => { c2.beginPath(); c2.arc(x, y + 1, 2, Math.PI * 1.1, Math.PI * 1.9); c2.stroke(); });
    c2.beginPath(); c2.arc(m[0], m[1] - 1, 3, 0.2, Math.PI - 0.2); c2.stroke();
  } else if (kind === 'ouch') {                            // > < 질끈
    const [a, b] = E;
    line(a[0] - 2, a[1] - 2, a[0] + 1.5, a[1]); line(a[0] - 2, a[1] + 2, a[0] + 1.5, a[1]);
    line(b[0] + 2, b[1] - 2, b[0] - 1.5, b[1]); line(b[0] + 2, b[1] + 2, b[0] - 1.5, b[1]);
    line(m[0] - 3, m[1] + 1, m[0] - 1, m[1]); line(m[0] - 1, m[1], m[0] + 1, m[1] + 1); line(m[0] + 1, m[1] + 1, m[0] + 3, m[1]);
  } else if (kind === 'hospital' || kind === 'danger') {   // 빙글빙글 / X 눈
    E.forEach(([x, y]) => {
      if (kind === 'danger') { line(x - 2, y - 2, x + 2, y + 2); line(x - 2, y + 2, x + 2, y - 2); }
      else { c2.beginPath(); for (let k = 0; k < 14; k++) { const r = k * 0.19, a2 = k * 0.9; c2.lineTo(x + r * Math.cos(a2), y + r * Math.sin(a2)); } c2.stroke(); }
    });
    c2.beginPath(); c2.ellipse(m[0], m[1] + 1, 2.4, 1.4, 0, 0, Math.PI * 2); c2.stroke();
  } else {
    E.forEach(([x, y]) => { c2.beginPath(); c2.arc(x, y, 1.8, 0, Math.PI * 2); c2.fill(); });
    c2.beginPath(); c2.arc(m[0], m[1] - 0.5, 3, 0.2, Math.PI - 0.2); c2.stroke();
  }
}

/* fx: { face, t, impacts, stars } — 그리기만 하고 물리는 건드리지 않음 */
function drawWorld(c2, sim, fx) {
  const M = window.Matter;
  fx = fx || {};
  c2.save();
  c2.clearRect(0, 0, L.W, L.H);
  const g = c2.createLinearGradient(0, 0, 0, L.H);
  g.addColorStop(0, '#f4f7ff'); g.addColorStop(1, '#e9eef9');
  c2.fillStyle = g; c2.fillRect(0, 0, L.W, L.H);
  if (fx.shake) c2.translate(fx.shake.x, fx.shake.y);
  if (fx.view) { c2.translate(L.W / 2, L.H / 2); c2.scale(fx.view.s, fx.view.s); c2.translate(-fx.view.x, -fx.view.y); }   // 확대(첫 화면 데모)
  // 눈금(1m)
  c2.strokeStyle = 'rgba(80,100,160,.08)'; c2.lineWidth = 1;
  for (let x = 0; x < L.W; x += 100) { c2.beginPath(); c2.moveTo(x, 0); c2.lineTo(x, L.H); c2.stroke(); }
  const up = sim.exp.id === 'phone';                      // 누운 인형은 위를, 나머지는 오른쪽을 봄
  let headDraw = null;
  M.Composite.allBodies(sim.world).forEach(b => {
    const parts = b.parts.length > 1 ? b.parts.slice(1) : [b];
    parts.forEach(part => {
      let fill = (b.render && b.render.fill) || '#999', stroke = null;
      if (part.label === 'torso' || part.label === 'arm') { fill = '#ff8a3d'; stroke = '#d9661c'; }
      if (part.label === 'leg') { fill = '#3d5afe'; stroke = '#2a3fc4'; }
      if (part.label === 'head') { headDraw = { b, part }; return; }   // 머리는 맨 위에 따로
      if (part.label === 'chair') fill = '#8d6e63';
      if (part.label === 'scooter') fill = '#2bb3a3';
      if (part.label === 'stool') fill = '#5b6170';
      if (part.label === 'wheel') { fill = '#333'; stroke = '#777'; }
      c2.fillStyle = fill;
      c2.beginPath();
      part.vertices.forEach((v, k) => (k ? c2.lineTo(v.x, v.y) : c2.moveTo(v.x, v.y)));
      c2.closePath(); c2.fill();
      if (stroke) { c2.strokeStyle = stroke; c2.lineWidth = 1.5; c2.stroke(); }
    });
  });
  // 관절선: 목·어깨·엉덩이 마디와 몸통 솔기
  const J = sim.joints();
  c2.strokeStyle = 'rgba(120,50,0,.45)'; c2.lineWidth = 1.5; c2.setLineDash([3, 3]);
  c2.beginPath(); c2.moveTo(J.neck.x, J.neck.y); c2.lineTo(J.hip.x, J.hip.y); c2.stroke(); c2.setLineDash([]);
  ['shL', 'shR', 'hipL', 'hipR', 'neck'].forEach(k => {
    c2.fillStyle = '#fff3e6'; c2.strokeStyle = '#a0521c'; c2.lineWidth = 1.2;
    c2.beginPath(); c2.arc(J[k].x, J[k].y, 3.2, 0, Math.PI * 2); c2.fill(); c2.stroke();
  });
  if (headDraw) {
    const { b, part } = headDraw, p = part.position;
    c2.save(); c2.translate(p.x, p.y); c2.rotate(b.angle);
    c2.fillStyle = '#ffd9b3'; c2.beginPath(); c2.arc(0, 0, 12, 0, Math.PI * 2); c2.fill();
    c2.strokeStyle = '#c98b5b'; c2.lineWidth = 1.5; c2.stroke();
    if (fx.face === 'ouch' || fx.face === 'hospital' || fx.face === 'danger') {   // 볼 빨개짐
      c2.fillStyle = 'rgba(255,90,90,.35)'; c2.beginPath(); c2.arc(up ? -7 : 1, up ? 1 : 3, 2.6, 0, Math.PI * 2); c2.fill();
    }
    face(c2, fx.face || 'idle', up);
    if (sim.helmet) { c2.fillStyle = '#ffd60a'; c2.beginPath(); c2.arc(0, -2, 14, Math.PI, 0); c2.fill(); c2.strokeStyle = '#c9a400'; c2.stroke(); }
    c2.restore();
    if (fx.stars) {                                        // 머리 위 빙글빙글 별
      const n = fx.stars, t = fx.t || 0;
      c2.font = '14px sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
      for (let k = 0; k < n; k++) {
        const a = t * 4 + k * Math.PI * 2 / n;
        c2.fillText(k % 2 ? '💫' : '⭐', p.x + Math.cos(a) * 20, p.y - 20 + Math.sin(a) * 6);
      }
    }
  }
  // 충돌 효과: 부딪힌 자리에 퍼지는 선 + "쿵!"
  (fx.impacts || []).forEach(im => {
    const age = (fx.t || 0) - im.t;
    if (age < 0 || age > 0.55) return;
    const k = age / 0.55, big = clamp(im.v / 4, 0.4, 1.6);
    c2.save(); c2.translate(im.x, im.y); c2.globalAlpha = 1 - k;
    c2.strokeStyle = im.v >= 2.5 ? '#e5484d' : '#f5a524'; c2.lineWidth = 3;
    for (let r = 0; r < 10; r++) {
      const a = r * Math.PI / 5 + 0.3, r1 = (8 + 18 * k) * big, r2 = (18 + 30 * k) * big;
      c2.beginPath(); c2.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); c2.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); c2.stroke();
    }
    c2.font = `900 ${Math.round(18 + 14 * big)}px Pretendard, sans-serif`; c2.textAlign = 'center';
    c2.fillStyle = '#fff'; c2.strokeStyle = '#222'; c2.lineWidth = 4;
    const word = im.v >= 4 ? '쾅!' : im.v >= 2 ? '쿵!' : '콩!';
    c2.strokeText(word, 0, -34 * big - 8 * k); c2.fillText(word, 0, -34 * big - 8 * k);
    c2.restore();
  });
  if (fx.view) { c2.restore(); c2.save(); }
  if (fx.label) {                                          // 다시보기 표시
    c2.font = '700 18px Pretendard, sans-serif'; c2.textAlign = 'left'; c2.textBaseline = 'middle';
    c2.fillStyle = 'rgba(20,24,40,.72)'; c2.fillRect(12, 12, c2.measureText(fx.label).width + 24, 34);
    c2.fillStyle = '#fff'; c2.fillText(fx.label, 24, 29);
  }
  c2.restore();
}

/* 충격 그래프: 시간에 따른 머리(폰) 속도 + 부딪힌 순간 표시 */
function drawGraph(cv, series, impacts, opt) {
  const c2 = cv.getContext('2d'), W = cv.width, H = cv.height;
  const pad = { l: 42, r: 12, t: 14, b: 26 };
  const T = Math.max(series.length / 60, 0.1), maxV = Math.max(4, Math.ceil(Math.max(...series, 0) + 0.5));
  const X = t => pad.l + (W - pad.l - pad.r) * t / T, Y = v => H - pad.b - (H - pad.t - pad.b) * v / maxV;
  c2.clearRect(0, 0, W, H);
  c2.fillStyle = '#fff'; c2.fillRect(0, 0, W, H);
  c2.font = '12px Pretendard, sans-serif'; c2.fillStyle = '#6b7280'; c2.strokeStyle = '#e5e7eb'; c2.lineWidth = 1;
  c2.textAlign = 'right'; c2.textBaseline = 'middle';
  for (let v = 0; v <= maxV; v += maxV > 8 ? 2 : 1) { c2.beginPath(); c2.moveTo(pad.l, Y(v)); c2.lineTo(W - pad.r, Y(v)); c2.stroke(); c2.fillText(v, pad.l - 6, Y(v)); }
  c2.textAlign = 'center'; c2.textBaseline = 'top';
  for (let t = 0; t <= T + 1e-6; t += 1) c2.fillText(t + '초', X(t), H - pad.b + 6);
  if (opt && opt.cursor != null) { c2.fillStyle = 'rgba(61,90,254,.1)'; c2.fillRect(X(opt.cursor[0]), pad.t, X(opt.cursor[1]) - X(opt.cursor[0]), H - pad.t - pad.b); }
  (impacts || []).forEach(im => {
    c2.strokeStyle = im.v >= 2.5 ? '#e5484d' : '#f5a524'; c2.setLineDash([4, 3]);
    c2.beginPath(); c2.moveTo(X(im.t), pad.t); c2.lineTo(X(im.t), H - pad.b); c2.stroke(); c2.setLineDash([]);
  });
  c2.strokeStyle = '#3d5afe'; c2.lineWidth = 2.2; c2.lineJoin = 'round'; c2.beginPath();
  series.forEach((v, k) => (k ? c2.lineTo(X(k / 60), Y(v)) : c2.moveTo(X(0), Y(v))));
  c2.stroke();
  const top = (impacts || []).reduce((a, b) => (!a || b.v > a.v ? b : a), null);
  if (top) {
    c2.fillStyle = '#e5484d'; c2.beginPath(); c2.arc(X(top.t), Y(Math.min(top.v, maxV)), 4.5, 0, Math.PI * 2); c2.fill();
    c2.font = '700 12px Pretendard, sans-serif'; c2.textAlign = X(top.t) > W * 0.7 ? 'right' : 'left'; c2.textBaseline = 'bottom';
    c2.fillText(`충돌 ${top.v.toFixed(1)} m/s`, X(top.t) + (c2.textAlign === 'right' ? -8 : 8), Y(Math.min(top.v, maxV)) - 4);
  }
  c2.save(); c2.translate(12, (H - pad.b + pad.t) / 2); c2.rotate(-Math.PI / 2); c2.fillStyle = '#6b7280'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.font = '11px Pretendard, sans-serif'; c2.fillText('속도 m/s', 0, 0); c2.restore();
}

function controlHtml(e, p) {
  return e.params.map(q => {
    if (q.type === 'floor') return `<div><label class="field">${q.label}</label><div class="row" data-p="${q.id}">${q.options.map(o => `<button class="chip ${p[q.id] === o ? 'on' : ''}" data-v="${o}">${L.FLOORS[o].name}</button>`).join('')}</div></div>`;
    if (q.type === 'select') return `<div><label class="field">${q.label}</label><div class="row" data-p="${q.id}">${q.options.map(([v, t]) => `<button class="chip ${p[q.id] === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div></div>`;
    if (q.type === 'bool') return `<label class="row small toggle"><input type="checkbox" data-b="${q.id}" ${p[q.id] ? 'checked' : ''}> ${q.label}</label>`;
    return `<div><label class="field" for="r-${q.id}">${q.label} <b data-out="${q.id}">${p[q.id]}${q.unit}</b></label><input type="range" id="r-${q.id}" data-r="${q.id}" min="${q.min}" max="${q.max}" step="${q.step}" value="${p[q.id]}"></div>`;
  }).join('');
}

const DUR = 4.2;                                           // 실험 길이(초)
Router.on('/lab', (root, params) => {
  if (!window.Matter) {                                    // 물리 엔진을 못 불러온 경우
    root.append(h(`<section class="stack center"><div class="dummy">🧍</div><h2>실험 장비를 불러오지 못했어요</h2><p class="muted">새로고침해 보거나, 잠시 뒤 다시 시도해 주세요.</p><a class="btn primary" href="#/">처음으로</a></section>`));
    return;
  }
  const e = L.EXPERIMENTS.find(x => x.id === params.get('id')) || L.EXPERIMENTS[0];
  const p = Object.assign(L.defaults(e.id), store.sget('al-p-' + e.id, {}));
  root.append(h(`
    <section class="stack">
      <div class="row"><span class="ee">${e.emoji}</span><h2 style="margin:0">${esc(e.name)}</h2></div>
      <p class="muted" style="margin:0">${esc(e.desc)}</p>
      <div class="split s73"><div class="stack sticky">
      <div class="stage" id="stage"><canvas id="cv" width="${L.W}" height="${L.H}" role="img" aria-label="${esc(e.name)} 실험 화면"></canvas><div class="stamp hidden" id="stamp" role="status"></div></div>
      <div class="meter card"><div class="row"><b>충격 지수</b><span class="grow"></span><b id="num" aria-live="polite">-</b></div><div class="bar"><i id="mbar" style="width:0%"></i></div><div class="row small muted"><span>안 죽어</span><span class="grow"></span><span>위험</span></div></div>
      <div class="row"><button class="btn primary big grow" id="run">▶ 실험 시작</button><button class="btn big" id="slow" title="느리게 실험" aria-pressed="false">🐢</button></div>
      </div><div class="stack">
      <div class="card stack" id="ctl">${controlHtml(e, p)}</div>
      <div id="after" class="hidden stack">
        <div class="card stack graphcard">
          <div class="row"><b>📈 충격 그래프</b><span class="grow"></span><button class="btn" id="replay" disabled>🎬 느린 다시보기</button></div>
          <canvas id="graph" width="460" height="190" role="img" aria-label="시간에 따른 머리 속도 그래프"></canvas>
          <div class="small muted" id="gnote"></div>
        </div>
        <div class="card safety"><b>🦺 실제로는 이렇게</b><ul>${e.safety.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
        <a class="btn block" href="#/result">결과 카드 보기</a>
      </div>
      </div></div>
      <p class="muted small center">재미용 추정치 · 의학적 근거 아님</p>
    </section>`));
  const cv = $('#cv'), c2 = cv.getContext('2d');
  let sim = null, raf = 0, slow = false, frames = 0, snaps = [], res = null, sounded = 0, replaying = false;
  const saveP = () => store.sset('al-p-' + e.id, p);
  const calm = () => Motion.reduced;
  function fxAt(t, final) {
    const ims = sim.state.impacts.filter(i => i.t <= t);
    const lastHit = ims[ims.length - 1];
    let faceKind = 'idle', stars = 0;
    if (final && res && res.fell) { faceKind = res.verdict.key; stars = { ok: 0, ouch: 2, hospital: 3, danger: 4 }[faceKind]; }
    else if (lastHit && t - lastHit.t < 0.7) faceKind = lastHit.v >= 4 ? 'danger' : lastHit.v >= 2 ? 'hospital' : 'ouch';
    else if (sim.state.lostBalance || (sim.state.series[Math.round(t * 60) - 1] || 0) > 1.2) faceKind = 'fall';
    let shake = null;
    if (!calm() && lastHit && t - lastHit.t < 0.25) { const m = clamp(lastHit.v, 0, 6) * (1 - (t - lastHit.t) / 0.25); shake = { x: Math.sin(t * 90) * m, y: Math.cos(t * 77) * m * 0.6 }; }
    return { face: faceKind, t, impacts: calm() ? [] : sim.state.impacts, stars: calm() ? 0 : stars, shake };
  }
  function reset() {
    cancelAnimationFrame(raf); replaying = false;
    sim = L.create(window.Matter, e.id, p);
    frames = 0; snaps = [sim.snapshot()]; res = null; sounded = 0;
    drawWorld(c2, sim, { face: 'idle' });
    $('#stamp').classList.add('hidden'); $('#stamp').classList.remove('thump');
    $('#num').textContent = '-'; $('#mbar').style.width = '0%';
    $('#replay').disabled = true;
    $('#after').classList.add('hidden');                 // 조건이 바뀌면 지난 결과는 숨김
  }
  function finish() {
    res = sim.result();
    const series = sim.state.series;
    last = { id: e.id, name: e.name, emoji: e.emoji, p: Object.assign({}, p), eff: r1(res.effective), fell: res.fell, v: res.verdict,
      raw: r1(res.raw), factor: Math.round(res.factor * 100) / 100, series: series.filter((_, k) => k % 3 === 0).map(r1), impacts: sim.state.impacts.map(i => ({ t: i.t, v: r1(i.v) })) };
    store.sset('al-last', last);
    const pct = clamp(res.effective / 6 * 100, 2, 100);
    $('#num').textContent = res.effective.toFixed(1) + ' m/s';
    $('#mbar').style.width = pct + '%';
    $('#mbar').style.background = VCOLOR[res.verdict.key];
    drawWorld(c2, sim, fxAt(sim.state.t, true));
    // 그래프·설명
    drawGraph($('#graph'), series, sim.state.impacts);
    $('#gnote').textContent = res.fell
      ? `가장 센 부딪힘 ${res.raw.toFixed(1)} m/s × 보정 ${res.factor.toFixed(2)}(바닥·보호구·손 짚기) = 충격 지수 ${res.effective.toFixed(1)}`
      : '넘어지지 않아서 충격 지수는 0이에요. 조건을 바꿔 다시 해 보세요.';
    $('#replay').disabled = !sim.state.impacts.length;
    $('#after').classList.remove('hidden');
    // 판정 도장: 잠깐 뜸 들였다가 쾅
    const st = $('#stamp');
    st.textContent = res.verdict.title;
    st.style.color = st.style.borderColor = VCOLOR[res.verdict.key];
    setTimeout(() => {
      st.classList.remove('hidden'); st.classList.add('thump');
      if (!calm()) { $('#stage').classList.remove('shake'); void $('#stage').offsetWidth; $('#stage').classList.add('shake'); }
      Sfx.play('stamp'); setTimeout(() => Sfx.play(res.verdict.key === 'ok' ? 'ok' : 'bad'), 180);
      vibrate(res.verdict.key === 'ok' ? 20 : [60, 40, 120]);
    }, calm() ? 0 : 250);
    $('#run').disabled = false; $('#run').textContent = '↻ 다시 실험';
  }
  function loop() {
    const n = slow ? (frames % 3 === 0 ? 1 : 0) : 1;
    for (let k = 0; k < n; k++) {
      sim.step(); snaps.push(sim.snapshot());
      const ims = sim.state.impacts;
      if (ims.length > sounded) { if (ims[sounded].v >= 1.2) Sfx.play('thud'); sounded = ims.length; }
    }
    frames++;
    drawWorld(c2, sim, fxAt(sim.state.t));
    if (sim.state.t < DUR) raf = requestAnimationFrame(loop);
    else finish();
  }
  /* 느린 다시보기: 가장 센 부딪힘 앞뒤를 1/4 속도로 */
  function replay() {
    if (!res || !snaps.length) return;
    cancelAnimationFrame(raf); replaying = true;
    const top = sim.state.impacts.reduce((a, b) => (!a || b.v > a.v ? b : a), null);
    const tc = top ? top.t : (res.impactT || 1);
    const k0 = Math.max(0, Math.round((tc - 0.7) * 60)), k1 = Math.min(snaps.length - 1, Math.round((tc + 0.9) * 60));
    const speed = calm() ? 1 : 0.25;
    let f = k0, acc = 0;
    $('#replay').disabled = true; $('#replay').textContent = '🎬 재생 중…';
    const tick = () => {
      if (!replaying) return;
      sim.restore(snaps[f]);
      const t = f / 60;
      const fx = fxAt(t); fx.label = `🎬 느린 다시보기 ×${speed} · ${t.toFixed(2)}초`;
      drawWorld(c2, sim, fx);
      drawGraph($('#graph'), sim.state.series, sim.state.impacts, { cursor: [k0 / 60, t] });
      acc += speed;
      while (acc >= 1) { f++; acc -= 1; }
      if (f <= k1) raf = requestAnimationFrame(tick);
      else {
        replaying = false;
        sim.restore(snaps[snaps.length - 1]);
        drawWorld(c2, sim, fxAt(sim.state.t, true));
        drawGraph($('#graph'), sim.state.series, sim.state.impacts);
        $('#replay').disabled = false; $('#replay').textContent = '🎬 느린 다시보기';
      }
    };
    raf = requestAnimationFrame(tick);
  }
  $('#run').onclick = () => { reset(); $('#run').disabled = true; $('#run').textContent = '실험 중…'; Sfx.play('whoosh'); raf = requestAnimationFrame(loop); };
  $('#replay').onclick = replay;
  $('#slow').onclick = () => { slow = !slow; $('#slow').classList.toggle('on', slow); $('#slow').setAttribute('aria-pressed', String(slow)); toast(slow ? '느린 화면으로 볼게요' : '보통 속도'); };
  $$('[data-r]').forEach(inp => inp.oninput = () => {
    const q = e.params.find(x => x.id === inp.dataset.r);
    p[q.id] = Number(inp.value); $(`[data-out="${q.id}"]`).textContent = p[q.id] + q.unit; saveP(); reset();
  });
  $$('[data-p]').forEach(row => $$('.chip', row).forEach(b => b.onclick = () => {
    p[row.dataset.p] = b.dataset.v; $$('.chip', row).forEach(x => x.classList.toggle('on', x === b)); saveP(); reset();
  }));
  $$('[data-b]').forEach(cb => cb.onchange = () => { p[cb.dataset.b] = cb.checked; saveP(); reset(); });
  reset();
  window.__lab = { get sim() { return sim; }, get res() { return res; }, get snaps() { return snaps; }, get replaying() { return replaying; } };   // 테스트용
  return () => { cancelAnimationFrame(raf); replaying = false; };
});
const r1 = v => Math.round(v * 10) / 10;

/* ---------- 결과 카드 ---------- */
Router.on('/result', root => {
  if (!last) { Router.go('/'); return; }
  const e = L.EXPERIMENTS.find(x => x.id === last.id);
  root.append(h(`
    <section class="stack">
      <div class="card rcard" id="card">
        <div class="muted small">실험 보고서 · ${esc(last.name)}</div>
        <div class="rem">${last.emoji}</div>
        <div class="rv" style="color:${VCOLOR[last.v.key]}">${esc(last.v.title)}</div>
        <div class="rn">충격 지수 ${last.eff.toFixed(1)} m/s</div>
        <p>${esc(last.v.line)}</p>
        ${last.series ? '<img class="rgraph" id="rgraph" alt="충격 그래프">' : ''}
        <div class="rsafe"><b>그래도 이렇게 하세요</b><br>${esc(e.safety[0])}</div>
        <div class="muted small">에이~ 안 죽어 · 재미용 시뮬레이션</div>
      </div>
      <div class="row"><button class="btn primary grow" id="save">결과 카드 저장</button><button class="btn grow" id="share">공유하기</button></div>
      <a class="btn block" href="#/lab?id=${last.id}">조건 바꿔서 다시</a>
      <a class="btn ghost block" href="#/">다른 실험 고르기</a>
    </section>`));
  if (last.series) {   // 저장된 그래프(3프레임마다 1개)를 다시 그려 이미지로 넣음
    const gc = document.createElement('canvas'); gc.width = 460; gc.height = 170;
    const full = []; last.series.forEach(v => full.push(v, v, v));
    drawGraph(gc, full, last.impacts || []);
    $('#rgraph').src = gc.toDataURL('image/png');
  }
  $('#save').onclick = () => saveImage($('#card'), 'accident-lab.png');
  $('#share').onclick = () => shareText('에이~ 안 죽어', `"${last.name}" 실험 결과: ${last.v.title}. 너도 실험해 봐`, location.href.split('#')[0]);
});

/* ---------- 안전 수칙 ---------- */
Router.on('/safety', root => {
  root.append(h(`<section class="stack"><h1>안전 수칙 모음</h1>${L.EXPERIMENTS.map(e => `<div class="card"><b>${e.emoji} ${esc(e.name)}</b><ul>${e.safety.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`).join('')}
    <div class="notice">머리를 부딪힌 뒤 의식이 흐려지거나, 구토·심한 두통·말이 어눌해지는 증상이 있으면 지체 없이 119에 연락하세요.</div></section>`));
});

Router.start($('#app'));
