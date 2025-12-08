import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Upload, Shuffle, AlertCircle, Loader2, Crown } from 'lucide-react';

export default function DeckImportModal() {
    const { importDeck, loadDemoDeck, loadRandomDeck, isLoading, error } = useGameStore();
    const [commanderName, setCommanderName] = useState('');
    const [deckText, setDeckText] = useState('');
    const [notFoundCards, setNotFoundCards] = useState<string[]>([]);

    const handleImport = async () => {
        if (!commanderName.trim()) return;
        setNotFoundCards([]);
        const result = await importDeck(commanderName.trim(), deckText);
        if (result.notFound.length > 0) {
            setNotFoundCards(result.notFound);
        }
    };

    const handleDemoClick = async () => {
        setNotFoundCards([]);
        await loadDemoDeck();
    };

    const handleRandomClick = async () => {
        setNotFoundCards([]);
        await loadRandomDeck();
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-amber-500 mb-2">⚔️ MTG Commander Simulator</h1>
                    <p className="text-gray-400">Import your deck to start goldfishing</p>
                </div>

                {/* Commander Input */}
                <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-2">
                        <Crown className="w-4 h-4" />
                        Commander Name (Required)
                    </label>
                    <input
                        type="text"
                        value={commanderName}
                        onChange={(e) => setCommanderName(e.target.value)}
                        placeholder="e.g., Atraxa, Praetors' Voice"
                        className="w-full px-4 py-3 bg-gray-900 border-2 border-amber-600/50 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500"
                        disabled={isLoading}
                    />
                </div>

                {/* Deck Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Deck List (99 cards)
                    </label>
                    <textarea
                        value={deckText}
                        onChange={(e) => setDeckText(e.target.value)}
                        placeholder={`1 Sol Ring\n1 Command Tower\n1 Arcane Signet\n1 Counterspell\n...`}
                        className="w-full h-48 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none font-mono text-sm"
                        disabled={isLoading}
                    />
                </div>

                {/* Not Found Warning */}
                {notFoundCards.length > 0 && (
                    <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-medium">Some cards were not found:</span>
                        </div>
                        <ul className="text-sm text-amber-300 list-disc list-inside max-h-20 overflow-auto">
                            {notFoundCards.slice(0, 5).map((name, i) => (
                                <li key={i}>{name}</li>
                            ))}
                            {notFoundCards.length > 5 && <li>...and {notFoundCards.length - 5} more</li>}
                        </ul>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
                        {error}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleImport}
                        disabled={isLoading || !commanderName.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                    >
                        {isLoading ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Importing...</>
                        ) : (
                            <><Upload className="w-5 h-5" /> Import Deck</>
                        )}
                    </button>

                    <button
                        onClick={handleDemoClick}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
                    >
                        <Crown className="w-5 h-5" /> Demo Deck
                    </button>

                    <button
                        onClick={handleRandomClick}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
                    >
                        <Shuffle className="w-5 h-5" /> Random 100
                    </button>
                </div>

                {/* Format Help */}
                <div className="mt-6 p-4 bg-gray-900/50 rounded-lg text-xs text-gray-500">
                    <strong className="text-gray-400">Format:</strong> <code className="text-green-400">1 Sol Ring</code> or <code className="text-green-400">1x Command Tower</code>
                </div>
            </div>
        </div>
    );
}
