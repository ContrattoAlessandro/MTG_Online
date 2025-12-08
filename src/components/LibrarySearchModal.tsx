import { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { getCardImageUrl } from '../api/scryfall';
import { X, Search, Sword, Hand, Skull, Ban, ArrowUp, ArrowDown } from 'lucide-react';
import { Zone } from '../types';
import { useSoundEngine } from '../hooks/useSoundEngine';

interface LibrarySearchModalProps {
    onClose: () => void;
}

export default function LibrarySearchModal({ onClose }: LibrarySearchModalProps) {
    const cards = useGameStore((s) => s.cards);
    const libraryCards = cards.filter((c) => c.zone === 'library');
    const moveCard = useGameStore((s) => s.moveCard);
    const shuffleLibrary = useGameStore((s) => s.shuffleLibrary);
    const setInspectCard = useGameStore((s) => s.setInspectCard);
    const { play } = useSoundEngine();

    const [searchQuery, setSearchQuery] = useState('');

    const filteredCards = useMemo(() => {
        if (!searchQuery.trim()) return libraryCards;
        const query = searchQuery.toLowerCase();
        return libraryCards.filter(
            (card) =>
                card.card.name.toLowerCase().includes(query) ||
                card.card.type_line?.toLowerCase().includes(query) ||
                card.card.oracle_text?.toLowerCase().includes(query)
        );
    }, [libraryCards, searchQuery]);

    const handleMove = (cardId: string, zone: Zone, position?: 'top' | 'bottom') => {
        // If moving to hand from library search, add specific log
        if (zone === 'hand') {
            const card = cards.find(c => c.id === cardId);
            if (card) {
                // We access the store directly to add log entry since we're inside a component
                useGameStore.getState().addLogEntry('draw', `"${card.card.name}" put into hand from library`);
            }
            play('draw');
        } else if (zone === 'graveyard') {
            play('graveyard');
        } else if (zone === 'exile') {
            play('exile');
        } else if (zone === 'library') {
            play('shuffle');
        } else if (zone === 'battlefield') {
            play('cardSnap');
        }

        moveCard(cardId, zone, position);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={onClose}>
            <div
                className="bg-gray-900 border border-gray-700 rounded-xl w-[95vw] h-[90vh] max-w-6xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold">
                            📚 Library ({libraryCards.length})
                        </h2>
                        <button onClick={shuffleLibrary} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm">
                            Shuffle
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, type, or text..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {filteredCards.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">
                            {searchQuery ? 'No cards match' : 'Library empty'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filteredCards.map((card, index) => (
                                <div key={card.id} className="group relative">
                                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold z-10">
                                        {index + 1}
                                    </div>

                                    <img
                                        src={getCardImageUrl(card.card, 'small')}
                                        alt={card.card.name}
                                        className="w-full rounded-lg shadow-lg cursor-pointer hover:ring-2 hover:ring-cyan-400"
                                        loading="lazy"
                                        onClick={() => setInspectCard(card.card)}
                                    />

                                    <div className="mt-1 text-xs text-gray-400 truncate text-center">
                                        {card.card.name}
                                    </div>

                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-1 p-2">
                                        <button onClick={() => handleMove(card.id, 'battlefield')} className="w-full py-1 px-2 bg-green-600 hover:bg-green-500 rounded text-xs flex items-center justify-center gap-1">
                                            <Sword className="w-3 h-3" /> Battlefield
                                        </button>
                                        <button onClick={() => handleMove(card.id, 'hand')} className="w-full py-1 px-2 bg-blue-600 hover:bg-blue-500 rounded text-xs flex items-center justify-center gap-1">
                                            <Hand className="w-3 h-3" /> Hand
                                        </button>
                                        <button onClick={() => handleMove(card.id, 'graveyard')} className="w-full py-1 px-2 bg-gray-600 hover:bg-gray-500 rounded text-xs flex items-center justify-center gap-1">
                                            <Skull className="w-3 h-3" /> Graveyard
                                        </button>
                                        <button onClick={() => handleMove(card.id, 'exile')} className="w-full py-1 px-2 bg-purple-600 hover:bg-purple-500 rounded text-xs flex items-center justify-center gap-1">
                                            <Ban className="w-3 h-3" /> Exile
                                        </button>
                                        <div className="flex gap-1 w-full">
                                            <button onClick={() => handleMove(card.id, 'library', 'top')} className="flex-1 py-1 px-2 bg-amber-600 hover:bg-amber-500 rounded text-xs flex items-center justify-center gap-1">
                                                <ArrowUp className="w-3 h-3" /> Top
                                            </button>
                                            <button onClick={() => handleMove(card.id, 'library', 'bottom')} className="flex-1 py-1 px-2 bg-amber-600 hover:bg-amber-500 rounded text-xs flex items-center justify-center gap-1">
                                                <ArrowDown className="w-3 h-3" /> Bottom
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-gray-700 text-center text-gray-500 text-sm">
                    Click card to inspect • Hover for actions • ESC to close
                </div>
            </div>
        </div>
    );
}
