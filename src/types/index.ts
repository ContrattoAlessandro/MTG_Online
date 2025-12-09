// Zone types for card locations
export type Zone = 'hand' | 'battlefield' | 'library' | 'graveyard' | 'exile' | 'commandZone';

// Card data from Scryfall API
export interface Card {
    id: string;
    name: string;
    image_uris?: {
        small: string;
        normal: string;
        large: string;
        png?: string;
        art_crop: string;
    };
    card_faces?: Array<{
        image_uris?: {
            small: string;
            normal: string;
            large: string;
            png?: string;
            art_crop: string;
        };
    }>;
    type_line: string;
    mana_cost?: string;
    oracle_text?: string;
    rarity?: string;
    set_name?: string;
    set?: string;
    produced_mana?: string[]; // Mana colors this card can produce (for mana rock detection)
    all_parts?: {
        object: string;
        id: string;
        component: string;
        name: string;
        type_line: string;
        uri: string;
    }[];
}

// Card instance in the game (can be tapped, etc.)
export interface CardInstance {
    id: string; // Unique instance ID
    card: Card;
    isTapped: boolean;
    zone: Zone;
    counters: number; // Generic counters on the card
    isToken?: boolean; // Token cards have distinct styling
    attachedToId?: string | null; // ID of the card this is attached to (for Equipment/Auras)
    attachmentIds?: string[]; // IDs of cards attached to this card
}

// All counter types in the game
export interface Counters {
    poison: number;
    energy: number;
    experience: number;
    rad: number;
    tickets: number;
    commanderTax: number;
    stormCount: number;
}

// Mana Pool type
export interface ManaPool {
    W: number; // White
    U: number; // Blue
    B: number; // Black
    R: number; // Red
    G: number; // Green
    C: number; // Colorless
}

// Player state
export interface Player {
    id: string;
    name: string;
    avatarUrl?: string; // For the switcher
    life: number;
    counters: Counters;
    manaPool: ManaPool;
    cards: CardInstance[]; // The player's specific cards
    cardPositions: Record<string, { x: number; y: number }>; // Persisted positions for this player's board
    commanderCardId: string | null;
    isDead: boolean;
    recentDamageTaken: number; // For tracking commander damage etc later
    isTopCardRevealed?: boolean; // Whether the player's top library card is revealed
}

// Complete game state
export interface GameState {
    // Multiplayer State
    players: Record<string, Player>;
    turnOrder: string[];
    activePlayerId: string; // The player whose turn it is
    viewingPlayerId: string; // The player board currently being inspected/controlled

    // View/Proxy State (These return data for the viewingPlayerId to keep UI compatible)
    life: number;
    turn: number;
    counters: Counters;
    cards: CardInstance[];

    isLoading: boolean;
    error: string | null;
    gamePhase: GamePhase;
    mulliganCount: number;
}

export type GamePhase = 'SETUP' | 'MULLIGAN' | 'PLAYING';

// Context menu position and target
export interface ContextMenuState {
    isOpen: boolean;
    x: number;
    y: number;
    targetCardId: string | null;
    currentZone: Zone | null;
}

// Library action menu state
export interface LibraryMenuState {
    isOpen: boolean;
    viewTopX: number;
}

// Zone modal state (for viewing graveyard/exile)
export interface ZoneModalState {
    isOpen: boolean;
    zone: Zone | null;
}

// Game Log types for history tracking
export type LogActionType = 'draw' | 'play' | 'tap' | 'life' | 'graveyard' | 'exile' | 'mana' | 'turn' | 'create' | 'other';

export interface GameLogEntry {
    id: string;
    turn: number;
    timestamp: number;
    actionType: LogActionType;
    message: string;
}

// ============================================
// MULTIPLAYER TYPES (Supabase Realtime)
// ============================================

// Connection status for a player in a room
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

// Player presence in a room (for the lobby and connection status)
export interface PlayerPresence {
    userId: string;        // Unique user ID (persisted in localStorage)
    playerId: string;      // Seat assignment (player-1, player-2, etc.)
    name: string;          // Display name
    status: ConnectionStatus;
    lastSeen: number;      // Timestamp
}

// Broadcast payload types for Supabase Realtime
export type BroadcastEventType =
    | 'player_state_update'    // Full player state sync
    | 'player_join'            // Player joined room
    | 'player_leave'           // Player left room
    | 'game_action';           // Individual game action

// Payload for player state broadcasts
export interface PlayerStateBroadcast {
    playerId: string;
    state: Player;
    timestamp: number;
}

// Payload for player join/leave
export interface PlayerJoinPayload {
    userId: string;
    playerId: string;
    name: string;
}

// Room metadata
export interface RoomInfo {
    roomId: string;
    hostUserId: string;
    createdAt: number;
    players: Record<string, PlayerPresence>;
}
