import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../store/gameStore';
import { useSoundEngine } from '../hooks/useSoundEngine';
import { getCardImageUrl, getCardBackUrl } from '../api/scryfall';
import { Zone, CardInstance } from '../types';
import ContextMenu from './ContextMenu';
import DeckStatsModal from './DeckStatsModal';
import { Crown, BookOpen, Skull, Ban, Search, Shuffle, ArrowDown, Trash2, Eye, EyeOff, ArrowDownToLine, BarChart3 } from 'lucide-react';

interface ZoneBoxProps {
    zone: Zone;
    label: string;
    icon: React.ReactNode;
    borderColor: string;
}

export default function ZoneBox({ zone, label, icon }: ZoneBoxProps) {
    const cards = useGameStore((s) => s.cards);
    const isTopCardRevealed = useGameStore((s) => s.isTopCardRevealed);
    const zoneCards = cards.filter((c) => c.zone === zone);
    const count = zoneCards.length;
    const topCard = zoneCards[0];

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuContainerRef = useRef<HTMLDivElement>(null);

    // Note: Click-outside handling for LibraryMenu is done inside LibraryMenu 
    // component itself since it's portaled to document.body

    // Show card image based on zone and reveal state
    const getPreviewImage = () => {
        if (zone === 'library') {
            // Show card face if revealed and there's a top card
            if (isTopCardRevealed && topCard) {
                return getCardImageUrl(topCard.card, 'small');
            }
            return getCardBackUrl();
        }
        if (topCard) return getCardImageUrl(topCard.card, 'small');
        return null;
    };

    const setInspectCard = useGameStore((s) => s.setInspectCard);
    const moveCard = useGameStore((s) => s.moveCard);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; cardId: string } | null>(null);

    const handleClick = () => {
        if (zone === 'library') {
            setIsMenuOpen(!isMenuOpen);
        } else if (zone === 'commandZone') {
            // Commander: single click = zoom/inspect
            if (topCard) {
                setInspectCard(topCard.card, topCard.id);
            }
        } else {
            // Graveyard/Exile: open modal
            setIsModalOpen(true);
        }
    };

    const handleDoubleClick = () => {
        // Commander: double click = move to battlefield
        if (zone === 'commandZone' && topCard) {
            moveCard(topCard.id, 'battlefield');
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (zone === 'commandZone' && topCard) {
            setContextMenu({ x: e.clientX, y: e.clientY, cardId: topCard.id });
        }
    };

    return (
        <>
            <div ref={menuContainerRef} className="relative zone-container group">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="drop-shadow-[0_0_6px_currentColor] flex-shrink-0">
                        {icon}
                    </div>
                    <span className="text-sm font-medium text-gray-300 truncate">{label}</span>
                    {zone !== 'commandZone' && (
                        <span className="ml-auto text-sm font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent flex-shrink-0">
                            {count}
                        </span>
                    )}
                </div>

                {/* Preview - Premium */}
                <button
                    onClick={handleClick}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={handleContextMenu}
                    className="w-full aspect-[63/88] rounded-lg overflow-hidden bg-gray-900/50 transition-all relative group-hover:ring-2 group-hover:ring-amber-500/30"
                    style={{
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                    }}
                >
                    {getPreviewImage() ? (
                        <>
                            <img
                                src={getPreviewImage()!}
                                alt={label}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                draggable={false}
                            />
                            {/* Shine effect on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-700 pointer-events-none" />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">
                            <div className="drop-shadow-[0_0_8px_currentColor] opacity-50">
                                {icon}
                            </div>
                        </div>
                    )}

                    {/* Revealed indicator for library */}
                    {zone === 'library' && isTopCardRevealed && topCard && (
                        <div className="absolute top-1 right-1 bg-cyan-500 rounded-full p-0.5 shadow-lg shadow-cyan-500/30">
                            <Eye className="w-3 h-3 text-white" />
                        </div>
                    )}
                </button>

                {/* Library Analytics - Land Draw Probability */}
                {zone === 'library' && count > 0 && (
                    <LibraryStats cards={zoneCards} />
                )}

                {/* Library Menu - Portal to body to avoid sidebar clipping */}
                {zone === 'library' && isMenuOpen && createPortal(
                    <LibraryMenu onClose={() => setIsMenuOpen(false)} />,
                    document.body
                )}
            </div>

            {/* Zone Modal - for Graveyard/Exile only - Portal to body to avoid sidebar clipping */}
            {isModalOpen && zone !== 'library' && zone !== 'commandZone' && createPortal(
                <ZoneModal zone={zone} label={label} cards={zoneCards} onClose={() => setIsModalOpen(false)} />,
                document.body
            )}

            {/* Context Menu for Commander - Portal to body to avoid sidebar clipping */}
            {contextMenu && createPortal(
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    cardId={contextMenu.cardId}
                    currentZone={zone}
                    onClose={() => setContextMenu(null)}
                />,
                document.body
            )}
        </>
    );
}

// Library specific menu with reveal/hide and put bottom options
function LibraryMenu({ onClose }: { onClose: () => void }) {
    const { drawCards, shuffleLibrary, millCards, toggleTopCardRevealed, putTopCardToBottom, isTopCardRevealed } = useGameStore();
    const cards = useGameStore((s) => s.cards);
    const libraryCards = cards.filter((c) => c.zone === 'library');
    const libraryCount = libraryCards.length;
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [isScryOpen, setIsScryOpen] = useState(false);
    const [viewTopAmount, setViewTopAmount] = useState('3');
    const [drawAmount, setDrawAmount] = useState('1');
    const [millAmount, setMillAmount] = useState('1');
    const { play } = useSoundEngine();
    const menuRef = useRef<HTMLDivElement>(null);

    // Click-outside handler for closing the menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Small delay to prevent immediate close on the same click that opened the menu
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    if (isStatsOpen) {
        return <DeckStatsModal isOpen={true} onClose={() => { setIsStatsOpen(false); onClose(); }} />;
    }

    if (isSearchOpen) {
        return <LibrarySearchModal onClose={() => { setIsSearchOpen(false); onClose(); }} />;
    }

    if (isScryOpen) {
        return <ScryModal count={parseInt(viewTopAmount) || 3} onClose={() => { setIsScryOpen(false); onClose(); }} />;
    }

    const handleDraw = () => {
        const amount = parseInt(drawAmount) || 1;
        if (amount > 0) {
            drawCards(amount);
            play('draw');
            onClose();
        }
    };

    const handleMill = () => {
        const amount = parseInt(millAmount) || 1;
        if (amount > 0) {
            millCards(amount);
            play('graveyard');
            onClose();
        }
    };

    return (
        <div ref={menuRef} className="fixed left-44 top-20 dropdown-premium py-2 z-[200] min-w-[220px]">
            <button onClick={() => setIsSearchOpen(true)} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-500/10 flex items-center gap-2 text-blue-400 transition-colors">
                <Search className="w-4 h-4 drop-shadow-[0_0_4px_currentColor]" /> Search Library
            </button>
            <button onClick={() => setIsStatsOpen(true)} className="w-full px-3 py-2 text-left text-sm hover:bg-purple-500/10 flex items-center gap-2 text-purple-400 transition-colors">
                <BarChart3 className="w-4 h-4 drop-shadow-[0_0_4px_currentColor]" /> Deck Stats
            </button>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-1" />

            {/* View Top X / Scry */}
            <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-gray-300">View Top</span>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={viewTopAmount}
                        onChange={(e) => setViewTopAmount(e.target.value)}
                        className="w-12 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-center"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
                <button
                    onClick={() => setIsScryOpen(true)}
                    className="w-full px-2 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-sm font-medium"
                    disabled={libraryCount === 0}
                >
                    Scry / View Top Cards
                </button>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-1" />

            {/* Reveal/Hide Top Card */}
            <button
                onClick={() => { toggleTopCardRevealed(); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-cyan-500/10 flex items-center gap-2 text-cyan-400 transition-colors"
                disabled={libraryCount === 0}
            >
                {isTopCardRevealed ? <EyeOff className="w-4 h-4 drop-shadow-[0_0_4px_currentColor]" /> : <Eye className="w-4 h-4 drop-shadow-[0_0_4px_currentColor]" />}
                {isTopCardRevealed ? 'Hide Top Card' : 'Reveal Top Card'}
            </button>

            {/* Put Top Card to Bottom */}
            <button
                onClick={() => { putTopCardToBottom(); onClose(); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-amber-500/10 flex items-center gap-2 text-amber-400 transition-colors"
                disabled={libraryCount < 2}
            >
                <ArrowDownToLine className="w-4 h-4 drop-shadow-[0_0_4px_currentColor]" /> Put Bottom
            </button>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-1" />

            {/* Draw X */}
            <div className="px-3 py-2 flex items-center gap-2">
                <ArrowDown className="w-4 h-4 text-green-400 drop-shadow-[0_0_4px_rgba(34,197,94,0.5)]" />
                <input
                    type="number"
                    min="1"
                    value={drawAmount}
                    onChange={(e) => setDrawAmount(e.target.value)}
                    className="w-12 px-2 py-1 bg-gray-800/80 border border-gray-600 rounded text-sm text-center focus:border-green-500/50"
                    onClick={(e) => e.stopPropagation()}
                />
                <button
                    onClick={handleDraw}
                    className="flex-1 px-2 py-1.5 rounded text-sm font-medium transition-all"
                    style={{
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.9))',
                        boxShadow: '0 0 10px rgba(34, 197, 94, 0.2)'
                    }}
                    disabled={libraryCount === 0}
                >
                    Draw
                </button>
            </div>

            {/* Mill X */}
            <div className="px-3 py-2 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                <input
                    type="number"
                    min="1"
                    value={millAmount}
                    onChange={(e) => setMillAmount(e.target.value)}
                    className="w-12 px-2 py-1 bg-gray-800/80 border border-gray-600 rounded text-sm text-center focus:border-red-500/50"
                    onClick={(e) => e.stopPropagation()}
                />
                <button
                    onClick={handleMill}
                    className="flex-1 px-2 py-1.5 rounded text-sm font-medium transition-all"
                    style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.9))',
                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.2)'
                    }}
                    disabled={libraryCount === 0}
                >
                    Mill
                </button>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-1" />
            <button onClick={() => { shuffleLibrary(); play('shuffle'); onClose(); }} className="w-full px-3 py-2 text-left text-sm hover:bg-amber-500/10 flex items-center gap-2 text-gray-300 transition-colors">
                <Shuffle className="w-4 h-4 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" /> Shuffle
            </button>
        </div>
    );
}

