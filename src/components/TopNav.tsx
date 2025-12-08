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
        <nav className="h-16 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 z-50 relative">
            {/* Left section - Logo & Stats */}
            <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="text-xl font-bold text-amber-500 tracking-wide hidden sm:block">
                    ⚔️ MTG SIMULATOR
                </div>

                {/* Life Counter */}
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1">
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                    <button
                        onClick={() => { adjustLife(-1); play('click'); }}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 text-red-400 font-bold"
                    >
                        −
                    </button>
                    <span className="text-2xl font-bold min-w-[2.5rem] text-center">{life}</span>
                    <button
                        onClick={() => { adjustLife(1); play('click'); }}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 text-green-400 font-bold"
                    >
                        +
                    </button>
                </div>

                {/* Turn Counter */}
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1">
                    <span className="text-gray-400 text-sm">Turn</span>
                    <span className="text-xl font-bold text-blue-400">{turn}</span>
                </div>

                {/* Next Turn Button */}
                <button
                    onClick={nextTurn}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
                    title="Next Turn: Untap all, Draw 1"
                >
                    <SkipForward className="w-4 h-4" />
                    <span className="hidden md:inline">Next Turn</span>
                </button>

                {/* Counters Dropdown */}
                <div className="relative" ref={countersRef}>
                    <button
                        onClick={() => setIsCountersOpen(!isCountersOpen)}
                        className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <span>Counters</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isCountersOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isCountersOpen && (
                        <div className="absolute top-full mt-2 left-0 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 min-w-[220px] z-50">
                            <div className="space-y-2">
                                {(Object.keys(COUNTER_CONFIG) as Array<keyof Counters>).map((key) => (
                                    <div key={key} className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-gray-300">
                                            {COUNTER_CONFIG[key].icon}
                                            <span className="text-sm">{COUNTER_CONFIG[key].label}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => adjustCounter(key, -1)}
                                                className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-sm"
                                            >
                                                −
                                            </button>
                                            <span className="w-6 text-center font-bold text-sm">{counters[key]}</span>
                                            <button
                                                onClick={() => adjustCounter(key, 1)}
                                                className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-sm"
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

                {/* Randomizers Dropdown */}
                <div className="relative" ref={randomRef}>
                    <button
                        onClick={() => setIsRandomOpen(!isRandomOpen)}
                        className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <Dices className="w-4 h-4" />
                        <span className="hidden sm:inline">Randomizers</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isRandomOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isRandomOpen && (
                        <div className="absolute top-full mt-2 left-0 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-2 min-w-[160px] z-50">
                            <button
                                onClick={() => { flipCoin(); play('coin'); setIsRandomOpen(false); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                            >
                                <Coins className="w-4 h-4" /> Flip Coin
                            </button>
                            <div className="h-px bg-gray-600 my-1" />
                            {[4, 6, 8, 12, 20].map((sides) => (
                                <button
                                    key={sides}
                                    onClick={() => { rollDie(sides); play('dice'); setIsRandomOpen(false); }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                                >
                                    <Dices className="w-4 h-4" /> Roll D{sides}
                                </button>
                            ))}
                            <button
                                onClick={() => { rollDoubleDice(); play('dice'); setIsRandomOpen(false); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                            >
                                <Dices className="w-4 h-4" /> Roll 2×D6
                            </button>
                            <div className="h-px bg-gray-600 my-1" />
                            <button
                                onClick={() => { rollPlanarDie(); play('dice'); setIsRandomOpen(false); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-purple-400"
                            >
                                ⬡ Roll Planar Die
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Center - Random Result Display */}
            {lastRandomResult && (
                <div className="absolute left-1/2 -translate-x-1/2 px-4 py-2 bg-amber-500 text-black font-bold rounded-lg animate-pulse shadow-lg">
                    {lastRandomResult.label}
                </div>
            )}

            {/* Right section - Utility Buttons */}
            <div className="flex items-center gap-2">
                {/* Undo/Redo Buttons */}
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                    <button
                        onClick={undo}
                        disabled={historyPast.length === 0}
                        className="p-2 hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 className="w-4 h-4 text-gray-300" />
                    </button>
                    <button
                        onClick={redo}
                        disabled={historyFuture.length === 0}
                        className="p-2 hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <Redo2 className="w-4 h-4 text-gray-300" />
                    </button>
                </div>

                {/* Sound Toggle */}
                <button
                    onClick={toggleMute}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title={isMuted ? 'Unmute Sounds' : 'Mute Sounds'}
                >
                    {isMuted ? (
                        <VolumeX className="w-5 h-5 text-gray-400" />
                    ) : (
                        <Volume2 className="w-5 h-5 text-green-400" />
                    )}
                </button>

                {/* Settings Button */}
                <button
                    onClick={onOpenSettings}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Settings"
                >
                    <Settings className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>

                <button
                    onClick={resetMatch}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 rounded-lg transition-colors"
                    title="Reset Match: Keep deck, reset life/turn, shuffle & draw 7"
                >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Reset Match</span>
                </button>
                <button
                    onClick={returnToMenu}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors"
                    title="Change Deck: Return to deck import screen"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Change Deck</span>
                </button>
            </div>
        </nav>
    );
}
