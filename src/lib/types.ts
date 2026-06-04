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
  createdAt: number;
}

export type CardType = "ALL" | "MINION" | "SPELL" | "WEAPON";
export type Rarity = "ALL" | "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type ManaCost = "ALL" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10+";