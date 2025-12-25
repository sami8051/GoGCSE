import React, { useEffect, useState } from 'react';
import { getAllUsers, deleteUserData, getUserHistory, updateUserStatus, db, SUPER_ADMIN_EMAILS, ADMIN_EMAILS, auth } from '../../services/firebase';
import { doc, updateDoc, serverTimestamp, getDocs, collection, addDoc } from 'firebase/firestore';
import { Search, Trash2, User as UserIcon, Eye, Download, ToggleLeft, ToggleRight, X, FileText, Calendar, Shield, Ban, CheckCircle, BookOpen, GraduationCap, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminUserList: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userExams, setUserExams] = useState<any[]>([]);
    const [loadingExams, setLoadingExams] = useState(false);
    const [updating, setUpdating] = useState(false);
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(auth.currentUser?.email || '');
    const navigate = useNavigate();

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        if (!Array.isArray(users)) return;
        const lower = searchTerm.toLowerCase();
        setFilteredUsers(users.filter(u =>
            u && (
                (u.email || '').toLowerCase().includes(lower) ||
                (u.displayName || '').toLowerCase().includes(lower) ||
                (u.id || '').includes(lower)
            )
        ));
    }, [searchTerm, users]);

    const loadUsers = async () => {
        setLoading(true);
        const data = await getAllUsers();
        setUsers(data);
        setLoading(false);
    };

    const handleUpdateStatus = async (userId: string, newStatus: string) => {
        if (!confirm(`Are you sure you want to set status to ${newStatus}?`)) return;
        try {
            await updateDoc(doc(db, 'users', userId), {
                status: newStatus,
                updatedAt: serverTimestamp() // Import serverTimestamp if needed
            });
            // Refresh
            loadUsers();
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Update failed");
        }
    };

    const handleDelete = async (userId: string) => {
        if (!window.confirm("Are you sure? This will delete the user and ALL their exam data permanently.")) return;

        const success = await deleteUserData(userId);
        if (success) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            setSelectedUser(null);
            alert("User deleted successfully.");
        } else {
            alert("Failed to delete user.");
        }
    };

    const handleViewProfile = async (user: any) => {
        setSelectedUser(user);
        setLoadingExams(true);
        try {
            const history = await getUserHistory(user.id);
            setUserExams(history);
        } catch (e) {
            console.error("Failed to load user exams", e);
            setUserExams([]);
        }
        setLoadingExams(false);
    };

    const handleToggleStatus = (userId: string) => {
        setUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, disabled: !u.disabled } : u
        ));
        // Note: For full implementation, you'd also update Firestore here
        alert(`User ${users.find(u => u.id === userId)?.disabled ? 'enabled' : 'disabled'}`);
    };

    const handleToggleRole = async (userId: string, roleType: 'admin' | 'teacher', currentValue: boolean) => {
        if (!isSuperAdmin) {
            alert('Only super admins can change user roles.');
            return;
        }
        
        const roleLabel = roleType === 'admin' ? 'Admin' : 'Teacher';
        const action = currentValue ? 'remove' : 'make';
        
        if (!confirm(`Are you sure you want to ${action} this user a ${roleLabel}?`)) return;
        
        setUpdating(true);
        try {
            const newValue = !currentValue;
            const userToUpdate = users.find(u => u.id === userId);
            
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
                details: `User ${roleLabel.toLowerCase()} role ${newValue ? 'enabled' : 'disabled'}`,
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
            setSelectedUser(updatedUsers.find(u => u.id === userId) || null);
            alert(`${roleLabel} role ${newValue ? 'assigned' : 'removed'} successfully!`);
        } catch (err) {
            console.error('Failed to toggle role:', err);
            alert('Failed to update user role');
        } finally {
            setUpdating(false);
        }
    };

    const handleApproveUser = async (userId: string) => {
        // Regular admins AND super admins can approve users
        if (!confirm('Approve this user to active status?')) return;
        
        setUpdating(true);
        try {
            await updateDoc(doc(db, 'users', userId), {
                status: 'approved',
                isApproved: true,
                updatedAt: serverTimestamp()
            });
            
            // Log the action
            await addDoc(collection(db, 'activityLogs'), {
                action: 'User Status Approved',
                actionType: 'update',
                targetType: 'user',
                targetId: userId,
                details: 'User status changed from pending to approved',
                userId: auth.currentUser?.uid || 'unknown',
                userEmail: auth.currentUser?.email || 'unknown',
                timestamp: serverTimestamp()
            });
            
            // Update local state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'approved', isApproved: true } : u));
            setSelectedUser(prev => prev && prev.id === userId ? { ...prev, status: 'approved', isApproved: true } : prev);
            alert('User approved successfully!');
        } catch (err) {
            console.error('Failed to approve user:', err);
            alert('Failed to approve user');
        } finally {
            setUpdating(false);
        }
    };

    const handleSetPending = async (userId: string) => {
        // Set user status back to pending
        if (!confirm('Set this user to pending status?')) return;
        
        setUpdating(true);
        try {
            await updateDoc(doc(db, 'users', userId), {
                status: 'pending',
                isApproved: false,
                updatedAt: serverTimestamp()
            });
            
            // Log the action
            await addDoc(collection(db, 'activityLogs'), {
                action: 'User Status Set to Pending',
                actionType: 'update',
                targetType: 'user',
                targetId: userId,
                details: 'User status changed from approved to pending',
                userId: auth.currentUser?.uid || 'unknown',
                userEmail: auth.currentUser?.email || 'unknown',
                timestamp: serverTimestamp()
            });
            
            // Update local state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'pending', isApproved: false } : u));
            setSelectedUser(prev => prev && prev.id === userId ? { ...prev, status: 'pending', isApproved: false } : prev);
            alert('User set to pending!');
        } catch (err) {
            console.error('Failed to set user to pending:', err);
            alert('Failed to update user status');
        } finally {
            setUpdating(false);
        }
    };

    const isAdmin = ADMIN_EMAILS.includes(auth.currentUser?.email || '');

    const handleExportCSV = () => {
        const headers = ['Display Name', 'Email', 'User ID', 'Last Active', 'Status'];
        const rows = users.map(u => [
            u.displayName || 'Unnamed',
            u.email || '',
            u.id,
            u.lastActive?.seconds ? new Date(u.lastActive.seconds * 1000).toISOString() : 'Unknown',
            u.disabled ? 'Disabled' : 'Active'
        ]);

        const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="p-8">Loading directory...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Directory</h1>
                    <p className="text-slate-500">Manage student accounts and access.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
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
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Last Active</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 overflow-hidden">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <UserIcon size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{user.displayName || 'Unnamed User'}</div>
                                            <div className="text-xs text-slate-400 font-mono" title={user.id}>{user.id.slice(0, 12)}...</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {user.email || <span className="text-slate-400 italic">No Email</span>}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {user.lastActive?.seconds ? new Date(user.lastActive.seconds * 1000).toLocaleDateString() : 'Unknown'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Super Admin Badge - Highest Priority */}
                                        {SUPER_ADMIN_EMAILS.includes(user.email || '') && (
                                            <span className="px-2 py-1 inline-flex items-center text-xs font-bold rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 border border-amber-400 shadow-sm">
                                                <Crown size={12} className="mr-1" />
                                                Super Admin
                                            </span>
                                        )}
                                        
                                        {/* Admin Role Badge */}
                                        {user.isAdmin && (
                                            <span className="px-2 py-1 inline-flex items-center text-xs font-bold rounded-full bg-red-100 text-red-900 border border-red-300">
                                                Admin
                                            </span>
                                        )}
                                        
                                        {/* Teacher Role Badge */}
                                        {user.isTeacher && (
                                            <span className="px-2 py-1 inline-flex items-center text-xs font-bold rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                                                <GraduationCap size={12} className="mr-1" />
                                                Teacher
                                            </span>
                                        )}
                                        
                                        {/* Student Badge - shown if no roles */}
                                        {!SUPER_ADMIN_EMAILS.includes(user.email || '') && !user.isAdmin && !user.isTeacher && (
                                            <span className="px-2 py-1 inline-flex items-center text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                                Student
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {user.status === 'approved' ? (
                                            /* Active - Clickable button to set pending (for admins) */
                                            <button
                                                onClick={() => handleSetPending(user.id)}
                                                disabled={updating || !isAdmin}
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-800 border-emerald-300 transition-all ${
                                                    isAdmin ? 'hover:bg-amber-100 hover:text-amber-800 hover:border-amber-300 cursor-pointer' : 'cursor-default'
                                                } disabled:opacity-50`}
                                                title={isAdmin ? 'Click to set Pending' : 'Active'}
                                            >
                                                <CheckCircle size={12} className="mr-1" />
                                                Active
                                            </button>
                                        ) : (
                                            /* Pending - Clickable button to approve */
                                            <button
                                                onClick={() => handleApproveUser(user.id)}
                                                disabled={updating || !isAdmin}
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-amber-100 text-amber-800 border-amber-300 transition-all ${
                                                    isAdmin ? 'hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300 cursor-pointer' : 'cursor-default'
                                                } disabled:opacity-50`}
                                                title={isAdmin ? 'Click to make Active' : 'Only admins can approve'}
                                            >
                                                Pending
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {selectedUser?.id === user.id && user.isAdmin && (
                                            <button
                                                onClick={() => {
                                                    navigate(`/teacher/view/${user.id}`);
                                                }}
                                                className="text-emerald-500 hover:text-emerald-700 p-2 hover:bg-emerald-50 rounded-md transition-colors"
                                                title="View Classes"
                                            >
                                                <BookOpen size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleViewProfile(user)}
                                            className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-md transition-colors"
                                            title="View Profile"
                                        >
                                            <Eye size={18} />
                                        </button>

                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete User"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    No users found matching "{searchTerm}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">User Profile</h2>
                            <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {/* User Info */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                    {selectedUser.photoURL ? (
                                        <img src={selectedUser.photoURL} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <UserIcon size={32} className="text-slate-400" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{selectedUser.displayName || 'Unnamed'}</h3>
                                    <p className="text-slate-500">{selectedUser.email}</p>
                                    <p className="text-xs text-slate-400 font-mono mt-1">{selectedUser.id}</p>
                                </div>
                            </div>

                            {/* Exam History */}
                            <div>
                                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <FileText size={18} />
                                    Exam History ({userExams.length})
                                </h4>
                                {loadingExams ? (
                                    <p className="text-slate-400">Loading exam history...</p>
                                ) : userExams.length > 0 ? (
                                    <div className="space-y-2">
                                        {userExams.map((exam, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Calendar size={16} className="text-slate-400" />
                                                    <span className="text-sm text-slate-600">
                                                        {exam.date?.seconds ? new Date(exam.date.seconds * 1000).toLocaleDateString() : 'Unknown'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {exam.paperType?.includes('1') ? 'Paper 1' : 'Paper 2'}
                                                    </span>
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                                        {exam.totalScore}/{exam.maxScore}
                                                    </span>
                                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                                                        Grade {exam.gradeEstimate || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-sm">No exam history for this user.</p>
                                )}
                            </div>
                        </div>
                       <div className="p-4 border-t border-slate-100 flex justify-end gap-2 flex-wrap">
                            {/* Status Toggle Button - Admins can toggle between Pending/Active */}
                            {isAdmin && (
                                selectedUser.status === 'approved' ? (
                                    <button
                                        onClick={() => handleSetPending(selectedUser.id)}
                                        disabled={updating}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        Set Pending
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleApproveUser(selectedUser.id)}
                                        disabled={updating}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        Make Active
                                    </button>
                                )
                            )}

                        <button
                            onClick={() => handleViewProfile(selectedUser)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                selectedUser.isAdmin
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                        >
                            {selectedUser.isAdmin ? 'View Admin' : 'View Profile'}
                        </button>
                        {selectedUser.isAdmin && (
                            <button
                                onClick={() => navigate(`/teacher/view/${selectedUser.id}`)}
                                className="px-4 py-2 ml-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                title="View Classes"
                            >
                                <BookOpen size={16} />
                                View Classes
                            </button>
                        )}
                            <button
                                onClick={() => handleDelete(selectedUser.id)}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserList;
