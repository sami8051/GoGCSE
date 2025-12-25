import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useOutletContext } from 'react-router-dom';
import { Bell, Plus, Edit2, Trash2, X, Check, Calendar, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface Announcement {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    active: boolean;
    startDate?: Timestamp;
    endDate?: Timestamp;
    createdAt: Timestamp;
    createdBy: string;
}

const AdminAnnouncements: React.FC = () => {
    const context = useOutletContext<{ darkMode: boolean }>();
    const darkMode = context?.darkMode || false;

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'warning' | 'success' | 'error',
        active: true,
        startDate: '',
        endDate: ''
    });

    const cardClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const textClass = darkMode ? 'text-white' : 'text-slate-900';
    const textMutedClass = darkMode ? 'text-slate-400' : 'text-slate-500';
    const inputClass = darkMode
        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
        : 'bg-white border-slate-200 text-slate-900';

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Announcement[];
            setAnnouncements(data);
        } catch (e) {
            console.error('Failed to load announcements', e);
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.message) {
            alert('Please fill in title and message');
            return;
        }

        try {
            const data = {
                title: formData.title,
                message: formData.message,
                type: formData.type,
                active: formData.active,
                startDate: formData.startDate ? Timestamp.fromDate(new Date(formData.startDate)) : null,
                endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
                createdAt: Timestamp.now(),
                createdBy: auth.currentUser?.email || 'unknown'
            };

            if (editingId) {
                await updateDoc(doc(db, 'announcements', editingId), data);
            } else {
                await addDoc(collection(db, 'announcements'), data);
            }

            setShowModal(false);
            setEditingId(null);
            resetForm();
            loadAnnouncements();
        } catch (e) {
            console.error('Failed to save announcement', e);
            alert('Failed to save announcement');
        }
    };

    const handleEdit = (announcement: Announcement) => {
        setFormData({
            title: announcement.title,
            message: announcement.message,
            type: announcement.type,
            active: announcement.active,
            startDate: announcement.startDate ? new Date(announcement.startDate.seconds * 1000).toISOString().split('T')[0] : '',
            endDate: announcement.endDate ? new Date(announcement.endDate.seconds * 1000).toISOString().split('T')[0] : ''
        });
        setEditingId(announcement.id);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this announcement?')) return;
        try {
            await deleteDoc(doc(db, 'announcements', id));
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (e) {
            console.error('Failed to delete', e);
        }
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, 'announcements', id), { active: !currentStatus });
            setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active: !currentStatus } : a));
        } catch (e) {
            console.error('Failed to toggle', e);
        }
    };

    const resetForm = () => {
        setFormData({ title: '', message: '', type: 'info', active: true, startDate: '', endDate: '' });
    };

    const getTypeBadge = (type: string) => {
        const styles: Record<string, string> = {
            info: 'bg-blue-100 text-blue-800',
            warning: 'bg-amber-100 text-amber-800',
            success: 'bg-emerald-100 text-emerald-800',
            error: 'bg-red-100 text-red-800'
        };
        return styles[type] || styles.info;
    };

    if (loading) return <div className={`p-8 text-center ${textMutedClass}`}>Loading announcements...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={`text-2xl font-bold ${textClass}`}>Announcements</h1>
                    <p className={textMutedClass}>Manage platform-wide announcements for students.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus size={18} />
                    New Announcement
                </button>
            </div>

            {/* Announcements List */}
            <div className="space-y-4">
                {announcements.length === 0 ? (
                    <div className={`text-center py-12 ${cardClass} rounded-xl border`}>
                        <Bell size={48} className={`mx-auto mb-4 ${textMutedClass}`} />
                        <p className={textMutedClass}>No announcements yet.</p>
                    </div>
                ) : (
                    announcements.map((announcement) => (
                        <div key={announcement.id} className={`p-5 rounded-xl border ${cardClass} ${!announcement.active ? 'opacity-60' : ''}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className={`font-bold ${textClass}`}>{announcement.title}</h3>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeBadge(announcement.type)}`}>
                                            {announcement.type}
                                        </span>
                                        {announcement.active ? (
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">Active</span>
                                        ) : (
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Inactive</span>
                                        )}
                                    </div>
                                    <p className={`text-sm ${textMutedClass} mb-3`}>{announcement.message}</p>
                                    <div className={`flex items-center gap-4 text-xs ${textMutedClass}`}>
                                        <span>Created by {announcement.createdBy}</span>
                                        {announcement.startDate && (
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                Starts: {new Date(announcement.startDate.seconds * 1000).toLocaleDateString()}
                                            </span>
                                        )}
                                        {announcement.endDate && (
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                Ends: {new Date(announcement.endDate.seconds * 1000).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => toggleActive(announcement.id, announcement.active)}
                                        className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                                        title={announcement.active ? 'Deactivate' : 'Activate'}
                                    >
                                        {announcement.active ? <EyeOff size={18} className={textMutedClass} /> : <Eye size={18} className={textMutedClass} />}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(announcement)}
                                        className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                                    >
                                        <Edit2 size={18} className="text-blue-500" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(announcement.id)}
                                        className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                                    >
                                        <Trash2 size={18} className="text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`rounded-2xl shadow-2xl max-w-lg w-full ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <div className={`p-5 border-b flex justify-between items-center ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                            <h2 className={`text-lg font-bold ${textClass}`}>
                                {editingId ? 'Edit Announcement' : 'New Announcement'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                <X size={20} className={textMutedClass} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${textMutedClass}`}>Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputClass}`}
                                    placeholder="Announcement title..."
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${textMutedClass}`}>Message</label>
                                <textarea
                                    value={formData.message}
                                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputClass}`}
                                    placeholder="Announcement message..."
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${textMutedClass}`}>Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputClass}`}
                                    >
                                        <option value="info">Info</option>
                                        <option value="success">Success</option>
                                        <option value="warning">Warning</option>
                                        <option value="error">Error</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <input
                                        type="checkbox"
                                        checked={formData.active}
                                        onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                                        className="w-4 h-4"
                                    />
                                    <label className={`text-sm ${textClass}`}>Active immediately</label>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${textMutedClass}`}>Start Date (optional)</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputClass}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${textMutedClass}`}>End Date (optional)</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputClass}`}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className={`p-5 border-t flex justify-end gap-3 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                            <button
                                onClick={() => setShowModal(false)}
                                className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2"
                            >
                                <Check size={18} />
                                {editingId ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAnnouncements;
