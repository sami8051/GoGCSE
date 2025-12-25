import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, checkIsAdmin, checkIsTeacher } from '../services/firebase';
import { Sparkles } from 'lucide-react';

const TeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAllowed, setIsAllowed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Allow if Teacher OR Admin (Admins have super-access)
                const [isAdmin, isTeacher] = await Promise.all([
                    checkIsAdmin(currentUser.uid),
                    checkIsTeacher(currentUser.uid)
                ]);
                setIsAllowed(isAdmin || isTeacher);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <div className="h-screen flex items-center justify-center"><Sparkles className="animate-spin text-blue-500" size={32} /></div>;

    if (!user || !isAllowed) {
        // Redirect to home if logged in but not authorized, or login if not logged in
        return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

export default TeacherRoute;
