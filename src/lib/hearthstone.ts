import { HS_Card } from "./types";

const HS_API = "https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json";
const IMG_BASE = "https://art.hearthstonejson.com/v1/render/latest/enUS/256x";

const IMAGE_CACHE_TTL_MS = 120_000; // 2 minutes
const _imageUrlCache = new Map<string, { url: string; timestamp: number }>();

export function getCardImageUrl(cardId: string): string {
  const now = Date.now();
  const cached = _imageUrlCache.get(cardId);
  if (cached && now - cached.timestamp < IMAGE_CACHE_TTL_MS) {
    return cached.url;
  }

  const url = `${IMG_BASE}/${cardId}.png`;
  _imageUrlCache.set(cardId, { url, timestamp: now });

  // Lazy cleanup when cache gets large
  if (_imageUrlCache.size > 50) {
    for (const [key, val] of _imageUrlCache) {
      if (now - val.timestamp >= IMAGE_CACHE_TTL_MS) {
        _imageUrlCache.delete(key);
      }
    }
  }

  return url;
}

export async function fetchCards(): Promise<HS_Card[]> {
  const res = await fetch(HS_API);
  if (!res.ok) throw new Error("Failed to fetch cards");
  const data = await res.json();
  // The API returns {..., "cards": {...}} where each key is a cardId
  const cardsObj = data as { cards?: Record<string, HS_Card> };
  const raw: HS_Card[] = cardsObj.cards
    ? Object.values(cardsObj.cards)
    : Object.values(data as Record<string, HS_Card>);

  // Deduplicate by dbfId — some cards have multiple variants (normal/golden) with the same dbfId
  const seen = new Set<number>();
  return raw.filter((card) => {
    if (card.dbfId !== undefined) {
      if (seen.has(card.dbfId)) return false;
      seen.add(card.dbfId);
    }
    return true;
  });
}

export function filterCards(
  cards: HS_Card[],
  {
    search,
    manaCost,
    cardType,
    rarity,
    format,
    set,
  }: {
    search: string;
    manaCost: string;
    cardType: string;
    rarity: string;
    format: string;
    set: string;
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
    if (format === "STANDARD" && card.set && !isStandardLegal(card.set)) return false;
    if (set !== "ALL" && card.set !== set) return false;
    return true;
  });
}

