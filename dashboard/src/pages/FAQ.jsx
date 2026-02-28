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
        <div className="animate-in fade-in duration-500">
            <header className="mb-8 border-b border-gray-800 pb-6">
                <h1 className="text-3xl font-bold text-white mb-2">FAQ Manager</h1>
                <p className="text-gray-400">Manage the knowledge base queries used by the bot.</p>

                <div className="mt-6 flex max-w-md items-center gap-3">
                    <input
                        type="text"
                        placeholder="Discord Server ID"
                        value={serverId}
                        onChange={(e) => setServerId(e.target.value)}
                        className="flex-1 bg-dark-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    />
                    <button
                        onClick={fetchFAQs}
                        disabled={!serverId || loading}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Load FAQs'}
                    </button>
                </div>
            </header>

            {message && (
                <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${message.includes('❌') || message.includes('Failed') ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-primary-500/10 text-primary-400 border border-primary-500/20'}`}>
                    <AlertCircle className="w-5 h-5" />
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold text-white mb-4">Existing FAQs ({faqs.length})</h2>

                    {faqs.length === 0 && !loading && (
                        <div className="p-8 text-center border border-dashed border-gray-700 rounded-2xl bg-dark-800/50">
                            <p className="text-gray-500">No FAQs found. Add one to get started.</p>
                        </div>
                    )}

                    {faqs.map(faq => (
                        <div key={faq.id} className="p-5 rounded-xl border border-gray-800 bg-dark-800 group transition-all hover:border-gray-600">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium text-white mb-2">Q: {faq.question}</h3>
                                    <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">A: {faq.answer}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(faq.id)}
                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-dark-800 border border-gray-800 rounded-2xl p-6 h-max sticky top-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Add New Entry</h2>
                    <form onSubmit={handleAddFAQ} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Question</label>
                            <input
                                type="text"
                                required
                                value={newQuestion}
                                onChange={e => setNewQuestion(e.target.value)}
                                placeholder="e.g. What are the rules?"
                                className="w-full bg-dark-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Answer</label>
                            <textarea
                                required
                                value={newAnswer}
                                onChange={e => setNewAnswer(e.target.value)}
                                placeholder="e.g. Be respectful and kind..."
                                rows={5}
                                className="w-full bg-dark-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 resize-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting || !serverId}
                            className="w-full flex justify-center items-center gap-2 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                            <Plus className="w-5 h-5" />
                            {isSubmitting ? 'Adding...' : 'Add FAQ'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
