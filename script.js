/* Brain and Beyond — interactive magic
   Neurons that wake up under your cursor, a glowing nerve that follows your scroll,
   ambient music, a flip card of brain facts and the "you" neuron at the end. */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var COLORS = ['#9FE6FF', '#C3B5F5', '#F2D58D', '#FFFFFF'];

  /* ---------- Sound (generated in the browser, no music files) ---------- */
  var audio = { ctx: null, master: null, rev: null, on: false, timer: null };

  function startSound() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audio.ctx) {
      var ctx = new AC();
      audio.ctx = ctx;
      var master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      audio.master = master;

      // Soft reverb made from fading noise
      var rev = ctx.createConvolver();
      var len = ctx.sampleRate * 3.5;
      var buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var c = 0; c < 2; c++) {
        var d = buf.getChannelData(c);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      rev.buffer = buf;
      var revGain = ctx.createGain();
      revGain.gain.value = 0.9;
      rev.connect(revGain);
      revGain.connect(master);
      audio.rev = rev;

      // Dreamy pad chord through a slowly moving filter
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      lp.connect(master);
      lp.connect(rev);
      var lfo = ctx.createOscillator();
      var lfoGain = ctx.createGain();
      lfo.frequency.value = 0.05;
      lfoGain.gain.value = 350;
      lfo.connect(lfoGain);
      lfoGain.connect(lp.frequency);
      lfo.start();
      [110, 164.81, 220, 261.63, 329.63, 493.88].forEach(function (f, idx) {
        [0, 4].forEach(function (det) {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = idx % 2 ? 'triangle' : 'sine';
          o.frequency.value = f;
          o.detune.value = det;
          g.gain.value = 0.035;
          o.connect(g);
          g.connect(lp);
          o.start();
        });
      });
    }
    audio.ctx.resume();
    var t = audio.ctx.currentTime;
    audio.master.gain.cancelScheduledValues(t);
    audio.master.gain.setValueAtTime(audio.master.gain.value, t);
    audio.master.gain.linearRampToValueAtTime(0.4, t + 3);
    clearInterval(audio.timer);
    audio.timer = setInterval(function () { if (Math.random() < 0.6) chime(0.08); }, 1800);
  }

  function stopSound() {
    if (!audio.ctx) return;
    clearInterval(audio.timer);
    var t = audio.ctx.currentTime;
    audio.master.gain.cancelScheduledValues(t);
    audio.master.gain.setValueAtTime(audio.master.gain.value, t);
    audio.master.gain.linearRampToValueAtTime(0, t + 1.2);
  }

  function chime(vol) {
    if (!audio.ctx || !audio.on) return;
    var notes = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
    var f = notes[Math.floor(Math.random() * notes.length)];
    var t = audio.ctx.currentTime;
    var o = audio.ctx.createOscillator();
    var g = audio.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    o.connect(g);
    g.connect(audio.master);
    g.connect(audio.rev);
    o.start(t);
    o.stop(t + 3);
  }

  var soundBtn = document.getElementById('soundBtn');
  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      audio.on = !audio.on;
      soundBtn.setAttribute('aria-pressed', audio.on ? 'true' : 'false');
      document.getElementById('soundLabel').textContent = audio.on ? 'Sound on' : 'Play sound';
      if (audio.on) startSound(); else stopSound();
    });
  }

  /* ---------- Hero: neurons that wake up under your cursor ---------- */
  function seeded(seed) {
    var s = seed;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS(SVGNS, name);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  document.querySelectorAll('.hero').forEach(function (hero) {
    var rand = seeded(+hero.dataset.seed);
    var count = +hero.dataset.count, W = +hero.dataset.w, H = +hero.dataset.h;
    var nodes = [];
    for (var i = 0; i < count; i++) {
      var x = Math.round(rand() * W), y = Math.round(rand() * H);
      var big = rand() > 0.82;
      nodes.push({ x: x, y: y, r: big ? 4.5 : 2.2, halo: big ? 16 : 8, c: COLORS[Math.floor(rand() * COLORS.length)] });
    }
    var gEdges = hero.querySelector('.net-edges');
    var gNodes = hero.querySelector('.net-nodes');
    nodes.forEach(function (a, i) {
      nodes.map(function (b, j) { return { j: j, d: (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) }; })
        .filter(function (o) { return o.j !== i; })
        .sort(function (p, q) { return p.d - q.d; })
        .slice(0, 2)
        .forEach(function (o) {
          var b = nodes[o.j];
          gEdges.appendChild(svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: a.c, 'stroke-width': 1.2, opacity: 0.85 }));
        });
      gNodes.appendChild(svgEl('circle', { cx: a.x, cy: a.y, r: a.r, fill: a.c }));
      gNodes.appendChild(svgEl('circle', { cx: a.x, cy: a.y, r: a.halo, fill: a.c, opacity: 0.18 }));
    });

    var last = { x: 0, y: 0 };
    function light(clientX, clientY, isTouch) {
      var r = hero.getBoundingClientRect();
      var x = Math.round(clientX - r.left), y = Math.round(clientY - r.top);
      hero.style.setProperty('--mx', x + 'px');
      hero.style.setProperty('--my', y + 'px');
      var moved = Math.abs(x - last.x) + Math.abs(y - last.y);
      if ((isTouch && Math.random() < 0.15) || (!isTouch && moved > 40 && Math.random() < 0.18)) chime(0.05);
      last = { x: x, y: y };
    }
    hero.addEventListener('mousemove', function (e) { light(e.clientX, e.clientY, false); });
    hero.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) light(t.clientX, t.clientY, true); }, { passive: true });
    hero.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) light(t.clientX, t.clientY, true); }, { passive: true });
  });

  /* ---------- The glowing nerve, counting numbers and the "you" neuron ---------- */
  var wrap = document.getElementById('axWrap');
  var stats = document.getElementById('stats');
  var axLit = document.getElementById('axLit');
  var axPulse = document.getElementById('axPulse');
  var axNodes = document.querySelectorAll('.axn');
  var bloomPaths = document.querySelectorAll('.bl');
  var counted = false, bloomed = false;

  function bloom() {
    if (bloomed) return;
    bloomed = true;
    bloomPaths.forEach(function (p) { p.setAttribute('stroke-dashoffset', '0'); });
  }

  function countUp() {
    var n1 = document.getElementById('n1'), n2 = document.getElementById('n2');
    if (!n1 || !n2) return;
    var t0 = performance.now();
    function step(now) {
      var t = Math.min(1, (now - t0) / 1800);
      var e = 1 - Math.pow(1 - t, 3);
      n1.textContent = Math.round(86 * e) + ' billion';
      n2.textContent = Math.round(100 * e) + ' trillion';
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function onScroll() {
    var vh = window.innerHeight || 800;
    if (wrap && axLit) {
      var r = wrap.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (vh * 0.55 - r.top) / r.height));
      axLit.setAttribute('stroke-dasharray', Math.round(p * 1000) + ' 1000');
      axPulse.setAttribute('stroke-dashoffset', Math.round(40 - p * 1000));
      axNodes.forEach(function (n) {
        var lit = p >= parseFloat(n.dataset.at);
        n.style.background = lit ? '#FFFFFF' : '#2A2C44';
        n.style.boxShadow = lit ? '0 0 14px 4px rgba(159,230,255,.8)' : 'none';
      });
      if (p > 0.86) bloom();
    }
    if (stats && !counted && stats.getBoundingClientRect().top < vh * 0.9) {
      counted = true;
      countUp();
    }
  }
  if (wrap || stats) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* ---------- "Wait, really?" flip card ---------- */
  var facts = [
    "Your brain is about 2% of your body weight, but it uses around 20% of your energy.",
    "Brain tissue itself can't feel pain. That's why some brain surgeries are done while the patient is awake.",
    "You can't tickle yourself. Your brain predicts your own touch and turns the feeling down.",
    "Some nerve signals travel faster than 100 meters per second.",
    "Every time you remember something, your brain rebuilds the memory, and can change it a little.",
    "Your brain keeps working while you sleep, sorting and saving what you learned today."
  ];
  var flipCard = document.getElementById('flipCard');
  if (flipCard) {
    var flipped = false, seen = false, fi = 0;
    var inner = document.getElementById('flipInner');
    var factText = document.getElementById('factText');
    var factNo = document.getElementById('factNo');
    factText.textContent = facts[0];
    flipCard.addEventListener('click', function () {
      if (flipped) {
        flipped = false;
      } else {
        if (seen) fi = (fi + 1) % facts.length;
        seen = true;
        flipped = true;
        factText.textContent = facts[fi];
        factNo.textContent = fi + 1;
      }
      inner.style.transform = 'rotateY(' + (flipped ? 180 : 0) + 'deg)';
      chime(0.06);
    });
  }

  /* ---------- "What are you curious about tonight?" ---------- */
  var form = document.getElementById('thoughtForm');
  if (form) {
    var box = document.getElementById('thoughts');
    var note = document.getElementById('thoughtNote');
    var input = document.getElementById('thought');
    var tcount = 0;
    var tcols = [['#9FE6FF', 'rgba(159,230,255,.7)'], ['#C3B5F5', 'rgba(195,181,245,.7)'], ['#F2D58D', 'rgba(242,213,141,.7)'], ['#FFB6E1', 'rgba(255,182,225,.7)']];
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) return;
      var ang = (-150 + (tcount * 47) % 300) * Math.PI / 180;
      var rx = 210 + (tcount % 3) * 18, ry = 120 + (tcount % 2) * 20;
      var c = tcols[tcount % tcols.length];
      var x = Math.round((300 + Math.cos(ang) * rx) / 6), y = Math.round((190 + Math.sin(ang) * ry) / 3.6);

      var item = document.createElement('span');
      item.className = 'pop';
      item.style.cssText = 'position: absolute; left: ' + x + '%; top: ' + y + '%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 6px; max-width: 150px';
      var dot = document.createElement('span');
      dot.style.cssText = 'width: 10px; height: 10px; border-radius: 50%; background: ' + c[0] + '; box-shadow: 0 0 14px 5px ' + c[1];
      var label = document.createElement('span');
      label.style.cssText = 'font-size: 12px; line-height: 1.3; color: #F1EEF8; background: rgba(5,6,15,.75); padding: 3px 8px; border-radius: 8px';
      label.textContent = v;
      item.appendChild(dot);
      item.appendChild(label);
      box.appendChild(item);
      while (box.children.length > 8) box.removeChild(box.firstChild);

      tcount++;
      var n = box.children.length;
      note.textContent = 'You lit ' + n + ' new ' + (n === 1 ? 'connection' : 'connections') + '. Only you can see them.';
      input.value = '';
      bloom();
      chime(0.07);
    });
  }
})();
