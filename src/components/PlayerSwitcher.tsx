import React from 'react';
import { useGameStore } from '../store/gameStore';
import { motion } from 'framer-motion';
import { UserX } from 'lucide-react';

export const PlayerSwitcher: React.FC = () => {
    const {
        players,
        viewingPlayerId,
        activePlayerId,
        switchView,
        turnOrder,
        isOnlineMode,
        localPlayerId,
        connectedPlayers
    } = useGameStore();

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

            {/* Online Mode Label */}
            {isOnlineMode && (
                <div className="text-center text-xs text-emerald-400 font-medium mb-1">
                    🟢 Online
                </div>
            )}

            {turnOrder.map((playerId) => {
                const player = players[playerId];

                // Skip if player data is not yet initialized
                if (!player) return null;

                const isViewing = viewingPlayerId === playerId;
                const isActive = activePlayerId === playerId;
                const isMe = isOnlineMode && localPlayerId === playerId;
                const connectedPlayer = connectedPlayers[playerId];
                const isConnected = connectedPlayer?.status === 'connected';

                // In online mode: only allow viewing connected players or yourself
                // In offline mode: allow viewing anyone
                const canView = !isOnlineMode || isMe || isConnected;

                // Get display name - use connected player name if available
                const displayName = connectedPlayer?.name || player.name;

                // Handle click - only if we can view this player
                const handleClick = () => {
                    if (canView) {
                        switchView(playerId);
                    }
                };

                return (
                    <button
                        key={playerId}
                        onClick={handleClick}
                        disabled={isOnlineMode && !canView}
                        className={`relative group w-12 h-12 rounded-full transition-all duration-200 
                            ${isViewing ? 'ring-2 ring-white scale-110' : ''} 
                            ${isMe ? 'ring-2 ring-emerald-500' : ''}
                            ${canView
                                ? 'hover:scale-105 opacity-100 hover:opacity-100'
                                : 'opacity-30 cursor-not-allowed grayscale'
                            }`}
                        title={canView
                            ? `${displayName}${isMe ? ' (You)' : ''} - Click to view their board`
                            : 'Empty slot - waiting for player to join'
                        }
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {/* Show placeholder for unconnected slots in online mode */}
                        {isOnlineMode && !isMe && !isConnected ? (
                            <div className="w-full h-full rounded-full bg-gray-700/50 flex items-center justify-center border-2 border-dashed border-gray-600">
                                <UserX className="w-5 h-5 text-gray-500" />
                            </div>
                        ) : (
                            <img
                                src={player.avatarUrl}
                                alt={displayName}
                                className="w-full h-full rounded-full object-cover bg-gray-800"
                            />
                        )}

                        {/* "ME" Badge for online mode */}
                        {isMe && (
                            <div className="absolute -top-2 -left-2 px-1.5 py-0.5 bg-emerald-500 text-black text-[8px] font-bold rounded-full shadow-lg">
                                ME
                            </div>
                        )}

                        {/* Connection Status Indicator (Online Mode) - only for connected non-self players */}
                        {isOnlineMode && !isMe && isConnected && (
                            <div
                                className="absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-black bg-green-500"
                                title="Connected"
                            />
                        )}

                        {/* Active Player Indicator (Turn) - only show if player is connected */}
                        {isActive && canView && (
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
                            {canView ? (
                                <>
                                    {displayName}
                                    {isMe && <span className="ml-1 text-emerald-400">(You)</span>}
                                    {isActive && <span className="ml-1 text-yellow-500">(Turn)</span>}
                                </>
                            ) : (
                                <span className="text-gray-400">Empty slot</span>
                            )}
                        </div>
                    </button>
                );
            })}
        </motion.div>
    );
};
