import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { getCardImageUrl } from '../api/scryfall';
import { X } from 'lucide-react';
import MotionTrail from './MotionTrail';
import { useState, useEffect } from 'react';

export default function CardInspectModal() {
    const inspectCard = useGameStore((s) => s.inspectCard);
    const inspectCardId = useGameStore((s) => s.inspectCardId);
    const setInspectCard = useGameStore((s) => s.setInspectCard);

    // Track animation state for motion trail
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (inspectCard) {
            setIsAnimating(true);
            // Disable trail after animation completes
            const timer = setTimeout(() => setIsAnimating(false), 400);
            return () => clearTimeout(timer);
        }
    }, [inspectCard]);

    if (!inspectCard) return null;

    const imageUrl = getCardImageUrl(inspectCard, 'large');

    return (
        <AnimatePresence>
            {inspectCard && (
                <motion.div
                    className="fixed inset-0 flex items-center justify-center p-4"
                    style={{ zIndex: 9999 }}
                    initial={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
                    animate={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                    exit={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setInspectCard(null)}
                >
                    <motion.div
                        className="relative flex flex-col items-center max-h-[90vh] max-w-[90vw]"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ scale: 0.3, y: 100, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.3, y: 100, opacity: 0 }}
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                        }}
                    >
                        {/* Close button */}
                        <motion.button
                            onClick={() => setInspectCard(null)}
                            className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-white transition-colors z-10"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <X className="w-8 h-8" />
                        </motion.button>

                        {/* Card container with layoutId for shared element transition */}
                        <motion.div
                            layoutId={inspectCardId ? `card-${inspectCardId}` : undefined}
                            className="relative"
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 25,
                            }}
                        >
                            {/* Motion Trail Effect */}
                            <MotionTrail isActive={isAnimating} color="gold" intensity="high" />

                            {/* Large card image */}
                            <motion.img
                                src={imageUrl}
                                alt={inspectCard.name}
                                className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
                                style={{
                                    filter: isAnimating ? 'blur(1px)' : 'blur(0px)',
                                }}
                                draggable={false}
                            />
                        </motion.div>

                        {/* Card info - compact overlay at bottom */}
                        <motion.div
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 rounded-b-2xl"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                        >
                            <h2 className="text-xl font-bold text-white text-center">{inspectCard.name}</h2>
                            <p className="text-gray-400 text-center text-sm">{inspectCard.type_line}</p>
                            {inspectCard.mana_cost && (
                                <p className="text-amber-400 text-center text-sm mt-1">{inspectCard.mana_cost}</p>
                            )}
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
