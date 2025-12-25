import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getAllUsers, getAllExamResults } from '../../services/firebase';
import { Users, FileText, CheckCircle, TrendingUp, BarChart3, PieChart, Activity, ArrowRight, Download, Calendar, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const context = useOutletContext<{ darkMode: boolean }>();
    const darkMode = context?.darkMode || false;

    const [users, setUsers] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30');

    useEffect(() => {
        const fetchData = async () => {
            const [usersData, examsData] = await Promise.all([
                getAllUsers(),
                getAllExamResults()
            ]);
            setUsers(usersData);
            setExams(examsData);
            setLoading(false);
        };
        fetchData();
    }, []);

    // Filter exams by date range
    const filteredExams = useMemo(() => {
        if (dateRange === 'all') return exams;
        const days = parseInt(dateRange);
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        return exams.filter(e => e.date?.seconds && (e.date.seconds * 1000) >= cutoff);
    }, [exams, dateRange]);

    // Compute statistics
    const stats = useMemo(() => {
        const totalScore = filteredExams.reduce((acc, curr) => acc + (curr.totalScore || 0), 0);
        const avg = filteredExams.length > 0 ? Math.round(totalScore / filteredExams.length) : 0;
        return {
            totalUsers: users.length,
            totalExams: filteredExams.length,
            avgScore: avg,
            recentActivity: filteredExams.slice(0, 5)
        };
    }, [users, filteredExams]);

    // Create userId -> displayName map
    const userMap = useMemo(() => {
        const map: Record<string, string> = {};
        users.forEach((user: any) => {
            map[user.uid || user.id] = user.displayName || user.email || 'Unknown';
        });
        return map;
    }, [users]);

    // Grade Distribution
    const gradeDistribution = useMemo(() => {
        const grades: Record<string, number> = { '9': 0, '8': 0, '7': 0, '6': 0, '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
        filteredExams.forEach(exam => {
            const grade = exam.gradeEstimate?.toString() || '1';
            if (grades[grade] !== undefined) grades[grade]++;
        });
        return Object.entries(grades).map(([grade, count]) => ({ grade: `Grade ${grade}`, count })).reverse();
    }, [filteredExams]);

    // Paper Comparison
    const paperComparison = useMemo(() => {
        const paper1 = filteredExams.filter(e => e.paperType === 'PAPER_1' || e.paperType?.includes('1'));
        const paper2 = filteredExams.filter(e => e.paperType === 'PAPER_2' || e.paperType?.includes('2'));
        const p1Avg = paper1.length > 0 ? Math.round(paper1.reduce((a, c) => a + (c.totalScore || 0), 0) / paper1.length) : 0;
        const p2Avg = paper2.length > 0 ? Math.round(paper2.reduce((a, c) => a + (c.totalScore || 0), 0) / paper2.length) : 0;
        return [
            { name: 'Paper 1', average: p1Avg, count: paper1.length },
            { name: 'Paper 2', average: p2Avg, count: paper2.length }
        ];
    }, [filteredExams]);

    // User Retention (30 days)
    const userRetention = useMemo(() => {
        const days: Record<string, Set<string>> = {};
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            days[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = new Set();
        }
        exams.forEach(exam => {
            if (exam.date?.seconds && exam.userId) {
                const examDate = new Date(exam.date.seconds * 1000);
                const dayDiff = Math.floor((now.getTime() - examDate.getTime()) / (1000 * 60 * 60 * 24));
                if (dayDiff >= 0 && dayDiff < 30) {
                    const key = examDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (days[key]) days[key].add(exam.userId);
                }
            }
        });
        return Object.entries(days).map(([day, users]) => ({ day, activeUsers: users.size }));
    }, [exams]);

    // Performance Trends
    const performanceTrends = useMemo(() => {
        const weeklyScores: Record<string, { total: number, count: number }> = {};
        filteredExams.forEach(exam => {
            if (exam.date?.seconds) {
                const date = new Date(exam.date.seconds * 1000);
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                const key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (!weeklyScores[key]) weeklyScores[key] = { total: 0, count: 0 };
                weeklyScores[key].total += exam.totalScore || 0;
                weeklyScores[key].count++;
            }
        });
        return Object.entries(weeklyScores)
            .map(([week, data]) => ({ week, avgScore: Math.round(data.total / data.count) }))
            .slice(-8);
    }, [filteredExams]);

    // AO Breakdown
    const aoBreakdown = useMemo(() => {
        const aoTotals: Record<string, { score: number, max: number }> = {};
        filteredExams.forEach(exam => {
            exam.questionResults?.forEach((qr: any) => {
                if (qr.aos) {
                    Object.entries(qr.aos).forEach(([ao, score]: [string, any]) => {
                        if (!aoTotals[ao]) aoTotals[ao] = { score: 0, max: 0 };
                        aoTotals[ao].score += Number(score) || 0;
                        aoTotals[ao].max += qr.maxScore || 10;
                    });
                }
            });
        });
        return Object.entries(aoTotals).map(([ao, data]) => ({
            ao,
            percentage: data.max > 0 ? Math.round((data.score / data.max) * 100) : 0
        })).sort((a, b) => a.percentage - b.percentage);
    }, [filteredExams]);

    // Activity Timeline
    const activityTimeline = useMemo(() => {
        const days: Record<string, number> = {};
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            days[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
        }
        filteredExams.forEach(exam => {
            if (exam.date?.seconds) {
                const examDate = new Date(exam.date.seconds * 1000);
                const dayDiff = Math.floor((now.getTime() - examDate.getTime()) / (1000 * 60 * 60 * 24));
                if (dayDiff >= 0 && dayDiff < 7) {
                    const key = examDate.toLocaleDateString('en-US', { weekday: 'short' });
                    if (days[key] !== undefined) days[key]++;
                }
            }
        });
        return Object.entries(days).map(([day, count]) => ({ day, exams: count }));
    }, [filteredExams]);

    const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];
    const cardClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const textClass = darkMode ? 'text-white' : 'text-slate-900';
    const textMutedClass = darkMode ? 'text-slate-400' : 'text-slate-500';

    if (loading) return <div className={`p-8 text-center ${textMutedClass}`}>Loading analytics...</div>;

    const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
        <div className={`p-5 rounded-xl shadow-sm border ${cardClass}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className={`text-sm font-medium ${textMutedClass}`}>{title}</p>
                    <h3 className={`text-2xl font-bold ${textClass} mt-1`}>{value}</h3>
                    {subtitle && <p className={`text-xs ${textMutedClass} mt-1`}>{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon size={22} className="text-white" />
                </div>
            </div>
        </div>
    );

    const QuickAction = ({ label, onClick, icon: Icon }: any) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
        >
            <Icon size={16} />
            {label}
            <ArrowRight size={14} />
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${textClass}`}>Platform Overview</h1>
                    <p className={textMutedClass}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cardClass}`}>
                        <Calendar size={16} className={textMutedClass} />
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className={`bg-transparent text-sm font-medium ${textClass} focus:outline-none`}
                        >
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="all">All time</option>
                        </select>
                    </div>
                    <QuickAction label="Users" onClick={() => navigate('/admin/users')} icon={Users} />
                    <QuickAction label="Exams" onClick={() => navigate('/admin/exams')} icon={FileText} />
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Students" value={stats.totalUsers} icon={Users} color="bg-blue-500" />
                <StatCard title="Exams Completed" value={stats.totalExams} icon={FileText} color="bg-indigo-500" subtitle={dateRange === 'all' ? 'all time' : `last ${dateRange} days`} />
                <StatCard title="Average Score" value={stats.avgScore} icon={TrendingUp} color="bg-emerald-500" />
                <StatCard title="System Status" value="Active" icon={CheckCircle} color="bg-slate-500" />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Grade Distribution */}
                <div className={`p-5 rounded-xl shadow-sm border ${cardClass}`}>
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={18} className="text-indigo-500" />
                        <h3 className={`font-bold ${textClass}`}>Grade Distribution</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={gradeDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="grade" tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis allowDecimals={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Paper Comparison */}
                <div className={`p-5 rounded-xl shadow-sm border ${cardClass}`}>
                    <div className="flex items-center gap-2 mb-4">
                        <PieChart size={18} className="text-purple-500" />
                        <h3 className={`font-bold ${textClass}`}>Paper Comparison</h3>
                    </div>
                    <div className="flex items-center justify-around">
                        <ResponsiveContainer width="50%" height={180}>
                            <RechartsPie>
                                <Pie data={paperComparison} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                                    {paperComparison.map((_, idx) => (
                                        <Cell key={idx} fill={idx === 0 ? '#6366f1' : '#a855f7'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </RechartsPie>
                        </ResponsiveContainer>
                        <div className="space-y-3">
                            {paperComparison.map((paper, idx) => (
                                <div key={idx} className="text-center">
                                    <p className={`text-sm ${textMutedClass}`}>{paper.name}</p>
                                    <p className={`text-lg font-bold ${textClass}`}>Avg: {paper.average}</p>
                                    <p className={`text-xs ${textMutedClass}`}>{paper.count} exams</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* User Retention */}
                <div className={`p-5 rounded-xl shadow-sm border ${cardClass}`}>
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={18} className="text-blue-500" />
                        <h3 className={`font-bold ${textClass}`}>Active Users (30 Days)</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={userRetention.slice(-14)}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis allowDecimals={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="activeUsers" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Performance Trends */}
                <div className={`p-5 rounded-xl shadow-sm border ${cardClass}`}>
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={18} className="text-emerald-500" />
                        <h3 className={`font-bold ${textClass}`}>Score Trends (Weekly)</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={performanceTrends}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="week" tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis tick={{ fill: darkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* AO Breakdown */}
                <div className={`p-5 rounded-xl shadow-sm border ${cardClass}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={18} className="text-amber-500" />
                        <h3 className={`font-bold ${textClass}`}>AO Performance</h3>
                    </div>
                    <p className={`text-xs ${textMutedClass} mb-3`}>Weakest first</p>
                    <div className="space-y-2">
                        {aoBreakdown.length > 0 ? aoBreakdown.slice(0, 5).map((ao, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className={`font-medium ${textClass}`}>{ao.ao}</span>
                                    <span className={textMutedClass}>{ao.percentage}%</span>
                                </div>
                                <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                    <div
                                        className={`h-2 rounded-full ${ao.percentage < 50 ? 'bg-red-500' : ao.percentage < 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${ao.percentage}%` }}
                                    />
                                </div>
                            </div>
                        )) : <p className={textMutedClass}>No AO data available.</p>}
                    </div>
                </div>

                {/* Activity Timeline */}
                <div className={`p-5 rounded-xl shadow-sm border ${cardClass}`}>
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={18} className="text-emerald-500" />
                        <h3 className={`font-bold ${textClass}`}>Weekly Activity</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={activityTimeline}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis allowDecimals={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip />
                            <Bar dataKey="exams" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className={`rounded-xl shadow-sm border overflow-hidden ${cardClass}`}>
                <div className={`p-5 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <h3 className={`font-bold ${textClass}`}>Recent Submissions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                            <tr className={`text-xs uppercase font-semibold ${textMutedClass}`}>
                                <th className="px-5 py-3">User</th>
                                <th className="px-5 py-3">Paper</th>
                                <th className="px-5 py-3">Score</th>
                                <th className="px-5 py-3">Grade</th>
                                <th className="px-5 py-3">Date</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                            {stats.recentActivity.map((exam) => (
                                <tr key={exam.id} className={darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}>
                                    <td className="px-5 py-3">
                                        <div className={`text-sm font-medium ${textClass}`}>
                                            {userMap[exam.userId] || 'Unknown'}
                                        </div>
                                        <div className={`text-xs font-mono ${textMutedClass}`}>
                                            {exam.userId?.substring(0, 8)}...
                                        </div>
                                    </td>
                                    <td className={`px-5 py-3 text-sm ${textClass}`}>{exam.paperType?.includes('1') ? 'Paper 1' : 'Paper 2'}</td>
                                    <td className="px-5 py-3">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                            {exam.totalScore}/{exam.maxScore}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                                            Grade {exam.gradeEstimate || 'N/A'}
                                        </span>
                                    </td>
                                    <td className={`px-5 py-3 text-sm ${textMutedClass}`}>
                                        {exam.date?.seconds ? new Date(exam.date.seconds * 1000).toLocaleDateString() : 'Just now'}
                                    </td>
                                </tr>
                            ))}
                            {stats.recentActivity.length === 0 && (
                                <tr>
                                    <td colSpan={5} className={`px-5 py-8 text-center ${textMutedClass}`}>No recent activity.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
