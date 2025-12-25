import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../services/firebase';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { Assignment, Question, StudentAnswer } from '../../types';
import { Clock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

const AssignmentRunner: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAssignment();
    }, [assignmentId]);

    const loadAssignment = async () => {
        if (!assignmentId) return;
        try {
            const docRef = doc(db, 'assignments', assignmentId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setAssignment({ id: snap.id, ...snap.data() } as Assignment);
            } else {
                alert("Assignment not found.");
                navigate('/student/classroom');
            }
        } catch (error) {
            console.error("Error loading assignment:", error);
        }
        setLoading(false);
    };

    const handleAnswerChange = (questionId: string, text: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                questionId,
                text,
                timestamp: Date.now(),
                isFlagged: false
            }
        }));
    };

    const handleSubmit = async () => {
        if (!window.confirm("Submit assignment? You cannot change your answers after submitting.") || !auth.currentUser || !assignment) return;
        setSubmitting(true);

        try {
            // Transform answers record to array for storage
            const answersArray = Object.values(answers);

            // Calculate basic score? No, AI marking happens asynchronously or on-demand.
            // For Phase 1, we just save the submission. 
            // In a real app, we might trigger a Cloud Function or call the Marking API here.

            await addDoc(collection(db, 'assignment_results'), {
                assignmentId: assignment.id,
                classId: assignment.classId,
                studentId: auth.currentUser.uid,
                studentName: auth.currentUser.displayName || 'Student',
                score: 0, // Pending marking
                maxScore: assignment.questions.reduce((sum, q) => sum + q.marks, 0),
                answers: answersArray,
                completedAt: Date.now(),
                feedback: "Pending AI Marking..."
            });

            alert("Assignment submitted! Your teacher will review the results.");
            navigate('/student/classroom');

        } catch (error) {
            console.error("Submission failed:", error);
            alert("Failed to submit assignment.");
        }
        setSubmitting(false);
    };

    if (loading) return <div className="p-12 text-center text-slate-500">Loading assignment...</div>;
    if (!assignment) return null;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/student/classroom')} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{assignment.title}</h1>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">{assignment.settings.topic} • {assignment.questions.length} Questions</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Timer could go here */}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                    >
                        {submitting ? 'Submitting...' : <>Submit <CheckCircle size={18} /></>}
                    </button>
                </div>
            </div>

            {/* Questions */}
            <div className="max-w-4xl mx-auto p-6 space-y-8 mt-6">
                {assignment.questions.map((q, index) => (
                    <div key={q.id || index} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Question {index + 1}</h3>
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-sm font-medium">{q.marks} Marks</span>
                        </div>

                        <div className="prose prose-slate max-w-none mb-6">
                            <p className="whitespace-pre-wrap text-slate-800 text-lg leading-relaxed">{q.text}</p>
                        </div>

                        <textarea
                            value={answers[q.id]?.text || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            placeholder="Type your answer here..."
                            rows={6}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all text-slate-900 leading-relaxed resize-y"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AssignmentRunner;
