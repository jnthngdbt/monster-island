/**
 * État des entrées. La partie DOM (attachDom) est séparée pour que l'état soit testable.
 * Les touches sont lues par `code` (position physique) : QWERTY et AZERTY fonctionnent.
 */
export class InputState {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private clicks = new Set<number>();
  private buttons = new Set<number>();
  private dx = 0;
  private dy = 0;
  wheel = 0;
  /** Entrées captées par le jeu (pointeur verrouillé, ou mode de secours actif). */
  locked = false;
  /**
   * Mode de secours quand le navigateur refuse le verrouillage du pointeur
   * (iframe, panneau intégré) : clic droit tenu pour regarder, Échap pour la pause.
   */
  fallback = false;
  /** Appelé une seule fois, quand le mode de secours s'active. */
  onFallback?: () => void;
  /** Le verrouillage a déjà réussi une fois : un refus est alors passager. */
  private lockWorked = false;

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
    this.buttons.add(button);
  }

  releaseButton(button: number): void {
    this.buttons.delete(button);
  }

  /** Bouton de souris tenu enfoncé (pour frapper en continu). */
  isButtonDown(button: 0 | 2): boolean {
    return this.buttons.has(button);
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
    this.buttons.clear();
    this.dx = 0;
    this.dy = 0;
    this.wheel = 0;
  }

  /** Active le mode de secours et capte les entrées. */
  enableFallback(): void {
    const first = !this.fallback;
    this.fallback = true;
    this.capture();
    if (first) this.onFallback?.();
  }

  /** Mode de secours : le jeu capte les entrées (équivaut à verrouiller). */
  capture(): void {
    this.locked = true;
    this.releaseAll();
  }

  /** Mode de secours : le jeu lâche les entrées (équivaut à déverrouiller → pause). */
  uncapture(): void {
    this.locked = false;
    this.releaseAll();
  }

  /** En mode de secours, la souris ne tourne la caméra que clic droit tenu. */
  acceptsMouseMove(): boolean {
    return this.locked && (!this.fallback || this.buttons.has(2));
  }

  attachDom(canvas: HTMLCanvasElement): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      // Sans verrouillage, le navigateur ne sort pas tout seul : Échap met en pause.
      if (e.code === 'Escape' && this.fallback && this.locked) {
        this.uncapture();
        return;
      }
      this.press(e.code);
    });
    window.addEventListener('keyup', (e) => this.release(e.code));
    window.addEventListener('mousemove', (e) => {
      if (this.acceptsMouseMove()) this.moveMouse(e.movementX, e.movementY);
    });
    window.addEventListener('mousedown', (e) => {
      // En mode de secours le curseur est visible : ignorer les clics sur l'interface.
      if (this.locked && (!this.fallback || e.target === canvas)) this.click(e.button);
    });
    window.addEventListener('mouseup', (e) => this.releaseButton(e.button));
    window.addEventListener('wheel', (e) => {
      if (this.locked) this.wheel += Math.sign(e.deltaY);
    }, { passive: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      if (this.fallback) return;
      this.locked = document.pointerLockElement === canvas;
      if (this.locked) this.lockWorked = true;
      this.releaseAll();
    });
    // Anciens navigateurs : le refus n'arrive que par cet événement.
    document.addEventListener('pointerlockerror', () => this.onLockError(undefined));
    // Perdre le focus met en pause, comme la perte du verrouillage. Pas
    // visibilitychange : les panneaux intégrés le déclenchent sans arrêt.
    window.addEventListener('blur', () => (this.fallback ? this.uncapture() : this.releaseAll()));
    document.addEventListener('visibilitychange', () => this.releaseAll());
  }

  requestLock(canvas: HTMLCanvasElement): void {
    if (this.locked) return;
    if (this.fallback) {
      this.capture();
      return;
    }
    try {
      const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      p?.catch?.((e: unknown) => this.onLockError(e));
    } catch (e) {
      this.onLockError(e);
    }
  }

  private onLockError(e: unknown): void {
    if (!this.fallback && isPointerLockUnsupported(e, this.lockWorked)) this.enableFallback();
  }

  /** Rend la souris (inventaire, K.O.) : quitte le verrouillage ou le mode de secours. */
  releaseLock(): void {
    if (this.fallback) this.uncapture();
    else document.exitPointerLock();
  }
}

/**
 * Le verrouillage est impossible dans ce document (iframe, panneau intégré).
 * Chrome renvoie SecurityError aussi pour les refus passagers (relance trop
 * rapide après Échap) : le nom ne suffit pas. Mais un refus passager suppose
 * un verrouillage réussi avant ; un refus sans aucun succès est donc définitif.
 */
export function isPointerLockUnsupported(e: unknown, lockWorkedBefore: boolean): boolean {
  if (!lockWorkedBefore) return true;
  const err = e as { name?: string; message?: string } | null | undefined;
  return (
    err?.name === 'WrongDocumentError' ||
    err?.name === 'NotSupportedError' ||
    /not valid for pointer lock/i.test(err?.message ?? '')
  );
}
