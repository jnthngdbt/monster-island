/** Écrans plein écran (pause, titre, K.O.). */
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
