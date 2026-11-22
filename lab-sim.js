/* lab-sim.js — "에이~ 안 죽어" 물리 실험 정의 (Matter.js)
   브라우저(window.LabSim)와 node(require) 양쪽에서 쓸 수 있게 작성.
   단위: 1m = 100px, 중력 10m/s². Matter 속도(px/스텝, 60스텝/초) × 0.6 = m/s
   인형은 결과가 매번 같도록 한 덩어리(관절 없는 통나무형)로 만든다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LabSim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 800, H = 500, FLOOR = 460;
  const PX2MS = 0.6;

  const FLOORS = {
    wood: { name: '마루', friction: 0.6, soft: 1.0, color: '#d9b98c' },
    tile: { name: '젖은 타일', friction: 0.04, soft: 1.05, color: '#bfe0ef' },
    soap: { name: '비누 거품 타일', friction: 0.005, soft: 1.05, color: '#e6f4ff' },
    carpet: { name: '카펫', friction: 0.9, soft: 0.8, color: '#c96b6b' },
    mat: { name: '푹신한 매트', friction: 0.8, soft: 0.5, color: '#8fcf9b' },
    asphalt: { name: '아스팔트', friction: 0.8, soft: 1.1, color: '#7a7f88' },
    grass: { name: '잔디', friction: 0.7, soft: 0.7, color: '#86c272' }
  };

  const EXPERIMENTS = [
    {
      id: 'chair', name: '의자 뒤로 젖히기', emoji: '🪑',
      desc: '수업 시간에 의자를 뒤로 젖혀 앞다리를 들고 버티기. 어디까지 괜찮을까?',
      params: [
        { id: 'angle', label: '젖히는 각도', min: 5, max: 40, step: 1, value: 15, unit: '°' },
        { id: 'push', label: '뒤로 미는 힘', min: 0, max: 10, step: 1, value: 2, unit: '' },
        { id: 'floor', label: '바닥', type: 'floor', options: ['wood', 'carpet', 'mat'], value: 'wood' },
        { id: 'helmet', label: '헬멧 착용', type: 'bool', value: false }
      ],
      safety: ['의자 네 다리는 모두 바닥에 두세요. 뒤로 넘어지면 뒤통수부터 떨어지기 쉬워요.', '넘어가는 순간에는 턱을 당겨 머리를 들고, 팔로 머리를 감싸세요.', '바퀴 달린 의자는 더 쉽게 넘어가요.']
    },
    {
      id: 'wet', name: '젖은 욕실 바닥', emoji: '🛁',
      desc: '샤워 후 젖은 바닥에서 발이 쭉 미끄러지면?',
      params: [
        { id: 'slip', label: '발에 실리는 힘', min: 0.2, max: 3, step: 0.1, value: 1.0, unit: '' },
        { id: 'floor', label: '바닥', type: 'floor', options: ['wood', 'tile', 'soap', 'mat'], value: 'tile' },
        { id: 'helmet', label: '헬멧 착용', type: 'bool', value: false }
      ],
      safety: ['욕실에는 미끄럼 방지 매트를 깔고, 샤워 후 물기를 바로 닦으세요.', '슬리퍼는 바닥에 홈이 있는 미끄럼 방지 제품으로.', '뒤로 넘어져 머리를 부딪힌 뒤 구토·심한 두통·졸림이 있으면 바로 119 또는 응급실로 가세요.']
    },
    {
      id: 'stairs', name: '계단 헛디딤', emoji: '🪜',
      desc: '휴대폰 보며 계단을 내려가다 한 칸을 헛디디면?',
      params: [
        { id: 'steps', label: '남은 계단 수', min: 1, max: 6, step: 1, value: 3, unit: '칸' },
        { id: 'push', label: '앞으로 쏠리는 속도', min: 0.2, max: 2.5, step: 0.1, value: 1, unit: 'm/s' },
        { id: 'helmet', label: '헬멧 착용', type: 'bool', value: false }
      ],
      safety: ['계단에서는 휴대폰을 보지 말고 난간을 잡으세요.', '마지막 한두 칸에서 사고가 많아요. 끝까지 발밑을 확인하세요.', '어두운 계단은 조명부터 켜세요.']
    },
    {
      id: 'phone', name: '누워서 폰 보다 떨어뜨리기', emoji: '📱',
      desc: '누워서 폰을 들고 보다가 손에서 미끄러지면 얼굴로 직행.',
      params: [
        { id: 'height', label: '떨어지는 높이', min: 10, max: 60, step: 5, value: 30, unit: 'cm' },
        { id: 'weight', label: '폰 무게', type: 'select', options: [['light', '가벼운 폰 (170g)'], ['heavy', '무거운 폰 (240g)']], value: 'light' },
        { id: 'case', label: '말랑한 케이스', type: 'bool', value: false }
      ],
      safety: ['누워서 볼 때는 옆으로 누워 폰을 얼굴 정면 위로 들지 마세요.', '그립톡·스트랩을 쓰면 손에서 덜 미끄러져요.', '콧등·치아에 맞았는데 붓기나 출혈이 계속되면 진료를 받으세요.']
    },
    {
      id: 'kick', name: '킥보드 돌부리 급정거', emoji: '🛴',
      desc: '전동 킥보드를 타다 앞바퀴가 돌부리에 턱 걸리면? 몸은 계속 앞으로 갑니다.',
      params: [
        { id: 'speed', label: '달리던 속도', min: 1, max: 6, step: 0.5, value: 3, unit: 'm/s' },
        { id: 'floor', label: '바닥', type: 'floor', options: ['asphalt', 'grass'], value: 'asphalt' },
        { id: 'helmet', label: '헬멧 착용', type: 'bool', value: false }
      ],
      safety: ['킥보드·자전거를 탈 때는 헬멧을 꼭 쓰세요. 앞으로 고꾸라지면 얼굴·머리부터 닿기 쉬워요.', '속도를 줄이고, 턱·맨홀·돌부리가 많은 길은 내려서 끌고 가세요.', '두 명이 함께 타거나 한 손으로 휴대폰을 보며 타지 마세요.']
    },
    {
      id: 'stool', name: '바퀴 의자 밟고 전구 갈기', emoji: '💡',
      desc: '사다리 대신 바퀴 달린 의자에 올라가 손을 뻗으면? 의자가 쓱 밀려납니다.',
      params: [
        { id: 'height', label: '올라선 높이', min: 30, max: 90, step: 10, value: 50, unit: 'cm' },
        { id: 'wobble', label: '몸 흔들림', min: 0, max: 10, step: 1, value: 2, unit: '' },
        { id: 'floor', label: '바닥', type: 'floor', options: ['wood', 'carpet', 'mat'], value: 'wood' },
        { id: 'helmet', label: '헬멧 착용', type: 'bool', value: false }
      ],
      safety: ['높은 곳 작업은 바퀴 없는 접이식 사다리를 쓰고, 다리를 끝까지 펴 고정하세요.', '혼자 하지 말고 한 사람이 사다리를 잡아 주세요.', '떨어져 머리를 부딪힌 뒤 구토·심한 두통·졸림이 있으면 바로 119 또는 응급실로 가세요.']
    }
  ];

  const VERDICTS = [
    { max: 1.0, key: 'ok', title: '에이~ 안 죽어', line: '멀쩡해요. 그래도 따라 하진 마세요.' },
    { max: 2.5, key: 'ouch', title: '아야! 혹 하나', line: '아프긴 해요. 얼음찜질 각.' },
    { max: 4.5, key: 'hospital', title: '병원 가 보세요', line: '머리가 울릴 수준. 증상이 있으면 진료를 받으세요.' },
    { max: Infinity, key: 'danger', title: '이건 진짜 위험', line: '실제라면 크게 다칠 수 있어요. 절대 따라 하지 마세요.' }
  ];
  const verdict = v => VERDICTS.find(x => v < x.max);

  const rot = (v, a) => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });

  /* 인형 부품: hip = 엉덩이, ta = 몸통 각도(0=똑바로), la = 다리 각도(0=아래로) */
  function dollParts(M, hip, ta, la, opt) {
    opt = opt || {};
    const at = (b, p) => { M.Body.setPosition(b, p); return b; };
    const aa = ta + (opt.armAngle || 0);
    const torso = at(M.Bodies.rectangle(0, 0, 28, 55, { label: 'torso', chamfer: { radius: 9 }, angle: ta, density: 0.0015 }), add(hip, rot({ x: 0, y: -27.5 }, ta)));
    const head = at(M.Bodies.circle(0, 0, 12, { label: 'head', density: 0.002 }), add(hip, rot({ x: 0, y: -69 }, ta)));
    const legs = [-6, 6].map(dx => at(M.Bodies.rectangle(0, 0, 12, 85, { label: 'leg', chamfer: { radius: 5 }, angle: la, density: opt.legDensity || 0.0015 }),
      add(add(hip, rot({ x: dx, y: 0 }, ta)), rot({ x: 0, y: 42.5 }, la))));
    const arms = [-17, 17].map(dx => at(M.Bodies.rectangle(0, 0, 8, 56, { label: 'arm', chamfer: { radius: 4 }, angle: aa, density: 0.0015 }),
      add(add(hip, rot({ x: dx, y: -50 }, ta)), rot({ x: 0, y: 27 }, aa))));
    const joints = {
      hip: { x: hip.x, y: hip.y },
      neck: add(hip, rot({ x: 0, y: -55 }, ta)),
      shL: add(hip, rot({ x: -17, y: -50 }, ta)), shR: add(hip, rot({ x: 17, y: -50 }, ta)),
      hipL: add(hip, rot({ x: -6, y: 0 }, ta)), hipR: add(hip, rot({ x: 6, y: 0 }, ta))
    };
    return { torso, head, legs, arms, joints, parts: [legs[0], legs[1], torso, arms[0], arms[1], head] };
  }
  function compound(M, parts, o) {
    return M.Body.create(Object.assign({ parts, friction: 0.7, frictionStatic: 0.5, restitution: 0.05 }, o));
  }
  function pointVel(body, p) {
    const r = sub(p, body.position), w = body.angularVelocity;
    return { x: body.velocity.x - w * r.y, y: body.velocity.y + w * r.x };
  }
  function rotateAbout(M, body, angle, pivot, w) {
    if (angle) M.Body.rotate(body, angle, pivot);
    if (w) {
      const r = sub(body.position, pivot);
      M.Body.setVelocity(body, { x: -w * r.y, y: w * r.x });
      M.Body.setAngularVelocity(body, w);
    }
  }

  function create(M, id, p) {
    const engine = M.Engine.create({ positionIterations: 10, velocityIterations: 8 });
    engine.gravity.y = 1;
    const world = engine.world;
    const exp = EXPERIMENTS.find(e => e.id === id);
    const fl = FLOORS[p.floor || 'wood'];
    const statics = [];
    const ground = M.Bodies.rectangle(W / 2, FLOOR + 40, W * 3, 80, { isStatic: true, label: 'floor', friction: fl.friction, frictionStatic: 0.5, restitution: 0.02 });
    ground.render = { fill: fl.color };
    statics.push(ground);
    const extra = [];
    let doll, actor, onStep = null, target = 'head';
    const props = [];                                  // 함께 그릴 도구(킥보드·의자)
    let factor = fl.soft * (p.helmet ? 0.45 : 1);

    if (id === 'chair') {
      const px = 330;                                  // 뒷다리 바닥 접점(회전축)
      const chairParts = [
        M.Bodies.rectangle(px + 24, FLOOR - 47.5, 48, 5, { label: 'chair', density: 0.001 }),
        M.Bodies.rectangle(px + 2.5, FLOOR - 80, 5, 60, { label: 'chair', density: 0.001 }),
        M.Bodies.rectangle(px + 2, FLOOR - 22.5, 4, 45, { label: 'chair', density: 0.001 }),
        M.Bodies.rectangle(px + 46, FLOOR - 22.5, 4, 45, { label: 'chair', density: 0.001 })
      ];
      doll = dollParts(M, { x: px + 20, y: FLOOR - 51 }, -0.05, -1.0, { legDensity: 0.0006, armAngle: -0.5 });
      actor = compound(M, chairParts.concat(doll.parts), { label: 'actor' });
      const tips = p.angle + p.push * 2.5 >= 24;      // 넘어가는 기준(각도 + 미는 힘)
      const w = tips ? -(0.006 + 0.0012 * p.push + 0.0001 * p.angle) : 0.004 + 0.0005 * p.angle;
      rotateAbout(M, actor, -p.angle * Math.PI / 180, { x: px, y: FLOOR }, w);
    } else if (id === 'wet') {
      const hip = { x: 360, y: FLOOR - 86 };
      doll = dollParts(M, hip, 0, 0, {});
      actor = compound(M, doll.parts, { label: 'actor', friction: 0.9 });
      const THR = { wood: 1.6, carpet: 2.0, mat: 1.8, tile: 0.4, soap: 0.25 };
      const slips = p.slip >= THR[p.floor || 'wood'];  // 바닥 마찰보다 발에 실린 힘이 크면 미끄러짐
      const top = add(hip, { x: 0, y: -50 });
      let balance = M.Constraint.create({ pointA: top, bodyB: actor, pointB: sub(top, actor.position), length: 0, stiffness: 0.08, damping: 0.1 });
      extra.push(balance);
      const weight = actor.mass * 0.001;
      onStep = st => {
        const foot = { x: doll.legs[1].position.x, y: FLOOR - 2 };
        if (!slips) { if (st.t < 0.25) M.Body.applyForce(actor, foot, { x: 0.12 * weight, y: 0 }); return; }   // 휘청하고 버팀
        if (balance && st.t > 0.05) {
          M.Composite.remove(world, balance); balance = null; st.lostBalance = true;
          M.Body.translate(actor, { x: 0, y: -6 });                       // 발이 바닥에서 빠지는 순간
          M.Body.setAngularVelocity(actor, -(0.03 + 0.006 * p.slip));     // 뒤로 넘어감
          M.Body.setVelocity(actor, { x: actor.velocity.x + 1.5 * p.slip, y: actor.velocity.y });
        }
      };
    } else if (id === 'stairs') {
      const n = p.steps, sh = 18, sd = 30, baseX = 250;
      for (let k = 0; k < n; k++) {
        const top = FLOOR - sh * (n - k);
        const wide = k === 0 ? 140 : 0;
        const s = M.Bodies.rectangle(baseX + sd * k + sd / 2 - wide / 2, (top + FLOOR) / 2, sd + wide, FLOOR - top, { isStatic: true, label: 'stair', friction: 0.7 });
        s.render = { fill: '#b0a89a' };
        statics.push(s);
      }
      const topY = FLOOR - sh * n;
      const hip = { x: baseX + sd - 8, y: topY - 86 };
      doll = dollParts(M, hip, 0.04, 0, {});
      actor = compound(M, doll.parts, { label: 'actor' });
      const v = p.push / PX2MS;
      rotateAbout(M, actor, 0, { x: hip.x + 6, y: topY }, v / 150);   // 발끝을 축으로 앞으로 쏠림
      M.Body.setVelocity(actor, { x: actor.velocity.x + v * 0.35, y: actor.velocity.y });
      factor *= 0.35 + 0.05 * n + 0.05 * p.push;   // 손으로 짚는 효과: 낮고 느릴수록 충격을 많이 줄임
    } else if (id === 'phone') {
      const hip = { x: 420, y: FLOOR - 15 };
      doll = dollParts(M, hip, -Math.PI / 2, -Math.PI / 2, {});
      actor = compound(M, doll.parts, { label: 'actor', isStatic: true });
      const headTop = doll.head.position.y - 12;
      const phone = M.Bodies.rectangle(doll.head.position.x + 2, headTop - p.height - 2, 16, 2, { label: 'phone', density: 0.004, restitution: 0.2, friction: 0.5, angle: 0.08 });
      phone.render = { fill: '#222' };
      extra.push(phone);
      target = 'phone';
      factor = (p.weight === 'heavy' ? 0.55 : 0.4) * (p.case ? 0.8 : 1);
    } else if (id === 'kick') {
      const v = p.speed / PX2MS, deckY = FLOOR - 14, x0 = 200;
      const scooterParts = [
        M.Bodies.rectangle(x0 + 30, deckY + 2, 70, 5, { label: 'scooter', density: 0.004 }),
        M.Bodies.rectangle(x0 + 62, deckY - 50, 5, 100, { label: 'scooter', density: 0.002 }),
        M.Bodies.rectangle(x0 + 56, deckY - 100, 20, 4, { label: 'scooter', density: 0.002 }),
        M.Bodies.circle(x0 - 2, FLOOR - 6, 6, { label: 'wheel', density: 0.004 }),
        M.Bodies.circle(x0 + 62, FLOOR - 6, 6, { label: 'wheel', density: 0.004 })
      ];
      const hip = { x: x0 + 24, y: deckY - 85 };
      doll = dollParts(M, hip, 0.05, 0, { armAngle: -0.75 });
      actor = compound(M, scooterParts.concat(doll.parts), { label: 'actor', friction: 0.02, frictionStatic: 0.02, frictionAir: 0 });   // 손잡이를 잡고 서 있어 킥보드와 한 덩어리
      M.Body.setVelocity(actor, { x: v, y: 0 });
      const stone = M.Bodies.rectangle(x0 + 62 + 140, FLOOR - 5, 18, 10, { isStatic: true, label: 'stone', chamfer: { radius: 4 }, friction: 0.8 });
      stone.render = { fill: '#8a8174' };
      statics.push(stone);
      const wheel = scooterParts[4];
      const tips = p.speed >= 1.6;                    // 이보다 느리면 돌에 막혀 멈추고 버팀
      onStep = st => {
        if (st.stopped) return;
        if (wheel.position.x + 6 >= stone.position.x - 18) {   // 앞바퀴가 돌부리에 닿음
          st.stopped = true;
          if (!tips) { M.Body.setVelocity(actor, { x: 0, y: 0 }); M.Body.setAngularVelocity(actor, 0); return; }
          st.lostBalance = true;
          M.Body.setAngularVelocity(actor, v / 150);   // 바퀴가 멈추고 몸은 앞으로 고꾸라짐
          M.Body.setVelocity(actor, { x: v * 0.7, y: -0.3 });
        }
      };
      factor *= 0.45 + 0.07 * p.speed;                // 손 짚기: 느릴수록 충격을 더 줄임
    } else if (id === 'stool') {
      const h = p.height, seatY = FLOOR - h, x0 = 360;
      const stool = M.Body.create({
        parts: [
          M.Bodies.rectangle(x0, seatY + 4, 54, 8, { label: 'stool', chamfer: { radius: 3 } }),
          M.Bodies.rectangle(x0, (seatY + 8 + FLOOR - 12) / 2, 7, FLOOR - 12 - seatY - 8, { label: 'stool' }),
          M.Bodies.rectangle(x0, FLOOR - 13, 64, 5, { label: 'stool' }),
          M.Bodies.circle(x0 - 28, FLOOR - 5, 5, { label: 'wheel' }),
          M.Bodies.circle(x0 + 28, FLOOR - 5, 5, { label: 'wheel' })
        ], label: 'stool', friction: 0.01, frictionStatic: 0.02, frictionAir: 0.01, restitution: 0, density: 0.003
      });
      props.push(stool); extra.push(stool);
      const hip = { x: x0, y: seatY - 85 };
      doll = dollParts(M, hip, 0, 0, { armAngle: Math.PI - 0.15 });   // 팔을 위로 뻗음
      actor = compound(M, doll.parts, { label: 'actor', friction: 0.9 });
      const tips = p.wobble * 10 + p.height >= 80;   // 높고 많이 흔들릴수록 넘어짐
      const top = add(hip, { x: 0, y: -50 });
      let balance = M.Constraint.create({ pointA: top, bodyB: actor, pointB: sub(top, actor.position), length: 0, stiffness: 0.1, damping: 0.1 });
      extra.push(balance);
      onStep = st => {
        if (!tips) { if (st.t < 0.6) M.Body.applyForce(stool, stool.position, { x: 0.00004 * p.wobble * stool.mass * Math.sin(st.t * 18), y: 0 }); return; }
        if (balance && st.t > 0.35) {
          M.Composite.remove(world, balance); balance = null; st.lostBalance = true;
          M.Body.setVelocity(stool, { x: 1.2 + 0.25 * p.wobble, y: 0 });          // 발이 의자를 밀어냄
          M.Body.setAngularVelocity(actor, -(0.02 + 0.003 * p.wobble));            // 뒤로 기울어 떨어짐
          M.Body.setVelocity(actor, { x: -0.6 - 0.1 * p.wobble, y: -0.6 });
        }
      };
      factor *= 0.95;
    }

    M.Composite.add(world, statics.concat([actor], extra));

    const state = { t: 0, raw: 0, hits: 0, lostBalance: false, startHeadY: doll.head.position.y, series: [], impacts: [] };
    const IMPACT_MIN = 0.8;                            // 이 속도(m/s) 이상 부딪힘만 연출·그래프에 표시
    const addImpact = (rv, c) => {
      if (rv < IMPACT_MIN) return;
      const lastI = state.impacts[state.impacts.length - 1];
      if (lastI && state.t - lastI.t < 0.08) { if (rv > lastI.v) { lastI.v = rv; lastI.x = c.x; lastI.y = c.y; } return; }
      if (state.impacts.length < 8) state.impacts.push({ t: Math.round(state.t * 1000) / 1000, x: c.x, y: c.y, v: rv });
    };
    /* 관절 위치(인형 몸 기준 좌표)를 기억해 두었다가 그릴 때 실제 위치로 바꿈 */
    const jointLocal = {};
    Object.keys(doll.joints).forEach(k => { jointLocal[k] = rot(sub(doll.joints[k], actor.position), -actor.angle); });
    function joints() {
      const o = {};
      Object.keys(jointLocal).forEach(k => { o[k] = add(actor.position, rot(jointLocal[k], actor.angle)); });
      return o;
    }
    M.Events.on(engine, 'collisionStart', ev => {
      if (!state) return;
      ev.pairs.forEach(pair => {
        const A = pair.bodyA, B = pair.bodyB;
        if (target === 'head') {
          const mine = A.parent === actor ? A : B.parent === actor ? B : null;
          const other = mine === A ? B : A;
          if (!mine || !other.parent.isStatic || state.t < 0.1) return;
          if (mine.label === 'wheel' || mine.label === 'scooter') return;   // 킥보드가 돌·바닥에 닿는 건 몸 충격이 아님
          const v = pointVel(actor, doll.head.position);
          const rv = Math.hypot(v.x, v.y) * PX2MS;
          state.hits++;
          if (rv > state.raw) state.raw = rv;
          addImpact(rv, (pair.collision.supports && pair.collision.supports[0]) || doll.head.position);
          return;
        }
        let headPart = null, other = null;
        if (A.label === 'head') { headPart = A; other = B; } else if (B.label === 'head') { headPart = B; other = A; }
        if (!headPart) return;
        if (target === 'phone' && other.parent.label !== 'phone') return;
        if (other.parent === headPart.parent) return;
        const c = (pair.collision.supports && pair.collision.supports[0]) || headPart.position;
        const va = headPart.parent.isStatic ? { x: 0, y: 0 } : pointVel(headPart.parent, c);
        const vb = other.parent.isStatic ? { x: 0, y: 0 } : pointVel(other.parent, c);
        const n = pair.collision.normal;
        const rv = Math.abs((va.x - vb.x) * n.x + (va.y - vb.y) * n.y) * PX2MS;
        state.hits++;
        if (rv > state.raw) state.raw = rv;
        addImpact(rv, c);
      });
    });

    const tracked = target === 'phone' ? extra[0] : null;
    function headSpeed() {
      const v = tracked ? tracked.velocity : pointVel(actor, doll.head.position);
      return Math.hypot(v.x, v.y) * PX2MS;
    }
    function step() {
      M.Engine.update(engine, 1000 / 60);
      state.t += 1 / 60;
      if (onStep) onStep(state);
      state.series.push(Math.round(headSpeed() * 100) / 100);
    }
    function result() {
      const fell = id === 'phone' || doll.head.position.y - state.startHeadY > 50;
      const eff = fell ? state.raw * factor : 0;
      const first = state.impacts.find(i => i.v >= state.raw * 0.6) || state.impacts[0] || null;
      return { raw: state.raw, effective: eff, fell, verdict: verdict(eff), hits: state.hits, factor, impactT: first ? first.t : null };
    }
    /* 느린 다시보기용: 움직이는 몸의 위치·각도를 저장/복원 */
    const movers = () => M.Composite.allBodies(world).filter(b => !b.isStatic || b === actor);
    function snapshot() { return movers().map(b => [b.position.x, b.position.y, b.angle]); }
    function restore(snap) {
      movers().forEach((b, k) => { const s = snap[k]; if (!s) return; M.Body.setPosition(b, { x: s[0], y: s[1] }); M.Body.setAngle(b, s[2]); });
    }
    return { engine, world, doll, actor, props, step, result, state, exp, floor: fl, helmet: !!p.helmet, factor, joints, snapshot, restore, headSpeed };
  }

  function defaults(id) {
    const o = {};
    EXPERIMENTS.find(e => e.id === id).params.forEach(p => { o[p.id] = p.value; });
    return o;
  }

  return { W, H, FLOOR, FLOORS, EXPERIMENTS, VERDICTS, verdict, create, defaults };
});
