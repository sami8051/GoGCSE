import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, getDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { Classroom, ClassMember, Assignment } from '../../types';
import { Users, FileText, ArrowLeft, Trash2, Clock, CheckCircle } from 'lucide-react';

const ClassManager: React.FC = () => {
    const { classId } = useParams<{ classId: string }>();
    const navigate = useNavigate();
    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [members, setMembers] = useState<ClassMember[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'students' | 'assignments'>('assignments');

    useEffect(() => {
        if (classId) {
            loadClassData();
        }
    }, [classId]);

    const loadClassData = async () => {
        if (!classId) return;
        setLoading(true);
        try {
            // 1. Fetch Class Details
            const classRef = doc(db, 'classes', classId);
            const classSnap = await getDoc(classRef);
            if (classSnap.exists()) {
                setClassroom({ id: classSnap.id, ...classSnap.data() } as Classroom);
            } else {
                navigate('/teacher');
                return;
            }

            // 2. Fetch Members (Subcollection)
            const membersRef = collection(db, 'classes', classId, 'members');
            const membersSnap = await getDocs(membersRef);
            const membersData = membersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ClassMember));
            setMembers(membersData);

            // 3. Fetch Assignments
            const assignmentsRef = collection(db, 'assignments');
            const q = query(assignmentsRef, where('classId', '==', classId));
            const assignmentsSnap = await getDocs(q);
            const assignmentsData = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
            setAssignments(assignmentsData.sort((a, b) => b.createdAt - a.createdAt));

        } catch (error) {
            console.error("Error loading class data:", error);
        }
        setLoading(false);
    };

    const handleDeleteAssignment = async (assignmentId: string) => {
        if (!window.confirm("Are you sure? This will delete the assignment and all student results associated with it.")) return;
        try {
            await deleteDoc(doc(db, 'assignments', assignmentId));
            setAssignments(prev => prev.filter(a => a.id !== assignmentId));
        } catch (error) {
            console.error("Error deleting assignment:", error);
            alert("Failed to delete assignment.");
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500">Loading class details...</div>;
    if (!classroom) return <div className="p-12 text-center text-red-500">Class not found.</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <button
                onClick={() => navigate('/teacher')}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium"
            >
                <ArrowLeft size={18} />
                Back to Dashboard
            </button>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-8">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{classroom.name}</h1>
                        <div className="flex items-center gap-4 text-slate-500">
                            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg">
                                <span className="text-xs uppercase font-bold tracking-wider">Join Code:</span>
                                <span className="font-mono font-bold text-slate-900">{classroom.inviteCode}</span>
                            </div>
                            <span>•</span>
                            <span>{members.length} Students</span>
                        </div>
                    </div>
                    <div>
                        <button
                            onClick={() => navigate(`/teacher/class/${classId}/create-assignment`)}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all transform hover:scale-105"
                        >
                            + New Assignment
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-8 border-b border-slate-200 mb-8">
                <button
                    onClick={() => setActiveTab('assignments')}
                    className={`pb-4 px-2 font-bold text-lg transition-colors relative ${activeTab === 'assignments' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Assignments
                    {activeTab === 'assignments' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('students')}
                    className={`pb-4 px-2 font-bold text-lg transition-colors relative ${activeTab === 'students' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Students ({members.length})
                    {activeTab === 'students' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
                </button>
            </div>

            {/* Assignments Tab */}
            {activeTab === 'assignments' && (
                <div className="grid gap-4">
                    {assignments.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">No assignments created yet</h3>
                            <p className="text-slate-500 mb-6">Generate your first AI practice set for this class.</p>
                            <button
                                onClick={() => navigate(`/teacher/class/${classId}/create-assignment`)}
                                className="text-indigo-600 font-bold hover:underline"
                            >
                                Create Assignment
                            </button>
                        </div>
                    ) : (
                        assignments.map((assignment) => (
                            <div key={assignment.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">{assignment.title || 'Untitled Assignment'}</h3>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1"><Clock size={16} /> Created {new Date(assignment.createdAt).toLocaleDateString()}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${assignment.settings.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                                assignment.settings.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>{assignment.settings.difficulty}</span>
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 uppercase font-medium">{assignment.settings.topic}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
                                        View Results
                                    </button>
                                    <button
                                        onClick={() => handleDeleteAssignment(assignment.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4">Student Name</th>
                                <th className="px-6 py-4">Joined At</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {members.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                        No students have joined yet. Share the code <b>{classroom.inviteCode}</b> with them.
                                    </td>
                                </tr>
                            ) : members.map((student) => (
                                <tr key={student.uid} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                                            {student.displayName?.charAt(0) || 'S'}
                                        </div>
                                        {student.displayName || 'Unnamed Student'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">
                                        {student.joinedAt ? new Date(student.joinedAt).toLocaleDateString() : 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-red-400 hover:text-red-600 text-sm font-medium">Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    );
};

export default ClassManager;
