import { DAY_CYCLE_SEC, NIGHT_START, START_TIME } from '../data/balance';

export type ClockEvent = 'nightStarted' | 'dayStarted';

/**
 * Cycle jour/nuit. t ∈ [0, 1) : jour sur [0, NIGHT_START), nuit sur [NIGHT_START, 1).
 * `day` commence à 1 et augmente à chaque lever du soleil.
 */
export class DayNightClock {
  t: number;
  day = 1;
  private wasNight: boolean;

  constructor(
    readonly cycleSec = DAY_CYCLE_SEC,
    start = START_TIME,
  ) {
    this.t = start;
    this.wasNight = this.isNight;
  }

  get isNight(): boolean {
    return this.t >= NIGHT_START;
  }

  /** Jour : 0 → 1 → 0 (sinus). Nuit : négatif. */
  get sunElevation(): number {
    if (!this.isNight) return Math.sin((Math.PI * this.t) / NIGHT_START);
    return -Math.sin((Math.PI * (this.t - NIGHT_START)) / (1 - NIGHT_START));
  }

  /** Progression dans la phase courante (0 → 1). */
  get phaseProgress(): number {
    return this.isNight ? (this.t - NIGHT_START) / (1 - NIGHT_START) : this.t / NIGHT_START;
  }

  tick(dt: number): ClockEvent[] {
    const events: ClockEvent[] = [];
    this.t += dt / this.cycleSec;
    if (this.t >= 1) {
      this.t -= 1;
      this.day += 1;
    }
    const night = this.isNight;
    if (night !== this.wasNight) events.push(night ? 'nightStarted' : 'dayStarted');
    this.wasNight = night;
    return events;
  }

  skipToNight(): void {
    if (!this.isNight) this.t = NIGHT_START;
  }
}
