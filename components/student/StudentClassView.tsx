import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Classroom, Assignment } from '../../types';
import { ArrowLeft, FileText, Clock, BookOpen, AlertCircle } from 'lucide-react';

const StudentClassView: React.FC = () => {
    const { classId } = useParams<{ classId: string }>();
    const navigate = useNavigate();
    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (classId && auth.currentUser) {
            loadClassData();
        }
    }, [classId, auth.currentUser]);

    const loadClassData = async () => {
        if (!classId || !auth.currentUser) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Load classroom details
            const classDoc = await getDoc(doc(db, 'classes', classId));
            if (!classDoc.exists()) {
                setError('Class not found');
                setLoading(false);
                return;
            }

            const classData = { id: classDoc.id, ...classDoc.data() } as Classroom;
            setClassroom(classData);

            // 2. Verify student is a member
            const memberDoc = await getDoc(doc(db, 'classes', classId, 'members', auth.currentUser.uid));
            if (!memberDoc.exists()) {
                setError('You are not enrolled in this class');
                setLoading(false);
                return;
            }

            // 3. Load assignments for this class
            const assignmentsQuery = query(
                collection(db, 'assignments'),
                where('classId', '==', classId),
                where('status', '==', 'active')
            );
            const assignmentsSnapshot = await getDocs(assignmentsQuery);
            const assignmentsData = assignmentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Assignment));

            // Sort by creation date (newest first)
            assignmentsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setAssignments(assignmentsData);

        } catch (error) {
            console.error('Error loading class data:', error);
            setError('Failed to load class information');
        }

        setLoading(false);
    };

    const handleStartAssignment = (assignmentId: string) => {
        navigate(`/student/assignment/${assignmentId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading class...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md">
                    <AlertCircle size={64} className="mx-auto text-red-400 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Error</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/student/classroom')}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                    >
                        Back to My Classes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <button
                    onClick={() => navigate('/student/classroom')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium"
                >
                    <ArrowLeft size={18} />
                    Back to My Classes
                </button>

                {/* Class Info */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 mb-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">{classroom?.name}</h1>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                    <BookOpen size={16} />
                                    {classroom?.config?.subject || 'English Language'}
                                </span>
                                {classroom?.config?.yearGroup && (
                                    <>
                                        <span>•</span>
                                        <span>{classroom.config.yearGroup}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Class Code</p>
                            <code className="text-lg font-mono font-bold text-slate-900 tracking-widest bg-slate-100 px-3 py-1 rounded">
                                {classroom?.inviteCode}
                            </code>
                        </div>
                    </div>
                </div>

                {/* Assignments List */}
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Assignments</h2>

                    {assignments.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-300 text-center">
                            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-600 mb-2">No assignments yet</h3>
                            <p className="text-slate-400">
                                Your teacher hasn't posted any assignments for this class.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {assignments.map((assignment) => (
                                <div
                                    key={assignment.id}
                                    className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                                                {assignment.title}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <FileText size={14} />
                                                    {assignment.questions?.length || 0} Questions
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    Added {new Date(assignment.createdAt || Date.now()).toLocaleDateString()}
                                                </span>
                                                {assignment.settings?.difficulty && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                            {assignment.settings.difficulty}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            {assignment.settings?.topic && (
                                                <p className="text-sm text-slate-600 mt-2">
                                                    <span className="font-medium">Topic:</span> {assignment.settings.topic}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleStartAssignment(assignment.id)}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FileText size={18} />
                                        Start Assignment
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentClassView;
