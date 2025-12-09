import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { getCardImageUrl } from '../api/scryfall';
import { useSoundEngine } from '../hooks/useSoundEngine';
import { useSettings } from '../hooks/useSettings';
import ContextMenu from './ContextMenu';
import TargetingOverlay from './TargetingOverlay';
import { Zone } from '../types';
import { GlowStreak } from './MotionTrail';
import { LayoutGrid, Eye } from 'lucide-react';

interface BattlefieldProps {
    onHoverCard?: (cardId: string | null) => void;
}

export default function Battlefield({ onHoverCard }: BattlefieldProps) {
    const cards = useGameStore((s) => s.cards);
    const cardPositions = useGameStore((s) => s.cardPositions);
    // Filter out attached cards
    const battlefieldCards = cards.filter((c) => c.zone === 'battlefield' && !c.attachedToId);

    const {
        toggleTap,
        setInspectCard,
        recentlySummonedCards,
        clearSummonedCard,
        targetingMode,
        completeTargeting,
        cancelTargeting,
        autoArrangeBattlefield
    } = useGameStore();

    // Online mode - check if viewing own board or spectating
    const isOnlineMode = useGameStore((s) => s.isOnlineMode);
    const localPlayerId = useGameStore((s) => s.localPlayerId);
    const viewingPlayerId = useGameStore((s) => s.viewingPlayerId);
    const players = useGameStore((s) => s.players);

    // In online mode, you can only control your own board
    const isOwnBoard = !isOnlineMode || localPlayerId === viewingPlayerId;
    const viewingPlayerName = players[viewingPlayerId]?.name || 'Unknown';

    const { play } = useSoundEngine();
    const { playmatUrl } = useSettings();

    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        cardId: string;
    } | null>(null);

    // Play card snap sound and clear summoned cards after animation completes
    useEffect(() => {
        if (recentlySummonedCards.size === 0) return;

        // Play card snap sound for new cards
        play('cardSnap');

        const timers: ReturnType<typeof setTimeout>[] = [];
        recentlySummonedCards.forEach((cardId) => {
            const timer = setTimeout(() => {
                clearSummonedCard(cardId);
            }, 900); // Animation duration + buffer
            timers.push(timer);
        });

        return () => timers.forEach(t => clearTimeout(t));
    }, [recentlySummonedCards, clearSummonedCard, play]);

    const handleCardClick = (e: React.MouseEvent, cardId: string) => {
        e.stopPropagation();

        // If viewing another player's board, allow inspecting to see the card better
        if (!isOwnBoard) {
            const card = cards.find(c => c.id === cardId);
            if (card) {
                setInspectCard(card.card, card.id);
            }
            return;
        }

        if (targetingMode.active) {
            completeTargeting(cardId);
        } else {
            toggleTap(cardId);
        }
    };

    const handleBackgroundClick = (_e: React.MouseEvent) => {
        if (targetingMode.active) {
            cancelTargeting();
        }
    };

    const handleCardDoubleClick = (e: React.MouseEvent, card: typeof battlefieldCards[0]) => {
        e.stopPropagation();
        // Inspect always works - viewing cards is allowed
        setInspectCard(card.card, card.id);
    };

    const handleContextMenu = (e: React.MouseEvent, cardId: string) => {
        e.preventDefault();
        e.stopPropagation();
        // Only allow context menu on your own board
        if (!isOwnBoard) return;

        if (targetingMode.active) {
            cancelTargeting();
            return;
        }
        setContextMenu({ x: e.clientX, y: e.clientY, cardId });
    };

    const handleAutoArrange = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Only allow auto-arrange on your own board
        if (!isOwnBoard) return;
        autoArrangeBattlefield();
        play('cardSnap');
    };

    // Get position for a card - either from store or default
    const getCardPosition = (cardId: string, index: number) => {
        const position = cardPositions[cardId];
        if (position) {
            return { left: position.x, top: position.y };
        }
        // Default flow position when not arranged
        const cardsPerRow = 8;
        const cardWidth = 140;
        const cardHeight = 190;
        const col = index % cardsPerRow;
        const row = Math.floor(index / cardsPerRow);
        return {
            left: 20 + col * cardWidth,
            top: 20 + row * cardHeight,
        };
    };

    return (
        <div
            className={`h-full p-4 overflow-auto relative pb-40 bg-cover bg-center bg-no-repeat ${targetingMode.active ? 'cursor-crosshair' : ''}`}
            style={{
                backgroundImage: playmatUrl
                    ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${playmatUrl})`
                    : `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(https://mtgplaymats.com/cdn/shop/files/playmat-sheoldred-the-apocalypse-chris-rahn.jpg?v=1721847312&width=1100)`,
            }}
            onClick={handleBackgroundClick}
        >
            <TargetingOverlay />

            {/* Spectating Banner - shown when viewing another player's board */}
            {isOnlineMode && !isOwnBoard && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/80 border border-blue-400/50 backdrop-blur-sm text-white shadow-lg">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">Viewing {viewingPlayerName}'s board</span>
                </div>
            )}

            {/* Auto-Arrange Button - only show on own board */}
            {isOwnBoard && battlefieldCards.length > 0 && (
                <button
                    onClick={handleAutoArrange}
                    className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all overflow-hidden group"
                    style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(124, 58, 237, 0.9))',
                        border: '1px solid rgba(139, 92, 246, 0.5)',
                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
                    }}
                    title="Auto-arrange cards into organized rows (Creatures on top, Enchantments/Artifacts in middle, Lands at bottom)"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -translate-x-full group-hover:translate-x-full duration-500" />
                    <LayoutGrid className="w-4 h-4 relative z-10" />
                    <span className="hidden md:inline relative z-10">Auto-Arrange</span>
                </button>
            )}

            {/* Battlefield - always use absolute positioning */}
            <div className="relative min-h-[700px]">
                {battlefieldCards.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center battlefield-empty-premium">
                            <div className="text-5xl mb-3 battlefield-empty-icon">⚔️</div>
                            <div className="text-lg font-medium bg-gradient-to-r from-gray-500 to-gray-400 bg-clip-text text-transparent">
                                Battlefield
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                                Right-click cards to move them here
                            </div>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence>
                        {battlefieldCards.map((card, index) => {
                            const isSummoning = recentlySummonedCards.has(card.id);
                            const position = getCardPosition(card.id, index);

                            // Resolving attachments
                            const attachments = (card.attachmentIds || [])
                                .map(id => cards.find(c => c.id === id))
                                .filter((c): c is typeof card => !!c);

                            return (
                                <motion.div
                                    key={card.id}
                                    id={`battlefield-card-${card.id}`}
                                    className="absolute cursor-pointer"
                                    style={{
                                        zIndex: isSummoning ? 9999 : 1,
                                    }}
                                    initial={isSummoning ? {
                                        opacity: 0,
                                        scale: 0.3,
                                        left: position.left,
                                        top: position.top,
                                        filter: 'blur(8px) brightness(2)',
                                    } : false}
                                    animate={{
                                        opacity: 1,
                                        scale: 1,
                                        left: position.left,
                                        top: position.top,
                                        rotate: card.isTapped ? 90 : 0,
                                        filter: 'blur(0px) brightness(1)',
                                    }}
                                    exit={{
                                        opacity: 0,
                                        scale: 0.5,
                                        transition: { duration: 0.2 }
                                    }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 300,
                                        damping: 30,
                                        // Position changes should be smooth
                                        left: { type: 'spring', stiffness: 300, damping: 30 },
                                        top: { type: 'spring', stiffness: 300, damping: 30 },
                                    }}
                                    whileHover={{
                                        scale: card.isTapped ? 1 : 1.05,
                                        boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
                                        zIndex: 100, // Pop on hover
                                    }}
                                    onClick={(e) => handleCardClick(e, card.id)}
                                    onDoubleClick={(e) => handleCardDoubleClick(e, card)}
                                    onContextMenu={(e) => handleContextMenu(e, card.id)}
                                    onMouseEnter={() => onHoverCard?.(card.id)}
                                    onMouseLeave={() => onHoverCard?.(null)}
                                >
                                    {/* Shockwave/Bloom effect on landing */}
                                    <GlowStreak isActive={isSummoning} color="gold" />

                                    {/* Attachments (Rendered Behind) */}
                                    {attachments.map((att, i) => (
                                        <div
                                            key={att.id}
                                            className="absolute w-32 h-44 rounded-lg overflow-hidden shadow-md"
                                            style={{
                                                top: (i + 1) * 20,
                                                left: (i + 1) * 10,
                                                zIndex: -1 - i,
                                                filter: 'brightness(0.9)',
                                            }}
                                            onClick={(e) => handleCardClick(e, att.id)}
                                            onContextMenu={(e) => handleContextMenu(e, att.id)}
                                        >
                                            <img
                                                src={getCardImageUrl(att.card, 'small')}
                                                alt={att.card.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ))}

                                    {/* Parent Card */}
                                    <div
                                        className={`
                                            w-32 h-44 rounded-lg overflow-hidden
                                            shadow-lg hover:ring-2 hover:ring-blue-500
                                            ${card.isToken ? 'ring-2 ring-amber-400/50' : ''}
                                        `}
                                        style={{ zIndex: 10 }}
                                    >
                                        <img
                                            src={getCardImageUrl(card.card, 'small')}
                                            alt={card.card.name}
                                            className="w-full h-full object-cover"
                                            draggable={false}
                                            loading="lazy"
                                        />
                                        {/* Token Badge */}
                                        {card.isToken && (
                                            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[10px] font-bold rounded shadow-lg">
                                                TOKEN
                                            </div>
                                        )}
                                        {card.counters > 0 && (
                                            <div className="absolute bottom-1 right-1 bg-amber-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                {card.counters}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    cardId={contextMenu.cardId}
                    currentZone={'battlefield' as Zone}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}
