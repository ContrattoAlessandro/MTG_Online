import { useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSoundEngine } from './useSoundEngine';

/**
 * Global keyboard shortcuts hook for power users.
 * 
 * Shortcuts:
 * - D: Draw card
 * - Spacebar: Next Turn (untap all + draw + increment turn)
 * - U: Untap All
 * - S: Shuffle Library
 * - Delete/Backspace: Move hovered card to graveyard (requires hoveredCardId)
 * - Ctrl+Z / Cmd+Z: Undo
 * - Ctrl+Shift+Z / Cmd+Shift+Z: Redo
 * 
 * Card-specific (when hovering):
 * - P / Enter: Play card to battlefield (from hand)
 * - G: Move card to graveyard
 * - E / X: Move card to exile
 * - T: Tap/Untap card (on battlefield)
 * 
 * NOTE: All shortcuts are disabled when viewing another player's board in online mode.
 */
export function useKeyboardShortcuts(hoveredCardId: string | null = null) {
    const drawCard = useGameStore((s) => s.drawCard);
    const nextTurn = useGameStore((s) => s.nextTurn);
    const untapAll = useGameStore((s) => s.untapAll);
    const shuffleLibrary = useGameStore((s) => s.shuffleLibrary);
    const moveCard = useGameStore((s) => s.moveCard);
    const toggleTap = useGameStore((s) => s.toggleTap);
    const cards = useGameStore((s) => s.cards);
    const gameStarted = useGameStore((s) => s.gameStarted);
    const undo = useGameStore((s) => s.undo);
    const redo = useGameStore((s) => s.redo);
    const isOnlineMode = useGameStore((s) => s.isOnlineMode);
    const viewingPlayerId = useGameStore((s) => s.viewingPlayerId);
    const localPlayerId = useGameStore((s) => s.localPlayerId);
    const { play } = useSoundEngine();

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't trigger shortcuts if game hasn't started
        if (!gameStarted) return;

        // IMPORTANT: Block all actions when viewing another player's board in online mode
        // This prevents a player from interacting with another player's library, cards, etc.
        if (isOnlineMode && viewingPlayerId !== localPlayerId) {
            return;
        }

        // Ignore if typing in input/textarea/contenteditable
        const target = e.target as HTMLElement;
        if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target.isContentEditable
        ) {
            return;
        }

        const key = e.key.toLowerCase();

        // Handle Ctrl+Z / Cmd+Z for Undo/Redo
        if ((e.ctrlKey || e.metaKey) && key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
            return;
        }

        switch (key) {
            case 'd':
                e.preventDefault();
                drawCard();
                play('draw');
                break;

            case ' ': // Spacebar
                e.preventDefault();
                nextTurn();
                play('untap');
                break;

            case 'u':
                e.preventDefault();
                untapAll();
                play('untap');
                break;

            case 's':
                e.preventDefault();
                shuffleLibrary();
                play('shuffle');
                break;

            case 'delete':
            case 'backspace':
                // Only handle if a card is being hovered
                if (hoveredCardId) {
                    e.preventDefault();
                    moveCard(hoveredCardId, 'graveyard');
                    play('graveyard');
                }
                break;

            // Card-specific shortcuts (require hovering over a card)
            case 'p':
            case 'enter':
                // Play card to battlefield (only from hand)
                if (hoveredCardId) {
                    const card = cards.find(c => c.id === hoveredCardId);
                    if (card && card.zone === 'hand') {
                        e.preventDefault();
                        moveCard(hoveredCardId, 'battlefield');
                        play('cardSnap');
                    }
                }
                break;

            case 'g':
                // Move to graveyard (same as Delete but more intuitive)
                if (hoveredCardId) {
                    e.preventDefault();
                    moveCard(hoveredCardId, 'graveyard');
                    play('graveyard');
                }
                break;

            case 'e':
            case 'x':
                // Move to exile
                if (hoveredCardId) {
                    e.preventDefault();
                    moveCard(hoveredCardId, 'exile');
                    play('exile');
                }
                break;

            case 't':
                // Tap/Untap (only on battlefield)
                if (hoveredCardId) {
                    const card = cards.find(c => c.id === hoveredCardId);
                    if (card && card.zone === 'battlefield') {
                        e.preventDefault();
                        toggleTap(hoveredCardId);
                        play('untap');
                    }
                }
                break;
        }
    }, [gameStarted, drawCard, nextTurn, untapAll, shuffleLibrary, moveCard, toggleTap, cards, hoveredCardId, play, undo, redo, isOnlineMode, viewingPlayerId, localPlayerId]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
