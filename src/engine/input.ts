/**
 * État des entrées. La partie DOM (attachDom) est séparée pour que l'état soit testable.
 * Les touches sont lues par `code` (position physique) : QWERTY et AZERTY fonctionnent.
 */
export class InputState {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private clicks = new Set<number>();
  private dx = 0;
  private dy = 0;
  wheel = 0;
  locked = false;

  press(code: string): void {
    if (!this.down.has(code)) this.pressed.add(code);
    this.down.add(code);
  }

  release(code: string): void {
    this.down.delete(code);
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  consumePressed(code: string): boolean {
    const had = this.pressed.has(code);
    this.pressed.delete(code);
    return had;
  }

  click(button: number): void {
    this.clicks.add(button);
  }

  consumeClick(button: 0 | 2): boolean {
    const had = this.clicks.has(button);
    this.clicks.delete(button);
    return had;
  }

  moveMouse(dx: number, dy: number): void {
    this.dx += dx;
    this.dy += dy;
  }

  consumeMouseDelta(): { dx: number; dy: number } {
    const d = { dx: this.dx, dy: this.dy };
    this.dx = 0;
    this.dy = 0;
    return d;
  }

  consumeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  /** À appeler à la fin de chaque pas : les appuis non consommés sont oubliés. */
  endStep(): void {
    this.pressed.clear();
    this.clicks.clear();
  }

  /** Perte de focus, pause, alt-tab : plus aucune touche n'est tenue. */
  releaseAll(): void {
    this.down.clear();
    this.pressed.clear();
    this.clicks.clear();
    this.dx = 0;
    this.dy = 0;
    this.wheel = 0;
  }

  attachDom(canvas: HTMLCanvasElement): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      this.press(e.code);
    });
    window.addEventListener('keyup', (e) => this.release(e.code));
    window.addEventListener('mousemove', (e) => {
      if (this.locked) this.moveMouse(e.movementX, e.movementY);
    });
    window.addEventListener('mousedown', (e) => {
      if (this.locked) this.click(e.button);
    });
    window.addEventListener('wheel', (e) => {
      if (this.locked) this.wheel += Math.sign(e.deltaY);
    }, { passive: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.releaseAll();
    });
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => this.releaseAll());
  }

  requestLock(canvas: HTMLCanvasElement): void {
    if (!this.locked) void canvas.requestPointerLock();
  }
}
