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
            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-2 bg-gray-900/95 border border-gray-700 rounded-t-lg hover:bg-gray-800/95"
            >
                {/* Drag Handle */}
                <GripVertical className="w-4 h-4 text-gray-600 cursor-grab" />

                <span
                    className="text-sm font-medium text-gray-300 font-mono flex-1 text-center cursor-pointer"
                    onClick={() => setIsCollapsed(!isCollapsed)}
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
                            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"
                            title="Clear log"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 hover:bg-gray-700 rounded"
                    >
                        {isCollapsed ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* Log Content */}
            {!isCollapsed && (
                <div className="bg-gray-950/95 border border-t-0 border-gray-700 rounded-b-lg max-h-48 overflow-y-auto font-mono text-xs">
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
