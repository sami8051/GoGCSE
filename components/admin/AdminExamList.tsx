import React, { useEffect, useState } from 'react';
import { getAllExamResults, deleteExamResult, updateExamResultData, getAllUsers } from '../../services/firebase';
import { Search, Trash2, Edit2, Check, X, FileText, Filter, Eye, Download, ChevronDown } from 'lucide-react';

const AdminExamList: React.FC = () => {
    const [exams, setExams] = useState<any[]>([]);
    const [filteredExams, setFilteredExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editScore, setEditScore] = useState<number>(0);
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [userMap, setUserMap] = useState<Record<string, string>>({});

    // Filters
    const [filterPaper, setFilterPaper] = useState<string>('all');
    const [filterGrade, setFilterGrade] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadExams();
    }, []);

    useEffect(() => {
        let result = [...exams];

        // Filter by paper type
        if (filterPaper !== 'all') {
            result = result.filter(e => e.paperType?.includes(filterPaper) || e.paperData?.type?.includes(filterPaper));
        }

        // Filter by grade
        if (filterGrade !== 'all') {
            result = result.filter(e => e.gradeEstimate?.toString() === filterGrade);
        }

        // Search by user name or user ID
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(e =>
                e.userId?.toLowerCase().includes(lower) ||
                e.id?.toLowerCase().includes(lower) ||
                userMap[e.userId]?.toLowerCase().includes(lower)
            );
        }

        setFilteredExams(result);
    }, [exams, filterPaper, filterGrade, searchTerm, userMap]);

    const loadExams = async () => {
        setLoading(true);
        // Fetch exams and users in parallel
        const [examData, userData] = await Promise.all([
            getAllExamResults(),
            getAllUsers()
        ]);

        // Create userId -> displayName map
        const nameMap: Record<string, string> = {};
        userData.forEach((user: any) => {
            nameMap[user.uid || user.id] = user.displayName || user.email || 'Unknown';
        });

        setUserMap(nameMap);
        setExams(examData);
        setLoading(false);
    };

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({ isOpen: true, title, message, onConfirm });
    };

    const handleDelete = async (docId: string) => {
        showConfirm(
            'Delete Exam Record',
            'Are you sure you want to permanently delete this exam record? This action cannot be undone.',
            async () => {
                const success = await deleteExamResult(docId);
                if (success) {
                    setExams(prev => prev.filter(e => e.id !== docId));
                    setSelectedIds(prev => { prev.delete(docId); return new Set(prev); });
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        );
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        showConfirm(
            'Delete Multiple Records',
            `Are you sure you want to delete ${selectedIds.size} selected exam record${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`,
            async () => {
                const promises = Array.from(selectedIds).map((id: string) => deleteExamResult(id));
                await Promise.all(promises);
                setExams(prev => prev.filter(e => !selectedIds.has(e.id)));
                setSelectedIds(new Set());
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredExams.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredExams.map(e => e.id)));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const startEdit = (exam: any) => {
        setEditingId(exam.id);
        setEditScore(exam.totalScore || 0);
    };

    const saveEdit = async (docId: string) => {
        const success = await updateExamResultData(docId, { totalScore: editScore });
        if (success) {
            setExams(prev => prev.map(e => e.id === docId ? { ...e, totalScore: editScore } : e));
            setEditingId(null);
        } else {
            alert("Failed to update exam.");
        }
    };

    const handleExportCSV = () => {
        const headers = ['Exam ID', 'User ID', 'Paper Type', 'Score', 'Max Score', 'Grade', 'Date'];
        const rows = filteredExams.map(e => [
            e.id,
            e.userId,
            e.paperType || e.paperData?.type || 'Unknown',
            e.totalScore,
            e.maxScore,
            e.gradeEstimate || 'N/A',
            e.date?.seconds ? new Date(e.date.seconds * 1000).toISOString() : 'Unknown'
        ]);

        const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exams_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="p-8">Loading records...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Exam Records</h1>
                    <p className="text-slate-500">Global view of all assessment submissions.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                        >
                            <Trash2 size={18} />
                            Delete ({selectedIds.size})
                        </button>
                    )}
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Filters:</span>
                </div>
                <select
                    value={filterPaper}
                    onChange={(e) => setFilterPaper(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Papers</option>
                    <option value="1">Paper 1</option>
                    <option value="2">Paper 2</option>
                </select>
                <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Grades</option>
                    {[9, 8, 7, 6, 5, 4, 3, 2, 1].map(g => (
                        <option key={g} value={g.toString()}>Grade {g}</option>
                    ))}
                </select>
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or user ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <span className="text-sm text-slate-400">
                    Showing {filteredExams.length} of {exams.length}
                </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-4 py-4">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === filteredExams.length && filteredExams.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-slate-300"
                                />
                            </th>
                            <th className="px-4 py-4">User</th>
                            <th className="px-4 py-4">Paper</th>
                            <th className="px-4 py-4">Score</th>
                            <th className="px-4 py-4">Grade</th>
                            <th className="px-4 py-4">Date</th>
                            <th className="px-4 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredExams.map((exam) => (
                            <tr key={exam.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(exam.id) ? 'bg-blue-50' : ''}`}>
                                <td className="px-4 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(exam.id)}
                                        onChange={() => toggleSelect(exam.id)}
                                        className="w-4 h-4 rounded border-slate-300"
                                    />
                                </td>
                                <td className="px-4 py-4">
                                    <div className="text-sm font-medium text-slate-900">
                                        {userMap[exam.userId] || 'Unknown'}
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono">
                                        {exam.userId?.substring(0, 10)}...
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${(exam.paperType || exam.paperData?.type || '').includes('1')
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-purple-100 text-purple-800'
                                        }`}>
                                        <FileText size={14} />
                                        {(exam.paperType || exam.paperData?.type || 'Unknown').includes('1') ? 'Paper 1' : 'Paper 2'}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    {editingId === exam.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={editScore}
                                                onChange={(e) => setEditScore(Number(e.target.value))}
                                                className="w-16 border rounded px-2 py-1 text-sm"
                                            />
                                            <span className="text-slate-400 text-sm">/ {exam.maxScore}</span>
                                        </div>
                                    ) : (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(exam.totalScore / exam.maxScore) > 0.7 ? 'bg-emerald-100 text-emerald-800' :
                                            (exam.totalScore / exam.maxScore) > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {exam.totalScore} / {exam.maxScore}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                        Grade {exam.gradeEstimate || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-500">
                                    {exam.date?.seconds ? new Date(exam.date.seconds * 1000).toLocaleDateString() : 'Unknown'}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {editingId === exam.id ? (
                                            <>
                                                <button onClick={() => saveEdit(exam.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={18} /></button>
                                                <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded"><X size={18} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => setSelectedExam(exam)} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title="View Details"><Eye size={18} /></button>
                                                <button onClick={() => startEdit(exam)} className="p-2 text-blue-500 hover:bg-blue-50 rounded" title="Edit Score"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDelete(exam.id)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Delete"><Trash2 size={18} /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredExams.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                    No exam records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Exam Detail Modal */}
            {selectedExam && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">Exam Details</h2>
                            <button onClick={() => setSelectedExam(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500">User ID</p>
                                    <p className="font-mono text-sm">{selectedExam.userId}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500">Paper Type</p>
                                    <p className="font-medium">{selectedExam.paperType || selectedExam.paperData?.type || 'Unknown'}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500">Score</p>
                                    <p className="font-bold text-lg">{selectedExam.totalScore} / {selectedExam.maxScore}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500">Grade Estimate</p>
                                    <p className="font-bold text-lg">Grade {selectedExam.gradeEstimate || 'N/A'}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">Overall Feedback</h4>
                                <p className="text-slate-600 text-sm bg-slate-50 p-4 rounded-lg">
                                    {selectedExam.overallFeedback || 'No feedback available.'}
                                </p>
                            </div>

                            {selectedExam.questionResults && (
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-2">Question Results</h4>
                                    <div className="space-y-2">
                                        {selectedExam.questionResults.map((qr: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <span className="font-medium text-slate-700">Q{qr.questionId}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                                        {qr.score}/{qr.maxScore}
                                                    </span>
                                                    <span className="text-sm text-slate-500">Level {qr.level || 'N/A'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                    <Trash2 className="text-red-600" size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">{confirmModal.title}</h3>
                            </div>
                            <p className="text-slate-600 mb-6">{confirmModal.message}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/25"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminExamList;
