import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Smile, Frown, Meh, MessageSquare, BrainCircuit, DollarSign, Users } from 'lucide-react';

// 24-hour activity mock data
const HEATMAP = [2, 1, 0, 0, 0, 1, 3, 8, 15, 22, 28, 31, 26, 19, 24, 30, 35, 42, 39, 27, 18, 12, 7, 4];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_DATA = [45, 62, 78, 55, 90, 120, 88]; // Messages per day last 7 days

const UNANSWERED = [
    { query: 'How do I get the verified role?', count: 3, timestamp: '14:22' },
    { query: 'When is the next community event?', count: 2, timestamp: '13:45' },
    { query: 'Can you explain the points system?', count: 2, timestamp: '12:10' },
    { query: 'Why was my message deleted?', count: 1, timestamp: '11:30' },
];

function MiniBar({ value, max, color = '#22c55e' }) {
    const pct = Math.round((value / max) * 100);
    return (
        <div className="h-1 w-full bg-black/60 rounded-none overflow-hidden">
            <div style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 4px ${color}` }} className="h-full transition-all" />
        </div>
    );
}

export default function Analytics() {
    const [period, setPeriod] = useState('today');

    const maxHeat = Math.max(...HEATMAP);
    const peakHour = HEATMAP.indexOf(maxHeat);
    const totalToday = HEATMAP.reduce((a, b) => a + b, 0);
    const sentiment = { positive: 142, neutral: 87, negative: 23 };
    const sentimentTotal = sentiment.positive + sentiment.neutral + sentiment.negative;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold glow-text uppercase tracking-widest">🦉 Analytics</h2>
                    <p className="text-primary-500/60 text-sm mt-1 uppercase tracking-wider">
                        Community health · Owl intelligence layer
                    </p>
                </div>
                <div className="flex gap-2">
                    {['today', '7d', '30d'].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1 text-xs uppercase tracking-wider border transition-all ${period === p
                                    ? 'bg-primary-500/20 border-primary-500/60 text-primary-400'
                                    : 'border-primary-500/20 text-primary-500/50 hover:border-primary-500/40'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Messages Today', value: totalToday, icon: MessageSquare, color: 'text-primary-400', sub: '+12% vs yesterday' },
                    { label: 'AI Responses', value: 38, icon: BrainCircuit, color: 'text-cyan-400', sub: '4 Pro · 34 Flash' },
                    { label: 'Est. Cost Today', value: '$0.08', icon: DollarSign, color: 'text-green-400', sub: '$0.003 avg/message' },
                    { label: 'Active Members', value: 24, icon: Users, color: 'text-purple-400', sub: '18% of total' },
                ].map(({ label, value, icon: Icon, color, sub }) => (
                    <div key={label} className="glow-border bg-black/40 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon className={`w-4 h-4 ${color}`} />
                            <p className="text-xs uppercase tracking-widest text-primary-500/50">{label}</p>
                        </div>
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-primary-500/30 mt-1 uppercase tracking-wider">{sub}</p>
                    </div>
                ))}
            </div>

            {/* Activity Heatmap */}
            <div className="glow-border bg-black/40 p-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs uppercase tracking-widest text-primary-500/50">Hourly Activity (Today)</p>
                    <p className="text-xs text-primary-400 uppercase">Peak: {peakHour}:00 — {maxHeat} msgs</p>
                </div>
                <div className="flex items-end gap-1 h-20">
                    {HEATMAP.map((val, h) => {
                        const pct = maxHeat > 0 ? (val / maxHeat) : 0;
                        const isNow = h === new Date().getHours();
                        return (
                            <div key={h} className="flex-1 flex flex-col items-center gap-1 group relative">
                                <div
                                    style={{
                                        height: `${Math.max(pct * 64, 2)}px`,
                                        backgroundColor: isNow ? '#4ade80' : `rgba(34,197,94,${0.3 + pct * 0.7})`,
                                        boxShadow: pct > 0.5 ? `0 0 6px rgba(34,197,94,${pct * 0.6})` : 'none'
                                    }}
                                    className="w-full transition-all"
                                />
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black border border-primary-500/40 text-xs text-primary-400 px-2 py-1 whitespace-nowrap z-10">
                                    {h}:00 — {val} msgs
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between mt-2 text-primary-500/30 text-xs">
                    {['00', '06', '12', '18', '23'].map(h => <span key={h}>{h}:00</span>)}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Sentiment */}
                <div className="glow-border bg-black/40 p-6">
                    <p className="text-xs uppercase tracking-widest text-primary-500/50 mb-4">Community Sentiment</p>
                    <div className="space-y-4">
                        {[
                            { label: 'Positive', value: sentiment.positive, icon: Smile, color: '#4ade80' },
                            { label: 'Neutral', value: sentiment.neutral, icon: Meh, color: '#06b6d4' },
                            { label: 'Negative', value: sentiment.negative, icon: Frown, color: '#f87171' },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" style={{ color }} />
                                        <span className="text-xs uppercase tracking-wider text-primary-500/60">{label}</span>
                                    </div>
                                    <span className="text-sm font-bold" style={{ color }}>
                                        {value} <span className="text-primary-500/40 text-xs">({Math.round(value / sentimentTotal * 100)}%)</span>
                                    </span>
                                </div>
                                <MiniBar value={value} max={sentimentTotal} color={color} />
                            </div>
                        ))}
                    </div>

                    {/* Overall Health */}
                    <div className="mt-6 pt-4 border-t border-primary-500/20 flex items-center gap-3">
                        {sentiment.positive > sentiment.negative * 3
                            ? <><TrendingUp className="w-4 h-4 text-green-400" /><span className="text-xs text-green-400 uppercase tracking-wider">Community Health: GOOD</span></>
                            : <><TrendingDown className="w-4 h-4 text-red-400" /><span className="text-xs text-red-400 uppercase tracking-wider">Community Health: NEEDS ATTENTION</span></>
                        }
                    </div>
                </div>

                {/* Unanswered Queries */}
                <div className="glow-border bg-black/40 p-6">
                    <p className="text-xs uppercase tracking-widest text-primary-500/50 mb-4">Top Unanswered Queries</p>
                    {UNANSWERED.length === 0 ? (
                        <p className="text-primary-500/30 text-xs uppercase text-center py-8">No unanswered queries 🎉</p>
                    ) : (
                        <div className="space-y-3">
                            {UNANSWERED.map((q, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <span className="text-primary-500/30 text-xs w-4 shrink-0 pt-0.5">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-300 leading-tight">&quot;{q.query}&quot;</p>
                                        <p className="text-xs text-primary-500/30 mt-0.5 uppercase">
                                            {q.count}x · {q.timestamp}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-primary-500/20">
                        <p className="text-xs text-primary-500/30 uppercase tracking-widest">
                            💡 Tip: Add these to FAQ or Knowledge Base to reduce AI costs
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
