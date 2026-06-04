"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Minus, Shuffle, X, Sparkles, Copy, Upload, Calculator, RotateCcw, Check, Coins, Gamepad2, PlusCircle, CheckCircle, FlipHorizontal } from "lucide-react";
import { HS_Card, Deck, CardType, Rarity, ManaCost, GameSession, GameCard } from "@/lib/types";
import { fetchCards, getCardImageUrl, filterCards, getRarityColor, getSetDisplayName, deckFromCode, deckToCode, isStandardLegal, ensureStandardSets } from "@/lib/hearthstone";
import { loadDecks, saveDecks, loadActiveDeck, saveActiveDeck } from "@/lib/deckStorage";
import { calculateManaCurveProbability, calculateDrawProbability, probabilityToOdds } from "@/lib/probability";
import type { ManaBucket, BucketConstraint } from "@/lib/types";

// ─── Card Component ────────────────────────────────────────────────────────────

function getManaGemClass(cost: number): string {
  if (cost >= 7) return "mana-gem mana-gem-high";
  if (cost >= 5) return "mana-gem mana-gem-mid";
  return "mana-gem";
}

interface CardProps {
  card: HS_Card;
  onAdd?: (card: HS_Card) => void;
  showAdd?: boolean;
}

function Card({ card, onAdd, showAdd }: CardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg overflow-hidden hover:border-[#c9a227] transition-all group flex flex-col">
      {/* Card image */}
      <div className="relative aspect-[5/7] bg-[#1a1a1a]">
        {!imgError ? (
          <img
            src={getCardImageUrl(card.id)}
            alt={card.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#6B6B6B] text-sm p-4 text-center">
            {card.name}
          </div>
        )}
        {/* Mana cost */}
        {card.cost !== undefined && (
          <div className={`absolute top-1 left-1 ${getManaGemClass(card.cost)}`}>
            {card.cost}
          </div>
        )}
        {/* Add button overlay */}
        {showAdd && onAdd && (
          <button
            onClick={() => onAdd(card)}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <Plus size={32} className="text-[#c9a227]" />
          </button>
        )}
      </div>
      {/* Card info */}
      <div className="p-2 flex flex-col gap-1 flex-1">
        <span className={`text-xs font-semibold ${getRarityColor(card.rarity)} truncate`}>
          {card.name}
        </span>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#a0a0a0] capitalize">{card.type.toLowerCase()}</span>
          <div className="flex items-center gap-1">
            {card.set && isStandardLegal(card.set) && (
              <span className="text-[8px] font-medium text-emerald-400 bg-emerald-950 px-1 py-0.5 rounded">
                STD
              </span>
            )}
            {card.set && getSetDisplayName(card.set) && (
              <span className="text-[9px] text-[#6B6B6B] bg-[#1a1a1a] px-1 py-0.5 rounded">
                {getSetDisplayName(card.set)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          {card.attack !== undefined && (
            <span className="text-xs font-bold text-[#ef4444]">{card.attack}</span>
          )}
          {(card.health !== undefined || card.durability !== undefined) && (
            <span className="text-xs font-bold text-[#22c55e]">
              {card.health ?? card.durability}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Browse Tab ────────────────────────────────────────────────────────────────

interface BrowseTabProps {
  cards: HS_Card[];
  onAddToDeck: (card: HS_Card) => void;
}

function BrowseTab({ cards, onAddToDeck }: BrowseTabProps) {
  const [search, setSearch] = useState("");
  const [manaCost, setManaCost] = useState<ManaCost>("ALL");
  const [cardType, setCardType] = useState<CardType>("ALL");
  const [rarity, setRarity] = useState<Rarity>("ALL");

  const filtered = useMemo(
    () => filterCards(cards, { search, manaCost, cardType, rarity }),
    [cards, search, manaCost, cardType, rarity]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards..."
            className="w-full bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#f5f5f5] placeholder-[#6B6B6B] focus:outline-none focus:border-[#c9a227] transition-colors"
          />
        </div>
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={manaCost}
            onChange={(e) => setManaCost(e.target.value as ManaCost)}
            className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-3 py-2.5 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a227] transition-colors cursor-pointer"
          >
            <option value="ALL">Mana</option>
            {["0","1","2","3","4","5","6","7","8","9","10+"].map((m) => (
              <option key={m} value={m}>{m === "10+" ? "10+" : m}</option>
            ))}
          </select>
          <select
            value={cardType}
            onChange={(e) => setCardType(e.target.value as CardType)}
            className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-3 py-2.5 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a227] transition-colors cursor-pointer"
          >
            <option value="ALL">Type</option>
            <option value="MINION">Minion</option>
            <option value="SPELL">Spell</option>
            <option value="WEAPON">Weapon</option>
          </select>
          <select
            value={rarity}
            onChange={(e) => setRarity(e.target.value as Rarity)}
            className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-3 py-2.5 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a227] transition-colors cursor-pointer"
          >
            <option value="ALL">Rarity</option>
            <option value="COMMON">Common</option>
            <option value="RARE">Rare</option>
            <option value="EPIC">Epic</option>
            <option value="LEGENDARY">Legendary</option>
          </select>
        </div>
      </div>

      {/* Card count */}
      <p className="text-sm text-[#6B6B6B]">{filtered.length} cards</p>

      {/* Card Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
        {filtered.slice(0, 200).map((card) => (
          <Card key={card.id} card={card} onAdd={onAddToDeck} showAdd />
        ))}
      </div>
      {filtered.length > 200 && (
        <p className="text-sm text-[#6B6B6B] text-center">Showing 200 of {filtered.length} cards</p>
      )}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-[#6B6B6B]">
          No cards match your filters
        </div>
      )}
    </div>
  );
}

// ─── My Deck Tab ───────────────────────────────────────────────────────────────

interface MyDeckTabProps {
  deck: Deck;
  cards: HS_Card[];
  onUpdateDeck: (deck: Deck) => void;
  onMulligan: () => void;
  hasMulliganed: boolean;
  onResetMulligan: () => void;
  onImportCode: (cards: { [cardId: string]: number }, heroClass: string | null) => void;
}

function MyDeckTab({ deck, cards, onUpdateDeck, onMulligan, hasMulliganed, onResetMulligan, onImportCode }: MyDeckTabProps) {
  const [editingName, setEditingName] = useState(false);
  const [deckName, setDeckName] = useState(deck.name);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMulliganCalc, setShowMulliganCalc] = useState(false);
  const [curveHandSize, setCurveHandSize] = useState<3 | 4>(3);
  const [curveConstraints, setCurveConstraints] = useState<BucketConstraint[]>([
    { bucketId: "low", minCount: 0 },
    { bucketId: "mid", minCount: 0 },
    { bucketId: "high", minCount: 0 },
  ]);
  const [keptCardsCount, setKeptCardsCount] = useState(0);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const MANA_BUCKETS: ManaBucket[] = [
    { id: "low", label: "0-2 mana", minCost: 0, maxCost: 2, color: "bg-blue-500" },
    { id: "mid", label: "3-5 mana", minCost: 3, maxCost: 5, color: "bg-orange-500" },
    { id: "high", label: "6+ mana", minCost: 6, maxCost: Infinity, color: "bg-red-500" },
  ];

  const deckCards = useMemo(() => {
    const result: (HS_Card & { count: number })[] = [];
    for (const [cardId, count] of Object.entries(deck.cards)) {
      const card = cards.find((c) => c.id === cardId);
      if (card) result.push({ ...card, count });
    }
    return result.sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
  }, [deck.cards, cards]);

  // Group cards by type for compact display
  const grouped = useMemo(() => {
  const groups: Record<string, (HS_Card & { count: number })[]> = {};
  for (const card of deckCards) {
    const type = card.type.toLowerCase();
    if (!groups[type]) groups[type] = [];
    groups[type].push(card);
  }
  return groups;
}, [deckCards]);

const typeOrder = ["minion", "spell", "weapon"];

const totalCards = Object.values(deck.cards).reduce((a, b) => a + b, 0);
const manaCurve = Array(10).fill(0);
deckCards.forEach((c) => {
  const idx = Math.min(c.cost ?? 0, 9);
  manaCurve[idx] += c.count;
});

  const hoveredCard = useMemo(
    () => deckCards.find((c) => c.id === hoveredCardId) ?? null,
    [hoveredCardId, deckCards]
  );

  function removeCard(cardId: string) {
    const newCards = { ...deck.cards };
    if (newCards[cardId] > 1) {
      newCards[cardId]--;
    } else {
      delete newCards[cardId];
    }
    onUpdateDeck({ ...deck, cards: newCards });
  }

  function saveName() {
    onUpdateDeck({ ...deck, name: deckName });
    setEditingName(false);
  }

  function handleImport() {
    setImportError(null);
    try {
      const { deck: decodedDeck, heroClass } = deckFromCode(importText, cards);
      if (Object.keys(decodedDeck).length === 0) {
        setImportError("No valid cards found in this code. Make sure cards are loaded.");
        return;
      }
      onImportCode(decodedDeck, heroClass);
      setShowImportModal(false);
      setImportText("");
    } catch {
      setImportError("Invalid deck code. Please check and try again.");
    }
  }

  function handleExport() {
    const code = deckToCode(deck.cards, cards);
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function clearDeck() {
    if (window.confirm("Clear all cards from your deck?")) {
      onUpdateDeck({ ...deck, cards: {} });
    }
  }

  function setConstraint(bucketId: string, minCount: number) {
    setCurveConstraints((prev) =>
      prev.map((c) => (c.bucketId === bucketId ? { ...c, minCount } : c))
    );
  }

  function clearConstraints() {
    setCurveConstraints([
      { bucketId: "low", minCount: 0 },
      { bucketId: "mid", minCount: 0 },
      { bucketId: "high", minCount: 0 },
    ]);
    setKeptCardsCount(0);
  }

  // Build cards lookup for probability functions
  const cardsLookup = useMemo(() => {
    const lookup: { [cardId: string]: HS_Card } = {};
    for (const card of cards) lookup[card.id] = card;
    return lookup;
  }, [cards]);

  const manaCurveResult = useMemo(() => {
    const hasConstraints = curveConstraints.some((c) => c.minCount > 0);
    if (!hasConstraints) return null;
    return calculateManaCurveProbability(
      deck.cards,
      cardsLookup,
      MANA_BUCKETS,
      curveConstraints,
      curveHandSize,
      keptCardsCount
    );
  }, [deck.cards, cardsLookup, curveConstraints, curveHandSize, keptCardsCount]);

  // Bucket card counts for display
  const bucketCounts = useMemo(() => {
    const counts: { [id: string]: number } = {};
    for (const bucket of MANA_BUCKETS) {
      let count = 0;
      for (const [cardId, qty] of Object.entries(deck.cards)) {
        const card = cardsLookup[cardId];
        if (!card) continue;
        const cost = card.cost ?? 0;
        if (cost >= bucket.minCost && cost <= bucket.maxCost) {
          count += qty;
        }
      }
      counts[bucket.id] = count;
    }
    return counts;
  }, [deck.cards, cardsLookup]);

  return (
    <div className="flex flex-col gap-4">
      {/* Deck header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {editingName ? (
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              autoFocus
              className="bg-[#2d2d2d] border border-[#c9a227] rounded-lg px-3 py-1.5 text-lg font-semibold text-[#f5f5f5] focus:outline-none"
            />
          ) : (
            <h2
              onClick={() => setEditingName(true)}
              className="text-lg font-semibold text-[#c9a227] cursor-pointer hover:text-[#e0b830]"
            >
              {deck.name} ({totalCards}/30)
              {deck.heroClass && (
                <span className="ml-2 text-sm text-[#6B6B6B] bg-[#3d3d3d] px-2 py-0.5 rounded">
                  {deck.heroClass}
                </span>
              )}
            </h2>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#a0a0a0] hover:text-[#f5f5f5] rounded-lg text-sm transition-colors"
            title="Import Deck Code"
          >
            <Upload size={14} />
            Import
          </button>
          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              copied
                ? "bg-green-700 text-white"
                : "bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#a0a0a0] hover:text-[#f5f5f5]"
            }`}
            title="Copy Deck Code"
          >
            <Copy size={14} />
            {copied ? "Copied!" : "Export"}
          </button>
          {totalCards >= 10 && (
            <button
              onClick={onMulligan}
              disabled={hasMulliganed}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasMulliganed
                  ? "bg-[#3d3d3d] text-[#6B6B6B] cursor-not-allowed"
                  : "bg-[#c9a227] hover:bg-[#e0b830] text-[#1a1a1a]"
              }`}
            >
              <Sparkles size={16} />
              {hasMulliganed ? "Mulligan Used" : "Draw Opening Hand"}
            </button>
          )}
          {hasMulliganed && (
            <button
              onClick={onResetMulligan}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#6B6B6B] hover:text-[#c9a227] transition-colors"
              title="Reset Mulligan"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
          <button
            onClick={() => { setShowMulliganCalc(!showMulliganCalc); clearConstraints(); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              showMulliganCalc
                ? "bg-[#c9a227] text-[#1a1a1a]"
                : "bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#a0a0a0] hover:text-[#f5f5f5]"
            }`}
            title="Mana Curve Analyzer"
          >
            <Calculator size={14} />
            Calculator
          </button>
          {totalCards > 0 && (
            <button
              onClick={clearDeck}
              className="flex items-center gap-2 px-3 py-2 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#a0a0a0] hover:text-[#f5f5f5] rounded-lg text-sm transition-colors"
              title="Clear Deck"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Mana Curve Analyzer */}
      {showMulliganCalc && (
        <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#c9a227]">Mana Curve Analyzer</h3>
            <button onClick={() => setShowMulliganCalc(false)} className="text-[#6B6B6B] hover:text-[#f5f5f5] transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Hand size selector */}
          <div className="flex gap-2 mb-4">
            <span className="text-xs text-[#a0a0a0] self-center">Hand size:</span>
            <button
              onClick={() => setCurveHandSize(3)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                curveHandSize === 3
                  ? "bg-[#c9a227] text-[#1a1a1a]"
                  : "bg-[#3d3d3d] text-[#a0a0a0] hover:text-[#f5f5f5]"
              }`}
            >
              3 Cards
            </button>
            <button
              onClick={() => setCurveHandSize(4)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                curveHandSize === 4
                  ? "bg-[#c9a227] text-[#1a1a1a]"
                  : "bg-[#3d3d3d] text-[#a0a0a0] hover:text-[#f5f5f5]"
              }`}
            >
              4 Cards (Coin)
            </button>
          </div>

          {/* Keeping selector */}
          <div className="flex gap-2 mb-4">
            <span className="text-xs text-[#a0a0a0] self-center">Keeping:</span>
            {Array.from({ length: curveHandSize + 1 }, (_, i) => (
              <button
                key={i}
                onClick={() => setKeptCardsCount(i)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  keptCardsCount === i
                    ? "bg-[#c9a227] text-[#1a1a1a]"
                    : "bg-[#3d3d3d] text-[#a0a0a0] hover:text-[#f5f5f5]"
                }`}
              >
                {i} {i === 1 ? "card" : "cards"}
              </button>
            ))}
          </div>
          {keptCardsCount > 0 && (
            <p className="text-xs text-[#a0a0a0] mb-3 -mt-2">
              {keptCardsCount} card{keptCardsCount > 1 ? "s" : ""} kept — only the remaining {curveHandSize - keptCardsCount} card{curveHandSize - keptCardsCount !== 1 ? "s" : ""} are randomly drawn.
            </p>
          )}

          {/* Mana curve bar chart (read-only) */}
          <p className="text-xs text-[#a0a0a0] mb-2 font-medium">Deck Mana Curve</p>
          <div className="flex items-end gap-1 h-16 mb-4 bg-[#1a1a1a] rounded-lg p-3">
            {manaCurve.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-[#2563eb] rounded-t"
                  style={{ height: `${Math.min(count * 8, 64)}px` }}
                />
                <span className="text-[10px] text-[#a0a0a0]">{count}</span>
              </div>
            ))}
          </div>

          {/* Bucket constraints */}
          {totalCards < 3 ? (
            <p className="text-sm text-[#6B6B6B]">Add at least 3 cards to use the analyzer.</p>
          ) : (
            <>
              <p className="text-xs text-[#a0a0a0] mb-3">Set minimum cards per mana range:</p>
              <div className="flex gap-3 flex-wrap">
                {MANA_BUCKETS.map((bucket) => {
                  const constraint = curveConstraints.find((c) => c.bucketId === bucket.id);
                  const deckCount = bucketCounts[bucket.id] ?? 0;
                  const currentMin = constraint?.minCount ?? 0;
                  return (
                    <div
                      key={bucket.id}
                      className="flex flex-col items-center gap-2 bg-[#1a1a1a] rounded-lg p-3 min-w-[100px]"
                    >
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${bucket.color} text-white`}>
                        {bucket.label}
                      </span>
                      <span className="text-[10px] text-[#6B6B6B]">
                        Deck: <span className="text-[#a0a0a0]">{deckCount}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setConstraint(bucket.id, Math.max(0, currentMin - 1))}
                          className="w-6 h-6 flex items-center justify-center rounded bg-[#3d3d3d] text-[#a0a0a0] hover:text-[#f5f5f5] transition-colors text-sm"
                        >
                          −
                        </button>
                        <span className="text-sm font-semibold text-[#c9a227] w-4 text-center">
                          {currentMin}
                        </span>
                        <button
                          onClick={() => {
                            const others = curveConstraints
                              .filter((c) => c.bucketId !== bucket.id)
                              .reduce((sum, c) => sum + c.minCount, 0);
                            const maxAllowed = Math.max(0, curveHandSize - others);
                            setConstraint(bucket.id, Math.min(maxAllowed, currentMin + 1));
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded bg-[#3d3d3d] text-[#a0a0a0] hover:text-[#f5f5f5] transition-colors text-sm"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[10px] text-[#6B6B6B]">min cards</span>
                    </div>
                  );
                })}
              </div>

              {/* Probability result */}
              {manaCurveResult && (
                <div className="mt-4 bg-[#1a1a1a] rounded-lg p-4 text-center">
                  <p className="text-xs text-[#a0a0a0] mb-1">
                    {keptCardsCount > 0 ? `Probability (keeping ${keptCardsCount})` : 'Probability'}
                  </p>
                  <p className="text-2xl font-bold text-[#c9a227]">{(manaCurveResult.probability * 100).toFixed(2)}%</p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Approximately {manaCurveResult.oddsString}</p>
                  {manaCurveResult.interpretation && (
                    <p className="text-xs text-[#a0a0a0] mt-2">
                      of {manaCurveResult.totalHands.toLocaleString()} possible hands satisfy {" "}
                      <span className="text-[#c9a227]">{manaCurveResult.interpretation}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Clear constraints */}
              {curveConstraints.some((c) => c.minCount > 0) && (
                <button
                  onClick={clearConstraints}
                  className="mt-3 text-xs text-[#6B6B6B] hover:text-[#f5f5f5] transition-colors"
                >
                  Clear constraints
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Mana curve */}
      <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg p-4">
        <p className="text-xs text-[#a0a0a0] mb-2 font-medium">Mana Curve</p>
        <div className="flex items-end gap-1 h-16">
          {manaCurve.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-[#2563eb] rounded-t"
                style={{ height: `${Math.min(count * 8, 64)}px` }}
              />
              <span className="text-[10px] text-[#a0a0a0]">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deck list - compact grouped by type */}
      <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg overflow-hidden">
        {deckCards.length === 0 ? (
          <div className="text-center py-12 text-[#6B6B6B] text-sm">
            Your deck is empty. Browse cards and click to add them.
          </div>
        ) : (
          <div className="divide-y divide-[#3d3d3d]">
            {typeOrder.filter(t => grouped[t]?.length).map(type => (
              <div key={type}>
                <div className="px-4 py-1.5 bg-[#1a1a1a] text-[10px] text-[#6B6B6B] uppercase tracking-wider font-medium">
                  {type}s
                </div>
                {grouped[type].map((card) => (
                  <div
                    key={card.id}
                    className="relative flex items-center gap-3 px-4 py-1.5 hover:bg-[#3d3d3d] transition-colors group"
                    onMouseEnter={() => setHoveredCardId(card.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                  >
                    <span className={`w-4 text-xs text-center font-bold ${getRarityColor(card.rarity)}`}>{card.count}</span>
                    <span className={`flex-1 text-sm ${getRarityColor(card.rarity)}`}>{card.name}</span>
                    <span className="text-xs text-[#a0a0a0] w-4 text-center">{card.cost ?? "-"}</span>
                    {card.attack !== undefined && (
                      <>
                        <span className="text-xs text-[#ef4444]">{card.attack}</span>
                        <span className="text-xs text-[#22c55e]">{card.health ?? card.durability}</span>
                      </>
                    )}
                    <button
                      onClick={() => removeCard(card.id)}
                      className="text-[#6B6B6B] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Minus size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hover card image preview */}
      {hoveredCard && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 opacity-100 transition-opacity duration-150 pointer-events-none">
          <img
            src={getCardImageUrl(hoveredCard.id)}
            alt={hoveredCard.name}
            className="w-56 rounded-lg border-2 border-[#c9a227] shadow-2xl"
          />
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d3d3d]">
              <h3 className="text-lg font-semibold text-[#c9a227]">Import Deck Code</h3>
              <button onClick={() => { setShowImportModal(false); setImportError(null); }} className="text-[#6B6B6B] hover:text-[#f5f5f5] transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#a0a0a0] mb-3">Paste a Hearthstone deck code below:</p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="AAECAZ8FDsmgBMekBs2pBrHBBuHrBvD+BsODB4KYB+6oB++oB/CoB52pB+usB4qxBwiV9QXOqQbRqQbI/wa6lgfLqQfErge+sgcAAQPo3gbHpAb1swbHpAb3swbHpAYAAA=="
                className="w-full h-24 bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#6B6B6B] focus:outline-none focus:border-[#c9a227] resize-none font-mono"
              />
              {importError && <p className="text-sm text-[#ef4444] mt-2">{importError}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => { setShowImportModal(false); setImportError(null); }}
                className="px-4 py-2 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#a0a0a0] rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-[#c9a227] hover:bg-[#e0b830] text-[#1a1a1a] rounded-lg text-sm font-medium transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mulligan Modal ───────────────────────────────────────────────────────────

interface MulliganModalProps {
  hand: HS_Card[];
  deckCards: { [cardId: string]: number };
  allCards: HS_Card[];
  onMulligan: (withCoin: boolean) => void;
  onReplaceSelected: (cardsToReplace: HS_Card[]) => void;
  onClose: () => void;
}

function MulliganModal({ hand, deckCards, allCards, onMulligan, onReplaceSelected, onClose }: MulliganModalProps) {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [withCoin, setWithCoin] = useState(false);

  function toggleCard(cardId: string) {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }

  function handleReplace() {
    const cardsToReplace = hand.filter((c) => selectedCardIds.has(c.id));
    onReplaceSelected(cardsToReplace);
    setSelectedCardIds(new Set());
  }

  function handleClose() {
    setSelectedCardIds(new Set());
    onClose();
  }

  const actualHandSize = withCoin ? 4 : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d3d3d]">
          <h2 className="text-lg font-semibold text-[#c9a227] flex items-center gap-2">
            <Sparkles size={20} />
            Opening Hand
          </h2>
          <button onClick={handleClose} className="text-[#6B6B6B] hover:text-[#f5f5f5] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Coin toggle */}
        <div className="flex items-center justify-center gap-4 px-6 py-3 border-b border-[#3d3d3d]">
          <span className="text-xs text-[#a0a0a0]">Hand size:</span>
          <button
            onClick={() => setWithCoin(false)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              !withCoin ? "bg-[#c9a227] text-[#1a1a1a]" : "bg-[#3d3d3d] text-[#a0a0a0]"
            }`}
          >
            3 Cards
          </button>
          <button
            onClick={() => setWithCoin(true)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              withCoin ? "bg-[#c9a227] text-[#1a1a1a]" : "bg-[#3d3d3d] text-[#a0a0a0]"
            }`}
          >
            <Coins size={12} />
            4 Cards (Coin)
          </button>
        </div>

        {/* Cards */}
        <div className="p-6 flex justify-center gap-4 flex-wrap">
          {hand.slice(0, actualHandSize).map((card) => {
            const isSelected = selectedCardIds.has(card.id);
            return (
              <div key={card.id} className="w-36 flex flex-col items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => toggleCard(card.id)}
                    className={`relative block rounded-lg overflow-hidden transition-all ${
                      isSelected ? 'ring-4 ring-red-500/60' : 'hover:ring-2 hover:ring-red-400/40'
                    }`}
                  >
                    <img
                      src={getCardImageUrl(card.id)}
                      alt={card.name}
                      className="w-36 rounded-lg border-2 border-[#c9a227] shadow-lg"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center rounded-lg">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                          <X size={20} className="text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                  {card.cost !== undefined && (
                    <div className={`absolute -top-2 -left-2 ${getManaGemClass(card.cost)}`}>
                      {card.cost}
                    </div>
                  )}
                </div>
                <span className="text-xs text-[#a0a0a0] text-center">{card.name}</span>
              </div>
            );
          })}
        </div>
        {/* Actions */}
        <div className="flex justify-center gap-3 pb-6">
          <button
            onClick={() => onMulligan(withCoin)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#c9a227] hover:bg-[#e0b830] text-[#1a1a1a] rounded-lg text-sm font-medium transition-colors"
          >
            <Shuffle size={16} />
            Draw Fresh Hand
          </button>
          {selectedCardIds.size > 0 && (
            <button
              onClick={handleReplace}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Check size={16} />
              Replace ({selectedCardIds.size})
            </button>
          )}
          <button
            onClick={handleClose}
            className="px-5 py-2.5 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#f5f5f5] rounded-lg text-sm font-medium transition-colors"
          >
            Keep This Hand
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Game Tab ─────────────────────────────────────────────────────────────────

interface GameTabProps {
  deck: Deck;
  cards: HS_Card[];
  gameSession: GameSession | null;
  onStartGame: (session: GameSession) => void;
  onUpdateSession: (session: GameSession) => void;
  onExitGame: () => void;
}

interface RemainingCard {
  id: string;        // cardId (or runtime id for unknown)
  name: string;
  cost?: number;
  type: string;
  rarity?: string;
  copiesInDeck: number;    // total copies in game deck (remaining)
  originalCopies: number;  // copies in original deck
  isAdded: boolean;        // true = added mid-game
  isUnknown: boolean;     // true = unknown/manual card
  card?: HS_Card;          // real card from API (if available)
}

function GameTab({ deck, cards, gameSession, onStartGame, onUpdateSession, onExitGame }: GameTabProps) {
  const [drawSearch, setDrawSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // Manual add form
  const [manualName, setManualName] = useState("");
  const [manualCost, setManualCost] = useState<number>(0);
  const [manualType, setManualType] = useState<string>("MINION");
  const [manualRarity, setManualRarity] = useState<string>("COMMON");
  const [showManualForm, setShowManualForm] = useState(false);
  const [confirmNewGame, setConfirmNewGame] = useState(false);

  const totalDeckCards = Object.values(deck.cards).reduce((a, b) => a + b, 0);

  // Compute remaining deck (excludes drawn AND pending cards)
  const remainingDeck = useMemo<RemainingCard[]>(() => {
    if (!gameSession) return [];
    const counts: Record<string, { card: HS_Card | undefined; copiesInDeck: number; originalCopies: number; isAdded: boolean; isUnknown: boolean }> = {};

    // Start with original deck copies
    for (const [cardId, count] of Object.entries(gameSession.originalDeck.cards)) {
      const card = cards.find((c) => c.id === cardId);
      counts[cardId] = { card, copiesInDeck: count, originalCopies: count, isAdded: false, isUnknown: false };
    }

    // Remove drawn cards (committed)
    for (const entry of gameSession.drawnCards) {
      if (counts[entry.id]) {
        counts[entry.id].copiesInDeck--;
      }
    }

    // Remove pending cards (in hand this turn)
    for (const pendingId of gameSession.pendingCardIds) {
      if (counts[pendingId]) {
        counts[pendingId].copiesInDeck--;
      }
    }

    // Add mid-game cards
    for (const added of gameSession.addedCards) {
      if (counts[added.id]) {
        counts[added.id].copiesInDeck++;
      } else {
        counts[added.id] = { card: undefined, copiesInDeck: 1, originalCopies: 0, isAdded: true, isUnknown: added.isUnknown };
      }
    }

    return Object.entries(counts)
      .filter(([, v]) => v.copiesInDeck > 0)
      .map(([id, v]) => ({
        id,
        name: v.card?.name ?? id,
        cost: v.card?.cost ?? (v.isAdded && !v.isUnknown ? v.card?.cost : undefined),
        type: v.card?.type ?? "MINION",
        rarity: v.card?.rarity,
        copiesInDeck: v.copiesInDeck,
        originalCopies: v.originalCopies,
        isAdded: v.isAdded,
        isUnknown: v.isUnknown,
        card: v.card,
      }))
      .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
  }, [gameSession, cards]);

  const totalRemaining = remainingDeck.reduce((s, c) => s + c.copiesInDeck, 0);

  // Pending cards (drawn this turn, not yet committed)
  const pendingCards = useMemo(() => {
    if (!gameSession) return [];
    return gameSession.pendingCardIds.map((id) => {
      const card = cards.find((c) => c.id === id);
      return { id, name: card?.name ?? id, cost: card?.cost };
    });
  }, [gameSession, cards]);

  // Combined draw history (committed + pending), newest first
  const drawHistory = useMemo(() => {
    if (!gameSession) return [];
    const allDrawn: { id: string; name: string; cost?: number; turn: number; isPending: boolean }[] = [
      ...gameSession.drawnCards.map((entry) => {
        const card = cards.find((c) => c.id === entry.id);
        return { id: entry.id, name: card?.name ?? entry.id, cost: card?.cost, turn: entry.turnCommitted, isPending: false };
      }),
      ...gameSession.pendingCardIds.map((id) => {
        const card = cards.find((c) => c.id === id);
        return { id, name: card?.name ?? id, cost: card?.cost, turn: gameSession.currentTurn, isPending: true };
      }),
    ];
    return allDrawn.reverse(); // newest first
  }, [gameSession, cards]);

  // Search filtering for draw input
  const drawSuggestions = useMemo(() => {
    if (!drawSearch.trim()) return [];
    const q = drawSearch.toLowerCase();
    return remainingDeck
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [drawSearch, remainingDeck]);

  // Search filtering for add card input
  const addSuggestions = useMemo(() => {
    if (!addSearch.trim()) return [];
    const q = addSearch.toLowerCase();
    return cards
      .filter((c) => c.name.toLowerCase().includes(q) && !remainingDeck.find((r) => r.id === c.id))
      .slice(0, 8);
  }, [addSearch, cards, remainingDeck]);

  function handleStartGame() {
    onStartGame({
      originalDeck: { ...deck },
      drawnCards: [],
      addedCards: [],
      pendingCardIds: [],
      currentTurn: 0,
    });
  }

  function handleNewGame() {
    if (gameSession && (gameSession.drawnCards.length > 0 || gameSession.pendingCardIds.length > 0) && !confirmNewGame) {
      setConfirmNewGame(true);
      return;
    }
    setConfirmNewGame(false);
    onStartGame({
      originalDeck: { ...deck },
      drawnCards: [],
      addedCards: [],
      pendingCardIds: [],
      currentTurn: 0,
    });
  }

  function addToHand(card: RemainingCard) {
    if (!gameSession) return;
    // Don't add if already at 0 copies in remaining (somehow)
    onUpdateSession({
      ...gameSession,
      pendingCardIds: [...gameSession.pendingCardIds, card.id],
    });
    setDrawSearch("");
  }

  function undoPending(cardId: string) {
    if (!gameSession) return;
    onUpdateSession({
      ...gameSession,
      pendingCardIds: gameSession.pendingCardIds.filter((id) => id !== cardId),
    });
  }

  function commitTurn() {
    if (!gameSession) return;
    const turnToCommit = gameSession.currentTurn;
    const newDrawn: import("@/lib/types").DrawnCardEntry[] = [
      ...gameSession.drawnCards,
      ...gameSession.pendingCardIds.map((id) => ({ id, turnCommitted: turnToCommit })),
    ];
    onUpdateSession({
      ...gameSession,
      drawnCards: newDrawn,
      pendingCardIds: [],
      currentTurn: gameSession.currentTurn + 1,
    });
  }

  function addKnownCard(hsCard: HS_Card) {
    if (!gameSession) return;
    const newCard: GameCard = {
      id: `added-${Date.now()}-${hsCard.id}`,
      name: hsCard.name,
      cost: hsCard.cost,
      type: hsCard.type,
      rarity: hsCard.rarity,
      isUnknown: false,
    };
    onUpdateSession({ ...gameSession, addedCards: [...gameSession.addedCards, newCard] });
    setAddSearch("");
    setShowAddPanel(false);
  }

  function addManualCard() {
    if (!gameSession || !manualName.trim()) return;
    const newCard: GameCard = {
      id: `unknown-${Date.now()}`,
      name: manualName.trim(),
      cost: manualCost,
      type: manualType,
      rarity: manualRarity,
      isUnknown: true,
    };
    onUpdateSession({ ...gameSession, addedCards: [...gameSession.addedCards, newCard] });
    setManualName("");
    setManualCost(0);
    setManualType("MINION");
    setManualRarity("COMMON");
    setShowManualForm(false);
    setShowAddPanel(false);
    setAddSearch("");
  }

  // ── No active session: Start Game splash ──────────────────────────────────
  if (!gameSession) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <Gamepad2 size={48} className="text-[#c9a227]" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#f5f5f5] mb-2">In-Game Tracker</h2>
          <p className="text-[#6B6B6B] text-sm max-w-xs">
            Track cards drawn during a game and see exact draw probabilities for the remaining deck.
          </p>
        </div>
        {totalDeckCards < 1 ? (
          <p className="text-sm text-[#6B6B6B]">Add cards to your deck first to start a game.</p>
        ) : (
          <button
            onClick={handleStartGame}
            className="flex items-center gap-2 px-6 py-3 bg-[#c9a227] hover:bg-[#e0b830] text-[#1a1a1a] rounded-lg font-medium transition-colors"
          >
            <Sparkles size={18} />
            Start Game ({totalDeckCards} cards)
          </button>
        )}
      </div>
    );
  }

  // ── Active session ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Gamepad2 size={20} className="text-[#c9a227]" />
          <h2 className="text-lg font-semibold text-[#f5f5f5]">{deck.name}</h2>
          <span className="text-sm text-[#6B6B6B]">{totalRemaining} cards remaining</span>
        </div>
        <div className="flex gap-2">
          {confirmNewGame ? (
            <>
              <span className="text-xs text-[#a0a0a0] self-center">Discard drawn history?</span>
              <button
                onClick={handleNewGame}
                className="px-3 py-1.5 bg-[#ef4444] hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Confirm New
              </button>
              <button
                onClick={() => setConfirmNewGame(false)}
                className="px-3 py-1.5 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#a0a0a0] rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleNewGame}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#a0a0a0] hover:text-[#f5f5f5] rounded-lg text-sm transition-colors"
            >
              <RotateCcw size={14} />
              New Game
            </button>
          )}
          <button
            onClick={onExitGame}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#a0a0a0] hover:text-[#f5f5f5] rounded-lg text-sm transition-colors"
          >
            Exit to My Deck
          </button>
        </div>
      </div>

      {/* Turn Header */}
      <div className="flex items-center justify-between gap-4 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <FlipHorizontal size={18} className="text-[#c9a227]" />
          <span className="text-sm font-semibold text-[#f5f5f5]">Turn {gameSession.currentTurn}</span>
          {pendingCards.length > 0 && (
            <span className="text-xs text-[#6B6B6B]">{pendingCards.length} card{pendingCards.length !== 1 ? "s" : ""} in hand</span>
          )}
        </div>
        <div className="flex gap-2">
          {pendingCards.length > 0 && (
            <button
              onClick={commitTurn}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <CheckCircle size={14} />
              Commit Turn
            </button>
          )}
        </div>
      </div>

      {/* Add to Hand */}
      <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg p-4">
        <p className="text-xs text-[#a0a0a0] mb-2 font-medium">Add to hand</p>
        <div className="relative">
          <input
            type="text"
            value={drawSearch}
            onChange={(e) => setDrawSearch(e.target.value)}
            placeholder="Search remaining deck..."
            disabled={totalRemaining === 0}
            className="w-full bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg px-4 py-2.5 text-sm text-[#f5f5f5] placeholder-[#6B6B6B] focus:outline-none focus:border-[#c9a227] transition-colors disabled:opacity-50"
          />
          {drawSearch && drawSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg overflow-hidden z-20 shadow-xl">
              {drawSuggestions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => addToHand(c)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#3d3d3d] transition-colors text-left"
                >
                  <PlusCircle size={14} className="text-emerald-400 shrink-0" />
                  <span className="text-xs text-[#6B6B6B] w-4 text-center">{c.cost ?? "?"}</span>
                  <span className={`text-sm flex-1 ${getRarityColor(c.rarity)}`}>{c.name}</span>
                  <span className="text-xs text-[#6B6B6B]">×{c.copiesInDeck}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Current Hand */}
      {pendingCards.length > 0 && (
        <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-[#1a1a1a]">
            <p className="text-xs text-[#6B6B6B] font-medium uppercase tracking-wider">Current Hand ({pendingCards.length})</p>
          </div>
          <div className="divide-y divide-[#3d3d3d]">
            {pendingCards.map((card) => (
              <div key={card.id} className="flex items-center gap-3 px-4 py-1.5">
                <button
                  onClick={() => undoPending(card.id)}
                  className="text-[#6B6B6B] hover:text-[#ef4444] transition-colors shrink-0"
                  title="Remove from hand"
                >
                  <Minus size={12} />
                </button>
                <span className="text-xs text-[#6B6B6B] w-4 text-center">{card.cost ?? "?"}</span>
                <span className="flex-1 text-sm text-[#a0a0a0]">{card.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Card to In-Game Deck */}
      <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[#a0a0a0] font-medium">Add card to in-game deck</p>
          <button
            onClick={() => { setShowAddPanel(!showAddPanel); setShowManualForm(false); setAddSearch(""); }}
            className="text-xs text-[#c9a227] hover:text-[#e0b830] transition-colors"
          >
            {showAddPanel ? "Cancel" : "+ Add Card"}
          </button>
        </div>
        {showAddPanel && (
          <div className="space-y-3">
            {!showManualForm ? (
              <>
                <input
                  type="text"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Search all cards..."
                  className="w-full bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg px-4 py-2.5 text-sm text-[#f5f5f5] placeholder-[#6B6B6B] focus:outline-none focus:border-[#c9a227] transition-colors"
                />
                {addSearch && addSuggestions.length > 0 && (
                  <div className="bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg overflow-hidden">
                    {addSuggestions.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => addKnownCard(c)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#3d3d3d] transition-colors text-left"
                      >
                        <span className="text-xs text-[#6B6B6B] w-4 text-center">{c.cost ?? "?"}</span>
                        <span className={`text-sm flex-1 ${getRarityColor(c.rarity)}`}>{c.name}</span>
                        <span className="text-xs text-[#6B6B6B] capitalize">{c.type.toLowerCase()}</span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowManualForm(true)}
                  className="text-xs text-[#6B6B6B] hover:text-[#f5f5f5] transition-colors"
                >
                  Card not found? Enter manually →
                </button>
              </>
            ) : (
              <div className="space-y-2 bg-[#1a1a1a] rounded-lg p-3">
                <p className="text-xs text-[#a0a0a0] font-medium mb-2">Manual Entry</p>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Card name"
                  className="w-full bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder-[#6B6B6B] focus:outline-none focus:border-[#c9a227]"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={manualCost}
                    onChange={(e) => setManualCost(Number(e.target.value))}
                    placeholder="Cost"
                    className="w-20 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a227]"
                  />
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value)}
                    className="flex-1 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a227]"
                  >
                    <option value="MINION">Minion</option>
                    <option value="SPELL">Spell</option>
                    <option value="WEAPON">Weapon</option>
                  </select>
                  <select
                    value={manualRarity}
                    onChange={(e) => setManualRarity(e.target.value)}
                    className="flex-1 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a227]"
                  >
                    <option value="COMMON">Common</option>
                    <option value="RARE">Rare</option>
                    <option value="EPIC">Epic</option>
                    <option value="LEGENDARY">Legendary</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowManualForm(false)}
                    className="px-3 py-1.5 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#a0a0a0] rounded-lg text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addManualCard}
                    disabled={!manualName.trim()}
                    className="px-3 py-1.5 bg-[#c9a227] hover:bg-[#e0b830] text-[#1a1a1a] rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    Add Card
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remaining Deck */}
      <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-[#1a1a1a]">
          <p className="text-xs text-[#6B6B6B] font-medium uppercase tracking-wider">Remaining Deck ({totalRemaining})</p>
        </div>
        {remainingDeck.length === 0 ? (
          <div className="text-center py-8 text-[#6B6B6B] text-sm">No cards remaining in deck.</div>
        ) : (
          <div className="divide-y divide-[#3d3d3d]">
            {remainingDeck.map((card) => {
              const prob = totalRemaining > 0 ? (card.copiesInDeck / totalRemaining) : 0;
              return (
                <div
                  key={card.id}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-[#3d3d3d] transition-colors group"
                  onClick={() => addToHand(card)}
                  onMouseEnter={() => { setHoveredCardId(card.id); }}
                  onMouseLeave={() => setHoveredCardId(null)}
                  onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                >
                  <span className="opacity-0 group-hover:opacity-100 text-emerald-400 shrink-0 transition-opacity">
                    <PlusCircle size={16} />
                  </span>
                  <span className="text-xs text-[#6B6B6B] w-4 text-center">{card.cost ?? "?"}</span>
                  <span className={`flex-1 text-sm ${getRarityColor(card.rarity)}`}>{card.name}</span>
                  {card.isUnknown && (
                    <span className="text-[10px] text-[#f59e0b] bg-amber-950 px-1.5 py-0.5 rounded">?</span>
                  )}
                  {card.isAdded && !card.isUnknown && (
                    <span className="text-[10px] text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded">added</span>
                  )}
                  <span className="text-xs text-[#a0a0a0] w-6 text-center">×{card.copiesInDeck}</span>
                  <span className="text-xs text-[#c9a227] w-16 text-right">{prob > 0 ? `${(prob * 100).toFixed(1)}%` : "—"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Draw History */}
      {drawHistory.length > 0 && (
        <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-[#1a1a1a]">
            <p className="text-xs text-[#6B6B6B] font-medium uppercase tracking-wider">Drawn History</p>
          </div>
          <div className="divide-y divide-[#3d3d3d]">
            {drawHistory.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-1.5">
                <span className="text-[10px] text-[#6B6B6B] w-8">T{entry.turn}</span>
                <span className="text-xs text-[#6B6B6B] w-4 text-center">{entry.cost ?? "?"}</span>
                <span className="flex-1 text-sm text-[#a0a0a0]">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hover Card Preview */}
      {hoveredCardId && (() => {
        const card = remainingDeck.find((c) => c.id === hoveredCardId);
        if (!card) return null;
        const prob = totalRemaining > 0 ? (card.copiesInDeck / totalRemaining) : 0;
        return (
          <div
            className="fixed z-50 bg-[#2d2d2d] border border-[#c9a227] rounded-xl w-56 overflow-hidden shadow-2xl pointer-events-none"
            style={{
              left: Math.min(mousePos.x + 16, window.innerWidth - 240),
              top: Math.min(mousePos.y - 80, window.innerHeight - 320),
            }}
          >
            {card.card && !card.isUnknown ? (
              <img src={getCardImageUrl(card.card.id)} alt={card.name} className="w-full aspect-[5/7] object-cover" />
            ) : (
              <div className="w-full aspect-[5/7] bg-[#1a1a1a] flex items-center justify-center">
                <span className="text-3xl text-[#6B6B6B]">?</span>
              </div>
            )}
            <div className="p-3 space-y-1">
              <p className={`text-sm font-semibold ${getRarityColor(card.rarity)}`}>{card.name}</p>
              <p className="text-xs text-[#a0a0a0]">{card.copiesInDeck} of {totalRemaining} cards</p>
              <p className="text-lg font-bold text-[#c9a227]">{prob > 0 ? `${(prob * 100).toFixed(1)}%` : "—"}</p>
              <p className="text-xs text-[#6B6B6B]">{probabilityToOdds(prob)}</p>
              {card.originalCopies > 0 && (
                <p className="text-[10px] text-[#6B6B6B]">
                  {card.originalCopies} in original deck
                  {card.copiesInDeck < card.originalCopies && ` · ${card.originalCopies - card.copiesInDeck} drawn`}
                </p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [cards, setCards] = useState<HS_Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"browse" | "deck" | "game">("browse");
  const [gameSession, onUpdateSession] = useState<GameSession | null>(null);
  const [deck, setDeck] = useState<Deck>(() => loadActiveDeck() ?? {
    id: "default",
    name: "My Deck",
    cards: {},
    createdAt: Date.now(),
  });
  const [mulliganHand, setMulliganHand] = useState<HS_Card[] | null>(null);
  const [hasMulliganed, setHasMulliganed] = useState(false);

  useEffect(() => {
    ensureStandardSets(); // Warm Standard sets cache from wiki (falls back to static list)
    fetchCards()
      .then((data) => {
        // Only keep collectible cards that have a cost
        const collectible = data.filter((c) => c.cost !== undefined && c.type !== "ENCHANTMENT");
        setCards(collectible);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load cards. Make sure you're connected to the internet.");
        setLoading(false);
      });
  }, []);

  // Persist active deck
  useEffect(() => {
    saveActiveDeck(deck);
  }, [deck]);

  function addToDeck(card: HS_Card) {
    const maxCount = card.rarity === "LEGENDARY" ? 1 : 2;
    const current = deck.cards[card.id] ?? 0;
    if (current >= maxCount) return; // Can't add more
    setDeck((prev) => ({
      ...prev,
      cards: { ...prev.cards, [card.id]: current + 1 },
    }));
  }

  function updateDeck(updated: Deck) {
    setDeck(updated);
  }

  function importDeckCode(cardsFromCode: { [cardId: string]: number }, heroClass: string | null) {
    setDeck((prev) => ({
      ...prev,
      cards: cardsFromCode,
      heroClass: heroClass ?? undefined,
    }));
  }

  function drawMulligan(withCoin: boolean = false) {
    const cardIds = Object.keys(deck.cards);
    if (cardIds.length < 3) return;
    // Shuffle and draw 3 or 4 cards depending on coin
    const shuffled = [...cardIds].sort(() => Math.random() - 0.5);
    const handSize = withCoin ? 4 : 3;
    const hand = shuffled.slice(0, handSize).map((id) => {
      const card = cards.find((c) => c.id === id)!;
      return card;
    }).filter(Boolean);
    setMulliganHand(hand);
    setHasMulliganed(true);
  }

  function replaceMulligan(
    currentHand: HS_Card[],
    cardsToReplace: HS_Card[]
  ): HS_Card[] {
    // Cards being kept (not replaced)
    const replacedIdSet = new Set(cardsToReplace.map((c) => c.id));
    const keptCards = currentHand.filter((c) => !replacedIdSet.has(c.id));

    // Build remaining deck: all cards minus those currently in hand (whole hand goes back)
    const inHandSet = new Set(currentHand.map((c) => c.id));
    const flatDeck: string[] = [];
    for (const [cardId, qty] of Object.entries(deck.cards)) {
      let removed = 0;
      for (let i = 0; i < qty; i++) {
        if (inHandSet.has(cardId) && removed < qty) {
          removed++;
          continue;
        }
        flatDeck.push(cardId);
      }
    }

    // Fisher-Yates shuffle
    for (let i = flatDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flatDeck[i], flatDeck[j]] = [flatDeck[j], flatDeck[i]];
    }

    // Draw replacement cards
    const numToReplace = cardsToReplace.length;
    const newDrawIds = flatDeck.slice(0, numToReplace);
    const newDrawCards = newDrawIds
      .map((id) => cards.find((c) => c.id === id))
      .filter((c): c is HS_Card => c !== undefined);

    return [...keptCards, ...newDrawCards];
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#c9a227] text-4xl mb-4">🃏</div>
          <p className="text-[#a0a0a0]">Loading cards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="text-[#ef4444] text-4xl mb-4">⚠️</div>
          <p className="text-[#f5f5f5] mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#c9a227] hover:bg-[#e0b830] text-[#1a1a1a] rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mulligan Modal */}
      {mulliganHand && (
        <MulliganModal
          hand={mulliganHand}
          deckCards={deck.cards}
          allCards={cards}
          onMulligan={(withCoin: boolean) => {
            setMulliganHand(null);
            setTimeout(() => drawMulligan(withCoin), 50);
          }}
          onReplaceSelected={(cardsToReplace) => {
            const newHand = replaceMulligan(mulliganHand, cardsToReplace);
            setMulliganHand(newHand);
          }}
          onClose={() => setMulliganHand(null)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#1a1a1a] border-b border-[#3d3d3d]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#c9a227]">🃏 Hearthstone Deck Builder</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 border-b border-[#3d3d3d]">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "browse"
                ? "text-[#c9a227] border-b-2 border-[#c9a227] -mb-px"
                : "text-[#6B6B6B] hover:text-[#f5f5f5]"
            }`}
          >
            Browse Cards
          </button>
          <button
            onClick={() => setActiveTab("deck")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "deck"
                ? "text-[#c9a227] border-b-2 border-[#c9a227] -mb-px"
                : "text-[#6B6B6B] hover:text-[#f5f5f5]"
            }`}
          >
            My Deck
            {Object.keys(deck.cards).length > 0 && (
              <span className="bg-[#c9a227] text-[#1a1a1a] text-xs px-1.5 py-0.5 rounded font-bold">
                {Object.values(deck.cards).reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("game")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "game"
                ? "text-[#c9a227] border-b-2 border-[#c9a227] -mb-px"
                : "text-[#6B6B6B] hover:text-[#f5f5f5]"
            }`}
          >
            <Gamepad2 size={16} />
            Game
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "browse" ? (
          <BrowseTab cards={cards} onAddToDeck={addToDeck} />
        ) : activeTab === "deck" ? (
          <MyDeckTab
            deck={deck}
            cards={cards}
            onUpdateDeck={updateDeck}
            onMulligan={drawMulligan}
            hasMulliganed={hasMulliganed}
            onResetMulligan={() => setHasMulliganed(false)}
            onImportCode={importDeckCode}
          />
        ) : (
          <GameTab
            deck={deck}
            cards={cards}
            gameSession={gameSession}
            onStartGame={onUpdateSession}
            onUpdateSession={onUpdateSession}
            onExitGame={() => {
              onUpdateSession(null);
              setActiveTab("deck");
            }}
          />
        )}
      </main>
    </div>
  );
}