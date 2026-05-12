// visualize.js
// Color and vector-field visualization helpers.

function clamp01(x) {
  return Math.min(Math.max(x, 0), 1);
}

// A bijection from [0, Infinity) to [0, 1).
// Name: unitSaturate
// It behaves like a soft normalized magnitude.
function unitSaturate(x) {
  x = Math.max(0, x);
  return x / (1 + x);
}

function hueEq(x, o) {
  return clamp01(2 - Math.abs(x - o));
}

function opaEq(x, o) {
  return clamp01(1 - Math.abs(x - o));
}

function fieldColor(T, rho) {
  const aT = unitSaturate(T);
  const aRho = unitSaturate(rho);

  const h = 4 * aT;

  const baseR = hueEq(h, 4);
  const baseG = hueEq(h, 2);
  const baseB = hueEq(h, 0);

  const whiteW = opaEq(aRho, 2); // usually 0 because a(rho) < 1
  const baseW = opaEq(aRho, 1);
  const blackW = opaEq(aRho, 0);

  const r = whiteW * 1 + baseW * baseR + blackW * 0;
  const g = whiteW * 1 + baseW * baseG + blackW * 0;
  const b = whiteW * 1 + baseW * baseB + blackW * 0;

  return [
    Math.round(255 * clamp01(r)),
    Math.round(255 * clamp01(g)),
    Math.round(255 * clamp01(b)),
    255
  ];
}

function drawPixelMode(ctx, sim, imageData) {
  const N = sim.N;
  const data = imageData.data;

  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const k = i + j * N;
      const p = 4 * k;
      const [r, g, b, a] = fieldColor(sim.T[k], sim.rho[k]);

      data[p + 0] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = a;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawArrow(ctx, x, y, vx, vy, scale) {
  const speed = Math.hypot(vx, vy);
  if (speed < 1e-6) return;

  const ex = x + vx * scale;
  const ey = y + vy * scale;

  const angle = Math.atan2(vy, vx);
  const head = Math.min(5, 2 + speed * scale * 0.15);
  const a1 = angle + Math.PI * 0.78;
  const a2 = angle - Math.PI * 0.78;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.lineTo(ex + Math.cos(a1) * head, ey + Math.sin(a1) * head);
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex + Math.cos(a2) * head, ey + Math.sin(a2) * head);
  ctx.stroke();
}

function drawArrowMode(ctx, sim, imageData, {
  spacing = 12,
  arrowScale = 120,
  background = true
} = {}) {
  const N = sim.N;

  if (background) {
    drawPixelMode(ctx, sim, imageData);
  } else {
    ctx.clearRect(0, 0, N, N);
  }

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";

  for (let j = Math.floor(spacing / 2); j < N; j += spacing) {
    for (let i = Math.floor(spacing / 2); i < N; i += spacing) {
      const k = i + j * N;
      drawArrow(ctx, i, j, sim.vx[k], sim.vy[k], arrowScale);
    }
  }

  ctx.restore();
}
