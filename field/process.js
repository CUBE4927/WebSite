// process.js
// 2D compressible gas toy simulation on a fixed 256x256 grid.
// Fields:
//   rho: density scalar field
//   T:   temperature scalar field
//   vx, vy: velocity vector field
// Pressure is computed as P = rho * T, with R = 1.

class GasSim2D {
  constructor({
    dx = 1,
    dt = 0.01,
    nu = 0.001,
    alpha = 0.001,
    gamma = 1.4
  } = {}) {
    this.N = 256;
    this.size = this.N * this.N;

    this.dx = dx;
    this.dt = dt;
    this.nu = nu;
    this.alpha = alpha;
    this.gamma = gamma;

    this.rho = new Float32Array(this.size);
    this.T = new Float32Array(this.size);
    this.vx = new Float32Array(this.size);
    this.vy = new Float32Array(this.size);

    this.rho2 = new Float32Array(this.size);
    this.T2 = new Float32Array(this.size);
    this.vx2 = new Float32Array(this.size);
    this.vy2 = new Float32Array(this.size);

    this.P = new Float32Array(this.size);

    this.resetHotCenter();
  }

  idx(i, j) {
    return i + j * this.N;
  }

  setParams({ dx, dt, nu, alpha, gamma }) {
    if (Number.isFinite(dx) && dx > 0) this.dx = dx;
    if (Number.isFinite(dt) && dt > 0) this.dt = dt;
    if (Number.isFinite(nu) && nu >= 0) this.nu = nu;
    if (Number.isFinite(alpha) && alpha >= 0) this.alpha = alpha;
    if (Number.isFinite(gamma) && gamma > 1) this.gamma = gamma;
  }

  resetHotCenter() {
    const N = this.N;
    const cx = 128;
    const cy = 128;
    const spread2 = 400;

    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const k = this.idx(i, j);
        const r2 = (i - cx) ** 2 + (j - cy) ** 2;

        this.rho[k] = 1.0;
        this.T[k] = 1.0 + 2.0 * Math.exp(-r2 / spread2);
        this.vx[k] = 0.0;
        this.vy[k] = 0.0;
      }
    }
  }

  resetRandomTemperature() {
    const N = this.N;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const k = this.idx(i, j);
        this.rho[k] = 1.0;
        this.T[k] = 0.8 + Math.random() * 0.4;
        this.vx[k] = 0.0;
        this.vy[k] = 0.0;
      }
    }
  }

  addHeat(cx, cy, amount = 1.0, radius = 10) {
    const N = this.N;
    const r2Max = radius * radius;

    for (let j = Math.max(0, cy - radius); j <= Math.min(N - 1, cy + radius); j++) {
      for (let i = Math.max(0, cx - radius); i <= Math.min(N - 1, cx + radius); i++) {
        const dx = i - cx;
        const dy = j - cy;
        const r2 = dx * dx + dy * dy;
        if (r2 <= r2Max) {
          const k = this.idx(i, j);
          this.T[k] += amount * Math.exp(-r2 / (0.35 * r2Max + 1e-6));
        }
      }
    }
  }

  collideWalls() {
    const N = this.N;

    for (let j = 0; j < N; j++) {
      const left = this.idx(0, j);
      const right = this.idx(N - 1, j);

      if (this.vx[left] < 0) this.vx[left] = -this.vx[left];
      if (this.vx[right] > 0) this.vx[right] = -this.vx[right];
    }

    for (let i = 0; i < N; i++) {
      const bottom = this.idx(i, 0);
      const top = this.idx(i, N - 1);

      if (this.vy[bottom] < 0) this.vy[bottom] = -this.vy[bottom];
      if (this.vy[top] > 0) this.vy[top] = -this.vy[top];
    }
  }

  step() {
    const N = this.N;
    const dx = this.dx;
    const dt = this.dt;
    const nu = this.nu;
    const alpha = this.alpha;
    const gamma = this.gamma;

    const inv2dx = 1 / (2 * dx);
    const invDx2 = 1 / (dx * dx);

    this.collideWalls();

    const rho = this.rho;
    const T = this.T;
    const vx = this.vx;
    const vy = this.vy;
    const P = this.P;

    const rho2 = this.rho2;
    const T2 = this.T2;
    const vx2 = this.vx2;
    const vy2 = this.vy2;

    for (let k = 0; k < this.size; k++) {
      P[k] = rho[k] * T[k];
    }

    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const k = this.idx(i, j);

        const il = Math.max(i - 1, 0);
        const ir = Math.min(i + 1, N - 1);
        const jd = Math.max(j - 1, 0);
        const ju = Math.min(j + 1, N - 1);

        const L = this.idx(il, j);
        const R = this.idx(ir, j);
        const D = this.idx(i, jd);
        const U = this.idx(i, ju);

        const dPdx = (P[R] - P[L]) * inv2dx;
        const dPdy = (P[U] - P[D]) * inv2dx;

        const divV =
          (vx[R] - vx[L]) * inv2dx +
          (vy[U] - vy[D]) * inv2dx;

        const divRhoV =
          (rho[R] * vx[R] - rho[L] * vx[L]) * inv2dx +
          (rho[U] * vy[U] - rho[D] * vy[D]) * inv2dx;

        const lapVx = (vx[R] + vx[L] + vx[U] + vx[D] - 4 * vx[k]) * invDx2;
        const lapVy = (vy[R] + vy[L] + vy[U] + vy[D] - 4 * vy[k]) * invDx2;
        const lapT = (T[R] + T[L] + T[U] + T[D] - 4 * T[k]) * invDx2;

        const safeRho = Math.max(rho[k], 1e-4);

        vx2[k] = vx[k] + dt * (-dPdx / safeRho + nu * lapVx);
        vy2[k] = vy[k] + dt * (-dPdy / safeRho + nu * lapVy);

        rho2[k] = rho[k] - dt * divRhoV;
        T2[k] = T[k] + dt * (alpha * lapT - (gamma - 1) * T[k] * divV);

        rho2[k] = Math.max(rho2[k], 1e-4);
        T2[k] = Math.max(T2[k], 1e-4);
      }
    }

    [this.rho, this.rho2] = [this.rho2, this.rho];
    [this.T, this.T2] = [this.T2, this.T];
    [this.vx, this.vx2] = [this.vx2, this.vx];
    [this.vy, this.vy2] = [this.vy2, this.vy];
  }
}
