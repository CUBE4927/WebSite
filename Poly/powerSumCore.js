// powerSumCore.js
// 1^n + 2^n + ... + x^n 의 다항식을 만들고
// primitive 정수계수 다항식까지 변환하는 코어 모듈

export class Fraction {
  constructor(n, d = 1) {
    if (!Number.isInteger(n) || !Number.isInteger(d)) {
      throw new Error("Fraction requires integer numerator and denominator.");
    }
    if (d === 0) throw new Error("Division by zero.");
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = Fraction.gcd(Math.abs(n), Math.abs(d));
    this.n = n / g;
    this.d = d / g;
  }

  static gcd(a, b) {
    while (b !== 0) [a, b] = [b, a % b];
    return a;
  }

  static lcm(a, b) {
    if (a === 0 || b === 0) return 0;
    return Math.abs((a / Fraction.gcd(a, b)) * b);
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
    if (o.n === 0) throw new Error("Division by zero fraction.");
    return new Fraction(this.n * o.d, this.d * o.n);
  }

  neg() {
    return new Fraction(-this.n, this.d);
  }

  isZero() {
    return this.n === 0;
  }

  equals(o) {
    return this.n === o.n && this.d === o.d;
  }

  clone() {
    return new Fraction(this.n, this.d);
  }

  toString() {
    return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`;
  }
}

export function binom(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
  }
  return Math.round(result);
}

export function bernoulliNumbers(maxN) {
  const A = new Array(maxN + 1);
  const B = new Array(maxN + 1);

  for (let m = 0; m <= maxN; m++) {
    A[m] = new Fraction(1, m + 1);
    for (let j = m; j >= 1; j--) {
      A[j - 1] = new Fraction(j, 1).mul(A[j - 1].sub(A[j]));
    }
    B[m] = A[0];
  }
  return B;
}

// coeffs[i] = coefficient of x^i
export function polyTrimFraction(coeffs) {
  const c = coeffs.slice();
  while (c.length > 1 && c[c.length - 1].isZero()) c.pop();
  return c;
}

export function polyTrimInt(coeffs) {
  const c = coeffs.slice();
  while (c.length > 1 && c[c.length - 1] === 0) c.pop();
  return c;
}

export function polyDegree(coeffs) {
  return coeffs.length - 1;
}

export function polyToStringFraction(coeffs, variable = "x") {
  coeffs = polyTrimFraction(coeffs);
  const terms = [];

  for (let deg = coeffs.length - 1; deg >= 0; deg--) {
    const c = coeffs[deg];
    if (c.isZero()) continue;

    const sign = c.n < 0 ? "-" : "+";
    const absC = new Fraction(Math.abs(c.n), c.d);

    let core;
    if (deg === 0) {
      core = absC.toString();
    } else {
      const coeffStr = absC.equals(new Fraction(1, 1)) ? "" : absC.toString();
      core = deg === 1 ? `${coeffStr}${variable}` : `${coeffStr}${variable}^${deg}`;
    }

    terms.push({ sign, core });
  }

  if (terms.length === 0) return "0";

  let out = "";
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    out += i === 0
      ? (t.sign === "-" ? "-" : "") + t.core
      : ` ${t.sign} ${t.core}`;
  }
  return out;
}

export function polyToStringInt(coeffs, variable = "x") {
  coeffs = polyTrimInt(coeffs);
  const terms = [];

  for (let deg = coeffs.length - 1; deg >= 0; deg--) {
    const c = coeffs[deg];
    if (c === 0) continue;

    const sign = c < 0 ? "-" : "+";
    const absC = Math.abs(c);

    let core;
    if (deg === 0) {
      core = `${absC}`;
    } else {
      const coeffStr = absC === 1 ? "" : `${absC}`;
      core = deg === 1 ? `${coeffStr}${variable}` : `${coeffStr}${variable}^${deg}`;
    }

    terms.push({ sign, core });
  }

  if (terms.length === 0) return "0";

  let out = "";
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    out += i === 0
      ? (t.sign === "-" ? "-" : "") + t.core
      : ` ${t.sign} ${t.core}`;
  }
  return out;
}

// S_n(x) = sum_{k=1}^x k^n
export function powerSumPolynomial(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("n must be a nonnegative integer.");
  }

  const B = bernoulliNumbers(n);
  const coeffs = Array(n + 2).fill(null).map(() => new Fraction(0, 1));

  for (let j = 0; j <= n; j++) {
    const coeff = new Fraction(binom(n + 1, j), 1)
      .mul(B[j])
      .div(new Fraction(n + 1, 1));
    const deg = n + 1 - j;
    coeffs[deg] = coeffs[deg].add(coeff);
  }

  return polyTrimFraction(coeffs);
}

export function gcdArray(arr) {
  let g = 0;
  for (const v of arr) {
    g = Fraction.gcd(Math.abs(g), Math.abs(v));
  }
  return g;
}

// rational polynomial = scalar * primitive integer polynomial
export function rationalPolyToPrimitiveInteger(coeffs) {
  coeffs = polyTrimFraction(coeffs);

  let lcmDen = 1;
  for (const c of coeffs) {
    lcmDen = Fraction.lcm(lcmDen, c.d);
  }

  let intCoeffs = coeffs.map(c => c.n * (lcmDen / c.d));
  intCoeffs = polyTrimInt(intCoeffs);

  const nonzero = intCoeffs.filter(v => v !== 0);
  const g = nonzero.length ? gcdArray(nonzero) : 1;

  intCoeffs = intCoeffs.map(v => v / g);
  intCoeffs = polyTrimInt(intCoeffs);

  if (intCoeffs[intCoeffs.length - 1] < 0) {
    intCoeffs = intCoeffs.map(v => -v);
    return {
      scalar: new Fraction(-g, lcmDen),
      primitivePoly: intCoeffs
    };
  }

  return {
    scalar: new Fraction(g, lcmDen),
    primitivePoly: intCoeffs
  };
}

export function buildPowerSumPrimitive(n) {
  const rationalPoly = powerSumPolynomial(n);
  const { scalar, primitivePoly } = rationalPolyToPrimitiveInteger(rationalPoly);

  return {
    n,
    rationalPoly,
    rationalPolyString: polyToStringFraction(rationalPoly),
    scalar,
    primitivePoly,
    primitivePolyString: polyToStringInt(primitivePoly)
  };
}
