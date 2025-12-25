import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db, getAllUsers } from '../../services/firebase';
import { useOutletContext } from 'react-router-dom';
import { Shield, Search, User, Calendar, AlertTriangle, LogIn, Ban, CheckCircle, Clock, MapPin, RefreshCw } from 'lucide-react';

interface LoginEvent {
    id: string;
    userId: string;
    email: string;
    success: boolean;
    timestamp: Timestamp;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
}

interface UserSession {
    id: string;
    email: string;
    displayName: string;
    lastLogin?: Timestamp;
    failedAttempts: number;
    disabled: boolean;
}

const AdminSecurity: React.FC = () => {
    const context = useOutletContext<{ darkMode: boolean }>();
    const darkMode = context?.darkMode || false;

    const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
    const [users, setUsers] = useState<UserSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'logins' | 'failed' | 'sessions'>('logins');
    const [searchTerm, setSearchTerm] = useState('');

    const cardClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const textClass = darkMode ? 'text-white' : 'text-slate-900';
    const textMutedClass = darkMode ? 'text-slate-400' : 'text-slate-500';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load login events
            try {
                const eventsQuery = query(
                    collection(db, 'loginEvents'),
                    orderBy('timestamp', 'desc'),
                    limit(100)
                );
                const eventsSnapshot = await getDocs(eventsQuery);
                setLoginEvents(eventsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as LoginEvent[]);
            } catch (e) {
                setLoginEvents([]);
            }

            // Load users
            const usersData = await getAllUsers();
            setUsers(usersData.map((u: any) => ({
                id: u.id,
                email: u.email,
                displayName: u.displayName,
                lastLogin: u.metadata?.lastSignInTime ? Timestamp.fromDate(new Date(u.metadata.lastSignInTime)) : null,
                failedAttempts: u.failedAttempts || 0,
                disabled: u.disabled || false
            })));
        } catch (e) {
            console.error('Failed to load security data', e);
        }
        setLoading(false);
    };

    const toggleUserDisabled = async (userId: string, currentStatus: boolean) => {
        if (!window.confirm(`${currentStatus ? 'Enable' : 'Disable'} this user?`)) return;

        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { disabled: !currentStatus });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, disabled: !currentStatus } : u));
        } catch (e) {
            console.error('Failed to toggle user status', e);
            alert('Failed to update user status');
        }
    };

    const filteredEvents = loginEvents.filter(e => {
        if (activeTab === 'failed' && e.success) return false;
        if (searchTerm) {
            return e.email?.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
    });

    const filteredUsers = users.filter(u => {
        if (searchTerm) {
            return u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
    });

    const stats = {
        totalLogins: loginEvents.filter(e => e.success).length,
        failedAttempts: loginEvents.filter(e => !e.success).length,
        activeUsers: users.filter(u => !u.disabled).length,
        disabledUsers: users.filter(u => u.disabled).length
    };

    if (loading) return <div className={`p-8 text-center ${textMutedClass}`}>Loading security data...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={`text-2xl font-bold ${textClass}`}>Security Center</h1>
                    <p className={textMutedClass}>Monitor login activity and manage user access.</p>
                </div>
                <button
                    onClick={loadData}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                >
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl border ${cardClass}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <LogIn size={20} className="text-green-600" />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${textClass}`}>{stats.totalLogins}</p>
                            <p className={`text-sm ${textMutedClass}`}>Successful Logins</p>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${cardClass}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertTriangle size={20} className="text-red-600" />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${textClass}`}>{stats.failedAttempts}</p>
                            <p className={`text-sm ${textMutedClass}`}>Failed Attempts</p>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${cardClass}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <User size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${textClass}`}>{stats.activeUsers}</p>
                            <p className={`text-sm ${textMutedClass}`}>Active Users</p>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${cardClass}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <Ban size={20} className="text-slate-600" />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${textClass}`}>{stats.disabledUsers}</p>
                            <p className={`text-sm ${textMutedClass}`}>Disabled Users</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                {[
                    { id: 'logins', label: 'Login History', icon: LogIn },
                    { id: 'failed', label: 'Failed Attempts', icon: AlertTriangle },
                    { id: 'sessions', label: 'User Sessions', icon: User }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id
                                ? (darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-sm')
                                : textMutedClass
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} />
                <input
                    type="text"
                    placeholder="Search by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-white border-slate-200'
                        }`}
                />
            </div>

            {/* Content */}
            {activeTab === 'sessions' ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                    <table className="w-full text-left">
                        <thead className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                            <tr className={`text-xs uppercase font-semibold ${textMutedClass}`}>
                                <th className="px-5 py-3">User</th>
                                <th className="px-5 py-3">Last Login</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className={darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}>
                                    <td className="px-5 py-4">
                                        <div className={`font-medium ${textClass}`}>{user.displayName || 'Anonymous'}</div>
                                        <div className={`text-sm ${textMutedClass}`}>{user.email}</div>
                                    </td>
                                    <td className={`px-5 py-4 text-sm ${textMutedClass}`}>
                                        {user.lastLogin
                                            ? new Date(user.lastLogin.seconds * 1000).toLocaleString()
                                            : 'Never'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {user.disabled ? (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                                Disabled
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button
                                            onClick={() => toggleUserDisabled(user.id, user.disabled)}
                                            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${user.disabled
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                }`}
                                        >
                                            {user.disabled ? 'Enable' : 'Disable'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className={`px-5 py-12 text-center ${textMutedClass}`}>
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                    {filteredEvents.length === 0 ? (
                        <div className="p-12 text-center">
                            <Shield size={48} className={`mx-auto mb-4 ${textMutedClass}`} />
                            <p className={textMutedClass}>No login events recorded yet.</p>
                            <p className={`text-sm ${textMutedClass} mt-2`}>Events will appear as users log in.</p>
                        </div>
                    ) : (
                        <div className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                            {filteredEvents.map((event) => (
                                <div key={event.id} className={`p-4 ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${event.success ? 'bg-green-100' : 'bg-red-100'}`}>
                                            {event.success
                                                ? <CheckCircle size={20} className="text-green-600" />
                                                : <AlertTriangle size={20} className="text-red-600" />
                                            }
                                        </div>
                                        <div className="flex-1">
                                            <div className={`font-medium ${textClass}`}>{event.email}</div>
                                            <div className={`text-sm ${textMutedClass}`}>
                                                {event.success ? 'Successful login' : event.reason || 'Failed attempt'}
                                            </div>
                                        </div>
                                        <div className={`text-right text-sm ${textMutedClass}`}>
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {event.timestamp?.seconds
                                                    ? new Date(event.timestamp.seconds * 1000).toLocaleString()
                                                    : 'Unknown'}
                                            </div>
                                            {event.ipAddress && (
                                                <div className="flex items-center gap-1 justify-end mt-1 text-xs font-mono">
                                                    <MapPin size={12} />
                                                    {event.ipAddress}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminSecurity;
