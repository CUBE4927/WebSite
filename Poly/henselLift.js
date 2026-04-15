// henselLift.js
// Two-factor Hensel lifting for integer polynomials
//
// Current scope:
//   f ≡ g*h (mod p)
//   gcd(g,h)=1 in F_p[x]
//   => lift to f ≡ G*H (mod p^e)
//
// coeffs[i] = coefficient of x^i

import { polyTrimInt } from "./powerSumCore.js";

// ============================================================
// integer helpers
// ============================================================

function abs(n) {
  return Math.abs(n);
}

function mod(n, m) {
  const r = n % m;
  return r < 0 ? r + m : r;
}

function egcdInt(a, b) {
  if (b === 0) return [a, 1, 0];
  const [g, x1, y1] = egcdInt(b, a % b);
  return [g, y1, x1 - Math.floor(a / b) * y1];
}

function modInvPrime(a, p) {
  a = mod(a, p);
  if (a === 0) throw new Error("0 has no inverse mod p");
  const [g, x] = egcdInt(a, p);
  if (g !== 1) throw new Error(`No inverse for ${a} mod ${p}`);
  return mod(x, p);
}

// ============================================================
// integer polynomial ops
// coeffs[i] = x^i coefficient
// ============================================================

function polyDegreeInt(poly) {
  return polyTrimInt(poly).length - 1;
}

function polyIsZeroInt(poly) {
  poly = polyTrimInt(poly);
  return poly.length === 1 && poly[0] === 0;
}

function polyLeadingInt(poly) {
  poly = polyTrimInt(poly);
  return poly[poly.length - 1];
}

function polyClone(poly) {
  return poly.slice();
}

function polyAddInt(a, b) {
  const n = Math.max(a.length, b.length);
  const out = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    out[i] = (a[i] || 0) + (b[i] || 0);
  }
  return polyTrimInt(out);
}

function polySubInt(a, b) {
  const n = Math.max(a.length, b.length);
  const out = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    out[i] = (a[i] || 0) - (b[i] || 0);
  }
  return polyTrimInt(out);
}

function polyScaleInt(a, k) {
  return polyTrimInt(a.map(c => c * k));
}

function polyMulInt(a, b) {
  const out = Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      out[i + j] += a[i] * b[j];
    }
  }
  return polyTrimInt(out);
}

// ============================================================
// polynomial arithmetic modulo m
// NOTE: division requires divisor to be monic
// ============================================================

function polyNormalizeMod(poly, m) {
  return polyTrimInt(poly.map(c => mod(c, m)));
}

function polyAddMod(a, b, m) {
  const n = Math.max(a.length, b.length);
  const out = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    out[i] = mod((a[i] || 0) + (b[i] || 0), m);
  }
  return polyNormalizeMod(out, m);
}

function polySubMod(a, b, m) {
  const n = Math.max(a.length, b.length);
  const out = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    out[i] = mod((a[i] || 0) - (b[i] || 0), m);
  }
  return polyNormalizeMod(out, m);
}

function polyScaleMod(a, k, m) {
  return polyNormalizeMod(a.map(c => mod(c * k, m)), m);
}

function polyMulMod(a, b, m) {
  const out = Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      out[i + j] = mod(out[i + j] + a[i] * b[j], m);
    }
  }
  return polyNormalizeMod(out, m);
}

function polyDivmodMonicMod(A, B, m) {
  // division in (Z/mZ)[x], assuming B is monic
  A = polyNormalizeMod(A, m);
  B = polyNormalizeMod(B, m);

  if (polyIsZeroInt(B)) {
    throw new Error("Division by zero polynomial");
  }

  const degA = polyDegreeInt(A);
  const degB = polyDegreeInt(B);

  if (degA < degB) {
    return { q: [0], r: A };
  }

  const leadB = polyLeadingInt(B);
  if (mod(leadB, m) !== 1) {
    throw new Error("polyDivmodMonicMod requires monic divisor modulo m");
  }

  const r = A.slice();
  const q = Array(degA - degB + 1).fill(0);

  for (let k = degA - degB; k >= 0; k--) {
    const coeff = mod(r[degB + k], m);
    q[k] = coeff;

    if (coeff !== 0) {
      for (let j = 0; j <= degB; j++) {
        r[j + k] = mod(r[j + k] - coeff * B[j], m);
      }
    }
  }

  return {
    q: polyNormalizeMod(q, m),
    r: polyNormalizeMod(r, m)
  };
}

// ============================================================
// exact divisibility helpers over Z[x]
// ============================================================

function polyExactDivideByInt(poly, d) {
  const out = poly.map(c => {
    if (c % d !== 0) {
      throw new Error(`Polynomial is not divisible coefficientwise by ${d}`);
    }
    return c / d;
  });
  return polyTrimInt(out);
}

