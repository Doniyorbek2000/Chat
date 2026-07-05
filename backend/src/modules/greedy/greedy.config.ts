export interface GreedyItem {
  key: string;
  multiplier: number;
  /** Relative draw weight — determines how often this item wins. */
  weight: number;
}

/**
 * Greedy wheel configuration.
 *
 * RTP (return-to-player) with uniform betting across all items:
 *   sum(weight_i * multiplier_i) / (totalWeight * itemCount)
 *   = 8600 / (1206 * 8) ≈ 89.1%  →  ~10.9% house edge.
 */
export const GREEDY_ITEMS: GreedyItem[] = [
  { key: 'bread', multiplier: 5, weight: 250 },
  { key: 'candy', multiplier: 5, weight: 250 },
  { key: 'beer', multiplier: 5, weight: 250 },
  { key: 'hotdog', multiplier: 5, weight: 250 },
  { key: 'watermelon', multiplier: 10, weight: 90 },
  { key: 'pizza', multiplier: 15, weight: 60 },
  { key: 'steak', multiplier: 25, weight: 36 },
  { key: 'crown', multiplier: 45, weight: 20 },
];

export const GREEDY_TOTAL_WEIGHT = GREEDY_ITEMS.reduce(
  (sum, item) => sum + item.weight,
  0,
);

/** Seconds during which bets are accepted each round. */
export const GREEDY_BETTING_SECONDS = 22;
/** Seconds the result stays on screen before the next round opens. */
export const GREEDY_REVEAL_SECONDS = 8;

export const GREEDY_MIN_BET = 100;
export const GREEDY_MAX_BET = 10_000_000;
