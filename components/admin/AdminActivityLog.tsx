import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useOutletContext } from 'react-router-dom';
import { Activity, Search, Filter, User, Trash2, Edit2, Settings, Shield, LogIn, LogOut, Calendar } from 'lucide-react';

interface ActivityLog {
    id: string;
    action: string;
    actionType: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'setting' | 'other';
    userId: string;
    userEmail: string;
    targetType?: string;
    targetId?: string;
    details?: string;
    timestamp: Timestamp;
    ipAddress?: string;
}

const AdminActivityLog: React.FC = () => {
    const context = useOutletContext<{ darkMode: boolean }>();
    const darkMode = context?.darkMode || false;

    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('7');

    const cardClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const textClass = darkMode ? 'text-white' : 'text-slate-900';
    const textMutedClass = darkMode ? 'text-slate-400' : 'text-slate-500';

    useEffect(() => {
        loadLogs();
    }, [dateFilter]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const daysAgo = parseInt(dateFilter);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

            const q = query(
                collection(db, 'activityLogs'),
                where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
                orderBy('timestamp', 'desc'),
                limit(200)
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ActivityLog[];
            setLogs(data);
        } catch (e) {
            console.error('Failed to load activity logs', e);
            // If no logs exist yet or collection doesn't exist, just show empty
            setLogs([]);
        }
        setLoading(false);
    };

    const filteredLogs = logs.filter(log => {
        if (filterType !== 'all' && log.actionType !== filterType) return false;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            return (
                log.userEmail?.toLowerCase().includes(lower) ||
                log.action?.toLowerCase().includes(lower) ||
                log.details?.toLowerCase().includes(lower)
            );
        }
        return true;
    });

    const getActionIcon = (type: string) => {
        switch (type) {
            case 'login': return <LogIn size={16} className="text-green-500" />;
            case 'logout': return <LogOut size={16} className="text-slate-400" />;
            case 'create': return <Edit2 size={16} className="text-blue-500" />;
            case 'update': return <Settings size={16} className="text-amber-500" />;
            case 'delete': return <Trash2 size={16} className="text-red-500" />;
            case 'setting': return <Shield size={16} className="text-purple-500" />;
            default: return <Activity size={16} className={textMutedClass} />;
        }
    };

    const getActionBadge = (type: string) => {
        const styles: Record<string, string> = {
            login: 'bg-green-100 text-green-800',
            logout: 'bg-slate-100 text-slate-600',
            create: 'bg-blue-100 text-blue-800',
            update: 'bg-amber-100 text-amber-800',
            delete: 'bg-red-100 text-red-800',
            setting: 'bg-purple-100 text-purple-800',
            other: 'bg-slate-100 text-slate-600'
        };
        return styles[type] || styles.other;
    };

    if (loading) return <div className={`p-8 text-center ${textMutedClass}`}>Loading activity logs...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className={`text-2xl font-bold ${textClass}`}>Activity Log</h1>
                <p className={textMutedClass}>Track all admin actions and system events.</p>
            </div>

            {/* Filters */}
            <div className={`flex items-center gap-4 flex-wrap p-4 rounded-xl border ${cardClass}`}>
                <div className="flex items-center gap-2">
                    <Filter size={18} className={textMutedClass} />
                    <span className={`text-sm font-medium ${textMutedClass}`}>Filters:</span>
                </div>

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className={`px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200'
                        }`}
                >
                    <option value="all">All Actions</option>
                    <option value="login">Logins</option>
                    <option value="logout">Logouts</option>
                    <option value="create">Creates</option>
                    <option value="update">Updates</option>
                    <option value="delete">Deletes</option>
                    <option value="setting">Settings</option>
                </select>

                <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className={`px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200'
                        }`}
                >
                    <option value="1">Last 24 hours</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                </select>

                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} />
                    <input
                        type="text"
                        placeholder="Search by email or action..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200'
                            }`}
                    />
                </div>

                <span className={`text-sm ${textMutedClass}`}>
                    {filteredLogs.length} events
                </span>
            </div>

            {/* Logs List */}
            <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                {filteredLogs.length === 0 ? (
                    <div className="p-12 text-center">
                        <Activity size={48} className={`mx-auto mb-4 ${textMutedClass}`} />
                        <p className={textMutedClass}>No activity logs found.</p>
                        <p className={`text-sm ${textMutedClass} mt-2`}>Activity will be recorded as admins perform actions.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredLogs.map((log) => (
                            <div key={log.id} className={`p-4 ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} transition-colors`}>
                                <div className="flex items-start gap-4">
                                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                        {getActionIcon(log.actionType)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-medium ${textClass}`}>{log.action}</span>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getActionBadge(log.actionType)}`}>
                                                {log.actionType}
                                            </span>
                                        </div>
                                        <div className={`flex items-center gap-3 text-sm ${textMutedClass}`}>
                                            <span className="flex items-center gap-1">
                                                <User size={14} />
                                                {log.userEmail}
                                            </span>
                                            {log.targetType && (
                                                <span>Target: {log.targetType} {log.targetId ? `(${log.targetId.substring(0, 8)}...)` : ''}</span>
                                            )}
                                        </div>
                                        {log.details && (
                                            <p className={`text-sm mt-1 ${textMutedClass}`}>{log.details}</p>
                                        )}
                                    </div>
                                    <div className={`text-right text-sm ${textMutedClass}`}>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            {log.timestamp?.seconds
                                                ? new Date(log.timestamp.seconds * 1000).toLocaleDateString()
                                                : 'Unknown'}
                                        </div>
                                        <div className="text-xs mt-1">
                                            {log.timestamp?.seconds
                                                ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString()
                                                : ''}
                                        </div>
                                        {log.ipAddress && (
                                            <div className="text-xs mt-1 font-mono">{log.ipAddress}</div>
                                        )}
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

export default AdminActivityLog;
