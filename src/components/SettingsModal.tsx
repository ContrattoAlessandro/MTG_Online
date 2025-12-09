import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Image, RefreshCcw, Check } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useSettings } from '../hooks/useSettings';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { playmatUrl, setPlaymatUrl } = useSettings();
    const { importDeck, loadDemoDeck, isLoading } = useGameStore();

    const [urlInput, setUrlInput] = useState(playmatUrl || '');
    const [previewError, setPreviewError] = useState(false);
    const [saved, setSaved] = useState(false);

    // Deck Import State
    const [showDeckImport, setShowDeckImport] = useState(false);
    const [commanderName, setCommanderName] = useState('');
    const [deckList, setDeckList] = useState('');
    const [importError, setImportError] = useState<string | null>(null);

    // Sync input with stored value when modal opens
    useEffect(() => {
        if (isOpen) {
            setUrlInput(playmatUrl || '');
            setPreviewError(false);
            setSaved(false);
        }
    }, [isOpen, playmatUrl]);

    const handleSave = () => {
        const trimmedUrl = urlInput.trim();
        setPlaymatUrl(trimmedUrl || null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleReset = () => {
        setUrlInput('');
        setPlaymatUrl(null);
        setPreviewError(false);
    };

    const handleImportDeck = async () => {
        setImportError(null);
        const result = await importDeck(commanderName.trim(), deckList);
        if (!result.success && result.notFound) {
            setImportError(`Cards not found: ${result.notFound.join(', ')}`);
        } else if (!result.success) {
            setImportError('Failed to import deck.');
        } else {
            setShowDeckImport(false);
            setCommanderName('');
            setDeckList('');
            onClose(); // Close modal on success
        }
    };

    const handleLoadDemo = async () => {
        setImportError(null);
        await loadDemoDeck();
        setShowDeckImport(false);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter' && urlInput.trim()) {
            handleSave();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 modal-overlay-premium z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="rounded-xl shadow-2xl w-full max-w-lg"
                    style={{
                        background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(12, 12, 18, 0.99) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(251, 191, 36, 0.1)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={handleKeyDown}
                >
                    {/* Header - Premium */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Settings className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                            <h2 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Settings</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-amber-500/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        {/* Playmat Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Image className="w-4 h-4 text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]" />
                                <label className="text-sm font-medium text-gray-300">
                                    Custom Playmat
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">
                                Paste an image URL to customize your battlefield background.
                            </p>

                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => {
                                    setUrlInput(e.target.value);
                                    setPreviewError(false);
                                    setSaved(false);
                                }}
                                placeholder="https://example.com/playmat.jpg"
                                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                                style={{
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                            />

                            {/* Preview */}
                            {urlInput.trim() && (
                                <div className="mt-3">
                                    <p className="text-xs text-gray-500 mb-2">Preview:</p>
                                    <div className="relative rounded-lg overflow-hidden h-32" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                                        {!previewError ? (
                                            <img
                                                src={urlInput}
                                                alt="Playmat preview"
                                                className="w-full h-full object-cover"
                                                onError={() => setPreviewError(true)}
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">
                                                Failed to load image
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Deck Management Section */}
                        <div className="pt-2 border-t border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-gray-300">Deck Management</span>
                            </div>

                            {!showDeckImport ? (
                                <button
                                    onClick={() => setShowDeckImport(true)}
                                    className="w-full px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    Import / Replace Deck
                                </button>
                            ) : (
                                <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/5">
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="text-xs font-semibold text-gray-400">Import Deck for Current Player</h3>
                                        <button onClick={() => setShowDeckImport(false)} className="text-xs text-gray-500 hover:text-white">Cancel</button>
                                    </div>

                                    <input
                                        type="text"
                                        value={commanderName}
                                        onChange={(e) => setCommanderName(e.target.value)}
                                        placeholder="Commander Name"
                                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-amber-500"
                                    />

                                    <textarea
                                        value={deckList}
                                        onChange={(e) => setDeckList(e.target.value)}
                                        placeholder="Paste decklist here..."
                                        className="w-full h-32 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none font-mono"
                                    />

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleImportDeck}
                                            disabled={!commanderName.trim() || isLoading}
                                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-white font-medium transition-colors"
                                        >
                                            {isLoading ? 'Importing...' : 'Import Deck'}
                                        </button>
                                        <button
                                            onClick={handleLoadDemo}
                                            disabled={isLoading}
                                            className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded text-sm text-white font-medium transition-colors"
                                        >
                                            Demo
                                        </button>
                                    </div>
                                    {importError && <p className="text-xs text-red-400 mt-1">{importError}</p>}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-white/10">
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-white/10"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                            >
                                <RefreshCcw className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300">Reset Actions</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={previewError}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${previewError ? 'cursor-not-allowed opacity-50' : ''
                                    }`}
                                style={{
                                    background: saved
                                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(22, 163, 74, 0.9))'
                                        : 'linear-gradient(135deg, rgba(251, 191, 36, 0.9), rgba(245, 158, 11, 0.9))',
                                    boxShadow: saved
                                        ? '0 0 20px rgba(34, 197, 94, 0.3)'
                                        : '0 0 20px rgba(251, 191, 36, 0.3)',
                                    color: '#1a1a1a'
                                }}
                            >
                                {saved ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Saved!
                                    </>
                                ) : (
                                    'Apply Playmat'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Keyboard Shortcuts Info */}
                    <div className="px-4 pb-4">
                        <div className="p-3 rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                            <p className="text-xs text-gray-400 font-medium mb-2">⌨️ Keyboard Shortcuts</p>
                            <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                                <div><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>D</kbd> Draw card</div>
                                <div><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>Space</kbd> Next turn</div>
                                <div><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>U</kbd> Untap all</div>
                                <div><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>S</kbd> Shuffle</div>
                                <div className="col-span-2 mt-2 font-medium text-gray-400">On Hover:</div>
                                <div><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>P / Enter</kbd> Play</div>
                                <div><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>T</kbd> Tap / Untap</div>
                                <div><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>G</kbd> Graveyard</div>
                                <div><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>E / X</kbd> Exile</div>
                                <div><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>←</kbd> Move Left</div>
                                <div><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>→</kbd> Move Right</div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
