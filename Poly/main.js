// main.js

import {
  buildPowerSumPrimitive,
  Fraction,
  polyTrimInt
} from "./powerSumCore.js";

import {
  extractRationalLinearFactors
} from "./rationalRootFactor.js";

import {
  squareFreeFactorization
} from "./squareFreeFactor.js";

function polyDegreeInt(coeffs) {
  return polyTrimInt(coeffs).length - 1;
}

function polyToStringInt(coeffs) {
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
      core = deg === 1 ? `${coeffStr}x` : `${coeffStr}x^${deg}`;
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

function fullFactorString(baseScalar, rationalFactors, stageResult) {
  const parts = [];

  if (!(baseScalar.n === 1 && baseScalar.d === 1)) {
    parts.push(baseScalar.toString());
  }

  for (const f of rationalFactors) {
    const p = `(${polyToStringInt(f.poly)})`;
    parts.push(f.power === 1 ? p : `${p}^${f.power}`);
  }

  if (stageResult?.factors) {
    for (const f of stageResult.factors) {
      const p = `(${polyToStringInt(f.poly)})`;
      parts.push(f.power === 1 ? p : `${p}^${f.power}`);
    }
  }

  const rem = polyTrimInt(stageResult?.remainingPoly || [1]);
  if (!(rem.length === 1 && rem[0] === 1)) {
    parts.push(`(${polyToStringInt(rem)})`);
  }

  return parts.length ? parts.join(" * ") : "1";
}

export function factorPowerSum(n) {
  const core = buildPowerSumPrimitive(n);
  const rat = extractRationalLinearFactors(core.primitivePoly);

  const deg = polyDegreeInt(rat.remainingPoly);

  let lll;

  if (deg >= 4) {
    const sqf = squareFreeFactorization(rat.remainingPoly);

    lll = {
      scalar: new Fraction(1, 1),
      factors: [],
      remainingPoly: rat.remainingPoly,
      note: `square-free done: ${sqf.factors
        .map(f => `(${polyToStringInt(f.poly)})^${f.power}`)
        .join(" * ")}`
    };
  } else {
    lll = {
      scalar: new Fraction(1, 1),
      factors: [],
      remainingPoly: rat.remainingPoly,
      note: "degree <= 3, irreducible over Q after rational-root removal"
    };
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
    lll,
    factorString: fullFactorString(core.scalar, rat.factors, lll)
  };
}

window.factorPowerSum = factorPowerSum;
