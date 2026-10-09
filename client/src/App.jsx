import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Assessment from './pages/Assessment';
import Revisions from './pages/Revisions';
import Syllabus from './pages/Syllabus';
import Dashboard from './pages/Dashboard';
import Generate from './pages/Generate';
import PlanView from './pages/PlanView';
import ReminderSettings from './pages/ReminderSettings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Navbar />
          <Routes>
            <Route path="/"               element={<Home />} />
            <Route path="/login"          element={<Login />} />
            <Route path="/register"       element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
            <Route path="/revisions" element={<ProtectedRoute><Revisions /></ProtectedRoute>} />
            <Route path="/syllabus" element={<ProtectedRoute><Syllabus /></ProtectedRoute>} />
            <Route path="/settings/reminders" element={<ProtectedRoute><ReminderSettings /></ProtectedRoute>} />
            <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/generate"       element={<ProtectedRoute><Generate /></ProtectedRoute>} />
            <Route path="/plan/:id"        element={<ProtectedRoute><PlanView /></ProtectedRoute>} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
