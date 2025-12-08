import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { X } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';

interface DeckStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Color mapping for mana colors
const MANA_COLORS: Record<string, string> = {
    W: '#F9FAF4', // White
    U: '#0E68AB', // Blue
    B: '#150B00', // Black
    R: '#D3202A', // Red
    G: '#00733E', // Green
    C: '#CAC5C0', // Colorless
};

const MANA_LABELS: Record<string, string> = {
    W: 'White',
    U: 'Blue',
    B: 'Black',
    R: 'Red',
    G: 'Green',
    C: 'Colorless',
};

// Parse CMC from mana cost string like "{2}{U}{U}"
function parseCMC(manaCost?: string): number {
    if (!manaCost) return 0;
    let cmc = 0;
    const matches = manaCost.match(/\{([^}]+)\}/g) || [];
    for (const match of matches) {
        const symbol = match.replace(/[{}]/g, '');
        const num = parseInt(symbol);
        if (!isNaN(num)) {
            cmc += num;
        } else if (['W', 'U', 'B', 'R', 'G', 'C'].includes(symbol)) {
            cmc += 1;
        } else if (symbol.includes('/')) {
            // Hybrid mana counts as 1
            cmc += 1;
        } else if (symbol === 'X') {
            // X costs as 0
        } else {
            cmc += 1; // Other symbols like Phyrexian
        }
    }
    return cmc;
}

// Parse color symbols from mana cost
function parseColorSymbols(manaCost?: string): Record<string, number> {
    const colors: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    if (!manaCost) return colors;

    const matches = manaCost.match(/\{([^}]+)\}/g) || [];
    for (const match of matches) {
        const symbol = match.replace(/[{}]/g, '');
        if (['W', 'U', 'B', 'R', 'G'].includes(symbol)) {
            colors[symbol]++;
        } else if (!isNaN(parseInt(symbol)) && parseInt(symbol) > 0) {
            colors.C += parseInt(symbol);
        } else if (symbol === 'C') {
            colors.C++;
        }
    }
    return colors;
}

// Parse card type from type_line
function parseCardType(typeLine: string): string {
    const lower = typeLine.toLowerCase();
    if (lower.includes('creature')) return 'Creature';
    if (lower.includes('land')) return 'Land';
    if (lower.includes('instant')) return 'Instant';
    if (lower.includes('sorcery')) return 'Sorcery';
    if (lower.includes('enchantment')) return 'Enchantment';
    if (lower.includes('artifact')) return 'Artifact';
    if (lower.includes('planeswalker')) return 'Planeswalker';
    return 'Other';
}

export default function DeckStatsModal({ isOpen, onClose }: DeckStatsModalProps) {
    const cards = useGameStore((s) => s.cards);

    // All deck cards (library + hand + battlefield + graveyard + exile, excluding commander)
    const commanderCardId = useGameStore((s) => s.commanderCardId);
    const deckCards = useMemo(() =>
        cards.filter(c => c.id !== commanderCardId && !c.isToken),
        [cards, commanderCardId]
    );

    // Mana Curve data
    const manaCurveData = useMemo(() => {
        const cmcCounts: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6+': 0 };

        deckCards.forEach(c => {
            // Skip lands
            if (c.card.type_line?.toLowerCase().includes('land')) return;

            const cmc = parseCMC(c.card.mana_cost);
            if (cmc >= 6) {
                cmcCounts['6+']++;
            } else {
                cmcCounts[cmc.toString()]++;
            }
        });

        return Object.entries(cmcCounts).map(([cmc, count]) => ({
            cmc,
            count,
        }));
    }, [deckCards]);

    // Color Distribution data
    const colorDistributionData = useMemo(() => {
        const colorTotals: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

        deckCards.forEach(c => {
            const colors = parseColorSymbols(c.card.mana_cost);
            Object.entries(colors).forEach(([color, count]) => {
                colorTotals[color] += count;
            });
        });

        return Object.entries(colorTotals)
            .filter(([, count]) => count > 0)
            .map(([color, count]) => ({
                name: MANA_LABELS[color],
                value: count,
                color: MANA_COLORS[color],
            }));
    }, [deckCards]);

    // Type Breakdown data
    const typeBreakdownData = useMemo(() => {
        const typeCounts: Record<string, number> = {};

        deckCards.forEach(c => {
            const type = parseCardType(c.card.type_line || 'Unknown');
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        return Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => ({ type, count }));
    }, [deckCards]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">📊 Deck Statistics</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="text-sm text-gray-400 mb-6">
                    Analyzing {deckCards.length} cards (excluding commander and tokens)
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Mana Curve */}
                    <div className="bg-gray-800/50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Mana Curve</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={manaCurveData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis
                                        dataKey="cmc"
                                        stroke="#9CA3AF"
                                        tick={{ fill: '#9CA3AF' }}
                                    />
                                    <YAxis
                                        stroke="#9CA3AF"
                                        tick={{ fill: '#9CA3AF' }}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1F2937',
                                            border: '1px solid #374151',
                                            borderRadius: '8px',
                                        }}
                                        itemStyle={{ color: '#E5E7EB' }}
                                        labelStyle={{ color: '#9CA3AF' }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill="#3B82F6"
                                        radius={[4, 4, 0, 0]}
                                        name="Cards"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Color Distribution */}
                    <div className="bg-gray-800/50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Color Distribution</h3>
                        <div className="h-64">
                            {colorDistributionData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={colorDistributionData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={70}
                                            dataKey="value"
                                            label={({ percent }: { percent?: number }) =>
                                                `${((percent || 0) * 100).toFixed(0)}%`
                                            }
                                            labelLine={{ stroke: '#6B7280' }}
                                        >
                                            {colorDistributionData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.color}
                                                    stroke="#1F2937"
                                                    strokeWidth={2}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1F2937',
                                                border: '1px solid #374151',
                                                borderRadius: '8px',
                                            }}
                                            itemStyle={{ color: '#E5E7EB' }}
                                        />
                                        <Legend
                                            wrapperStyle={{ color: '#9CA3AF' }}
                                            formatter={(value) => <span className="text-gray-300">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500">
                                    No color data available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Type Breakdown */}
                <div className="mt-6 bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Type Breakdown</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {typeBreakdownData.map(({ type, count }) => (
                            <div
                                key={type}
                                className="bg-gray-700/50 rounded-lg p-3 flex justify-between items-center"
                            >
                                <span className="text-gray-300">{type}</span>
                                <span className="text-blue-400 font-bold">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Close button */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
