import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Save, AlertCircle } from 'lucide-react';

export default function Settings() {
    const [serverId, setServerId] = useState(localStorage.getItem('serverId') || '');
    const [agents, setAgents] = useState({ otter: true, bear: true, owl: false });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Save server ID to local storage when it changes
    useEffect(() => {
        localStorage.setItem('serverId', serverId);
    }, [serverId]);

    const fetchConfig = async () => {
        if (!serverId) return;
        setLoading(true);
        setMessage('');
        try {
            const docRef = doc(db, 'servers', serverId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.agents) {
                    setAgents({
                        otter: data.agents.otter?.enabled ?? true,
                        bear: data.agents.bear?.enabled ?? true,
                        owl: data.agents.owl?.enabled ?? false,
                    });
                }
            } else {
                setMessage('No configuration found for this server ID. Defaults loaded.');
            }
        } catch (error) {
            console.error(error);
            setMessage('Failed to load configuration. Check Firebase credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!serverId) return;
        setSaving(true);
        setMessage('');
        try {
            const docRef = doc(db, 'servers', serverId);
            await setDoc(docRef, {
                agents: {
                    otter: { enabled: agents.otter },
                    bear: { enabled: agents.bear },
                    owl: { enabled: agents.owl }
                }
            }, { merge: true });
            setMessage('✅ Settings saved successfully!');
        } catch (error) {
            console.error(error);
            setMessage('❌ Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const toggleAgent = (key) => setAgents({ ...agents, [key]: !agents[key] });

    return (
        <div className="animate-in fade-in duration-500 relative pb-12">
            <header className="mb-8 border-b border-primary-500/30 pb-4 relative">
                <div className="absolute -bottom-[1px] left-0 w-32 h-[1px] bg-primary-400 glow-border"></div>
                <h1 className="text-3xl font-bold text-primary-400 mb-2 uppercase tracking-tight glow-text flex items-center gap-3">
                    <span className="w-2 h-6 bg-primary-500 inline-block animate-pulse"></span>
                    Agent Configuration
                </h1>
                <p className="text-gray-400 uppercase tracking-widest text-sm font-bold">Manage active neural network personas.</p>

                <div className="mt-6 flex max-w-md items-center gap-0">
                    <input
                        type="text"
                        placeholder="SERVER ID"
                        value={serverId}
                        onChange={(e) => setServerId(e.target.value)}
                        className="flex-1 bg-dark-900 border border-primary-500/30 px-4 py-2.5 text-primary-400 focus:outline-none focus:border-primary-500 transition-colors uppercase tracking-widest placeholder:text-primary-900 glow-border"
                    />
                    <button
                        onClick={fetchConfig}
                        disabled={!serverId || loading}
                        className="px-6 py-2.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/50 transition-colors font-bold uppercase tracking-widest disabled:opacity-50 glow-border"
                    >
                        {loading ? 'INITIALIZING...' : 'CONNECT'}
                    </button>
                </div>
            </header>

            {message && (
                <div className={`p-4 mb-6 flex items-center gap-3 uppercase font-bold tracking-wider ${message.includes('❌') || message.includes('Failed') ? 'bg-red-500/10 text-red-500 border border-red-500/50 glow-border' : 'bg-primary-500/10 text-primary-400 border border-primary-500/50 glow-border'}`}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{message}</span>
                </div>
            )}

            <div className="grid gap-6 max-w-2xl mb-12">
                <AgentToggle
                    title="UNIT 01: OTTER"
                    description="Handles friendly welcomes and general chat processing."
                    isEnabled={agents.otter}
                    onToggle={() => toggleAgent('otter')}
                />
                <AgentToggle
                    title="UNIT 02: BEAR"
                    description="Enforces behavioral parameters and mitigates toxicity."
                    isEnabled={agents.bear}
                    onToggle={() => toggleAgent('bear')}
                />
                <AgentToggle
                    title="UNIT 03: OWL"
                    description="Compiles server analytics and operational insights."
                    isEnabled={agents.owl}
                    onToggle={() => toggleAgent('owl')}
                />
            </div>

            <button
                onClick={handleSave}
                disabled={saving || !serverId}
                className="flex items-center gap-3 px-8 py-4 bg-primary-600/20 hover:bg-primary-500/40 text-primary-400 border border-primary-500 glow-border font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-primary-400/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <Save className="w-5 h-5 relative z-10" />
                <span className="relative z-10">{saving ? 'UPLOADING...' : 'COMMIT CHANGES'}</span>
            </button>

            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary-500/50"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary-500/50"></div>
        </div>
    );
}

function AgentToggle({ title, description, isEnabled, onToggle }) {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-6 border bg-dark-900 relative group overflow-hidden transition-all ${isEnabled ? 'border-primary-500/50 glow-border' : 'border-gray-800'}`}>
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-primary-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-10"></div>

            <div className="z-10 mb-4 sm:mb-0 pr-4">
                <h3 className={`text-lg font-bold tracking-widest uppercase flex items-center gap-2 ${isEnabled ? 'text-primary-400 glow-text' : 'text-gray-500'}`}>
                    {isEnabled && <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse"></span>}
                    {title}
                </h3>
                <p className="text-gray-400 text-sm mt-2 tracking-wide">{description}</p>
            </div>

            <button
                onClick={onToggle}
                className={`relative inline-flex h-8 w-16 items-center border transition-all duration-300 z-10 shrink-0 ${isEnabled ? 'bg-primary-500/20 border-primary-400 glow-border' : 'bg-dark-800 border-gray-600'}`}
            >
                <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-bold text-gray-500 pointer-events-none">
                    <span>OFF</span>
                    <span>ON</span>
                </div>
                <span className={`inline-block h-6 w-6 transform bg-primary-400 transition-transform duration-300 relative z-20 ${isEnabled ? 'translate-x-9 shadow-[0_0_10px_#4ade80]' : 'translate-x-1 bg-gray-500'}`} />
            </button>
        </div>
    );
}
