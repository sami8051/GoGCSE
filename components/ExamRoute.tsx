import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import ExamRunner from './ExamRunner';
import { GeminiService } from '../services/geminiService';
import { StudentAnswer } from '../types';
import { Sparkles } from 'lucide-react';
import { auth, saveExamResult } from '../services/firebase';

const ExamRoute: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const examData = location.state?.examData;
    const [marking, setMarking] = useState(false);

    if (!examData) {
        return <Navigate to="/" />;
    }

    const handleFinishExam = async (answers: Record<string, StudentAnswer>, duration: number) => {
        console.log("Starting handleFinishExam with answers:", answers);
        setMarking(true);
        try {
            const gemini = new GeminiService();
            console.log("Calling gemini.markExam...");
            const examResult = await gemini.markExam(examData, answers);
            console.log("gemini.markExam completed:", examResult);

            // Add tracked duration
            examResult.duration = duration;

            // Generate model answer content
            console.log("Calling gemini.generateModelAnswers...");
            const modelAnswers = await gemini.generateModelAnswers(examData);
            console.log("gemini.generateModelAnswers completed");
            examResult.generatedModelAnswers = modelAnswers;

            // START: Save to Firebase if logged in
            // START: Save to Firebase if logged in
            // START: Save to Firebase if logged in
            if (auth.currentUser) {
                const uid = auth.currentUser.uid;
                console.log("Saving result to Firebase for user:", uid);

                // 1. Save Data First (Must await this to ensure history is updated)
                const docId = await saveExamResult(uid, examResult, examData, answers);

                if (docId) {
                    console.log("Save to Firebase successful, ID:", docId);

                    // 2. Generate & Upload PDF (Attempt this, but don't block navigation on failure, 
                    // but DO await it to ensure it finishes before unmount)
                    try {
                        const { PdfService } = await import('../services/PdfService');
                        const pdfBlob = PdfService.generateExamPdf(examResult, examData);

                        // 3. Upload PDF
                        const { uploadExamPdf, updateExamWithPdf } = await import('../services/firebase');
                        // @ts-ignore
                        const url = await uploadExamPdf(uid, docId, pdfBlob);

                        // 4. Update Doc with URL
                        if (url) {
                            await updateExamWithPdf(docId, url);
                            console.log("PDF linked to exam result successfully");
                        }
                    } catch (pdfError) {
                        console.error("PDF Generation/Upload Failed:", pdfError);
                        // Continue even if PDF fails
                    }
                } else {
                    console.error("Failed to save exam result document");
                }
            } else {
                console.log("Skipping Firebase save: User not logged in");
            }
            // END: Save to Firebase

            console.log("Navigating to /results...");
            navigate('/results', { state: { examResult, examData, answers } });
        } catch (error: any) {
            console.error("Marking failed DETAILS:", error);
            // Show more specific error to user
            let msg = "Marking failed. Please try again.";
            if (error.message.includes("API key")) msg = "AI Marking unavailable: Missing API Key.";
            if (error.message.includes("generate content")) msg = "AI Service Error: Failed to generate report.";

            alert(`${msg}\n\nTechnical Details: ${error.message || error}`);
            setMarking(false);
        }
    };

    const handleDiscardExam = () => {
        navigate('/dashboard');
    };

    if (marking) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-8">
                <div className="animate-spin text-edexcel-blue mb-6">
                    <Sparkles size={48} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Grading Assessment</h2>
                <p className="text-gray-500 max-w-md">AI Examiner is marking your scripts against the Edexcel 1EN0 criteria...</p>
            </div>
        );
    }

    return <ExamRunner paper={examData} onFinish={handleFinishExam} onDiscard={handleDiscardExam} />;
};

export default ExamRoute;
