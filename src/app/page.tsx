"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Minus, Shuffle, X, Sparkles, Copy, Upload, Calculator, RotateCcw } from "lucide-react";
import { HS_Card, Deck, CardType, Rarity, ManaCost } from "@/lib/types";
import { fetchCards, getCardImageUrl, filterCards, getRarityColor, deckFromCode, deckToCode } from "@/lib/hearthstone";
import { loadDecks, saveDecks, loadActiveDeck, saveActiveDeck } from "@/lib/deckStorage";
import { calculateMulliganProbability, probabilityToOdds } from "@/lib/probability";

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
        <span className="text-[10px] text-[#a0a0a0] capitalize">{card.type.toLowerCase()}</span>
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
  onImportCode: (cards: { [cardId: string]: number }) => void;
}

function MyDeckTab({ deck, cards, onUpdateDeck, onMulligan, hasMulliganed, onResetMulligan, onImportCode }: MyDeckTabProps) {
  const [editingName, setEditingName] = useState(false);
  const [deckName, setDeckName] = useState(deck.name);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMulliganCalc, setShowMulliganCalc] = useState(false);
  const [selectedMulliganCards, setSelectedMulliganCards] = useState<{ cardId: string; count: number }[]>([]);
  const [mulliganHandSize, setMulliganHandSize] = useState<3 | 4>(3);

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
      const decoded = deckFromCode(importText, cards);
      if (Object.keys(decoded).length === 0) {
        setImportError("No valid cards found in this code. Make sure cards are loaded.");
        return;
      }
      onImportCode(decoded);
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

  function toggleMulliganCard(cardId: string) {
    setSelectedMulliganCards((prev) => {
      const existing = prev.find((c) => c.cardId === cardId);
      const deckCount = deck.cards[cardId] || 0;

      if (existing) {
        if (existing.count >= deckCount) {
          // At max, remove it
          return prev.filter((c) => c.cardId !== cardId);
        } else {
          // Increment count
          return prev.map((c) =>
            c.cardId === cardId ? { ...c, count: c.count + 1 } : c
          );
        }
      } else {
        // Not selected, add with count 1
        if (prev.reduce((sum, c) => sum + c.count, 0) >= mulliganHandSize) {
          return prev;
        }
        return [...prev, { cardId, count: 1 }];
      }
    });
  }

  function clearMulliganSelection() {
    setSelectedMulliganCards([]);
  }

  const mulliganProbability =
    selectedMulliganCards.reduce((sum, c) => sum + c.count, 0) === mulliganHandSize
      ? calculateMulliganProbability(deck.cards, mulliganHandSize, selectedMulliganCards)
      : null;

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
            onClick={() => setShowMulliganCalc(!showMulliganCalc)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              showMulliganCalc
                ? "bg-[#c9a227] text-[#1a1a1a]"
                : "bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#a0a0a0] hover:text-[#f5f5f5]"
            }`}
            title="Mulligan Calculator"
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

      {/* Mulligan Calculator */}
      {showMulliganCalc && (
        <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#c9a227]">Mulligan Probability Calculator</h3>
            <button onClick={() => setShowMulliganCalc(false)} className="text-[#6B6B6B] hover:text-[#f5f5f5] transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Hand size selector */}
          <div className="flex gap-2 mb-4">
            <span className="text-xs text-[#a0a0a0] self-center">Hand size:</span>
            <button
              onClick={() => { setMulliganHandSize(3); setSelectedMulliganCards([]); }}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mulliganHandSize === 3
                  ? "bg-[#c9a227] text-[#1a1a1a]"
                  : "bg-[#3d3d3d] text-[#a0a0a0] hover:text-[#f5f5f5]"
              }`}
            >
              3 Cards
            </button>
            <button
              onClick={() => { setMulliganHandSize(4); setSelectedMulliganCards([]); }}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mulliganHandSize === 4
                  ? "bg-[#c9a227] text-[#1a1a1a]"
                  : "bg-[#3d3d3d] text-[#a0a0a0] hover:text-[#f5f5f5]"
              }`}
            >
              4 Cards (Coin)
            </button>
          </div>

          {/* Card selection */}
          {totalCards < 3 ? (
            <p className="text-sm text-[#6B6B6B]">Add at least 3 cards to use the calculator.</p>
          ) : (
            <>
              <p className="text-xs text-[#a0a0a0] mb-2">
                Select {mulliganHandSize} cards to calculate probability of drawing exactly those in your opening hand.
                {selectedMulliganCards.reduce((sum, c) => sum + c.count, 0) > 0 && selectedMulliganCards.reduce((sum, c) => sum + c.count, 0) < mulliganHandSize && (
                  <span className="text-[#c9a227]"> ({selectedMulliganCards.reduce((sum, c) => sum + c.count, 0)} of {mulliganHandSize} selected)</span>
                )}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto mb-4">
                {deckCards.map((card) => {
                  const selection = selectedMulliganCards.find((c) => c.cardId === card.id);
                  const isSelected = !!selection;
                  return (
                    <button
                      key={card.id}
                      onClick={() => toggleMulliganCard(card.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-[#c9a227] text-[#1a1a1a]"
                          : "bg-[#1a1a1a] hover:bg-[#3d3d3d] text-[#a0a0a0]"
                      }`}
                    >
                      <span className={isSelected ? "" : getManaGemClass(card.cost ?? 0)}>
                        {card.cost ?? 0}
                      </span>
                      <span className="flex-1 truncate">{card.name}</span>
                      {card.count === 2 && (
                        <span className={`text-[10px] ${isSelected ? "text-[#1a1a1a]/70" : "text-[#6B6B6B]"}`}>×2</span>
                      )}
                      {isSelected && selection && selection.count > 1 && (
                        <span className={`text-[10px] ${isSelected ? "text-[#1a1a1a]/70" : "text-[#6B6B6B]"}`}>×{selection.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Probability result */}
              {selectedMulliganCards.reduce((sum, c) => sum + c.count, 0) === mulliganHandSize && mulliganProbability !== null && (
                <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
                  <p className="text-xs text-[#a0a0a0] mb-1">Probability</p>
                  <p className="text-2xl font-bold text-[#c9a227]">{(mulliganProbability * 100).toFixed(2)}%</p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Approximately {probabilityToOdds(mulliganProbability)}</p>
                </div>
              )}

              {/* Clear selection */}
              {selectedMulliganCards.length > 0 && (
                <button
                  onClick={clearMulliganSelection}
                  className="mt-3 text-xs text-[#6B6B6B] hover:text-[#f5f5f5] transition-colors"
                >
                  Clear selection
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
                  <div key={card.id} className="flex items-center gap-3 px-4 py-1.5 hover:bg-[#3d3d3d] transition-colors group">
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
  onMulligan: () => void;
  onClose: () => void;
}

function MulliganModal({ hand, onMulligan, onClose }: MulliganModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d3d3d]">
          <h2 className="text-lg font-semibold text-[#c9a227] flex items-center gap-2">
            <Sparkles size={20} />
            Opening Hand
          </h2>
          <button onClick={onClose} className="text-[#6B6B6B] hover:text-[#f5f5f5] transition-colors">
            <X size={20} />
          </button>
        </div>
        {/* Cards */}
        <div className="p-6 flex justify-center gap-4 flex-wrap">
          {hand.map((card) => (
            <div key={card.id} className="w-36 flex flex-col items-center gap-2">
              <div className="relative">
                <img
                  src={getCardImageUrl(card.id)}
                  alt={card.name}
                  className="w-36 rounded-lg border-2 border-[#c9a227] shadow-lg"
                />
                {card.cost !== undefined && (
                  <div className={`absolute -top-2 -left-2 ${getManaGemClass(card.cost)}`}>
                    {card.cost}
                  </div>
                )}
              </div>
              <span className="text-xs text-[#a0a0a0] text-center">{card.name}</span>
            </div>
          ))}
        </div>
        {/* Actions */}
        <div className="flex justify-center gap-3 pb-6">
          <button
            onClick={onMulligan}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#c9a227] hover:bg-[#e0b830] text-[#1a1a1a] rounded-lg text-sm font-medium transition-colors"
          >
            <Shuffle size={16} />
            Mulligan (Draw New Hand)
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#f5f5f5] rounded-lg text-sm font-medium transition-colors"
          >
            Keep This Hand
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [cards, setCards] = useState<HS_Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"browse" | "deck">("browse");
  const [deck, setDeck] = useState<Deck>(() => loadActiveDeck() ?? {
    id: "default",
    name: "My Deck",
    cards: {},
    createdAt: Date.now(),
  });
  const [mulliganHand, setMulliganHand] = useState<HS_Card[] | null>(null);
  const [hasMulliganed, setHasMulliganed] = useState(false);

  useEffect(() => {
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

  function importDeckCode(cardsFromCode: { [cardId: string]: number }) {
    setDeck((prev) => ({
      ...prev,
      cards: cardsFromCode,
    }));
  }

  function drawMulligan() {
    const cardIds = Object.keys(deck.cards);
    if (cardIds.length < 3) return;
    // Shuffle and draw 3 (or 4 if you could have the coin - but let's keep it simple: 3)
    const shuffled = [...cardIds].sort(() => Math.random() - 0.5);
    const hand = shuffled.slice(0, 3).map((id) => {
      const card = cards.find((c) => c.id === id)!;
      return card;
    }).filter(Boolean);
    setMulliganHand(hand);
    setHasMulliganed(true);
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
          onMulligan={() => {
            setMulliganHand(null);
            setTimeout(drawMulligan, 50);
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
        </div>

        {/* Tab content */}
        {activeTab === "browse" ? (
          <BrowseTab cards={cards} onAddToDeck={addToDeck} />
        ) : (
          <MyDeckTab
            deck={deck}
            cards={cards}
            onUpdateDeck={updateDeck}
            onMulligan={drawMulligan}
            hasMulliganed={hasMulliganed}
            onResetMulligan={() => setHasMulliganed(false)}
            onImportCode={importDeckCode}
          />
        )}
      </main>
    </div>
  );
}