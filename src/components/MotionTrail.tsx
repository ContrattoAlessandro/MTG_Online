import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface MotionTrailProps {
    isActive: boolean;
    color?: 'gold' | 'blue' | 'purple';
    intensity?: 'low' | 'medium' | 'high';
}

// Particle/ghost configuration based on intensity
const intensityConfig = {
    low: { particles: 3, duration: 0.3 },
    medium: { particles: 5, duration: 0.5 },
    high: { particles: 8, duration: 0.7 },
};

const colorConfig = {
    gold: {
        primary: 'rgba(255, 215, 0, 0.8)',
        secondary: 'rgba(255, 165, 0, 0.6)',
        glow: 'rgba(255, 215, 0, 0.4)',
    },
    blue: {
        primary: 'rgba(59, 130, 246, 0.8)',
        secondary: 'rgba(96, 165, 250, 0.6)',
        glow: 'rgba(59, 130, 246, 0.4)',
    },
    purple: {
        primary: 'rgba(168, 85, 247, 0.8)',
        secondary: 'rgba(192, 132, 252, 0.6)',
        glow: 'rgba(168, 85, 247, 0.4)',
    },
};

/**
 * MotionTrail - Renders particle/glow effects during card movement
 * Used for both inspect and play card animations
 */
export default function MotionTrail({
    isActive,
    color = 'gold',
    intensity = 'medium',
}: MotionTrailProps) {
    const [particles, setParticles] = useState<number[]>([]);
    const config = intensityConfig[intensity];
    const colors = colorConfig[color];

    useEffect(() => {
        if (isActive) {
            // Generate particle IDs
            setParticles(Array.from({ length: config.particles }, (_, i) => Date.now() + i));
        } else {
            setParticles([]);
        }
    }, [isActive, config.particles]);

    return (
        <AnimatePresence>
            {isActive && (
                <>
                    {/* Main glow aura */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none rounded-lg"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                            opacity: [0, 1, 0.5],
                            scale: [0.8, 1.1, 1],
                        }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        transition={{ duration: config.duration }}
                        style={{
                            background: `radial-gradient(ellipse at center, ${colors.primary} 0%, ${colors.secondary} 40%, transparent 70%)`,
                            filter: 'blur(8px)',
                        }}
                    />

                    {/* Trailing ghost particles */}
                    {particles.map((id, index) => (
                        <motion.div
                            key={id}
                            className="absolute inset-0 pointer-events-none rounded-lg"
                            initial={{
                                opacity: 0.7 - index * 0.1,
                                y: 0,
                                scale: 1,
                            }}
                            animate={{
                                opacity: 0,
                                y: -20 - index * 10,
                                scale: 0.6 + index * 0.05,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: config.duration + index * 0.1,
                                delay: index * 0.05,
                                ease: 'easeOut',
                            }}
                            style={{
                                background: `linear-gradient(180deg, ${colors.glow} 0%, transparent 100%)`,
                                filter: `blur(${4 + index * 2}px)`,
                            }}
                        />
                    ))}

                    {/* Streak line (for fast movement) */}
                    <motion.div
                        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 60, opacity: 0.6 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            width: '40%',
                            top: '100%',
                            background: `linear-gradient(180deg, ${colors.primary} 0%, transparent 100%)`,
                            borderRadius: '0 0 50% 50%',
                            filter: 'blur(4px)',
                        }}
                    />
                </>
            )}
        </AnimatePresence>
    );
}

/**
 * GlowStreak - A simpler glow effect for landing/impact
 */
export function GlowStreak({ isActive, color = 'gold' }: { isActive: boolean; color?: 'gold' | 'blue' }) {
    const colors = colorConfig[color];

    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    className="absolute inset-0 pointer-events-none rounded-lg"
                    initial={{
                        boxShadow: `0 0 0 0 ${colors.primary}, 0 0 20px 5px ${colors.secondary}, 0 0 40px 10px ${colors.glow}`,
                    }}
                    animate={{
                        boxShadow: `0 0 0 8px ${colors.glow}, 0 0 35px 15px ${colors.secondary}, 0 0 60px 25px transparent`,
                    }}
                    exit={{
                        boxShadow: `0 0 0 0 transparent, 0 0 0 0 transparent, 0 0 0 0 transparent`,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            )}
        </AnimatePresence>
    );
}
