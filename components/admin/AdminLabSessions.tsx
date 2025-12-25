import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Search, Trash2, BookOpen, Calendar, User, MessageSquare, X } from 'lucide-react';

const AdminLabSessions: React.FC = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [filteredSessions, setFilteredSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMethod, setFilterMethod] = useState('all');
    const [selectedSession, setSelectedSession] = useState<any>(null);

    useEffect(() => {
        loadSessions();
    }, []);

    useEffect(() => {
        let result = [...sessions];

        if (filterMethod !== 'all') {
            result = result.filter(s => s.method === filterMethod);
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(s =>
                s.userId?.toLowerCase().includes(lower) ||
                s.text?.toLowerCase().includes(lower)
            );
        }

        setFilteredSessions(result);
    }, [sessions, filterMethod, searchTerm]);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'labSessions'), orderBy('date', 'desc'), limit(100));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setSessions(data);
        } catch (e) {
            console.error("Failed to load lab sessions", e);
            setSessions([]);
        }
        setLoading(false);
    };

    const handleDelete = async (sessionId: string) => {
        if (!window.confirm("Delete this lab session?")) return;
        try {
            await deleteDoc(doc(db, 'labSessions', sessionId));
            setSessions(prev => prev.filter(s => s.id !== sessionId));
        } catch (e) {
            console.error("Failed to delete session", e);
            alert("Failed to delete session.");
        }
    };

    const getMethodBadge = (method: string) => {
        switch (method) {
            case 'analyzer':
                return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">Analyzer</span>;
            case 'gym':
                return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">Writing Gym</span>;
            default:
                return <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded-full">{method}</span>;
        }
    };

    if (loading) return <div className="p-8">Loading lab sessions...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Language Lab Sessions</h1>
                    <p className="text-slate-500">View and manage student practice sessions.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap bg-white p-4 rounded-xl border border-slate-200">
                <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Methods</option>
                    <option value="analyzer">Analyzer</option>
                    <option value="gym">Writing Gym</option>
                </select>
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by User ID or text..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <span className="text-sm text-slate-400">
                    Showing {filteredSessions.length} of {sessions.length}
                </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">User ID</th>
                            <th className="px-6 py-4">Method</th>
                            <th className="px-6 py-4">Text Preview</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredSessions.map((session) => (
                            <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-mono text-slate-600">
                                    {session.userId?.substring(0, 12)}...
                                </td>
                                <td className="px-6 py-4">
                                    {getMethodBadge(session.method)}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 max-w-[300px] truncate">
                                    {session.text?.substring(0, 100)}...
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {session.date?.seconds ? new Date(session.date.seconds * 1000).toLocaleDateString() : 'Unknown'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => setSelectedSession(session)}
                                            className="p-2 text-slate-500 hover:bg-slate-100 rounded"
                                            title="View Details"
                                        >
                                            <MessageSquare size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(session.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredSessions.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    No lab sessions found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Session Detail Modal */}
            {selectedSession && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <BookOpen size={24} className="text-indigo-500" />
                                <h2 className="text-xl font-bold text-slate-900">Lab Session Details</h2>
                            </div>
                            <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User size={16} className="text-slate-400" />
                                        <p className="text-sm text-slate-500">User ID</p>
                                    </div>
                                    <p className="font-mono text-sm">{selectedSession.userId}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar size={16} className="text-slate-400" />
                                        <p className="text-sm text-slate-500">Date</p>
                                    </div>
                                    <p className="font-medium">
                                        {selectedSession.date?.seconds ? new Date(selectedSession.date.seconds * 1000).toLocaleString() : 'Unknown'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">Method</h4>
                                {getMethodBadge(selectedSession.method)}
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">Submitted Text</h4>
                                <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                    {selectedSession.text || 'No text submitted.'}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">AI Feedback</h4>
                                <div className="bg-blue-50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                    {typeof selectedSession.feedback === 'object'
                                        ? JSON.stringify(selectedSession.feedback, null, 2)
                                        : selectedSession.feedback || 'No feedback available.'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLabSessions;
