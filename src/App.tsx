import { useState } from 'react';
import { LayoutGroup } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useGameStore } from './store/gameStore';
import TopNav from './components/TopNav';
import Battlefield from './components/Battlefield';
import Hand from './components/Hand';
import ManaPoolWidget from './components/ManaPoolWidget';
import { CommandZoneBox, LibraryBox, GraveyardBox, ExileBox } from './components/ZoneBox';
import DeckImportModal from './components/DeckImportModal';
import CardInspectModal from './components/CardInspectModal';
import TokenSearchModal from './components/TokenSearchModal';
import SettingsModal from './components/SettingsModal';
import MulliganModal from './components/MulliganModal';
import GameLog from './components/GameLog';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
    const { gameStarted, isLoading } = useGameStore();
    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // Global keyboard shortcuts
    useKeyboardShortcuts(hoveredCardId);

    // Show import modal if game hasn't started
    if (!gameStarted) {
        return <DeckImportModal />;
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <div className="text-xl text-gray-300">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <LayoutGroup>
            <div className="h-screen w-screen bg-gray-950 flex flex-col overflow-hidden">
                {/* SVG Filters for Motion Blur Effects */}
                <svg className="absolute w-0 h-0" aria-hidden="true">
                    <defs>
                        {/* Vertical motion blur for cards flying up */}
                        <filter id="motion-blur-v" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="0,8" />
                        </filter>
                        {/* Horizontal motion blur */}
                        <filter id="motion-blur-h" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="8,0" />
                        </filter>
                        {/* Glow effect filter */}
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                </svg>

                {/* Top Navigation */}
                <TopNav onOpenSettings={() => setIsSettingsModalOpen(true)} />

                {/* Main Content - Left Sidebar + Battlefield */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar - Zones */}
                    <div className="w-32 bg-gray-900/50 border-r border-gray-700 p-2 flex flex-col gap-3 overflow-y-auto">
                        <CommandZoneBox />
                        <LibraryBox />
                        <GraveyardBox />
                        <ExileBox />

                        {/* Create Token Button */}
                        <button
                            onClick={() => setIsTokenModalOpen(true)}
                            className="flex flex-col items-center gap-1 p-2 bg-gradient-to-br from-amber-600/20 to-amber-700/10 hover:from-amber-500/30 hover:to-amber-600/20 border border-amber-500/30 rounded-lg transition-all group"
                        >
                            <Sparkles className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                            <span className="text-xs text-amber-300 font-medium">Token</span>
                        </button>
                    </div>

                    {/* Center - Battlefield (takes remaining space) */}
                    <div className="flex-1 overflow-hidden">
                        <Battlefield onHoverCard={setHoveredCardId} />
                    </div>
                </div>

                {/* Hand - Fixed at Bottom (overlays battlefield) */}
                <Hand />

                {/* Mana Pool Widget - Fixed at Bottom Left */}
                <ManaPoolWidget />

                {/* Game Log - Fixed Bottom Left */}
                <GameLog />

                {/* Card Inspect Modal - with shared layout animations */}
                <CardInspectModal />

                {/* Token Search Modal */}
                <TokenSearchModal
                    isOpen={isTokenModalOpen}
                    onClose={() => setIsTokenModalOpen(false)}
                />

                {/* Settings Modal */}
                <SettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                />

                {/* Mulligan Phase Modal */}
                <MulliganModal />
            </div>
        </LayoutGroup>
    );
}
