import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardInstance, Counters, Zone, GameState, GameLogEntry, LogActionType, GamePhase, Player, PlayerPresence } from '../types';
import { importDeckFromText, isLegendaryCreature, fetchRandomCards } from '../api/scryfall';
import { DEMO_DECK, DEMO_COMMANDER } from '../data/demoDeck';
import { calculateSmartLayout, CardPosition } from '../utils/calculateSmartLayout';
import { supabase, isSupabaseConfigured, generateRoomCode, createRoomChannel, getLocalUserId, RoomChannel } from '../lib/supabaseClient';

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

    // Multiplayer Navigation
    switchView: (playerId: string) => void;

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
    reorderCardInZone: (cardId: string, direction: 'left' | 'right') => void;
    tapCard: (cardId: string) => void;
    untapCard: (cardId: string) => void;
    toggleTap: (cardId: string) => void;
    toggleRevealCard: (cardId: string) => void; // Toggle reveal status of a hand card to all players
    untapAll: () => void;

    // Card Counter actions
    addCardCounter: (cardId: string, counterType: string) => void;
    removeCardCounter: (cardId: string, counterType: string) => void;
    adjustCardCounter: (cardId: string, counterType: string, amount: number) => void;

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

    // ============================================
    // ONLINE MULTIPLAYER STATE & ACTIONS
    // ============================================
    isOnlineMode: boolean;
    roomId: string | null;
    localPlayerId: string | null;
    roomChannel: RoomChannel | null;
    connectedPlayers: Record<string, PlayerPresence>;
    localUserId: string;

    // Multiplayer Actions
    createRoom: (playerName: string) => Promise<string>;
    joinRoom: (roomCode: string, seatId: string, playerName: string) => Promise<boolean>;
    leaveRoom: () => void;
    startSoloMode: () => void;
    broadcastPlayerState: () => void;

    // Internal handlers (prefixed with _)
    _handleRemotePlayerState: (playerId: string, state: Player) => void;
    _handlePlayerJoin: (presence: PlayerPresence) => void;
    _handleRemoteLogEntry: (entry: GameLogEntry, playerId: string) => void;
    _handlePlayerLeave: (playerId: string) => void;
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
    // Multiplayer state - 4 players for Commander pod
    players: {
        'player-1': {
            id: 'player-1',
            name: 'Player 1',
            avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=commander1&backgroundColor=1a1a2e',
            life: 40,
            counters: { ...initialCounters },
            manaPool: { ...initialManaPool },
            cards: [],
            cardPositions: {},
            commanderCardId: null,
            isDead: false,
            recentDamageTaken: 0,
            isTopCardRevealed: false,
        },
        'player-2': {
            id: 'player-2',
            name: 'Player 2',
            avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=commander2&backgroundColor=2d132c',
            life: 40,
            counters: { ...initialCounters },
            manaPool: { ...initialManaPool },
            cards: [],
            cardPositions: {},
            commanderCardId: null,
            isDead: false,
            recentDamageTaken: 0,
            isTopCardRevealed: false,
        },
        'player-3': {
            id: 'player-3',
            name: 'Player 3',
            avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=commander3&backgroundColor=1e3a5f',
            life: 40,
            counters: { ...initialCounters },
            manaPool: { ...initialManaPool },
            cards: [],
            cardPositions: {},
            commanderCardId: null,
            isDead: false,
            recentDamageTaken: 0,
            isTopCardRevealed: false,
        },
        'player-4': {
            id: 'player-4',
            name: 'Player 4',
            avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=commander4&backgroundColor=0d3b0d',
            life: 40,
            counters: { ...initialCounters },
            manaPool: { ...initialManaPool },
            cards: [],
            cardPositions: {},
            commanderCardId: null,
            isDead: false,
            recentDamageTaken: 0,
            isTopCardRevealed: false,
        },
    },
    turnOrder: ['player-1', 'player-2', 'player-3', 'player-4'],
    activePlayerId: 'player-1',
    viewingPlayerId: 'player-1',

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

    // ============================================
    // ONLINE MULTIPLAYER INITIAL STATE
    // ============================================
    isOnlineMode: false,
    roomId: null,
    localPlayerId: null,
    roomChannel: null,
    connectedPlayers: {},
    localUserId: getLocalUserId(),

    // Switch which player's board we're viewing (for multiplayer)
    // Saves current player state before switching, loads new player state
    // NOTE: gamePhase and gameStarted are NOT changed - they represent the LOCAL player's state
    switchView: (playerId: string) => {
        const state = get();
        const currentPlayerId = state.viewingPlayerId;

        // Don't switch to the same player
        if (currentPlayerId === playerId) return;

        // In online mode, only save state if we're currently viewing our OWN board
        // (We shouldn't overwrite remote player data that came from broadcasts)
        // In offline mode, save any player's state
        const shouldSaveCurrentPlayer = !state.isOnlineMode || currentPlayerId === state.localPlayerId;

        const updatedPlayers = { ...state.players };

        if (shouldSaveCurrentPlayer) {
            // Save current player's state back to their player object
            updatedPlayers[currentPlayerId] = {
                ...updatedPlayers[currentPlayerId],
                life: state.life,
                cards: state.cards,
                counters: state.counters,
                manaPool: state.manaPool,
                cardPositions: state.cardPositions,
                commanderCardId: state.commanderCardId,
                isTopCardRevealed: state.isTopCardRevealed,
            };
        }

        // Load the new player's state into proxy fields
        // We do NOT modify gamePhase or gameStarted - those are local player state
        const newPlayer = updatedPlayers[playerId];
        set({
            players: updatedPlayers,
            viewingPlayerId: playerId,
            life: newPlayer.life,
            cards: newPlayer.cards,
            counters: newPlayer.counters,
            manaPool: newPlayer.manaPool,
            cardPositions: newPlayer.cardPositions,
            commanderCardId: newPlayer.commanderCardId,
            isTopCardRevealed: newPlayer.isTopCardRevealed ?? false,
            // NOTE: gamePhase and gameStarted are intentionally NOT changed here
            // They represent the local player's game state, not the viewed player's
        });
    },

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
                counters: [],
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
                    counters: [],
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

            // Broadcast loaded deck to other players in online mode
            if (get().isOnlineMode) get().broadcastPlayerState();

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
                    counters: [],
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

            // Broadcast loaded deck to other players in online mode
            if (get().isOnlineMode) get().broadcastPlayerState();
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to load deck', isLoading: false });
        }
    },

    initializeGame: async () => {
        set({ gameStarted: false, isLoading: false, error: null });
    },

    setLife: (life) => {
        const { isOnlineMode, viewingPlayerId, localPlayerId } = get();
        // Guard: In online mode, only allow modifying your own state
        if (isOnlineMode && viewingPlayerId !== localPlayerId) return;

        set({ life });
        if (isOnlineMode) get().broadcastPlayerState();
    },

    adjustLife: (amount) => {
        const { isOnlineMode, viewingPlayerId, localPlayerId } = get();
        // Guard: In online mode, only allow modifying your own state
        if (isOnlineMode && viewingPlayerId !== localPlayerId) return;

        const snapshot = createSnapshot(get());
        const newLife = get().life + amount;
        set((state) => ({
            life: state.life + amount,
            historyPast: [...state.historyPast.slice(-MAX_HISTORY + 1), snapshot],
            historyFuture: [],
        }));
        get().addLogEntry('life', `Life ${amount >= 0 ? '+' : ''}${amount} → ${newLife}`);
        if (isOnlineMode) get().broadcastPlayerState();
    },

    incrementTurn: () => {
        set((state) => ({ turn: state.turn + 1 }));
        if (get().isOnlineMode) get().broadcastPlayerState();
    },

    nextTurn: () => {
        const snapshot = createSnapshot(get());
        const { cards, turn, isOnlineMode } = get();
        const untappedCards = cards.map((c) =>
            c.zone === 'battlefield' ? { ...c, isTapped: false } : c
        );
        const libraryCards = untappedCards.filter((c) => c.zone === 'library');

        // Draw card logic
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

            // Privacy-safe log
            const message = isOnlineMode ? "Drew a card" : `Drew "${topCard.card.name}"`;
            get().addLogEntry('draw', message);
        } else {
            set((state) => ({
                cards: untappedCards,
                turn: state.turn + 1,
                historyPast: [...state.historyPast.slice(-MAX_HISTORY + 1), snapshot],
                historyFuture: [],
            }));
            get().addLogEntry('turn', `=== Turn ${turn + 1} ===`);
        }

        if (isOnlineMode) get().broadcastPlayerState();
    },

    setCounter: (type, value) => {
        const { isOnlineMode, viewingPlayerId, localPlayerId } = get();
        // Guard: In online mode, only allow modifying your own state
        if (isOnlineMode && viewingPlayerId !== localPlayerId) return;

        set((state) => ({ counters: { ...state.counters, [type]: value } }));
        if (isOnlineMode) get().broadcastPlayerState();
    },

    adjustCounter: (type, amount) => {
        const { isOnlineMode, viewingPlayerId, localPlayerId, counters } = get();
        // Guard: In online mode, only allow modifying your own state
        if (isOnlineMode && viewingPlayerId !== localPlayerId) return;

        const newValue = counters[type] + amount;
        set((state) => ({ counters: { ...state.counters, [type]: state.counters[type] + amount } }));

        // Log the counter change
        const counterLabels: Record<string, string> = {
            poison: 'Poison',
            energy: 'Energy',
            experience: 'Experience',
            rad: 'Rad',
            tickets: 'Tickets',
            commanderTax: 'Commander Tax',
            stormCount: 'Storm Count',
        };
        const label = counterLabels[type] || type;
        get().addLogEntry('other', `${label} ${amount >= 0 ? '+' : ''}${amount} → ${newValue}`);

        if (isOnlineMode) get().broadcastPlayerState();
    },

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
        const { isOnlineMode } = get();

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
            const message = isOnlineMode
                ? `A card put on ${posLabel} of library`
                : `"${cardName}" put on ${posLabel} of library`;
            get().addLogEntry('other', message);
        } else if (toZone === 'commandZone') {
            get().addLogEntry('other', `"${cardName}" returned to command zone`);
        } else if (fromZone !== toZone) {
            get().addLogEntry('other', `"${cardName}" moved from ${fromLabel} to ${toLabel}`);
        }

        if (isOnlineMode) get().broadcastPlayerState();
    },

    // Reorder card within its zone (for manual arrangement)
    reorderCardInZone: (cardId: string, direction: 'left' | 'right') => {
        const state = get();
        const { cards } = state;
        const card = cards.find(c => c.id === cardId);

        if (!card) return;

        // Only allow reordering in hand and battlefield
        if (card.zone !== 'hand' && card.zone !== 'battlefield') return;

        // Get all cards in the same zone
        const zoneCards = cards.filter(c => c.zone === card.zone);
        const currentIndex = zoneCards.findIndex(c => c.id === cardId);

        // Calculate new index
        const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

        // Check bounds
        if (newIndex < 0 || newIndex >= zoneCards.length) return;

        // Create a new array with swapped positions
        const newZoneCards = [...zoneCards];
        [newZoneCards[currentIndex], newZoneCards[newIndex]] = [newZoneCards[newIndex], newZoneCards[currentIndex]];

        // Rebuild the full cards array preserving order of other zones
        const otherCards = cards.filter(c => c.zone !== card.zone);
        const newCards = [...otherCards, ...newZoneCards];

        set({ cards: newCards });

        if (state.isOnlineMode) get().broadcastPlayerState();
    },

    tapCard: (cardId) => {
        const state = get();
        const card = state.cards.find(c => c.id === cardId);
        if (!card) return;

        set((s) => ({
            cards: s.cards.map((c) => c.id === cardId ? { ...c, isTapped: true } : c),
        }));

        get().addLogEntry('tap', `Tapped "${card.card.name}"`);
        if (state.isOnlineMode) get().broadcastPlayerState();
    },

    untapCard: (cardId) => {
        const state = get();
        const card = state.cards.find(c => c.id === cardId);
        if (!card) return;

        set((s) => ({
            cards: s.cards.map((c) => c.id === cardId ? { ...c, isTapped: false } : c),
        }));

        get().addLogEntry('tap', `Untapped "${card.card.name}"`);
        if (state.isOnlineMode) get().broadcastPlayerState();
    },

    toggleTap: (cardId) => {
        const state = get();
        const card = state.cards.find(c => c.id === cardId);
        if (!card) return;

        const newTappedState = !card.isTapped;
        set((s) => ({
            cards: s.cards.map((c) => c.id === cardId ? { ...c, isTapped: newTappedState } : c),
        }));

        get().addLogEntry('tap', `${newTappedState ? 'Tapped' : 'Untapped'} "${card.card.name}"`);
        if (state.isOnlineMode) get().broadcastPlayerState();
    },

    untapAll: () => {
        set((state) => ({
            cards: state.cards.map((c) => c.zone === 'battlefield' ? { ...c, isTapped: false } : c),
        }));
        get().addLogEntry('tap', `Untapped all permanents`);
        if (get().isOnlineMode) get().broadcastPlayerState();
    },

    // Toggle whether a hand card is revealed to all players
    toggleRevealCard: (cardId) => {
        const state = get();
        const card = state.cards.find(c => c.id === cardId);
        if (!card) return;

        // Only allow revealing cards in hand
        if (card.zone !== 'hand') return;

        const newRevealedState = !card.isRevealed;
        set((s) => ({
            cards: s.cards.map((c) => c.id === cardId ? { ...c, isRevealed: newRevealedState } : c),
        }));

        const action = newRevealedState ? 'Revealed' : 'Hid';
        get().addLogEntry('other', `${action} "${card.card.name}" from hand`);
        if (state.isOnlineMode) get().broadcastPlayerState();
    },

    // Add a counter to a card
    addCardCounter: (cardId: string, counterType: string) => {
        const state = get();
        const card = state.cards.find(c => c.id === cardId);
        if (!card) return;

        set((s) => ({
            cards: s.cards.map((c) => {
                if (c.id !== cardId) return c;
                const existingCounter = c.counters.find(cnt => cnt.type === counterType);
                if (existingCounter) {
                    // Increment existing counter
                    return {
                        ...c,
                        counters: c.counters.map(cnt =>
                            cnt.type === counterType ? { ...cnt, count: cnt.count + 1 } : cnt
                        ),
                    };
                } else {
                    // Add new counter
                    return {
                        ...c,
                        counters: [...c.counters, { type: counterType, count: 1 }],
                    };
                }
            }),
        }));

        // Generate a label for logging
        const counterLabels: Record<string, string> = {
            plus1: '+1/+1',
            minus1: '-1/-1',
            loyalty: 'Loyalty',
        };
        const label = counterLabels[counterType] || counterType;
        get().addLogEntry('other', `Added ${label} counter to "${card.card.name}"`);
        if (state.isOnlineMode) get().broadcastPlayerState();
    },

    // Remove a counter from a card (decrements by 1, removes if reaches 0)
    removeCardCounter: (cardId: string, counterType: string) => {
        const state = get();
        const card = state.cards.find(c => c.id === cardId);
        if (!card) return;

        const existingCounter = card.counters.find(cnt => cnt.type === counterType);
        if (!existingCounter) return;

        set((s) => ({
            cards: s.cards.map((c) => {
                if (c.id !== cardId) return c;
                if (existingCounter.count <= 1) {
                    // Remove counter entirely
                    return {
                        ...c,
                        counters: c.counters.filter(cnt => cnt.type !== counterType),
                    };
                } else {
                    // Decrement counter
                    return {
                        ...c,
                        counters: c.counters.map(cnt =>
                            cnt.type === counterType ? { ...cnt, count: cnt.count - 1 } : cnt
                        ),
                    };
                }
            }),
        }));

        const counterLabels: Record<string, string> = {
            plus1: '+1/+1',
            minus1: '-1/-1',
            loyalty: 'Loyalty',
        };
        const label = counterLabels[counterType] || counterType;
        get().addLogEntry('other', `Removed ${label} counter from "${card.card.name}"`);
        if (state.isOnlineMode) get().broadcastPlayerState();
    },

    // Adjust a counter by a specific amount (positive or negative)
    adjustCardCounter: (cardId: string, counterType: string, amount: number) => {
        const state = get();
        const card = state.cards.find(c => c.id === cardId);
        if (!card) return;

        set((s) => ({
            cards: s.cards.map((c) => {
                if (c.id !== cardId) return c;
                const existingCounterIndex = c.counters.findIndex(cnt => cnt.type === counterType);
                if (existingCounterIndex !== -1) {
                    const newCount = c.counters[existingCounterIndex].count + amount;
                    if (newCount <= 0) {
                        // Remove counter
                        return {
                            ...c,
                            counters: c.counters.filter(cnt => cnt.type !== counterType),
                        };
                    } else {
                        // Update counter
                        return {
                            ...c,
                            counters: c.counters.map(cnt =>
                                cnt.type === counterType ? { ...cnt, count: newCount } : cnt
                            ),
                        };
                    }
                } else if (amount > 0) {
                    // Add new counter if amount is positive
                    return {
                        ...c,
                        counters: [...c.counters, { type: counterType, count: amount }],
                    };
                }
                return c;
            }),
        }));

        if (state.isOnlineMode) get().broadcastPlayerState();
    },

    drawCard: () => {
        const { cards, isOnlineMode } = get();
        const libraryCards = cards.filter(c => c.zone === 'library');
        if (libraryCards.length === 0) return;

        const topCard = libraryCards[0];
        get().moveCard(topCard.id, 'hand');

        // Log the draw - hide card name in online mode for privacy
        const message = isOnlineMode ? "Drew a card" : `Drew "${topCard.card.name}"`;
        get().addLogEntry('draw', message);
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
        if (get().isOnlineMode) get().broadcastPlayerState();
    },

    millCard: () => {
        const { cards } = get();
        const libraryCards = cards.filter(c => c.zone === 'library');
        if (libraryCards.length === 0) return;

        const topCard = libraryCards[0];
        get().moveCard(topCard.id, 'graveyard');
    },

    millCards: (count) => { for (let i = 0; i < count; i++) get().millCard(); },

    toggleTopCardRevealed: () => {
        const { isOnlineMode, localPlayerId, players } = get();
        const newValue = !get().isTopCardRevealed;

        // Update proxy field
        set({ isTopCardRevealed: newValue });

        // In online mode, also update players[localPlayerId] so broadcastPlayerState sends correct value
        if (isOnlineMode && localPlayerId && players[localPlayerId]) {
            set((state) => ({
                players: {
                    ...state.players,
                    [localPlayerId]: {
                        ...state.players[localPlayerId],
                        isTopCardRevealed: newValue,
                    },
                },
            }));
            get().broadcastPlayerState();
        }
    },

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
                counters: [],
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
            counters: [],
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
        get().addLogEntry('create', `Created token: ${card.name}`);
        if (get().isOnlineMode) get().broadcastPlayerState();
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
        get().addLogEntry('create', `Created duplicate of "${originalCard.card.name}"`);
        if (get().isOnlineMode) get().broadcastPlayerState();
    },

    adjustMana: (color, amount) => {
        const { isOnlineMode, viewingPlayerId, localPlayerId } = get();
        // Guard: In online mode, only allow modifying your own state
        if (isOnlineMode && viewingPlayerId !== localPlayerId) return;

        set((state) => ({
            manaPool: {
                ...state.manaPool,
                [color]: Math.max(0, state.manaPool[color] + amount),
            },
        }));
        if (isOnlineMode) get().broadcastPlayerState();
    },

    clearManaPool: () => {
        const { isOnlineMode, viewingPlayerId, localPlayerId } = get();
        // Guard: In online mode, only allow modifying your own state
        if (isOnlineMode && viewingPlayerId !== localPlayerId) return;

        set({ manaPool: { ...initialManaPool } });
        if (isOnlineMode) get().broadcastPlayerState();
    },

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

    // clearGameLog duplicate removed


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

        // Log Scry/Surveil/Organize results
        const topCount = changes.newTopOrder.length;
        const bottomCount = changes.toBottom.length;
        const graveNames = changes.toGraveyard.map(id => cards.find(c => c.id === id)?.card.name).filter(Boolean);
        const exileNames = changes.toExile.map(id => cards.find(c => c.id === id)?.card.name).filter(Boolean);

        const parts = [];
        if (topCount > 0) parts.push(`${topCount} top`);
        if (bottomCount > 0) parts.push(`${bottomCount} bottom`);
        if (graveNames.length > 0) parts.push(`Graveyard: ${graveNames.join(', ')}`);
        if (exileNames.length > 0) parts.push(`Exile: ${exileNames.join(', ')}`);

        if (parts.length > 0) {
            get().addLogEntry('other', `Organize Result: ${parts.join(', ')}`);
        }

        if (get().isOnlineMode) get().broadcastPlayerState();
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

    addLogEntry: (actionType, message) => {
        const { turn, gameLog, isOnlineMode, roomChannel, localPlayerId, players, connectedPlayers } = get();

        let displayMessage = message;

        // In online mode, prefix with player name if not already present
        if (isOnlineMode && localPlayerId) {
            const playerName = connectedPlayers[localPlayerId]?.name
                || players[localPlayerId]?.name
                || `Player ${localPlayerId.replace('player-', '')}`;

            // Only prefix if it doesn't already start with [PlayerName]
            if (!message.startsWith(`[${playerName}]`)) {
                displayMessage = `[${playerName}] ${message}`;
            }
        }

        const entry: GameLogEntry = {
            id: uuidv4(),
            turn,
            timestamp: Date.now(),
            actionType,
            message: displayMessage,
        };

        set({ gameLog: [...gameLog, entry].slice(-100) });

        // Broadcast log entry in online mode
        if (isOnlineMode && roomChannel && localPlayerId) {
            roomChannel.send({
                type: 'broadcast',
                event: 'game_log',
                payload: {
                    entry,
                    playerId: localPlayerId
                },
            });
        }
    },

    clearGameLog: () => set({ gameLog: [] }),

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
        if (get().isOnlineMode) get().broadcastPlayerState();
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
        if (get().isOnlineMode) get().broadcastPlayerState();
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
        const { cards, isOnlineMode } = get();
        const newPositions = calculateSmartLayout(cards);
        set({ cardPositions: newPositions });
        get().addLogEntry('other', 'Auto-arranged battlefield');
        // Broadcast position change in online mode
        if (isOnlineMode) get().broadcastPlayerState();
    },

    // Set individual card position (for drag-and-drop)
    setCardPosition: (cardId, x, y) => {
        const state = get();
        set((s) => ({
            cardPositions: {
                ...s.cardPositions,
                [cardId]: { x, y },
            },
        }));
        // Broadcast position change in online mode
        if (state.isOnlineMode) {
            get().broadcastPlayerState();
        }
    },

    // ============================================
    // ONLINE MULTIPLAYER ACTIONS
    // ============================================

    /**
     * Create a new game room as host.
     * Returns the room code for others to join.
     */
    createRoom: async (playerName: string) => {
        if (!isSupabaseConfigured()) {
            console.error('Supabase not configured. Check your .env file.');
            return '';
        }

        const roomCode = generateRoomCode();
        const channel = createRoomChannel(roomCode);

        // Set up event listeners for the room channel
        channel
            .on('broadcast', { event: 'player_state' }, (payload) => {
                const { playerId, state } = payload.payload as { playerId: string; state: Player };
                get()._handleRemotePlayerState(playerId, state);
            })
            .on('broadcast', { event: 'player_join' }, (payload) => {
                const presence = payload.payload as PlayerPresence;
                get()._handlePlayerJoin(presence);
            })
            .on('broadcast', { event: 'game_log' }, (payload) => {
                const { entry, playerId } = payload.payload as { entry: GameLogEntry; playerId: string };
                get()._handleRemoteLogEntry(entry, playerId);
            })
            .on('broadcast', { event: 'presence_ping' }, () => {
                const { localPlayerId, connectedPlayers, localUserId, players } = get();
                if (!localPlayerId) return;

                const ourName = connectedPlayers[localPlayerId]?.name
                    || players[localPlayerId]?.name
                    || `Player ${localPlayerId.replace('player-', '')}`;

                const presence: PlayerPresence = {
                    userId: localUserId,
                    playerId: localPlayerId,
                    name: ourName,
                    status: 'connected',
                    lastSeen: Date.now(),
                };

                channel.send({
                    type: 'broadcast',
                    event: 'player_join',
                    payload: presence,
                });
            })
            .on('broadcast', { event: 'player_leave' }, (payload) => {
                const { playerId } = payload.payload as { playerId: string };
                get()._handlePlayerLeave(playerId);
            });

        // Subscribe and wait for confirmation
        await new Promise<void>((resolve) => {
            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') resolve();
            });
        });

        // Update local player info with provided name
        const updatedPlayers = { ...get().players };
        updatedPlayers['player-1'] = {
            ...updatedPlayers['player-1'],
            name: playerName,
        };

        set({
            isOnlineMode: true,
            roomId: roomCode,
            localPlayerId: 'player-1', // Host is always player 1
            roomChannel: channel,
            players: updatedPlayers,
            connectedPlayers: {
                'player-1': {
                    userId: get().localUserId,
                    playerId: 'player-1',
                    name: playerName,
                    status: 'connected',
                    lastSeen: Date.now(),
                },
            },
        });

        get().addLogEntry('other', `Created room: ${roomCode}`);
        return roomCode;
    },

    /**
     * Join an existing game room.
     */
    joinRoom: async (roomCode, seatId, playerName) => {
        if (!isSupabaseConfigured()) {
            console.error('Supabase not configured.');
            return false;
        }

        const channel = createRoomChannel(roomCode);

        // Set up event listeners
        channel
            .on('broadcast', { event: 'player_state' }, (payload) => {
                const { playerId, state } = payload.payload as { playerId: string; state: Player };
                get()._handleRemotePlayerState(playerId, state);
            })
            .on('broadcast', { event: 'player_join' }, (payload) => {
                const presence = payload.payload as PlayerPresence;
                get()._handlePlayerJoin(presence);
            })
            .on('broadcast', { event: 'game_log' }, (payload) => {
                const { entry, playerId } = payload.payload as { entry: GameLogEntry; playerId: string };
                get()._handleRemoteLogEntry(entry, playerId);
            })
            .on('broadcast', { event: 'presence_ping' }, () => {
                const { localPlayerId, connectedPlayers, localUserId, players } = get();
                if (!localPlayerId) return;

                const ourName = connectedPlayers[localPlayerId]?.name
                    || players[localPlayerId]?.name
                    || `Player ${localPlayerId.replace('player-', '')}`;

                const presence: PlayerPresence = {
                    userId: localUserId,
                    playerId: localPlayerId,
                    name: ourName,
                    status: 'connected',
                    lastSeen: Date.now(),
                };

                channel.send({
                    type: 'broadcast',
                    event: 'player_join',
                    payload: presence,
                });
            })
            .on('broadcast', { event: 'player_leave' }, (payload) => {
                const { playerId } = payload.payload as { playerId: string };
                get()._handlePlayerLeave(playerId);
            });

        // Subscribe and wait for confirmation
        await new Promise<void>((resolve) => {
            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') resolve();
            });
        });

        // Update local player info
        const updatedPlayers = { ...get().players };
        updatedPlayers[seatId] = {
            ...updatedPlayers[seatId],
            name: playerName,
        };

        set({
            isOnlineMode: true,
            roomId: roomCode,
            localPlayerId: seatId,
            viewingPlayerId: seatId,
            roomChannel: channel,
            players: updatedPlayers,
            connectedPlayers: {
                [seatId]: {
                    userId: get().localUserId,
                    playerId: seatId,
                    name: playerName,
                    status: 'connected',
                    lastSeen: Date.now(),
                },
            },
        });

        // Announce our presence to the room
        const presence: PlayerPresence = {
            userId: get().localUserId,
            playerId: seatId,
            name: playerName,
            status: 'connected',
            lastSeen: Date.now(),
        };

        channel.send({
            type: 'broadcast',
            event: 'player_join',
            payload: presence,
        });

        get().addLogEntry('other', `Joined room: ${roomCode} as ${playerName}`);
        return true;
    },

    /**
     * Leave the current room and cleanup.
     */
    leaveRoom: () => {
        const { roomChannel, localPlayerId, isOnlineMode } = get();

        if (roomChannel && isOnlineMode) {
            // Notify others we're leaving
            roomChannel.send({
                type: 'broadcast',
                event: 'player_leave',
                payload: { playerId: localPlayerId },
            });

            // Unsubscribe and remove channel
            supabase.removeChannel(roomChannel);
        }

        set({
            isOnlineMode: false,
            roomId: null,
            localPlayerId: null,
            roomChannel: null,
            connectedPlayers: {},
        });
    },

    /**
     * Start solo (offline) mode - bypasses multiplayer.
     */
    startSoloMode: () => {
        set({
            isOnlineMode: false,
            roomId: null,
            localPlayerId: 'player-1',
            viewingPlayerId: 'player-1',
        });
    },

    /**
     * Broadcast the local player's current state to the room.
     * Called after any state-mutating action in online mode.
     * IMPORTANT: Always sends LOCAL player's data, even if viewing another player.
     */
    broadcastPlayerState: () => {
        const { roomChannel, localPlayerId, isOnlineMode, viewingPlayerId, players, life, cards, counters, manaPool, cardPositions, commanderCardId, isTopCardRevealed } = get();

        if (!isOnlineMode || !roomChannel || !localPlayerId) return;

        // Determine source of data: use proxy fields if viewing self, or saved player state if viewing another
        const isViewingSelf = viewingPlayerId === localPlayerId;
        const localPlayer = players[localPlayerId];

        // Build the player state to broadcast
        const playerState: Player = {
            ...localPlayer,
            // Use proxy fields only if we're viewing our own board (they're up-to-date)
            // Otherwise, use the saved state from players record
            life: isViewingSelf ? life : localPlayer.life,
            cards: isViewingSelf ? cards : localPlayer.cards,
            counters: isViewingSelf ? counters : localPlayer.counters,
            manaPool: isViewingSelf ? manaPool : localPlayer.manaPool,
            cardPositions: isViewingSelf ? cardPositions : localPlayer.cardPositions,
            commanderCardId: isViewingSelf ? commanderCardId : localPlayer.commanderCardId,
            isTopCardRevealed: isViewingSelf ? isTopCardRevealed : (localPlayer.isTopCardRevealed ?? false),
        };

        roomChannel.send({
            type: 'broadcast',
            event: 'player_state',
            payload: {
                playerId: localPlayerId,
                state: playerState,
                timestamp: Date.now(),
            },
        });
    },

    /**
     * Handle incoming state update from another player.
     */
    _handleRemotePlayerState: (playerId, state) => {
        const { localPlayerId, players } = get();

        // Never overwrite our own state from remote
        if (playerId === localPlayerId) return;

        // Merge remote player state into players record
        const updatedPlayers = {
            ...players,
            [playerId]: state,
        };

        set({ players: updatedPlayers });

        // If we're currently viewing this player, update the proxy fields too
        if (get().viewingPlayerId === playerId) {
            set({
                life: state.life,
                cards: state.cards,
                counters: state.counters,
                manaPool: state.manaPool,
                cardPositions: state.cardPositions,
                commanderCardId: state.commanderCardId,
                isTopCardRevealed: state.isTopCardRevealed ?? false,
            });
        }
    },

    /**
     * Handle a player joining the room.
     * When a new player joins, we re-broadcast our own presence so they can see us.
     */
    _handlePlayerJoin: (presence) => {
        const { connectedPlayers, localPlayerId, roomChannel, localUserId } = get();

        // Don't process our own join event
        if (presence.playerId === localPlayerId) return;

        // Check if we already know about this player (prevent infinite loop)
        const alreadyKnown = connectedPlayers[presence.playerId]?.status === 'connected';

        // Always update the player info (in case name changed etc)
        set({
            connectedPlayers: {
                ...connectedPlayers,
                [presence.playerId]: presence,
            },
        });

        // Only log and re-broadcast if this is a NEW player we didn't know about
        if (!alreadyKnown) {
            get().addLogEntry('other', `${presence.name} joined the game`);

            // Re-broadcast our own presence so the new player can see us
            if (roomChannel && localPlayerId) {
                const ourName = connectedPlayers[localPlayerId]?.name
                    || get().players[localPlayerId]?.name
                    || `Player ${localPlayerId.replace('player-', '')}`;

                const ourPresence: PlayerPresence = {
                    userId: localUserId,
                    playerId: localPlayerId,
                    name: ourName,
                    status: 'connected',
                    lastSeen: Date.now(),
                };

                roomChannel.send({
                    type: 'broadcast',
                    event: 'player_join',
                    payload: ourPresence,
                });

                // Also re-broadcast our game state so the new player can see our cards
                get().broadcastPlayerState();
            }
        }
    },

    /**
     * Handle remote log entry
     */
    _handleRemoteLogEntry: (entry, playerId) => {
        const { gameLog, localPlayerId } = get();
        if (playerId === localPlayerId) return; // Ignore own logs if echoed

        // Prevent duplicates
        if (gameLog.some(e => e.id === entry.id)) return;

        // Entry already contains the player name prefix from the sender's addLogEntry call
        // So we just add it directly without modifying
        set({ gameLog: [...gameLog, entry].slice(-100) });
    },

    /**
     * Handle a player leaving the room.
     */
    _handlePlayerLeave: (playerId) => {
        const { connectedPlayers } = get();
        const playerName = connectedPlayers[playerId]?.name || playerId;

        const updatedConnected = { ...connectedPlayers };
        delete updatedConnected[playerId];

        set({ connectedPlayers: updatedConnected });
        get().addLogEntry('other', `${playerName} left the game`);
    },
}));
