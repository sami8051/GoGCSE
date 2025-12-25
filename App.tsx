import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, ADMIN_EMAILS, checkIsAdmin } from './services/firebase';
import { Sparkles } from 'lucide-react';

import Landing from './components/Landing';
import ExamRoute from './components/ExamRoute';
import ResultsRoute from './components/ResultsRoute';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import LanguageLab from './components/LanguageLab';
import PendingApproval from './components/PendingApproval';
import Terms from './components/Terms';
import Privacy from './components/Privacy';
import CookiePolicy from './components/CookiePolicy';
import AcceptableUse from './components/AcceptableUse';
import ChildPrivacy from './components/ChildPrivacy';
import CookieBanner from './components/CookieBanner';
import LegalConsent from './components/LegalConsent';
import Footer from './components/Footer';

import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUserList from './components/admin/AdminUserList';
import AdminExamList from './components/admin/AdminExamList';
import AdminLabSessions from './components/admin/AdminLabSessions';
import AdminSettings from './components/admin/AdminSettings';
import AdminLogin from './components/admin/AdminLogin';
import AdminStaffDirectory from './components/admin/AdminStaffDirectory';
import AdminAnnouncements from './components/admin/AdminAnnouncements';
import AdminActivityLog from './components/admin/AdminActivityLog';
import AdminAssets from './components/admin/AdminAssets';
import AdminSecurity from './components/admin/AdminSecurity';

import TeacherDashboard from './components/teacher/TeacherDashboard';
import ClassManager from './components/teacher/ClassManager';
import AssignmentBuilder from './components/teacher/AssignmentBuilder';
import ViewTeacherClasses from './components/teacher/ViewTeacherClasses';
import StudentDictionary from './components/teacher/StudentDictionary';
import TeacherLayout from './components/teacher/TeacherLayout';
import StudentClassroom from './components/student/StudentClassroom';
import AssignmentRunner from './components/student/AssignmentRunner';
import TeacherRoute from './components/TeacherRoute';

// A simple AdminRoute guard
// A simple AdminRoute guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check dynamic admin status from Firestore
        const adminStatus = await checkIsAdmin(currentUser.uid);
        setIsAdmin(adminStatus);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center"><Sparkles className="animate-spin text-edexcel-blue" size={32} /></div>;

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide footer on admin and teacher control pages
  const hideFooter = location.pathname.startsWith('/admin') || location.pathname.startsWith('/teacher');

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/legal-consent" element={<LegalConsent />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="/acceptable-use" element={<AcceptableUse />} />
          <Route path="/child-privacy" element={<ChildPrivacy />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <div className="flex flex-col min-h-screen">
                <Dashboard />
              </div>
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUserList />} />
            <Route path="exams" element={<AdminExamList />} />
            <Route path="lab-sessions" element={<AdminLabSessions />} />
            <Route path="analytics" element={<AdminDashboard />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="assets" element={<AdminAssets />} />
            <Route path="activity-log" element={<AdminActivityLog />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="directory" element={<AdminStaffDirectory />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Exam Routes - Passing data via state */}
          <Route path="/exam/:type" element={
            <ProtectedRoute>
              <ExamRoute />
            </ProtectedRoute>
          } />
          <Route path="/results" element={
            <ProtectedRoute>
              <div className="flex flex-col min-h-screen">
                <ResultsRoute />
              </div>
            </ProtectedRoute>
          } />

          {/* Teacher Classroom Routes with Layout */}
          <Route path="/teacher" element={<TeacherRoute><TeacherLayout /></TeacherRoute>}>
            <Route index element={<TeacherDashboard />} />
            <Route path="students" element={<StudentDictionary />} />
            <Route path="classes" element={<ViewTeacherClasses />} />
            <Route path="view/:teacherId" element={<ViewTeacherClasses />} />
            <Route path="class/:classId" element={<ClassManager />} />
            <Route path="class/:classId/assignments" element={<ClassManager />} />
            <Route path="class/:classId/create-assignment" element={<AssignmentBuilder />} />
          </Route>

          {/* Student Classroom Routes */}
          <Route path="/student/classroom" element={
            <ProtectedRoute>
              <StudentClassroom />
            </ProtectedRoute>
          } />
          {/* Note: /student/class/:classId not strictly needed if dashboard lists assignments, but nice to have. 
          For Phase 1, StudentClassroom lists classes, click -> maybe go to specific view?
          Let's stick to AssignmentRunner for now. */}
          {/* Route to take an assignment */}
          <Route path="/student/assignment/:assignmentId" element={
            <ProtectedRoute>
              <AssignmentRunner />
            </ProtectedRoute>
          } />

          <Route path="/language-lab" element={<div className="flex flex-col min-h-screen"><LanguageLab onHome={() => navigate('/')} /></div>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {!hideFooter && <Footer />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
      <CookieBanner />
    </Router>
  );
};

export default App;