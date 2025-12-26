import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Classroom } from '../../types';
import { ArrowLeft, Users, BookOpen } from 'lucide-react';

const ViewTeacherClasses: React.FC = () => {
    const { teacherId } = useParams<{ teacherId: string }>();
    const navigate = useNavigate();
    const [classes, setClasses] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [teacherName, setTeacherName] = useState<string>('');
    const [classMemberCounts, setClassMemberCounts] = useState<Record<string, number>>({});
    const targetIsSelf = !teacherId || (auth.currentUser && teacherId === auth.currentUser.uid);
    const effectiveTeacherId = teacherId || auth.currentUser?.uid;

    useEffect(() => {
        if (effectiveTeacherId) {
            loadTeacherAndClasses();
        }
    }, [teacherId, auth.currentUser]);

    const loadTeacherAndClasses = async () => {
        if (!effectiveTeacherId) return;
        setLoading(true);
        try {
            // Get teacher name
            const userDoc = await getDoc(doc(db, 'users', effectiveTeacherId));
            if (userDoc.exists()) {
                setTeacherName(userDoc.data().displayName || userDoc.data().email || 'Teacher');
            }

            // Get all classes for this teacher
            const q = query(collection(db, 'classes'), where('teacherId', '==', effectiveTeacherId));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classroom));
            setClasses(data.sort((a, b) => b.createdAt - a.createdAt));

            // Load actual member counts from subcollections
            const counts: Record<string, number> = {};
            for (const classDoc of data) {
                const membersSnapshot = await getDocs(collection(db, 'classes', classDoc.id, 'members'));
                counts[classDoc.id] = membersSnapshot.size;
            }
            setClassMemberCounts(counts);
        } catch (error) {
            console.error("Error loading teacher classes:", error);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <button
                    onClick={() => navigate('/admin/users')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium"
                >
                    <ArrowLeft size={18} />
                    Back to Users
                </button>
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {!targetIsSelf && (
                <button
                    onClick={() => navigate('/admin/users')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium"
                >
                    <ArrowLeft size={18} />
                    Back to Users
                </button>
            )}

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{teacherName}'s Classes</h1>
                    <p className="text-slate-500 mt-1">Viewing all classes created by this teacher.</p>
                </div>
            </div>

            {classes.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No classes found</h3>
                    <p className="text-slate-500 max-w-md mx-auto">This teacher hasn't created any classes yet.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => navigate(`/teacher/class/${cls.id}`)}>
                                        {cls.name}
                                    </h3>
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wide">
                                        {classMemberCounts[cls.id] || 0} Students
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mb-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Connect Code:</span>
                                    <code className="text-lg font-mono font-bold text-slate-900 tracking-widest">{cls.inviteCode}</code>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/teacher/class/${cls.id}`)}
                                        className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <BookOpen size={16} />
                                        Manage
                                    </button>
                                    <button
                                        onClick={() => navigate(`/teacher/class/${cls.id}/assignments`)}
                                        className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
                                    >
                                        Assignments
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ViewTeacherClasses;
