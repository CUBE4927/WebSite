function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

function gcdArray(arr) {
  let g = 0;
  for (const x of arr) g = gcd(g, x);
  return g;
}

function divisors(n) {
  n = Math.abs(n);
  if (n === 0) return [0];
  const result = new Set();
  for (let i = 1; i * i <= n; i++) {
    if (n % i === 0) {
      result.add(i);
      result.add(n / i);
    }
  }
  return [...result].sort((a, b) => a - b);
}

function reduceFraction(num, den) {
  if (den === 0) throw new Error("분모가 0입니다.");
  if (num === 0) return [0, 1];
  const g = gcd(num, den);
  num /= g;
  den /= g;
  if (den < 0) {
    num = -num;
    den = -den;
  }
  return [num, den];
}

function fractionToString(num, den) {
  const [n, d] = reduceFraction(num, den);
  return d === 1 ? `${n}` : `${n}/${d}`;
}

function parsePolynomial(input) {
  let s = input.replace(/\s+/g, "");
  if (!s) throw new Error("입력이 비어 있습니다.");

  if (s[0] !== "+" && s[0] !== "-") s = "+" + s;
  const terms = s.match(/[+\-][^+\-]+/g);
  if (!terms) throw new Error("다항식을 읽을 수 없습니다.");

  const coeffMap = new Map();

  for (const term of terms) {
    const sign = term[0] === "-" ? -1 : 1;
    const body = term.slice(1);

    let coeff = 0;
    let exp = 0;

    if (body.includes("x")) {
      const parts = body.split("x");
      const coeffPart = parts[0];
      const expPart = parts[1];

      if (coeffPart === "") coeff = 1;
      else coeff = parseInt(coeffPart, 10);

      if (Number.isNaN(coeff)) {
        throw new Error(`계수를 해석할 수 없습니다: ${term}`);
      }

      coeff *= sign;

      if (expPart === "") {
        exp = 1;
      } else {
        if (!expPart.startsWith("^")) {
          throw new Error(`지수를 해석할 수 없습니다: ${term}`);
        }
        exp = parseInt(expPart.slice(1), 10);
        if (Number.isNaN(exp) || exp < 0) {
          throw new Error(`지수가 올바르지 않습니다: ${term}`);
        }
      }
    } else {
      coeff = sign * parseInt(body, 10);
      exp = 0;
      if (Number.isNaN(coeff)) {
        throw new Error(`상수항을 해석할 수 없습니다: ${term}`);
      }
    }

    coeffMap.set(exp, (coeffMap.get(exp) || 0) + coeff);
  }

  const maxExp = Math.max(...coeffMap.keys());
  const coeffs = [];
  for (let e = maxExp; e >= 0; e--) {
    coeffs.push(coeffMap.get(e) || 0);
  }

  while (coeffs.length > 1 && coeffs[0] === 0) coeffs.shift();

  return coeffs;
}

function polyDegree(coeffs) {
  for (let i = 0; i < coeffs.length; i++) {
    if (coeffs[i] !== 0) return coeffs.length - 1 - i;
  }
  return -Infinity;
}

function polyToString(coeffs) {
  const deg = polyDegree(coeffs);
  if (deg === -Infinity) return "0";

  let result = "";
  for (let i = 0; i < coeffs.length; i++) {
    const c = coeffs[i];
    if (c === 0) continue;

    const e = coeffs.length - 1 - i;
    const absC = Math.abs(c);

    let term = "";
    if (e === 0) {
      term = `${absC}`;
    } else if (e === 1) {
      term = absC === 1 ? "x" : `${absC}x`;
    } else {
      term = absC === 1 ? `x^${e}` : `${absC}x^${e}`;
    }

    if (result === "") {
      result += c < 0 ? "-" + term : term;
    } else {
      result += c < 0 ? " - " + term : " + " + term;
    }
  }

  return result || "0";
}

