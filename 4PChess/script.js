const svg = document.getElementById("board");

const SIZE = 900;
const CENTER = SIZE / 2;
const SCALE = 95;

// 보드 범위: |f|<=4, |g|<=4
const MAX_F = 4;
const MAX_G = 4;

// 화면 좌표 변환
function toScreen(x, y) {
  return {
    x: CENTER + x * SCALE,
    y: CENTER - y * SCALE
  };
}

function makePath(points) {
  if (points.length === 0) return "";

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

function appendPath(points) {
  if (points.length < 2) return;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", makePath(points));
  path.setAttribute("class", "board-line");
  svg.appendChild(path);
}

// 조건이 끊기는 부분에서 path를 분리해서 그림
function drawSegmentedCurve(samplePoints, isValid) {
  let currentSegment = [];

  for (const p of samplePoints) {
    if (isValid(p.x, p.y)) {
      currentSegment.push(toScreen(p.x, p.y));
    } else {
      appendPath(currentSegment);
      currentSegment = [];
    }
  }

  appendPath(currentSegment);
}

// f = x^2 - y^2 = k
// 단, |g| = |2xy| <= 4 인 부분만 그림
function drawFCurve(k) {
  const branches = [[], []];

  for (let x = -6; x <= 6; x += 0.01) {
    const val = x * x - k;
    if (val < 0) continue;

    const y = Math.sqrt(val);
    branches[0].push({ x, y });
    branches[1].push({ x, y: -y });
  }

  for (const branch of branches) {
    drawSegmentedCurve(
      branch,
      (x, y) => Math.abs(2 * x * y) <= MAX_G + 1e-9
    );
  }
}

// g = 2xy = k
// 단, |f| = |x^2 - y^2| <= 4 인 부분만 그림
function drawGCurve(k) {
  const left = [];
  const right = [];

  for (let x = -6; x <= -0.02; x += 0.01) {
    const y = k / (2 * x);
    left.push({ x, y });
  }

  for (let x = 0.02; x <= 6; x += 0.01) {
    const y = k / (2 * x);
    right.push({ x, y });
  }

  drawSegmentedCurve(
    left,
    (x, y) => Math.abs(x * x - y * y) <= MAX_F + 1e-9
  );

  drawSegmentedCurve(
    right,
    (x, y) => Math.abs(x * x - y * y) <= MAX_F + 1e-9
  );
}

// f = -4 ~ 4
for (let k = -MAX_F; k <= MAX_F; k++) {
  drawFCurve(k);
}

// g = -4 ~ 4
for (let k = -MAX_G; k <= MAX_G; k++) {
  drawGCurve(k);
}
