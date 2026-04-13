const svg = document.getElementById("board");

const SIZE = 900;
const CENTER = SIZE / 2;
const SCALE = 95;

const MAX_F = 4;
const MAX_G = 4;

const F_LEVELS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const G_LEVELS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

function toScreen(x, y) {
  return {
    x: CENTER + x * SCALE,
    y: CENTER - y * SCALE
  };
}

function makePath(points) {
  if (points.length < 2) return "";

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

function appendPath(points, isBoundary = false) {
  if (points.length < 2) return;

  const d = makePath(points);
  if (!d) return;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute(
    "class",
    isBoundary ? "board-line board-boundary" : "board-line"
  );
  svg.appendChild(path);
}

function drawSegmentedCurve(samplePoints, isValid, isBoundary = false) {
  let currentSegment = [];

  for (const p of samplePoints) {
    if (isValid(p.x, p.y)) {
      currentSegment.push(toScreen(p.x, p.y));
    } else {
      appendPath(currentSegment, isBoundary);
      currentSegment = [];
    }
  }

  appendPath(currentSegment, isBoundary);
}

// f = x^2 - y^2 = k
// 단, |2xy| <= 4 인 부분만 그림
function drawFCurve(k) {
  const isBoundary = Math.abs(k) === MAX_F;

  // k = 0 -> y = x, y = -x
  if (k === 0) {
    const diag1 = [];
    const diag2 = [];

    for (let x = -6; x <= 6; x += 0.01) {
      diag1.push({ x, y: x });
      diag2.push({ x, y: -x });
    }

    drawSegmentedCurve(
      diag1,
      (x, y) => Math.abs(2 * x * y) <= MAX_G + 1e-9,
      isBoundary
    );

    drawSegmentedCurve(
      diag2,
      (x, y) => Math.abs(2 * x * y) <= MAX_G + 1e-9,
      isBoundary
    );

    return;
  }

  // k > 0 -> |x| >= sqrt(k) 에서만 정의
  if (k > 0) {
    const topLeft = [];
    const bottomLeft = [];
    const topRight = [];
    const bottomRight = [];

    const minAbsX = Math.sqrt(k);

    for (let x = -6; x <= -minAbsX; x += 0.01) {
      const y = Math.sqrt(x * x - k);
      topLeft.push({ x, y });
      bottomLeft.push({ x, y: -y });
    }

    for (let x = minAbsX; x <= 6; x += 0.01) {
      const y = Math.sqrt(x * x - k);
      topRight.push({ x, y });
      bottomRight.push({ x, y: -y });
    }

    for (const branch of [topLeft, bottomLeft, topRight, bottomRight]) {
      drawSegmentedCurve(
        branch,
        (x, y) => Math.abs(2 * x * y) <= MAX_G + 1e-9,
        isBoundary
      );
    }

    return;
  }

  // k < 0 -> y = ±sqrt(x^2 + |k|)
  const a = -k;
  const top = [];
  const bottom = [];

  for (let x = -6; x <= 6; x += 0.01) {
    const y = Math.sqrt(x * x + a);
    top.push({ x, y });
    bottom.push({ x, y: -y });
  }

  drawSegmentedCurve(
    top,
    (x, y) => Math.abs(2 * x * y) <= MAX_G + 1e-9,
    isBoundary
  );

  drawSegmentedCurve(
    bottom,
    (x, y) => Math.abs(2 * x * y) <= MAX_G + 1e-9,
    isBoundary
  );
}

  drawSegmentedCurve(
    branchTop,
    (x, y) => Math.abs(2 * x * y) <= MAX_G + 1e-9,
    isBoundary
  );

  drawSegmentedCurve(
    branchBottom,
    (x, y) => Math.abs(2 * x * y) <= MAX_G + 1e-9,
    isBoundary
  );
}

// g = 2xy = k
// 단, |x^2 - y^2| <= 4 인 부분만 그림
function drawGCurve(k) {
  const isBoundary = Math.abs(k) === MAX_G;

  if (k === 0) {
    const xAxis = [];
    const yAxis = [];

    for (let x = -6; x <= 6; x += 0.01) {
      xAxis.push({ x, y: 0 });
    }

    for (let y = -6; y <= 6; y += 0.01) {
      yAxis.push({ x: 0, y });
    }

    drawSegmentedCurve(
      xAxis,
      (x, y) => Math.abs(x * x - y * y) <= MAX_F + 1e-9,
      isBoundary
    );

    drawSegmentedCurve(
      yAxis,
      (x, y) => Math.abs(x * x - y * y) <= MAX_F + 1e-9,
      isBoundary
    );

    return;
  }

  const leftBranch = [];
  const rightBranch = [];

  for (let x = -6; x <= -0.1; x += 0.01) {
    const y = k / (2 * x);
    if (!Number.isFinite(y)) continue;
    if (Math.abs(y) > 6) continue;
    leftBranch.push({ x, y });
  }

  for (let x = 0.1; x <= 6; x += 0.01) {
    const y = k / (2 * x);
    if (!Number.isFinite(y)) continue;
    if (Math.abs(y) > 6) continue;
    rightBranch.push({ x, y });
  }

  drawSegmentedCurve(
    leftBranch,
    (x, y) => Math.abs(x * x - y * y) <= MAX_F + 1e-9,
    isBoundary
  );

  drawSegmentedCurve(
    rightBranch,
    (x, y) => Math.abs(x * x - y * y) <= MAX_F + 1e-9,
    isBoundary
  );
}

function drawBoard() {
  svg.innerHTML = "";

  for (const k of F_LEVELS) {
    drawFCurve(k);
  }

  for (const k of G_LEVELS) {
    drawGCurve(k);
  }
}

drawBoard();
