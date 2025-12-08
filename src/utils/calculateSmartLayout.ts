import { CardInstance } from '../types';

// Layout configuration
const LAYOUT_CONFIG = {
    // Row Y positions - adjusted to not interfere with hand area
    FRONTLINE_Y: 20,
    MIDLINE_Y: 220,
    BACKLINE_Y: 420,  // Moved up significantly to avoid interfering with hand

    // Card dimensions and spacing
    CARD_WIDTH: 128,
    CARD_HEIGHT: 176,
    CARD_GAP_X: 12,
    CARD_GAP_Y: 10,

    // Stack offset for duplicate cards
    STACK_OFFSET_X: 20,
    STACK_OFFSET_Y: 8,

    // Margin from left edge
    LEFT_MARGIN: 20,

    // Maximum width before wrapping (approximate battlefield width)
    MAX_ROW_WIDTH: 1200,

    // Row height for wrapping
    ROW_HEIGHT: 200,
};

export interface CardPosition {
    x: number;
    y: number;
}

export type LayoutResult = Record<string, CardPosition>;

type RowType = 'frontline' | 'midline' | 'backline';

/**
 * Determines if a card is a mana rock (artifact that produces mana)
 */
function isManaRock(card: CardInstance): boolean {
    const typeLine = (card.card.type_line || '').toLowerCase();
    const oracleText = (card.card.oracle_text || '').toLowerCase();

    // Must be an artifact
    if (!typeLine.includes('artifact')) return false;

    // Check for mana-producing patterns in oracle text
    const manaPatterns = [
        /\{t\}:?\s*add\s*\{/i,           // {T}: Add {
        /\{t\}:?\s*add\s+\w/i,            // {T}: Add one/two/etc
        /adds?\s+\{[wubrgc]\}/i,          // adds {W}/{U}/{B}/{R}/{G}/{C}
        /mana\s+of\s+any\s+color/i,       // mana of any color
        /add\s+one\s+mana/i,              // add one mana
        /add\s+\w+\s+mana/i,              // add X mana
    ];

    return manaPatterns.some(pattern => pattern.test(oracleText));
}

/**
 * Determines which row a card belongs to based on its type
 */
function getCardRow(card: CardInstance): RowType {
    const typeLine = (card.card.type_line || '').toLowerCase();

    // Frontline: Creatures, Planeswalkers, Battles (including Artifact Creatures)
    if (typeLine.includes('creature') ||
        typeLine.includes('planeswalker') ||
        typeLine.includes('battle')) {
        return 'frontline';
    }

    // Backline: Lands and Mana Rocks
    if (typeLine.includes('land')) {
        return 'backline';
    }

    // Check if artifact is a mana rock
    if (typeLine.includes('artifact') && isManaRock(card)) {
        return 'backline';
    }

    // Midline: Enchantments, non-mana Artifacts (Equipment, Utility)
    if (typeLine.includes('enchantment') || typeLine.includes('artifact')) {
        return 'midline';
    }

    // Default to frontline for unknown types (instants/sorceries shouldn't be on battlefield anyway)
    return 'frontline';
}

/**
 * Groups cards by name for stacking
 */
function groupCardsByName(cards: CardInstance[]): Map<string, CardInstance[]> {
    const groups = new Map<string, CardInstance[]>();

    for (const card of cards) {
        const name = card.card.name;
        if (!groups.has(name)) {
            groups.set(name, []);
        }
        groups.get(name)!.push(card);
    }

    return groups;
}

/**
 * Simple grid layout - fallback when cards would overflow
 * Places all cards in a simple grid without type separation
 */
function calculateSimpleGridLayout(battlefieldCards: CardInstance[]): LayoutResult {
    const result: LayoutResult = {};

    // Group by name for stacking
    const groups = groupCardsByName(battlefieldCards);

    let currentX = LAYOUT_CONFIG.LEFT_MARGIN;
    let currentY = LAYOUT_CONFIG.FRONTLINE_Y;

    const cardsPerRow = Math.floor((LAYOUT_CONFIG.MAX_ROW_WIDTH - LAYOUT_CONFIG.LEFT_MARGIN) /
        (LAYOUT_CONFIG.CARD_WIDTH + LAYOUT_CONFIG.CARD_GAP_X));
    let cardCount = 0;

    for (const [, cardsInGroup] of groups) {
        // Check if we need to wrap to next row
        if (cardCount > 0 && cardCount % cardsPerRow === 0) {
            currentX = LAYOUT_CONFIG.LEFT_MARGIN;
            currentY += LAYOUT_CONFIG.ROW_HEIGHT;
        }

        // Position each card in the stack
        for (let i = 0; i < cardsInGroup.length; i++) {
            const card = cardsInGroup[i];

            result[card.id] = {
                x: currentX + (i * LAYOUT_CONFIG.STACK_OFFSET_X),
                y: currentY + (i * LAYOUT_CONFIG.STACK_OFFSET_Y),
            };

            // Handle attached cards
            if (card.attachmentIds && card.attachmentIds.length > 0) {
                for (let j = 0; j < card.attachmentIds.length; j++) {
                    const attId = card.attachmentIds[j];
                    result[attId] = {
                        x: result[card.id].x + ((j + 1) * 10),
                        y: result[card.id].y + ((j + 1) * 20),
                    };
                }
            }
        }

        // Move to next position
        const stackWidth = LAYOUT_CONFIG.CARD_WIDTH +
            ((cardsInGroup.length - 1) * LAYOUT_CONFIG.STACK_OFFSET_X);
        currentX += stackWidth + LAYOUT_CONFIG.CARD_GAP_X;
        cardCount++;
    }

    return result;
}

/**
 * Calculates smart layout positions for all battlefield cards
 * @param allCards - All cards in the game (we filter to battlefield only)
 * @param maxWidth - Optional max width for the layout area (defaults to config)
 * @returns Record of card IDs to their (x, y) positions
 */
export function calculateSmartLayout(allCards: CardInstance[], maxWidth?: number): LayoutResult {
    const effectiveMaxWidth = maxWidth || LAYOUT_CONFIG.MAX_ROW_WIDTH;

    // Filter to battlefield cards only, excluding attached cards
    const battlefieldCards = allCards.filter(
        c => c.zone === 'battlefield' && !c.attachedToId
    );

    if (battlefieldCards.length === 0) {
        return {};
    }

    // Count unique card groups to estimate layout width
    const groups = groupCardsByName(battlefieldCards);
    let estimatedWidth = LAYOUT_CONFIG.LEFT_MARGIN;

    for (const [, cardsInGroup] of groups) {
        const stackWidth = LAYOUT_CONFIG.CARD_WIDTH +
            ((cardsInGroup.length - 1) * LAYOUT_CONFIG.STACK_OFFSET_X);
        estimatedWidth += stackWidth + LAYOUT_CONFIG.CARD_GAP_X;
    }

    // If cards would overflow significantly, use simple grid layout
    if (estimatedWidth > effectiveMaxWidth * 1.5) {
        return calculateSimpleGridLayout(battlefieldCards);
    }

    const result: LayoutResult = {};

    // Separate cards into rows
    const rows: Record<RowType, CardInstance[]> = {
        frontline: [],
        midline: [],
        backline: [],
    };

    for (const card of battlefieldCards) {
        const row = getCardRow(card);
        rows[row].push(card);
    }

    // Process each row
    const rowYPositions: Record<RowType, number> = {
        frontline: LAYOUT_CONFIG.FRONTLINE_Y,
        midline: LAYOUT_CONFIG.MIDLINE_Y,
        backline: LAYOUT_CONFIG.BACKLINE_Y,
    };

    for (const rowType of ['frontline', 'midline', 'backline'] as RowType[]) {
        const rowCards = rows[rowType];
        if (rowCards.length === 0) continue;

        const baseY = rowYPositions[rowType];

        // Group by name for stacking
        const rowGroups = groupCardsByName(rowCards);

        // Calculate positions for each group with wrapping support
        let currentX = LAYOUT_CONFIG.LEFT_MARGIN;
        let currentRowOffset = 0; // For multi-row wrapping within a zone

        for (const [, cardsInGroup] of rowGroups) {
            // Calculate stack width
            const stackWidth = LAYOUT_CONFIG.CARD_WIDTH +
                ((cardsInGroup.length - 1) * LAYOUT_CONFIG.STACK_OFFSET_X);

            // Check if we need to wrap to next line
            if (currentX + stackWidth > effectiveMaxWidth) {
                currentX = LAYOUT_CONFIG.LEFT_MARGIN;
                currentRowOffset += LAYOUT_CONFIG.ROW_HEIGHT;
            }

            // Position each card in the stack
            for (let i = 0; i < cardsInGroup.length; i++) {
                const card = cardsInGroup[i];

                result[card.id] = {
                    x: currentX + (i * LAYOUT_CONFIG.STACK_OFFSET_X),
                    y: baseY + currentRowOffset + (i * LAYOUT_CONFIG.STACK_OFFSET_Y),
                };

                // Handle attached cards - they should follow their parent
                if (card.attachmentIds && card.attachmentIds.length > 0) {
                    for (let j = 0; j < card.attachmentIds.length; j++) {
                        const attId = card.attachmentIds[j];
                        // Attachments stay slightly behind/below the parent
                        result[attId] = {
                            x: result[card.id].x + ((j + 1) * 10),
                            y: result[card.id].y + ((j + 1) * 20),
                        };
                    }
                }
            }

            // Move to next position
            currentX += stackWidth + LAYOUT_CONFIG.CARD_GAP_X;
        }
    }

    return result;
}

/**
 * Re-exports the layout config for use in components
 */
export { LAYOUT_CONFIG };
