import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trash2, Plus, AlertCircle } from 'lucide-react';

export default function FAQ() {
    const [serverId, setServerId] = useState(localStorage.getItem('serverId') || '');
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // New FAQ form state
    const [newQuestion, setNewQuestion] = useState('');
    const [newAnswer, setNewAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        localStorage.setItem('serverId', serverId);
    }, [serverId]);

    const fetchFAQs = async () => {
        if (!serverId) return;
        setLoading(true);
        setMessage('');
        try {
            const faqRef = collection(db, `servers/${serverId}/faqs`);
            const snapshot = await getDocs(faqRef);
            const loadedFaqs = [];
            snapshot.forEach(doc => {
                loadedFaqs.push({ id: doc.id, ...doc.data() });
            });
            setFaqs(loadedFaqs);
        } catch (error) {
            console.error(error);
            setMessage('Failed to load FAQs. Check Firebase credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFAQ = async (e) => {
        e.preventDefault();
        if (!serverId || !newQuestion || !newAnswer) return;
        setIsSubmitting(true);

        try {
            const faqRef = collection(db, `servers/${serverId}/faqs`);
            const newFaq = {
                question: newQuestion,
                answer: newAnswer,
                variations: [newQuestion.toLowerCase()],
                createdAt: serverTimestamp()
            };
            const docRef = await addDoc(faqRef, newFaq);
            setFaqs([...faqs, { id: docRef.id, ...newFaq }]);
            setNewQuestion('');
            setNewAnswer('');
            setMessage('✅ FAQ added successfully!');
        } catch (error) {
            console.error(error);
            setMessage('❌ Failed to add FAQ.');
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this FAQ?')) return;
        try {
            await deleteDoc(doc(db, `servers/${serverId}/faqs`, id));
            setFaqs(faqs.filter(faq => faq.id !== id));
        } catch (error) {
            console.error(error);
            setMessage('❌ Failed to delete FAQ.');
        }
    };

    return (
        <div className="animate-in fade-in duration-500 relative pb-12 w-full">
            <header className="mb-8 border-b border-primary-500/30 pb-4 relative">
                <div className="absolute -bottom-[1px] left-0 w-32 h-[1px] bg-primary-400 glow-border"></div>
                <h1 className="text-3xl font-bold text-primary-400 mb-2 uppercase tracking-tight glow-text flex items-center gap-3">
                    <span className="w-2 h-6 bg-primary-500 inline-block animate-pulse"></span>
                    Knowledge Base
                </h1>
                <p className="text-gray-400 uppercase tracking-widest text-sm font-bold">Manage neural network response protocols.</p>

                <div className="mt-6 flex max-w-md items-center gap-0">
                    <input
                        type="text"
                        placeholder="SERVER ID"
                        value={serverId}
                        onChange={(e) => setServerId(e.target.value)}
                        className="flex-1 bg-dark-900 border border-primary-500/30 px-4 py-2.5 text-primary-400 focus:outline-none focus:border-primary-500 transition-colors uppercase tracking-widest placeholder:text-primary-900 glow-border"
                    />
                    <button
                        onClick={fetchFAQs}
                        disabled={!serverId || loading}
                        className="px-6 py-2.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/50 transition-colors font-bold uppercase tracking-widest disabled:opacity-50 glow-border"
                    >
                        {loading ? 'SYNCING...' : 'SYNC DATA'}
                    </button>
                </div>
            </header>

            {message && (
                <div className={`p-4 mb-6 flex items-center gap-3 uppercase font-bold tracking-wider ${message.includes('❌') || message.includes('Failed') ? 'bg-red-500/10 text-red-500 border border-red-500/50 glow-border' : 'bg-primary-500/10 text-primary-400 border border-primary-500/50 glow-border'}`}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-primary-400 mb-4 tracking-widest uppercase glow-text flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary-500"></span>
                        Active Protocols ({faqs.length})
                    </h2>

                    {faqs.length === 0 && !loading && (
                        <div className="p-8 text-center border border-dashed border-primary-500/30 bg-dark-900/50 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-10"></div>
                            <p className="text-primary-500/50 uppercase tracking-widest relative z-10 font-bold">No active protocols found. Awaiting input.</p>
                        </div>
                    )}

                    {faqs.map(faq => (
                        <div key={faq.id} className="p-5 border border-primary-500/30 bg-dark-900 group transition-all hover:border-primary-500 glow-border relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-10"></div>
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-primary-500/50 to-transparent"></div>
                            <div className="flex justify-between items-start gap-4 relative z-10">
                                <div className="flex-1 pr-4">
                                    <h3 className="text-lg font-bold text-primary-400 mb-2 tracking-widest uppercase border-b border-primary-500/20 pb-2">
                                        <span className="text-primary-600 mr-2">Q:</span>{faq.question}
                                    </h3>
                                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap font-sans text-sm tracking-wide">
                                        <span className="text-primary-600 font-bold font-mono mr-2">A:</span>{faq.answer}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(faq.id)}
                                    className="p-3 text-red-500/50 border border-transparent hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 uppercase text-xs font-bold tracking-wider"
                                >
                                    <Trash2 className="w-5 h-5 mb-1 mx-auto" />
                                    Purge
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-dark-900 border border-primary-500/30 p-6 h-max sticky top-8 glow-border relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-10"></div>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary-500/5 blur-xl -mr-10 -mt-10"></div>

                    <h2 className="text-lg font-bold text-primary-400 mb-6 tracking-widest uppercase flex items-center gap-2 relative z-10">
                        <span className="w-2 h-2 bg-primary-500 animate-ping"></span>
                        Inject Protocol
                    </h2>

                    <form onSubmit={handleAddFAQ} className="space-y-5 relative z-10">
                        <div>
                            <label className="block text-xs font-bold text-primary-500/70 mb-2 uppercase tracking-widest">Query Parameter</label>
                            <input
                                type="text"
                                required
                                value={newQuestion}
                                onChange={e => setNewQuestion(e.target.value)}
                                placeholder="E.G. WHAT ARE THE DIRECTIVES?"
                                className="w-full bg-dark-900 border border-primary-500/30 px-4 py-3 text-primary-400 focus:outline-none focus:border-primary-500 placeholder:text-primary-900 transition-colors uppercase"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-primary-500/70 mb-2 uppercase tracking-widest">Response Matrix</label>
                            <textarea
                                required
                                value={newAnswer}
                                onChange={e => setNewAnswer(e.target.value)}
                                placeholder="E.G. MAINTAIN OPERATIONAL EFFICIENCY..."
                                rows={5}
                                className="w-full bg-dark-900 border border-primary-500/30 px-4 py-3 text-primary-400 focus:outline-none focus:border-primary-500 placeholder:text-primary-900 transition-colors resize-none uppercase"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting || !serverId}
                            className="w-full flex justify-center items-center gap-3 py-4 bg-primary-600/20 hover:bg-primary-500/40 text-primary-400 font-bold uppercase tracking-[0.2em] border border-primary-500 transition-all disabled:opacity-50 glow-border group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-primary-400/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            <Plus className="w-5 h-5 relative z-10" />
                            <span className="relative z-10">{isSubmitting ? 'UPLOADING...' : 'SAVE PROTOCOL'}</span>
                        </button>
                    </form>
                </div>
            </div>

            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary-500/50"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary-500/50"></div>
        </div>
    );
}
