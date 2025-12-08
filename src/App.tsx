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

    // Loading state - Premium
    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center" style={{
                background: 'radial-gradient(ellipse at center, #12121a 0%, #0a0a0f 100%)'
            }}>
                {/* Floating particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 rounded-full bg-amber-400/30"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animation: `floatParticle ${3 + Math.random() * 2}s ease-in-out infinite`,
                                animationDelay: `${Math.random() * 2}s`
                            }}
                        />
                    ))}
                </div>
                <div className="text-center relative z-10">
                    <div className="w-16 h-16 loading-spinner-premium mx-auto mb-4" />
                    <div className="text-xl bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent font-medium">
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <LayoutGroup>
            <div className="h-screen w-screen flex flex-col overflow-hidden" style={{
                background: 'radial-gradient(ellipse at center, #12121a 0%, #0a0a0f 100%)'
            }}>
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
                <div className="flex flex-1 min-h-0">
                    {/* Left Sidebar - Zones - Premium */}
                    <div className="w-40 sidebar-premium p-3 flex flex-col gap-4 overflow-y-auto overflow-x-visible relative z-30">
                        <CommandZoneBox />
                        <LibraryBox />
                        <GraveyardBox />
                        <ExileBox />

                        {/* Create Token Button - Premium */}
                        <button
                            onClick={() => setIsTokenModalOpen(true)}
                            className="token-btn-premium flex flex-col items-center gap-1 p-2 group"
                        >
                            <Sparkles className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
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
