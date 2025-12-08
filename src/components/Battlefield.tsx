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

interface BattlefieldProps {
    onHoverCard?: (cardId: string | null) => void;
}

export default function Battlefield({ onHoverCard }: BattlefieldProps) {
    const cards = useGameStore((s) => s.cards);
    // Filter out attached cards
    const battlefieldCards = cards.filter((c) => c.zone === 'battlefield' && !c.attachedToId);

    const {
        toggleTap,
        setInspectCard,
        recentlySummonedCards,
        clearSummonedCard,
        targetingMode,
        completeTargeting,
        cancelTargeting
    } = useGameStore();

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
        setInspectCard(card.card, card.id);
    };

    const handleContextMenu = (e: React.MouseEvent, cardId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (targetingMode.active) {
            cancelTargeting();
            return;
        }
        setContextMenu({ x: e.clientX, y: e.clientY, cardId });
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

            {/* Battlefield grid */}
            <div className="flex flex-wrap gap-2 content-start min-h-full">
                {battlefieldCards.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-lg pointer-events-none">
                        <div className="text-center">
                            <div className="text-4xl mb-2">⚔️</div>
                            <div>Battlefield</div>
                            <div className="text-sm text-gray-700">Right-click cards to move them here</div>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {battlefieldCards.map((card) => {
                            const isSummoning = recentlySummonedCards.has(card.id);

                            // Resolving attachments
                            const attachments = (card.attachmentIds || [])
                                .map(id => cards.find(c => c.id === id))
                                .filter((c): c is typeof card => !!c);

                            return (
                                <motion.div
                                    key={card.id}
                                    layoutId={`card-${card.id}`}
                                    id={`battlefield-card-${card.id}`}
                                    className="relative cursor-pointer"
                                    style={{
                                        zIndex: isSummoning ? 9999 : 1,
                                    }}
                                    initial={{
                                        opacity: 0,
                                        y: -80,
                                        scale: 0.3,
                                        rotate: -5,
                                        filter: 'blur(8px) brightness(2)',
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        rotate: card.isTapped ? 90 : 0,
                                        filter: 'blur(0px) brightness(1)',
                                    }}
                                    exit={{
                                        opacity: 0,
                                        y: -50,
                                        scale: 0.5,
                                        transition: { duration: 0.2 }
                                    }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 300,
                                        damping: 20,
                                        // Bounce effect for landing
                                        bounce: 0.3,
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
                                            // Handle clicking attachment specifically? 
                                            // For now, let it bubble to parent or have same handler
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
                                    <motion.div
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
                                    </motion.div>
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
