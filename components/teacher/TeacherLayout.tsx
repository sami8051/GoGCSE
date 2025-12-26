import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, ChevronLeft, ChevronRight, Moon, Sun, LogOut, Users, BarChart3, FileText, Home } from 'lucide-react';
import { auth, logOut, checkIsAdmin } from '../../services/firebase';

const TeacherLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('teacherDarkMode') === 'true';
    });

    useEffect(() => {
        if (auth.currentUser) {
            checkIsAdmin(auth.currentUser.uid).then(setIsAdmin);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('teacherDarkMode', darkMode.toString());
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
        const crumbs = [{ label: 'Teacher', path: '/teacher' }];

        if (pathParts.length > 1) {
            if (pathParts[1] === 'students') {
                crumbs.push({ label: 'Student Dictionary', path: location.pathname });
            } else if (pathParts[1] === 'class' && pathParts[2]) {
                crumbs.push({ label: 'Class Manager', path: location.pathname });
            } else if (pathParts[1] === 'view' && pathParts[2]) {
                crumbs.push({ label: 'View Classes', path: location.pathname });
            }
        }
        return crumbs;
    };

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${isActive
            ? 'bg-blue-500/20 text-blue-500'
            : 'text-slate-300 hover:bg-slate-800'
        } ${collapsed ? 'justify-center' : ''}`;

    const navItems = [
        { to: '/dashboard', icon: Home, label: 'Home', end: true },
        { to: '/teacher', icon: BarChart3, label: 'Overview', end: true },
        { to: '/teacher/classes', icon: BookOpen, label: 'My Classes' },
        { to: '/teacher/students', icon: Users, label: 'Student Directory' },
    ];

    // Only add admin link if user is admin (not just teacher)
    if (isAdmin) {
        navItems.push({ to: '/admin', icon: Home, label: 'Admin Panel', end: false });
    }

    return (
        <div className={`flex h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-100'}`}>
            {/* Sidebar */}
            <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white flex flex-col shrink-0 transition-all duration-300`}>
                <div className={`p-4 border-b border-slate-700 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
                    {!collapsed && (
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-blue-400">Teacher Control Panel</h1>
                            <p className="text-xs text-slate-400">GCSE Simulator</p>
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
                        <nav className="flex items-center gap-1 text-sm">
                            {getBreadcrumbs().map((crumb, idx, arr) => (
                                <React.Fragment key={crumb.path}>
                                    <button
                                        onClick={() => navigate(crumb.path)}
                                        className={`${
                                            idx === arr.length - 1
                                                ? darkMode
                                                    ? 'text-white font-semibold'
                                                    : 'text-slate-900 font-semibold'
                                                : darkMode
                                                ? 'text-slate-400 hover:text-white'
                                                : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                    >
                                        {crumb.label}
                                    </button>
                                    {idx < arr.length - 1 && (
                                        <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>/</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                {auth.currentUser?.displayName || 'Teacher'}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                Educator
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                            {auth.currentUser?.photoURL ? (
                                <img src={auth.currentUser.photoURL} alt="Teacher" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <BookOpen size={20} />
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

export default TeacherLayout;
