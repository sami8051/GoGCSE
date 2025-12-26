import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Classroom } from '../../types';
import { Plus, Users, BookOpen, Copy, Check, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TeacherDashboard: React.FC = () => {
    const [classes, setClasses] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newClassName, setNewClassName] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [classMemberCounts, setClassMemberCounts] = useState<Record<string, number>>({});

    // Config State
    const [subject, setSubject] = useState("English Language");
    const [yearGroup, setYearGroup] = useState("");
    const [examBoard, setExamBoard] = useState("Edexcel");
    const [teacherPrompt, setTeacherPrompt] = useState("");

    const [creating, setCreating] = useState(false);
    const auth = getAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadClasses();
    }, [auth.currentUser]);

    const loadClasses = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            // Check Admin Status
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            console.log("TeacherDashboard: Current User UID:", auth.currentUser.uid);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log("TeacherDashboard: User Doc Data:", userData);
                if (userData.isAdmin) {
                    setIsAdmin(true);
                }
            } else {
                console.warn("TeacherDashboard: No user doc found in Firestore for UID:", auth.currentUser.uid);
            }

            const q = query(collection(db, 'classes'), where('teacherId', '==', auth.currentUser.uid));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classroom));
            setClasses(data.sort((a, b) => b.createdAt - a.createdAt));

            // Load actual member counts from subcollections
            const counts: Record<string, number> = {};
            for (const classDoc of data) {
                const membersSnapshot = await getDocs(collection(db, 'classes', classDoc.id, 'members'));
                counts[classDoc.id] = membersSnapshot.size;
            }
            setClassMemberCounts(counts);
        } catch (error) {
            console.error("Error loading classes:", error);
        }
        setLoading(false);
    };

    const handleCreateClass = async () => {
        if (!newClassName.trim() || !auth.currentUser) return;
        setCreating(true);
        try {
            // Generate unique 6-char code (simple random for now)
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            const newClass = {
                name: newClassName.trim(),
                teacherId: auth.currentUser.uid,
                inviteCode,
                studentCount: 0,
                createdAt: Date.now(),
                config: {
                    subject,
                    yearGroup,
                    examBoard,
                    level: 'Mixed' as const,
                    teacherPrompt
                }
            };

            console.log("TeacherDashboard: Attempting to create class with data:", { ...newClass, createdAt: 'serverTimestamp' });
            await addDoc(collection(db, 'classes'), {
                ...newClass,
                createdAt: serverTimestamp()
            });
            console.log("TeacherDashboard: Class created successfully");

            setShowCreateModal(false);
            setNewClassName("");
            setYearGroup("");
            setTeacherPrompt("");
            loadClasses(); // Refresh list
        } catch (error: any) {
            console.error("TeacherDashboard: Error creating class:", error);
            alert(`Failed to create class: ${error.code || 'unknown'} - ${error.message}`);
        }
        setCreating(false);
    };

    const handleDeleteClass = async (classId: string, className: string) => {
        if (!window.confirm(`Are you sure you want to delete "${className}"? This action cannot be undone. All associated data (assignments, student records) will be deleted.`)) return;
        try {
            await deleteDoc(doc(db, 'classes', classId));
            setClasses(prev => prev.filter(c => c.id !== classId));
        } catch (error: any) {
            console.error("TeacherDashboard: Error deleting class:", error);
            alert(`Failed to delete class: ${error.message}`);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Classes</h1>
                    <p className="text-slate-500 mt-1">Create and manage your classrooms.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-200"
                >
                    <Plus size={20} />
                    Create Class
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
            ) : classes.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No classes yet</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-6">Create your first class to start assigning AI-generated practice exams to your students.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline"
                    >
                        Create a Class now
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => navigate(`/teacher/class/${cls.id}`)}>
                                            {cls.name}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClass(cls.id, cls.name);
                                        }}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2 flex-shrink-0"
                                        title="Delete Class"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wide">
                                            {classMemberCounts[cls.id] || 0} Students
                                        </span>
                                </div>

                                <div className="flex items-center gap-2 mb-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Connect Code:</span>
                                    <code className="text-lg font-mono font-bold text-slate-900 tracking-widest">{cls.inviteCode}</code>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/teacher/class/${cls.id}`)}
                                        className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <BookOpen size={16} />
                                        Manage
                                    </button>
                                    <button
                                        onClick={() => navigate(`/teacher/class/${cls.id}/assignments`)}
                                        className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
                                    >
                                        Assignments
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl my-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Create New Class</h2>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                        <p className="text-amber-800 text-xs font-medium">
                            ⚠️ Legal Reminder: By creating a class, you confirm you are an authorised educator. This platform handles specific student data under your instruction.
                        </p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Class Name *</label>
                            <input
                                type="text"
                                value={newClassName}
                                onChange={(e) => setNewClassName(e.target.value)}
                                placeholder="e.g. Year 10 English - Set 2"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                <select
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="English Language">English Language</option>
                                    <option value="English Literature">English Literature</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Year Group</label>
                                <input
                                    type="text"
                                    value={yearGroup}
                                    onChange={(e) => setYearGroup(e.target.value)}
                                    placeholder="e.g. Year 11"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Exam Board Focus</label>
                            <select
                                value={examBoard}
                                onChange={(e) => setExamBoard(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="Edexcel">Edexcel (Default)</option>
                                <option value="AQA">AQA</option>
                                <option value="Eduqas">Eduqas</option>
                                <option value="OCR">OCR</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                AI Teacher Prompt <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <p className="text-xs text-slate-500 mb-2">
                                Provide context for the AI when generating content for this class (e.g. "Focus on weaker students", "Include more creative writing prompts").
                            </p>
                            <textarea
                                value={teacherPrompt}
                                onChange={(e) => setTeacherPrompt(e.target.value)}
                                placeholder="e.g. This is a high-ability Year 10 group. Focus on complex inference questions."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateClass}
                            disabled={creating || !newClassName.trim()}
                            className={`flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors ${creating ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {creating ? 'Creating...' : 'Create Class'}
                        </button>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
