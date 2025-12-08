import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardInstance, Counters, Zone, GameState, GameLogEntry, LogActionType, GamePhase } from '../types';
import { importDeckFromText, isLegendaryCreature, fetchRandomCards } from '../api/scryfall';
import { DEMO_DECK, DEMO_COMMANDER } from '../data/demoDeck';
import { calculateSmartLayout, CardPosition } from '../utils/calculateSmartLayout';

// Randomizer result types
export type RandomResult = {
    type: 'coin' | 'die' | 'planar';
    value: string | number;
    label: string;
    timestamp: number;
};

// Mana Pool type for floating mana
export interface ManaPool {
    W: number; // White
    U: number; // Blue
    B: number; // Black
    R: number; // Red
    G: number; // Green
    C: number; // Colorless
}

const initialManaPool: ManaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

const initialCounters: Counters = {
    poison: 0,
    energy: 0,
    experience: 0,
    rad: 0,
    tickets: 0,
    commanderTax: 0,
    stormCount: 0,
};

// History snapshot for undo/redo
interface GameSnapshot {
    cards: CardInstance[];
    life: number;
    turn: number;
    counters: Counters;
    manaPool: ManaPool;
}

const MAX_HISTORY = 50;

interface GameStore extends GameState {
    gameStarted: boolean;
    gamePhase: GamePhase;
    mulliganCount: number;
    commanderCardId: string | null;
    inspectCard: Card | null;
    inspectCardId: string | null; // For layoutId matching in shared element transitions
    lastRandomResult: RandomResult | null;
    isTopCardRevealed: boolean; // For "play with top card revealed" effects
    recentlySummonedCards: Set<string>; // Track cards that just entered battlefield for animation

    // Mana Pool
    manaPool: ManaPool;
    adjustMana: (color: keyof ManaPool, amount: number) => void;
    clearManaPool: () => void;

    // History for Undo/Redo
    historyPast: GameSnapshot[];
    historyFuture: GameSnapshot[];
    undo: () => void;
    redo: () => void;

    // Inspector
    setInspectCard: (card: Card | null, cardId?: string | null) => void;

    // Deck Import
    importDeck: (commanderName: string, deckText: string) => Promise<{ success: boolean; notFound: string[] }>;
    loadDemoDeck: () => Promise<void>;
    loadRandomDeck: () => Promise<void>;

    // Initialization
    initializeGame: () => Promise<void>;

    // Life & Turn
    setLife: (life: number) => void;
    adjustLife: (amount: number) => void;
    incrementTurn: () => void;
    nextTurn: () => void;

    // Counters
    setCounter: (type: keyof Counters, value: number) => void;
    adjustCounter: (type: keyof Counters, amount: number) => void;

    // Card actions
    moveCard: (cardId: string, toZone: Zone, position?: 'top' | 'bottom') => void;
    tapCard: (cardId: string) => void;
    untapCard: (cardId: string) => void;
    toggleTap: (cardId: string) => void;
    untapAll: () => void;

    // Library actions
    drawCard: () => void;
    drawCards: (count: number) => void;
    shuffleLibrary: () => void;
    millCard: () => void;
    millCards: (count: number) => void;
    toggleTopCardRevealed: () => void;
    putTopCardToBottom: () => void;

    // Randomizers
    flipCoin: () => void;
    rollDie: (sides: number) => void;
    rollDoubleDice: () => void;
    rollPlanarDie: () => void;
    clearRandomResult: () => void;

    // Game actions
    resetMatch: () => void;
    returnToMenu: () => void;
    getCardsByZone: (zone: Zone) => CardInstance[];
    clearSummonedCard: (cardId: string) => void;
    createToken: (card: Card) => void;
    duplicateCard: (cardId: string) => void;

    // Mulligan Actions
    mulligan: () => void;
    keepHand: (cardsToBottomIds: string[]) => void;

    // Game Log
    gameLog: GameLogEntry[];
    addLogEntry: (actionType: LogActionType, message: string) => void;
    clearGameLog: () => void;

    // Scry/Library Manipulation
    applyScryChanges: (changes: {
        newTopOrder: string[];
        toBottom: string[];
        toGraveyard: string[];
        toExile: string[];
    }) => void;

