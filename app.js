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
      <div class="dummy">🧍</div>
      <h1>"에이~ 안 죽어"<br>진짜일까?</h1>
      <p class="muted">일상에서 "이 정도는 괜찮겠지" 하는 순간들을 실험 인형 <b>안죽이</b>로 대신 실험해 봐요.</p>
    </section>`));
  const list = h('<section class="exps"></section>');
  L.EXPERIMENTS.forEach(e => list.append(h(`<a class="exp card" href="#/lab?id=${e.id}"><span class="ee">${e.emoji}</span><span><b>${esc(e.name)}</b><span class="muted small">${esc(e.desc)}</span></span></a>`)));
  wrap.append(list);
  root.append(h(`<div class="notice" style="margin-top:16px">재미를 위한 2D 물리 시뮬레이션이에요. 수치는 추정치이고 의학적 판단이 아니에요. 실제로 따라 하지 마세요.</div>`));
});

/* ---------- 실험실 ---------- */
function drawWorld(c2, sim) {
  const M = window.Matter;
  c2.clearRect(0, 0, L.W, L.H);
  const g = c2.createLinearGradient(0, 0, 0, L.H);
  g.addColorStop(0, '#f4f7ff'); g.addColorStop(1, '#e9eef9');
  c2.fillStyle = g; c2.fillRect(0, 0, L.W, L.H);
  // 눈금(1m)
  c2.strokeStyle = 'rgba(80,100,160,.08)'; c2.lineWidth = 1;
  for (let x = 0; x < L.W; x += 100) { c2.beginPath(); c2.moveTo(x, 0); c2.lineTo(x, L.H); c2.stroke(); }
  M.Composite.allBodies(sim.world).forEach(b => {
    const parts = b.parts.length > 1 ? b.parts.slice(1) : [b];
    parts.forEach(part => {
      let fill = (b.render && b.render.fill) || '#999';
      if (part.label === 'torso' || part.label === 'arm') fill = '#ff8a3d';
      if (part.label === 'leg') fill = '#3d5afe';
      if (part.label === 'head') fill = '#ffd9b3';
      if (part.label === 'chair') fill = '#8d6e63';
      c2.fillStyle = fill;
      c2.beginPath();
      part.vertices.forEach((v, k) => (k ? c2.lineTo(v.x, v.y) : c2.moveTo(v.x, v.y)));
      c2.closePath(); c2.fill();
      if (part.label === 'head') {
        const a = b.angle, p = part.position;
        c2.save(); c2.translate(p.x, p.y); c2.rotate(a);
        c2.strokeStyle = '#c98b5b'; c2.lineWidth = 1.5; c2.beginPath(); c2.arc(0, 0, 12, 0, Math.PI * 2); c2.stroke();
        c2.fillStyle = '#222';
        const up = sim.exp.id === 'phone';                // 누운 인형은 위를, 나머지는 오른쪽을 봄
        const eyes = up ? [[-4, -4], [4, -4]] : [[2, -3], [7, -3]];
        eyes.forEach(([ex, ey]) => { c2.beginPath(); c2.arc(ex, ey, 1.8, 0, Math.PI * 2); c2.fill(); });
        c2.strokeStyle = '#222'; c2.beginPath(); c2.arc(up ? 0 : 4, up ? 2 : 3, 3, 0.2, Math.PI - 0.2); c2.stroke();
        if (sim.helmet) { c2.fillStyle = '#ffd60a'; c2.beginPath(); c2.arc(0, -2, 14, Math.PI, 0); c2.fill(); }
        c2.restore();
      }
    });
  });
}

function controlHtml(e, p) {
  return e.params.map(q => {
    if (q.type === 'floor') return `<div><label class="field">${q.label}</label><div class="row" data-p="${q.id}">${q.options.map(o => `<button class="chip ${p[q.id] === o ? 'on' : ''}" data-v="${o}">${L.FLOORS[o].name}</button>`).join('')}</div></div>`;
    if (q.type === 'select') return `<div><label class="field">${q.label}</label><div class="row" data-p="${q.id}">${q.options.map(([v, t]) => `<button class="chip ${p[q.id] === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div></div>`;
    if (q.type === 'bool') return `<label class="row small toggle"><input type="checkbox" data-b="${q.id}" ${p[q.id] ? 'checked' : ''}> ${q.label}</label>`;
    return `<div><label class="field">${q.label} <b data-out="${q.id}">${p[q.id]}${q.unit}</b></label><input type="range" data-r="${q.id}" min="${q.min}" max="${q.max}" step="${q.step}" value="${p[q.id]}"></div>`;
  }).join('');
}

