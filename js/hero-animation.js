(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const logo = new Image();
  logo.src = canvas.dataset.logo || 'img/logo-erveca.png';
  let logoLoaded = false;
  logo.onload = () => { logoLoaded = true; };
  logo.onerror = () => { logoLoaded = false; };

  const palette = ['#b84a2e', '#c8922a', '#5a6e52', '#ede6d4', '#1a1610'];

  let width, height, dpr;
  let patches = [];
  let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initPatches();
  }

  function initPatches() {
    const count = width < 600 ? 9 : 16;
    patches = [];
    const minDim = Math.min(width, height);

    for (let i = 0; i < count; i++) {
      const size = minDim * (0.08 + Math.random() * 0.09);
      patches.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.0006,
        driftX: (Math.random() - 0.5) * 0.06,
        driftY: (Math.random() - 0.5) * 0.06,
        color: palette[Math.floor(Math.random() * palette.length)],
        opacity: 0.08 + Math.random() * 0.14,
        phase: Math.random() * Math.PI * 2,
        floatSpeed: 0.0004 + Math.random() * 0.0006
      });
    }
  }

  function drawPatch(p, t) {
    const floatY = Math.sin(t * p.floatSpeed + p.phase) * 10;
    const x = p.x + floatY * 0.3;
    const y = p.y + floatY;
    const rot = p.rotation + t * p.rotationSpeed;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;

    const s = p.size;
    const cut = s * 0.18;
    ctx.beginPath();
    ctx.moveTo(-s / 2 + cut, -s / 2);
    ctx.lineTo(s / 2, -s / 2);
    ctx.lineTo(s / 2, s / 2 - cut);
    ctx.lineTo(s / 2 - cut, s / 2);
    ctx.lineTo(-s / 2, s / 2);
    ctx.lineTo(-s / 2, -s / 2 + cut);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = p.opacity * 1.4;
    ctx.strokeStyle = '#1a1610';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    ctx.restore();
  }

  function drawLogo(t) {
    if (!logoLoaded) return;

    const pulse = 1 + Math.sin(t * 0.0005) * 0.015;
    const baseSize = Math.min(width, height) * 0.34;
    const w = baseSize * pulse;
    const h = (logo.height / logo.width) * w || w;

    ctx.save();
    ctx.globalAlpha = 0.96;
    ctx.translate(width / 2, height / 2);

    const gradient = ctx.createRadialGradient(0, 0, w * 0.2, 0, 0, w * 0.85);
    gradient.addColorStop(0, 'rgba(200,146,42,0.18)');
    gradient.addColorStop(1, 'rgba(200,146,42,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.85, 0, Math.PI * 2);
    ctx.fill();

    ctx.drawImage(logo, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function frame(t) {
    ctx.clearRect(0, 0, width, height);

    patches.forEach(p => drawPatch(p, t));
    drawLogo(t);

    if (!reduceMotion) {
      requestAnimationFrame(frame);
    }
  }

  function start() {
    resize();
    if (reduceMotion) {
      frame(0);
    } else {
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener('resize', () => {
    resize();
  });

  if (logo.complete && logo.naturalWidth) {
    logoLoaded = true;
  }

  start();
})();