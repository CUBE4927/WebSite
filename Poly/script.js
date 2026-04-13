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

function trimLeadingZeros(coeffs) {
  const out = coeffs.slice();
  while (out.length > 1 && out[0] === 0) out.shift();
  return out;
}

function polyDegree(coeffs) {
  const c = trimLeadingZeros(coeffs);
  if (c.length === 1 && c[0] === 0) return -Infinity;
  return c.length - 1;
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

  return trimLeadingZeros(coeffs);
}

function polyToString(coeffs) {
  const c = trimLeadingZeros(coeffs);
  if (c.length === 1 && c[0] === 0) return "0";

  let result = "";
  const deg = c.length - 1;

  for (let i = 0; i < c.length; i++) {
    const coef = c[i];
    if (coef === 0) continue;

    const exp = deg - i;
    const absCoef = Math.abs(coef);

    let term = "";
    if (exp === 0) {
      term = `${absCoef}`;
    } else if (exp === 1) {
      term = absCoef === 1 ? "x" : `${absCoef}x`;
    } else {
      term = absCoef === 1 ? `x^${exp}` : `${absCoef}x^${exp}`;
    }

    if (result === "") {
      result = coef < 0 ? `-${term}` : term;
    } else {
      result += coef < 0 ? ` - ${term}` : ` + ${term}`;
    }
  }

  return result;
}

function primitiveNormalize(coeffs) {
  const c = trimLeadingZeros(coeffs);
  if (c.length === 1 && c[0] === 0) return { content: 0, coeffs: [0] };

  const content = gcdArray(c);
  let out = c.map(v => v / content);

  if (out[0] < 0) {
    out = out.map(v => -v);
    return { content: -content, coeffs: out };
  }

  return { content, coeffs: out };
}

function evalPolyRational(coeffs, p, q) {
  let num = coeffs[0];
  let den = 1;

  for (let i = 1; i < coeffs.length; i++) {
    num = num * p + coeffs[i] * den * q;
    den *= q;
    const g = gcd(Math.abs(num), den);
    num /= g;
    den /= g;
  }

  return [num, den];
}

function candidateRationalRoots(coeffs) {
  const c = trimLeadingZeros(coeffs);
  const leading = c[0];
  const constant = c[c.length - 1];

  if (constant === 0) return [[0, 1]];

  const ps = divisors(constant);
  const qs = divisors(leading);
  const seen = new Set();
  const result = [];

  for (const p of ps) {
    for (const q of qs) {
      const a = reduceFraction(p, q);
      const b = reduceFraction(-p, q);
      const s1 = `${a[0]}/${a[1]}`;
      const s2 = `${b[0]}/${b[1]}`;

      if (!seen.has(s1)) {
        seen.add(s1);
        result.push(a);
      }
      if (!seen.has(s2)) {
        seen.add(s2);
        result.push(b);
      }
    }
  }

  result.sort((u, v) => u[0] / u[1] - v[0] / v[1]);
  return result;
}

function linearFactorStringFromRoot(p, q) {
  const [rn, rd] = reduceFraction(p, q);

  if (rn === 0) return "x";
  if (rd === 1) {
    return rn > 0 ? `(x - ${rn})` : `(x + ${-rn})`;
  }
  return `(${rd}x ${rn > 0 ? "-" : "+"} ${Math.abs(rn)})`;
}

function divideByLinearExact(coeffs, p, q) {
  // divide by (q x - p)
  const c = trimLeadingZeros(coeffs);
  const n = c.length - 1;
  if (n < 1) return null;

  const quotient = new Array(n);
  quotient[0] = c[0] / q;
  if (!Number.isInteger(quotient[0])) return null;

  for (let i = 1; i < n; i++) {
    const val = (c[i] + p * quotient[i - 1]) / q;
    if (!Number.isInteger(val)) return null;
    quotient[i] = val;
  }

  const remainder = c[n] + p * quotient[n - 1];
  if (remainder !== 0) return null;

  return trimLeadingZeros(quotient);
}

function dividePolynomialsExact(dividend, divisor) {
  let rem = trimLeadingZeros(dividend).slice();
  const div = trimLeadingZeros(divisor).slice();

  if (div.length === 1 && div[0] === 0) {
    throw new Error("0으로 나눌 수 없습니다.");
  }

  const n = rem.length - 1;
  const m = div.length - 1;
  if (n < m) return null;

  const q = new Array(n - m + 1).fill(0);

  while (rem.length >= div.length && !(rem.length === 1 && rem[0] === 0)) {
    const shift = rem.length - div.length;
    const leadRem = rem[0];
    const leadDiv = div[0];

    if (leadRem % leadDiv !== 0) return null;

    const factor = leadRem / leadDiv;
    q[shift] = factor;

    const sub = div.map(v => v * factor).concat(new Array(shift).fill(0));

    for (let i = 0; i < rem.length; i++) {
      rem[i] -= sub[i];
    }
    rem = trimLeadingZeros(rem);
  }

  if (!(rem.length === 1 && rem[0] === 0)) return null;

  return trimLeadingZeros(q.reverse());
}

