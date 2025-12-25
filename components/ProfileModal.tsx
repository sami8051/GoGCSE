import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { X, User as UserIcon, Mail, Calendar, Edit2, Check, LogOut } from 'lucide-react';
import { updateUserProfile, logOut } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import profileIcon from '../assets/profile_icon.png';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user }) => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user.displayName || '');
    const [loading, setLoading] = useState(false);

    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        setName(user.displayName || '');
    }, [user, isOpen]);

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploading(true);
            try {
                // Determine file type to decide on compression/resizing if needed in future
                // For now direct upload
                const file = e.target.files[0];
                const photoURL = await import('../services/firebase').then(m => m.uploadProfilePicture(user, file));

                // Force reload to see new picture
                window.location.reload();
            } catch (error) {
                console.error("Failed to upload image", error);
                alert("Failed to upload profile picture.");
            } finally {
                setUploading(false);
            }
        }
    };

    const handleSave = async () => {
        // ... existing handleSave code ...
        if (!name.trim()) return;
        setLoading(true);
        try {
            await updateUserProfile(user, { displayName: name });
            setIsEditing(false);
            window.location.reload();
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await logOut();
        navigate('/login');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-edexcel-blue p-6 flex justify-between items-start">
                    <h2 className="text-xl font-bold text-white">Profile Details</h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex flex-col items-center mb-6 -mt-12 group relative">
                        <div
                            className="bg-white p-2 rounded-full shadow-md cursor-pointer relative"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <img
                                src={user.photoURL || profileIcon}
                                alt="Profile"
                                className="w-20 h-20 rounded-full bg-slate-100 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-bold">Change</span>
                            </div>
                            {uploading && (
                                <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                                    <div className="animate-spin h-5 w-5 border-2 border-edexcel-blue border-t-transparent rounded-full"></div>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>

                    <div className="space-y-4">
                        {/* Name Field */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Full Name</label>
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-edexcel-teal rounded-lg focus:ring-2 focus:ring-edexcel-teal/20 outline-none font-bold text-gray-900"
                                        autoFocus
                                    />
                                ) : (
                                    <div className="flex-1 font-bold text-gray-900 text-lg flex items-center gap-2">
                                        {user.displayName || 'No Name Set'}
                                        <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-edexcel-blue transition-colors">
                                            <Edit2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="pt-2 border-t border-gray-100">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Email Address</label>
                            <div className="flex items-center gap-2 text-gray-700">
                                <Mail size={16} className="text-gray-400" />
                                <span>{user.email}</span>
                            </div>
                        </div>

                        {/* Joined Date */}
                        <div className="pt-2 border-t border-gray-100">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Member Since</label>
                            <div className="flex items-center gap-2 text-gray-700">
                                <Calendar size={16} className="text-gray-400" />
                                <span>{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex gap-3">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex-1 py-2 px-4 bg-edexcel-teal text-white rounded-lg font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Saving...' : <><Check size={18} /> Save Changes</>}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleSignOut}
                                className="w-full py-2 px-4 border border-red-100 text-red-600 bg-red-50 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut size={18} /> Sign Out
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
