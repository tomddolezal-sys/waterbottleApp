/**
 * Hypergeometric probability calculator for Hearthstone opening hands
 *
 * Drawing cards from a deck without replacement follows the hypergeometric
 * distribution. This module provides utilities to calculate exact probabilities.
 */

/**
 * Calculate binomial coefficient C(n, k) using multiplicative formula
 * to avoid large intermediate numbers.
 */
export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  // Use the smaller of k and n-k for efficiency
  k = Math.min(k, n - k);

  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

/**
 * Calculate the probability of drawing exactly the selected cards in opening hand.
 *
 * Uses hypergeometric distribution for drawing without replacement from a 30-card deck.
 *
 * For 3 cards selected (3-card hand): exact match probability
 * For 4 cards selected (3-card hand): sum over all C(4,3) = 4 subsets (any 3 of the 4)
 *
 * @param deckCards - The deck as { [cardId]: count } where count is 1 or 2
 * @param handSize - Number of cards to draw (3 or 4)
 * @param selectedCards - Array of { cardId, count } representing selected cards and how many copies
 * @returns Probability as decimal (0 to 1)
 */
export function calculateMulliganProbability(
  deckCards: { [cardId: string]: number },
  handSize: 3 | 4,
  selectedCards: { cardId: string; count: number }[]
): number {
  const totalDeckSize = 30;
  const totalSelected = selectedCards.reduce((sum, c) => sum + c.count, 0);

  // Total ways to draw handSize cards from 30
  const totalWays = binomial(totalDeckSize, handSize);

  if (totalSelected === handSize) {
    // Exact case: we want exactly these cards in our hand
    const K = selectedCards.map(({ cardId, count }) => deckCards[cardId] || 0);

    // Check if any selected card is not in deck or we need more copies than exist
    for (let i = 0; i < K.length; i++) {
      if (K[i] < selectedCards[i].count) return 0;
    }

    // Favorable ways: for each selected card with K_i copies, choose count_i copies
    const favorable = selectedCards.reduce((prod, { count }) => prod * binomial(count, count), 1);

    return favorable / totalWays;
  }

  if (selectedCards.length === 4 && handSize === 3 && totalSelected === 3) {
    // 4 cards selected for a 3-card hand — sum over all 3-card subsets
    // Probability of having ANY 3 of the 4 selected cards in opening hand
    let totalProbability = 0;

    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        for (let k = j + 1; k < 4; k++) {
          const subset = [selectedCards[i], selectedCards[j], selectedCards[k]];
          const K = subset.map(({ cardId, count }) => deckCards[cardId] || 0);

          // Skip if any card not in deck
          if (K.some((k) => k === 0)) continue;

          // Each card in subset contributes C(count, count) = 1 way since count is always 1 here
          const favorable = subset.reduce((prod, { count }) => prod * binomial(count, count), 1);
          totalProbability += favorable / totalWays;
        }
      }
    }

    return totalProbability;
  }

  // For other cases, probability is 0
  return 0;
}

/**
 * Convert a probability decimal to a "1 in X" string representation.
 */
export function probabilityToOdds(probability: number): string {
  if (probability <= 0) return "∞";
  if (probability >= 1) return "1";

  const odds = Math.round(1 / probability);
  return `1 in ${odds.toLocaleString()}`;
}