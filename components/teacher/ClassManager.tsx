import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, getDoc, collection, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { Classroom, ClassMember, Assignment } from '../../types';
import { Users, FileText, ArrowLeft, Trash2, Clock, CheckCircle, Eye, Edit2, X, Award, TrendingUp } from 'lucide-react';
import { GeminiService } from '../../services/geminiService';

interface AssignmentResult {
    id: string;
    assignmentId: string;
    studentId: string;
    studentName: string;
    score: number;
    maxScore: number;
    percentage?: number;
    completedAt: number;
    feedback?: string;
    detailedResults?: any[];
    markingStatus?: string;
}

const ClassManager: React.FC = () => {
    const { classId } = useParams<{ classId: string }>();
    const navigate = useNavigate();
    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [members, setMembers] = useState<ClassMember[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'students' | 'assignments'>('assignments');
    const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
    const [editingTitle, setEditingTitle] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [editingTimeLimit, setEditingTimeLimit] = useState(false);
    const [newTimeLimit, setNewTimeLimit] = useState<number | undefined>(undefined);
    const [viewingSubmissions, setViewingSubmissions] = useState<Assignment | null>(null);
    const [submissions, setSubmissions] = useState<AssignmentResult[]>([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const [selectedResult, setSelectedResult] = useState<AssignmentResult | null>(null);

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
            setViewingAssignment(null);
        } catch (error) {
            console.error("Error deleting assignment:", error);
            alert("Failed to delete assignment.");
        }
    };

    const handleViewAssignment = (assignment: Assignment) => {
        setViewingAssignment(assignment);
        setNewTitle(assignment.title || '');
        setEditingTitle(false);
        setNewTimeLimit(assignment.settings?.timeLimitMinutes);
        setEditingTimeLimit(false);
    };

    const handleUpdateTitle = async () => {
        if (!viewingAssignment || !newTitle.trim()) return;
        try {
            await updateDoc(doc(db, 'assignments', viewingAssignment.id), {
                title: newTitle.trim()
            });
            setAssignments(prev => prev.map(a => 
                a.id === viewingAssignment.id ? { ...a, title: newTitle.trim() } : a
            ));
            setViewingAssignment({ ...viewingAssignment, title: newTitle.trim() });
            setEditingTitle(false);
        } catch (error) {
            console.error("Error updating title:", error);
            alert("Failed to update title.");
        }
    };

    const handleUpdateTimeLimit = async () => {
        if (!viewingAssignment) return;
        try {
            const updateData: any = {
                'settings.timeLimitMinutes': newTimeLimit || null
            };
            
            await updateDoc(doc(db, 'assignments', viewingAssignment.id), updateData);
            
            const updatedSettings = {
                ...viewingAssignment.settings,
                timeLimitMinutes: newTimeLimit
            };
            
            setAssignments(prev => prev.map(a => 
                a.id === viewingAssignment.id ? { ...a, settings: updatedSettings } : a
            ));
            setViewingAssignment({ ...viewingAssignment, settings: updatedSettings });
            setEditingTimeLimit(false);
        } catch (error) {
            console.error("Error updating time limit:", error);
            alert("Failed to update time limit.");
        }
    };

    const handleToggleStatus = async (assignmentId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'archived' : 'active';
        try {
            await updateDoc(doc(db, 'assignments', assignmentId), {
                status: newStatus
            });
            setAssignments(prev => prev.map(a => 
                a.id === assignmentId ? { ...a, status: newStatus } : a
            ));
            if (viewingAssignment?.id === assignmentId) {
                setViewingAssignment({ ...viewingAssignment, status: newStatus });
            }
        } catch (error) {
            console.error("Error toggling status:", error);
            alert("Failed to update status.");
        }
    };

    const handleViewSubmissions = async (assignment: Assignment) => {
        setViewingSubmissions(assignment);
        setLoadingSubmissions(true);
        try {
            const resultsQuery = query(
                collection(db, 'assignment_results'),
                where('assignmentId', '==', assignment.id)
            );
            const resultsSnapshot = await getDocs(resultsQuery);
            const results = resultsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AssignmentResult));
            setSubmissions(results);
        } catch (error) {
            console.error("Error loading submissions:", error);
            alert("Failed to load submissions.");
        }
        setLoadingSubmissions(false);
    };

    const handleMarkAllSubmissions = async () => {
        if (!viewingSubmissions) return;
        
        const pendingSubmissions = submissions.filter(s => s.markingStatus === 'pending');
        if (pendingSubmissions.length === 0) {
            alert("All submissions have already been marked!");
            return;
        }

        if (!window.confirm(`This will use AI to mark ${pendingSubmissions.length} pending submission(s). Continue?`)) return;

        setMarkingAll(true);
        const gemini = new GeminiService();
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        for (const submission of pendingSubmissions) {
            try {
                console.log('Marking submission:', submission.id);
                console.log('Student:', submission.studentName);
                console.log('Assignment ID:', viewingSubmissions.id);
                
                // Extract student answers
                const studentAnswers = submission.answers?.map((a: any) => a.text || '') || [];
                console.log('Student answers:', studentAnswers);
                
                if (studentAnswers.length === 0) {
                    throw new Error('No answers found in submission');
                }
                
                // Call AI marking service
                console.log('Calling AI marking service...');
                const markingResult = await gemini.markAssignment(viewingSubmissions.id!, studentAnswers);
                console.log('Marking result:', markingResult);

                // Update result in Firestore
                await updateDoc(doc(db, 'assignment_results', submission.id), {
                    score: markingResult.totalMarks,
                    percentage: markingResult.percentage,
                    feedback: markingResult.overallFeedback,
                    detailedResults: markingResult.results,
                    markingStatus: 'complete',
                    markedAt: Date.now()
                });

                console.log('Successfully marked:', submission.studentName);
                successCount++;
            } catch (error: any) {
                console.error(`Failed to mark submission ${submission.id}:`, error);
                const errorMsg = error.message || 'Unknown error';
                errors.push(`${submission.studentName}: ${errorMsg}`);
                failCount++;
            }
        }

        setMarkingAll(false);
        
        let message = `Marking complete!\n\n✅ Successfully marked: ${successCount}\n❌ Failed: ${failCount}`;
        if (errors.length > 0) {
            message += '\n\nErrors:\n' + errors.join('\n');
        }
        alert(message);
        
        // Reload submissions
        await handleViewSubmissions(viewingSubmissions);
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
                                    <button 
                                        onClick={() => handleViewAssignment(assignment)}
                                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Eye size={16} />
                                        View Details
                                    </button>
                                    <button 
                                        onClick={() => handleViewSubmissions(assignment)}
                                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition-colors flex items-center gap-2"
                                    >
                                        <TrendingUp size={16} />
                                        Submissions
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(assignment.id, assignment.status || 'active')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                            assignment.status === 'active' 
                                                ? 'bg-green-50 hover:bg-green-100 text-green-600' 
                                                : 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                                        }`}
                                    >
                                        {assignment.status === 'active' ? 'Published' : 'Archived'}
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

            {/* Assignment Details Modal */}
            {viewingAssignment && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl my-8">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-start">
                            <div className="flex-1">
                                {editingTitle ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            className="flex-1 text-2xl font-bold text-slate-900 border-b-2 border-indigo-500 focus:outline-none"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleUpdateTitle}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setEditingTitle(false)}
                                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-bold text-slate-900">{viewingAssignment.title || 'Untitled Assignment'}</h2>
                                        <button
                                            onClick={() => setEditingTitle(true)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit title"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    </div>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Clock size={14} />
                                        Created {new Date(viewingAssignment.createdAt || Date.now()).toLocaleDateString()}
                                    </span>
                                    <span className={`px-2 py-1 rounded font-bold text-xs uppercase ${
                                        viewingAssignment.status === 'active' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {viewingAssignment.status || 'active'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingAssignment(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {/* Assignment Info */}
                            <div className="grid md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Difficulty</p>
                                    <p className={`text-lg font-bold ${
                                        viewingAssignment.settings?.difficulty === 'Easy' ? 'text-green-600' :
                                        viewingAssignment.settings?.difficulty === 'Medium' ? 'text-amber-600' :
                                        'text-red-600'
                                    }`}>{viewingAssignment.settings?.difficulty || 'N/A'}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Topic</p>
                                    <p className="text-lg font-bold text-slate-900">{viewingAssignment.settings?.topic || 'N/A'}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Questions</p>
                                    <p className="text-lg font-bold text-slate-900">{viewingAssignment.questions?.length || 0}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Time Limit</p>
                                    {editingTimeLimit ? (
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={newTimeLimit || ''}
                                                onChange={(e) => setNewTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                                                className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="">No limit</option>
                                                <option value="15">15 min</option>
                                                <option value="30">30 min</option>
                                                <option value="45">45 min</option>
                                                <option value="60">1 hour</option>
                                                <option value="90">1.5 hours</option>
                                                <option value="120">2 hours</option>
                                            </select>
                                            <button
                                                onClick={handleUpdateTimeLimit}
                                                className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                                title="Save"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingTimeLimit(false);
                                                    setNewTimeLimit(viewingAssignment.settings?.timeLimitMinutes);
                                                }}
                                                className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                                                title="Cancel"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <p className="text-lg font-bold text-slate-900">
                                                {viewingAssignment.settings?.timeLimitMinutes 
                                                    ? `${viewingAssignment.settings.timeLimitMinutes} min` 
                                                    : 'No limit'}
                                            </p>
                                            <button
                                                onClick={() => setEditingTimeLimit(true)}
                                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="Edit time limit"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Questions List */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Questions</h3>
                                <div className="space-y-4">
                                    {viewingAssignment.questions?.map((question, index) => (
                                        <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-indigo-600">Question {question.number}</span>
                                                <span className="text-sm bg-slate-200 px-2 py-1 rounded text-slate-600 font-medium">
                                                    {question.marks} marks
                                                </span>
                                            </div>
                                            <p className="text-slate-700 whitespace-pre-wrap">{question.text}</p>
                                            {question.guidance && (
                                                <p className="text-sm text-slate-500 mt-2 italic">Guidance: {question.guidance}</p>
                                            )}
                                            {question.aos && question.aos.length > 0 && (
                                                <div className="flex gap-2 mt-2">
                                                    {question.aos.map((ao, i) => (
                                                        <span key={i} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium">
                                                            {ao}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {question.answerKey && (
                                                <div className="mt-3 pt-3 border-t border-green-200 bg-green-50 -mx-4 -mb-4 px-4 py-3 rounded-b-xl">
                                                    <p className="text-xs font-bold text-green-800 mb-1 flex items-center gap-1">
                                                        <span className="text-sm">📝</span> Answer Key / Marking Guidance
                                                    </p>
                                                    <p className="text-sm text-green-900 whitespace-pre-wrap">{question.answerKey}</p>
                                                </div>
                                            )}
                                        </div>
                                    )) || <p className="text-slate-500 italic">No questions available</p>}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                                <button
                                    onClick={() => handleToggleStatus(viewingAssignment.id, viewingAssignment.status || 'active')}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                                        viewingAssignment.status === 'active'
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                    }`}
                                >
                                    {viewingAssignment.status === 'active' ? 'Published - Click to Archive' : 'Archived - Click to Publish'}
                                </button>
                                <button
                                    onClick={() => handleDeleteAssignment(viewingAssignment.id)}
                                    className="flex-1 py-3 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-colors"
                                >
                                    Delete Assignment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Submissions Modal */}
            {viewingSubmissions && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl my-8">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{viewingSubmissions.title} - Submissions</h2>
                                    <p className="text-slate-500">Total Submissions: {submissions.length} | Pending: {submissions.filter(s => s.markingStatus === 'pending').length}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setViewingSubmissions(null);
                                        setSubmissions([]);
                                        setSelectedResult(null);
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            
                            {/* Mark All Button */}
                            {submissions.some(s => s.markingStatus === 'pending') && (
                                <button
                                    onClick={handleMarkAllSubmissions}
                                    disabled={markingAll}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {markingAll ? (
                                        <>⏳ Marking in progress...</>
                                    ) : (
                                        <>🤖 Mark All Pending with AI ({submissions.filter(s => s.markingStatus === 'pending').length})</>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Submissions List */}
                        <div className="p-6">
                            {loadingSubmissions ? (
                                <div className="py-12 text-center text-slate-500">Loading submissions...</div>
                            ) : submissions.length === 0 ? (
                                <div className="py-12 text-center">
                                    <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700">No Submissions Yet</h3>
                                    <p className="text-slate-500">Students haven't submitted this assignment yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {submissions.map((result) => (
                                        <div key={result.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">
                                                        {result.studentName?.charAt(0) || 'S'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-slate-900">{result.studentName || 'Unknown Student'}</h4>
                                                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={14} />
                                                                Submitted {new Date(result.completedAt).toLocaleDateString()}
                                                            </span>
                                                            {result.markingStatus === 'complete' ? (
                                                                <>
                                                                    <span className="flex items-center gap-1">
                                                                        <Award size={14} />
                                                                        {result.score}/{result.maxScore} ({Math.round(result.percentage || 0)}%)
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                                        (result.percentage || 0) >= 80 ? 'bg-green-100 text-green-700' :
                                                                        (result.percentage || 0) >= 60 ? 'bg-blue-100 text-blue-700' :
                                                                        (result.percentage || 0) >= 40 ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>
                                                                        {(result.percentage || 0) >= 80 ? 'Excellent' :
                                                                         (result.percentage || 0) >= 60 ? 'Good' :
                                                                         (result.percentage || 0) >= 40 ? 'Pass' : 'Needs Improvement'}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
                                                                    ⏳ Pending Review
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedResult(result)}
                                                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-medium transition-colors"
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Individual Result Modal */}
            {selectedResult && viewingSubmissions && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl my-8">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-2xl">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Award className="text-white" size={32} />
                                        <h2 className="text-2xl font-bold text-white">{selectedResult.studentName}'s Result</h2>
                                    </div>
                                    <div className="flex items-center gap-4 text-indigo-50">
                                        <span>Completed {new Date(selectedResult.completedAt).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span className="font-bold text-white">
                                            Score: {selectedResult.score}/{selectedResult.maxScore} ({Math.round(selectedResult.percentage || 0)}%)
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedResult(null)}
                                    className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Overall Feedback */}
                        {selectedResult.feedback && (
                            <div className="p-6 border-b border-slate-200 bg-slate-50">
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Overall Feedback</h3>
                                <p className="text-slate-700 whitespace-pre-wrap">{selectedResult.feedback}</p>
                            </div>
                        )}

                        {/* Detailed Results */}
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Question-by-Question Breakdown</h3>
                            <div className="space-y-4">
                                {selectedResult.detailedResults && selectedResult.detailedResults.length > 0 ? (
                                    selectedResult.detailedResults.map((result: any, index: number) => (
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
                                onClick={() => setSelectedResult(null)}
                                className="w-full mt-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ClassManager;
