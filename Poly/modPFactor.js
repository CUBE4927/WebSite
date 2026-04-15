// modPFactor.js
// Berlekamp factorization over F_p[x]
// coeffs[i] = coefficient of x^i

import { polyTrimInt } from "./powerSumCore.js";

// ============================================================
// basic modular arithmetic
// ============================================================

function mod(n, p) {
  const r = n % p;
  return r < 0 ? r + p : r;
}

function egcd(a, b) {
  if (b === 0) return [a, 1, 0];
  const [g, x1, y1] = egcd(b, a % b);
  return [g, y1, x1 - Math.floor(a / b) * y1];
}

function modInv(a, p) {
  a = mod(a, p);
  if (a === 0) throw new Error("0 has no inverse mod p");
  const [g, x] = egcd(a, p);
  if (g !== 1) throw new Error(`No inverse for ${a} mod ${p}`);
  return mod(x, p);
}

function isPrime(p) {
  if (!Number.isInteger(p) || p < 2) return false;
  if (p === 2) return true;
  if (p % 2 === 0) return false;
  for (let i = 3; i * i <= p; i += 2) {
    if (p % i === 0) return false;
  }
  return true;
}

// ============================================================
// polynomial normalization
// ============================================================

function polyModNormalize(poly, p) {
  return polyTrimInt(poly.map(c => mod(c, p)));
}

function polyDegreeMod(poly, p) {
  return polyModNormalize(poly, p).length - 1;
}

function polyIsZeroMod(poly, p) {
  const q = polyModNormalize(poly, p);
  return q.length === 1 && q[0] === 0;
}

function polyLeadingMod(poly, p) {
  const q = polyModNormalize(poly, p);
  return q[q.length - 1];
}

function polyMonicMod(poly, p) {
  poly = polyModNormalize(poly, p);
  if (polyIsZeroMod(poly, p)) return [0];
  const lead = polyLeadingMod(poly, p);
  const inv = modInv(lead, p);
  return poly.map(c => mod(c * inv, p));
}

// ============================================================
// polynomial arithmetic over F_p
// ============================================================

function polyAddMod(a, b, p) {
  const n = Math.max(a.length, b.length);
  const out = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    out[i] = mod((a[i] || 0) + (b[i] || 0), p);
  }
  return polyModNormalize(out, p);
}

function polySubMod(a, b, p) {
  const n = Math.max(a.length, b.length);
  const out = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    out[i] = mod((a[i] || 0) - (b[i] || 0), p);
  }
  return polyModNormalize(out, p);
}

function polyScaleMod(a, k, p) {
  return polyModNormalize(a.map(c => mod(c * k, p)), p);
}

function polyMulMod(a, b, p) {
  const out = Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      out[i + j] = mod(out[i + j] + a[i] * b[j], p);
    }
  }
  return polyModNormalize(out, p);
}

function polyDerivativeMod(a, p) {
  a = polyModNormalize(a, p);
  if (a.length <= 1) return [0];
  const out = Array(a.length - 1).fill(0);
  for (let i = 1; i < a.length; i++) {
    out[i - 1] = mod(i * a[i], p);
  }
  return polyModNormalize(out, p);
}

function polyEvalMod(a, x, p) {
  let result = 0;
  for (let i = a.length - 1; i >= 0; i--) {
    result = mod(result * x + a[i], p);
  }
  return result;
}

function polyDivmodMod(A, B, p) {
  A = polyModNormalize(A, p);
  B = polyModNormalize(B, p);

  if (polyIsZeroMod(B, p)) {
    throw new Error("Division by zero polynomial");
  }

  const degA = polyDegreeMod(A, p);
  const degB = polyDegreeMod(B, p);

  if (degA < degB) {
    return { q: [0], r: A };
  }

  const r = A.slice();
  const q = Array(degA - degB + 1).fill(0);
  const leadB = polyLeadingMod(B, p);
  const invLeadB = modInv(leadB, p);

  for (let k = degA - degB; k >= 0; k--) {
    const coeff = mod(r[degB + k] * invLeadB, p);
    q[k] = coeff;

    if (coeff !== 0) {
      for (let j = 0; j <= degB; j++) {
        r[j + k] = mod(r[j + k] - coeff * B[j], p);
      }
    }
  }

  return {
    q: polyModNormalize(q, p),
    r: polyModNormalize(r, p)
  };
}

