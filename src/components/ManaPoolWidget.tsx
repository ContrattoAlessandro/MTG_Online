import { motion } from 'framer-motion';
import { useGameStore, ManaPool } from '../store/gameStore';
import { Trash2 } from 'lucide-react';

// Mana symbol SVG paths and colors
const MANA_SYMBOLS: Record<keyof ManaPool, { color: string; bgColor: string; symbol: string }> = {
    W: { color: '#F9FAFB', bgColor: 'from-amber-100 to-amber-200', symbol: '☀' },
    U: { color: '#3B82F6', bgColor: 'from-blue-400 to-blue-600', symbol: '💧' },
    B: { color: '#1F2937', bgColor: 'from-gray-700 to-gray-900', symbol: '💀' },
    R: { color: '#EF4444', bgColor: 'from-red-500 to-red-700', symbol: '🔥' },
    G: { color: '#22C55E', bgColor: 'from-green-500 to-green-700', symbol: '🌲' },
    C: { color: '#9CA3AF', bgColor: 'from-gray-400 to-gray-600', symbol: '◇' },
};

const MANA_ORDER: (keyof ManaPool)[] = ['W', 'U', 'B', 'R', 'G', 'C'];

export default function ManaPoolWidget() {
    const manaPool = useGameStore((s) => s.manaPool);
    const adjustMana = useGameStore((s) => s.adjustMana);
    const clearManaPool = useGameStore((s) => s.clearManaPool);

    const totalMana = Object.values(manaPool).reduce((sum, val) => sum + val, 0);

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed right-4 top-64 flex flex-col gap-2 bg-black/80 p-3 rounded-xl border border-white/10 backdrop-blur-sm shadow-2xl z-40 cursor-grab active:cursor-grabbing"
            whileDrag={{ scale: 1.02 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mana Pool</span>
                {totalMana > 0 && (
                    <button
                        onClick={clearManaPool}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                        title="Clear Mana Pool"
                    >
                        <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-400" />
                    </button>
                )}
            </div>

            {/* Mana Symbols Grid */}
            <div className="grid grid-cols-3 gap-1.5">
                {MANA_ORDER.map((color) => {
                    const count = manaPool[color];
                    const { bgColor, symbol } = MANA_SYMBOLS[color];
                    const isActive = count > 0;

                    return (
                        <motion.button
                            key={color}
                            onClick={() => adjustMana(color, 1)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                adjustMana(color, -1);
                            }}
                            className={`
                                relative w-10 h-10 rounded-full
                                bg-gradient-to-br ${bgColor}
                                flex items-center justify-center
                                transition-all duration-200
                                hover:scale-110 active:scale-95
                                select-none cursor-pointer
                                ${isActive ? 'ring-2 ring-offset-2 ring-offset-gray-900' : 'opacity-60 hover:opacity-100'}
                            `}
                            style={{
                                boxShadow: isActive
                                    ? `0 0 15px ${color === 'W' ? 'rgba(251, 191, 36, 0.6)' :
                                        color === 'U' ? 'rgba(59, 130, 246, 0.6)' :
                                            color === 'B' ? 'rgba(75, 85, 99, 0.6)' :
                                                color === 'R' ? 'rgba(239, 68, 68, 0.6)' :
                                                    color === 'G' ? 'rgba(34, 197, 94, 0.6)' :
                                                        'rgba(156, 163, 175, 0.6)'}`
                                    : 'none',
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            animate={isActive ? {
                                boxShadow: [
                                    `0 0 10px ${color === 'W' ? 'rgba(251, 191, 36, 0.4)' :
                                        color === 'U' ? 'rgba(59, 130, 246, 0.4)' :
                                            color === 'B' ? 'rgba(75, 85, 99, 0.4)' :
                                                color === 'R' ? 'rgba(239, 68, 68, 0.4)' :
                                                    color === 'G' ? 'rgba(34, 197, 94, 0.4)' :
                                                        'rgba(156, 163, 175, 0.4)'}`,
                                    `0 0 20px ${color === 'W' ? 'rgba(251, 191, 36, 0.7)' :
                                        color === 'U' ? 'rgba(59, 130, 246, 0.7)' :
                                            color === 'B' ? 'rgba(75, 85, 99, 0.7)' :
                                                color === 'R' ? 'rgba(239, 68, 68, 0.7)' :
                                                    color === 'G' ? 'rgba(34, 197, 94, 0.7)' :
                                                        'rgba(156, 163, 175, 0.7)'}`,
                                    `0 0 10px ${color === 'W' ? 'rgba(251, 191, 36, 0.4)' :
                                        color === 'U' ? 'rgba(59, 130, 246, 0.4)' :
                                            color === 'B' ? 'rgba(75, 85, 99, 0.4)' :
                                                color === 'R' ? 'rgba(239, 68, 68, 0.4)' :
                                                    color === 'G' ? 'rgba(34, 197, 94, 0.4)' :
                                                        'rgba(156, 163, 175, 0.4)'}`,
                                ],
                            } : {}}
                            transition={isActive ? {
                                duration: 1.5,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            } : {}}
                        >
                            {/* Mana Symbol */}
                            <span className={`text-lg ${color === 'B' ? 'text-gray-300' : color === 'W' ? 'text-amber-700' : 'text-white'}`}>
                                {symbol}
                            </span>

                            {/* Count Badge */}
                            {count > 0 && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black shadow-lg"
                                >
                                    {count}
                                </motion.div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Total Mana Display */}
            {totalMana > 0 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 pt-2 border-t border-gray-700 text-center"
                >
                    <span className="text-xs text-gray-400">Total: </span>
                    <span className="text-sm font-bold text-amber-400">{totalMana}</span>
                </motion.div>
            )}
        </motion.div>
    );
}
