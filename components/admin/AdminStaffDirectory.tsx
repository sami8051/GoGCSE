import React, { useEffect, useState } from 'react';
import { getAllUsers, db, SUPER_ADMIN_EMAILS, auth } from '../../services/firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { Search, Shield, GraduationCap, Crown, Check, X } from 'lucide-react';

const AdminStaffDirectory: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Only super admins can see/use this page effectively
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(auth.currentUser?.email || '');

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        if (!Array.isArray(users)) return;
        const lower = searchTerm.toLowerCase();
        setFilteredUsers(users.filter(u =>
            u && (
                (u.email || '').toLowerCase().includes(lower) ||
                (u.displayName || '').toLowerCase().includes(lower)
            )
        ));
    }, [searchTerm, users]);

    const loadUsers = async () => {
        setLoading(true);
        const data = await getAllUsers();
        // Prioritize showing admins and teachers first
        data.sort((a: any, b: any) => {
            const scoreA = (a.isAdmin ? 2 : 0) + (a.isTeacher ? 1 : 0);
            const scoreB = (b.isAdmin ? 2 : 0) + (b.isTeacher ? 1 : 0);
            return scoreB - scoreA;
        });
        setUsers(data);
        setLoading(false);
    };

    const handleToggleRole = async (userId: string, roleType: 'admin' | 'teacher', currentValue: boolean) => {
        if (!isSuperAdmin) {
            alert('Only super admins can change user roles.');
            return;
        }

        const user = users.find(u => u.id === userId);
        if (roleType === 'admin' && SUPER_ADMIN_EMAILS.includes(user?.email || '')) {
            alert('Cannot modify Super Admin roles.');
            return;
        }

        const roleLabel = roleType === 'admin' ? 'Admin' : 'Teacher';
        const action = currentValue ? 'remove' : 'assign';

        if (!confirm(`Are you sure you want to ${action} the ${roleLabel} role for ${user?.displayName || 'this user'}?`)) return;

        setUpdating(true);
        try {
            const newValue = !currentValue;

            const updateData: any = {};
            if (roleType === 'admin') {
                updateData.isAdmin = newValue;
            } else {
                updateData.isTeacher = newValue;
            }
            updateData.updatedAt = serverTimestamp();

            await updateDoc(doc(db, 'users', userId), updateData);

            // Log the action
            await addDoc(collection(db, 'activityLogs'), {
                action: `${roleLabel} Role ${newValue ? 'Assigned' : 'Removed'}`,
                actionType: 'update',
                targetType: 'user',
                targetId: userId,
                details: `User ${roleLabel.toLowerCase()} role ${newValue ? 'enabled' : 'disabled'} for ${user?.email}`,
                userId: auth.currentUser?.uid || 'unknown',
                userEmail: auth.currentUser?.email || 'unknown',
                timestamp: serverTimestamp()
            });

            // Update local state
            const updatedUsers = users.map(u => {
                if (u.id === userId) {
                    if (roleType === 'admin') {
                        return { ...u, isAdmin: newValue };
                    } else {
                        return { ...u, isTeacher: newValue };
                    }
                }
                return u;
            });
            setUsers(updatedUsers);
        } catch (err) {
            console.error('Failed to toggle role:', err);
            alert('Failed to update user role');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="p-8">Loading staff directory...</div>;

    if (!isSuperAdmin) {
        return <div className="p-8 text-center text-red-500">Access Denied: Super Admin privileges required.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Admin & Staff Directory</h1>
                    <p className="text-slate-500">Manage elevated privileges for admins and teachers.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-edexcel-teal w-64"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4 text-center">Admin Role</th>
                            <th className="px-6 py-4 text-center">Teacher Role</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((user) => {
                            const isSuper = SUPER_ADMIN_EMAILS.includes(user.email || '');
                            return (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 overflow-hidden font-bold">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    (user.displayName || user.email || '?')[0].toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 flex items-center gap-2">
                                                    {user.displayName || 'Unnamed User'}
                                                    {isSuper && <Crown size={14} className="text-amber-500" />}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleToggleRole(user.id, 'admin', user.isAdmin)}
                                            disabled={updating || isSuper}
                                            className={`inline-flex items-center justify-center p-2 rounded-lg transition-all ${user.isAdmin
                                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                                : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                                } ${isSuper ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            title={isSuper ? "Super Admins are always Admins" : "Toggle Admin Role"}
                                        >
                                            <Shield size={20} className={user.isAdmin ? "fill-current" : ""} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleToggleRole(user.id, 'teacher', user.isTeacher)}
                                            disabled={updating}
                                            className={`inline-flex items-center justify-center p-2 rounded-lg transition-all ${user.isTeacher
                                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                                : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                                }`}
                                            title="Toggle Teacher Role"
                                        >
                                            <GraduationCap size={20} className={user.isTeacher ? "fill-current" : ""} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                    No users found matching "{searchTerm}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminStaffDirectory;
