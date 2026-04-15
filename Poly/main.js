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
  factorByLLL,
  fullFactorString
} from "./lllFactor.js";

import {
  squareFreeFactorization
} from "./squareFreeFactor.js";

function polyDegreeInt(coeffs) {
  return polyTrimInt(coeffs).length - 1;
}

export function factorPowerSum(n) {
  const core = buildPowerSumPrimitive(n);
  const rat = extractRationalLinearFactors(core.primitivePoly);

  const deg = polyDegreeInt(rat.remainingPoly);

  let lll;
  if (deg >= 4) {
    lll = factorByLLL(rat.remainingPoly);
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
