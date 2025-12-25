import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db, ADMIN_EMAILS } from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Sparkles } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isApproved, setIsApproved] = useState(false);
    const [hasConsented, setHasConsented] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Check approval status and consent
                try {
                    // Admins are always approved and consented (bypass)
                    if (ADMIN_EMAILS.includes(currentUser.email || '')) {
                        setIsApproved(true);
                        setHasConsented(true);
                        setLoading(false);
                        return;
                    }

                    const docRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setIsApproved(!!data.isApproved);
                        setHasConsented(!!data.hasConsented);
                    } else {
                        setIsApproved(false);
                        setHasConsented(false);
                    }
                } catch (e) {
                    console.error("Error fetching user status", e);
                    setIsApproved(false);
                    setHasConsented(false);
                }
            } else {
                // No user
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
                <Sparkles className="animate-spin text-edexcel-blue" size={32} />
                <p className="text-gray-500 animate-pulse text-sm font-medium">Verifying access...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Consent Check: Ensure user has signed terms (required for all users)
    if (!hasConsented) {
        return <Navigate to="/legal-consent" replace />;
    }

    // Allow access for all users (approved or unapproved)
    // Unapproved users can access dashboard, join classrooms, do assignments, manage profiles
    return <>{children}</>;
};

export default ProtectedRoute;
