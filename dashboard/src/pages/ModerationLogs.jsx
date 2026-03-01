import { useState } from 'react';
import { AlertTriangle, Trash2, Link, Phone, Mail, Zap, Users, Clock } from 'lucide-react';

const MOCK_LOGS = [
    { id: 1, type: 'phishing', severity: 'high', user: 'scammer#0001', userId: '111', channel: 'general', action: 'deleted', content: 'FREE NITRO discord-nltro.com/gift/abc123', timestamp: '2026-03-01T13:45:22Z' },
    { id: 2, type: 'pii', severity: 'medium', user: 'newuser#2910', userId: '222', channel: 'general', action: 'deleted + dm', content: 'My number is 0412-345-678 can someone help?', timestamp: '2026-03-01T12:30:10Z' },
    { id: 3, type: 'spam', severity: 'medium', user: 'spammer#5555', userId: '333', channel: 'off-topic', action: 'timeout 1min', content: 'BUY CHEAP FOLLOWERS BUY CHEAP FOLLOWERS BUY...', timestamp: '2026-03-01T10:15:44Z' },
    { id: 4, type: 'raid', severity: 'high', user: 'raider#9999', userId: '444', channel: 'general', action: 'timeout 1min', content: 'RAID THIS SERVER JOIN NOW RAID THIS SERVER...', timestamp: '2026-03-01T09:00:01Z' },
    { id: 5, type: 'zalgo', severity: 'low', user: 'troll#7777', userId: '555', channel: 'general', action: 'deleted', content: 'H̴̢̛̛͍̤̱̻̭̝̝̑̉͌͑̍̿̑͒̈́̋̈ẹ̵̢l̷̨̖̲͓͓͊̓̓l̴̰̹̜̘͙̿ͅo̵', timestamp: '2026-02-29T22:11:08Z' },
    { id: 6, type: 'pii', severity: 'medium', user: 'oversharer#0420', userId: '666', channel: 'help', action: 'deleted + dm', content: 'Email me at john.doe@gmail.com for details', timestamp: '2026-02-29T18:44:33Z' },
];

const TYPE_ICONS = { phishing: Link, pii: Mail, spam: Zap, raid: Users, zalgo: AlertTriangle, toxic: AlertTriangle };
const SEVERITY_COLORS = {
    high: { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', glow: 'rgba(239,68,68,0.15)' },
    medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', glow: 'rgba(234,179,8,0.1)' },
    low: { bg: 'bg-primary-500/10', border: 'border-primary-500/30', text: 'text-primary-400', glow: 'rgba(34,197,94,0.1)' },
};

export default function ModerationLogs() {
    const [logs, setLogs] = useState(MOCK_LOGS);
    const [filter, setFilter] = useState('all');

    const filtered = filter === 'all' ? logs : logs.filter(l => l.type === filter);

    const counts = logs.reduce((acc, l) => { acc[l.type] = (acc[l.type] || 0) + 1; return acc; }, {});
    const highCount = logs.filter(l => l.severity === 'high').length;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold glow-text uppercase tracking-widest">🐻 Moderation Logs</h2>
                <p className="text-primary-500/60 text-sm mt-1 uppercase tracking-wider">
                    Bear auto-moderation — real-time threat log
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Total Actions', value: logs.length, color: 'text-primary-400' },
                    { label: 'High Severity', value: highCount, color: 'text-red-400' },
                    { label: 'Phishing', value: counts.phishing || 0, color: 'text-orange-400' },
                    { label: 'PII Blocked', value: counts.pii || 0, color: 'text-yellow-400' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="glow-border bg-black/40 p-4 text-center">
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs uppercase tracking-widest text-primary-500/50 mt-1">{label}</p>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'phishing', 'pii', 'spam', 'raid', 'zalgo'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`px-3 py-1 text-xs uppercase tracking-wider border transition-all ${filter === type
                                ? 'bg-primary-500/20 border-primary-500/60 text-primary-400'
                                : 'border-primary-500/20 text-primary-500/50 hover:border-primary-500/40 hover:text-primary-500'
                            }`}
                    >
                        {type} {type !== 'all' && counts[type] ? `(${counts[type]})` : ''}
                    </button>
                ))}
                <button
                    onClick={() => setLogs([])}
                    className="ml-auto flex items-center gap-1 px-3 py-1 text-xs uppercase tracking-wider border border-red-500/30 text-red-400/60 hover:border-red-500/60 hover:text-red-400 transition-all"
                >
                    <Trash2 className="w-3 h-3" /> Clear
                </button>
            </div>

            {/* Log Entries */}
            {filtered.length === 0 ? (
                <div className="glow-border bg-black/40 p-8 text-center text-primary-500/40 uppercase tracking-widest text-sm">
                    No moderation events found
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(log => {
                        const Icon = TYPE_ICONS[log.type] || AlertTriangle;
                        const sev = SEVERITY_COLORS[log.severity];
                        return (
                            <div
                                key={log.id}
                                className={`${sev.bg} border ${sev.border} px-4 py-3 flex items-start gap-4`}
                                style={{ boxShadow: `0 0 10px ${sev.glow} inset` }}
                            >
                                <Icon className={`w-4 h-4 ${sev.text} mt-0.5 shrink-0`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${sev.text}`}>{log.type}</span>
                                        <span className="text-xs text-primary-500/50">{log.user}</span>
                                        <span className="text-xs text-primary-500/30">#{log.channel}</span>
                                        <span className={`text-xs px-2 py-0.5 border ${sev.border} ${sev.text} uppercase tracking-wider`}>
                                            {log.action}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1.5 truncate font-mono">
                                        &quot;{log.content}&quot;
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 text-primary-500/30 text-xs shrink-0">
                                    <Clock className="w-3 h-3" />
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
