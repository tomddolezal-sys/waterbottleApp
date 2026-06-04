import { Deck } from "./types";

const STORAGE_KEY = "hearthstone_decks";

export function loadDecks(): Deck[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveDecks(decks: Deck[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

export function loadActiveDeck(): Deck | null {
  try {
    const data = localStorage.getItem("hearthstone_active_deck");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveActiveDeck(deck: Deck | null): void {
  if (deck) {
    localStorage.setItem("hearthstone_active_deck", JSON.stringify(deck));
  } else {
    localStorage.removeItem("hearthstone_active_deck");
  }
}