const svg = document.getElementById("board");
const SIZE = 800;
const SCALE = 80; // 좌표 스케일

function toScreen(x, y) {
  return {
    x: SIZE / 2 + x * SCALE,
    y: SIZE / 2 - y * SCALE
  };
}

// f = x^2 - y^2 = k
function drawFCurve(k) {
  let path = "";

  for (let x = -5; x <= 5; x += 0.05) {
    let y = Math.sqrt(Math.abs(x * x - k));
    if (!isNaN(y)) {
      let p1 = toScreen(x, y);
      let p2 = toScreen(x, -y);

      path += `M ${p1.x} ${p1.y} `;
      path += `L ${p2.x} ${p2.y} `;
    }
  }

  let elem = document.createElementNS("http://www.w3.org/2000/svg", "path");
  elem.setAttribute("d", path);
  elem.setAttribute("class", "curve-f");
  svg.appendChild(elem);
}

// g = 2xy = k
function drawGCurve(k) {
  let path = "";

  for (let x = -5; x <= 5; x += 0.05) {
    let y = k / (2 * x);
    if (!isNaN(y) && Math.abs(y) < 10) {
      let p = toScreen(x, y);
      path += (path === "" ? "M" : "L") + ` ${p.x} ${p.y}`;
    }
  }

  let elem = document.createElementNS("http://www.w3.org/2000/svg", "path");
  elem.setAttribute("d", path);
  elem.setAttribute("class", "curve-g");
  svg.appendChild(elem);
}

// 여러 곡선 그리기
for (let k = -4; k <= 4; k++) {
  if (k !== 0) {
    drawFCurve(k);
    drawGCurve(k);
  }
}
