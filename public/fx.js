// Drifting sakura petals, the dynamic layer over the blurred photo
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var canvas = document.createElement('canvas');
  canvas.id = 'fx';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var petals = [];
  var COUNT = 22;
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  function make(seed) {
    return {
      x: Math.random() * canvas.width,
      y: seed ? Math.random() * canvas.height : -24,
      r: 5 + Math.random() * 7,
      vy: 0.35 + Math.random() * 0.5,
      ph: Math.random() * Math.PI * 2,
      sp: 0.004 + Math.random() * 0.006,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.01,
      a: 0.22 + Math.random() * 0.28,
    };
  }
  for (var i = 0; i < COUNT; i++) petals.push(make(true));
  function isDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var dark = isDark();
    for (var i = 0; i < petals.length; i++) {
      var p = petals[i];
      p.ph += p.sp;
      p.x += Math.sin(p.ph) * 0.6 + 0.15;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > canvas.height + 24) { petals[i] = make(false); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = dark
        ? 'rgba(240, 160, 184, ' + (p.a * 0.5).toFixed(3) + ')'
        : 'rgba(214, 120, 150, ' + p.a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
