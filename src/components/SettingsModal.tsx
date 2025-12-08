import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Image, RefreshCcw, Check } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { playmatUrl, setPlaymatUrl } = useSettings();
    const [urlInput, setUrlInput] = useState(playmatUrl || '');
    const [previewError, setPreviewError] = useState(false);
    const [saved, setSaved] = useState(false);

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

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-white/10"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                            >
                                <RefreshCcw className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300">Reset</span>
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
                                <div><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>Del</kbd> → Graveyard</div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
