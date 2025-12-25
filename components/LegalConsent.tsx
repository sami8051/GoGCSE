
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth'; // Added imports
import { Shield, Check, AlertTriangle, FileText, Lock } from 'lucide-react';

const LegalConsent: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [agreedTerms, setAgreedTerms] = useState(false);
    const [agreedPrivacy, setAgreedPrivacy] = useState(false);
    const [agreedDisclaimer, setAgreedDisclaimer] = useState(false);
    const [confirmedAge, setConfirmedAge] = useState(false);
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
            if (!currentUser) {
                navigate('/login');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleAccept = async () => {
        if (!user) return;

        if (!agreedTerms || !agreedPrivacy || !agreedDisclaimer || !confirmedAge) {
            setError("You must agree to all mandatory legal terms to proceed.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const consentVersion = "2.0-dec-2024";
            const timestamp = serverTimestamp();

            // 1. Ensure user document exists first (with merge to avoid overwriting)
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                createdAt: timestamp,
                hasConsented: true,
                consentVersion,
                consentedAt: timestamp,
                status: 'pending', // Set to pending - requires admin approval
                isApproved: false, // Mark as unapproved initially
                updatedAt: timestamp
            }, { merge: true });

            // 2. Audit Trail: Create an immutable event record in userConsents/{uid}/events
            try {
                // Ensure parent document exists
                await setDoc(doc(db, 'userConsents', user.uid), {
                    userId: user.uid,
                    createdAt: timestamp
                }, { merge: true });

                // Then add the event
                await addDoc(collection(db, 'userConsents', user.uid, 'events'), {
                    action: 'accepted_legal_terms',
                    consentVersion,
                    acceptedTerms: agreedTerms,
                    acceptedPrivacy: agreedPrivacy,
                    acceptedDisclaimer: agreedDisclaimer,
                    confirmedAge13Plus: confirmedAge,
                    marketingOptIn: marketingOptIn,
                    timestamp,
                    userAgent: navigator.userAgent
                });
            } catch (auditErr) {
                console.warn("Failed to create audit trail, continuing anyway:", auditErr);
                // Don't fail the entire flow if audit trail fails
            }

            // 3. Redirect to pending approval page
            navigate('/pending-approval');

        } catch (err) {
            console.error("Consent failed:", err);
            setError("Failed to save your consent. Please check your connection and try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="bg-edexcel-blue px-8 py-6 text-white text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <Shield className="mx-auto mb-3" size={48} />
                        <h1 className="text-2xl font-bold">Welcome to GoGCSE</h1>
                        <p className="text-blue-100 mt-2">Before you start practising, please review and agree to our rules.</p>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                </div>

                <div className="p-8">
                    {/* Summary Section */}
                    <div className="bg-blue-50 rounded-xl p-5 mb-8 border border-blue-100">
                        <h3 className="text-blue-900 font-bold flex items-center gap-2 mb-3">
                            <AlertTriangle size={18} />
                            Important Reminders
                        </h3>
                        <ul className="space-y-2 text-sm text-blue-800">
                            <li className="flex gap-2 items-start">
                                <span className="mt-0.5">•</span>
                                <span><strong>Practice Only:</strong> This platform is NOT an official exam and does not give real qualifications. Scores are estimates only.</span>
                            </li>
                            <li className="flex gap-2 items-start">
                                <span className="mt-0.5">•</span>
                                <span><strong>AI Content:</strong> Questions and marking are generated by AI. They may contain mistakes. Always double-check with your teacher.</span>
                            </li>
                            <li className="flex gap-2 items-start">
                                <span className="mt-0.5">•</span>
                                <span><strong>Age 13+:</strong> You must be 13 or older to use this service.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-5 mb-8">
                        {/* Terms */}
                        <label className="flex gap-4 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="pt-0.5">
                                <input
                                    type="checkbox"
                                    checked={agreedTerms}
                                    onChange={(e) => setAgreedTerms(e.target.checked)}
                                    className="w-5 h-5 text-edexcel-blue rounded focus:ring-edexcel-teal cursor-pointer"
                                />
                            </div>
                            <div>
                                <div className="font-bold text-gray-900">Terms of Service (Required)</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    I agree to the GoGCSE <a href="/terms" target="_blank" className="text-edexcel-blue underline hover:text-edexcel-teal" onClick={(e) => e.stopPropagation()}>Terms of Service</a>, including the limitation of liability and acceptable use policy.
                                </div>
                            </div>
                        </label>

                        {/* Privacy */}
                        <label className="flex gap-4 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="pt-0.5">
                                <input
                                    type="checkbox"
                                    checked={agreedPrivacy}
                                    onChange={(e) => setAgreedPrivacy(e.target.checked)}
                                    className="w-5 h-5 text-edexcel-blue rounded focus:ring-edexcel-teal cursor-pointer"
                                />
                            </div>
                            <div>
                                <div className="font-bold text-gray-900">Privacy Policy (Required)</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    I have read the <a href="/privacy" target="_blank" className="text-edexcel-blue underline hover:text-edexcel-teal" onClick={(e) => e.stopPropagation()}>Privacy Policy</a> and understand how my data (email, exam answers) is processed.
                                </div>
                            </div>
                        </label>

                        {/* Disclaimers & Age */}
                        <label className="flex gap-4 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="pt-0.5">
                                <input
                                    type="checkbox"
                                    checked={agreedDisclaimer}
                                    onChange={(e) => setAgreedDisclaimer(e.target.checked)}
                                    className="w-5 h-5 text-edexcel-blue rounded focus:ring-edexcel-teal cursor-pointer"
                                />
                            </div>
                            <div>
                                <div className="font-bold text-gray-900">Educational Disclaimer (Required)</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    I understand this is a practice tool used at my own risk. Results are not official.
                                </div>
                            </div>
                        </label>

                        <label className="flex gap-4 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="pt-0.5">
                                <input
                                    type="checkbox"
                                    checked={confirmedAge}
                                    onChange={(e) => setConfirmedAge(e.target.checked)}
                                    className="w-5 h-5 text-edexcel-blue rounded focus:ring-edexcel-teal cursor-pointer"
                                />
                            </div>
                            <div>
                                <div className="font-bold text-gray-900">Age Confirmation (Required)</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    I confirm I am 13 years of age or older.
                                </div>
                            </div>
                        </label>

                        {/* Marketing */}
                        <label className="flex gap-4 p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors">
                            <div className="pt-0.5">
                                <input
                                    type="checkbox"
                                    checked={marketingOptIn}
                                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                                    className="w-5 h-5 text-edexcel-blue rounded focus:ring-edexcel-teal cursor-pointer"
                                />
                            </div>
                            <div>
                                <div className="font-bold text-gray-700">Stay Updated (Optional)</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    Email me about new features and exam tips. Unsubscribe anytime.
                                </div>
                            </div>
                        </label>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleAccept}
                        disabled={submitting || !agreedTerms || !agreedPrivacy || !agreedDisclaimer || !confirmedAge}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${(submitting || !agreedTerms || !agreedPrivacy || !agreedDisclaimer || !confirmedAge)
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-edexcel-blue text-white hover:bg-edexcel-teal shadow-lg hover:shadow-xl'
                            }`}
                    >
                        {submitting ? 'Setting up account...' : 'Accept & Continue to Dashboard'}
                    </button>

                    <div className="text-center mt-6 text-xs text-gray-400">
                        GoGCSE Platform v2.0 • London, UK
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalConsent;