    // Attachment Actions
    attachCard: (sourceId: string, targetId: string) => void;
    detachCard: (cardId: string) => void;

    // Targeting Mode
    targetingMode: {
        active: boolean;
        sourceCardId: string | null;
    };
    startTargeting: (sourceCardId: string) => void;
    cancelTargeting: () => void;
    completeTargeting: (targetId: string) => void;

    // Card Positions for Battlefield Layout
    cardPositions: Record<string, CardPosition>;
    autoArrangeBattlefield: () => void;
    setCardPosition: (cardId: string, x: number, y: number) => void;
}

// Helper to create a snapshot for undo
const createSnapshot = (state: GameStore): GameSnapshot => ({
    cards: JSON.parse(JSON.stringify(state.cards)),
    life: state.life,
    turn: state.turn,
    counters: { ...state.counters },
    manaPool: { ...state.manaPool },
});

export const useGameStore = create<GameStore>((set, get) => ({
    life: 40,
    turn: 1,
    counters: { ...initialCounters },
    cards: [],
    isLoading: false,
    error: null,
    lastRandomResult: null,
    gameStarted: false,
    gamePhase: 'SETUP',
    mulliganCount: 0,
    commanderCardId: null,
    isTopCardRevealed: false,
    inspectCard: null,
    inspectCardId: null,
    recentlySummonedCards: new Set<string>(),

    // Targeting Mode
    targetingMode: {
        active: false,
        sourceCardId: null,
    },

    // Mana Pool
    manaPool: { ...initialManaPool },

    // History
    historyPast: [],
    historyFuture: [],

    // Game Log
    gameLog: [],

    // Card Positions
    cardPositions: {},

    setInspectCard: (card, cardId = null) => set({ inspectCard: card, inspectCardId: cardId }),

    // Import deck with separate commander
    importDeck: async (commanderName: string, deckText: string) => {
        set({ isLoading: true, error: null });

        try {
            // Fetch commander separately
            const { cards: commanderCards, notFound: cmdNotFound } = await importDeckFromText(`1 ${commanderName}`);
            const commander = commanderCards[0];

            if (!commander) {
                set({ error: `Commander "${commanderName}" not found`, isLoading: false });
                return { success: false, notFound: [commanderName] };
            }

            // Fetch deck cards
            const { cards: deckCards, notFound } = await importDeckFromText(deckText);

            if (deckCards.length === 0) {
                set({ error: 'No valid cards found in decklist', isLoading: false });
                return { success: false, notFound };
            }

            const instances: CardInstance[] = [];

            // Commander in command zone
            const commanderId = uuidv4();
            instances.push({
                id: commanderId,
                card: commander,
                isTapped: false,
                zone: 'commandZone',
                counters: 0,
                attachmentIds: [],
                attachedToId: null,
            });

            // Deck cards
            deckCards.forEach((card) => {
                instances.push({
                    id: uuidv4(),
                    card,
                    isTapped: false,
                    zone: 'library',
                    counters: 0,
                    attachmentIds: [],
                    attachedToId: null,
                });
            });

            // Shuffle library
            const libraryCards = instances.filter(c => c.zone === 'library');
            for (let i = libraryCards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [libraryCards[i], libraryCards[j]] = [libraryCards[j], libraryCards[i]];
            }

            // Draw 7
            for (let i = 0; i < 7 && i < libraryCards.length; i++) {
                libraryCards[i].zone = 'hand';
            }

            const cmdInstance = instances.find(c => c.id === commanderId)!;
            const allCards = [cmdInstance, ...libraryCards];

            set({
                cards: allCards,
                commanderCardId: commanderId,
                life: 40,
                turn: 1,
                counters: { ...initialCounters },
                isLoading: false,
                gameStarted: true,
                gamePhase: 'MULLIGAN',
                mulliganCount: 0,
                lastRandomResult: null,
            });

            return { success: true, notFound: [...cmdNotFound, ...notFound] };
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to import deck', isLoading: false });
            return { success: false, notFound: [] };
        }
    },

    loadDemoDeck: async () => {
        await get().importDeck(DEMO_COMMANDER, DEMO_DECK);
    },

    loadRandomDeck: async () => {
        set({ isLoading: true, error: null });
        try {
            const cards = await fetchRandomCards(100);
            const instances: CardInstance[] = [];

            let commanderIndex = cards.findIndex(c => isLegendaryCreature(c));
            if (commanderIndex === -1) commanderIndex = 0;

            const commanderId = uuidv4();

            cards.forEach((card, i) => {
                const id = i === commanderIndex ? commanderId : uuidv4();
                instances.push({
                    id,
                    card,
                    isTapped: false,
                    zone: i === commanderIndex ? 'commandZone' : 'library',
                    counters: 0,
                    attachmentIds: [],
                    attachedToId: null,
                });
            });

            const libraryCards = instances.filter(c => c.zone === 'library');
            for (let i = libraryCards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [libraryCards[i], libraryCards[j]] = [libraryCards[j], libraryCards[i]];
            }

            for (let i = 0; i < 7 && i < libraryCards.length; i++) {
                libraryCards[i].zone = 'hand';
            }

            const cmdInstance = instances.find(c => c.id === commanderId)!;
            set({
                cards: [cmdInstance, ...libraryCards],
                commanderCardId: commanderId,
                life: 40,
                turn: 1,
                counters: { ...initialCounters },
                isLoading: false,
                gameStarted: true,
                gamePhase: 'MULLIGAN',
                mulliganCount: 0,
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to load deck', isLoading: false });
        }
    },

    initializeGame: async () => {
        set({ gameStarted: false, isLoading: false, error: null });
    },

    setLife: (life) => set({ life }),
    adjustLife: (amount) => {
        const snapshot = createSnapshot(get());
        const newLife = get().life + amount;
        set((state) => ({
            life: state.life + amount,
            historyPast: [...state.historyPast.slice(-MAX_HISTORY + 1), snapshot],
            historyFuture: [],
        }));
        get().addLogEntry('life', `Life ${amount >= 0 ? '+' : ''}${amount} → ${newLife}`);
    },
    incrementTurn: () => set((state) => ({ turn: state.turn + 1 })),

    nextTurn: () => {
        const snapshot = createSnapshot(get());
        const { cards, turn } = get();
        const untappedCards = cards.map((c) =>
            c.zone === 'battlefield' ? { ...c, isTapped: false } : c
        );
        const libraryCards = untappedCards.filter((c) => c.zone === 'library');
        if (libraryCards.length > 0) {
            const topCard = libraryCards[0];
            const newCards = untappedCards.map((c) =>
                c.id === topCard.id ? { ...c, zone: 'hand' as Zone } : c
            );
            set((state) => ({
                cards: newCards,
                turn: state.turn + 1,
                historyPast: [...state.historyPast.slice(-MAX_HISTORY + 1), snapshot],
                historyFuture: [],
            }));
            get().addLogEntry('turn', `=== Turn ${turn + 1} ===`);
            get().addLogEntry('draw', `Drew "${topCard.card.name}"`);
        } else {
            set((state) => ({
                cards: untappedCards,
                turn: state.turn + 1,
                historyPast: [...state.historyPast.slice(-MAX_HISTORY + 1), snapshot],
                historyFuture: [],
            }));
            get().addLogEntry('turn', `=== Turn ${turn + 1} ===`);
        }
    },

    setCounter: (type, value) => set((state) => ({ counters: { ...state.counters, [type]: value } })),
    adjustCounter: (type, amount) => set((state) => ({ counters: { ...state.counters, [type]: state.counters[type] + amount } })),

    // Move card - enforce commander restriction
    moveCard: (cardId, toZone, position = 'top') => {
        const state = get();
        const { commanderCardId, cards: currentCards } = state;

        // Prevent non-commander cards from entering command zone
        if (toZone === 'commandZone' && cardId !== commanderCardId) {
            return; // Block the action
        }

        const snapshot = createSnapshot(state);

        // Get card info for logging
        const currentCard = currentCards.find(c => c.id === cardId);
        if (!currentCard) return;

        const cardName = currentCard.card.name;
        const fromZone = currentCard.zone;

        // Check if card is entering battlefield from hand/library (summoning)
        const isSummoning = toZone === 'battlefield' &&
            (fromZone === 'hand' || fromZone === 'library' || fromZone === 'commandZone');

        set((s) => {
            const cardIndex = s.cards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) return s;

            let newCards = [...s.cards];
            let movingCard = { ...newCards[cardIndex] };

            // --- Auto-Detach Logic ---
            if (fromZone === 'battlefield' && toZone !== 'battlefield') {
                // 1. If moving card is attached to something, detach it
                if (movingCard.attachedToId) {
                    const parentIdx = newCards.findIndex(c => c.id === movingCard.attachedToId);
                    if (parentIdx !== -1) {
                        const parent = newCards[parentIdx];
                        newCards[parentIdx] = {
                            ...parent,
                            attachmentIds: (parent.attachmentIds || []).filter(id => id !== cardId)
                        };
                    }
                    movingCard.attachedToId = null;
                }

                // 2. If moving card has attachments, handle them based on type
                if (movingCard.attachmentIds && movingCard.attachmentIds.length > 0) {
                    movingCard.attachmentIds.forEach(attId => {
                        const attIdx = newCards.findIndex(c => c.id === attId);
                        if (attIdx !== -1) {
                            const attachment = newCards[attIdx];
                            const typeLine = (attachment.card.type_line || '').toLowerCase();

                            if (typeLine.includes('aura')) {
                                // Rule: Auras go to graveyard if parent leaves
                                newCards[attIdx] = {
                                    ...attachment,
                                    attachedToId: null,
                                    zone: 'graveyard',
                                    isTapped: false
                                };
                            } else {
                                // Rule: Equipment/Fortification stay on battlefield
                                newCards[attIdx] = {
                                    ...attachment,
                                    attachedToId: null
                                };
                            }
                        }
                    });
                    movingCard.attachmentIds = [];
                }
            }
            // -------------------------

            movingCard = { ...movingCard, zone: toZone, isTapped: false };
            newCards[cardIndex] = movingCard;

            // Track summoned card for animation
            const newSummonedCards = new Set(s.recentlySummonedCards);
            if (isSummoning) {
                newSummonedCards.add(cardId);
            }

            const historyUpdate = {
                historyPast: [...s.historyPast.slice(-MAX_HISTORY + 1), snapshot],
                historyFuture: [] as GameSnapshot[],
            };

            if (toZone === 'library') {
                newCards.splice(cardIndex, 1);
                const libraryCards = newCards.filter(c => c.zone === 'library');
                const nonLibraryCards = newCards.filter(c => c.zone !== 'library');
                if (position === 'top') {
                    return { cards: [...nonLibraryCards, movingCard, ...libraryCards], recentlySummonedCards: newSummonedCards, ...historyUpdate };
                } else {
                    return { cards: [...nonLibraryCards, ...libraryCards, movingCard], recentlySummonedCards: newSummonedCards, ...historyUpdate };
                }
            }

            return { cards: newCards, recentlySummonedCards: newSummonedCards, ...historyUpdate };
        });

        // Log the card movement (after state update)
        const zoneLabels: Record<string, string> = {
            hand: 'hand',
            battlefield: 'battlefield',
            graveyard: 'graveyard',
            exile: 'exile',
            library: 'library',
            commandZone: 'command zone',
        };

        const fromLabel = zoneLabels[fromZone] || fromZone;
        const toLabel = zoneLabels[toZone] || toZone;

        // Generate appropriate log message based on zone transition
        if (toZone === 'battlefield') {
            get().addLogEntry('play', `"${cardName}" entered the battlefield`);
        } else if (toZone === 'graveyard') {
            get().addLogEntry('graveyard', `"${cardName}" went to the graveyard`);
        } else if (toZone === 'exile') {
            get().addLogEntry('exile', `"${cardName}" was exiled`);
        } else if (toZone === 'hand' && fromZone === 'library') {
            // drawCard already logs this, skip to avoid duplicate
        } else if (toZone === 'hand') {
            get().addLogEntry('draw', `"${cardName}" returned to hand`);
        } else if (toZone === 'library') {
            const posLabel = position === 'top' ? 'top' : 'bottom';
            get().addLogEntry('other', `"${cardName}" put on ${posLabel} of library`);
        } else if (toZone === 'commandZone') {
            get().addLogEntry('other', `"${cardName}" returned to command zone`);
        } else if (fromZone !== toZone) {
            get().addLogEntry('other', `"${cardName}" moved from ${fromLabel} to ${toLabel}`);
        }
    },

    tapCard: (cardId) => set((state) => ({
        cards: state.cards.map((c) => c.id === cardId ? { ...c, isTapped: true } : c),
    })),

    untapCard: (cardId) => set((state) => ({
        cards: state.cards.map((c) => c.id === cardId ? { ...c, isTapped: false } : c),
    })),

    toggleTap: (cardId) => set((state) => ({
        cards: state.cards.map((c) => c.id === cardId ? { ...c, isTapped: !c.isTapped } : c),
    })),

    untapAll: () => set((state) => ({
        cards: state.cards.map((c) => c.zone === 'battlefield' ? { ...c, isTapped: false } : c),
    })),

    drawCard: () => {
        const { cards } = get();
        const libraryCards = cards.filter(c => c.zone === 'library');
        if (libraryCards.length === 0) return;

        const topCard = libraryCards[0];
        get().moveCard(topCard.id, 'hand');
    },

    drawCards: (count) => {
        for (let i = 0; i < count; i++) get().drawCard();
    },

    shuffleLibrary: () => {
        const { cards } = get();
        const libraryCards = cards.filter(c => c.zone === 'library');
        const otherCards = cards.filter(c => c.zone !== 'library');

        for (let i = libraryCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [libraryCards[i], libraryCards[j]] = [libraryCards[j], libraryCards[i]];
        }

        set({ cards: [...otherCards, ...libraryCards] });
        get().addLogEntry('other', `Shuffled library`);
    },

    millCard: () => {
        const { cards } = get();
        const libraryCards = cards.filter(c => c.zone === 'library');
        if (libraryCards.length === 0) return;

        const topCard = libraryCards[0];
        get().moveCard(topCard.id, 'graveyard');
    },

    millCards: (count) => { for (let i = 0; i < count; i++) get().millCard(); },

    toggleTopCardRevealed: () => set((state) => ({ isTopCardRevealed: !state.isTopCardRevealed })),

    putTopCardToBottom: () => {
        const { cards } = get();
        const libraryCards = cards.filter((c) => c.zone === 'library');
        if (libraryCards.length < 2) return; // Need at least 2 cards

        const topCard = libraryCards[0];
        const otherCards = cards.filter((c) => c.zone !== 'library');
        const remainingLibrary = libraryCards.slice(1);

        // Put top card at the end of library, reset revealed state
        set({
            cards: [...otherCards, ...remainingLibrary, topCard],
            isTopCardRevealed: false,
        });
        get().addLogEntry('other', `"${topCard.card.name}" put on bottom of library`);
    },

    flipCoin: () => {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        set({ lastRandomResult: { type: 'coin', value: result, label: `🪙 ${result}`, timestamp: Date.now() } });
        get().addLogEntry('other', `🪙 Coin flip: ${result}`);
    },

    rollDie: (sides) => {
        const result = Math.floor(Math.random() * sides) + 1;
        set({ lastRandomResult: { type: 'die', value: result, label: `🎲 D${sides}: ${result}`, timestamp: Date.now() } });
        get().addLogEntry('other', `🎲 Rolled D${sides}: ${result}`);
    },

    rollDoubleDice: () => {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        set({ lastRandomResult: { type: 'die', value: die1 + die2, label: `🎲 2×D6: ${die1}+${die2}=${die1 + die2}`, timestamp: Date.now() } });
        get().addLogEntry('other', `🎲 Rolled 2×D6: ${die1}+${die2}=${die1 + die2}`);
    },

    rollPlanarDie: () => {
        const roll = Math.random();
        const result = roll < 1 / 6 ? '⬡ Planeswalk' : roll < 2 / 6 ? '✧ Chaos' : '○ Blank';
        set({ lastRandomResult: { type: 'planar', value: result, label: result, timestamp: Date.now() } });
        get().addLogEntry('other', `🎲 Planar die: ${result}`);
    },

    clearRandomResult: () => set({ lastRandomResult: null }),

    resetMatch: () => {
        const { cards, commanderCardId } = get();

        // Keep all cards but reset their state and move to library (except commander)
        const resetCards = cards
            .filter(c => !c.isToken) // Remove tokens
            .map(c => ({
                ...c,
                isTapped: false,
                counters: 0,
                zone: c.id === commanderCardId ? 'commandZone' as const : 'library' as const,
                attachedToId: null,
                attachmentIds: [],
            }));

        // Separate commander and library cards
        const commanderCard = resetCards.find(c => c.id === commanderCardId);
        const libraryCards = resetCards.filter(c => c.id !== commanderCardId);

        // Shuffle library
        for (let i = libraryCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [libraryCards[i], libraryCards[j]] = [libraryCards[j], libraryCards[i]];
        }

        // Draw 7 cards
        for (let i = 0; i < 7 && i < libraryCards.length; i++) {
            (libraryCards[i] as { zone: Zone }).zone = 'hand';
        }

        // Combine all cards
        const allCards = commanderCard ? [commanderCard, ...libraryCards] : libraryCards;

        set({
            cards: allCards,
            life: 40,
            turn: 1,
            counters: { ...initialCounters },
            manaPool: { ...initialManaPool },
            isTopCardRevealed: false,
            lastRandomResult: null,
            inspectCard: null,
            inspectCardId: null,
            gamePhase: 'MULLIGAN',
            mulliganCount: 0,
            historyPast: [],
            historyFuture: [],
            gameLog: [],
            recentlySummonedCards: new Set<string>(),
            targetingMode: { active: false, sourceCardId: null },
        });

        get().addLogEntry('turn', '=== New Game ===');
    },

    returnToMenu: () => {
        set({
            life: 40, turn: 1, counters: { ...initialCounters }, cards: [],
            isLoading: false, error: null, lastRandomResult: null,
            gameStarted: false, commanderCardId: null, inspectCard: null,
            isTopCardRevealed: false,
        });
    },

    getCardsByZone: (zone) => get().cards.filter((c) => c.zone === zone),

    clearSummonedCard: (cardId) => set((state) => {
        const newSummonedCards = new Set(state.recentlySummonedCards);
        newSummonedCards.delete(cardId);
        return { recentlySummonedCards: newSummonedCards };
    }),

    createToken: (card) => {
        const tokenId = uuidv4();
        const tokenInstance: CardInstance = {
            id: tokenId,
            card,
            isTapped: false,
            zone: 'battlefield',
            counters: 0,
            isToken: true,
            attachmentIds: [],
            attachedToId: null,
        };
        const snapshot = createSnapshot(get());
        set((state) => ({
            cards: [...state.cards, tokenInstance],
            recentlySummonedCards: new Set(state.recentlySummonedCards).add(tokenId),
            historyPast: [...state.historyPast.slice(-MAX_HISTORY + 1), snapshot],
            historyFuture: [],
        }));
    },

    duplicateCard: (cardId) => {
        const state = get();
        const originalCard = state.cards.find(c => c.id === cardId);
        if (!originalCard || originalCard.zone !== 'battlefield') return;

        const snapshot = createSnapshot(state);
        const newId = uuidv4();
        const duplicate: CardInstance = {
            ...originalCard,
            id: newId,
            card: { ...originalCard.card },
            isToken: true,
            attachmentIds: [],
            attachedToId: null,
        };

        set((s) => ({
            cards: [...s.cards, duplicate],
            recentlySummonedCards: new Set(s.recentlySummonedCards).add(newId),
            historyPast: [...s.historyPast.slice(-MAX_HISTORY + 1), snapshot],
            historyFuture: [],
        }));
    },

    adjustMana: (color, amount) => set((state) => ({
        manaPool: {
            ...state.manaPool,
            [color]: Math.max(0, state.manaPool[color] + amount),
        },
    })),

    clearManaPool: () => set({ manaPool: { ...initialManaPool } }),

    undo: () => {
        const { historyPast, historyFuture } = get();
        if (historyPast.length === 0) return;

        const previous = historyPast[historyPast.length - 1];
        const currentSnapshot = createSnapshot(get());

        set({
            cards: previous.cards,
            life: previous.life,
            turn: previous.turn,
            counters: previous.counters,
            manaPool: previous.manaPool,
            historyPast: historyPast.slice(0, -1),
            historyFuture: [currentSnapshot, ...historyFuture.slice(0, MAX_HISTORY - 1)],
        });
    },

    redo: () => {
        const { historyPast, historyFuture } = get();
        if (historyFuture.length === 0) return;

        const next = historyFuture[0];
        const currentSnapshot = createSnapshot(get());

        set({
            cards: next.cards,
            life: next.life,
            turn: next.turn,
            counters: next.counters,
            manaPool: next.manaPool,
            historyPast: [...historyPast, currentSnapshot],
            historyFuture: historyFuture.slice(1),
        });
    },

    addLogEntry: (actionType, message) => {
        const { turn, gameLog } = get();
        const entry: GameLogEntry = {
            id: uuidv4(),
            turn,
            timestamp: Date.now(),
            actionType,
            message,
        };
        set({ gameLog: [...gameLog, entry].slice(-100) });
    },

    clearGameLog: () => set({ gameLog: [] }),

    applyScryChanges: (changes) => {
        const state = get();
        const { cards } = state;
        const snapshot = createSnapshot(state);

        const allAffectedIds = [
            ...changes.newTopOrder,
            ...changes.toBottom,
            ...changes.toGraveyard,
            ...changes.toExile,
        ];

        const unaffectedCards = cards.filter(c => !allAffectedIds.includes(c.id));
        const libraryCards = unaffectedCards.filter(c => c.zone === 'library');
        const otherCards = unaffectedCards.filter(c => c.zone !== 'library');

        const newCards: CardInstance[] = [...otherCards];

        changes.newTopOrder.forEach(id => {
            const card = cards.find(c => c.id === id);
            if (card) newCards.push({ ...card, zone: 'library' });
        });

        libraryCards.forEach(c => newCards.push(c));

        changes.toBottom.forEach(id => {
            const card = cards.find(c => c.id === id);
            if (card) newCards.push({ ...card, zone: 'library' });
        });

        changes.toGraveyard.forEach(id => {
            const card = cards.find(c => c.id === id);
            if (card) newCards.push({ ...card, zone: 'graveyard', isTapped: false });
        });

        changes.toExile.forEach(id => {
            const card = cards.find(c => c.id === id);
            if (card) newCards.push({ ...card, zone: 'exile', isTapped: false });
        });

        set({
            cards: newCards,
            historyPast: [...state.historyPast.slice(-MAX_HISTORY + 1), snapshot],
            historyFuture: [],
        });
    },

    mulligan: () => {
        const { cards, mulliganCount } = get();
        const handCards = cards.filter(c => c.zone === 'hand');
        const otherCards = cards.filter(c => c.zone !== 'hand');

        const newLibrary = [...handCards.map(c => ({ ...c, zone: 'library' as Zone })), ...otherCards.filter(c => c.zone === 'library')];
        const nonLibrary = otherCards.filter(c => c.zone !== 'library');

        for (let i = newLibrary.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newLibrary[i], newLibrary[j]] = [newLibrary[j], newLibrary[i]];
        }

        for (let i = 0; i < 7 && i < newLibrary.length; i++) {
            newLibrary[i].zone = 'hand';
        }

        set({
            cards: [...nonLibrary, ...newLibrary],
            mulliganCount: mulliganCount + 1,
            gamePhase: 'MULLIGAN',
        });

        get().addLogEntry('other', `Took a mulligan (Total: ${mulliganCount + 1})`);
    },

    keepHand: (cardsToBottomIds) => {
        const { cards } = get();

        const newCards = cards.map(c => {
            if (cardsToBottomIds.includes(c.id)) {
                return { ...c, zone: 'library' as Zone };
            }
            return c;
        });

        const libraryCards = newCards.filter(c => c.zone === 'library' && !cardsToBottomIds.includes(c.id));
        const bottomedCards = newCards.filter(c => cardsToBottomIds.includes(c.id));
        const otherCards = newCards.filter(c => c.zone !== 'library');

        set({
            cards: [...otherCards, ...libraryCards, ...bottomedCards],
            gamePhase: 'PLAYING',
            mulliganCount: 0,
        });

        get().addLogEntry('other', `Kept hand. ${cardsToBottomIds.length} card(s) put on bottom.`);
    },

    // Attachment Actions
    attachCard: (sourceId, targetId) => {
        const state = get();
        const { cards } = state;
        const sourceCard = cards.find(c => c.id === sourceId);
        const targetCard = cards.find(c => c.id === targetId);

        if (!sourceCard || !targetCard) return;

        const sourceTypes = (sourceCard.card.type_line || '').toLowerCase();
        const validTypes = ['equipment', 'aura', 'fortification'];
        if (!validTypes.some(t => sourceTypes.includes(t))) {
            return;
        }

        const snapshot = createSnapshot(state);
        const newCards = [...cards];

        if (sourceCard.attachedToId) {
            const oldParentIdx = newCards.findIndex(c => c.id === sourceCard.attachedToId);
            if (oldParentIdx !== -1) {
                const oldParent = newCards[oldParentIdx];
                newCards[oldParentIdx] = {
                    ...oldParent,
                    attachmentIds: (oldParent.attachmentIds || []).filter(id => id !== sourceId)
                };
            }
        }

        const sourceIdx = newCards.findIndex(c => c.id === sourceId);
        newCards[sourceIdx] = {
            ...sourceCard,
            attachedToId: targetId,
            isTapped: false,
            zone: targetCard.zone
        };

        const targetIdx = newCards.findIndex(c => c.id === targetId);
        const target = newCards[targetIdx];
        if (!target.attachmentIds?.includes(sourceId)) {
            newCards[targetIdx] = {
                ...target,
                attachmentIds: [...(target.attachmentIds || []), sourceId]
            };
        }

        set({
            cards: newCards,
            historyPast: [...state.historyPast.slice(-MAX_HISTORY + 1), snapshot],
            historyFuture: [],
        });

        get().addLogEntry('other', `Attached "${sourceCard.card.name}" to "${targetCard.card.name}"`);
    },

    detachCard: (cardId) => {
        const state = get();
        const { cards } = state;
        const sourceCard = cards.find(c => c.id === cardId);

        if (!sourceCard || !sourceCard.attachedToId) return;

        const snapshot = createSnapshot(state);
        const newCards = [...cards];

        const parentIdx = newCards.findIndex(c => c.id === sourceCard.attachedToId);
        if (parentIdx !== -1) {
            const parent = newCards[parentIdx];
            newCards[parentIdx] = {
                ...parent,
                attachmentIds: (parent.attachmentIds || []).filter(id => id !== cardId)
            };
        }

        const sourceIdx = newCards.findIndex(c => c.id === cardId);
        newCards[sourceIdx] = {
            ...sourceCard,
            attachedToId: null,
        };

        set({
            cards: newCards,
            historyPast: [...state.historyPast.slice(-MAX_HISTORY + 1), snapshot],
            historyFuture: [],
        });

        get().addLogEntry('other', `Detached "${sourceCard.card.name}"`);
    },

    startTargeting: (sourceCardId) => {
        set({
            targetingMode: {
                active: true,
                sourceCardId,
            }
        });
    },

    cancelTargeting: () => {
        set({
            targetingMode: {
                active: false,
                sourceCardId: null,
            }
        });
    },

    completeTargeting: (targetId) => {
        const { targetingMode } = get();
        if (!targetingMode.active || !targetingMode.sourceCardId) return;

        get().attachCard(targetingMode.sourceCardId, targetId);
        get().cancelTargeting();
    },

    // Auto-arrange battlefield cards into smart layout
    autoArrangeBattlefield: () => {
        const { cards } = get();
        const newPositions = calculateSmartLayout(cards);
        set({ cardPositions: newPositions });
        get().addLogEntry('other', 'Auto-arranged battlefield');
    },

    // Set individual card position (for drag-and-drop)
    setCardPosition: (cardId, x, y) => {
        set((state) => ({
            cardPositions: {
                ...state.cardPositions,
                [cardId]: { x, y },
            },
        }));
    },
}));
