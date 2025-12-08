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
 */
export function useKeyboardShortcuts(hoveredCardId: string | null = null) {
    const drawCard = useGameStore((s) => s.drawCard);
    const nextTurn = useGameStore((s) => s.nextTurn);
    const untapAll = useGameStore((s) => s.untapAll);
    const shuffleLibrary = useGameStore((s) => s.shuffleLibrary);
    const moveCard = useGameStore((s) => s.moveCard);
    const gameStarted = useGameStore((s) => s.gameStarted);
    const undo = useGameStore((s) => s.undo);
    const redo = useGameStore((s) => s.redo);
    const { play } = useSoundEngine();

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't trigger shortcuts if game hasn't started
        if (!gameStarted) return;

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
        }
    }, [gameStarted, drawCard, nextTurn, untapAll, shuffleLibrary, moveCard, hoveredCardId, play, undo, redo]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