// Library Stats - Land Draw Probability
function LibraryStats({ cards }: { cards: CardInstance[] }) {
    const total = cards.length;
    const landsRemaining = cards.filter(c =>
        c.card.type_line?.toLowerCase().includes('land')
    ).length;
    const probability = total > 0 ? ((landsRemaining / total) * 100).toFixed(1) : '0.0';

    return (
        <div className="mt-1.5 px-1">
            <div className="text-[10px] text-gray-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                    <span className="text-green-400">🌱</span>
                    <span>Land Draw:</span>
                </span>
                <span className="font-mono text-green-400">
                    {probability}% <span className="text-gray-500">({landsRemaining}/{total})</span>
                </span>
            </div>
        </div>
    );
}

import LibrarySearchModal from './LibrarySearchModal';

// Zone Modal for viewing cards
function ZoneModal({ zone, label, cards, onClose }: { zone: Zone; label: string; cards: CardInstance[]; onClose: () => void }) {
    const setInspectCard = useGameStore((s) => s.setInspectCard);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; cardId: string } | null>(null);

    return (
        <div className="fixed inset-0 modal-overlay-premium flex items-center justify-center z-[100]" onClick={onClose}>
            <div
                className="rounded-xl p-6 max-w-4xl max-h-[80vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(12, 12, 18, 0.99) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(251, 191, 36, 0.1)'
                }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                        {label} ({cards.length})
                    </h2>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="p-2 hover:bg-amber-500/10 rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {cards.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">Zone is empty</div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {cards.map((card) => (
                            <div
                                key={card.id}
                                className="relative group cursor-pointer"
                                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, cardId: card.id }); }}
                                onClick={() => setInspectCard(card.card, card.id)}
                            >
                                <img
                                    src={getCardImageUrl(card.card, 'small')}
                                    alt={card.card.name}
                                    className="w-full rounded-lg shadow-lg transition-all group-hover:ring-2 group-hover:ring-amber-500/50 group-hover:scale-105"
                                />
                                <div className="mt-1 text-xs text-gray-400 truncate text-center group-hover:text-amber-300 transition-colors">{card.card.name}</div>
                            </div>
                        ))}
                    </div>
                )}

                {contextMenu && createPortal(
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        cardId={contextMenu.cardId}
                        currentZone={zone}
                        onClose={() => setContextMenu(null)}
                    />,
                    document.body
                )}
            </div>
        </div>
    );
}

