// rationalRootFactor.js
// primitive 정수계수 다항식에서 유리근 정리로 선형 인수 제거

import { Fraction, polyTrimInt, polyToStringInt } from "./powerSumCore.js";

export function divisors(n) {
  n = Math.abs(n);
  if (n === 0) return [0];

  const out = new Set();
  for (let i = 1; i * i <= n; i++) {
    if (n % i === 0) {
      out.add(i);
      out.add(n / i);
    }
  }
  return Array.from(out).sort((a, b) => a - b);
}

export function polyEvalInt(coeffs, x) {
  let result = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    result = result * x + coeffs[i];
  }
  return result;
}

// (a x - b) 로 나눔. root = b/a
// coeffs[i] = x^i coefficient
export function divideByAxMinusBInt(coeffs, a, b) {
  coeffs = polyTrimInt(coeffs);
  const deg = coeffs.length - 1;
  if (deg < 1) return null;

  const q = Array(deg).fill(0);

  if (coeffs[deg] % a !== 0) return null;
  q[deg - 1] = coeffs[deg] / a;

  for (let k = deg - 1; k >= 1; k--) {
    const num = coeffs[k] + b * q[k];
    if (num % a !== 0) return null;
    q[k - 1] = num / a;
  }

  const remainder = coeffs[0] + b * q[0];
  if (remainder !== 0) return null;

  return polyTrimInt(q);
}

// factor poly represented as integer coeff array
// ex) x      -> [0,1]
//     x+1    -> [1,1]
//     2x+1   -> [1,2]
export function factorPolyKey(poly) {
  return JSON.stringify(polyTrimInt(poly));
}

export function addFactor(factors, poly, power = 1) {
  const key = factorPolyKey(poly);
  for (const f of factors) {
    if (f.key === key) {
      f.power += power;
      return;
    }
  }
  factors.push({
    key,
    poly: polyTrimInt(poly),
    power
  });
}

export function factorListToString(scalar, factors, remainder = null) {
  const parts = [];

  if (!(scalar.n === 1 && scalar.d === 1)) {
    parts.push(scalar.toString());
  }

  for (const f of factors) {
    const p = `(${polyToStringInt(f.poly)})`;
    parts.push(f.power === 1 ? p : `${p}^${f.power}`);
  }

  if (remainder) {
    const rem = polyTrimInt(remainder);
    if (!(rem.length === 1 && rem[0] === 1)) {
      parts.push(`(${polyToStringInt(rem)})`);
    }
  }

  return parts.length ? parts.join(" * ") : "1";
}

// primitive integer poly에 대해 모든 유리근 제거
export function extractRationalLinearFactors(primitivePoly) {
  let poly = polyTrimInt(primitivePoly);
  const factors = [];

  if (poly.length === 1) {
    return {
      factors,
      remainingPoly: poly
    };
  }

  while (poly.length > 1) {
    const c0 = poly[0];
    const lead = poly[poly.length - 1];

    if (c0 === 0) {
      addFactor(factors, [0, 1], 1); // x
      poly = poly.slice(1);
      poly = polyTrimInt(poly);
      continue;
    }

    const pDivs = divisors(c0);
    const qDivs = divisors(lead);

    let found = false;

    outer:
    for (const p of pDivs) {
      for (const q of qDivs) {
        for (const sign of [-1, 1]) {
          const num = sign * p;
          const den = q;

          const g = Fraction.gcd(Math.abs(num), Math.abs(den));
          const b = num / g;
          const a = den / g;

          const quotient = divideByAxMinusBInt(poly, a, b);
          if (quotient) {
            addFactor(factors, [-b, a], 1); // a x - b
            poly = quotient;
            found = true;
            break outer;
          }
        }
      }
    }

    if (!found) break;
  }

  return {
    factors,
    remainingPoly: polyTrimInt(poly)
  };
}
