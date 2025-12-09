import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { getCardImageUrl } from '../api/scryfall';
import ContextMenu from './ContextMenu';
import { Zone } from '../types';
import { Lock } from 'lucide-react';

// Card back image URL (MTG standard card back)
const CARD_BACK_URL = 'https://upload.wikimedia.org/wikipedia/en/a/aa/Magic_the_gathering-card_back.jpg';

interface HandProps {
    onHoverCard?: (cardId: string | null) => void;
}

export default function Hand({ onHoverCard }: HandProps) {
    const cards = useGameStore((s) => s.cards);
    const handCards = cards.filter((c) => c.zone === 'hand');
    const moveCard = useGameStore((s) => s.moveCard);
    const setInspectCard = useGameStore((s) => s.setInspectCard);
    const isOnlineMode = useGameStore((s) => s.isOnlineMode);
    const localPlayerId = useGameStore((s) => s.localPlayerId);
    const viewingPlayerId = useGameStore((s) => s.viewingPlayerId);
    const players = useGameStore((s) => s.players);

    // In online mode, check if we're viewing our own hand or someone else's
    const isOwnHand = !isOnlineMode || localPlayerId === viewingPlayerId;
    const viewingPlayerName = players[viewingPlayerId]?.name || 'Unknown';

    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        cardId: string;
    } | null>(null);

    // Propagate hover state to parent for global keyboard shortcuts
    useEffect(() => {
        onHoverCard?.(hoveredId);
    }, [hoveredId, onHoverCard]);

    const handleContextMenu = (e: React.MouseEvent, cardId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, cardId });
    };

    // Single click = zoom/inspect with cardId for layoutId matching
    const handleClick = (card: typeof handCards[0]) => {
        setInspectCard(card.card, card.id);
    };

    // Double click = move to battlefield
    const handleDoubleClick = (cardId: string) => {
        moveCard(cardId, 'battlefield');
    };

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 h-48 z-20 pointer-events-none">
                {/* Semi-transparent background - Premium */}
                <div className="absolute inset-0 hand-area-premium pointer-events-none" />

                {/* Privacy indicator for online mode when viewing other player's hand */}
                {isOnlineMode && !isOwnHand && handCards.length > 0 && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/80 rounded-full border border-white/10 z-30 pointer-events-auto">
                        <Lock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                            {viewingPlayerName}'s hand ({handCards.length} cards) - Hidden
                        </span>
                    </div>
                )}

                {/* Cards container */}
                <div className="relative h-full flex items-end justify-center pb-2">
                    {/* Cards with fan effect - BIGGER cards for zoom out */}
                    <div className="flex items-end justify-center">
                        <AnimatePresence mode="popLayout">
                            {handCards.map((card, index) => {
                                const isHovered = hoveredId === card.id;
                                const totalCards = handCards.length;
                                const centerOffset = index - (totalCards - 1) / 2;

                                // Fan rotation
                                const rotation = centerOffset * 2.5;
                                // Vertical offset for arc effect
                                const arcY = Math.abs(centerOffset) * 3;
                                // Spacing for overlap
                                const spacing = Math.min(90, 160 / Math.max(1, totalCards - 1));

                                return (
                                    <motion.div
                                        key={card.id}
                                        layoutId={`card-${card.id}`}
                                        className="relative cursor-pointer"
                                        style={{
                                            marginLeft: index === 0 ? 0 : -spacing,
                                            zIndex: isHovered ? 200 : index + 10,
                                            pointerEvents: 'auto',
                                        }}
                                        initial={{
                                            opacity: 0,
                                            y: 50,
                                            scale: 0.8
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: isHovered ? -100 : arcY,
                                            scale: isHovered ? 1.4 : 1,
                                            rotate: isHovered ? 0 : rotation,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            y: -100,
                                            scale: 0.5,
                                            transition: { duration: 0.3 }
                                        }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 400,
                                            damping: 25,
                                        }}
                                        whileHover={{
                                            boxShadow: '0 0 25px rgba(255,215,0,0.8)',
                                        }}
                                        onMouseEnter={() => isOwnHand && setHoveredId(card.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        onClick={() => isOwnHand && handleClick(card)}
                                        onDoubleClick={() => isOwnHand && handleDoubleClick(card.id)}
                                        onContextMenu={(e) => isOwnHand && handleContextMenu(e, card.id)}
                                    >
                                        {/* Card image - BIGGER: w-28 h-40 */}
                                        <motion.div
                                            className={`
                                                w-28 h-40 rounded-lg overflow-hidden relative
                                                transition-shadow duration-200
                                                ${isHovered && isOwnHand
                                                    ? 'shadow-[0_0_25px_rgba(255,215,0,0.8)]'
                                                    : 'shadow-lg'
                                                }
                                                ${card.isRevealed ? 'ring-2 ring-cyan-400 ring-opacity-70' : ''}
                                            `}
                                        >
                                            <img
                                                src={(isOwnHand || card.isRevealed) ? getCardImageUrl(card.card, 'normal') : CARD_BACK_URL}
                                                alt={(isOwnHand || card.isRevealed) ? card.card.name : 'Hidden card'}
                                                className={`w-full h-full object-cover pointer-events-none ${(!isOwnHand && !card.isRevealed) ? 'opacity-80' : ''}`}
                                                draggable={false}
                                            />
                                            {/* Revealed indicator */}
                                            {card.isRevealed && (
                                                <div className="absolute top-1 right-1 bg-cyan-500 rounded-full p-1 shadow-lg shadow-cyan-500/50">
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </motion.div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Context Menu - outside the main container for proper z-index */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    cardId={contextMenu.cardId}
                    currentZone={'hand' as Zone}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </>
    );
}