export function getAvailableSets(cards: HS_Card[]): Array<{ code: string; name: string }> {
  const seen = new Set<string>();
  const result: Array<{ code: string; name: string }> = [];
  for (const card of cards) {
    if (card.set && !seen.has(card.set)) {
      seen.add(card.set);
      const name = getSetDisplayName(card.set);
      if (name) {
        result.push({ code: card.set, name });
      }
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function getRarityColor(rarity?: string): string {
  switch (rarity) {
    case "LEGENDARY": return "text-purple-400";
    case "EPIC": return "text-purple-600";
    case "RARE": return "text-blue-400";
    default: return "text-gray-300";
  }
}

// Map internal set codes to friendly display names
const SET_DISPLAY_NAMES: Record<string, string> = {
  EXPERT1: "Classic",
  VANILLA: "Legacy",
  CORE: "Core",
  LEGACY: "Legacy",
  LOE: "League of Explorers",
  BRM: "Blackrock Mountain",
  Naxx: "Naxxramas",
  TGT: "Grand Tournament",
  GVG: "Goblins vs Gnomes",
  OG: "Whispers of the Old Gods",
  KARA: "One Night in Karazhan",
  ICECROWN: "Knights of the Frozen Throne",
  GANGS: "Mean Streets of Gadgetzan",
  LOOTAPALOOZA: "Murder at Castle Nathria",
  DALARAN: "Rise of Shadows",
  SCHOLOMANCE: "Scholomance Academy",
  DRAGONS: "Descent of Dragons",
  DEMON_HUNTER_INITIATE: "Demon Hunter Initiate",
  GILNEAS: "The Witchwood",
  HERO_SKINS: "Hero Skins",
  ISLAND_VACATION: "Travelogues of the Dragon Isles",
  WHIZBANGS_WORKSHOP: "Whizbang's Workshop",
  WILD_WEST: "Wild West",
  BOOMSDAY: "The Boomsday Project",
  DARKMOON_FAIRE: "Darkmoon Faire",
  YEAR_OF_THE_DRAGON: "Year of the Dragon",
  THE_BARRENS: "Forged in the Barrens",
  THE_LOST_CITY: "The Lost City of Un'Goro",
  THE_SUNKEN_CITY: "Voyage to the Sunken City",
  STORMWIND: "United in Stormwind",
  ALTERAC_VALLEY: "Fractured in Alterac Valley",
  BATTLE_OF_THE_BANDS: "March of the Lich King",
  EMERALD_DREAM: "Into the Emerald Dream",
  ESCAPEFROM_VIOLET_HOLD: "Escape from Violet Hold",
  REVENDRETH: "Murder at Castle Nathria",
  SPACE: "Murder at Castle Nathria",
  TITANS: "TITANS",
  TIME_TRAVEL: "Caverns of Time",
  TROLL: "Murder at Castle Nathria",
  ULDUM: "Saviors of Uldum",
  WONDERS: "Murder at Castle Nathria",
  // Mini-sets
  DR: "Darkmoon Races",
  WC: "Wailing Caverns",
  DM: "Deadmines",
  ONYXIA: "Onyxia's Lair",
  TOT: "Throne of the Tides",
  MCN: "Maw and Disorder",
  RTN: "Return to Naxxramas",
  FAV: "Festival of Legends",
  AUD: "Audiopocalypse",
  FOT: "Fall of Ulduar",
  SITB: "Showdown in the Badlands",
  DID: "Delve into Deepholm",
  DBII: "Dr. Boom's Incredible Inventions",
  PIP: "Perils in Paradise",
  GDB: "The Great Dark Beyond",
  SC: "Heroes of StarCraft",
  EWT: "Embers of the World Tree",
  DOR: "Day of Rebirth",
  TLC: "The Lost City of Un'Goro",
  TED: "Into the Emerald Dream",
  EVENT: "Event",
  CATACLYSM: "CATACLYSM",
};

// Standard-format legal sets (2026, Year of the Scarab)
// Updated via wiki scraper — pulls current Standard set names from the wiki
// and maps them to API set codes via SET_DISPLAY_NAMES reverse lookup.
async function fetchStandardSetCodesFromWiki(): Promise<string[]> {
  try {
    const res = await fetch(
      "https://hearthstone.wiki.gg/api.php?action=parse&page=Standard_format&format=json"
    );
    const json = await res.json();
    const html = json.parse.text["*"];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Reverse SET_DISPLAY_NAMES: displayName → code
    const displayToCode: Record<string, string> = {};
    for (const [code, name] of Object.entries(SET_DISPLAY_NAMES)) {
      displayToCode[name.toLowerCase()] = code;
    }

    const codes: string[] = [];

    // The sets are in a table with links like <a href="/wiki/Card_set#Name">Name</a>
    const wikiLinks = doc.querySelectorAll("a");
    for (const link of wikiLinks) {
      const href = link.getAttribute("href") ?? "";
      const text = link.textContent?.trim() ?? "";
      if (href.includes("Card_set") && text.length > 2 && text.length < 50) {
        const code = displayToCode[text.toLowerCase()];
        if (code && !codes.includes(code)) {
          codes.push(code);
        }
      }
    }

    return codes;
  } catch (e) {
    console.warn("[hearthstone] Failed to fetch Standard sets from wiki, using fallback:", e);
    return [];
  }
}

// Static fallback — correct as of 2026
// CORE is always legal
// 2025 Standard sets (Year of the Mammoth): SC, TED, EWT, TLC, DoR, AtT
// 2026 Standard sets (Year of the Scarab): EotI, CATA, RoA, EVH
const FALLBACK_STANDARD_SETS = new Set([
  "CORE",
  "SC",      // Heroes of StarCraft
  "TED",     // Into the Emerald Dream
  "EWT",     // Embers of the World Tree
  "TLC",     // The Lost City of Un'Goro
  "DOR",     // Day of Rebirth
  "ATT",     // Across the Timeways
  "EOTI",    // Echoes of the Infinite
  "CATACLYSM",
  "ROA",     // Roads of the Ancients
  "EVH",     // Escape from Violet Hold
]);

let _standardSetCodes: string[] | null = null;

export async function ensureStandardSets(): Promise<void> {
  if (_standardSetCodes !== null) return;
  const wikiCodes = await fetchStandardSetCodesFromWiki();
  _standardSetCodes = wikiCodes.length > 0 ? wikiCodes : [...FALLBACK_STANDARD_SETS];
}

// Static fallback — correct as of 2026
// CORE is always legal
// 2025 Standard sets (Year of the Mammoth): SC, TED, EWT, TLC, DoR, AtT
// 2026 Standard sets (Year of the Scarab): EotI, CATA, RoA, EVH

export function isStandardLegal(set?: string): boolean {
  if (!set) return false;
  // Fast path: check fallback sets (always populated after ensureStandardSets)
  if (FALLBACK_STANDARD_SETS.has(set)) return true;
  // Check wiki-populated codes if available
  if (_standardSetCodes !== null) return _standardSetCodes.includes(set);
  return false;
}

export async function isStandardLegalFromWiki(set?: string): Promise<boolean> {
  if (!set) return false;
  if (_standardSetCodes === null) await ensureStandardSets();
  return _standardSetCodes!.includes(set);
}

export function getSetDisplayName(set?: string): string {
  if (!set) return "";
  return SET_DISPLAY_NAMES[set] ?? set.replace(/_/g, " ");
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

export function decodeDeckCode(code: string): { cards: Array<[number, number]>; heroDbfId: number | null } {
  const cleaned = code.trim();
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const result: Array<[number, number]> = [];
  let heroDbfId: number | null = null;
  const offset = { current: 0 };

  // Header byte 0x00
  if (offset.current >= bytes.length) return { cards: result, heroDbfId: null };
  offset.current++; // skip header

  // Version varint (skip — always 1)
  readVarint(bytes, offset);

  // Format varint (skip — 1=Wild, 2=Standard)
  readVarint(bytes, offset);

  // Helper to read a block: length + that many dbfIds at given count
  const readBlock = (count: number, captureFirst = false) => {
    const len = readVarint(bytes, offset);
    for (let j = 0; j < len; j++) {
      const dbfId = readVarint(bytes, offset);
      if (dbfId > 0) {
        if (captureFirst && j === 0 && count === 1) {
          heroDbfId = dbfId;
        } else {
          result.push([count, dbfId]);
        }
      }
    }
  };

  // Heroes block (count = 1 each) — capture first hero dbfId
  readBlock(1, true);
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

  return { cards: result, heroDbfId };
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
export function deckFromCode(code: string, cards: HS_Card[]): { deck: { [cardId: string]: number }; heroClass: string | null } {
  const { cards: pairs, heroDbfId } = decodeDeckCode(code);
  const deck: { [cardId: string]: number } = {};

  // Build dbfId → cardId map
  const dbfToCard: Record<number, HS_Card> = {};
  for (const card of cards) {
    if (card.dbfId) dbfToCard[card.dbfId] = card;
  }

  // Try to find hero class via hero dbfId lookup first
  let heroClass: string | null = null;
  if (heroDbfId) {
    const heroCard = dbfToCard[heroDbfId];
    if (heroCard?.cardClass && heroCard.cardClass !== "NEUTRAL") {
      heroClass = heroCard.cardClass;
    } else if (heroCard?.classes?.length) {
      heroClass = heroCard.classes[0];
    }
  }

  // Count cardClasses in the deck to find the dominant class as fallback
  const classCount: Record<string, number> = {};
  for (const [count, dbfId] of pairs) {
    const card = dbfToCard[dbfId];
    if (card) {
      deck[card.id] = (deck[card.id] ?? 0) + count;
      if (card.cardClass && card.cardClass !== "NEUTRAL") {
        classCount[card.cardClass] = (classCount[card.cardClass] ?? 0) + count;
      }
    }
  }

  // If hero dbfId lookup failed, pick the most common class from deck cards
  if (!heroClass) {
    let maxCount = 0;
    for (const [cls, cnt] of Object.entries(classCount)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        heroClass = cls;
      }
    }
  }

  return { deck, heroClass };
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