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
