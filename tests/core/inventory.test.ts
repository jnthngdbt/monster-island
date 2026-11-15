import { Inventory } from '../../src/core/inventory';
import { bestWeapon } from '../../src/data/weapons';

test('remove atomique : rien retiré si insuffisant', () => {
  const inv = new Inventory({ wood: 2, stone: 5 });
  expect(inv.remove({ wood: 3, stone: 1 })).toBe(false);
  expect(inv.count('wood')).toBe(2);
  expect(inv.count('stone')).toBe(5);
});

test('remove retire quand suffisant', () => {
  const inv = new Inventory({ wood: 3 });
  expect(inv.remove({ wood: 3 })).toBe(true);
  expect(inv.count('wood')).toBe(0);
});

test('missing', () => {
  expect(new Inventory({ wood: 1 }).missing({ wood: 3, stone: 2 })).toEqual({ wood: 2, stone: 2 });
});

test('onChange appelé à chaque modification', () => {
  const inv = new Inventory();
  let n = 0;
  inv.onChange = () => n++;
  inv.add('wood', 2);
  inv.remove({ wood: 1 });
  inv.remove({ wood: 5 });
  expect(n).toBe(2);
});

test('bestWeapon', () => {
  expect(bestWeapon(new Inventory({ stick: 1 }))).toBe('stick');
  expect(bestWeapon(new Inventory({ stick: 1, stone_sword: 1 }))).toBe('stone_sword');
});
