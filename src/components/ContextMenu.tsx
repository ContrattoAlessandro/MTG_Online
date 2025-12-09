import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSoundEngine } from '../hooks/useSoundEngine';
import { Zone } from '../types';
import {
    Sword,
    Hand,
    Skull,
    Ban,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    Crown,
    RotateCcw,
    Eye,
    Copy,
    Link,
    Unlink,
} from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    cardId: string;
    currentZone: Zone;
    onClose: () => void;
}

export default function ContextMenu({ x, y, cardId, currentZone, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const { moveCard, toggleTap, setInspectCard, commanderCardId, duplicateCard, startTargeting, detachCard, reorderCardInZone } = useGameStore();
    const card = useGameStore((s) => s.cards.find((c) => c.id === cardId));
    const isOnlineMode = useGameStore((s) => s.isOnlineMode);
    const viewingPlayerId = useGameStore((s) => s.viewingPlayerId);
    const localPlayerId = useGameStore((s) => s.localPlayerId);
    const { play } = useSoundEngine();

    // Block modification actions when viewing another player's board
    const isViewingOtherPlayer = isOnlineMode && viewingPlayerId !== localPlayerId;

    useEffect(() => {
        const handleClick = () => onClose();
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menuRef.current.style.left = `${x - rect.width}px`;
            }
            if (rect.bottom > window.innerHeight) {
                menuRef.current.style.top = `${y - rect.height}px`;
            }
        }
    }, [x, y]);

    const handleInspect = () => {
        if (card) {
            setInspectCard(card.card);
        }
        onClose();
    };

    const isCommander = cardId === commanderCardId;
    const typeLine = (card?.card.type_line || '').toLowerCase();
    const canAttach = (typeLine.includes('equipment') || typeLine.includes('aura') || typeLine.includes('fortification')) && !card?.attachedToId;
    const isAttached = !!card?.attachedToId;

    const menuItems = [
        // Inspect option - always first and always enabled (view-only)
        {
            icon: <Eye className="w-4 h-4" />,
            label: 'Inspect Details',
            action: handleInspect,
            show: true,
            color: 'text-cyan-400',
            isAction: true,
            disabled: false, // Always enabled
        },
        { type: 'divider', show: true },
        // Reorder options (for hand and battlefield)
        {
            icon: <ArrowLeft className="w-4 h-4" />,
            label: 'Move Left',
            action: () => { reorderCardInZone(cardId, 'left'); play('click'); },
            show: currentZone === 'hand' || currentZone === 'battlefield',
            color: 'text-indigo-400',
            disabled: isViewingOtherPlayer,
        },
        {
            icon: <ArrowRight className="w-4 h-4" />,
            label: 'Move Right',
            action: () => { reorderCardInZone(cardId, 'right'); play('click'); },
            show: currentZone === 'hand' || currentZone === 'battlefield',
            color: 'text-indigo-400',
            disabled: isViewingOtherPlayer,
        },
        // Tap/Untap
        {
            icon: <RotateCcw className="w-4 h-4" />,
            label: card?.isTapped ? 'Untap' : 'Tap',
            action: () => { toggleTap(cardId); play('untap'); },
            show: currentZone === 'battlefield',
            color: 'text-blue-400',
            disabled: isViewingOtherPlayer,
        },
        // Duplicate option for battlefield cards
        {
            icon: <Copy className="w-4 h-4" />,
            label: 'Duplicate',
            action: () => { duplicateCard(cardId); play('cardSnap'); },
            show: currentZone === 'battlefield',
            color: 'text-emerald-400',
            disabled: isViewingOtherPlayer,
        },
        // Attachment Actions
        {
            icon: <Link className="w-4 h-4" />,
            label: 'Attach to...',
            action: () => { startTargeting(cardId); },
            show: currentZone === 'battlefield' && canAttach,
            color: 'text-pink-400',
            disabled: isViewingOtherPlayer,
        },
        {
            icon: <Unlink className="w-4 h-4" />,
            label: 'Detach',
            action: () => { detachCard(cardId); play('cardSnap'); },
            show: currentZone === 'battlefield' && isAttached,
            color: 'text-orange-400',
            disabled: isViewingOtherPlayer,
        },
        { type: 'divider', show: currentZone === 'battlefield' },
        // Move options
        {
            icon: <Sword className="w-4 h-4" />,
            label: 'To Battlefield',
            action: () => { moveCard(cardId, 'battlefield'); play('cardSnap'); },
            show: currentZone !== 'battlefield',
            color: 'text-green-400',
            disabled: isViewingOtherPlayer,
        },
        {
            icon: <Hand className="w-4 h-4" />,
            label: 'To Hand',
            action: () => { moveCard(cardId, 'hand'); play('draw'); },
            show: currentZone !== 'hand',
            color: 'text-blue-400',
            disabled: isViewingOtherPlayer,
        },
        {
            icon: <Skull className="w-4 h-4" />,
            label: 'To Graveyard',
            action: () => { moveCard(cardId, 'graveyard'); play('graveyard'); },
            show: currentZone !== 'graveyard',
            color: 'text-gray-400',
            disabled: isViewingOtherPlayer,
        },
        {
            icon: <Ban className="w-4 h-4" />,
            label: 'To Exile',
            action: () => { moveCard(cardId, 'exile'); play('exile'); },
            show: currentZone !== 'exile',
            color: 'text-purple-400',
            disabled: isViewingOtherPlayer,
        },
        { type: 'divider', show: currentZone !== 'library' },
        {
            icon: <ArrowUp className="w-4 h-4" />,
            label: 'Library (Top)',
            action: () => { moveCard(cardId, 'library', 'top'); play('shuffle'); },
            show: currentZone !== 'library',
            color: 'text-amber-400',
            disabled: isViewingOtherPlayer,
        },
        {
            icon: <ArrowDown className="w-4 h-4" />,
            label: 'Library (Bottom)',
            action: () => { moveCard(cardId, 'library', 'bottom'); play('shuffle'); },
            show: currentZone !== 'library',
            color: 'text-amber-400',
            disabled: isViewingOtherPlayer,
        },
        // Commander zone - only for the actual commander
        { type: 'divider', show: isCommander && currentZone !== 'commandZone' },
        {
            icon: <Crown className="w-4 h-4" />,
            label: 'To Command Zone',
            action: () => { moveCard(cardId, 'commandZone'); play('cardSnap'); },
            show: isCommander && currentZone !== 'commandZone',
            color: 'text-yellow-400',
            disabled: isViewingOtherPlayer,
        },
    ];

    const visibleItems = menuItems.filter((item) => item.show !== false);

    return (
        <div
            ref={menuRef}
            className="fixed context-menu-premium py-1 min-w-[180px] z-[1000]"
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
        >
            {card && (
                <div className="px-3 py-2 text-sm font-medium border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🃏</span>
                        <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent truncate">
                            {card.card.name}
                        </span>
                        {isCommander && <span className="text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]">👑</span>}
                    </div>
                </div>
            )}

            {/* Warning when viewing another player */}
            {isViewingOtherPlayer && (
                <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/20">
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Viewing only - Cannot modify
                    </span>
                </div>
            )}

            {/* Attachments Section */}
            {card && card.attachmentIds && card.attachmentIds.length > 0 && (
                <>
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-white/5">
                        Attachments
                    </div>
                    {card.attachmentIds.map(attId => {
                        const att = useGameStore.getState().cards.find(c => c.id === attId);
                        if (!att) return null;
                        return (
                            <button
                                key={att.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isViewingOtherPlayer) return; // Block action
                                    detachCard(att.id);
                                    play('cardSnap');
                                    onClose();
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-red-500/10 transition-all flex items-center justify-between text-gray-300 group ${isViewingOtherPlayer ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={isViewingOtherPlayer}
                            >
                                <span className="truncate max-w-[120px]">{att.card.name}</span>
                                <Unlink className="w-3 h-3 text-red-400 group-hover:drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                            </button>
                        );
                    })}
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-1" />
                </>
            )}

            {visibleItems.map((item, index) =>
                item.type === 'divider' ? (
                    <div key={index} className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-1" />
                ) : (
                    <button
                        key={index}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.disabled) return; // Block action if disabled
                            if (item.action) item.action();
                            if (!item.isAction) onClose();
                        }}
                        className={`w-full px-3 py-2 text-left text-sm transition-all flex items-center gap-2 ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:pl-4'} ${item.color || ''}`}
                        style={{
                            background: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                            if (!item.disabled) {
                                e.currentTarget.style.background = `linear-gradient(90deg, rgba(251, 191, 36, 0.08) 0%, transparent 100%)`;
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                        disabled={item.disabled}
                    >
                        <span className="drop-shadow-[0_0_4px_currentColor]">{item.icon}</span>
                        {item.label}
                    </button>
                )
            )}
        </div>
    );
}
