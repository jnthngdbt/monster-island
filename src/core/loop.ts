/** Pas de simulation fixe, avec plafond pour les très longues frames. */
export class FixedStepper {
  private acc = 0;

  constructor(
    readonly step = 1 / 60,
    readonly maxFrame = 0.25,
  ) {}

  advance(realDt: number, stepFn: (dt: number) => void): number {
    this.acc += Math.min(Math.max(realDt, 0), this.maxFrame);
    let n = 0;
    while (this.acc >= this.step - 1e-9) {
      this.acc -= this.step;
      stepFn(this.step);
      n++;
    }
    if (this.acc < 0) this.acc = 0;
    return n;
  }
}
