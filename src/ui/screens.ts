/** Écrans plein écran (titre, pause, K.O.). */
export type Overlay = { el: HTMLDivElement; show(): void; hide(): void; visible(): boolean };

export function createOverlay(root: HTMLElement, html: string, className = 'overlay'): Overlay {
  const el = document.createElement('div');
  el.className = className;
  el.innerHTML = html;
  el.style.display = 'none';
  root.appendChild(el);
  return {
    el,
    show() {
      el.style.display = '';
    },
    hide() {
      el.style.display = 'none';
    },
    visible: () => el.style.display !== 'none',
  };
}

export const CONTROLS_HTML = `
  <div class="controls">
    <div><kbd>W A S D</kbd> marcher <small>(Z Q S D en AZERTY)</small></div>
    <div><kbd>Souris</kbd> regarder · <kbd>Molette</kbd> zoom</div>
    <div><kbd>Clic</kbd> frapper / récolter</div>
    <div><kbd>Shift</kbd> esquiver · <kbd>Espace</kbd> sauter</div>
    <div><kbd>F</kbd> manger une baie · <kbd>G</kbd> boire une potion</div>
    <div><kbd>B</kbd> construire · <kbd>C</kbd> fabriquer · <kbd>E</kbd> porte</div>
    <div><kbd>Échap</kbd> pause</div>
  </div>`;

export function createTitleScreen(root: HTMLElement, onPlay: () => void): Overlay {
  const o = createOverlay(
    root,
    `<div class="panel title">
       <h1 class="logo">Monster Island</h1>
       <p>Explore l'île, récolte, affronte les monstres et construis ta base pour survivre à la nuit !</p>
       ${CONTROLS_HTML}
       <button class="big play">Jouer</button>
     </div>`,
    'overlay title-screen',
  );
  o.el.querySelector('.play')!.addEventListener('click', onPlay);
  return o;
}

export function createPauseScreen(root: HTMLElement, onResume: () => void): Overlay {
  const o = createOverlay(
    root,
    `<div class="panel">
       <h1>Pause</h1>
       ${CONTROLS_HTML}
       <button class="big resume">Reprendre</button>
     </div>`,
  );
  o.el.addEventListener('click', onResume);
  return o;
}

export type KoScreen = Overlay & { open(now: number): void; tick(realNow: number): void };

/** « Tu es tombé dans les pommes » : bouton actif après 2 secondes. */
export function createKoScreen(root: HTMLElement, onRise: () => void): KoScreen {
  const o = createOverlay(
    root,
    `<div class="panel">
       <h1>Oups !</h1>
       <p>Tu es tombé dans les pommes…</p>
       <p>Tu vas te réveiller près de ton dernier feu de camp (ou sur la plage), avec tout ton sac.</p>
       <button class="big rise" disabled>Se relever</button>
     </div>`,
    'overlay ko',
  );
  const btn = o.el.querySelector<HTMLButtonElement>('.rise')!;
  let readyAt = 0;
  btn.addEventListener('click', () => {
    if (!btn.disabled) onRise();
  });
  return {
    ...o,
    open(now: number) {
      readyAt = now + 2000;
      btn.disabled = true;
      o.show();
    },
    tick(realNow: number) {
      if (o.visible() && btn.disabled && realNow >= readyAt) btn.disabled = false;
    },
  };
}

const HINTS: [number, string][] = [
  [0, 'Clique sur un arbre pour récolter du bois 🪵'],
  [25, 'Tu as faim ? Cueille des baies et appuie sur F 🫐'],
  [50, 'Appuie sur B pour construire ta base 🏠'],
  [80, 'Construis un atelier, puis fabrique une épée avec C 🗡️'],
  [105, 'La nuit, les monstres attaquent ta base : prépare-toi ! 🌙'],
];
const HINT_DURATION = 130;

/** Astuces pendant les deux premières minutes. */
export class Hints {
  private el: HTMLDivElement;
  private last = '';

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hint';
    root.appendChild(this.el);
  }

  update(playTime: number): void {
    let text = '';
    if (playTime < HINT_DURATION) for (const [t, h] of HINTS) if (playTime >= t) text = h;
    if (text === this.last) return;
    this.last = text;
    this.el.textContent = text;
    this.el.style.display = text ? '' : 'none';
  }
}
