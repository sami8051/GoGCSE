import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, LogOut, BookOpen, ChevronLeft, ChevronRight, Moon, Sun, Home, BarChart3, Bell, Shield, Image, Activity, GraduationCap } from 'lucide-react';
import { auth, logOut, SUPER_ADMIN_EMAILS } from '../../services/firebase';

const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(auth.currentUser?.email || '');

    const [collapsed, setCollapsed] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('adminDarkMode') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('adminDarkMode', darkMode.toString());
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    const handleLogout = async () => {
        await logOut();
        navigate('/login');
    };

    // Breadcrumb generation
    const getBreadcrumbs = () => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const crumbs = [{ label: 'Admin', path: '/admin' }];

        if (pathParts[1]) {
            const labels: Record<string, string> = {
                'users': 'User Directory',
                'exams': 'Exam Records',
                'lab-sessions': 'Lab Sessions',
                'settings': 'Settings',
                'analytics': 'Analytics',
                'announcements': 'Announcements',
                'activity-log': 'Activity Log',
                'assets': 'Assets',
                'security': 'Security'
            };
            crumbs.push({ label: labels[pathParts[1]] || pathParts[1], path: location.pathname });
        }
        return crumbs;
    };

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${isActive
            ? 'bg-edexcel-teal/20 text-edexcel-teal'
            : 'text-slate-300 hover:bg-slate-800'
        } ${collapsed ? 'justify-center' : ''}`;

    const navItems = [
        { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
        { to: '/teacher', icon: GraduationCap, label: 'Teacher Classroom' }, // Added Teacher Link
        { to: '/admin/users', icon: Users, label: 'User Directory' },
        { to: '/admin/exams', icon: FileText, label: 'Exam Records' },
        { to: '/admin/lab-sessions', icon: BookOpen, label: 'Lab Sessions' },
        { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
        { to: '/admin/announcements', icon: Bell, label: 'Announcements' },
        { to: '/admin/assets', icon: Image, label: 'Assets' },
    ];

    const superAdminItems = [
        { to: '/admin/activity-log', icon: Activity, label: 'Activity Log' },
        { to: '/admin/security', icon: Shield, label: 'Security' },
        { to: '/admin/settings', icon: Settings, label: 'Settings' },
        { to: '/admin/directory', icon: Users, label: 'Admin Directory' },
    ];

    return (
        <div className={`flex h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-100'}`}>
            {/* Sidebar */}
            <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white flex flex-col shrink-0 transition-all duration-300`}>
                <div className={`p-4 border-b border-slate-700 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
                    {!collapsed && (
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-edexcel-teal">Admin Control</h1>
                            <p className="text-xs text-slate-400">Edexcel Simulator</p>
                        </div>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        title={collapsed ? 'Expand' : 'Collapse'}
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={navLinkClass}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon size={20} />
                            {!collapsed && <span className="font-medium">{item.label}</span>}
                        </NavLink>
                    ))}

                    {isSuperAdmin && (
                        <div className="pt-3 mt-3 border-t border-slate-700">
                            {!collapsed && <p className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wider">Super Admin Control</p>}
                            {superAdminItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={navLinkClass}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <item.icon size={20} />
                                    {!collapsed && <span className="font-medium">{item.label}</span>}
                                </NavLink>
                            ))}
                        </div>
                    )}
                </nav>

                <div className="p-3 border-t border-slate-700 space-y-2">
                    {/* Dark Mode Toggle */}
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`flex items-center gap-3 px-4 py-2 w-full text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors ${collapsed ? 'justify-center' : ''}`}
                        title={darkMode ? 'Light Mode' : 'Dark Mode'}
                    >
                        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        {!collapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
                    </button>

                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 px-4 py-2 w-full text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors ${collapsed ? 'justify-center' : ''}`}
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                        {!collapsed && <span>Sign Out</span>}
                    </button>

                    {!collapsed && (
                        <div className="px-4 pt-2 text-xs text-slate-500">
                            v2.0.0
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b h-16 flex items-center justify-between px-6 shadow-sm`}>
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('/')} className={`p-2 rounded-lg hover:bg-slate-100 ${darkMode ? 'hover:bg-slate-700' : ''}`} title="Back to App">
                            <Home size={18} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                        </button>
                        <nav className="flex items-center gap-1 text-sm">
                            {getBreadcrumbs().map((crumb, idx, arr) => (
                                <React.Fragment key={crumb.path}>
                                    <button
                                        onClick={() => navigate(crumb.path)}
                                        className={`${idx === arr.length - 1
                                            ? (darkMode ? 'text-white font-semibold' : 'text-slate-900 font-semibold')
                                            : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                                            }`}
                                    >
                                        {crumb.label}
                                    </button>
                                    {idx < arr.length - 1 && <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>/</span>}
                                </React.Fragment>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                {auth.currentUser?.displayName || 'Admin User'}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {isSuperAdmin ? 'Super Administrator' : 'Administrator'}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                            {auth.currentUser?.photoURL ? (
                                <img src={auth.currentUser.photoURL} alt="Admin" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <Users size={20} />
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main className={`flex-1 overflow-auto p-6 ${darkMode ? 'bg-slate-900' : ''}`}>
                    <Outlet context={{ darkMode }} />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
