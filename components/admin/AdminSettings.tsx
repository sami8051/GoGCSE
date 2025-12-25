import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, ADMIN_EMAILS, SUPER_ADMIN_EMAILS, auth, getAllUsers } from '../../services/firebase';
import { Settings, Users, Key, ToggleLeft, ToggleRight, Plus, X, Save, AlertCircle, CheckCircle, ShieldOff, Eye, EyeOff, Shield, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SystemSettings {
    adminEmails: string[];
    featureFlags: {
        paper1Enabled: boolean;
        paper2Enabled: boolean;
        languageLabEnabled: boolean;
    };
    apiKeyConfigured: boolean;
}

const AdminSettings: React.FC = () => {
    const navigate = useNavigate();
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(auth.currentUser?.email || '');

    const [settings, setSettings] = useState<SystemSettings>({
        adminEmails: [...ADMIN_EMAILS],
        featureFlags: {
            paper1Enabled: true,
            paper2Enabled: true,
            languageLabEnabled: true
        },
        apiKeyConfigured: true
    });
    const [loading, setLoading] = useState(true);
    const [showApiKey, setShowApiKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'active' | 'invalid' | 'none'>('checking');

    useEffect(() => {
        loadSettings();
        checkApiKeyStatus();
    }, []);

    const checkApiKeyStatus = async () => {
        setApiKeyStatus('checking');
        try {
            const response = await fetch('/api/debug-config');
            if (response.ok) {
                const data = await response.json();
                if (data.hasApiKey) {
                    setApiKeyStatus('active');
                } else {
                    setApiKeyStatus('none');
                }
            } else {
                setApiKeyStatus('invalid');
            }
        } catch (error) {
            console.error('Failed to check API key status:', error);
            setApiKeyStatus('invalid');
        }
    };

    const loadSettings = async () => {
        setLoading(true);
        try {
            // Load system settings
            const docRef = doc(db, 'systemSettings', 'config');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSettings(prev => ({
                    adminEmails: data.adminEmails || [...ADMIN_EMAILS],
                    featureFlags: {
                        paper1Enabled: data.featureFlags?.paper1Enabled ?? true,
                        paper2Enabled: data.featureFlags?.paper2Enabled ?? true,
                        languageLabEnabled: data.featureFlags?.languageLabEnabled ?? true
                    },
                    apiKeyConfigured: data.apiKeyConfigured ?? true
                }));
            }

            // Load Users for Admin Management
            const usersData = await getAllUsers();
            setAllUsers(usersData);

        } catch (e) {
            console.error("Failed to load settings", e);
        }
        setLoading(false);
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, 'systemSettings', 'config');
            await setDoc(docRef, settings, { merge: true });
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (e) {
            console.error("Failed to save settings", e);
            setMessage({ type: 'error', text: 'Failed to save settings. Check permissions.' });
        }
        setSaving(false);
    };

    const addAdmin = async () => {
        if (!selectedUserId) {
            setMessage({ type: 'error', text: 'Please select a user.' });
            return;
        }
        setSaving(true);
        try {
            const userToPromote = allUsers.find(u => u.id === selectedUserId);
            
            await updateDoc(doc(db, 'users', selectedUserId), {
                isAdmin: true,
                adminPromotedAt: serverTimestamp(),
                adminPromotedBy: auth.currentUser?.uid
            });

            // Log admin action
            await addDoc(collection(db, 'activityLogs'), {
                action: 'Admin Role Assigned',
                actionType: 'update',
                targetType: 'user',
                targetId: selectedUserId,
                details: `Promoted user ${userToPromote?.displayName || userToPromote?.email} to admin`,
                userId: auth.currentUser?.uid || 'unknown',
                userEmail: auth.currentUser?.email || 'unknown',
                timestamp: serverTimestamp()
            });

            // Update local state
            setAllUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, isAdmin: true } : u));
            setSelectedUserId('');
            setMessage({ type: 'success', text: `✅ ${userToPromote?.displayName || 'User'} promoted to Admin successfully!` });
        } catch (error) {
            console.error("Error adding admin:", error);
            setMessage({ type: 'error', text: 'Failed to add admin.' });
        }
        setSaving(false);
    };

    const removeAdmin = async (userId: string) => {
        if (userId === auth.currentUser?.uid) {
            setMessage({ type: 'error', text: 'You cannot remove yourself.' });
            return;
        }
        // Super admins check (by email hardcoded fallback for safety)
        const userToRemove = allUsers.find(u => u.id === userId);
        if (userToRemove && SUPER_ADMIN_EMAILS.includes(userToRemove.email)) {
            setMessage({ type: 'error', text: 'Cannot remove a Super Admin.' });
            return;
        }

        if (window.confirm(`Are you sure you want to remove admin access for ${userToRemove?.displayName || 'this user'}?`)) {
            setSaving(true);
            try {
                await updateDoc(doc(db, 'users', userId), {
                    isAdmin: false,
                    adminRemovedAt: serverTimestamp(),
                    adminRemovedBy: auth.currentUser?.uid
                });

                // Log admin action
                await addDoc(collection(db, 'activityLogs'), {
                    action: 'Admin Role Removed',
                    actionType: 'update',
                    targetType: 'user',
                    targetId: userId,
                    details: `Removed admin access from ${userToRemove?.displayName || userToRemove?.email}`,
                    userId: auth.currentUser?.uid || 'unknown',
                    userEmail: auth.currentUser?.email || 'unknown',
                    timestamp: serverTimestamp()
                });

                // Update local state
                setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, isAdmin: false } : u));
                setMessage({ type: 'success', text: `✅ Admin role removed from ${userToRemove?.displayName || 'user'}.` });
            } catch (error) {
                console.error("Error removing admin:", error);
                setMessage({ type: 'error', text: 'Failed to remove admin.' });
            }
            setSaving(false);
        }
    };

    const toggleFeature = (feature: keyof SystemSettings['featureFlags']) => {
        setSettings(prev => ({
            ...prev,
            featureFlags: {
                ...prev.featureFlags,
                [feature]: !prev.featureFlags[feature]
            }
        }));
    };

    if (loading) return <div className="p-8">Loading settings...</div>;

    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="p-4 bg-red-100 rounded-full mb-4">
                    <ShieldOff size={48} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
                <p className="text-slate-500 mb-6">You don't have permission to access System Settings.</p>
                <p className="text-sm text-slate-400">Only Super Administrators can modify these settings.</p>
                <button
                    onClick={() => navigate('/admin')}
                    className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
                <p className="text-slate-500">Manage platform configuration and access control.</p>
            </div>

            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Admin Management */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Users size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900">Admin Management</h2>
                        <p className="text-sm text-slate-500">Manage users with Admin access.</p>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    {allUsers.filter(u => u.isAdmin).length === 0 ? (
                        <p className="text-sm text-slate-500 italic p-2">No admins found in database.</p>
                    ) : (
                        <div className="space-y-2">
                            {allUsers.filter(u => u.isAdmin).map((user) => {
                                const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email || '');
                                return (
                                    <div key={user.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                                        isSuperAdmin 
                                            ? 'bg-amber-50 border-amber-200' 
                                            : 'bg-slate-50 border-slate-200'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                                isSuperAdmin 
                                                    ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
                                                    : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                            }`}>
                                                {isSuperAdmin ? <Crown size={16} /> : <Shield size={16} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-900">{user.displayName || 'No Name'}</p>
                                                    {isSuperAdmin && (
                                                        <span className="px-2 py-1 bg-amber-200 text-amber-900 text-xs font-bold rounded-full">Super Admin</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                        {!isSuperAdmin && (
                                            <button
                                                onClick={() => removeAdmin(user.id)}
                                                disabled={saving}
                                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg disabled:opacity-50 transition-colors"
                                                title="Remove Admin Access"
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        disabled={saving}
                    >
                        <option value="">Select a user to make admin...</option>
                        {allUsers
                            .filter(u => !u.isAdmin && u.isApproved)
                            .sort((a, b) => (a.email || '').localeCompare(b.email || ''))
                            .map(user => {
                                const label = user.displayName
                                    ? `${user.displayName} (${user.email || 'No Email'})`
                                    : (user.email || `Unnamed User (ID: ${user.id.slice(0, 8)}...)`);

                                return (
                                    <option key={user.id} value={user.id}>
                                        {label}
                                    </option>
                                );
                            })
                        }
                    </select>
                    <button
                        onClick={addAdmin}
                        disabled={!selectedUserId || saving}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:bg-indigo-300"
                    >
                        <Plus size={18} />
                        Add Role
                    </button>
                </div>

                <p className="mt-4 text-xs text-blue-600 bg-blue-50 p-3 rounded-lg">
                    <strong>Note:</strong> Admins are now managed via the <code>isAdmin</code> flag on their user profile. Detailed permissions are enforced by database rules.
                </p>
            </div>

            {/* Feature Flags */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Settings size={20} className="text-purple-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900">Feature Flags</h2>
                        <p className="text-sm text-slate-500">Enable or disable platform features.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                            <p className="font-medium text-slate-800">Paper 1 (Fiction)</p>
                            <p className="text-sm text-slate-500">Allow students to take Paper 1 exams</p>
                        </div>
                        <button
                            onClick={() => toggleFeature('paper1Enabled')}
                            className={`p-2 rounded-lg transition-colors ${settings.featureFlags.paper1Enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}
                        >
                            {settings.featureFlags.paper1Enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                            <p className="font-medium text-slate-800">Paper 2 (Non-Fiction)</p>
                            <p className="text-sm text-slate-500">Allow students to take Paper 2 exams</p>
                        </div>
                        <button
                            onClick={() => toggleFeature('paper2Enabled')}
                            className={`p-2 rounded-lg transition-colors ${settings.featureFlags.paper2Enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}
                        >
                            {settings.featureFlags.paper2Enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                            <p className="font-medium text-slate-800">Language Lab</p>
                            <p className="text-sm text-slate-500">Enable the Language Lab practice area</p>
                        </div>
                        <button
                            onClick={() => toggleFeature('languageLabEnabled')}
                            className={`p-2 rounded-lg transition-colors ${settings.featureFlags.languageLabEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}
                        >
                            {settings.featureFlags.languageLabEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* API Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <Key size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900">API Configuration</h2>
                        <p className="text-sm text-slate-500">Manage API keys and external services.</p>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800">Gemini API Key</p>
                            <p className="text-sm text-slate-500">Used for AI-powered exam generation and marking</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${apiKeyStatus === 'checking' ? 'bg-slate-100 text-slate-600' :
                            apiKeyStatus === 'active' ? 'bg-emerald-100 text-emerald-800' :
                                apiKeyStatus === 'none' ? 'bg-amber-100 text-amber-800' :
                                    'bg-red-100 text-red-800'
                            }`}>
                            {apiKeyStatus === 'checking' && '⏳ Checking...'}
                            {apiKeyStatus === 'active' && '✅ Active'}
                            {apiKeyStatus === 'none' && '⚠️ Not Configured'}
                            {apiKeyStatus === 'invalid' && '❌ Server Error'}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type={showApiKey ? "text" : "password"}
                                id="apiKeyInput"
                                defaultValue={localStorage.getItem('gemini_api_key') || ''}
                                placeholder="Enter your Gemini API key..."
                                className="w-full px-4 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <button
                            onClick={async () => {
                                const input = document.getElementById('apiKeyInput') as HTMLInputElement;
                                const key = input?.value?.trim();
                                if (!key) {
                                    setMessage({ type: 'error', text: 'Please enter a valid API key.' });
                                    return;
                                }

                                // Show validating state
                                setMessage({ type: 'success', text: '⏳ Validating API key...' });

                                try {
                                    // Test the API key by making a simple request
                                    const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);

                                    if (!testResponse.ok) {
                                        const errorData = await testResponse.json();
                                        setMessage({ type: 'error', text: `Invalid API key: ${errorData.error?.message || 'Authentication failed'}` });
                                        return;
                                    }

                                    // Key is valid, now save it
                                    const docRef = doc(db, 'systemSettings', 'config');
                                    await setDoc(docRef, { geminiApiKey: key }, { merge: true });

                                    // Also save to local storage for client-side convenience
                                    localStorage.setItem('gemini_api_key', key);

                                    setMessage({ type: 'success', text: '✅ API key validated and saved successfully! Restart the server to apply.' });
                                    setTimeout(() => setMessage(null), 5000);
                                } catch (error: any) {
                                    console.error("Failed to validate/save API key:", error);
                                    if (error.message?.includes('fetch')) {
                                        setMessage({ type: 'error', text: 'Network error. Please check your connection.' });
                                    } else {
                                        setMessage({ type: 'error', text: 'Failed to save API key. Check Firestore permissions.' });
                                    }
                                }
                            }}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center gap-2"
                        >
                            <Save size={18} />
                            Save Key
                        </button>
                    </div>

                    <p className="text-xs text-slate-400">
                        Your API key is stored in Firestore (for server access) and browser local storage.
                        <button
                            onClick={async () => {
                                try {
                                    const docRef = doc(db, 'systemSettings', 'config');
                                    await setDoc(docRef, { geminiApiKey: '' }, { merge: true });
                                    localStorage.removeItem('gemini_api_key');
                                    (document.getElementById('apiKeyInput') as HTMLInputElement).value = '';
                                    setMessage({ type: 'success', text: 'API key removed from server and local storage.' });
                                    setTimeout(() => setMessage(null), 3000);
                                } catch (error) {
                                    console.error("Failed to clear API key:", error);
                                    setMessage({ type: 'error', text: 'Failed to clear API key from server.' });
                                }
                            }}
                            className="ml-2 text-red-500 hover:underline"
                        >
                            Clear saved key
                        </button>
                    </p>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
                >
                    <Save size={20} />
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};

export default AdminSettings;
