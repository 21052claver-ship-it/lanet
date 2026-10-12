// Coordinates on the same 3 × 12 number grid, before its desktop rotation.
// Outside lines belong to the table too; no placement mode changes the map.
export function roulettePosition(bet) {
  const [n, next] = bet.numbers;
  if (bet.kind === 'number' && n === 0) return [1.5, -0.5];
  if (bet.kind === 'split' && n === 0) return [next - 0.5, 0];
  if (bet.kind === 'trio') return [next, 0];
  if (bet.kind === 'first-four') return [0, 0];
  if (bet.kind === 'column') return [n - 0.5, 12.5];
  const row = Math.floor((n - 1) / 3);
  const col = (n - 1) % 3;
  if (bet.kind === 'number') return [col + 0.5, row + 0.5];
  if (bet.kind === 'split') return next - n === 1 ? [col + 1, row + 0.5] : [col + 0.5, row + 1];
  if (bet.kind === 'corner') return [col + 1, row + 1];
  if (bet.kind === 'street') return [0, row + 0.5];
  if (bet.kind === 'six') return [0, row + 1];
  return null;
}

export function roulettePositionStyle(bet) {
  const point = roulettePosition(bet);
  if (!point) return {};
  const [x, y] = point;
  return {
    '--vx': `${(x / 3) * 100}%`,
    '--vy': `${(y / 12) * 100}%`,
    '--hx': `${(y / 12) * 100}%`,
    '--hy': `${((3 - x) / 3) * 100}%`,
  };
}

export function rouletteTargetClass(bet) {
  if (bet.kind === 'number') return bet.numbers[0] === 0 ? 'tapet-zero-number' : 'tapet-number';
  if (bet.kind === 'column') return 'tapet-column';
  if (['street', 'six', 'first-four'].includes(bet.kind)) return 'tapet-edge';
  if (['corner', 'trio'].includes(bet.kind)) return 'tapet-junction';
  if (bet.kind === 'split')
    return bet.numbers[0] === 0 || bet.numbers[1] - bet.numbers[0] === 3
      ? 'tapet-line-horizontal'
      : 'tapet-line-vertical';
  return 'tapet-outside';
}
