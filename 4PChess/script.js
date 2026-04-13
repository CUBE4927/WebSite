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
