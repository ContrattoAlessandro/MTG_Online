import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSoundSettings, useSoundEngine } from '../hooks/useSoundEngine';
import { Counters } from '../types';
import {
    Heart,
    RotateCcw,
    SkipForward,
    Dices,
    ChevronDown,
    Skull,
    Zap,
    Star,
    Radiation,
    Ticket,
    Crown,
    CloudLightning,
    Coins,
    ArrowLeft,
    Volume2,
    VolumeX,
    Settings,
    Undo2,
    Redo2,
} from 'lucide-react';

interface TopNavProps {
    onOpenSettings?: () => void;
}

// Counter type labels with icons
const COUNTER_CONFIG: Record<keyof Counters, { label: string; icon: React.ReactNode }> = {
    poison: { label: 'Poison', icon: <Skull className="w-4 h-4" /> },
    energy: { label: 'Energy', icon: <Zap className="w-4 h-4" /> },
    experience: { label: 'Experience', icon: <Star className="w-4 h-4" /> },
    rad: { label: 'Rad', icon: <Radiation className="w-4 h-4" /> },
    tickets: { label: 'Tickets', icon: <Ticket className="w-4 h-4" /> },
    commanderTax: { label: 'Commander Tax', icon: <Crown className="w-4 h-4" /> },
    stormCount: { label: 'Storm Count', icon: <CloudLightning className="w-4 h-4" /> },
};

