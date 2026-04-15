// squareFreeFactor.js
// 정수계수 다항식의 square-free decomposition
// coeffs[i] = x^i 의 계수

import { polyTrimInt, gcdArray } from "./powerSumCore.js";

function abs(n) {
  return Math.abs(n);
}

function gcd(a, b) {
  a = abs(a);
  b = abs(b);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function polyDegreeInt(poly) {
  return polyTrimInt(poly).length - 1;
}

function polyIsZero(poly) {
  poly = polyTrimInt(poly);
  return poly.length === 1 && poly[0] === 0;
}

function polyLeading(poly) {
  poly = polyTrimInt(poly);
  return poly[poly.length - 1];
}

function polyContent(poly) {
  poly = polyTrimInt(poly);
  const nz = poly.filter(v => v !== 0);
  if (nz.length === 0) return 0;
  return gcdArray(nz);
}

function polyPrimitivePart(poly) {
  poly = polyTrimInt(poly);

  if (polyIsZero(poly)) return [0];

  const c = polyContent(poly);
  let out = poly.map(v => v / c);
  out = polyTrimInt(out);

  if (polyLeading(out) < 0) {
    out = out.map(v => -v);
  }

  return out;
}

function polyDerivative(poly) {
  poly = polyTrimInt(poly);
  if (poly.length <= 1) return [0];

  const out = Array(poly.length - 1).fill(0);
  for (let i = 1; i < poly.length; i++) {
    out[i - 1] = i * poly[i];
  }
  return polyTrimInt(out);
}

function polyScale(poly, k) {
  return polyTrimInt(poly.map(v => v * k));
}

function polySub(a, b) {
  const n = Math.max(a.length, b.length);
  const out = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    out[i] = (a[i] || 0) - (b[i] || 0);
  }
  return polyTrimInt(out);
}

// pseudo remainder over Z[x]:
// prem(A,B) = lc(B)^(degA-degB+1) * A mod B 방식 대신
// 여기선 exact gcd 계산용으로 Q[x] division을 써서 처리
class Fraction {
  constructor(n, d = 1) {
    if (d === 0) throw new Error("Division by zero");
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(abs(n), abs(d));
    this.n = n / g;
    this.d = d / g;
  }

  add(o) {
    return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
  }

  sub(o) {
    return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d);
  }

  mul(o) {
    return new Fraction(this.n * o.n, this.d * o.d);
  }

  div(o) {
    return new Fraction(this.n * o.d, this.d * o.n);
  }

  isZero() {
    return this.n === 0;
  }
}

function fractionPolyTrim(poly) {
  const out = poly.slice();
  while (out.length > 1 && out[out.length - 1].isZero()) out.pop();
  return out;
}

function fractionPolyIsZero(poly) {
  poly = fractionPolyTrim(poly);
  return poly.length === 1 && poly[0].isZero();
}

function polyDivmodQ(A, B) {
  A = polyTrimInt(A);
  B = polyTrimInt(B);

  if (polyIsZero(B)) throw new Error("Division by zero polynomial");

  const degA = polyDegreeInt(A);
  const degB = polyDegreeInt(B);

  const r = A.map(v => new Fraction(v, 1));
  const q = Array(Math.max(0, degA - degB + 1)).fill(null).map(() => new Fraction(0, 1));

  if (degA < degB) {
    return { q, r };
  }

  const leadB = new Fraction(polyLeading(B), 1);

  for (let k = degA - degB; k >= 0; k--) {
    const coeff = r[degB + k].div(leadB);
    q[k] = coeff;

    if (!coeff.isZero()) {
      for (let j = 0; j <= degB; j++) {
        r[j + k] = r[j + k].sub(coeff.mul(new Fraction(B[j], 1)));
      }
    }
  }

  return {
    q: fractionPolyTrim(q),
    r: fractionPolyTrim(r)
  };
}

function fractionPolyToPrimitiveInt(poly) {
  poly = fractionPolyTrim(poly);

  let lcmDen = 1;
  for (const c of poly) {
    lcmDen = Math.abs((lcmDen / gcd(lcmDen, c.d)) * c.d);
  }

  let ints = poly.map(c => c.n * (lcmDen / c.d));
  ints = polyTrimInt(ints);

  if (ints.length === 1 && ints[0] === 0) return [0];

  const cont = polyContent(ints);
  ints = ints.map(v => v / cont);
  ints = polyTrimInt(ints);

  if (polyLeading(ints) < 0) {
    ints = ints.map(v => -v);
  }

  return ints;
}

function polyExactDivideInt(dividend, divisor) {
  const { q, r } = polyDivmodQ(dividend, divisor);
  if (!fractionPolyIsZero(r)) return null;
  return fractionPolyToPrimitiveInt(q);
}

function polyGcdInt(a, b) {
  a = polyPrimitivePart(a);
  b = polyPrimitivePart(b);

  if (polyIsZero(a)) return b;
  if (polyIsZero(b)) return a;

  while (!polyIsZero(b)) {
    const { r } = polyDivmodQ(a, b);
    a = b;
    b = fractionPolyToPrimitiveInt(r);
  }

  return polyPrimitivePart(a);
}

export function squareFreeFactorization(poly) {
  poly = polyTrimInt(poly);

  if (polyIsZero(poly)) {
    return {
      content: 0,
      primitivePoly: [0],
      factors: []
    };
  }

  const content = polyContent(poly);
  const primitivePoly = polyPrimitivePart(poly);

  if (polyDegreeInt(primitivePoly) <= 0) {
    return {
      content,
      primitivePoly,
      factors: [{ poly: primitivePoly, power: 1 }]
    };
  }

  const deriv = polyDerivative(primitivePoly);
  const g = polyGcdInt(primitivePoly, deriv);
  let w = polyExactDivideInt(primitivePoly, g);

  if (!w) {
    return {
      content,
      primitivePoly,
      factors: [{ poly: primitivePoly, power: 1 }]
    };
  }

  let y = g;
  const factors = [];
  let i = 1;

  while (polyDegreeInt(w) > 0) {
    const z = polyGcdInt(w, y);
    const fi = polyExactDivideInt(w, z);

    if (!fi) break;

    if (!(fi.length === 1 && fi[0] === 1)) {
      factors.push({
        poly: polyPrimitivePart(fi),
        power: i
      });
    }

    w = z;

    const nextY = polyExactDivideInt(y, z);
    y = nextY ? nextY : [1];

    i++;

    if (polyDegreeInt(w) === 0) break;
  }

  if (factors.length === 0) {
    factors.push({
      poly: primitivePoly,
      power: 1
    });
  }

  return {
    content,
    primitivePoly,
    factors
  };
}
