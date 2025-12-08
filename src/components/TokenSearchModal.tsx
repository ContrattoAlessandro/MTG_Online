import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Sparkles, Loader2 } from 'lucide-react';
import { searchTokens, getCardImageUrl } from '../api/scryfall';
import { useGameStore } from '../store/gameStore';
import { Card } from '../types';

interface TokenSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function TokenSearchModal({ isOpen, onClose }: TokenSearchModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Card[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const createToken = useGameStore((s) => s.createToken);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isOpen) {
            setQuery('');
            setResults([]);
            setHasSearched(false);
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            setHasSearched(true);
            const tokens = await searchTokens(query);
            setResults(tokens);
            setIsLoading(false);
        }, 400);

        return () => clearTimeout(timer);
    }, [query]);

    const handleTokenClick = (card: Card) => {
        createToken(card);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-600 w-full max-w-2xl max-h-[80vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={handleKeyDown}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            <h2 className="text-xl font-bold text-white">Create Token</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search tokens (e.g., Soldier, Treasure, Zombie...)"
                                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            {isLoading && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400 animate-spin" />
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto p-4 pt-0">
                        {results.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {results.map((card) => (
                                    <motion.button
                                        key={card.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ scale: 1.05, zIndex: 10 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleTokenClick(card)}
                                        className="relative group"
                                    >
                                        <img
                                            src={getCardImageUrl(card, 'small')}
                                            alt={card.name}
                                            className="w-full rounded-lg shadow-lg group-hover:ring-2 group-hover:ring-amber-400 transition-all"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-xs text-white font-medium truncate block">
                                                {card.name}
                                            </span>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        ) : hasSearched && !isLoading ? (
                            <div className="text-center text-gray-400 py-8">
                                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No tokens found for "{query}"</p>
                                <p className="text-sm mt-1">Try a different search term</p>
                            </div>
                        ) : !hasSearched ? (
                            <div className="text-center text-gray-500 py-8">
                                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Start typing to search for tokens</p>
                                <p className="text-sm mt-1">Popular: Soldier, Treasure, Zombie, Spirit, Goblin</p>
                            </div>
                        ) : null}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
