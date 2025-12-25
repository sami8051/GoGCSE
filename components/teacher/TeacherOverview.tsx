import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Classroom, Assignment } from '../../types';
import { Users, BookOpen, FileText, TrendingUp, Award, Clock, BarChart3, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClassAnalytics {
    classroom: Classroom;
    studentCount: number;
    assignmentCount: number;
    completionRate: number;
    averageScore: number;
}

const TeacherOverview: React.FC = () => {
    const [classAnalytics, setClassAnalytics] = useState<ClassAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalStudents, setTotalStudents] = useState(0);
    const [totalAssignments, setTotalAssignments] = useState(0);
    const [totalClasses, setTotalClasses] = useState(0);
    const auth = getAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadAnalytics();
    }, [auth.currentUser]);

    const loadAnalytics = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        
        try {
            console.log('Loading analytics for teacher:', auth.currentUser.uid);
            
            // 1. Load all teacher's classes
            const classesQuery = query(
                collection(db, 'classes'),
                where('teacherId', '==', auth.currentUser.uid)
            );
            const classesSnapshot = await getDocs(classesQuery);
            const classes = classesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Classroom));

            console.log('Found classes:', classes.length);
            setTotalClasses(classes.length);

            // 2. For each class, get members and assignments
            const analyticsPromises = classes.map(async (classroom) => {
                console.log('Loading analytics for class:', classroom.name);
                
                // Get members count
                const membersSnapshot = await getDocs(
                    collection(db, 'classes', classroom.id, 'members')
                );
                const studentCount = membersSnapshot.size;
                console.log(`  - Students: ${studentCount}`);

                // Get assignments for this class
                const assignmentsQuery = query(
                    collection(db, 'assignments'),
                    where('classId', '==', classroom.id)
                );
                const assignmentsSnapshot = await getDocs(assignmentsQuery);
                const assignmentCount = assignmentsSnapshot.size;
                console.log(`  - Assignments: ${assignmentCount}`);

                // Get assignment results to calculate completion rate and average score
                const assignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
                
                let totalSubmissions = 0;
                let totalScore = 0;
                let totalMaxScore = 0;

                for (const assignment of assignments) {
                    const resultsQuery = query(
                        collection(db, 'assignment_results'),
                        where('assignmentId', '==', assignment.id)
                    );
                    const resultsSnapshot = await getDocs(resultsQuery);
                    totalSubmissions += resultsSnapshot.size;
                    
                    resultsSnapshot.docs.forEach(doc => {
                        const data = doc.data();
                        totalScore += data.score || 0;
                        totalMaxScore += data.maxScore || 0;
                    });
                }

                const expectedSubmissions = studentCount * assignmentCount;
                const completionRate = expectedSubmissions > 0 
                    ? (totalSubmissions / expectedSubmissions) * 100 
                    : 0;
                
                const averageScore = totalMaxScore > 0 
                    ? (totalScore / totalMaxScore) * 100 
                    : 0;

                console.log(`  - Completion Rate: ${completionRate}%, Avg Score: ${averageScore}%`);

                return {
                    classroom,
                    studentCount,
                    assignmentCount,
                    completionRate,
                    averageScore
                };
            });

            const analytics = await Promise.all(analyticsPromises);
            console.log('Analytics loaded:', analytics.length, 'classes');
            setClassAnalytics(analytics);

            // Calculate totals
            const studentsTotal = analytics.reduce((sum, a) => sum + a.studentCount, 0);
            const assignmentsTotal = analytics.reduce((sum, a) => sum + a.assignmentCount, 0);
            setTotalStudents(studentsTotal);
            setTotalAssignments(assignmentsTotal);

        } catch (error) {
            console.error('Error loading analytics:', error);
            alert('Failed to load analytics. Check console for details.');
        }
        
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Overview</h1>
                <p className="text-slate-500 mt-1">Analytics and insights across all your classes.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-100 rounded-xl">
                            <BookOpen className="text-indigo-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Total Classes</p>
                            <p className="text-3xl font-bold text-slate-900">{totalClasses}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Users className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Total Students</p>
                            <p className="text-3xl font-bold text-slate-900">{totalStudents}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <FileText className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Assignments</p>
                            <p className="text-3xl font-bold text-slate-900">{totalAssignments}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-emerald-100 rounded-xl">
                            <TrendingUp className="text-emerald-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Avg Completion</p>
                            <p className="text-3xl font-bold text-slate-900">
                                {classAnalytics.length > 0
                                    ? Math.round(
                                          classAnalytics.reduce((sum, a) => sum + a.completionRate, 0) /
                                              classAnalytics.length
                                      )
                                    : 0}
                                %
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Individual Class Analytics */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Class Performance</h2>
                
                {classAnalytics.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
                        <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 mb-2">No Classes Yet</h3>
                        <p className="text-slate-500 mb-6">Create your first class to see analytics and insights.</p>
                        <button
                            onClick={() => navigate('/teacher/classes')}
                            className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline"
                        >
                            Go to My Classes
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {classAnalytics.map((analytics) => (
                            <div
                                key={analytics.classroom.id}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3
                                                className="text-2xl font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/teacher/class/${analytics.classroom.id}`)}
                                            >
                                                {analytics.classroom.name}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    {analytics.classroom.config?.yearGroup || 'N/A'}
                                                </span>
                                                <span>•</span>
                                                <span>{analytics.classroom.config?.subject || 'English Language'}</span>
                                                <span>•</span>
                                                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                                                    {analytics.classroom.inviteCode}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/teacher/class/${analytics.classroom.id}`)}
                                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
                                        >
                                            Manage Class
                                        </button>
                                    </div>

                                    {/* Class Stats */}
                                    <div className="grid md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users size={16} className="text-slate-400" />
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                    Students
                                                </span>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">{analytics.studentCount}</p>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FileText size={16} className="text-slate-400" />
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                    Assignments
                                                </span>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">{analytics.assignmentCount}</p>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Clock size={16} className="text-slate-400" />
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                    Completion
                                                </span>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">
                                                {Math.round(analytics.completionRate)}%
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Award size={16} className="text-slate-400" />
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                    Avg Score
                                                </span>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">
                                                {analytics.averageScore > 0 ? Math.round(analytics.averageScore) : 'N/A'}
                                                {analytics.averageScore > 0 && '%'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherOverview;
