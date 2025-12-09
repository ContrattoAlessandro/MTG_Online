import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Check, ArrowDown, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useSoundEngine } from '../hooks/useSoundEngine';

export default function MulliganModal() {
    const {
        gamePhase,
        cards,
        mulliganCount,
        mulligan,
        keepHand,
        isOnlineMode,
        localPlayerId,
        viewingPlayerId
    } = useGameStore();

    const { play } = useSoundEngine();
    const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
    const [isShuffling, setIsShuffling] = useState(false);
    const handCards = cards.filter(c => c.zone === 'hand');
    const cardsToSelect = mulliganCount;

    // Reset selection when hand changes
    useEffect(() => {
        setSelectedCardIds([]);
        setIsShuffling(false);
    }, [handCards.length, mulliganCount]);

    // Don't show if not in mulligan phase
    if (gamePhase !== 'MULLIGAN') return null;

    // In online mode, only show mulligan for your own player
    // Don't show when viewing another player's board
    if (isOnlineMode && viewingPlayerId !== localPlayerId) return null;

    const toggleCard = (id: string) => {
        if (mulliganCount === 0) return;
        play('click');

        setSelectedCardIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(c => c !== id);
            }
            if (prev.length >= cardsToSelect) {
                return prev;
            }
            return [...prev, id];
        });
    };

    const handleMulligan = () => {
        setIsShuffling(true);
        play('shuffle');
        setTimeout(() => {
            mulligan();
        }, 600);
    };

    const handleKeep = () => {
        if (selectedCardIds.length === cardsToSelect) {
            play('cardSnap');
            keepHand(selectedCardIds);
        }
    };

    const isValid = selectedCardIds.length === cardsToSelect;

    // Staggered card animation
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.2,
            }
        },
        exit: {
            opacity: 0,
            transition: {
                staggerChildren: 0.05,
                staggerDirection: -1
            }
        }
    };

    const cardVariants = {
        hidden: {
            opacity: 0,
            y: 100,
            rotateX: -30,
            scale: 0.8
        },
        visible: {
            opacity: 1,
            y: 0,
            rotateX: 0,
            scale: 1,
            transition: {
                type: 'spring' as const,
                stiffness: 300,
                damping: 20
            }
        },
        exit: {
            opacity: 0,
            y: -80,
            rotateX: 20,
            scale: 0.6,
            transition: { duration: 0.3 }
        }
    };

    const shuffleVariants = {
        shuffle: {
            rotate: [0, 15, -15, 10, -10, 5, 0],
            y: [0, -20, 0, -10, 0],
            transition: { duration: 0.6 }
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Animated background with gradient */}
                <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        background: 'radial-gradient(ellipse at center, rgba(20, 20, 30, 0.95) 0%, rgba(5, 5, 10, 0.98) 100%)',
                        backdropFilter: 'blur(8px)',
                    }}
                />

                {/* Floating particles background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 rounded-full bg-amber-400/30"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                            }}
                            animate={{
                                y: [0, -30, 0],
                                opacity: [0.2, 0.6, 0.2],
                                scale: [1, 1.5, 1],
                            }}
                            transition={{
                                duration: 3 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                            }}
                        />
                    ))}
                </div>

                {/* Main content */}
                <motion.div
                    className="relative w-full max-w-6xl px-4 py-8 flex flex-col items-center gap-6"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                >
                    {/* Header with glow effect */}
                    <motion.div
                        className="text-center space-y-3 relative"
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {/* Decorative line */}
                        <motion.div
                            className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                        />

                        <div className="flex items-center justify-center gap-4">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            >
                                <Sparkles className="w-6 h-6 text-amber-400" />
                            </motion.div>

                            <h2 className="text-4xl font-bold tracking-wide">
                                <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(251,191,36,0.5)]">
                                    Opening Hand
                                </span>
                            </h2>

                            <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            >
                                <Sparkles className="w-6 h-6 text-amber-400" />
                            </motion.div>
                        </div>

                        {/* Mulligan counter badge */}
                        <motion.div
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
                            style={{
                                background: mulliganCount === 0
                                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))'
                                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))',
                                border: mulliganCount === 0
                                    ? '1px solid rgba(34, 197, 94, 0.3)'
                                    : '1px solid rgba(239, 68, 68, 0.3)',
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: 'spring' }}
                        >
                            <span className={mulliganCount === 0 ? 'text-green-400' : 'text-red-400'}>
                                {mulliganCount === 0 ? '✦ First Hand' : `Mulligan #${mulliganCount}`}
                            </span>
                        </motion.div>

                        {/* Instructions */}
                        <motion.p
                            className="text-gray-400 text-lg"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            {mulliganCount === 0
                                ? "Keep this hand or take a mulligan."
                                : (
                                    <span>
                                        Select <span className="text-amber-400 font-semibold">{cardsToSelect}</span> card{cardsToSelect > 1 ? 's' : ''} to put on the bottom of your library.
                                    </span>
                                )}
                        </motion.p>
                    </motion.div>

                    {/* Cards display with 3D perspective */}
                    <motion.div
                        className="relative w-full min-h-[340px] flex items-center justify-center"
                        style={{ perspective: '1500px' }}
                        variants={containerVariants}
                        initial="hidden"
                        animate={isShuffling ? 'exit' : 'visible'}
                    >
                        <motion.div
                            className="flex flex-wrap justify-center gap-5"
                            variants={isShuffling ? shuffleVariants : undefined}
                            animate={isShuffling ? 'shuffle' : undefined}
                        >
                            <AnimatePresence mode="popLayout">
                                {handCards.map((card, index) => {
                                    const isSelected = selectedCardIds.includes(card.id);
                                    const selectionIndex = selectedCardIds.indexOf(card.id);

                                    return (
                                        <motion.div
                                            key={card.id}
                                            variants={cardVariants}
                                            layout
                                            onClick={() => toggleCard(card.id)}
                                            className="relative cursor-pointer group"
                                            style={{
                                                transformStyle: 'preserve-3d',
                                                zIndex: isSelected ? 5 : 10 - index
                                            }}
                                            whileHover={{
                                                y: mulliganCount > 0 ? -20 : -15,
                                                scale: mulliganCount > 0 ? 1.08 : 1.05,
                                                rotateY: mulliganCount > 0 ? 5 : 0,
                                            }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {/* Card glow effect */}
                                            <motion.div
                                                className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                style={{
                                                    background: isSelected
                                                        ? 'radial-gradient(ellipse, rgba(239, 68, 68, 0.3) 0%, transparent 70%)'
                                                        : 'radial-gradient(ellipse, rgba(251, 191, 36, 0.3) 0%, transparent 70%)',
                                                    filter: 'blur(10px)',
                                                }}
                                            />

                                            {/* Card container */}
                                            <motion.div
                                                className="relative w-[160px] sm:w-[180px] rounded-xl overflow-hidden shadow-2xl"
                                                style={{
                                                    aspectRatio: '2.5/3.5',
                                                }}
                                                animate={{
                                                    filter: isSelected ? 'brightness(0.5) saturate(0.3)' : 'brightness(1) saturate(1)',
                                                    y: isSelected ? 15 : 0,
                                                }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                {/* Card image */}
                                                <img
                                                    src={card.card.image_uris?.normal || card.card.card_faces?.[0]?.image_uris?.normal}
                                                    alt={card.card.name}
                                                    className="w-full h-full object-cover"
                                                    draggable={false}
                                                />

                                                {/* Hover shine effect */}
                                                <motion.div
                                                    className="absolute inset-0 pointer-events-none"
                                                    initial={{ opacity: 0, x: '-100%' }}
                                                    whileHover={{
                                                        opacity: 0.5,
                                                        x: '100%',
                                                        transition: { duration: 0.5 }
                                                    }}
                                                    style={{
                                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                                    }}
                                                />

                                                {/* Selection overlay with animation */}
                                                <AnimatePresence>
                                                    {isSelected && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="absolute inset-0 flex items-center justify-center bg-black/50"
                                                        >
                                                            <motion.div
                                                                initial={{ scale: 0, rotate: -180 }}
                                                                animate={{ scale: 1, rotate: 0 }}
                                                                exit={{ scale: 0, rotate: 180 }}
                                                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                                                className="flex flex-col items-center gap-1"
                                                            >
                                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/30 border-2 border-red-400/50">
                                                                    <ArrowDown className="w-6 h-6 text-white" />
                                                                </div>
                                                                <span className="text-white font-bold text-sm bg-red-600/80 px-2 py-0.5 rounded">
                                                                    #{selectionIndex + 1}
                                                                </span>
                                                            </motion.div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>

                                            {/* Card name tooltip */}
                                            <motion.div
                                                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                {card.card.name}
                                            </motion.div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>

                    {/* Selection counter (when mulligan > 0) */}
                    {mulliganCount > 0 && (
                        <motion.div
                            className="flex items-center gap-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <span className="text-gray-400">Selected:</span>
                            <div className="flex gap-1">
                                {[...Array(cardsToSelect)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className={`w-3 h-3 rounded-full ${i < selectedCardIds.length ? 'bg-red-500' : 'bg-gray-700'}`}
                                        animate={i < selectedCardIds.length ? { scale: [1, 1.3, 1] } : {}}
                                        transition={{ duration: 0.2 }}
                                    />
                                ))}
                            </div>
                            <span className={`font-bold ${isValid ? 'text-green-400' : 'text-gray-500'}`}>
                                {selectedCardIds.length}/{cardsToSelect}
                            </span>
                        </motion.div>
                    )}

                    {/* Action buttons */}
                    <motion.div
                        className="flex gap-4 mt-4"
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        {/* Mulligan button */}
                        <motion.button
                            onClick={handleMulligan}
                            disabled={isShuffling}
                            className="relative group px-8 py-4 rounded-xl font-bold text-lg overflow-hidden disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(55, 55, 65, 0.9), rgba(35, 35, 45, 0.9))',
                                border: '1px solid rgba(100, 100, 110, 0.3)',
                            }}
                        >
                            {/* Hover gradient effect */}
                            <motion.div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))',
                                }}
                            />
                            <span className="relative flex items-center gap-3 text-red-400 group-hover:text-red-300 transition-colors">
                                <motion.div
                                    animate={isShuffling ? { rotate: 360 } : {}}
                                    transition={{ duration: 0.6, ease: 'linear' }}
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </motion.div>
                                {isShuffling ? 'Shuffling...' : 'Mulligan'}
                            </span>
                        </motion.button>

                        {/* Keep button */}
                        <motion.button
                            onClick={handleKeep}
                            disabled={!isValid || isShuffling}
                            className="relative group px-10 py-4 rounded-xl font-bold text-lg overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={isValid ? { scale: 1.02 } : {}}
                            whileTap={isValid ? { scale: 0.98 } : {}}
                            style={{
                                background: isValid
                                    ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.9), rgba(245, 158, 11, 0.9))'
                                    : 'linear-gradient(135deg, rgba(55, 55, 65, 0.9), rgba(35, 35, 45, 0.9))',
                                border: isValid
                                    ? '1px solid rgba(251, 191, 36, 0.5)'
                                    : '1px solid rgba(100, 100, 110, 0.3)',
                                boxShadow: isValid
                                    ? '0 0 30px rgba(251, 191, 36, 0.3)'
                                    : 'none',
                            }}
                        >
                            {/* Animated glow for valid state */}
                            {isValid && (
                                <motion.div
                                    className="absolute inset-0"
                                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    style={{
                                        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.2) 0%, transparent 70%)',
                                    }}
                                />
                            )}
                            <span className={`relative flex items-center gap-3 transition-colors ${isValid ? 'text-gray-900' : 'text-gray-500'}`}>
                                <Check className="w-5 h-5" />
                                {mulliganCount === 0 ? 'Keep Hand' : 'Confirm'}
                            </span>
                        </motion.button>
                    </motion.div>

                    {/* Rules reminder - subtle at bottom */}
                    <motion.p
                        className="text-gray-600 text-xs max-w-xl text-center mt-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                    >
                        London Mulligan: Each mulligan draws 7 new cards. When keeping, put cards equal to mulligan count on library bottom.
                    </motion.p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
