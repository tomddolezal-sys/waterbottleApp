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

/**
 * Probability of drawing a specific card from the remaining deck (single draw).
 * P = copiesRemaining / totalRemainingCards
 */
export function calculateDrawProbability(
  copiesInDeck: number,
  totalDeckSize: number
): number {
  if (totalDeckSize <= 0 || copiesInDeck <= 0) return 0;
  return copiesInDeck / totalDeckSize;
}

/**
 * Count how many cards in the deck fall within a mana cost range.
 */
export function getBucketCardCount(
  deckCards: { [cardId: string]: number },
  cards: { [cardId: string]: import('./types').HS_Card },
  minCost: number,
  maxCost: number
): number {
  let count = 0;
  for (const [cardId, qty] of Object.entries(deckCards)) {
    const card = cards[cardId];
    if (!card) continue;
    const cost = card.cost ?? 0;
    if (cost >= minCost && cost <= maxCost) {
      count += qty;
    }
  }
  return count;
}

/**
 * Generate all C(n, k) combinations of handSize cards from a flat deck array.
 * Uses the standard combination generation algorithm.
 */
export function* generateAllHands(
  flatDeckCards: string[],
  handSize: 3 | 4
): Generator<string[]> {
  const n = flatDeckCards.length;
  const k = handSize;

  function* combine(start: number, path: string[]): Generator<string[]> {
    if (path.length === k) {
      yield [...path];
      return;
    }
    // Prune: not enough cards left to fill the hand
    const remaining = n - start;
    const needed = k - path.length;
    if (remaining < needed) return;

    for (let i = start; i < n; i++) {
      path.push(flatDeckCards[i]);
      yield* combine(i + 1, path);
      path.pop();
    }
  }

  yield* combine(0, []);
}

/**
 * Check if a hand satisfies all bucket constraints.
 */
export function handSatisfiesConstraints(
  handCardIds: string[],
  cards: { [cardId: string]: import('./types').HS_Card },
  buckets: import('./types').ManaBucket[],
  constraints: import('./types').BucketConstraint[]
): boolean {
  // Count cards per bucket in this hand
  const bucketCounts: { [bucketId: string]: number } = {};
  for (const cardId of handCardIds) {
    const card = cards[cardId];
    if (!card) continue;
    const cost = card.cost ?? 0;
    for (const bucket of buckets) {
      if (cost >= bucket.minCost && cost <= bucket.maxCost) {
        bucketCounts[bucket.id] = (bucketCounts[bucket.id] ?? 0) + 1;
        break;
      }
    }
  }

  // Check each constraint
  for (const constraint of constraints) {
    const actual = bucketCounts[constraint.bucketId] ?? 0;
    if (actual < constraint.minCount) return false;
  }
  return true;
}

/**
 * Calculate probability that an opening hand satisfies all bucket constraints.
 * Uses brute-force enumeration of all possible hands.
 *
 * @param keptCardsCount - Number of cards already kept (not randomly drawn). Default 0.
 *   When > 0, constraints are reduced by this amount (floored at 0) to model the
 *   conservative case where kept cards do not contribute to constraints.
 * @param keptCards - Optional explicit array of kept card IDs. If provided, these
 *   specific cards are removed from the deck before enumeration, and they count
 *   toward satisfying constraints.
 */
export function calculateManaCurveProbability(
  deckCards: { [cardId: string]: number },
  cards: { [cardId: string]: import('./types').HS_Card },
  buckets: import('./types').ManaBucket[],
  constraints: import('./types').BucketConstraint[],
  handSize: 3 | 4,
  keptCardsCount: number = 0,
  keptCards?: string[]
): import('./types').ManaCurveResult {
  // Build flat deck array (each cardId appears qty times)
  const flatDeck: string[] = [];
  for (const [cardId, qty] of Object.entries(deckCards)) {
    for (let i = 0; i < qty; i++) flatDeck.push(cardId);
  }

  // If explicit kept cards provided, remove them from the deck
  if (keptCards && keptCards.length > 0) {
    const toRemove = [...keptCards];
    for (const cardId of toRemove) {
      const idx = flatDeck.indexOf(cardId);
      if (idx !== -1) flatDeck.splice(idx, 1);
    }
  }

  const actualHandSize = handSize - keptCardsCount;
  const actualDeckSize = 30 - (keptCards ? keptCards.length : keptCardsCount);

  // If keeping all cards, probability is 1 if constraints satisfiable, 0 otherwise
  if (actualHandSize <= 0) {
    // Build a hypothetical hand from kept cards and check constraints
    const keptHand = keptCards ?? [];
    const satisfies = handSatisfiesConstraints(keptHand, cards, buckets, constraints);
    return {
      probability: satisfies ? 1 : 0,
      oddsString: satisfies ? "1" : "∞",
      totalHands: 1,
      favorableHands: satisfies ? 1 : 0,
      interpretation: constraints
        .filter((c) => c.minCount > 0)
        .map((c) => {
          const bucket = buckets.find((b) => b.id === c.bucketId);
          return `≥ ${c.minCount} ${bucket?.label ?? c.bucketId}`;
        })
        .join(' and ') || 'constraints satisfied',
    };
  }

  const totalHands = binomial(actualDeckSize, actualHandSize);
  let favorableHands = 0;

  // Adjust constraints: subtract keptCardsCount from each minCount (floored at 0)
  // This models the conservative case where kept cards don't help satisfy constraints
  const adjustedConstraints = keptCards
    ? constraints // explicit kept cards — use original constraints (they're counted in the hand)
    : constraints.map((c) => ({
        ...c,
        minCount: Math.max(0, c.minCount - keptCardsCount),
      }));

  for (const hand of generateAllHands(flatDeck, actualHandSize as 3 | 4)) {
    const fullHand = keptCards ? [...keptCards, ...hand] : hand;
    if (handSatisfiesConstraints(fullHand, cards, buckets, adjustedConstraints)) {
      favorableHands++;
    }
  }

  const probability = favorableHands / totalHands;
  const oddsString = probabilityToOdds(probability);

  // Build interpretation string
  const parts = constraints
    .filter((c) => c.minCount > 0)
    .map((c) => {
      const bucket = buckets.find((b) => b.id === c.bucketId);
      return `≥ ${c.minCount} ${bucket?.label ?? c.bucketId}`;
    });

  const interpretation = parts.length > 0 ? `${parts.join(' and ')}` : '';

  return { probability, oddsString, totalHands, favorableHands, interpretation };
}