import React, { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Classroom, Assignment } from '../../types';
import { Users, FileText, ArrowRight, BookOpen, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentClassroom: React.FC = () => {
    const [myClasses, setMyClasses] = useState<Classroom[]>([]);
    const [joinCode, setJoinCode] = useState("");
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (auth.currentUser) {
            loadMyClasses();
        }
    }, [auth.currentUser]);

    const loadMyClasses = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            // In Phase 1, we can't easily query "collectionGroup" for membership without an index or ID array.
            // PROPER APPROACH: User document should track enrolledClassIds.
            // As a fallback/hack for Phase 1 without changing User schema too much:
            // We search user's subcollection of "enrolled_classes" OR check explicit membership.
            // Let's assume we store enrollment in `users/{uid}/enrolled_classes/{classId}`
            // OR we just scan classes where `members/{uid}` exists? Checking subcollections across parents is hard.
            // DESIGN CHANGE: We'll read from `users/{uid}/enrolled_classes` which we write to on join.

            const enrollmentRef = collection(db, 'users', auth.currentUser.uid, 'enrolled_classes');
            const enrollmentSnap = await getDocs(enrollmentRef);

            const classIds = enrollmentSnap.docs.map(d => d.id);
            if (classIds.length === 0) {
                setMyClasses([]);
                setLoading(false);
                return;
            }

            // Fetch actual class details
            // Firestore "in" query allows up to 10 IDs. If more, we need batching. Phase 1 assumes < 10.
            const chunks = [];
            for (let i = 0; i < classIds.length; i += 10) {
                chunks.push(classIds.slice(i, i + 10));
            }

            const allClasses: Classroom[] = [];
            for (const chunk of chunks) {
                const q = query(collection(db, 'classes'), where('__name__', 'in', chunk));
                const snap = await getDocs(q);
                snap.forEach(d => allClasses.push({ id: d.id, ...d.data() } as Classroom));
            }

            setMyClasses(allClasses);

        } catch (error) {
            console.error("Error loading classes:", error);
        }
        setLoading(false);
    };

    const handleJoinClass = async () => {
        if (!joinCode || !auth.currentUser) return;
        setJoining(true);
        try {
            console.log('[StudentClassroom] Attempting to join class with code:', joinCode.trim().toUpperCase());
            console.log('[StudentClassroom] Current user UID:', auth.currentUser.uid);
            console.log('[StudentClassroom] Current user display name:', auth.currentUser.displayName);
            
            // 1. Find class by invite code
            const q = query(collection(db, 'classes'), where('inviteCode', '==', joinCode.trim().toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.error('[StudentClassroom] No class found with code:', joinCode.trim().toUpperCase());
                alert("Invalid class code.");
                setJoining(false);
                return;
            }

            const classDoc = querySnapshot.docs[0];
            const classId = classDoc.id;
            const classData = classDoc.data();
            console.log('[StudentClassroom] Found class:', classId, classData.name);

            // Check if user is already a member
            const memberDoc = await getDoc(doc(db, 'classes', classId, 'members', auth.currentUser.uid));
            if (memberDoc.exists()) {
                console.warn('[StudentClassroom] User is already a member of this class');
                alert(`You are already enrolled in ${classData.name}!`);
                setJoining(false);
                return;
            }

            // 2. Add student to class/members subcollection
            console.log('[StudentClassroom] Adding member to class/members subcollection...');
            await setDoc(doc(db, 'classes', classId, 'members', auth.currentUser.uid), {
                uid: auth.currentUser.uid,
                displayName: auth.currentUser.displayName || 'Unknown Student',
                joinedAt: Date.now()
            });
            console.log('[StudentClassroom] Successfully added to class/members');

            // 3. Add class to user's enrolled_classes subcollection (for easy listing)
            console.log('[StudentClassroom] Adding class to user/enrolled_classes subcollection...');
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'enrolled_classes', classId), {
                joinedAt: Date.now(),
                name: classData.name
            });
            console.log('[StudentClassroom] Successfully added to user/enrolled_classes');

            // 4. Update student count (optional, using increment would be better but simple read/write for now)
            // skipping count update for safety/conflict avoidance in client-side code

            alert(`Successfully joined ${classData.name}!`);
            setJoinCode("");
            loadMyClasses();

        } catch (error: any) {
            console.error('[StudentClassroom] Join failed with error:', error);
            console.error('[StudentClassroom] Error code:', error.code);
            console.error('[StudentClassroom] Error message:', error.message);
            console.error('[StudentClassroom] Full error object:', error);
            
            let errorMessage = "Failed to join class. ";
            if (error.code === 'permission-denied') {
                errorMessage += "Permission denied. Make sure your account is approved.";
            } else if (error.code) {
                errorMessage += `Error: ${error.code}`;
            } else {
                errorMessage += "Please try again.";
            }
            
            alert(errorMessage);
        }
        setJoining(false);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium"
            >
                <ArrowLeft size={18} />
                Back to Dashboard
            </button>
            
            <h1 className="text-3xl font-bold text-slate-900 mb-8">My Classroom</h1>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Left: Join Class */}
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-50">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Search className="text-indigo-600" size={20} />
                            Join a Class
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            Enter the 6-character code shared by your teacher.
                        </p>
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="e.g. AB12CD"
                            maxLength={6}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center text-lg tracking-widest mb-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                        />
                        <button
                            onClick={handleJoinClass}
                            disabled={joining || joinCode.length < 3}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                        >
                            {joining ? 'Joining...' : 'Join Class'}
                        </button>
                    </div>
                </div>

                {/* Right: My Classes */}
                <div className="md:col-span-2">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Enrolled Classes</h2>
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Loading your classes...</div>
                    ) : myClasses.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center">
                            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-600">No classes yet</h3>
                            <p className="text-slate-400">Join a class to see your assignments here.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {myClasses.map(cls => (
                                <div key={cls.id} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group cursor-pointer" onClick={() => navigate(`/student/class/${cls.id}`)}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{cls.name}</h3>
                                            <p className="text-slate-500 text-sm mt-1">Joined {new Date().toLocaleDateString()}</p>
                                        </div>
                                        <ArrowRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentClassroom;
