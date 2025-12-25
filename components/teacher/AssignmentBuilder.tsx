import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../services/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { GeminiService } from '../../services/geminiService';
import { ArrowLeft, Sparkles, Save, RefreshCw } from 'lucide-react';
import { Assignment } from '../../types';

const AssignmentBuilder: React.FC = () => {
    const { classId } = useParams<{ classId: string }>();
    const navigate = useNavigate();

    // Form State
    const [topic, setTopic] = useState("");
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Mixed'>("Medium");
    const [numQuestions, setNumQuestions] = useState(5);
    const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | undefined>(undefined);
    const [customInstructions, setCustomInstructions] = useState("");

    // UI State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedExam, setGeneratedExam] = useState<any>(null); // Using 'any' briefly to match Gemini output structure
    const [isSaving, setIsSaving] = useState(false);

    const handleGenerate = async () => {
        if (!topic) return;
        setIsGenerating(true);
        try {
            const gemini = new GeminiService();
            const result = await gemini.generatePracticeSet(topic, difficulty, numQuestions);

            if (result && result.questions) {
                setGeneratedExam(result);
            } else {
                throw new Error("Invalid response from AI");
            }

        } catch (error) {
            console.error("Generation failed:", error);
            alert("Failed to generate questions. Please try again.");
        }
        setIsGenerating(false);
    };

    const handleSaveAssignment = async () => {
        if (!generatedExam || !auth.currentUser || !classId) {
            console.error('Missing required data:', { generatedExam: !!generatedExam, user: !!auth.currentUser, classId });
            alert('Missing required information. Please try again.');
            return;
        }
        setIsSaving(true);
        try {
            // Build settings object, only include timeLimitMinutes if it's defined
            const settings: any = {
                topic,
                difficulty,
            };
            if (timeLimitMinutes !== undefined && timeLimitMinutes !== null) {
                settings.timeLimitMinutes = timeLimitMinutes;
            }

            const newAssignment: Partial<Assignment> = {
                classId,
                teacherId: auth.currentUser.uid,
                title: generatedExam.title,
                questions: generatedExam.questions,
                settings,
                status: 'archived',
                createdAt: Date.now()
            };

            console.log('Attempting to save assignment:', newAssignment);
            const docRef = await addDoc(collection(db, 'assignments'), newAssignment);
            console.log('Assignment saved successfully with ID:', docRef.id);
            navigate(`/teacher/class/${classId}`);
        } catch (error: any) {
            console.error("Save failed:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
            alert(`Failed to save assignment: ${error.message || 'Unknown error'}`);
        }
        setIsSaving(false);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <button
                onClick={() => navigate(`/teacher/class/${classId}`)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium"
            >
                <ArrowLeft size={18} />
                Cancel & Back
            </button>

            <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Create New Assignment</h1>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Configuration */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Sparkles className="text-purple-500" size={20} />
                            AI Configuration
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Topic / Theme</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g. Macbeth Act 1, Persuasive Writing, Grammar..."
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Difficulty</label>
                                    <select
                                        value={difficulty}
                                        onChange={(e: any) => setDifficulty(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    >
                                        <option value="Easy">Foundation (Easy)</option>
                                        <option value="Medium">Standard (Medium)</option>
                                        <option value="Hard">Advanced (Hard)</option>
                                        <option value="Mixed">Mixed Ability</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Questions</label>
                                    <select
                                        value={numQuestions}
                                        onChange={(e: any) => setNumQuestions(Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    >
                                        <option value={3}>3 Questions</option>
                                        <option value={5}>5 Questions</option>
                                        <option value={10}>10 Questions</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Time Limit (Optional)</label>
                                <select
                                    value={timeLimitMinutes || ''}
                                    onChange={(e: any) => setTimeLimitMinutes(e.target.value ? Number(e.target.value) : undefined)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                >
                                    <option value="">No time limit</option>
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>1 hour</option>
                                    <option value={90}>1.5 hours</option>
                                    <option value={120}>2 hours</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    Set a time limit for students to complete this assignment. Leave blank for no limit.
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleGenerate}
                                    disabled={!topic || isGenerating}
                                    className={`w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg transition-all ${isGenerating ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02]'}`}
                                >
                                    {isGenerating ? 'Generating Questions...' : 'Generate with AI'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Preview */}
                <div className="space-y-6">
                    {generatedExam ? (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
                            <h2 className="text-lg font-bold text-slate-900 mb-2">{generatedExam.title}</h2>
                            <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 space-y-4 mb-4">
                                {generatedExam.questions.map((q: any, i: number) => (
                                    <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-bold text-slate-700">Q{q.number}</span>
                                            <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">{q.marks} Marks</span>
                                        </div>
                                        <p className="text-slate-600 text-sm mb-3">{q.text}</p>
                                        {q.answerKey && (
                                            <div className="mt-3 pt-3 border-t border-slate-200">
                                                <p className="text-xs font-semibold text-green-700 mb-1">📝 Answer Key (Teacher Only):</p>
                                                <p className="text-xs text-slate-500 italic">{q.answerKey}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    onClick={handleGenerate}
                                    className="flex-1 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={18} /> Regenerate
                                </button>
                                <button
                                    onClick={handleSaveAssignment}
                                    disabled={isSaving}
                                    className="flex-[2] py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save size={18} /> {isSaving ? 'Saving...' : 'Assign to Class'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 p-8">
                            <Sparkles size={48} className="mb-4 opacity-50" />
                            <p className="text-center">Configure your topic and settings,<br />then click Generate to preview.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssignmentBuilder;
