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
    const { moveCard, toggleTap, setInspectCard, commanderCardId, duplicateCard, startTargeting, detachCard } = useGameStore();
    const card = useGameStore((s) => s.cards.find((c) => c.id === cardId));
    const { play } = useSoundEngine();

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
        // Inspect option - always first
        {
            icon: <Eye className="w-4 h-4" />,
            label: 'Inspect Details',
            action: handleInspect,
            show: true,
            color: 'text-cyan-400',
            isAction: true,
        },
        { type: 'divider', show: true },
        // Tap/Untap
        {
            icon: <RotateCcw className="w-4 h-4" />,
            label: card?.isTapped ? 'Untap' : 'Tap',
            action: () => { toggleTap(cardId); play('untap'); },
            show: currentZone === 'battlefield',
            color: 'text-blue-400',
        },
        // Duplicate option for battlefield cards
        {
            icon: <Copy className="w-4 h-4" />,
            label: 'Duplicate',
            action: () => { duplicateCard(cardId); play('cardSnap'); },
            show: currentZone === 'battlefield',
            color: 'text-emerald-400',
        },
        // Attachment Actions
        {
            icon: <Link className="w-4 h-4" />,
            label: 'Attach to...',
            action: () => { startTargeting(cardId); },
            show: currentZone === 'battlefield' && canAttach,
            color: 'text-pink-400',
        },
        {
            icon: <Unlink className="w-4 h-4" />,
            label: 'Detach',
            action: () => { detachCard(cardId); play('cardSnap'); },
            show: currentZone === 'battlefield' && isAttached,
            color: 'text-orange-400',
        },
        { type: 'divider', show: currentZone === 'battlefield' },
        // Move options
        {
            icon: <Sword className="w-4 h-4" />,
            label: 'To Battlefield',
            action: () => { moveCard(cardId, 'battlefield'); play('cardSnap'); },
            show: currentZone !== 'battlefield',
            color: 'text-green-400',
        },
        {
            icon: <Hand className="w-4 h-4" />,
            label: 'To Hand',
            action: () => { moveCard(cardId, 'hand'); play('draw'); },
            show: currentZone !== 'hand',
            color: 'text-blue-400',
        },
        {
            icon: <Skull className="w-4 h-4" />,
            label: 'To Graveyard',
            action: () => { moveCard(cardId, 'graveyard'); play('graveyard'); },
            show: currentZone !== 'graveyard',
            color: 'text-gray-400',
        },
        {
            icon: <Ban className="w-4 h-4" />,
            label: 'To Exile',
            action: () => { moveCard(cardId, 'exile'); play('exile'); },
            show: currentZone !== 'exile',
            color: 'text-purple-400',
        },
        { type: 'divider', show: currentZone !== 'library' },
        {
            icon: <ArrowUp className="w-4 h-4" />,
            label: 'Library (Top)',
            action: () => { moveCard(cardId, 'library', 'top'); play('shuffle'); },
            show: currentZone !== 'library',
            color: 'text-amber-400',
        },
        {
            icon: <ArrowDown className="w-4 h-4" />,
            label: 'Library (Bottom)',
            action: () => { moveCard(cardId, 'library', 'bottom'); play('shuffle'); },
            show: currentZone !== 'library',
            color: 'text-amber-400',
        },
        // Commander zone - only for the actual commander
        { type: 'divider', show: isCommander && currentZone !== 'commandZone' },
        {
            icon: <Crown className="w-4 h-4" />,
            label: 'To Command Zone',
            action: () => { moveCard(cardId, 'commandZone'); play('cardSnap'); },
            show: isCommander && currentZone !== 'commandZone',
            color: 'text-yellow-400',
        },
    ];

    const visibleItems = menuItems.filter((item) => item.show !== false);

    return (
        <div
            ref={menuRef}
            className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-2xl py-1 min-w-[180px] z-[1000]"
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
        >
            {card && (
                <div className="px-3 py-2 text-sm font-medium text-amber-500 border-b border-gray-600 truncate">
                    🃏 {card.card.name}
                    {isCommander && <span className="ml-2 text-yellow-400">👑</span>}
                </div>
            )}

            {/* Attachments Section */}
            {card && card.attachmentIds && card.attachmentIds.length > 0 && (
                <>
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-900/50">
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
                                    detachCard(att.id);
                                    play('cardSnap');
                                    // Keep menu open? No, standard behavior is close
                                    onClose();
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors flex items-center justify-between text-gray-300"
                            >
                                <span className="truncate max-w-[120px]">{att.card.name}</span>
                                <Unlink className="w-3 h-3 text-red-400" />
                            </button>
                        );
                    })}
                    <div className="h-px bg-gray-600 my-1" />
                </>
            )}

            {visibleItems.map((item, index) =>
                item.type === 'divider' ? (
                    <div key={index} className="h-px bg-gray-600 my-1" />
                ) : (
                    <button
                        key={index}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.action) item.action();
                            if (!item.isAction) onClose();
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 ${item.color || ''}`}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                )
            )}
        </div>
    );
}
