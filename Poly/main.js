// main.js

import { buildPowerSumPrimitive } from "./powerSumCore.js";
import {
  extractRationalLinearFactors
} from "./rationalRootFactor.js";
import {
  factorByLLL,
  fullFactorString
} from "./lllFactor.js";

export function factorPowerSum(n) {
  const core = buildPowerSumPrimitive(n);
  const rat = extractRationalLinearFactors(core.primitivePoly);
  const lll = factorByLLL(rat.remainingPoly);

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
