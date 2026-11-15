import { InputState } from '../../src/engine/input';

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
