import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../services/firebase';
import { doc, getDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { Assignment, Question, StudentAnswer } from '../../types';
import { Clock, CheckCircle, AlertCircle, ArrowLeft, Timer } from 'lucide-react';
import { GeminiService } from '../../services/geminiService';

const AssignmentRunner: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [startTime, setStartTime] = useState<number>(Date.now());
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadAssignment();
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [assignmentId]);

    useEffect(() => {
        if (assignment?.settings?.timeLimitMinutes) {
            const totalSeconds = assignment.settings.timeLimitMinutes * 60;
            setTimeRemaining(totalSeconds);
            setStartTime(Date.now());

            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev === null || prev <= 0) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        // Auto-submit when time runs out
                        handleSubmit(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            };
        }
    }, [assignment]);

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

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerColor = () => {
        if (timeRemaining === null) return 'text-slate-600';
        const totalTime = (assignment?.settings?.timeLimitMinutes || 0) * 60;
        const percentage = (timeRemaining / totalTime) * 100;
        
        if (percentage > 50) return 'text-green-600';
        if (percentage > 25) return 'text-amber-600';
        return 'text-red-600';
    };

    const handleSubmit = async (autoSubmit = false) => {
        if (!autoSubmit && !window.confirm("Submit assignment? You cannot change your answers after submitting.")) return;
        if (!auth.currentUser || !assignment) return;
        
        // Clear timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        setSubmitting(true);

        try {
            // Transform answers record to array for storage
            const answersArray = Object.values(answers);
            const studentAnswersText = assignment.questions.map(q => 
                answers[q.id || q.number]?.text || ''
            );

            // Save initial result
            const resultRef = await addDoc(collection(db, 'assignment_results'), {
                assignmentId: assignment.id,
                classId: assignment.classId,
                studentId: auth.currentUser.uid,
                studentName: auth.currentUser.displayName || 'Student',
                score: 0, // Will be updated after marking
                maxScore: assignment.questions.reduce((sum, q) => sum + q.marks, 0),
                answers: answersArray,
                completedAt: Date.now(),
                feedback: "AI is marking your assignment...",
                timeSpent: Math.floor((Date.now() - startTime) / 1000),
                markingStatus: 'pending'
            });

            // Auto-mark the assignment using AI
            try {
                const gemini = new GeminiService();
                const markingResult = await gemini.markAssignment(assignment.id!, studentAnswersText);

                // Update result with marking data
                await updateDoc(doc(db, 'assignment_results', resultRef.id), {
                    score: markingResult.totalMarks,
                    percentage: markingResult.percentage,
                    feedback: markingResult.overallFeedback,
                    detailedResults: markingResult.results,
                    markingStatus: 'complete',
                    markedAt: Date.now()
                });

                if (autoSubmit) {
                    alert(`Time's up! Your assignment has been auto-marked.\n\nScore: ${markingResult.totalMarks}/${markingResult.totalPossible} (${Math.round(markingResult.percentage)}%)`);
                } else {
                    alert(`Assignment submitted and marked!

Score: ${markingResult.totalMarks}/${markingResult.totalPossible} (${Math.round(markingResult.percentage)}%)

Check your results for detailed feedback.`);
                }
            } catch (markingError) {
                console.error("Auto-marking failed:", markingError);
                // Update with error status
                await updateDoc(doc(db, 'assignment_results', resultRef.id), {
                    feedback: "Auto-marking failed. Teacher will review manually.",
                    markingStatus: 'failed'
                });
                
                if (autoSubmit) {
                    alert("Time's up! Your assignment has been submitted (marking pending).");
                } else {
                    alert("Assignment submitted! Auto-marking failed, your teacher will review it.");
                }
            }

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
                    {/* Timer */}
                    {timeRemaining !== null && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
                            timeRemaining <= 300 ? 'border-red-500 bg-red-50' :
                            timeRemaining <= 600 ? 'border-amber-500 bg-amber-50' :
                            'border-green-500 bg-green-50'
                        }`}>
                            <Timer size={20} className={getTimerColor()} />
                            <span className={`font-mono font-bold text-lg ${getTimerColor()}`}>
                                {formatTime(timeRemaining)}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
