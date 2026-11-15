import { InputState, isPointerLockUnsupported } from '../../src/engine/input';

test('releaseAll vide les touches (alt-tab)', () => {
  const i = new InputState();
  i.press('KeyW');
  i.releaseAll();
  expect(i.isDown('KeyW')).toBe(false);
});

test('consumePressed ne déclenche qu\'une fois par appui', () => {
  const i = new InputState();
  i.press('KeyB');
  expect(i.consumePressed('KeyB')).toBe(true);
  expect(i.consumePressed('KeyB')).toBe(false);
  i.press('KeyB'); // répétition clavier : toujours enfoncée
  expect(i.consumePressed('KeyB')).toBe(false);
  i.release('KeyB');
  i.press('KeyB');
  expect(i.consumePressed('KeyB')).toBe(true);
});

test('bouton de souris tenu jusqu\'au relâchement', () => {
  const i = new InputState();
  i.click(0);
  i.endStep(); // le clic est oublié, le bouton reste tenu
  expect(i.consumeClick(0)).toBe(false);
  expect(i.isButtonDown(0)).toBe(true);
  i.releaseButton(0);
  expect(i.isButtonDown(0)).toBe(false);
  i.click(0);
  i.releaseAll();
  expect(i.isButtonDown(0)).toBe(false);
});

test('mode de secours : capter / lâcher remplace le verrouillage', () => {
  const i = new InputState();
  i.press('KeyW');
  i.enableFallback();
  expect(i.fallback).toBe(true);
  expect(i.locked).toBe(true);
  expect(i.isDown('KeyW')).toBe(false);
  i.uncapture();
  expect(i.locked).toBe(false);
  i.capture();
  expect(i.locked).toBe(true);
});

test('mode de secours : la caméra ne tourne que clic droit tenu', () => {
  const i = new InputState();
  i.locked = true;
  expect(i.acceptsMouseMove()).toBe(true); // verrouillage normal
  i.enableFallback();
  expect(i.acceptsMouseMove()).toBe(false);
  i.click(2);
  expect(i.acceptsMouseMove()).toBe(true);
  i.releaseButton(2);
  expect(i.acceptsMouseMove()).toBe(false);
});

test('refus du verrouillage : secours seulement si définitif', () => {
  // Aucun succès avant : tout refus est définitif (panneau intégré, iframe).
  const sec = { name: 'SecurityError', message: 'The root document of this element is not valid for pointer lock.' };
  expect(isPointerLockUnsupported(sec, false)).toBe(true);
  expect(isPointerLockUnsupported(undefined, false)).toBe(true);
  // Déjà verrouillé une fois : seuls les refus de document invalide comptent.
  expect(isPointerLockUnsupported(sec, true)).toBe(true);
  expect(isPointerLockUnsupported({ name: 'WrongDocumentError' }, true)).toBe(true);
  expect(isPointerLockUnsupported({ name: 'SecurityError', message: 'The user has exited the lock before this request was completed.' }, true)).toBe(false);
  expect(isPointerLockUnsupported({ name: 'NotAllowedError' }, true)).toBe(false);
  expect(isPointerLockUnsupported(undefined, true)).toBe(false);
});

test('mode de secours : onFallback n\'est appelé qu\'une fois', () => {
  const i = new InputState();
  let n = 0;
  i.onFallback = () => n++;
  i.enableFallback();
  i.uncapture();
  i.enableFallback();
  expect(n).toBe(1);
});