function polyModPoly(A, M, p) {
  return polyDivmodMod(A, M, p).r;
}

function polyExactDivideMod(dividend, divisor, p) {
  const { q, r } = polyDivmodMod(dividend, divisor, p);
  if (!polyIsZeroMod(r, p)) return null;
  return q;
}

function polyGcdMod(a, b, p) {
  a = polyModNormalize(a, p);
  b = polyModNormalize(b, p);

  while (!polyIsZeroMod(b, p)) {
    const { r } = polyDivmodMod(a, b, p);
    a = b;
    b = r;
  }

  return polyMonicMod(a, p);
}

// ============================================================
// powers modulo polynomial
// ============================================================

function polyPowMod(base, exp, modPoly, p) {
  let result = [1];
  let cur = polyModPoly(base, modPoly, p);

  while (exp > 0) {
    if (exp & 1) {
      result = polyModPoly(polyMulMod(result, cur, p), modPoly, p);
    }
    exp >>= 1;
    if (exp > 0) {
      cur = polyModPoly(polyMulMod(cur, cur, p), modPoly, p);
    }
  }

  return polyModNormalize(result, p);
}

// ============================================================
// square-free check over F_p
// ============================================================

function isSquareFreeMod(poly, p) {
  poly = polyMonicMod(poly, p);
  if (polyDegreeMod(poly, p) <= 0) return true;

  const deriv = polyDerivativeMod(poly, p);
  if (polyIsZeroMod(deriv, p)) return false;

  const g = polyGcdMod(poly, deriv, p);
  return polyDegreeMod(g, p) === 0;
}

// ============================================================
// matrix / nullspace over F_p
// ============================================================

function matrixClone(M) {
  return M.map(row => row.slice());
}

function rrefMod(M, p) {
  M = matrixClone(M);

  const rows = M.length;
  const cols = rows ? M[0].length : 0;
  const pivotCols = [];
  let r = 0;

  for (let c = 0; c < cols && r < rows; c++) {
    let pivot = -1;
    for (let i = r; i < rows; i++) {
      if (mod(M[i][c], p) !== 0) {
        pivot = i;
        break;
      }
    }
    if (pivot === -1) continue;

    [M[r], M[pivot]] = [M[pivot], M[r]];

    const inv = modInv(M[r][c], p);
    for (let j = 0; j < cols; j++) {
      M[r][j] = mod(M[r][j] * inv, p);
    }

    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const factor = M[i][c];
      if (factor === 0) continue;
      for (let j = 0; j < cols; j++) {
        M[i][j] = mod(M[i][j] - factor * M[r][j], p);
      }
    }

    pivotCols.push(c);
    r++;
  }

  return { rref: M, pivotCols };
}

function nullspaceMod(M, p) {
  const rows = M.length;
  const cols = rows ? M[0].length : 0;

  const { rref, pivotCols } = rrefMod(M, p);
  const pivotSet = new Set(pivotCols);
  const freeCols = [];

  for (let c = 0; c < cols; c++) {
    if (!pivotSet.has(c)) freeCols.push(c);
  }

  // zero-dimensional matrix special case
  if (cols === 0) return [];

  // if no free vars, nullspace might be trivial
  if (freeCols.length === 0) {
    return [];
  }

  const basis = [];

  for (const free of freeCols) {
    const v = Array(cols).fill(0);
    v[free] = 1;

    for (let i = 0; i < pivotCols.length; i++) {
      const pivotCol = pivotCols[i];
      v[pivotCol] = mod(-rref[i][free], p);
    }

    basis.push(v);
  }

  return basis;
}

// ============================================================
// Berlekamp matrix
// For monic square-free f of degree n:
// Q_j = x^{p j} mod f, columns in coefficient basis 1,x,...,x^{n-1}
// Then use nullspace(Q - I)
// ============================================================

function buildBerlekampMatrix(f, p) {
  f = polyMonicMod(f, p);
  const n = polyDegreeMod(f, p);

  const Q = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let j = 0; j < n; j++) {
    const poly = polyPowMod([0, 1], p * j, f, p); // x^(p*j) mod f
    for (let i = 0; i < poly.length; i++) {
      Q[i][j] = mod(poly[i], p);
    }
  }

  for (let i = 0; i < n; i++) {
    Q[i][i] = mod(Q[i][i] - 1, p);
  }

  return Q;
}

