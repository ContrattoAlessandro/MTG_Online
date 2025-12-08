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

// Complete game state
export interface GameState {
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
export type LogActionType = 'draw' | 'play' | 'tap' | 'life' | 'graveyard' | 'exile' | 'mana' | 'turn' | 'other';

export interface GameLogEntry {
    id: string;
    turn: number;
    timestamp: number;
    actionType: LogActionType;
    message: string;
}