// ============================================================
// polynomial extended Euclid over F_p[x]
// returns s,t,g with s*a + t*b = g
// ============================================================

function polyNormalizeModP(poly, p) {
  return polyTrimInt(poly.map(c => mod(c, p)));
}

function polyIsZeroModP(poly, p) {
  const q = polyNormalizeModP(poly, p);
  return q.length === 1 && q[0] === 0;
}

function polyLeadingModP(poly, p) {
  const q = polyNormalizeModP(poly, p);
  return q[q.length - 1];
}

function polyMonicModP(poly, p) {
  poly = polyNormalizeModP(poly, p);
  if (polyIsZeroModP(poly, p)) return [0];
  const inv = modInvPrime(polyLeadingModP(poly, p), p);
  return poly.map(c => mod(c * inv, p));
}

function polyAddModP(a, b, p) {
  return polyAddMod(a, b, p);
}

function polySubModP(a, b, p) {
  return polySubMod(a, b, p);
}

function polyMulModP(a, b, p) {
  return polyMulMod(a, b, p);
}

function polyScaleModP(a, k, p) {
  return polyScaleMod(a, k, p);
}

function polyDivmodModP(A, B, p) {
  A = polyNormalizeModP(A, p);
  B = polyNormalizeModP(B, p);

  if (polyIsZeroModP(B, p)) {
    throw new Error("Division by zero polynomial");
  }

  const degA = polyDegreeInt(A);
  const degB = polyDegreeInt(B);

  if (degA < degB) {
    return { q: [0], r: A };
  }

  const r = A.slice();
  const q = Array(degA - degB + 1).fill(0);

  const invLead = modInvPrime(polyLeadingModP(B, p), p);

  for (let k = degA - degB; k >= 0; k--) {
    const coeff = mod(r[degB + k] * invLead, p);
    q[k] = coeff;

    if (coeff !== 0) {
      for (let j = 0; j <= degB; j++) {
        r[j + k] = mod(r[j + k] - coeff * B[j], p);
      }
    }
  }

  return {
    q: polyNormalizeModP(q, p),
    r: polyNormalizeModP(r, p)
  };
}

function polyGcdExtModP(a, b, p) {
  a = polyNormalizeModP(a, p);
  b = polyNormalizeModP(b, p);

  let r0 = a, r1 = b;
  let s0 = [1], s1 = [0];
  let t0 = [0], t1 = [1];

  while (!polyIsZeroModP(r1, p)) {
    const { q, r } = polyDivmodModP(r0, r1, p);

    const s2 = polySubModP(s0, polyMulModP(q, s1, p), p);
    const t2 = polySubModP(t0, polyMulModP(q, t1, p), p);

    r0 = r1; r1 = r;
    s0 = s1; s1 = s2;
    t0 = t1; t1 = t2;
  }

  // normalize gcd to monic
  const lead = polyLeadingModP(r0, p);
  const inv = modInvPrime(lead, p);

  return {
    g: polyScaleModP(r0, inv, p),
    s: polyScaleModP(s0, inv, p),
    t: polyScaleModP(t0, inv, p)
  };
}

// ============================================================
// helpers for mod-p factor grouping
// ============================================================

function multiplyFactorListModP(factors, p) {
  let out = [1];
  for (const f of factors) {
    out = polyMulModP(out, f, p);
  }
  return polyMonicModP(out, p);
}

export function combineModPFactors(modPFactors, indices, p) {
  const left = [];
  const right = [];
  const chosen = new Set(indices);

  for (let i = 0; i < modPFactors.length; i++) {
    const poly = modPFactors[i].poly ? modPFactors[i].poly : modPFactors[i];
    if (chosen.has(i)) left.push(poly);
    else right.push(poly);
  }

  if (left.length === 0 || right.length === 0) {
    throw new Error("Both sides of the split must be non-empty");
  }

  return {
    left: multiplyFactorListModP(left, p),
    right: multiplyFactorListModP(right, p)
  };
}

// ============================================================
// One Hensel step: modulus m -> modulus m*p
//
// Invariants on entry:
//   F ≡ g*h (mod m)
//   s*g + t*h ≡ 1 (mod m)
//   g,h are monic modulo m
//
// Output satisfies same invariants with new modulus m*p
// ============================================================