function vectorToPoly(v, p) {
  return polyModNormalize(v.slice(), p);
}

// ============================================================
// small helpers for factor bookkeeping
// ============================================================

function addFactor(factors, poly, power = 1) {
  const key = JSON.stringify(poly);
  for (const f of factors) {
    if (f.key === key) {
      f.power += power;
      return;
    }
  }
  factors.push({
    key,
    poly,
    power
  });
}

// ============================================================
// recursive Berlekamp factorization for square-free monic poly
// returns irreducible factors (monic)
// ============================================================

function berlekampFactorSquareFree(f, p) {
  f = polyMonicMod(f, p);
  const deg = polyDegreeMod(f, p);

  if (deg <= 1) return [f];

  const QminusI = buildBerlekampMatrix(f, p);
  const ns = nullspaceMod(QminusI, p);

  // dimension 1 means irreducible (only constants)
  if (ns.length <= 1) {
    return [f];
  }

  // Try non-constant nullspace vectors
  for (const basisVec of ns) {
    const g = vectorToPoly(basisVec, p);
    if (polyDegreeMod(g, p) <= 0) continue;

    for (let a = 0; a < p; a++) {
      const h = polySubMod(g, [a], p);     // g(x) - a
      const d = polyGcdMod(f, h, p);

      const dd = polyDegreeMod(d, p);
      if (dd > 0 && dd < deg) {
        const q = polyExactDivideMod(f, d, p);
        if (!q) continue;

        return [
          ...berlekampFactorSquareFree(d, p),
          ...berlekampFactorSquareFree(q, p)
        ];
      }
    }
  }

  // fallback: treat as irreducible if no split found
  return [f];
}

// ============================================================
// public API
// complete factorization for square-free polynomials mod p
// if not square-free mod p, return note and leave remainder
// ============================================================

export function factorModP(poly, p) {
  if (!isPrime(p)) {
    throw new Error(`p must be prime. got ${p}`);
  }

  poly = polyModNormalize(poly, p);

  if (polyIsZeroMod(poly, p)) {
    return {
      p,
      inputPoly: [0],
      monicPoly: [0],
      squareFree: false,
      factors: [],
      remainingPoly: [0],
      note: "zero polynomial"
    };
  }

  const monicPoly = polyMonicMod(poly, p);
  const deg = polyDegreeMod(monicPoly, p);

  if (deg <= 0) {
    return {
      p,
      inputPoly: poly,
      monicPoly,
      squareFree: true,
      factors: [],
      remainingPoly: [1],
      note: "constant polynomial"
    };
  }

  const squareFree = isSquareFreeMod(monicPoly, p);
  if (!squareFree) {
    return {
      p,
      inputPoly: poly,
      monicPoly,
      squareFree: false,
      factors: [],
      remainingPoly: monicPoly,
      note: "polynomial is not square-free mod p; choose another prime or handle repeated factors first"
    };
  }

  const irreducibles = berlekampFactorSquareFree(monicPoly, p);

  const factors = [];
  for (const f of irreducibles) {
    addFactor(factors, polyMonicMod(f, p), 1);
  }

  return {
    p,
    inputPoly: poly,
    monicPoly,
    squareFree: true,
    factors,
    remainingPoly: [1],
    note: "complete square-free factorization over F_p via Berlekamp"
  };
}

// ============================================================
// debug exports
// ============================================================

export const __debug = {
  mod,
  modInv,
  isPrime,
  polyModNormalize,
  polyDegreeMod,
  polyIsZeroMod,
  polyLeadingMod,
  polyMonicMod,
  polyAddMod,
  polySubMod,
  polyScaleMod,
  polyMulMod,
  polyDerivativeMod,
  polyEvalMod,
  polyDivmodMod,
  polyModPoly,
  polyExactDivideMod,
  polyGcdMod,
  polyPowMod,
  isSquareFreeMod,
  rrefMod,
  nullspaceMod,
  buildBerlekampMatrix,
  berlekampFactorSquareFree
};