function factorQuadraticOverQ(coeffs) {
  const c = trimLeadingZeros(coeffs);
  if (c.length !== 3) return null;

  const [a, b, d] = c;
  const D = b * b - 4 * a * d;
  if (D < 0) return null;

  const s = Math.round(Math.sqrt(D));
  if (s * s !== D) return null;

  const r1 = reduceFraction(-b + s, 2 * a);
  const r2 = reduceFraction(-b - s, 2 * a);
  return [r1, r2];
}

function factorCandidateToString(coeffs) {
  return `(${polyToString(coeffs)})`;
}

function integerRange(min, max) {
  const arr = [];
  for (let i = min; i <= max; i++) arr.push(i);
  return arr;
}

function getMonicFactorCandidates(poly, deg) {
  const c = trimLeadingZeros(poly);
  const constant = c[c.length - 1];
  const constDivs = constant === 0 ? [0] : divisors(constant);
  const signedConsts = [...new Set(constDivs.flatMap(v => [v, -v]))];

  const candidates = [];

  if (deg === 2) {
    for (const a of integerRange(-20, 20)) {
      for (const b of signedConsts) {
        candidates.push([1, a, b]);
      }
    }
  }

  if (deg === 3) {
    for (const a of integerRange(-20, 20)) {
      for (const b of integerRange(-20, 20)) {
        for (const d of signedConsts) {
          candidates.push([1, a, b, d]);
        }
      }
    }
  }

  return candidates;
}

function tryFindNonlinearFactor(poly, maxFactorDegree = 3) {
  const c = trimLeadingZeros(poly);
  if (c[0] !== 1) return null;

  for (let deg = 2; deg <= Math.min(maxFactorDegree, c.length - 2); deg++) {
    const candidates = getMonicFactorCandidates(c, deg);

    for (const cand of candidates) {
      const quotient = dividePolynomialsExact(c, cand);
      if (quotient) {
        return {
          factor: cand,
          quotient
        };
      }
    }
  }

  return null;
}

function factorPolynomial(coeffs) {
  const steps = [];
  const factors = [];

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
    steps.push(`계수들의 최대공약수 ${content} 를 분리했습니다.`);
  }

  while (poly.length > 1 && poly[poly.length - 1] === 0) {
    factors.push("x");
    poly = poly.slice(0, -1);
    steps.push("상수항이 0이므로 x 를 인수로 뽑았습니다.");
  }

  let changed = true;
  while (changed && poly.length > 1) {
    changed = false;

    // 1. rational linear factors
    const roots = candidateRationalRoots(poly);
    for (const [p, q] of roots) {
      const [num] = evalPolyRational(poly, p, q);
      if (num !== 0) continue;

      const quotient = divideByLinearExact(poly, p, q);
      if (!quotient) continue;

      factors.push(linearFactorStringFromRoot(p, q));
      steps.push(`유리근 ${fractionToString(p, q)} 를 찾아 ${linearFactorStringFromRoot(p, q)} 를 인수로 뽑았습니다.`);
      poly = quotient;
      changed = true;
      break;
    }
    if (changed) continue;

    // 2. quadratic directly
    if (poly.length === 3) {
      const quad = factorQuadraticOverQ(poly);
      if (quad) {
        const [r1, r2] = quad;
        factors.push(linearFactorStringFromRoot(r1[0], r1[1]));
        factors.push(linearFactorStringFromRoot(r2[0], r2[1]));
        steps.push("남은 2차식의 판별식이 완전제곱수이므로 1차식 둘로 분해했습니다.");
        poly = [1];
        changed = true;
        break;
      }
    }

    // 3. monic quadratic/cubic factor search
    const nonlinear = tryFindNonlinearFactor(poly, 3);
    if (nonlinear) {
      factors.push(factorCandidateToString(nonlinear.factor));
      steps.push(`선형인수가 없어서 작은 차수의 monic 인수 후보를 검사했고 ${factorCandidateToString(nonlinear.factor)} 를 찾았습니다.`);
      poly = nonlinear.quotient;
      changed = true;
    }
  }

  poly = trimLeadingZeros(poly);

  if (!(poly.length === 1 && poly[0] === 1)) {
    if (poly.length === 2) {
      factors.push(`(${polyToString(poly)})`);
      steps.push("남은 다항식은 1차식입니다.");
    } else if (poly.length === 3) {
      const quad = factorQuadraticOverQ(poly);
      if (quad) {
        const [r1, r2] = quad;
        factors.push(linearFactorStringFromRoot(r1[0], r1[1]));
        factors.push(linearFactorStringFromRoot(r2[0], r2[1]));
        steps.push("마지막 2차식의 판별식이 완전제곱수라서 더 분해했습니다.");
      } else {
        factors.push(`(${polyToString(poly)})`);
        steps.push("남은 2차식은 유리수 범위에서 기약입니다.");
      }
    } else {
      factors.push(`(${polyToString(poly)})`);
      steps.push(`남은 ${poly.length - 1}차 다항식은 현재 탐색 범위에서는 더 분해하지 않았습니다.`);
    }
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