function henselStep(F, g, h, s, t, m, p) {
  // 1) Lift factors
  // E = (F - g*h)/m over Z[x]
  const gh = polyMulInt(g, h);
  const diff1 = polySubInt(F, gh);
  const E = polyExactDivideByInt(diff1, m);

  // Solve: a*h + b*g ≡ E (mod m)
  // Standard construction:
  // divide s*E by h modulo m: sE = q*h + r
  // then b = r, a = tE + q*g
  const sE = polyMulMod(s, E, m);
  const { q: q1, r: r1 } = polyDivmodMonicMod(sE, h, m);

  const b = r1; // correction for g
  const a = polyAddMod(polyMulMod(t, E, m), polyMulMod(q1, g, m), m); // correction for h

  const g1 = polyAddInt(g, polyScaleInt(b, m));
  const h1 = polyAddInt(h, polyScaleInt(a, m));

  // 2) Lift Bezout relation
  // Need s1*g1 + t1*h1 ≡ 1 (mod m*p)
  // Let C = (s*g + t*h - 1)/m
  const sgh = polyAddInt(polyMulInt(s, g), polyMulInt(t, h));
  const diff2 = polySubInt(sgh, [1]);
  const C = polyExactDivideByInt(diff2, m);

  // Need u*g + v*h ≡ -(C + s*b + t*a) mod m
  const W = polyScaleMod(
    polyAddMod(
      C,
      polyAddMod(polyMulMod(s, b, m), polyMulMod(t, a, m), m),
      m
    ),
    -1,
    m
  );

  // divide s*W by h modulo m: sW = q*h + r
  // then u = r, v = tW + q*g
  const sW = polyMulMod(s, W, m);
  const { q: q2, r: r2 } = polyDivmodMonicMod(sW, h, m);

  const u = r2;
  const v = polyAddMod(polyMulMod(t, W, m), polyMulMod(q2, g, m), m);

  const s1 = polyAddInt(s, polyScaleInt(u, m));
  const t1 = polyAddInt(t, polyScaleInt(v, m));

  return {
    g: polyTrimInt(g1),
    h: polyTrimInt(h1),
    s: polyTrimInt(s1),
    t: polyTrimInt(t1),
    modulus: m * p
  };
}

// ============================================================
// Public API: pair lift from mod p to mod p^targetExponent
//
// Inputs:
//   poly: integer polynomial F
//   p: prime
//   factorA, factorB: monic factors modulo p with F ≡ factorA*factorB (mod p)
//   targetExponent: e >= 1
//
// Output:
//   liftedA, liftedB satisfy F ≡ liftedA*liftedB (mod p^e)
// ============================================================

export function henselLiftPair({
  poly,
  p,
  factorA,
  factorB,
  targetExponent = 2
}) {
  if (!Number.isInteger(p) || p < 2) {
    throw new Error("p must be a prime integer >= 2");
  }
  if (!Number.isInteger(targetExponent) || targetExponent < 1) {
    throw new Error("targetExponent must be a positive integer");
  }

  const F = polyTrimInt(poly);
  let g = polyNormalizeModP(factorA, p);
  let h = polyNormalizeModP(factorB, p);

  g = polyMonicModP(g, p);
  h = polyMonicModP(h, p);

  // Check product mod p
  const Fmodp = polyNormalizeModP(F, p);
  const ghmodp = polyNormalizeModP(polyMulModP(g, h, p), p);

  const mismatch = polySubModP(Fmodp, ghmodp, p);
  if (!polyIsZeroModP(mismatch, p)) {
    throw new Error("factorA * factorB does not match poly modulo p");
  }

  // Initial Bezout relation mod p
  const eg = polyGcdExtModP(g, h, p);
  if (!(eg.g.length === 1 && eg.g[0] === 1)) {
    throw new Error("factorA and factorB are not coprime modulo p");
  }

  let s = eg.s;
  let t = eg.t;
  let modulus = p;

  if (targetExponent === 1) {
    return {
      p,
      targetExponent,
      modulus,
      liftedA: g,
      liftedB: h,
      s,
      t,
      note: "No lift needed; returned factors modulo p"
    };
  }

  for (let e = 1; e < targetExponent; e++) {
    const step = henselStep(F, g, h, s, t, modulus, p);
    g = step.g;
    h = step.h;
    s = step.s;
    t = step.t;
    modulus = step.modulus;
  }

  return {
    p,
    targetExponent,
    modulus,
    liftedA: g,
    liftedB: h,
    s,
    t,
    note: `Lifted to modulus p^${targetExponent} = ${modulus}`
  };
}

// ============================================================
// Convenience wrapper:
// given mod-p irreducible factors and a chosen split,
// multiply each side and perform pair lift
// ============================================================

export function henselLiftFromSplit({
  poly,
  p,
  modPFactors,
  leftIndices,
  targetExponent = 2
}) {
  const split = combineModPFactors(modPFactors, leftIndices, p);

  return henselLiftPair({
    poly,
    p,
    factorA: split.left,
    factorB: split.right,
    targetExponent
  });
}

// ============================================================
// Debug exports
// ============================================================

export const __debug = {
  mod,
  polyAddInt,
  polySubInt,
  polyScaleInt,
  polyMulInt,
  polyNormalizeMod,
  polyAddMod,
  polySubMod,
  polyScaleMod,
  polyMulMod,
  polyDivmodMonicMod,
  polyGcdExtModP,
  combineModPFactors,
  henselStep
};
