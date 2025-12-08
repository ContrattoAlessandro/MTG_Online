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
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-600 w-full max-w-lg"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={handleKeyDown}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                            <Settings className="w-5 h-5 text-blue-400" />
                            <h2 className="text-xl font-bold text-white">Settings</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        {/* Playmat Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Image className="w-4 h-4 text-purple-400" />
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
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />

                            {/* Preview */}
                            {urlInput.trim() && (
                                <div className="mt-3">
                                    <p className="text-xs text-gray-500 mb-2">Preview:</p>
                                    <div className="relative rounded-lg overflow-hidden h-32 bg-gray-700">
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
                                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Reset
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={previewError}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${saved
                                        ? 'bg-green-600 text-white'
                                        : previewError
                                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                                    }`}
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
                        <div className="p-3 bg-gray-700/50 rounded-lg">
                            <p className="text-xs text-gray-400 font-medium mb-2">⌨️ Keyboard Shortcuts</p>
                            <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                                <div><kbd className="px-1.5 py-0.5 bg-gray-600 rounded">D</kbd> Draw card</div>
                                <div><kbd className="px-1.5 py-0.5 bg-gray-600 rounded">Space</kbd> Next turn</div>
                                <div><kbd className="px-1.5 py-0.5 bg-gray-600 rounded">U</kbd> Untap all</div>
                                <div><kbd className="px-1.5 py-0.5 bg-gray-600 rounded">S</kbd> Shuffle</div>
                                <div><kbd className="px-1.5 py-0.5 bg-gray-600 rounded">Del</kbd> → Graveyard</div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
