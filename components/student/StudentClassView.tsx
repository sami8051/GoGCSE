import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Classroom, Assignment } from '../../types';
import { ArrowLeft, FileText, Clock, BookOpen, AlertCircle, CheckCircle, Award, User } from 'lucide-react';

interface AssignmentResult {
    id: string;
    assignmentId: string;
    studentId: string;
    score: number;
    maxScore: number;
    percentage?: number;
    completedAt: number;
    feedback?: string;
    detailedResults?: any[];
    markingStatus?: string;
}

const StudentClassView: React.FC = () => {
    const { classId } = useParams<{ classId: string }>();
    const navigate = useNavigate();
    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [results, setResults] = useState<Record<string, AssignmentResult>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewingResult, setViewingResult] = useState<AssignmentResult | null>(null);
    const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);

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

            // 4. Load student's results for these assignments
            const resultsQuery = query(
                collection(db, 'assignment_results'),
                where('classId', '==', classId),
                where('studentId', '==', auth.currentUser.uid)
            );
            const resultsSnapshot = await getDocs(resultsQuery);
            const resultsMap: Record<string, AssignmentResult> = {};
            resultsSnapshot.docs.forEach(doc => {
                const data = doc.data() as AssignmentResult;
                resultsMap[data.assignmentId] = { id: doc.id, ...data };
            });
            setResults(resultsMap);

        } catch (error) {
            console.error('Error loading class data:', error);
            setError('Failed to load class information');
        }

        setLoading(false);
    };

    const handleStartAssignment = (assignmentId: string) => {
        navigate(`/student/assignment/${assignmentId}`);
    };

    const handleViewResult = (assignmentId: string) => {
        const result = results[assignmentId];
        const assignment = assignments.find(a => a.id === assignmentId);
        if (result && assignment) {
            setViewingResult(result);
            setViewingAssignment(assignment);
        }
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/student/classroom')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium"
                    >
                        <ArrowLeft size={18} />
                        Back to My Classes
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-sm font-bold text-gray-800">
                            {auth.currentUser?.displayName || 'Student'}
                        </div>
                        <div className="text-xs text-gray-500">
                            Student
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                        {auth.currentUser?.photoURL ? (
                            <img src={auth.currentUser.photoURL} alt="Student" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <User size={20} />
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="p-8">
            <div className="max-w-6xl mx-auto">

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
                                                {assignment.settings?.timeLimitMinutes && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs font-medium">
                                                            {assignment.settings.timeLimitMinutes} min limit
                                                        </span>
                                                    </>
                                                )}
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

                                    {results[assignment.id] ? (
                                        <div className="space-y-3">
                                            {results[assignment.id].markingStatus === 'complete' ? (
                                                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle className="text-green-600" size={24} />
                                                        <div>
                                                            <p className="font-bold text-green-900">Completed & Marked</p>
                                                            <p className="text-sm text-green-700">
                                                                Score: {results[assignment.id].score}/{results[assignment.id].maxScore} 
                                                                ({Math.round(results[assignment.id].percentage || 0)}%)
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleViewResult(assignment.id)}
                                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                                                    >
                                                        View Results
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <Clock className="text-amber-600" size={24} />
                                                        <div>
                                                            <p className="font-bold text-amber-900">Submitted</p>
                                                            <p className="text-sm text-amber-700">Awaiting teacher feedback</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleStartAssignment(assignment.id)}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <FileText size={18} />
                                            Start Assignment
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Results Modal */}
            {viewingResult && viewingAssignment && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl my-8">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-2xl">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Award className="text-white" size={32} />
                                        <h2 className="text-2xl font-bold text-white">{viewingAssignment.title}</h2>
                                    </div>
                                    <div className="flex items-center gap-4 text-green-50">
                                        <span>Completed {new Date(viewingResult.completedAt).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span className="font-bold text-white">
                                            Score: {viewingResult.score}/{viewingResult.maxScore} ({Math.round(viewingResult.percentage || 0)}%)
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setViewingResult(null);
                                        setViewingAssignment(null);
                                    }}
                                    className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Overall Feedback */}
                        {viewingResult.feedback && (
                            <div className="p-6 border-b border-slate-200 bg-slate-50">
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Overall Feedback</h3>
                                <p className="text-slate-700 whitespace-pre-wrap">{viewingResult.feedback}</p>
                            </div>
                        )}

                        {/* Detailed Results */}
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Question-by-Question Breakdown</h3>
                            <div className="space-y-4">
                                {viewingResult.detailedResults && viewingResult.detailedResults.length > 0 ? (
                                    viewingResult.detailedResults.map((result: any, index: number) => (
                                        <div key={index} className="bg-white border border-slate-200 rounded-xl p-5">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-slate-900">Question {result.questionNumber}</h4>
                                                <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
                                                    result.marksAwarded === result.maxMarks 
                                                        ? 'bg-green-100 text-green-700' 
                                                        : result.marksAwarded >= result.maxMarks * 0.6
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {result.marksAwarded}/{result.maxMarks} marks
                                                </span>
                                            </div>
                                            
                                            {result.feedback && (
                                                <div className="mb-3">
                                                    <p className="text-sm font-semibold text-slate-600 mb-1">Feedback:</p>
                                                    <p className="text-slate-700 text-sm">{result.feedback}</p>
                                                </div>
                                            )}
                                            
                                            {result.strengths && (
                                                <div className="mb-2 p-3 bg-green-50 rounded-lg">
                                                    <p className="text-xs font-bold text-green-800 mb-1">✓ Strengths</p>
                                                    <p className="text-sm text-green-900">{result.strengths}</p>
                                                </div>
                                            )}
                                            
                                            {result.improvements && (
                                                <div className="p-3 bg-blue-50 rounded-lg">
                                                    <p className="text-xs font-bold text-blue-800 mb-1">💡 Areas for Improvement</p>
                                                    <p className="text-sm text-blue-900">{result.improvements}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-500">
                                        <p>Detailed feedback not available</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setViewingResult(null);
                                    setViewingAssignment(null);
                                }}
                                className="w-full mt-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default StudentClassView;