Router.on('/lab', (root, params) => {
  const e = L.EXPERIMENTS.find(x => x.id === params.get('id')) || L.EXPERIMENTS[0];
  const p = Object.assign(L.defaults(e.id), store.sget('al-p-' + e.id, {}));
  root.append(h(`
    <section class="stack">
      <div class="row"><span class="ee">${e.emoji}</span><h2 style="margin:0">${esc(e.name)}</h2></div>
      <p class="muted" style="margin:0">${esc(e.desc)}</p>
      <div class="split s73"><div class="stack sticky">
      <div class="stage"><canvas id="cv" width="${L.W}" height="${L.H}"></canvas><div class="stamp hidden" id="stamp"></div></div>
      <div class="meter card"><div class="row"><b>충격 지수</b><span class="grow"></span><b id="num">-</b></div><div class="bar"><i id="mbar" style="width:0%"></i></div><div class="row small muted"><span>안 죽어</span><span class="grow"></span><span>위험</span></div></div>
      <div class="row"><button class="btn primary big grow" id="run">▶ 실험 시작</button><button class="btn big" id="slow" title="느리게">🐢</button></div>
      </div><div class="stack">
      <div class="card stack" id="ctl">${controlHtml(e, p)}</div>
      <div id="after" class="hidden stack">
        <div class="card safety"><b>🦺 실제로는 이렇게</b><ul>${e.safety.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
        <a class="btn block" href="#/result">결과 카드 보기</a>
      </div>
      </div></div>
      <p class="muted small center">재미용 추정치 · 의학적 근거 아님</p>
    </section>`));
  const cv = $('#cv'), c2 = cv.getContext('2d');
  let sim = null, raf = 0, slow = false, frames = 0;
  const saveP = () => store.sset('al-p-' + e.id, p);
  function reset() {
    cancelAnimationFrame(raf);
    sim = L.create(window.Matter, e.id, p);
    frames = 0;
    drawWorld(c2, sim);
    $('#stamp').classList.add('hidden');
    $('#num').textContent = '-'; $('#mbar').style.width = '0%';
  }
  function finish() {
    const r = sim.result();
    last = { id: e.id, name: e.name, emoji: e.emoji, p: Object.assign({}, p), eff: r.effective, fell: r.fell, v: r.verdict };
    store.sset('al-last', last);
    const pct = clamp(r.effective / 6 * 100, 2, 100);
    $('#num').textContent = r.effective.toFixed(1) + ' m/s';
    $('#mbar').style.width = pct + '%';
    $('#mbar').style.background = VCOLOR[r.verdict.key];
    const st = $('#stamp');
    st.textContent = r.verdict.title;
    st.style.color = st.style.borderColor = VCOLOR[r.verdict.key];
    st.classList.remove('hidden');
    $('#after').classList.remove('hidden');
    vibrate(r.verdict.key === 'ok' ? 20 : [60, 40, 120]); Sfx.play(r.verdict.key === 'ok' ? 'ok' : 'bad');
    $('#run').disabled = false; $('#run').textContent = '↻ 다시 실험';
  }
  function loop() {
    const n = slow ? (frames % 3 === 0 ? 1 : 0) : 1;
    for (let k = 0; k < n; k++) { sim.step(); }
    frames++;
    drawWorld(c2, sim);
    if (sim.state.t < 4.2) raf = requestAnimationFrame(loop);
    else finish();
  }
  $('#run').onclick = () => { reset(); $('#run').disabled = true; $('#run').textContent = '실험 중…'; raf = requestAnimationFrame(loop); };
  $('#slow').onclick = () => { slow = !slow; $('#slow').classList.toggle('on', slow); toast(slow ? '느린 화면으로 볼게요' : '보통 속도'); };
  $$('[data-r]').forEach(inp => inp.oninput = () => {
    const q = e.params.find(x => x.id === inp.dataset.r);
    p[q.id] = Number(inp.value); $(`[data-out="${q.id}"]`).textContent = p[q.id] + q.unit; saveP(); reset();
  });
  $$('[data-p]').forEach(row => $$('.chip', row).forEach(b => b.onclick = () => {
    p[row.dataset.p] = b.dataset.v; $$('.chip', row).forEach(x => x.classList.toggle('on', x === b)); saveP(); reset();
  }));
  $$('[data-b]').forEach(cb => cb.onchange = () => { p[cb.dataset.b] = cb.checked; saveP(); reset(); });
  reset();
  return () => cancelAnimationFrame(raf);
});

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
        <div class="rsafe"><b>그래도 이렇게 하세요</b><br>${esc(e.safety[0])}</div>
        <div class="muted small">에이~ 안 죽어 · 재미용 시뮬레이션</div>
      </div>
      <div class="row"><button class="btn primary grow" id="save">결과 카드 저장</button><button class="btn grow" id="share">공유하기</button></div>
      <a class="btn block" href="#/lab?id=${last.id}">조건 바꿔서 다시</a>
      <a class="btn ghost block" href="#/">다른 실험 고르기</a>
    </section>`));
  $('#save').onclick = () => saveImage($('#card'), 'accident-lab.png');
  $('#share').onclick = () => shareText('에이~ 안 죽어', `"${last.name}" 실험 결과: ${last.v.title}. 너도 실험해 봐`, location.href.split('#')[0]);
});

/* ---------- 안전 수칙 ---------- */
Router.on('/safety', root => {
  root.append(h(`<section class="stack"><h1>안전 수칙 모음</h1>${L.EXPERIMENTS.map(e => `<div class="card"><b>${e.emoji} ${esc(e.name)}</b><ul>${e.safety.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`).join('')}
    <div class="notice">머리를 부딪힌 뒤 의식이 흐려지거나, 구토·심한 두통·말이 어눌해지는 증상이 있으면 지체 없이 119에 연락하세요.</div></section>`));
});

Router.start($('#app'));
