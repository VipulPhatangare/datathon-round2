import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import Navbar from './components/Navbar';
// import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import Upload from './pages/Upload';
import Result from './pages/Result';
import Submissions from './pages/Submissions';
import SubmissionDetails from './pages/SubmissionDetails';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/AdminDashboard';
import CompetitionInfo from './pages/CompetitionInfo';
import Discussion from './pages/Discussion';
import CommunityChat from './pages/CommunityChat';
import Profile from './pages/Profile';
import './index.css';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const routerConfig = {
    future: {
      v7_relativeSplatPath: true,
      v7_startTransition: true,
    },
  };

  return (
    <Routes {...routerConfig}>
      {/* Public Landing Page */}
      <Route 
        path="/" 
        element={!user ? <LandingPage /> : <Navigate to="/dashboard" />} 
      />

      {/* Public Leaderboard */}
      <Route 
        path="/leaderboard" 
        element={<><Navbar /><Leaderboard />{/* <Footer /> */}</>} 
      />

      {/* Admin Login */}
      <Route 
        path="/admin" 
        element={!user ? <AdminLogin /> : user.role === 'admin' ? <Navigate to="/admin/dashboard" /> : <Navigate to="/dashboard" />} 
      />

      {/* Protected Admin Dashboard */}
      <Route 
        path="/admin/dashboard" 
        element={
          <ProtectedRoute adminOnly>
            <>
              <Navbar />
              <AdminDashboard />
            </>
          </ProtectedRoute>
        } 
      />

      {/* Protected User Dashboard */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Upload />
              {/* <Footer /> */}
            </>
          </ProtectedRoute>
        } 
      />

      {/* Home - User Landing Page */}
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Home />
              {/* <Footer /> */}
            </>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/result" 
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Result />
              {/* <Footer /> */}
            </>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/submissions" 
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Submissions />
              {/* <Footer /> */}
            </>
          </ProtectedRoute>
        } 
      />

      {/* View Individual Submission Details */}
      <Route 
        path="/submission/:submissionId" 
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <SubmissionDetails />
              {/* <Footer /> */}
            </>
          </ProtectedRoute>
        } 
      />

      {/* Competition Info - accessible to all logged in users */}
      <Route 
        path="/competition" 
        element={
          <ProtectedRoute>
            <CompetitionInfo />
          </ProtectedRoute>
        } 
      />

      {/* Discussion Forum - accessible to all logged in users */}
      <Route 
        path="/discussion" 
        element={
          <ProtectedRoute>
            <Discussion />
          </ProtectedRoute>
        } 
      />

      {/* Community Chat - accessible to all logged in users */}
      <Route 
        path="/chat" 
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <CommunityChat />
              {/* <Footer /> */}
            </>
          </ProtectedRoute>
        } 
      />

      {/* Profile Page - accessible to all logged in users */}
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Profile />
              {/* <Footer /> */}
            </>
          </ProtectedRoute>
        } 
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="app-container">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
