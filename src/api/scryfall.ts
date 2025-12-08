import { Card } from '../types';
import { COMMON_COMMANDERS } from '../data/demoDeck';

const CARD_BACK_URL = '/assets/Magic_card_back.webp';
const CORS_PROXY = 'https://corsproxy.io/?';
const SCRYFALL_API = 'https://api.scryfall.com';

// Search for token cards on Scryfall
export async function searchTokens(query: string): Promise<Card[]> {
    if (!query.trim()) return [];

    try {
        const searchQuery = `t:token ${query}`;
        const url = `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(searchQuery)}&order=name`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;

        const response = await fetch(proxyUrl);

        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                return data.data.slice(0, 20); // Limit to 20 results
            }
        }
    } catch (error) {
        console.error('Error searching tokens:', error);
    }

    return [];
}

// Get the image URL from a card (handling double-faced cards)
export function getCardImageUrl(card: Card, size: 'small' | 'normal' | 'large' | 'png' = 'normal'): string {
    if (card.image_uris) return card.image_uris[size] || card.image_uris.normal;
    if (card.card_faces && card.card_faces[0]?.image_uris) {
        return card.card_faces[0].image_uris[size] || card.card_faces[0].image_uris.normal;
    }
    return CARD_BACK_URL;
}

export function getCardBackUrl(): string {
    return CARD_BACK_URL;
}

// Parse decklist text into card names with quantities
export function parseDeckList(deckText: string): { name: string; quantity: number }[] {
    const lines = deckText.split('\n');
    const cards: { name: string; quantity: number }[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

        // Match patterns like: "1 Sol Ring", "1x Sol Ring", "2x Command Tower"
        const match = trimmed.match(/^(\d+)x?\s+(.+)$/i);

        if (match) {
            const quantity = parseInt(match[1], 10);
            const name = match[2].trim();

            // Skip sideboard markers
            if (name.toLowerCase() === 'sideboard' || name.toLowerCase() === 'commander') continue;

            cards.push({ name, quantity });
        } else if (trimmed.length > 0 && !trimmed.includes('Sideboard')) {
            // Line without quantity - assume 1
            cards.push({ name: trimmed, quantity: 1 });
        }
    }

    return cards;
}

// Fetch cards by exact names using Scryfall collection endpoint
export async function fetchCardsByNames(cardNames: string[]): Promise<Card[]> {
    // Scryfall collection endpoint accepts up to 75 cards per request
    const BATCH_SIZE = 75;
    const allCards: Card[] = [];

    for (let i = 0; i < cardNames.length; i += BATCH_SIZE) {
        const batch = cardNames.slice(i, i + BATCH_SIZE);
        const identifiers = batch.map(name => ({ name }));

        try {
            const url = `${SCRYFALL_API}/cards/collection`;
            const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;

            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifiers }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data) {
                    allCards.push(...data.data);
                }
            }
        } catch (error) {
            console.error('Error fetching card batch:', error);
        }

        // Rate limiting delay
        if (i + BATCH_SIZE < cardNames.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return allCards;
}

// Import a full deck from text
export async function importDeckFromText(deckText: string): Promise<{ cards: Card[]; notFound: string[] }> {
    const parsed = parseDeckList(deckText);

    // Expand quantities and get unique names
    const expandedNames: string[] = [];
    for (const { name, quantity } of parsed) {
        for (let i = 0; i < quantity; i++) {
            expandedNames.push(name);
        }
    }

    // Get unique names for fetching
    const uniqueNames = [...new Set(expandedNames.map(n => n.toLowerCase()))];

    // Fetch cards from Scryfall
    const fetchedCards = await fetchCardsByNames(uniqueNames.map(n =>
        parsed.find(p => p.name.toLowerCase() === n)?.name || n
    ));

    // Create a map for quick lookup
    const cardMap = new Map<string, Card>();
    for (const card of fetchedCards) {
        cardMap.set(card.name.toLowerCase(), card);
    }

    // Build final card list with proper quantities
    const finalCards: Card[] = [];
    const notFound: string[] = [];

    for (const { name, quantity } of parsed) {
        const card = cardMap.get(name.toLowerCase());
        if (card) {
            for (let i = 0; i < quantity; i++) {
                finalCards.push({ ...card });
            }
        } else {
            notFound.push(name);
        }
    }

    return { cards: finalCards, notFound };
}

// Check if a card could be a commander
export function isLegendaryCreature(card: Card): boolean {
    const typeLine = card.type_line?.toLowerCase() || '';
    const oracleText = card.oracle_text?.toLowerCase() || '';
    const name = card.name.toLowerCase();

    // Check common commanders list first
    if (COMMON_COMMANDERS.includes(name)) return true;

    return (
        (typeLine.includes('legendary') && typeLine.includes('creature')) ||
        oracleText.includes('can be your commander')
    );
}

// Fallback: Generate placeholder cards if API fails
export function generateFallbackCards(count: number): Card[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `fallback-${i}`,
        name: `Card ${i + 1}`,
        type_line: i === 0 ? 'Legendary Creature — Human Wizard' : 'Instant',
        oracle_text: 'Fallback card - API unavailable',
        image_uris: {
            small: CARD_BACK_URL,
            normal: CARD_BACK_URL,
            large: CARD_BACK_URL,
            png: CARD_BACK_URL,
            art_crop: CARD_BACK_URL,
        }
    }));
}

// Random cards fetch (kept for compatibility)
export async function fetchRandomCards(count: number): Promise<Card[]> {
    try {
        const url = `${SCRYFALL_API}/cards/search?q=format:commander&order=random`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);

        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                return data.data.slice(0, count);
            }
        }
    } catch (e) {
        console.warn("API Fetch failed, using fallback", e);
    }
    return generateFallbackCards(count);
}
