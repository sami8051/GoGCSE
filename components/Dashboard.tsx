import React, { useEffect, useState } from 'react';
import { auth, getUserHistory, logOut, deleteExamResult, db, ADMIN_EMAILS, checkIsTeacher } from '../services/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { LogOut, User as UserIcon, BookOpen, Clock, Award, ChevronRight, Printer, Trash2, Bell, X, Info, AlertTriangle, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import profileIcon from '../assets/profile_icon.png';
import appLogo from '../assets/logo.png';
import ProfileModal from './ProfileModal';
import SEOHead from './SEOHead';

interface Announcement {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
}

const Dashboard: React.FC = () => {
    const [user, setUser] = useState<User | null>(auth.currentUser);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; examId: string; examTitle: string } | null>(null);
    const [isTeacher, setIsTeacher] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            setUser(user);
            if (user) {
                // Check if user is a teacher
                const teacherStatus = await checkIsTeacher(user.uid);
                setIsTeacher(teacherStatus);
                    
                fetchHistory(user.uid);
                fetchAnnouncements();
            } else {
                setLoading(false);
            }
        });
    
        return () => unsubscribe();
    }, []);

    const fetchHistory = async (uid: string) => {
        const data = await getUserHistory(uid);
        setHistory(data);
        setLoading(false);
    };

    const fetchAnnouncements = async () => {
        try {
            const now = Timestamp.now();
            // Fetch all to avoid complex composite index on 'active' + 'createdAt'
            const q = query(collection(db, 'announcements'));
            const snapshot = await getDocs(q);
            const active = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(a => a.active === true)
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                .filter(a => {
                    if (a.startDate && a.startDate.seconds > now.seconds) return false;
                    if (a.endDate && a.endDate.seconds < now.seconds) return false;
                    return true;
                }) as Announcement[];
            setAnnouncements(active);
        } catch (e) {
            console.error('Failed to fetch announcements', e);
        }
    };

    const dismissAnnouncement = (id: string) => {
        setDismissedAnnouncements(prev => new Set(prev).add(id));
    };

    const handleLogout = async () => {
        await logOut();
        navigate('/login');
    };

    const handleDeleteExam = async (docId: string, e: React.MouseEvent, examTitle: string = 'this exam') => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, examId: docId, examTitle });
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;
        const success = await deleteExamResult(deleteModal.examId);
        if (success) {
            setHistory(prev => prev.filter(exam => exam.id !== deleteModal.examId));
        }
        setDeleteModal(null);
    };

    const getAnnouncementStyle = (type: string) => {
        switch (type) {
            case 'info': return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: Info };
            case 'success': return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: CheckCircle };
            case 'warning': return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: AlertTriangle };
            case 'error': return { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: AlertCircle };
            default: return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: Info };
        }
    };

    const visibleAnnouncements = announcements.filter(a => !dismissedAnnouncements.has(a.id));

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <SEOHead title="Student Dashboard" description="Track your Edexcel GCSE English mock exam progress and view detailed grade reports." />
            <nav className="bg-white border-b border-gray-200 py-4 px-6 md:px-12 flex flex-col md:flex-row md:justify-between md:items-center gap-4 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <img src={appLogo} alt="Logo" className="w-10 h-10 rounded-lg shadow-sm" />
                        <span className="font-bold text-lg text-gray-800">Go GCSE</span>
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                    {/* Teacher Dashboard Button - only for teachers */}
                    {isTeacher && (
                        <button
                            onClick={() => navigate('/teacher')}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg hover:from-blue-700 hover:to-cyan-700 transition-all"
                        >
                            <BookOpen size={16} />
                            <span className="hidden sm:inline">Teacher Dashboard</span>
                        </button>
                    )}
                    {/* Admin Panel Button - only for admins */}
                    {user?.email && ADMIN_EMAILS.includes(user.email) && (
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
                        >
                            <Shield size={16} />
                            <span className="hidden sm:inline">Admin Panel</span>
                        </button>
                    )}
                    <div
                        onClick={() => setShowProfileModal(true)}
                        className="flex items-center gap-2 text-sm font-bold text-gray-800 bg-white border border-gray-100 pl-1 pr-3 py-1 rounded-full shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <img
                            src={user?.photoURL || profileIcon}
                            alt="Profile"
                            className="w-8 h-8 rounded-full border border-indigo-100 object-cover"
                        />
                        <span className="hidden sm:inline">{user?.displayName || user?.email}</span>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Legal Disclaimer Banner */}
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-8 flex gap-3">
                    <span className="text-blue-600 font-bold flex-shrink-0">i</span>
                    <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Important Notice</p>
                        <p>All exam results and grades shown here are AI-generated estimates for practice purposes only. They are not official qualifications. Always verify your learning with your teacher.</p>
                    </div>
                </div>
                
                {/* Announcements */}
                {visibleAnnouncements.length > 0 && (
                    <div className="space-y-3 mb-6">
                        {visibleAnnouncements.map((announcement) => {
                            const style = getAnnouncementStyle(announcement.type);
                            const IconComponent = style.icon;
                            return (
                                <div key={announcement.id} className={`p-4 rounded-xl border ${style.bg} flex items-start gap-3`}>
                                    <IconComponent size={20} className={style.text} />
                                    <div className="flex-1">
                                        <h4 className={`font-bold ${style.text}`}>{announcement.title}</h4>
                                        <p className={`text-sm ${style.text} opacity-80`}>{announcement.message}</p>
                                    </div>
                                    <button
                                        onClick={() => dismissAnnouncement(announcement.id)}
                                        className={`p-1 rounded hover:bg-white/50 ${style.text}`}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Your Progress</h1>
                        <p className="text-gray-500 mt-1">Track your mock exams and improvement over time.</p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full sm:w-auto bg-gray-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
                    >
                        New Mock Exam
                    </button>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2 text-purple-600">
                            <BookOpen size={20} />
                            <span className="font-bold text-sm uppercase tracking-wide">Exams Taken</span>
                        </div>
                        <div className="text-4xl font-extrabold text-gray-900">{history.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2 text-teal-600">
                            <Award size={20} />
                            <span className="font-bold text-sm uppercase tracking-wide">Average Score</span>
                        </div>
                        <div className="text-4xl font-extrabold text-gray-900">
                            {history.length > 0 ? Math.round(history.reduce((acc, curr) => acc + (curr.score || 0), 0) / history.length) : '-'}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2 text-blue-600">
                            <Clock size={20} />
                            <span className="font-bold text-sm uppercase tracking-wide">Study Time</span>
                        </div>
                        {/* Calculate total study time in hours and minutes */}
                        <div className="text-4xl font-extrabold text-gray-900">
                            {(() => {
                                const totalSeconds = history.reduce((acc, curr) => acc + (curr.duration || 0), 0);
                                const h = Math.floor(totalSeconds / 3600);
                                const m = Math.floor((totalSeconds % 3600) / 60);
                                // Show mins only if hours are 0, or show both
                                if (h === 0 && m === 0) return '0m'; // Minimal base case
                                if (h === 0) return `${m}m`;
                                return `${h}h ${m}m`;
                            })()}
                        </div>
                    </div>
                    {/* Classroom Card */}
                    <div
                        onClick={() => navigate('/student/classroom')}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
                    >
                        <div className="flex items-center gap-3 mb-2 text-indigo-600">
                            <BookOpen size={20} />
                            <span className="font-bold text-sm uppercase tracking-wide group-hover:underline">My Classroom</span>
                        </div>
                        <div className="text-gray-500 text-sm">
                            Join classes & view assignments
                        </div>
                        <div className="mt-4 text-indigo-700 font-bold flex items-center gap-1 text-sm">
                            Go to Class <ChevronRight size={16} />
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <h2 className="text-xl font-bold text-gray-900 mb-4">Mock Exam History</h2>

                {
                    loading ? (
                        <div className="text-center py-12 text-gray-400">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 border-dashed">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <BookOpen size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">No exams taken yet</h3>
                            <p className="text-gray-500 mb-6 max-w-sm mx-auto">Complete your first mock exam to see your detailed analysis and grade here.</p>
                            <button
                                onClick={() => navigate('/')}
                                className="text-edexcel-blue font-bold hover:underline"
                            >
                                Start an Exam Now
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {history.map((exam, index) => (
                                <div
                                    key={exam.id || index}
                                    onClick={() => navigate('/results', {
                                        state: {
                                            examResult: {
                                                ...exam,
                                                // Handle legacy naming 'breakdown' if 'questionResults' is missing
                                                questionResults: exam.questionResults || exam.breakdown || [],
                                                // Handle 'overallFeedback' vs 'feedback'
                                                overallFeedback: exam.overallFeedback || exam.feedback || '',
                                                // Handle 'gradeEstimate'
                                                gradeEstimate: exam.gradeEstimate || 'N/A'
                                            },
                                            examData: exam.paperData || null,
                                            answers: exam.fullAnswers || {}
                                        }
                                    })}
                                    className="flex items-center p-6 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${exam.paperType === 'PAPER_1' ? 'bg-purple-100 text-purple-600' : 'bg-teal-100 text-teal-600'}`}>
                                        <span className="font-bold text-xs">{exam.paperType === 'PAPER_1' ? 'P1' : 'P2'}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900">{exam.paperType === 'PAPER_1' ? 'Fiction & Imaginative Writing' : 'Non-Fiction & Transactional'}</h3>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            {exam.date?.toDate ? new Date(exam.date.toDate()).toLocaleDateString() : 'Unknown Date'}
                                            <span className="text-gray-300">•</span>
                                            {exam.score} Marks
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <button
                                            className="inline-flex items-center text-edexcel-blue font-bold hover:text-edexcel-teal transition-colors"
                                        >
                                            View Result <ChevronRight size={16} className="ml-1" />
                                        </button>

                                        {/* Download PDF Button */}
                                        {exam.pdfUrl && (
                                            <a
                                                href={exam.pdfUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-4 inline-flex items-center text-green-600 font-bold hover:text-green-800 transition-colors text-sm"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Printer size={16} className="mr-1" /> Download PDF
                                            </a>
                                        )}

                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => handleDeleteExam(exam.id, e, exam.paperType === 'PAPER_1' ? 'Fiction & Imaginative Writing' : 'Non-Fiction & Transactional')}
                                            className="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                            title="Delete Exam"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                }
            </main >

            {/* Delete Confirmation Modal */}
            {
                deleteModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeleteModal(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="bg-red-50 p-6 flex items-center gap-4 border-b border-red-100">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="text-red-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Delete Exam Result</h3>
                                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-700">
                                    Are you sure you want to permanently delete <span className="font-semibold">"{deleteModal.examTitle}"</span>?
                                    This will remove all associated scores, feedback, and reports.
                                </p>
                            </div>
                            <div className="flex gap-3 p-6 pt-0">
                                <button
                                    onClick={() => setDeleteModal(null)}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    Delete Exam
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                user && (
                    <ProfileModal
                        isOpen={showProfileModal}
                        onClose={() => setShowProfileModal(false)}
                        user={user}
                    />
                )
            }
        </div >
    );
};

export default Dashboard;
