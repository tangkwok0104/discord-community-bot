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
        <div className="animate-in fade-in duration-500">
            <header className="mb-8 border-b border-gray-800 pb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Agent Settings</h1>
                <p className="text-gray-400">Configure which personas are active for your server.</p>

                <div className="mt-6 flex max-w-md items-center gap-3">
                    <input
                        type="text"
                        placeholder="Discord Server ID"
                        value={serverId}
                        onChange={(e) => setServerId(e.target.value)}
                        className="flex-1 bg-dark-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
                    />
                    <button
                        onClick={fetchConfig}
                        disabled={!serverId || loading}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Load'}
                    </button>
                </div>
            </header>

            {message && (
                <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${message.includes('❌') || message.includes('Failed') ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-primary-500/10 text-primary-400 border border-primary-500/20'}`}>
                    <AlertCircle className="w-5 h-5" />
                    {message}
                </div>
            )}

            <div className="grid gap-4 max-w-2xl mb-8">
                <AgentToggle
                    title="Otter 🦦"
                    description="Handles friendly welcomes and general chat."
                    isEnabled={agents.otter}
                    onToggle={() => toggleAgent('otter')}
                />
                <AgentToggle
                    title="Bear 🐻"
                    description="Enforces rules and handles toxicity moderation."
                    isEnabled={agents.bear}
                    onToggle={() => toggleAgent('bear')}
                />
                <AgentToggle
                    title="Owl 🦉"
                    description="Provides server analytics and insights."
                    isEnabled={agents.owl}
                    onToggle={() => toggleAgent('owl')}
                />
            </div>

            <button
                onClick={handleSave}
                disabled={saving || !serverId}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Configuration'}
            </button>
        </div>
    );
}

function AgentToggle({ title, description, isEnabled, onToggle }) {
    return (
        <div className="flex items-center justify-between p-5 rounded-xl border border-gray-800 bg-dark-800/50 hover:bg-dark-800 transition-colors">
            <div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="text-gray-400 text-sm mt-1">{description}</p>
            </div>
            <button
                onClick={onToggle}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${isEnabled ? 'bg-primary-500' : 'bg-gray-600'}`}
            >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
}
