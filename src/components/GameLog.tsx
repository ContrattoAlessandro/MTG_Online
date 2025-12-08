import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { ChevronDown, ChevronUp, Trash2, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { LogActionType } from '../types';

// Color mapping for different action types
const getActionColor = (actionType: LogActionType): string => {
    switch (actionType) {
        case 'draw':
            return 'text-blue-400';
        case 'play':
        case 'mana':
            return 'text-green-400';
        case 'life':
        case 'graveyard':
            return 'text-red-400';
        case 'exile':
            return 'text-purple-400';
        case 'turn':
            return 'text-yellow-400';
        case 'tap':
            return 'text-gray-400';
        default:
            return 'text-gray-300';
    }
};

export default function GameLog() {
    const { gameLog, clearGameLog } = useGameStore();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const logEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to newest entry
    useEffect(() => {
        if (!isCollapsed && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [gameLog, isCollapsed]);

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            className={`fixed bottom-24 right-4 z-40 cursor-grab active:cursor-grabbing ${isCollapsed ? 'w-40' : 'w-80'
                }`}
            whileDrag={{ scale: 1.02 }}
        >
            {/* Header - Premium */}
            <div
                className="flex items-center justify-between px-3 py-2 gamelog-header rounded-t-lg"
                style={{
                    background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(15, 15, 22, 0.98) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderBottom: 'none'
                }}
            >
                {/* Drag Handle */}
                <GripVertical className="w-4 h-4 text-gray-600 cursor-grab" />

                <span
                    className="text-sm font-medium font-mono flex-1 text-center bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent"
                >
                    📜 Game Log
                </span>
                <div className="flex items-center gap-2">
                    {!isCollapsed && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                clearGameLog();
                            }}
                            className="p-1 hover:bg-red-500/10 rounded text-gray-400 hover:text-red-400 transition-colors"
                            title="Clear log"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 hover:bg-amber-500/10 rounded transition-colors"
                    >
                        {isCollapsed ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* Log Content - Premium */}
            {!isCollapsed && (
                <div
                    className="max-h-48 overflow-y-auto font-mono text-xs rounded-b-lg"
                    style={{
                        background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.95) 0%, rgba(8, 8, 12, 0.98) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderTop: 'none',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                    }}
                >
                    {gameLog.length === 0 ? (
                        <div className="px-3 py-4 text-gray-500 text-center italic">
                            No actions yet...
                        </div>
                    ) : (
                        <div className="py-1">
                            {gameLog.map((entry) => (
                                <div
                                    key={entry.id}
                                    className={`px-3 py-0.5 hover:bg-gray-900/50 ${getActionColor(entry.actionType)}`}
                                >
                                    <span className="text-gray-500">
                                        [T{entry.turn} - {format(entry.timestamp, 'HH:mm')}]
                                    </span>{' '}
                                    {entry.message}
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