function evaluateRational(coeffs, p, q) {
  const n = coeffs.length - 1;
  let sumNum = 0;
  let commonDen = 1;

  for (let i = 0; i <= n; i++) {
    const c = coeffs[i];
    const exp = n - i;

    const termNum = c * (p ** exp) * (commonDen === 1 ? 1 : 1);
    const termDen = q ** exp;

    const newDen = commonDen * termDen;
    sumNum = sumNum * termDen + termNum * commonDen;
    commonDen = newDen;

    const g = gcd(Math.abs(sumNum), commonDen);
    sumNum /= g;
    commonDen /= g;
  }

  return [sumNum, commonDen];
}

function syntheticDivideByLinear(coeffs, p, q) {
  // (qx - p) 로 나눔. 근은 p/q
  const n = coeffs.length - 1;
  const out = [coeffs[0]];

  for (let i = 1; i < coeffs.length; i++) {
    const next = q * coeffs[i] + p * out[i - 1];
    out.push(next);
  }

  const remainder = out[out.length - 1];
  out.pop();

  const quotient = out.map((v, idx) => {
    const power = n - 1 - idx;
    return v / (q ** (n - 1 - power));
  });

  return { rawQuotient: out, remainder };
}

function divideByRoot(coeffs, p, q) {
  // Horner 방식으로 root = p/q 처리
  const n = coeffs.length - 1;
  const b = [coeffs[0]];
  for (let i = 1; i <= n; i++) {
    const val = coeffs[i] * q + b[i - 1] * p;
    b.push(val);
  }

  const remainder = b[n];
  if (remainder !== 0) return null;

  const quotient = [];
  for (let i = 0; i < n; i++) {
    quotient.push(b[i] / (q ** (i + 1 - 1)));
  }

  // 위 quotient는 바로 쓸 수 없으니 안전하게 다시 계산
  const actual = [];
  let current = coeffs[0];
  actual.push(current);

  for (let i = 1; i < coeffs.length - 1; i++) {
    current = coeffs[i] + current * (p / q);
    if (!Number.isInteger(current)) {
      // 정수 계수 보장을 위해 다른 방식 사용
      return divideByLinearExact(coeffs, p, q);
    }
    actual.push(current);
  }

  return { quotient: actual, remainder: 0 };
}

function divideByLinearExact(coeffs, p, q) {
  // f(x) = (qx - p) * g(x) 를 정수계수 범위에서 처리
  // 실제로는 root = p/q가 근일 때, primitive 정수 다항식이면
  // 선형인수는 (qx - p) 꼴로 잡는 것이 자연스럽다.
  const n = coeffs.length - 1;
  const a = coeffs.slice();
  const g = new Array(n).fill(0);

  g[0] = a[0];
  for (let i = 1; i < n; i++) {
    const numerator = a[i] + p * g[i - 1];
    if (numerator % q !== 0) return null;
    g[i] = numerator / q;
  }

  const lastCheck = a[n] + p * g[n - 1];
  if (lastCheck !== 0) return null;

  return { quotient: g, remainder: 0 };
}

function primitiveNormalize(coeffs) {
  if (coeffs.every(c => c === 0)) return { content: 0, coeffs: [0] };

  const content = gcdArray(coeffs);
  let out = coeffs.map(c => c / content);

  if (out[0] < 0) {
    out = out.map(c => -c);
    return { content: -content, coeffs: out };
  }

  return { content, coeffs: out };
}

function candidateRationalRoots(coeffs) {
  const lead = coeffs[0];
  const constant = coeffs[coeffs.length - 1];

  if (constant === 0) {
    return [[0, 1]];
  }

  const pList = divisors(constant);
  const qList = divisors(lead);
  const set = new Set();

  for (const p of pList) {
    for (const q of qList) {
      const [rn, rd] = reduceFraction(p, q);
      set.add(`${rn}/${rd}`);
      set.add(`${-rn}/${rd}`);
    }
  }

  return [...set]
    .map(s => s.split("/").map(Number))
    .sort((a, b) => (a[0] / a[1]) - (b[0] / b[1]));
}

function isRoot(coeffs, p, q) {
  let value = 0;
  for (const c of coeffs) {
    value = value * (p / q) + c;
  }
  return Math.abs(value) < 1e-12;
}

function discriminantOfQuadratic(coeffs) {
  if (coeffs.length !== 3) return null;
  const [a, b, c] = coeffs;
  return b * b - 4 * a * c;
}

