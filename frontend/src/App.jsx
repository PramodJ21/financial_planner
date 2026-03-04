import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import Questionnaire from './pages/Questionnaire';
import Dashboard from './pages/Dashboard';
import Investments from './pages/Investments';
import Liabilities from './pages/Liabilities';
import Insurance from './pages/Insurance';
import Tax from './pages/Tax';
import Estate from './pages/Estate';
import Reports from './pages/Reports';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/investments" element={<ProtectedRoute><Layout><Investments /></Layout></ProtectedRoute>} />
        <Route path="/liabilities" element={<ProtectedRoute><Layout><Liabilities /></Layout></ProtectedRoute>} />
        <Route path="/insurance" element={<ProtectedRoute><Layout><Insurance /></Layout></ProtectedRoute>} />
        <Route path="/tax" element={<ProtectedRoute><Layout><Tax /></Layout></ProtectedRoute>} />
        <Route path="/estate" element={<ProtectedRoute><Layout><Estate /></Layout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />

        {/* Protected Questionnaire */}
        <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
