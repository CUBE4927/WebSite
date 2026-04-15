// lllFactor.js
// LLL-based reconstruction from a Hensel-lifted monic factor pair.
//
// Current scope:
// - tries direct centered reconstruction first
// - then uses an embedding lattice + LLL reduction
// - searches short vectors with marker ±T
// - tests exact divisibility in Z[x]
//
// Important assumption:
//   This first version is intended for blocks where the target factor can be
//   reconstructed as a monic integer polynomial from the lifted monic factor.
//
// coeffs[i] = coefficient of x^i

import { polyTrimInt } from "./powerSumCore.js";

// ============================================================
// basic integer helpers
// ============================================================

function abs(n) {
  return Math.abs(n);
}

function gcd(a, b) {
  a = abs(a);
  b = abs(b);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function mod(n, m) {
  const r = n % m;
  return r < 0 ? r + m : r;
}

function gcdArray(arr) {
  let g = 0;
  for (const x of arr) g = gcd(g, x);
  return g;
}

// centered representative in (-m/2, m/2]
function centerMod(a, m) {
  let r = mod(a, m);
  if (r > m / 2) r -= m;
  return r;
}

// ============================================================
// integer polynomial helpers
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

function polyNeg(poly) {
  return poly.map(c => -c);
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

function polyScaleInt(poly, k) {
  return polyTrimInt(poly.map(c => c * k));
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

function polyContent(poly) {
  poly = polyTrimInt(poly);
  const nz = poly.filter(v => v !== 0);
  if (nz.length === 0) return 0;
  return gcdArray(nz);
}

function polyPrimitivePart(poly) {
  poly = polyTrimInt(poly);
  if (polyIsZeroInt(poly)) return [0];

  const c = polyContent(poly);
  let out = poly.map(v => v / c);
  out = polyTrimInt(out);

  if (polyLeadingInt(out) < 0) {
    out = out.map(v => -v);
  }

  return out;
}

function polyEqual(a, b) {
  a = polyTrimInt(a);
  b = polyTrimInt(b);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// exact long division by monic divisor in Z[x]
function polyDivmodMonicInt(A, B) {
  A = polyTrimInt(A);
  B = polyTrimInt(B);

  if (polyIsZeroInt(B)) {
    throw new Error("Division by zero polynomial");
  }
  if (polyLeadingInt(B) !== 1) {
    throw new Error("polyDivmodMonicInt requires monic divisor");
  }

  const degA = polyDegreeInt(A);
  const degB = polyDegreeInt(B);

  if (degA < degB) {
    return { q: [0], r: A };
  }

  const r = A.slice();
  const q = Array(degA - degB + 1).fill(0);

  for (let k = degA - degB; k >= 0; k--) {
    const coeff = r[degB + k];
    q[k] = coeff;

    if (coeff !== 0) {
      for (let j = 0; j <= degB; j++) {
        r[j + k] -= coeff * B[j];
      }
    }
  }

  return {
    q: polyTrimInt(q),
    r: polyTrimInt(r)
  };
}

function polyExactDivideMonicInt(dividend, divisor) {
  const { q, r } = polyDivmodMonicInt(dividend, divisor);
  if (!polyIsZeroInt(r)) return null;
  return q;
}

// ============================================================
// vector helpers
// ============================================================

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function scalarMulVec(v, k) {
  return v.map(x => x * k);
}

function addVec(a, b) {
  return a.map((x, i) => x + b[i]);
}

function subVec(a, b) {
  return a.map((x, i) => x - b[i]);
}

function vecNorm2(v) {
  return dot(v, v);
}

// ============================================================
// Gram-Schmidt / LLL
// ============================================================

function gramSchmidt(B) {
  const n = B.length;
  const m = B[0].length;
  const Bstar = Array(n).fill(null).map(() => Array(m).fill(0));
  const mu = Array(n).fill(null).map(() => Array(n).fill(0));
  const norm = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    let v = B[i].slice();

    for (let j = 0; j < i; j++) {
      mu[i][j] = dot(B[i], Bstar[j]) / norm[j];
      v = subVec(v, scalarMulVec(Bstar[j], mu[i][j]));
    }

    Bstar[i] = v;
    norm[i] = dot(v, v);
  }

  return { Bstar, mu, norm };
}

function lllReduce(basis, delta = 0.75) {
  if (!basis.length) return [];
  let B = basis.map(v => v.slice());
  let k = 1;

  while (k < B.length) {
    let gs = gramSchmidt(B);

    for (let j = k - 1; j >= 0; j--) {
      const q = Math.round(gs.mu[k][j]);
      if (q !== 0) {
        B[k] = subVec(B[k], scalarMulVec(B[j], q));
        gs = gramSchmidt(B);
      }
    }

    const lhs = gs.norm[k];
    const rhs = (delta - gs.mu[k][k - 1] * gs.mu[k][k - 1]) * gs.norm[k - 1];

    if (lhs >= rhs) {
      k++;
    } else {
      [B[k], B[k - 1]] = [B[k - 1], B[k]];
      k = Math.max(1, k - 1);
    }
  }

  B.sort((u, v) => vecNorm2(u) - vecNorm2(v));
  return B;
}

// ============================================================
// lattice construction
//
// We want vectors of the form:
//
//   candidate = A + M*z
//
// where A is the lifted factor (centered coefficients),
// M is the Hensel modulus, z is integer.
//
// To make this affine congruence class into a lattice, use an embedding:
//
// rows:
//   M*e_0
//   M*e_1
//   ...
//   M*e_{d-1}
//   [A_0, A_1, ..., A_d, T]
//
// Here A is monic of degree d, so we do not vary the leading coefficient.
// The last coordinate is a marker.
// Short vectors with marker ±T correspond to A + M*z.
// ============================================================

function centeredLiftedMonic(lifted, modulus) {
  lifted = polyTrimInt(lifted);
  const d = polyDegreeInt(lifted);

  const out = Array(d + 1).fill(0);
  for (let i = 0; i <= d; i++) {
    out[i] = centerMod(lifted[i] || 0, modulus);
  }

  // enforce monic representative
  out[d] = 1;
  return polyTrimInt(out);
}

function defaultEmbeddingScale(centeredPoly, modulus) {
  const coeffNorm = Math.sqrt(centeredPoly.reduce((s, c) => s + c * c, 0));
  const t1 = Math.max(1, Math.round(coeffNorm));
  const t2 = Math.max(1, Math.round(Math.sqrt(modulus)));
  return Math.max(t1, t2);
}

function buildEmbeddedBasisFromLift(liftedFactor, modulus, embeddingScale = null) {
  const A = centeredLiftedMonic(liftedFactor, modulus);
  const d = polyDegreeInt(A);
  const T = embeddingScale ?? defaultEmbeddingScale(A, modulus);

  const dim = d + 2; // coeffs 0..d plus marker
  const rows = [];

  // M * e_i for i = 0..d-1 (keep leading coeff fixed)
  for (let i = 0; i < d; i++) {
    const row = Array(dim).fill(0);
    row[i] = modulus;
    rows.push(row);
  }

  // embedded lift row
  const liftRow = Array(dim).fill(0);
  for (let i = 0; i <= d; i++) {
    liftRow[i] = A[i] || 0;
  }
  liftRow[dim - 1] = T;
  rows.push(liftRow);

  return {
    centeredLift: A,
    degree: d,
    modulus,
    embeddingScale: T,
    basis: rows
  };
}

// ============================================================
// candidate recovery from embedded vector
// ============================================================

function vectorToCandidatePoly(v, degree, markerTarget) {
  if (v.length !== degree + 2) return null;

  let w = v.slice();
  const marker = w[w.length - 1];

  if (Math.abs(marker) !== markerTarget) return null;

  if (marker < 0) {
    w = w.map(x => -x);
  }

  const coeffs = w.slice(0, degree + 1);

  // enforce monic
  if (coeffs[degree] !== 1) return null;

  return polyTrimInt(coeffs);
}

function isCongruentToLift(candidate, centeredLift, modulus) {
  const d = polyDegreeInt(centeredLift);
  if (polyDegreeInt(candidate) !== d) return false;
  for (let i = 0; i <= d; i++) {
    if (mod(candidate[i] - centeredLift[i], modulus) !== 0) {
      return false;
    }
  }
  return true;
}

// ============================================================
// search small combinations of reduced basis rows
// ============================================================

function enumerateSmallCombinations(vectors, radius = 1) {
  const coeffSet = [];
  for (let c = -radius; c <= radius; c++) coeffSet.push(c);

  const out = [];
  const n = vectors.length;
  if (n === 0) return out;

  const dim = vectors[0].length;

  function dfs(i, cur, used) {
    if (i === n) {
      if (used) out.push(cur.slice());
      return;
    }

    for (const c of coeffSet) {
      if (c === 0) {
        dfs(i + 1, cur, used);
      } else {
        const next = cur.slice();
        for (let j = 0; j < dim; j++) {
          next[j] += c * vectors[i][j];
        }
        dfs(i + 1, next, true);
      }
    }
  }

  dfs(0, Array(dim).fill(0), false);
  out.sort((a, b) => vecNorm2(a) - vecNorm2(b));
  return out;
}

// ============================================================
// exact divisor test
// ============================================================

function tryExactFactor(originalPoly, candidateMonic) {
  candidateMonic = polyTrimInt(candidateMonic);
  if (polyLeadingInt(candidateMonic) !== 1) return null;

  const quotient = polyExactDivideMonicInt(originalPoly, candidateMonic);
  if (!quotient) return null;

  return {
    factor: candidateMonic,
    cofactor: quotient
  };
}

// ============================================================
// reconstruct from one lifted side
// ============================================================

function reconstructFromOneLift({
  originalPoly,
  liftedFactor,
  modulus,
  embeddingScale = null,
  maxCombinationRows = 6,
  combinationRadius = 1,
  directFirst = true
}) {
  const F = polyTrimInt(originalPoly);
  const lattice = buildEmbeddedBasisFromLift(liftedFactor, modulus, embeddingScale);
  const { centeredLift, degree, embeddingScale: T, basis } = lattice;

  // 1) direct centered candidate
  if (directFirst) {
    const direct = tryExactFactor(F, centeredLift);
    if (direct) {
      return {
        success: true,
        method: "direct_centered_lift",
        candidate: direct.factor,
        cofactor: direct.cofactor,
        lattice
      };
    }
  }

  // 2) LLL basis reduction
  const reduced = lllReduce(basis);

  // 3) try reduced basis vectors themselves
  for (const row of reduced) {
    const cand = vectorToCandidatePoly(row, degree, T);
    if (!cand) continue;
    if (!isCongruentToLift(cand, centeredLift, modulus)) continue;

    const exact = tryExactFactor(F, cand);
    if (exact) {
      return {
        success: true,
        method: "lll_basis_vector",
        candidate: exact.factor,
        cofactor: exact.cofactor,
        lattice,
        reducedBasis: reduced
      };
    }
  }

  // 4) try small combinations of short reduced vectors
  const searchRows = reduced.slice(0, Math.min(maxCombinationRows, reduced.length));
  const combos = enumerateSmallCombinations(searchRows, combinationRadius);

  for (const v of combos) {
    const cand = vectorToCandidatePoly(v, degree, T);
    if (!cand) continue;
    if (!isCongruentToLift(cand, centeredLift, modulus)) continue;

    const exact = tryExactFactor(F, cand);
    if (exact) {
      return {
        success: true,
        method: "lll_small_combination",
        candidate: exact.factor,
        cofactor: exact.cofactor,
        lattice,
        reducedBasis: reduced
      };
    }
  }

  return {
    success: false,
    method: "failed",
    lattice,
    reducedBasis: reduced
  };
}

// ============================================================
// public API
// tries liftedA first, then liftedB
// ============================================================

export function factorByLLL({
  originalPoly,
  liftedA,
  liftedB = null,
  modulus,
  embeddingScale = null,
  maxCombinationRows = 6,
  combinationRadius = 1
}) {
  const F = polyTrimInt(originalPoly);

  const tries = [];

  if (liftedA) {
    const resA = reconstructFromOneLift({
      originalPoly: F,
      liftedFactor: liftedA,
      modulus,
      embeddingScale,
      maxCombinationRows,
      combinationRadius
    });
    tries.push({ side: "A", result: resA });

    if (resA.success) {
      return {
        scalar: { n: 1, d: 1, toString() { return "1"; }, mul(o) { return o; } },
        factors: [
          { poly: resA.candidate, power: 1 },
          { poly: resA.cofactor, power: 1 }
        ],
        remainingPoly: [1],
        note: `LLL reconstruction succeeded from liftedA (${resA.method})`,
        debug: tries
      };
    }
  }

  if (liftedB) {
    const resB = reconstructFromOneLift({
      originalPoly: F,
      liftedFactor: liftedB,
      modulus,
      embeddingScale,
      maxCombinationRows,
      combinationRadius
    });
    tries.push({ side: "B", result: resB });

    if (resB.success) {
      return {
        scalar: { n: 1, d: 1, toString() { return "1"; }, mul(o) { return o; } },
        factors: [
          { poly: resB.candidate, power: 1 },
          { poly: resB.cofactor, power: 1 }
        ],
        remainingPoly: [1],
        note: `LLL reconstruction succeeded from liftedB (${resB.method})`,
        debug: tries
      };
    }
  }

  return {
    scalar: { n: 1, d: 1, toString() { return "1"; }, mul(o) { return o; } },
    factors: [],
    remainingPoly: F,
    note: "LLL reconstruction failed for both lifted sides",
    debug: tries
  };
}

// ============================================================
// helper for formatting if you want to reuse old style
// ============================================================

export function polyToStringInt(poly, variable = "x") {
  poly = polyTrimInt(poly);
  const terms = [];

  for (let deg = poly.length - 1; deg >= 0; deg--) {
    const c = poly[deg];
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

// ============================================================
// debug exports
// ============================================================

export const __debug = {
  mod,
  centerMod,
  polyAddInt,
  polySubInt,
  polyScaleInt,
  polyMulInt,
  polyPrimitivePart,
  polyDivmodMonicInt,
  gramSchmidt,
  lllReduce,
  centeredLiftedMonic,
  buildEmbeddedBasisFromLift,
  vectorToCandidatePoly,
  isCongruentToLift,
  enumerateSmallCombinations,
  reconstructFromOneLift
};
