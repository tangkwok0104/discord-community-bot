import { useState, useCallback } from 'react';
import { Upload, FileText, Database, Trash2, RefreshCw, CheckCircle, XCircle, Loader } from 'lucide-react';

const MOCK_DOCS = [
    { id: 1, name: 'server-rules.txt', chunks: 12, uploadedAt: '2026-03-01' },
    { id: 2, name: 'faq-extended.md', chunks: 34, uploadedAt: '2026-03-01' },
    { id: 3, name: 'onboarding-guide.md', chunks: 21, uploadedAt: '2026-02-28' },
];

export default function Knowledge() {
    const [docs, setDocs] = useState(MOCK_DOCS);
    const [isDragging, setIsDragging] = useState(false);
    const [uploads, setUploads] = useState([]); // { name, status: 'uploading'|'done'|'error', chunks? }

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        processFiles(files);
    }, []);

    const handleFileInput = (e) => {
        const files = Array.from(e.target.files);
        processFiles(files);
    };

    const processFiles = (files) => {
        const allowed = ['.txt', '.md', '.csv', '.json'];
        const valid = files.filter(f => allowed.some(ext => f.name.endsWith(ext)));

        const newUploads = valid.map(f => ({ name: f.name, status: 'uploading' }));
        setUploads(prev => [...prev, ...newUploads]);

        // Simulate upload + processing
        valid.forEach((file, i) => {
            setTimeout(() => {
                const chunks = Math.floor(Math.random() * 40) + 5;
                setUploads(prev =>
                    prev.map(u => u.name === file.name ? { ...u, status: 'done', chunks } : u)
                );
                setDocs(prev => [{
                    id: Date.now() + i,
                    name: file.name,
                    chunks,
                    uploadedAt: new Date().toISOString().split('T')[0]
                }, ...prev]);
            }, 1500 + i * 500);
        });
    };

    const deleteDoc = (id) => {
        setDocs(prev => prev.filter(d => d.id !== id));
    };

    const totalChunks = docs.reduce((sum, d) => sum + d.chunks, 0);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold glow-text uppercase tracking-widest">📚 Knowledge Base</h2>
                <p className="text-primary-500/60 text-sm mt-1 uppercase tracking-wider">
                    RAG — Retrieval-Augmented Generation | Multi-tenant document store
                </p>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Documents', value: docs.length, icon: FileText },
                    { label: 'Total Chunks', value: totalChunks, icon: Database },
                    { label: 'Index Status', value: docs.length > 0 ? 'Active' : 'Empty', icon: RefreshCw },
                ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="glow-border bg-black/40 p-4 flex items-center gap-4">
                        <Icon className="w-6 h-6 text-primary-400" />
                        <div>
                            <p className="text-xs uppercase tracking-widest text-primary-500/50">{label}</p>
                            <p className="text-xl font-bold glow-text">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-none p-12 text-center transition-all duration-200 cursor-pointer relative
          ${isDragging
                        ? 'border-primary-400 bg-primary-500/10 glow-border'
                        : 'border-primary-500/30 hover:border-primary-500/60 hover:bg-primary-500/5'
                    }`}
            >
                <input
                    type="file"
                    multiple
                    accept=".txt,.md,.csv,.json"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-primary-400' : 'text-primary-500/40'}`} />
                <p className="text-primary-400 font-bold uppercase tracking-wider text-lg">
                    {isDragging ? 'DROP TO UPLOAD' : 'DRAG & DROP FILES'}
                </p>
                <p className="text-primary-500/50 text-sm mt-2 uppercase tracking-widest">
                    .txt · .md · .csv · .json — Max 5MB each
                </p>
                <p className="text-primary-500/30 text-xs mt-4 uppercase">
                    Files are chunked, embedded with Gemini text-embedding-004, and stored per-server
                </p>
            </div>

            {/* Upload Progress */}
            {uploads.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-widest text-primary-500/50">Upload Queue</p>
                    {uploads.map((u, i) => (
                        <div key={i} className="flex items-center gap-3 glow-border bg-black/40 px-4 py-3">
                            {u.status === 'uploading' && <Loader className="w-4 h-4 text-primary-400 animate-spin" />}
                            {u.status === 'done' && <CheckCircle className="w-4 h-4 text-green-400" />}
                            {u.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                            <span className="flex-1 text-sm">{u.name}</span>
                            <span className="text-xs text-primary-500/50 uppercase">
                                {u.status === 'uploading' ? 'Processing...' : u.status === 'done' ? `${u.chunks} chunks` : 'Error'}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Document List */}
            <div>
                <p className="text-xs uppercase tracking-widest text-primary-500/50 mb-3">Indexed Documents</p>
                {docs.length === 0 ? (
                    <div className="glow-border bg-black/40 p-8 text-center text-primary-500/40 uppercase tracking-widest text-sm">
                        No documents indexed yet — upload files above
                    </div>
                ) : (
                    <div className="space-y-2">
                        {docs.map(doc => (
                            <div key={doc.id} className="flex items-center gap-4 glow-border bg-black/40 px-4 py-3 group">
                                <FileText className="w-5 h-5 text-primary-400/60 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{doc.name}</p>
                                    <p className="text-xs text-primary-500/40 uppercase">{doc.chunks} chunks · {doc.uploadedAt}</p>
                                </div>
                                <button
                                    onClick={() => deleteDoc(doc.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-400 text-primary-500/50"
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