export default function TopNav({ onOpenSettings }: TopNavProps) {
    const {
        life,
        turn,
        counters,
        lastRandomResult,
        adjustLife,
        nextTurn,
        adjustCounter,
        resetMatch,
        returnToMenu,
        flipCoin,
        rollDie,
        rollDoubleDice,
        rollPlanarDie,
        clearRandomResult,
        undo,
        redo,
        historyPast,
        historyFuture,
    } = useGameStore();

    const { isMuted, toggleMute } = useSoundSettings();
    const { play } = useSoundEngine();

    const [isCountersOpen, setIsCountersOpen] = useState(false);
    const [isRandomOpen, setIsRandomOpen] = useState(false);
    const countersRef = useRef<HTMLDivElement>(null);
    const randomRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (countersRef.current && !countersRef.current.contains(event.target as Node)) {
                setIsCountersOpen(false);
            }
            if (randomRef.current && !randomRef.current.contains(event.target as Node)) {
                setIsRandomOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-clear random result after 5 seconds
    useEffect(() => {
        if (lastRandomResult) {
            const timer = setTimeout(() => clearRandomResult(), 5000);
            return () => clearTimeout(timer);
        }
    }, [lastRandomResult, clearRandomResult]);

    return (
        <nav className="h-16 topnav-premium flex items-center justify-between px-4 z-50 relative">
            {/* Left section - Logo & Stats */}
            <div className="flex items-center gap-4">
                {/* Logo with glow */}
                <div className="text-xl font-bold tracking-wide hidden sm:flex items-center gap-2">
                    <span className="text-2xl">⚔️</span>
                    <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                        MTG SIMULATOR
                    </span>
                </div>

                {/* Life Counter - Premium */}
                <div className="flex items-center gap-1 life-counter-premium px-3 py-1.5">
                    <Heart className="w-5 h-5 text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    <button
                        onClick={() => { adjustLife(-1); play('click'); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-red-400 font-bold transition-all"
                    >
                        −
                    </button>
                    <span className="text-2xl font-bold min-w-[2.5rem] text-center text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                        {life}
                    </span>
                    <button
                        onClick={() => { adjustLife(1); play('click'); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-green-500/20 text-green-400 font-bold transition-all"
                    >
                        +
                    </button>
                </div>

                {/* Turn Counter - Premium */}
                <div className="flex items-center gap-2 counter-premium px-3 py-1.5">
                    <span className="text-gray-400 text-sm">Turn</span>
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        {turn}
                    </span>
                </div>

                {/* Next Turn Button - Premium */}
                <button
                    onClick={nextTurn}
                    className="relative group flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.9))',
                        border: '1px solid rgba(59, 130, 246, 0.5)',
                        boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
                    }}
                    title="Next Turn: Untap all, Draw 1"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -translate-x-full group-hover:translate-x-full duration-500" />
                    <SkipForward className="w-4 h-4 relative z-10" />
                    <span className="hidden md:inline relative z-10">Next Turn</span>
                </button>

                {/* Counters Dropdown - Premium */}
                <div className="relative" ref={countersRef}>
                    <button
                        onClick={() => setIsCountersOpen(!isCountersOpen)}
                        className="flex items-center gap-1 px-3 py-2 counter-premium hover:border-amber-500/30 transition-all"
                    >
                        <span>Counters</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCountersOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isCountersOpen && (
                        <div className="absolute top-full mt-2 left-0 dropdown-premium p-3 min-w-[220px] z-50">
                            <div className="space-y-2">
                                {(Object.keys(COUNTER_CONFIG) as Array<keyof Counters>).map((key) => (
                                    <div key={key} className="flex items-center justify-between gap-2 menu-item-premium px-2 py-1.5">
                                        <div className="flex items-center gap-2 text-gray-300">
                                            {COUNTER_CONFIG[key].icon}
                                            <span className="text-sm">{COUNTER_CONFIG[key].label}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => adjustCounter(key, -1)}
                                                className="w-6 h-6 flex items-center justify-center rounded bg-gray-700/50 hover:bg-gray-600 text-sm transition-colors"
                                            >
                                                −
                                            </button>
                                            <span className="w-6 text-center font-bold text-sm text-amber-400">{counters[key]}</span>
                                            <button
                                                onClick={() => adjustCounter(key, 1)}
                                                className="w-6 h-6 flex items-center justify-center rounded bg-gray-700/50 hover:bg-gray-600 text-sm transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Randomizers Dropdown - Premium */}
                <div className="relative" ref={randomRef}>
                    <button
                        onClick={() => setIsRandomOpen(!isRandomOpen)}
                        className="flex items-center gap-1 px-3 py-2 counter-premium hover:border-amber-500/30 transition-all"
                    >
                        <Dices className="w-4 h-4" />
                        <span className="hidden sm:inline">Randomizers</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isRandomOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isRandomOpen && (
                        <div className="absolute top-full mt-2 left-0 dropdown-premium py-2 min-w-[160px] z-50">
                            <button
                                onClick={() => { flipCoin(); play('coin'); setIsRandomOpen(false); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-amber-500/10 flex items-center gap-2 transition-colors"
                            >
                                <Coins className="w-4 h-4 text-amber-400" /> Flip Coin
                            </button>
                            <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-1" />
                            {[4, 6, 8, 12, 20].map((sides) => (
                                <button
                                    key={sides}
                                    onClick={() => { rollDie(sides); play('dice'); setIsRandomOpen(false); }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-amber-500/10 flex items-center gap-2 transition-colors"
                                >
                                    <Dices className="w-4 h-4 text-blue-400" /> Roll D{sides}
                                </button>
                            ))}
                            <button
                                onClick={() => { rollDoubleDice(); play('dice'); setIsRandomOpen(false); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-amber-500/10 flex items-center gap-2 transition-colors"
                            >
                                <Dices className="w-4 h-4 text-green-400" /> Roll 2×D6
                            </button>
                            <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-1" />
                            <button
                                onClick={() => { rollPlanarDie(); play('dice'); setIsRandomOpen(false); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-purple-500/10 flex items-center gap-2 text-purple-400 transition-colors"
                            >
                                ⬡ Roll Planar Die
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Center - Random Result Display - Premium */}
            {lastRandomResult && (
                <div className="absolute left-1/2 -translate-x-1/2 px-5 py-2.5 random-result-premium text-black font-bold text-lg">
                    {lastRandomResult.label}
                </div>
            )}

            {/* Right section - Utility Buttons */}
            <div className="flex items-center gap-2">
                {/* Undo/Redo Buttons - Premium */}
                <div className="flex items-center gap-1 counter-premium p-1">
                    <button
                        onClick={undo}
                        disabled={historyPast.length === 0}
                        className="p-2 hover:bg-amber-500/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 className="w-4 h-4 text-gray-300" />
                    </button>
                    <button
                        onClick={redo}
                        disabled={historyFuture.length === 0}
                        className="p-2 hover:bg-amber-500/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <Redo2 className="w-4 h-4 text-gray-300" />
                    </button>
                </div>

                {/* Sound Toggle - Premium */}
                <button
                    onClick={toggleMute}
                    className="p-2 hover:bg-amber-500/10 rounded-lg transition-all counter-premium"
                    title={isMuted ? 'Unmute Sounds' : 'Mute Sounds'}
                >
                    {isMuted ? (
                        <VolumeX className="w-5 h-5 text-gray-400" />
                    ) : (
                        <Volume2 className="w-5 h-5 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    )}
                </button>

                {/* Settings Button - Premium */}
                <button
                    onClick={onOpenSettings}
                    className="p-2 hover:bg-amber-500/10 rounded-lg transition-all counter-premium"
                    title="Settings"
                >
                    <Settings className="w-5 h-5 text-gray-400 hover:text-amber-400 transition-colors" />
                </button>

                {/* Reset Match - Premium */}
                <button
                    onClick={resetMatch}
                    className="relative group flex items-center gap-2 px-3 py-2 rounded-xl transition-all overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.1))',
                        border: '1px solid rgba(251, 191, 36, 0.25)'
                    }}
                    title="Reset Match: Keep deck, reset life/turn, shuffle & draw 7"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <RotateCcw className="w-4 h-4 text-amber-400 relative z-10" />
                    <span className="hidden sm:inline text-amber-400 relative z-10">Reset Match</span>
                </button>

                {/* Change Deck - Premium */}
                <button
                    onClick={returnToMenu}
                    className="relative group flex items-center gap-2 px-3 py-2 rounded-xl transition-all overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))',
                        border: '1px solid rgba(239, 68, 68, 0.25)'
                    }}
                    title="Change Deck: Return to deck import screen"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ArrowLeft className="w-4 h-4 text-red-400 relative z-10" />
                    <span className="hidden sm:inline text-red-400 relative z-10">Change Deck</span>
                </button>
            </div>
        </nav>
    );
}
