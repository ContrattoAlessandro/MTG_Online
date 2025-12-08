import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export default function TargetingOverlay() {
    const { targetingMode } = useGameStore();
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [sourcePos, setSourcePos] = useState<{ x: number; y: number } | null>(null);

    // Track mouse movement
    useEffect(() => {
        if (!targetingMode.active) return;

        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [targetingMode.active]);

    // Find source card position
    useEffect(() => {
        if (targetingMode.active && targetingMode.sourceCardId) {
            // We assume Battlefield assigns ID "card-{id}" to the element
            const element = document.getElementById(`battlefield-card-${targetingMode.sourceCardId}`);
            if (element) {
                const rect = element.getBoundingClientRect();
                setSourcePos({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                });
            }
        }
    }, [targetingMode.active, targetingMode.sourceCardId]);

    if (!targetingMode.active || !sourcePos) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-visible">
            <svg className="w-full h-full">
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#f472b6" />
                    </marker>
                </defs>
                <line
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={mousePos.x}
                    y2={mousePos.y}
                    stroke="#f472b6"
                    strokeWidth="3"
                    strokeDasharray="10 5"
                    markerEnd="url(#arrowhead)"
                    className="animate-pulse"
                />
            </svg>
        </div>
    );
}
