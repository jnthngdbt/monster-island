import { EventBus } from '../../src/core/events';

test('on/emit/unsubscribe', () => {
  const b = new EventBus<{ a: number }>();
  const got: number[] = [];
  const off = b.on('a', (v) => got.push(v));
  b.emit('a', 1);
  off();
  b.emit('a', 2);
  expect(got).toEqual([1]);
});
