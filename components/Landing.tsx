import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, PlayCircle, PenTool, Sparkles, LayoutDashboard, ArrowRight, Zap, Target, Award, ChevronDown } from 'lucide-react';
import { PaperType } from '../types';
import { GeminiService } from '../services/geminiService';
import { auth, syncUserProfile, db } from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import appLogo from '../assets/logo.png';
import SEOHead from './SEOHead';



import { ADMIN_EMAILS } from '../services/firebase';

interface FeatureFlags {
    paper1Enabled: boolean;
    paper2Enabled: boolean;
    languageLabEnabled: boolean;
}

const Landing: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState("");
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [showExamModal, setShowExamModal] = useState(false);
    const [tempApiKey, setTempApiKey] = useState("");
    const [user, setUser] = useState<User | null>(null);
    const [isApproved, setIsApproved] = useState(false);
    const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
        paper1Enabled: true,
        paper2Enabled: true,
        languageLabEnabled: true
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                syncUserProfile(currentUser);

                try {
                    if (ADMIN_EMAILS.includes(currentUser.email || '')) {
                        setIsApproved(true);
                        return;
                    }

                    const docRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists() && docSnap.data().isApproved) {
                        setIsApproved(true);
                    } else {
                        setIsApproved(false);
                    }
                } catch (e) {
                    console.error("Error fetching approval", e);
                    setIsApproved(false);
                }
            } else {
                setIsApproved(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const loadFeatureFlags = async () => {
            try {
                const docRef = doc(db, 'systemSettings', 'config');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.featureFlags) {
                        setFeatureFlags({
                            paper1Enabled: data.featureFlags.paper1Enabled ?? true,
                            paper2Enabled: data.featureFlags.paper2Enabled ?? true,
                            languageLabEnabled: data.featureFlags.languageLabEnabled ?? true
                        });
                    }
                }
            } catch (e) {
                console.error('Failed to load feature flags', e);
            }
        };
        loadFeatureFlags();
    }, []);

    useEffect(() => {
        // Feature flags loading logic
    }, []);

    const handleStartExam = async (type: PaperType) => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (user && !isApproved) {
            alert("Your account is pending approval. You cannot start an exam yet.");
            return;
        }

        if (type === PaperType.PAPER_1 && !featureFlags.paper1Enabled) {
            alert('Paper 1 is currently disabled.');
            return;
        }
        if (type === PaperType.PAPER_2 && !featureFlags.paper2Enabled) {
            alert('Paper 2 is currently disabled.');
            return;
        }

        const localKey = localStorage.getItem('gemini_api_key');
        const envKey = import.meta.env.VITE_GEMINI_API_KEY;
        const hasValidKey = (localKey && localKey !== 'PLACEHOLDER_API_KEY') || (envKey && envKey !== 'PLACEHOLDER_API_KEY');

        if (!hasValidKey) {
            setShowApiKeyModal(true);
            return;
        }

        setLoading(true);
        setLoadingMsg("Creating your unique exam...");

        try {
            const gemini = new GeminiService();
            const examData = await gemini.generateExam(type, '1K');

            if (examData.questions) {
                const imagesToPreload = examData.questions.flatMap(q => q.images || []);
                if (imagesToPreload.length > 0) {
                    setLoadingMsg("Preparing materials...");
                    await Promise.all(imagesToPreload.map(url => {
                        return new Promise((resolve) => {
                            const img = new Image();
                            img.onload = () => resolve(true);
                            img.onerror = () => resolve(false);
                            img.src = url;
                        });
                    }));
                }
            }

            navigate(`/exam/${type}`, { state: { examData } });
        } catch (error) {
            console.error(error);
            alert("Failed to generate exam.");
            setLoading(false);
        }
    };

    const handleLanguageLab = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!featureFlags.languageLabEnabled) {
            alert('Language Lab is currently disabled.');
            return;
        }
        navigate('/language-lab');
    };

    const handleSaveApiKey = () => {
        if (tempApiKey.trim()) {
            localStorage.setItem('gemini_api_key', tempApiKey.trim());
            setShowApiKeyModal(false);
            setTempApiKey("");
            alert("API key saved!");
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-white">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-indigo-200 rounded-full animate-spin border-t-indigo-600"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={32} />
                </div>
                <p className="text-gray-600 mt-8 text-lg">{loadingMsg}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 overflow-y-auto overflow-x-hidden">
            <SEOHead
                title="Edexcel GCSE English Language Exam Simulator & Practice"
                description="Sit realistic Edexcel GCSE English mock exams online. Get instant AI marking, feedback, and grade estimates. Perfect for Paper 1 & 2 revision."
            />

            {/* Floating Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center bg-white/70 backdrop-blur-xl rounded-2xl px-6 py-3 shadow-lg shadow-purple-500/5 border border-white/50">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <img src={appLogo} alt="Logo" className="w-9 h-9 rounded-xl shadow-sm" />
                        <span className="font-bold text-gray-900 hidden sm:block">Go GCSE</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {user ? (
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all text-sm"
                            >
                                <LayoutDashboard size={16} />
                                <span className="hidden sm:inline">Dashboard</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all text-sm"
                            >
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Disclaimer Alert */}
                    <div className="inline-flex mb-8 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800">
                        <span className="font-semibold">⚠️ Disclaimer:</span>
                        <span className="ml-2">This is an independent educational tool. Not affiliated with exam boards or educational authorities.</span>
                    </div>
                    
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-8">
                        <Zap size={14} />
                        Powered by AI
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight">
                        Master Your
                        <span className="block bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent py-2">
                            English GCSE
                        </span>
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Unlimited AI-generated mock exams with instant marking,
                        grade predictions, and personalized feedback.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => setShowExamModal(true)}
                            disabled={user && !isApproved}
                            className={`group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all ${user && !isApproved
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-xl hover:scale-[1.02]'
                                }`}
                        >
                            {user && !isApproved ? 'Approval Pending' : 'Start Mock Exam'}
                            {(!user || isApproved) && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                        <button
                            onClick={handleLanguageLab}
                            disabled={!featureFlags.languageLabEnabled}
                            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg border-2 transition-all ${featureFlags.languageLabEnabled
                                ? 'border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                                : 'border-gray-100 text-gray-300 cursor-not-allowed'
                                }`}
                        >
                            <PenTool size={20} />
                            Language Lab
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="group p-8 bg-white rounded-3xl border border-gray-100 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-500/5 transition-all">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Sparkles size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Generated Papers</h3>
                            <p className="text-gray-500 leading-relaxed">
                                Every exam is unique, crafted by advanced AI to match real Edexcel specifications.
                            </p>
                        </div>
                        <div className="group p-8 bg-white rounded-3xl border border-gray-100 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-500/5 transition-all">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Target size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Marking</h3>
                            <p className="text-gray-500 leading-relaxed">
                                Get detailed feedback and model answers the moment you submit.
                            </p>
                        </div>
                        <div className="group p-8 bg-white rounded-3xl border border-gray-100 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-500/5 transition-all">
                            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Award size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Grade Predictions</h3>
                            <p className="text-gray-500 leading-relaxed">
                                Track your progress with accurate grade estimates based on Edexcel boundaries.
                            </p>
                        </div>
                    </div>
                </div>
            </section>


            {/* Exam Selection Modal */}
            {showExamModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-3xl font-extrabold text-gray-900 mb-2">Choose Your Paper</h3>
                                <p className="text-gray-500">Select the type of exam you want to practice.</p>
                            </div>
                            <button
                                onClick={() => setShowExamModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Paper 1 Option */}
                            <button
                                onClick={() => { handleStartExam(PaperType.PAPER_1); setShowExamModal(false); }}
                                disabled={!featureFlags.paper1Enabled}
                                className={`relative group p-6 rounded-2xl border-2 text-left transition-all ${featureFlags.paper1Enabled
                                    ? 'border-gray-100 hover:border-purple-600 hover:bg-purple-50 hover:shadow-xl'
                                    : 'border-gray-100 opacity-50 cursor-not-allowed'
                                    }`}
                            >
                                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <BookOpen size={24} />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">Fiction & Imaginative Writing</h4>
                                <p className="text-sm text-gray-500 mb-4">Paper 1 • 1 hour 45 mins</p>
                                <ul className="text-sm text-gray-600 space-y-2">
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>19th Century Fiction</li>
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>Creative Writing</li>
                                </ul>
                            </button>

                            {/* Paper 2 Option */}
                            <button
                                onClick={() => { handleStartExam(PaperType.PAPER_2); setShowExamModal(false); }}
                                disabled={!featureFlags.paper2Enabled}
                                className={`relative group p-6 rounded-2xl border-2 text-left transition-all ${featureFlags.paper2Enabled
                                    ? 'border-gray-100 hover:border-teal-600 hover:bg-teal-50 hover:shadow-xl'
                                    : 'border-gray-100 opacity-50 cursor-not-allowed'
                                    }`}
                            >
                                <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <FileText size={24} />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">Non-Fiction & Transactional</h4>
                                <p className="text-sm text-gray-500 mb-4">Paper 2 • 2 hours 05 mins</p>
                                <ul className="text-sm text-gray-600 space-y-2">
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-teal-400 rounded-full"></div>20th/21st Century Texts</li>
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-teal-400 rounded-full"></div>Persuasive Writing</li>
                                </ul>
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* API Key Modal */}
            {showApiKeyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Configure API Key</h3>
                        <p className="text-gray-500 mb-6">
                            Enter your Gemini API key to generate exams.
                        </p>

                        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-6">
                            <p className="text-sm text-purple-800">
                                Get your key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google AI Studio</a>
                            </p>
                        </div>

                        <input
                            type="password"
                            value={tempApiKey}
                            onChange={(e) => setTempApiKey(e.target.value)}
                            placeholder="Paste API key..."
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl mb-6 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowApiKeyModal(false); setTempApiKey(""); }}
                                className="flex-1 py-4 text-gray-600 font-semibold bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveApiKey}
                                className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl hover:shadow-lg transition-all"
                            >
                                Save Key
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Landing;
