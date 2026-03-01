import { useState } from 'react';
import { Shield, Check, X, Clock, Plus, Trash2, ChevronRight } from 'lucide-react';

const MOCK_RULES = [
    { id: 1, text: 'No spam or unsolicited self-promotion.', addedAt: '2026-02-28', active: true },
    { id: 2, text: 'Be respectful to all members at all times.', addedAt: '2026-02-28', active: true },
    { id: 3, text: 'No NSFW content outside designated channels.', addedAt: '2026-02-28', active: true },
    { id: 4, text: 'No sharing of personal information.', addedAt: '2026-03-01', active: true },
];

const MOCK_PENDING = [
    { id: 101, rule: 'Bots must be kept in #bot-commands only.', proposedBy: 'anson67lab', proposedAt: '2026-03-01T13:45:00Z' },
    { id: 102, rule: 'No posting links without context.', proposedBy: 'user#1234', proposedAt: '2026-03-01T22:10:00Z' },
];

export default function Rules() {
    const [rules, setRules] = useState(MOCK_RULES);
    const [pending, setPending] = useState(MOCK_PENDING);
    const [newRule, setNewRule] = useState('');

    const approveRule = (id) => {
        const item = pending.find(p => p.id === id);
        if (!item) return;
        setRules(prev => [...prev, {
            id: Date.now(),
            text: item.rule,
            addedAt: new Date().toISOString().split('T')[0],
            active: true
        }]);
        setPending(prev => prev.filter(p => p.id !== id));
    };

    const denyRule = (id) => setPending(prev => prev.filter(p => p.id !== id));

    const deleteRule = (id) => setRules(prev => prev.filter(r => r.id !== id));

    const addRule = () => {
        if (!newRule.trim()) return;
        setRules(prev => [...prev, {
            id: Date.now(),
            text: newRule.trim(),
            addedAt: new Date().toISOString().split('T')[0],
            active: true
        }]);
        setNewRule('');
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold glow-text uppercase tracking-widest">🛡️ Rules Manager</h2>
                <p className="text-primary-500/60 text-sm mt-1 uppercase tracking-wider">
                    Manage server rules — changes require admin approval
                </p>
            </div>

            {/* Pending Approvals */}
            {pending.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <p className="text-xs uppercase tracking-widest text-yellow-400/70">
                            Pending Approval ({pending.length})
                        </p>
                    </div>
                    <div className="space-y-3">
                        {pending.map(item => (
                            <div key={item.id} className="glow-border bg-black/60 border-yellow-400/30 p-4 flex items-start gap-4"
                                style={{ boxShadow: '0 0 10px rgba(234,179,8,0.1) inset' }}>
                                <ChevronRight className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-bold">&quot;{item.rule}&quot;</p>
                                    <p className="text-xs text-primary-500/40 uppercase mt-1">
                                        Proposed by {item.proposedBy} · {new Date(item.proposedAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => approveRule(item.id)}
                                        className="flex items-center gap-1 px-3 py-1 bg-green-500/10 border border-green-500/40 text-green-400 text-xs uppercase hover:bg-green-500/20 transition-all"
                                    >
                                        <Check className="w-3 h-3" /> Approve
                                    </button>
                                    <button
                                        onClick={() => denyRule(item.id)}
                                        className="flex items-center gap-1 px-3 py-1 bg-red-500/10 border border-red-500/40 text-red-400 text-xs uppercase hover:bg-red-500/20 transition-all"
                                    >
                                        <X className="w-3 h-3" /> Deny
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add New Rule */}
            <div>
                <p className="text-xs uppercase tracking-widest text-primary-500/50 mb-3">Add Rule (Admin Direct)</p>
                <div className="flex gap-3">
                    <input
                        value={newRule}
                        onChange={e => setNewRule(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addRule()}
                        placeholder="Enter new rule text..."
                        className="flex-1 bg-black/60 border border-primary-500/30 text-primary-400 placeholder-primary-500/30 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:glow-border uppercase tracking-wide"
                    />
                    <button
                        onClick={addRule}
                        disabled={!newRule.trim()}
                        className="flex items-center gap-2 px-4 py-3 bg-primary-500/10 border border-primary-500/50 text-primary-400 text-sm uppercase tracking-wider hover:bg-primary-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add
                    </button>
                </div>
            </div>

            {/* Current Rules */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-primary-400" />
                    <p className="text-xs uppercase tracking-widest text-primary-500/50">
                        Active Rules ({rules.length})
                    </p>
                </div>
                {rules.length === 0 ? (
                    <div className="glow-border bg-black/40 p-8 text-center text-primary-500/40 uppercase tracking-widest text-sm">
                        No rules set yet
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rules.map((rule, index) => (
                            <div key={rule.id} className="flex items-start gap-4 glow-border bg-black/40 px-4 py-3 group">
                                <span className="text-primary-500/40 font-bold text-sm w-6 shrink-0 pt-0.5">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <p className="flex-1 text-sm text-gray-300">{rule.text}</p>
                                <span className="text-xs text-primary-500/30 uppercase shrink-0 pt-0.5">{rule.addedAt}</span>
                                <button
                                    onClick={() => deleteRule(rule.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 text-primary-500/50 shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
