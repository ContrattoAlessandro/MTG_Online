import React from 'react';
import { useGameStore } from '../store/gameStore';
import { motion } from 'framer-motion';

export const PlayerSwitcher: React.FC = () => {
    const { players, viewingPlayerId, activePlayerId, switchView, turnOrder } = useGameStore();

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed right-4 top-96 flex flex-col gap-3 z-50 bg-black/80 p-2 rounded-xl border border-white/10 backdrop-blur-sm shadow-2xl cursor-grab active:cursor-grabbing"
            whileDrag={{ scale: 1.02 }}
        >
            {/* Drag Handle */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-600 rounded-full opacity-50" />

            {turnOrder.map((playerId) => {
                const player = players[playerId];

                // Skip if player data is not yet initialized
                if (!player) return null;

                const isViewing = viewingPlayerId === playerId;
                const isActive = activePlayerId === playerId;

                return (
                    <button
                        key={playerId}
                        onClick={() => switchView(playerId)}
                        className={`relative group relative w-12 h-12 rounded-full transition-all duration-200 ${isViewing
                            ? 'ring-2 ring-white scale-110'
                            : 'hover:scale-105 opacity-70 hover:opacity-100'
                            }`}
                        title={player.name}
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when clicking button
                    >
                        <img
                            src={player.avatarUrl}
                            alt={player.name}
                            className="w-full h-full rounded-full object-cover bg-gray-800"
                        />

                        {/* Active Player Indicator (Turn) */}
                        {isActive && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-black flex items-center justify-center shadow-sm">
                                <div className="w-1.5 h-1.5 bg-yellow-100 rounded-full animate-pulse" />
                            </div>
                        )}

                        {/* Viewing Indicator */}
                        {isViewing && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                        )}

                        {/* Tooltip - Now on Left */}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                            {player.name}
                            {isActive && <span className="ml-1 text-yellow-500">(Active)</span>}
                        </div>
                    </button>
                );
            })}
        </motion.div>
    );
};
