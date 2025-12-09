import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Gamepad2, Loader2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { isSupabaseConfigured, createRoomChannel } from '../lib/supabaseClient';
import { PlayerPresence } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

const SEAT_OPTIONS = [
    { id: 'player-1', name: 'Player 1', color: '#1a1a2e' },
    { id: 'player-2', name: 'Player 2', color: '#2d132c' },
    { id: 'player-3', name: 'Player 3', color: '#1e3a5f' },
    { id: 'player-4', name: 'Player 4', color: '#0d3b0d' },
];

export default function Lobby() {
    const { createRoom, joinRoom, startSoloMode } = useGameStore();

    const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
    const [roomCode, setRoomCode] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [selectedSeat, setSelectedSeat] = useState<string | null>(null); // Start with no selection
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);

    // Taken seats tracking
    const [takenSeats, setTakenSeats] = useState<Record<string, string>>({}); // seatId -> playerName
    const [isCheckingSeats, setIsCheckingSeats] = useState(false);
    const previewChannelRef = useRef<RealtimeChannel | null>(null);

    const supabaseReady = isSupabaseConfigured();

    // Check for taken seats when room code is complete (6 chars)
    useEffect(() => {
        if (mode === 'join' && roomCode.length === 6 && supabaseReady) {
            checkTakenSeats(roomCode);
        }

        // Cleanup preview channel when leaving join mode
        return () => {
            if (previewChannelRef.current) {
                previewChannelRef.current.unsubscribe();
                previewChannelRef.current = null;
            }
        };
    }, [roomCode, mode]);

    // Check which seats are taken in a room
    const checkTakenSeats = async (code: string) => {
        setIsCheckingSeats(true);
        setTakenSeats({ 'player-1': 'Host' }); // Player 1 is always taken by host

        // Clean up existing preview channel
        if (previewChannelRef.current) {
            await previewChannelRef.current.unsubscribe();
        }

        const channel = createRoomChannel(code);
        previewChannelRef.current = channel;

        // Listen for player_join events to discover who's connected
        channel.on('broadcast', { event: 'player_join' }, (payload) => {
            const presence = payload.payload as PlayerPresence;
            setTakenSeats(prev => ({
                ...prev,
                [presence.playerId]: presence.name,
            }));
        });

        // Subscribe and wait for confirmation
        await new Promise((resolve) => {
            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    resolve(null);
                }
            });
        });

        // Send ping to discover existing players
        await channel.send({
            type: 'broadcast',
            event: 'presence_ping',
            payload: {},
        });

        // Wait a moment to receive any presence broadcasts, then stop checking
        setTimeout(() => {
            setIsCheckingSeats(false);
            // Auto-select first available seat
            const availableSeats = SEAT_OPTIONS.slice(1).filter(
                s => !takenSeats[s.id]
            );
            if (availableSeats.length > 0 && !selectedSeat) {
                // Use a fresh check since takenSeats might not be updated yet
                const currentTaken = { ...takenSeats };
                const firstAvailable = SEAT_OPTIONS.slice(1).find(s => !currentTaken[s.id]);
                if (firstAvailable) {
                    setSelectedSeat(firstAvailable.id);
                }
            }
        }, 1000);
    };

    const handleCreateRoom = async () => {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const code = await createRoom(playerName);
            if (code) {
                setCreatedRoomCode(code);
                // Room created successfully - App.tsx will now show DeckImportModal
            } else {
                setError('Failed to create room. Check console for details.');
            }
        } catch (err) {
            setError('Error creating room');
            console.error(err);
        }
        setIsLoading(false);
    };

    const handleJoinRoom = async () => {
        if (!roomCode.trim()) {
            setError('Please enter a room code');
            return;
        }
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!selectedSeat) {
            setError('Please select a seat');
            return;
        }

        // Clean up preview channel before joining
        if (previewChannelRef.current) {
            await previewChannelRef.current.unsubscribe();
            previewChannelRef.current = null;
        }

        setIsLoading(true);
        setError(null);
        try {
            const success = await joinRoom(roomCode.toUpperCase(), selectedSeat, playerName);
            if (!success) {
                setError('Failed to join room. Check the room code.');
            }
            // If successful, the store will update and App.tsx will render the game
        } catch (err) {
            setError('Error joining room');
            console.error(err);
        }
        setIsLoading(false);
    };

    const handleStartSolo = () => {
        startSoloMode();
    };

    // Show room code after creating if we haven't navigated away yet
    if (createdRoomCode) {
        return (
            <div className="h-screen w-screen flex items-center justify-center" style={{
                background: 'radial-gradient(ellipse at center, #12121a 0%, #0a0a0f 100%)'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
                >
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                            <span className="text-3xl">✓</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Room Created!</h2>
                        <p className="text-gray-400 mb-6">Share this code with your friends:</p>

                        <div className="bg-black/40 rounded-xl p-4 mb-6">
                            <div className="text-4xl font-mono font-bold tracking-widest text-amber-400 mb-2">
                                {createdRoomCode}
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(createdRoomCode);
                                }}
                                className="flex items-center gap-2 mx-auto text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                📋 Copy to clipboard
                            </button>
                        </div>

                        <p className="text-gray-500 text-sm mb-6">
                            You are the host (Player 1). Now load your deck!
                        </p>

                        <button
                            onClick={() => setCreatedRoomCode(null)}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:from-amber-400 hover:to-yellow-400 transition-all"
                        >
                            Continue to Deck Selection
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex items-center justify-center" style={{
            background: 'radial-gradient(ellipse at center, #12121a 0%, #0a0a0f 100%)'
        }}>
            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 rounded-full bg-amber-400/20"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `floatParticle ${3 + Math.random() * 2}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl relative z-10"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent mb-2">
                        MTG Commander
                    </h1>
                    <p className="text-gray-400">Online Multiplayer</p>
                </div>

                {/* Main Menu */}
                {mode === 'menu' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                    >
                        {supabaseReady ? (
                            <>
                                <button
                                    onClick={() => setMode('create')}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold flex items-center justify-center gap-3 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20"
                                >
                                    <Users className="w-5 h-5" />
                                    Create Room
                                </button>

                                <button
                                    onClick={() => setMode('join')}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold flex items-center justify-center gap-3 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    <UserPlus className="w-5 h-5" />
                                    Join Room
                                </button>
                            </>
                        ) : (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                                <p className="text-yellow-400 text-sm mb-2">⚠️ Supabase not configured</p>
                                <p className="text-gray-400 text-xs">
                                    Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file for multiplayer.
                                </p>
                            </div>
                        )}

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-black/60 text-gray-500">or</span>
                            </div>
                        </div>

                        <button
                            onClick={handleStartSolo}
                            className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
                        >
                            <Gamepad2 className="w-5 h-5" />
                            Play Solo (Offline)
                        </button>
                    </motion.div>
                )}

                {/* Create Room */}
                {mode === 'create' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <button
                            onClick={() => setMode('menu')}
                            className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mb-4"
                        >
                            ← Back
                        </button>

                        <h2 className="text-xl font-bold text-white mb-4">Create a Room</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            You'll be the host (Player 1). Share the room code with up to 3 friends.
                        </p>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Your Name</label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter info..."
                                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                            />
                        </div>

                        <button
                            onClick={handleCreateRoom}
                            disabled={isLoading || !playerName.trim()}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold flex items-center justify-center gap-3 hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Users className="w-5 h-5" />
                                    Create Room
                                </>
                            )}
                        </button>
                    </motion.div>
                )}

                {/* Join Room */}
                {mode === 'join' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <button
                            onClick={() => setMode('menu')}
                            className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mb-4"
                        >
                            ← Back
                        </button>

                        <h2 className="text-xl font-bold text-white mb-4">Join a Room</h2>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Your Name</label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Room Code</label>
                            <input
                                type="text"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                placeholder="ABC123"
                                maxLength={6}
                                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xl tracking-widest text-center placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">
                                Select Your Seat
                                {isCheckingSeats && (
                                    <span className="ml-2 text-amber-400 animate-pulse">
                                        Checking availability...
                                    </span>
                                )}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {SEAT_OPTIONS.slice(1).map((seat) => {
                                    const isTaken = !!takenSeats[seat.id];
                                    const takenByName = takenSeats[seat.id];
                                    const isSelected = selectedSeat === seat.id;

                                    return (
                                        <button
                                            key={seat.id}
                                            onClick={() => !isTaken && setSelectedSeat(seat.id)}
                                            disabled={isTaken}
                                            className={`py-2 px-4 rounded-lg border transition-all relative ${isTaken
                                                ? 'border-red-500/30 bg-red-500/10 text-red-400/60 cursor-not-allowed'
                                                : isSelected
                                                    ? 'border-amber-500 bg-amber-500/20 text-white'
                                                    : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20'
                                                }`}
                                            style={{
                                                borderLeftColor: isTaken ? '#ef4444' : isSelected ? seat.color : undefined,
                                                borderLeftWidth: '3px',
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span>{seat.name}</span>
                                                {isTaken && (
                                                    <span className="text-xs bg-red-500/20 px-1.5 py-0.5 rounded text-red-400">
                                                        {takenByName}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Player 1 is reserved for the host</p>
                        </div>

                        <button
                            onClick={handleJoinRoom}
                            disabled={isLoading || !roomCode.trim() || !playerName.trim() || !selectedSeat}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold flex items-center justify-center gap-3 hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Join Room
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
