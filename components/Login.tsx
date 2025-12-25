import React, { useState } from 'react';
import { signInWithGoogle, registerWithEmailAndPassword, logInWithEmailAndPassword, sendVerification, saveUserConsent, checkUserConsent, updateUserConsent } from '../services/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, UserPlus, AlertTriangle, CheckCircle, ExternalLink, Shield, Info } from 'lucide-react';
import appLogo from '../assets/logo.png';

type AgeGroup = 'under13' | '13-15' | '16-17' | '18+' | 'parent' | 'teacher';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Consent & Profile state
    const [ageGroup, setAgeGroup] = useState<AgeGroup | ''>('');
    const [country, setCountry] = useState('UK');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
    const [aiConsentAccepted, setAiConsentAccepted] = useState(false);
    const [parentalConfirmed, setParentalConfirmed] = useState(false);
    const [marketingOptIn, setMarketingOptIn] = useState(false);

    const requiresParentalConfirmation = ageGroup === '13-15';
    const isUnder13 = ageGroup === 'under13';

    const canRegister = () => {
        if (!ageGroup || isUnder13) return false;
        if (!termsAccepted || !disclaimerAccepted) return false;
        if (!aiConsentAccepted) return false;
        if (requiresParentalConfirmation && !parentalConfirmed) return false;
        if (!name || !email || !password) return false;
        return true;
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const user = await signInWithGoogle();

            // Check if user has already consented
            const hasConsented = await checkUserConsent(user.uid);

            if (hasConsented) {
                navigate('/dashboard');
            } else {
                // IMPORTANT: Redirect to Legal Consent Gate
                navigate('/legal-consent');
            }
        } catch (error: any) {
            console.error("Google Sign-In Failure:", error);
            setError(`Failed to sign in with Google. ${error.message || ''}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setInfoMessage('');
        setIsLoading(true);

        try {
            if (isRegistering) {
                if (!canRegister()) {
                    setError('Please complete all required fields and checkboxes.');
                    setIsLoading(false);
                    return;
                }

                const user = await registerWithEmailAndPassword(name, email, password);

                // Save consent with explicit 'email' method
                await saveUserConsent(
                    user.uid,
                    email,
                    ageGroup as AgeGroup,
                    termsAccepted,
                    disclaimerAccepted,
                    parentalConfirmed,
                    marketingOptIn,
                    'email' // Explicit sign up method
                );

                // Store AI consent timestamp in Firestore user document
                await updateUserConsent(user.uid, {
                    aiDisclaimerAccepted: true,
                    aiConsentTimestamp: new Date().toISOString()
                });

                await sendVerification();
                setInfoMessage('Account created! Please check your email for verification.');
                setTimeout(() => navigate('/dashboard'), 3000);
            } else {
                await logInWithEmailAndPassword(email, password);
                navigate('/dashboard');
            }
        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                setError('Email is already in use.');
            } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                setError('Invalid email or password.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak (minimum 6 characters).');
            } else {
                setError('Authentication failed. Please try again.');
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 py-8 px-4 font-sans">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg relative overflow-hidden">

                {/* Header */}
                <div className="text-center mb-6">
                    <img src={appLogo} alt="Logo" className="w-20 h-20 rounded-2xl shadow-lg mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {isRegistering ? 'Create Account' : 'Welcome Back'}
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        {isRegistering ? 'Start your GCSE English practice today.' : 'Sign in to access your dashboard.'}
                    </p>
                </div>

                {/* Key Points Summary Box (Registration Only) */}
                {isRegistering && (
                    <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
                        <div className="flex items-center gap-2 font-bold mb-2 text-blue-800">
                            <Info size={16} />
                            <span>Before you start:</span>
                        </div>
                        <ul className="space-y-1 ml-1 list-disc list-inside opacity-90 text-xs sm:text-sm">
                            <li>This is a <strong>practice platform only</strong>.</li>
                            <li>We are <strong>not</strong> an exam board or awarding body.</li>
                            <li>Results are <strong>estimates</strong> and not official grades.</li>
                            <li>AI marking is automated and <strong>may be inaccurate</strong>.</li>
                        </ul>
                    </div>
                )}

                {/* Error / info messages */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start gap-2">
                        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}
                {infoMessage && (
                    <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 flex items-start gap-2">
                        <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
                        {infoMessage}
                    </div>
                )}

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {isRegistering && (
                        <>
                            {/* Age Declaration */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                                        Age Group <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={ageGroup}
                                        onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003764] focus:ring-2 focus:ring-[#003764]/20 outline-none transition-all bg-white text-sm"
                                        required
                                    >
                                        <option value="">Select Age</option>
                                        <option value="under13">Under 13</option>
                                        <option value="13-15">13-15 years</option>
                                        <option value="16-17">16-17 years</option>
                                        <option value="18+">18+ / Adult</option>
                                        <option value="parent">Parent</option>
                                        <option value="teacher">Teacher</option>
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                                        Country <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003764] focus:ring-2 focus:ring-[#003764]/20 outline-none transition-all bg-white text-sm"
                                        required
                                    >
                                        <option value="UK">United Kingdom</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            {/* Under 13 Block */}
                            {isUnder13 && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-3">
                                    <Shield size={20} className="mt-0.5 flex-shrink-0" />
                                    <div>
                                        <strong>Age Restriction</strong><br />
                                        You must be at least 13 years old to create an account. Please ask a parent to help you.
                                    </div>
                                </div>
                            )}

                            {/* Name field */}
                            {!isUnder13 && ageGroup && (
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003764] focus:ring-2 focus:ring-[#003764]/20 outline-none transition-all text-sm"
                                    required
                                />
                            )}
                        </>
                    )}

                    {/* Email & Password */}
                    {(!isRegistering || (isRegistering && ageGroup && !isUnder13)) && (
                        <>
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003764] focus:ring-2 focus:ring-[#003764]/20 outline-none transition-all text-sm"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003764] focus:ring-2 focus:ring-[#003764]/20 outline-none transition-all text-sm"
                                required
                            />
                        </>
                    )}

                    {/* Checkboxes (Register only) */}
                    {isRegistering && ageGroup && !isUnder13 && (
                        <div className="space-y-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Required Consents</p>

                            {/* Terms */}
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-gray-300 text-[#003764] focus:ring-[#003764]"
                                />
                                <span className="text-xs sm:text-sm text-gray-600 group-hover:text-gray-900 leading-snug">
                                    I agree to the{' '}
                                    <Link to="/terms" target="_blank" className="text-[#003764] font-medium hover:underline">Terms</Link>
                                    {' '}and{' '}
                                    <Link to="/privacy" target="_blank" className="text-[#003764] font-medium hover:underline">Privacy Policy</Link>.
                                    <span className="text-red-500">*</span>
                                </span>
                            </label>

                            {/* Educational Disclaimer */}
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={disclaimerAccepted}
                                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-gray-300 text-[#003764] focus:ring-[#003764]"
                                />
                                <span className="text-xs sm:text-sm text-gray-600 group-hover:text-gray-900 leading-snug">
                                    I understand GoGCSE is for <strong>practice only</strong> and does not provide official grades or qualifications.
                                    <span className="text-red-500">*</span>
                                </span>
                            </label>

                            {/* AI Content Disclaimer */}
                            <label className="flex items-start gap-3 cursor-pointer group bg-amber-50/50 p-3 rounded-lg border border-amber-200">
                                <input
                                    type="checkbox"
                                    checked={aiConsentAccepted}
                                    onChange={(e) => setAiConsentAccepted(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-gray-300 text-edexcel-blue focus:ring-edexcel-blue"
                                />
                                <span className="text-xs sm:text-sm text-amber-900 group-hover:text-amber-950 leading-snug font-medium">
                                    I agree that AI-generated content may occasionally contain errors. I will verify important information with official textbooks or my teacher.
                                    <span className="text-red-500">*</span>
                                </span>
                            </label>

                            {/* Parental Consent (13-15) */}
                            {requiresParentalConfirmation && (
                                <label className="flex items-start gap-3 cursor-pointer group bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                    <input
                                        type="checkbox"
                                        checked={parentalConfirmed}
                                        onChange={(e) => setParentalConfirmed(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded border-gray-300 text-[#003764] focus:ring-[#003764]"
                                    />
                                    <span className="text-xs sm:text-sm text-blue-800 font-medium leading-snug">
                                        My parent/guardian knows I am using this site and has given permission.
                                        <span className="text-red-500">*</span>
                                    </span>
                                </label>
                            )}

                            {/* Marketing */}
                            <label className="flex items-start gap-3 cursor-pointer group pt-2 opacity-80 hover:opacity-100">
                                <input
                                    type="checkbox"
                                    checked={marketingOptIn}
                                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-gray-300 text-edexcel-blue focus:ring-edexcel-blue"
                                />
                                <span className="text-xs text-gray-500 group-hover:text-gray-700 leading-snug">
                                    (Optional) Send me study tips and updates.
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Submit Button */}
                    {(!isRegistering || (isRegistering && !isUnder13)) && (
                        <div className="pt-2">
                            {isRegistering && ageGroup && (
                                <p className="text-xs text-center text-gray-500 mb-3 italic">
                                    All three consent checkboxes are required to create your account.
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={isLoading || (isRegistering && !canRegister())}
                                className="w-full py-3 px-4 bg-[#003764] hover:bg-[#003764]/90 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                            >
                                {isLoading ? (
                                    <span className="animate-pulse">Processing...</span>
                                ) : (
                                    <>
                                        {isRegistering ? <UserPlus size={18} /> : <LogIn size={18} />}
                                        {isRegistering ? 'Create Account' : 'Sign In'}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </form>

                {/* Google Sign-In (Login only) */}
                {!isRegistering && (
                    <>
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase tracking-widest">
                                <span className="px-2 bg-white text-gray-400">Or</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-3 text-gray-700 font-bold text-sm"
                        >
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                            Sign in with Google
                        </button>
                    </>
                )}

                {/* Toggle Mode */}
                <div className="mt-8 text-center text-sm text-gray-600 border-t border-gray-100 pt-6">
                    {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                            setAgeGroup('');
                            setTermsAccepted(false);
                            setDisclaimerAccepted(false);
                            setAiConsentAccepted(false);
                        }}
                        className="text-[#003764] hover:text-[#007fa3] font-bold hover:underline"
                    >
                        {isRegistering ? 'Sign In' : 'Sign Up'}
                    </button>
                </div>

                {/* Footer Links */}
                <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-400">
                    <Link to="/terms" target="_blank" className="hover:text-gray-600 hover:underline">Terms</Link>
                    <Link to="/privacy" target="_blank" className="hover:text-gray-600 hover:underline">Privacy</Link>
                    <Link to="/cookies" target="_blank" className="hover:text-gray-600 hover:underline">Cookies</Link>
                    <Link to="/child-privacy" target="_blank" className="hover:text-gray-600 hover:underline">Child Safety</Link>
                </div>
            </div>

            {/* Bottom Disclaimer */}
            <p className="text-[10px] text-gray-500 mt-4 text-center max-w-md px-4 leading-relaxed">
                GoGCSE is not affiliated with Pearson Edexcel, AQA, or any examination board.
                All trademarks belong to their respective owners.
            </p>
        </div>
    );
};

export default Login;
