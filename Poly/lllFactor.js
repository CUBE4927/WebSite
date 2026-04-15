// lllFactor.js
// 현재는 LLL 기반 인수분해를 넣기 위한 자리.
// 지금 버전에서는 기본 저차 처리 + placeholder만 제공.

import { Fraction, polyTrimInt, polyToStringInt } from "./powerSumCore.js";
import {
  extractRationalLinearFactors,
  addFactor
} from "./rationalRootFactor.js";

export function polyDegreeInt(coeffs) {
  return polyTrimInt(coeffs).length - 1;
}

export function isPerfectSquare(n) {
  if (n < 0) return false;
  const s = Math.floor(Math.sqrt(n));
  return s * s === n;
}

// ax^2+bx+c 가 Q에서 분해되는지 검사
export function factorQuadraticOverQ(poly) {
  poly = polyTrimInt(poly);
  if (polyDegreeInt(poly) !== 2) return null;

  const c = poly[0];
  const b = poly[1];
  const a = poly[2];

  const D = b * b - 4 * a * c;
  if (!isPerfectSquare(D)) return null;

  const res = extractRationalLinearFactors(poly);
  if (polyDegreeInt(res.remainingPoly) === 0) {
    return {
      scalar: new Fraction(res.remainingPoly[0], 1),
      factors: res.factors,
      remainingPoly: [1]
    };
  }

  return null;
}

// 여기가 나중에 진짜 LLL 파이프라인 들어갈 자리
// square-free -> mod p factorization -> Hensel lifting -> LLL reconstruction
export function factorByLLL(primitivePoly) {
  let poly = polyTrimInt(primitivePoly);
  const factors = [];
  let scalar = new Fraction(1, 1);

  if (poly.length === 1) {
    return {
      scalar,
      factors,
      remainingPoly: poly,
      note: "constant polynomial"
    };
  }

  // 우선 저차 예외 처리만 해 둠
  const deg = polyDegreeInt(poly);

  if (deg <= 1) {
    if (!(poly.length === 1 && poly[0] === 1)) {
      addFactor(factors, poly, 1);
      poly = [1];
    }
    return {
      scalar,
      factors,
      remainingPoly: poly,
      note: "degree <= 1"
    };
  }

  if (deg === 2) {
    const q = factorQuadraticOverQ(poly);
    if (q) {
      scalar = scalar.mul(q.scalar);
      for (const f of q.factors) addFactor(factors, f.poly, f.power);
      poly = q.remainingPoly;
      return {
        scalar,
        factors,
        remainingPoly: poly,
        note: "quadratic factored over Q"
      };
    }

    return {
      scalar,
      factors,
      remainingPoly: poly,
      note: "quadratic irreducible over Q"
    };
  }

  return {
    scalar,
    factors,
    remainingPoly: poly,
    note: "LLL factorization placeholder: not implemented yet"
  };
}

export function fullFactorString(baseScalar, rationalFactors, lllResult) {
  const parts = [];
  const totalScalar = baseScalar.mul(lllResult.scalar);

  if (!(totalScalar.n === 1 && totalScalar.d === 1)) {
    parts.push(totalScalar.toString());
  }

  for (const f of rationalFactors) {
    const p = `(${polyToStringInt(f.poly)})`;
    parts.push(f.power === 1 ? p : `${p}^${f.power}`);
  }

  for (const f of lllResult.factors) {
    const p = `(${polyToStringInt(f.poly)})`;
    parts.push(f.power === 1 ? p : `${p}^${f.power}`);
  }

  const rem = polyTrimInt(lllResult.remainingPoly);
  if (!(rem.length === 1 && rem[0] === 1)) {
    parts.push(`(${polyToStringInt(rem)})`);
  }

  return parts.length ? parts.join(" * ") : "1";
}