function isPerfectSquare(n) {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

function factorQuadraticOverQ(coeffs) {
  const [a, b, c] = coeffs;
  const D = b * b - 4 * a * c;
  if (D < 0 || !isPerfectSquare(D)) return null;

  const s = Math.round(Math.sqrt(D));
  const r1n = -b + s;
  const r2n = -b - s;
  const den = 2 * a;

  const f1 = reduceFraction(r1n, den);
  const f2 = reduceFraction(r2n, den);

  return [f1, f2];
}

function linearFactorStringFromRoot(p, q) {
  const [rn, rd] = reduceFraction(p, q);
  if (rn === 0) return "x";
  if (rd === 1) {
    return rn > 0 ? `(x - ${rn})` : `(x + ${-rn})`;
  }
  return `(${rd}x ${rn < 0 ? "+" : "-"} ${Math.abs(rn)})`;
}

function factorPolynomial(coeffs) {
  let steps = [];
  let factors = [];

  let { content, coeffs: poly } = primitiveNormalize(coeffs);

  if (content === 0) {
    return {
      normalized: [0],
      factors: ["0"],
      details: ["영다항식입니다."]
    };
  }

  if (Math.abs(content) !== 1) {
    factors.push(`${content}`);
    steps.push(`계수들의 최대공약수(content) ${content} 를 먼저 분리했습니다.`);
  }

  while (poly.length > 1 && poly[poly.length - 1] === 0) {
    factors.push("x");
    poly.pop();
    steps.push(`상수항이 0이므로 x 를 인수로 뽑았습니다.`);
  }

  while (poly.length > 1) {
    const candidates = candidateRationalRoots(poly);
    let found = false;

    for (const [p, q] of candidates) {
      if (!isRoot(poly, p, q)) continue;

      const division = divideByLinearExact(poly, p, q);
      if (!division) continue;

      factors.push(linearFactorStringFromRoot(p, q));
      steps.push(
        `유리근 ${fractionToString(p, q)} 를 찾았으므로 ${linearFactorStringFromRoot(p, q)} 를 인수로 뽑았습니다.`
      );

      poly = division.quotient;
      found = true;
      break;
    }

    if (!found) break;
  }

  if (poly.length === 1) {
    if (poly[0] !== 1) factors.push(`${poly[0]}`);
  } else if (poly.length === 2) {
    factors.push(`(${polyToString(poly)})`);
    steps.push(`남은 다항식은 1차식이므로 종료했습니다.`);
  } else if (poly.length === 3) {
    const qf = factorQuadraticOverQ(poly);
    if (qf) {
      const [r1, r2] = qf;
      factors.push(linearFactorStringFromRoot(r1[0], r1[1]));
      factors.push(linearFactorStringFromRoot(r2[0], r2[1]));
      steps.push(`남은 2차식의 판별식이 완전제곱수이므로 1차식 둘로 더 분해했습니다.`);
    } else {
      factors.push(`(${polyToString(poly)})`);
      steps.push(`남은 2차식은 유리수 범위에서 기약이므로 그대로 남겼습니다.`);
    }
  } else {
    factors.push(`(${polyToString(poly)})`);
    steps.push(`남은 ${poly.length - 1}차 다항식은 이 구현 범위에서는 더 분해하지 않았습니다.`);
  }

  return {
    normalized: coeffs,
    factors,
    details: steps
  };
}

function runFactorization() {
  const input = document.getElementById("inputPoly").value;
  const normalizedOutput = document.getElementById("normalizedOutput");
  const factorOutput = document.getElementById("factorOutput");
  const detailOutput = document.getElementById("detailOutput");

  try {
    const coeffs = parsePolynomial(input);
    const result = factorPolynomial(coeffs);

    normalizedOutput.textContent = polyToString(result.normalized);
    factorOutput.textContent = result.factors.join(" · ");
    detailOutput.textContent = result.details.join("\n");
  } catch (err) {
    normalizedOutput.textContent = "";
    factorOutput.textContent = "오류";
    detailOutput.textContent = err.message;
  }
}

document.getElementById("factorBtn").addEventListener("click", runFactorization);
window.addEventListener("load", runFactorization);
