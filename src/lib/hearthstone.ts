import { HS_Card } from "./types";

const HS_API = "https://api.hearthstonejson.com/v1/latest/enUS/cards.json";
const IMG_BASE = "https://art.hearthstonejson.com/v1/render/latest/enUS/256x";

export function getCardImageUrl(cardId: string): string {
  return `${IMG_BASE}/${cardId}.png`;
}

export async function fetchCards(): Promise<HS_Card[]> {
  const res = await fetch(HS_API);
  if (!res.ok) throw new Error("Failed to fetch cards");
  const data = await res.json();
  // The API returns {..., "cards": {...}} where each key is a cardId
  const cardsObj = data as { cards?: Record<string, HS_Card> };
  if (cardsObj.cards) {
    return Object.values(cardsObj.cards);
  }
  // Fallback: data itself is the cards object
  return Object.values(data as Record<string, HS_Card>);
}

export function filterCards(
  cards: HS_Card[],
  {
    search,
    manaCost,
    cardType,
    rarity,
  }: {
    search: string;
    manaCost: string;
    cardType: string;
    rarity: string;
  }
): HS_Card[] {
  return cards.filter((card) => {
    if (search && !card.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (manaCost !== "ALL") {
      if (manaCost === "10+") {
        if (card.cost === undefined || card.cost < 10) return false;
      } else {
        if (card.cost !== parseInt(manaCost)) return false;
      }
    }
    if (cardType !== "ALL" && card.type !== cardType) return false;
    if (rarity !== "ALL" && card.rarity !== rarity) return false;
    return true;
  });
}

export function getRarityColor(rarity?: string): string {
  switch (rarity) {
    case "LEGENDARY": return "text-purple-400";
    case "EPIC": return "text-purple-600";
    case "RARE": return "text-blue-400";
    default: return "text-gray-300";
  }
}

export function getManaColor(cost: number): string {
  if (cost >= 7) return "bg-red-600";
  if (cost >= 5) return "bg-orange-600";
  if (cost >= 3) return "bg-blue-600";
  return "bg-blue-500";
}

// ─── Deck Code Encoder/Decoder ────────────────────────────────────────────────
// HearthSim deck code format: Base64 → header + version + format + card blocks
// Blocks: Heroes (1-copy), Single, Double, N-copy (explicit count)
// Each block: varint length + entries (dbfId varints, or dbfId+count for N-copy)

// Read a protobuf-style varint from bytes at offset
function readVarint(bytes: Uint8Array, offset: { current: number }): number {
  let result = 0;
  let shift = 0;
  while (offset.current < bytes.length) {
    const byte = bytes[offset.current++];
    result |= (byte & 0x7F) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return result;
}

// Write a varint to a byte array, returns the byte array
function writeVarint(value: number, bytes: number[]): void {
  while (value > 0x7F) {
    bytes.push((value & 0x7F) | 0x80);
    value >>= 7;
  }
  bytes.push(value);
}

export function decodeDeckCode(code: string): Array<[number, number]> {
  const cleaned = code.trim();
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const result: Array<[number, number]> = [];
  const offset = { current: 0 };

  // Header byte 0x00
  if (offset.current >= bytes.length) return result;
  offset.current++; // skip header

  // Version varint (skip — always 1)
  readVarint(bytes, offset);

  // Format varint (skip — 1=Wild, 2=Standard)
  readVarint(bytes, offset);

  // Helper to read a block: length + that many dbfIds at given count
  const readBlock = (count: number) => {
    const len = readVarint(bytes, offset);
    for (let j = 0; j < len; j++) {
      const dbfId = readVarint(bytes, offset);
      if (dbfId > 0) result.push([count, dbfId]);
    }
  };

  // Heroes block (count = 1 each)
  readBlock(1);
  // Single-copy cards block (count = 1 each)
  readBlock(1);
  // Double-copy cards block (count = 2 each)
  readBlock(2);
  // N-copy cards block (count explicit)
  const nLen = readVarint(bytes, offset);
  for (let j = 0; j < nLen; j++) {
    const dbfId = readVarint(bytes, offset);
    const cnt = readVarint(bytes, offset);
    if (dbfId > 0 && cnt > 0) result.push([cnt, dbfId]);
  }

  return result;
}

export function encodeDeckCode(pairs: Array<[number, number]>): string {
  // Separate pairs into single, double, and N-copy groups
  const singles: number[] = [];
  const doubles: number[] = [];
  const nCopies: Array<[number, number]> = [];

  for (const [count, dbfId] of pairs) {
    if (count === 1) singles.push(dbfId);
    else if (count === 2) doubles.push(dbfId);
    else nCopies.push([dbfId, count]);
  }

  const bytes: number[] = [];

  // Header byte
  bytes.push(0x00);
  // Version 1
  writeVarint(1, bytes);
  // Format 1 (Wild) — or use 2 for Standard, but 1 is safe for all cards
  writeVarint(1, bytes);

  // Helper to write a block
  const writeBlock = (dbfIds: number[]) => {
    writeVarint(dbfIds.length, bytes);
    for (const dbfId of dbfIds) writeVarint(dbfId, bytes);
  };

  // Heroes block (empty for our purposes)
  writeBlock([]);
  // Single-copy block
  writeBlock(singles);
  // Double-copy block
  writeBlock(doubles);
  // N-copy block
  writeVarint(nCopies.length, bytes);
  for (const [dbfId, count] of nCopies) {
    writeVarint(dbfId, bytes);
    writeVarint(count, bytes);
  }

  // Convert to binary string
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

// Build a deck from a code using the loaded cards
export function deckFromCode(code: string, cards: HS_Card[]): { [cardId: string]: number } {
  const pairs = decodeDeckCode(code);
  const deck: { [cardId: string]: number } = {};

  // Build dbfId → cardId map
  const dbfToCard: Record<number, HS_Card> = {};
  for (const card of cards) {
    if (card.dbfId) dbfToCard[card.dbfId] = card;
  }

  for (const [count, dbfId] of pairs) {
    const card = dbfToCard[dbfId];
    if (card) {
      deck[card.id] = (deck[card.id] ?? 0) + count;
    }
  }

  return deck;
}

// Build deck code from a deck cards object
export function deckToCode(cards: { [cardId: string]: number }, allCards: HS_Card[]): string {
  // Build cardId → dbfId map
  const cardToDbf: Record<string, number> = {};
  for (const card of allCards) {
    if (card.dbfId) cardToDbf[card.id] = card.dbfId;
  }

  const pairs: Array<[number, number]> = [];
  for (const [cardId, count] of Object.entries(cards)) {
    const dbfId = cardToDbf[cardId];
    if (dbfId) pairs.push([count, dbfId]);
  }

  return encodeDeckCode(pairs);
}