// Scry Modal - View and manipulate top X cards of library
function ScryModal({ count, onClose }: { count: number; onClose: () => void }) {
    const cards = useGameStore((s) => s.cards);
    const applyScryChanges = useGameStore((s) => s.applyScryChanges);
    const addLogEntry = useGameStore((s) => s.addLogEntry);
    const libraryCards = cards.filter((c) => c.zone === 'library');
    const initialTopCards = libraryCards.slice(0, count);
    const { play } = useSoundEngine();

    // State to track pending changes
    const [topOrder, setTopOrder] = useState<string[]>(initialTopCards.map(c => c.id));
    const [toBottom, setToBottom] = useState<string[]>([]);
    const [toGraveyard, setToGraveyard] = useState<string[]>([]);
    const [toExile, setToExile] = useState<string[]>([]);

    // Get card data by ID
    const getCardById = (id: string) => initialTopCards.find(c => c.id === id);

    // Cards remaining on top (not moved elsewhere)
    const remainingTop = topOrder.filter(id =>
        !toBottom.includes(id) && !toGraveyard.includes(id) && !toExile.includes(id)
    );

    // Move card left/right in order
    const moveInOrder = (id: string, direction: 'left' | 'right') => {
        const idx = remainingTop.indexOf(id);
        if (idx === -1) return;

        const newIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= remainingTop.length) return;

        const newOrder = [...topOrder];
        const fromIdx = newOrder.indexOf(id);
        const toPlaceId = remainingTop[newIdx];
        const toPlaceIdx = newOrder.indexOf(toPlaceId);

        [newOrder[fromIdx], newOrder[toPlaceIdx]] = [newOrder[toPlaceIdx], newOrder[fromIdx]];
        setTopOrder(newOrder);
    };

    // Action handlers
    const putOnBottom = (id: string) => { setToBottom([...toBottom, id]); play('cardSnap'); };
    const putToGraveyard = (id: string) => { setToGraveyard([...toGraveyard, id]); play('graveyard'); };
    const putToExile = (id: string) => { setToExile([...toExile, id]); play('exile'); };
    const undoAction = (id: string) => {
        setToBottom(toBottom.filter(i => i !== id));
        setToGraveyard(toGraveyard.filter(i => i !== id));
        setToExile(toExile.filter(i => i !== id));
        play('click');
    };

    // Apply all changes
    const handleConfirm = () => {
        applyScryChanges({ newTopOrder: remainingTop, toBottom, toGraveyard, toExile });
        const actions: string[] = [];
        if (remainingTop.length > 0) actions.push(`${remainingTop.length} on top`);
        if (toBottom.length > 0) actions.push(`${toBottom.length} on bottom`);
        if (toGraveyard.length > 0) actions.push(`${toGraveyard.length} to graveyard`);
        if (toExile.length > 0) actions.push(`${toExile.length} to exile`);
        addLogEntry('other', `Scry ${count}: ${actions.join(', ')}`);
        play('shuffle');
        onClose();
    };

    const getImgSrc = (cardData: typeof initialTopCards[0]) =>
        cardData.card.image_uris?.normal || cardData.card.card_faces?.[0]?.image_uris?.normal;

    return (
        <div className="fixed inset-0 modal-overlay-premium flex items-center justify-center z-[300]" onClick={onClose}>
            <div
                className="rounded-xl p-6 max-w-5xl max-h-[85vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(12, 12, 18, 0.99) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(251, 191, 36, 0.1)'
                }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Scry {count}</h2>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="p-2 hover:bg-amber-500/10 rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* Cards on Top */}
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Put on Top (in draw order)</h3>
                    <div className="flex flex-wrap gap-4 justify-center min-h-[200px] rounded-lg p-4" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                        {remainingTop.length === 0 ? (
                            <div className="flex items-center justify-center text-gray-500 italic">All cards assigned to other zones</div>
                        ) : (
                            remainingTop.map((id, index) => {
                                const cardData = getCardById(id);
                                if (!cardData) return null;
                                return (
                                    <div key={id} className="flex flex-col items-center gap-2">
                                        <div className="text-xs text-blue-400 font-medium">Draw #{index + 1}</div>
                                        <div className="relative group">
                                            <img src={getImgSrc(cardData)} alt={cardData.card.name} className="w-28 h-40 rounded-lg object-cover shadow-lg border border-gray-600" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                <span className="text-xs text-white text-center px-1">{cardData.card.name}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => moveInOrder(id, 'left')} disabled={index === 0} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded">←</button>
                                            <button onClick={() => moveInOrder(id, 'right')} disabled={index === remainingTop.length - 1} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded">→</button>
                                        </div>
                                        <div className="flex flex-col gap-1 w-full">
                                            <button onClick={() => putOnBottom(id)} className="w-full px-2 py-1 text-xs bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 rounded">↓ Bottom</button>
                                            <button onClick={() => putToGraveyard(id)} className="w-full px-2 py-1 text-xs bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded">🪦 Graveyard</button>
                                            <button onClick={() => putToExile(id)} className="w-full px-2 py-1 text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded">✦ Exile</button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Pending Actions */}
                {(toBottom.length > 0 || toGraveyard.length > 0 || toExile.length > 0) && (
                    <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Pending Actions:</h4>
                        <div className="flex flex-wrap gap-2">
                            {toBottom.map(id => { const c = getCardById(id); return c && <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600/20 text-amber-300 text-xs rounded">↓ {c.card.name} <button onClick={() => undoAction(id)} className="hover:text-white">✕</button></span>; })}
                            {toGraveyard.map(id => { const c = getCardById(id); return c && <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-red-600/20 text-red-300 text-xs rounded">🪦 {c.card.name} <button onClick={() => undoAction(id)} className="hover:text-white">✕</button></span>; })}
                            {toExile.map(id => { const c = getCardById(id); return c && <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded">✦ {c.card.name} <button onClick={() => undoAction(id)} className="hover:text-white">✕</button></span>; })}
                        </div>
                    </div>
                )}

                {/* Confirm */}
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg">Cancel</button>
                    <button onClick={handleConfirm} className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-medium">Confirm Changes</button>
                </div>
            </div>
        </div>
    );
}

// Pre-configured zone boxes
export function CommandZoneBox() {
    return <ZoneBox zone="commandZone" label="Commander" icon={<Crown className="w-5 h-5 text-yellow-400" />} borderColor="border-yellow-600/50" />;
}

export function LibraryBox() {
    return <ZoneBox zone="library" label="Library" icon={<BookOpen className="w-5 h-5 text-blue-400" />} borderColor="border-blue-600/50" />;
}

export function GraveyardBox() {
    return <ZoneBox zone="graveyard" label="Graveyard" icon={<Skull className="w-5 h-5 text-gray-400" />} borderColor="border-gray-600/50" />;
}

export function ExileBox() {
    return <ZoneBox zone="exile" label="Exile" icon={<Ban className="w-5 h-5 text-purple-400" />} borderColor="border-purple-600/50" />;
}
