// main.js

import {
  buildPowerSumPrimitive,
  Fraction,
  polyTrimInt,
  polyToStringInt
} from "./powerSumCore.js";

import {
  extractRationalLinearFactors
} from "./rationalRootFactor.js";

import {
  squareFreeFactorization
} from "./squareFreeFactor.js";

import {
  factorModP
} from "./modPFactor.js";

import {
  henselLiftFromSplit
} from "./henselLift.js";

import {
  factorByLLL
} from "./lllFactor.js";

// ============================================================
// basic helpers
// ============================================================

function polyDegreeInt(poly) {
  return polyTrimInt(poly).length - 1;
}

function polyLeadingInt(poly) {
  poly = polyTrimInt(poly);
  return poly[poly.length - 1];
}

function polyIsOne(poly) {
  poly = polyTrimInt(poly);
  return poly.length === 1 && poly[0] === 1;
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

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function gcdArray(arr) {
  let g = 0;
  for (const x of arr) g = gcd(g, x);
  return g;
}

function polyContent(poly) {
  poly = polyTrimInt(poly);
  const nz = poly.filter(v => v !== 0);
  if (nz.length === 0) return 0;
  return gcdArray(nz);
}

function normalizeFactorPoly(poly) {
  poly = polyTrimInt(poly);
  if (poly.length === 1 && poly[0] === 0) return [0];

  const c = polyContent(poly);
  let out = c > 1 ? poly.map(v => v / c) : poly.slice();
  out = polyTrimInt(out);

  if (polyLeadingInt(out) < 0) out = out.map(v => -v);
  return out;
}

function addFactor(factors, poly, power = 1) {
  poly = normalizeFactorPoly(poly);
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

function factorsToString(baseScalar, factors) {
  const parts = [];

  if (!(baseScalar.n === 1 && baseScalar.d === 1)) {
    parts.push(baseScalar.toString());
  }

  for (const f of factors) {
    const p = `(${polyToStringInt(f.poly)})`;
    parts.push(f.power === 1 ? p : `${p}^${f.power}`);
  }

  return parts.length ? parts.join(" * ") : "1";
}

// ============================================================
// prime / bound / subset helpers
// ============================================================

const SMALL_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];

function choosePrimeForModFactor(poly) {
  const deg = polyDegreeInt(poly);
  if (deg < 2) return null;

  for (const p of SMALL_PRIMES) {
    // if leading coefficient vanishes mod p, degree may collapse
    if (((polyLeadingInt(poly) % p) + p) % p === 0) continue;

    let modp;
    try {
      modp = factorModP(poly, p);
    } catch {
      continue;
    }

    if (!modp.squareFree) continue;
    if (!modp.factors || modp.factors.length < 2) continue;

    return modp;
  }

  return null;
}

// crude integer coefficient bound; enough for first-pass Hensel/LLL
function reconstructionBound(poly) {
  poly = polyTrimInt(poly);
  const deg = polyDegreeInt(poly);
  const infNorm = Math.max(...poly.map(c => Math.abs(c)));
  return Math.max(2, Math.pow(2, deg) * infNorm);
}

function requiredLiftExponent(poly, p) {
  const B = reconstructionBound(poly);
  const target = 2 * B + 1;

  let e = 1;
  let m = p;
  while (m <= target && e < 12) {
    m *= p;
    e++;
  }
  return e;
}

function enumerateSubsetChoices(numFactors) {
  const choices = [];
  if (numFactors < 2) return choices;

  // fix index 0 on the left to avoid duplicate complements
  const free = numFactors - 1;
  const maxMask = 1 << free;

  for (let mask = 0; mask < maxMask; mask++) {
    const left = [0];
    for (let j = 0; j < free; j++) {
      if (mask & (1 << j)) left.push(j + 1);
    }
    if (left.length === numFactors) continue;
    choices.push(left);
  }

  return choices;
}

// ============================================================
// recursive factorization of a square-free primitive polynomial
// over Q, using mod p -> Hensel -> LLL
// ============================================================

function factorSquareFreePrimitive(poly, notes, depth = 0) {
  poly = normalizeFactorPoly(poly);
  const deg = polyDegreeInt(poly);

  if (deg <= 3) {
    notes.push(`deg ${deg}: stop (irreducible over Q after rational-root removal)`);
    return [poly];
  }

  const modp = choosePrimeForModFactor(poly);
  if (!modp) {
    notes.push(`deg ${deg}: no suitable small prime found; leaving as unresolved factor`);
    return [poly];
  }

  notes.push(
    `deg ${deg}: chose p=${modp.p}, mod-p factors=${modp.factors
      .map(f => `(${polyToStringInt(f.poly)})`)
      .join(" * ")}`
  );

  const targetExponent = requiredLiftExponent(poly, modp.p);
  const subsetChoices = enumerateSubsetChoices(modp.factors.length);

  for (const leftIndices of subsetChoices) {
    let lifted;
    try {
      lifted = henselLiftFromSplit({
        poly,
        p: modp.p,
        modPFactors: modp.factors,
        leftIndices,
        targetExponent
      });
    } catch {
      continue;
    }

    const lll = factorByLLL({
      originalPoly: poly,
      liftedA: lifted.liftedA,
      liftedB: lifted.liftedB,
      modulus: lifted.modulus
    });

    if (!lll.factors || lll.factors.length < 2) continue;

    const f1 = normalizeFactorPoly(lll.factors[0].poly);
    const f2 = normalizeFactorPoly(lll.factors[1].poly);

    if (polyDegreeInt(f1) <= 0 || polyDegreeInt(f2) <= 0) continue;
    if (polyEqual(f1, poly) || polyEqual(f2, poly)) continue;

    notes.push(
      `deg ${deg}: LLL success with split [${leftIndices.join(",")}], recovered ` +
      `(${polyToStringInt(f1)}) * (${polyToStringInt(f2)})`
    );

    const leftParts = factorSquareFreePrimitive(f1, notes, depth + 1);
    const rightParts = factorSquareFreePrimitive(f2, notes, depth + 1);
    return [...leftParts, ...rightParts];
  }

  notes.push(`deg ${deg}: Hensel+LLL could not split; leaving as unresolved factor`);
  return [poly];
}

// ============================================================
// full factorization over Q for primitive integer polynomial
// assumes rational linear factors already removed
// ============================================================

function factorRemainingPrimitive(poly, notes) {
  poly = normalizeFactorPoly(poly);

  if (polyIsOne(poly)) return [];

  const sqf = squareFreeFactorization(poly);
  notes.push(
    `square-free decomposition: ` +
    sqf.factors.map(f => `(${polyToStringInt(f.poly)})^${f.power}`).join(" * ")
  );

  const out = [];

  for (const part of sqf.factors) {
    const primitivePart = normalizeFactorPoly(part.poly);
    const pieces = factorSquareFreePrimitive(primitivePart, notes);

    for (const piece of pieces) {
      addFactor(out, piece, part.power);
    }
  }

  return out;
}

// ============================================================
// public API
// ============================================================

export function factorPowerSum(n) {
  const core = buildPowerSumPrimitive(n);
  const rat = extractRationalLinearFactors(core.primitivePoly);

  const notes = [];
  const finalFactors = [];

  for (const rf of rat.factors) {
    addFactor(finalFactors, rf.poly, rf.power);
  }

  const remaining = normalizeFactorPoly(rat.remainingPoly);

  if (!polyIsOne(remaining)) {
    const advancedFactors = factorRemainingPrimitive(remaining, notes);
    for (const f of advancedFactors) {
      addFactor(finalFactors, f.poly, f.power);
    }
  }

  return {
    n,
    rationalPoly: core.rationalPoly,
    rationalPolyString: core.rationalPolyString,
    scalar: core.scalar,
    primitivePoly: core.primitivePoly,
    primitivePolyString: core.primitivePolyString,
    rationalFactors: rat.factors,
    remainingAfterRational: rat.remainingPoly,
    factors: finalFactors.map(({ poly, power }) => ({ poly, power })),
    notes,
    factorString: factorsToString(core.scalar, finalFactors)
  };
}

window.factorPowerSum = factorPowerSum;
