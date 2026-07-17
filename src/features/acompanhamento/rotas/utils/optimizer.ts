/**
 * Nearest Neighbor + 2-OPT optimizer for routes.
 * Index 0 is the departure point; the rest are schools.
 */
export function nearestNeighbor(matrix: number[][]): number[] {
  const n = matrix.length;
  const visited = new Set<number>([0]);
  const order = [0];
  let cur = 0;
  while (visited.size < n) {
    let best = -1, bestD = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited.has(j)) continue;
      if (matrix[cur][j] < bestD) { bestD = matrix[cur][j]; best = j; }
    }
    if (best < 0) break;
    visited.add(best); order.push(best); cur = best;
  }
  return order;
}

export function totalCost(order: number[], matrix: number[][]): number {
  let t = 0;
  for (let i = 0; i < order.length - 1; i++) t += matrix[order[i]][order[i + 1]];
  return t;
}

export function twoOpt(order: number[], matrix: number[][], maxIter = 200): number[] {
  let best = [...order];
  let improved = true;
  let iter = 0;
  while (improved && iter++ < maxIter) {
    improved = false;
    for (let i = 1; i < best.length - 2; i++) {
      for (let k = i + 1; k < best.length - 1; k++) {
        const next = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        if (totalCost(next, matrix) < totalCost(best, matrix) - 1e-6) {
          best = next; improved = true;
        }
      }
    }
  }
  return best;
}

export function optimize(matrix: number[][]): { order: number[]; total: number } {
  const nn = nearestNeighbor(matrix);
  const opt = twoOpt(nn, matrix);
  return { order: opt, total: totalCost(opt, matrix) };
}
