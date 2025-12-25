import React, { useState } from 'react';
import { logOut } from '../services/firebase';
import { ShieldAlert, LogOut, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PendingApproval: React.FC = () => {
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logOut();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 font-sans p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-slate-100">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 animate-pulse">
                    <ShieldAlert size={40} />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Account Pending Approval
                </h1>
                
                <p className="text-xs font-semibold text-amber-600 bg-amber-50 rounded-lg py-2 px-3 mb-6 inline-block">
                    Status: Awaiting Admin Review
                </p>

                <p className="text-gray-600 mb-6 leading-relaxed">
                    Thank you for signing up! Your account is currently awaiting administrative approval.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <Mail size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-left text-sm text-blue-800">
                            <p className="font-semibold mb-1">What happens next?</p>
                            <p>An administrator will review your account and send you an email once approved. You'll then have full access to the dashboard and exam services.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 px-4 bg-edexcel-blue hover:bg-edexcel-blue/90 text-white rounded-xl transition-colors font-bold"
                    >
                        Go to Home Page
                    </button>

                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full py-3 px-4 bg-red-50 border-2 border-red-200 hover:bg-red-100 text-red-700 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <LogOut size={18} />
                        {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                </div>

                <p className="text-xs text-gray-400 mt-6 border-t border-gray-100 pt-4">
                    GoGCSE Platform • Need help? Contact support
                </p>
            </div>
        </div>
    );
};

export default PendingApproval;
