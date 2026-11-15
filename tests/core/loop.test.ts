import { FixedStepper } from '../../src/core/loop';

test('un pas par 1/60 s', () => {
  const s = new FixedStepper();
  let n = 0;
  s.advance(1 / 60, () => n++);
  expect(n).toBe(1);
});

test('frame énorme plafonnée (onglet en arrière-plan)', () => {
  const s = new FixedStepper();
  let n = 0;
  s.advance(5, () => n++);
  expect(n).toBe(15);
});

test('reliquat conservé', () => {
  const s = new FixedStepper();
  let n = 0;
  s.advance(0.5 / 60, () => n++);
  s.advance(0.5 / 60, () => n++);
  expect(n).toBe(1);
});
