export interface HS_Card {
  id: string;
  name: string;
  cost?: number;
  attack?: number;
  health?: number;
  durability?: number; // weapons
  type: string;
  rarity?: string;
  text?: string;
  set?: string;
  dbfId?: number;
  elite?: boolean;
  classes?: string[];
  cardClass?: string;
}

export interface Deck {
  id: string;
  name: string;
  cards: { [cardId: string]: number }; // cardId -> quantity (1 or 2)
  heroClass?: string; // e.g., "MAGE", "WARRIOR", "NEUTRAL"
  createdAt: number;
}

export type CardType = "ALL" | "MINION" | "SPELL" | "WEAPON";
export type Rarity = "ALL" | "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type ManaCost = "ALL" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10+";
export type FormatFilter = "ALL" | "STANDARD" | "WILD";

export interface ManaBucket {
  id: string;
  label: string;
  minCost: number;
  maxCost: number; // Infinity for 6+
  color: string;
}

export interface BucketConstraint {
  bucketId: string;
  minCount: number; // 0–4
}

export interface ManaCurveResult {
  probability: number;
  oddsString: string;
  totalHands: number;
  favorableHands: number;
  interpretation: string;
}

// ─── In-Game Tracking ─────────────────────────────────────────────────────────

export interface GameCard {
  id: string;           // runtime-generated ID
  name: string;
  cost?: number;
  type: string;
  rarity?: string;
  isUnknown: boolean;   // true = manually entered, not from API
}

// Committed drawn card with turn metadata
export interface DrawnCardEntry {
  id: string;
  turnCommitted: number;
}

export interface GameSession {
  originalDeck: Deck;        // snapshot at game start — never mutated
  drawnCards: DrawnCardEntry[]; // committed drawn cards (flushed from pending)
  addedCards: GameCard[];      // cards gained mid-game via effects
  pendingCardIds: string[];   // cards drawn this turn, not yet committed
  currentTurn: number;        // current turn number
}