import { canCraft, craft } from '../../src/core/crafting';
import { Inventory } from '../../src/core/inventory';

const near = () => true;
const far = () => false;

test("épée : besoin de l'atelier", () => {
  const inv = new Inventory({ wood: 3, stone: 5, jelly: 2 });
  expect(canCraft('stone_sword', inv, far)).toEqual({ ok: false, reason: 'station' });
});

test('épée : ressources manquantes, rien retiré', () => {
  const inv = new Inventory({ wood: 3, stone: 1 });
  expect(craft('stone_sword', inv, near)).toEqual({ ok: false, reason: 'missing', missing: { stone: 4, jelly: 2 } });
  expect(inv.count('wood')).toBe(3);
  expect(inv.count('stone')).toBe(1);
});

test('épée : fabriquée', () => {
  const inv = new Inventory({ wood: 3, stone: 5, jelly: 2 });
  expect(craft('stone_sword', inv, near).ok).toBe(true);
  expect(inv.count('stone_sword')).toBe(1);
  expect(inv.count('wood')).toBe(0);
});

test('potion sans station', () => {
  const inv = new Inventory({ jelly: 2, berry: 2 });
  expect(craft('jelly_potion', inv, far).ok).toBe(true);
  expect(inv.count('jelly_potion')).toBe(1);
});
