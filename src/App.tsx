import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import ResetPassword from './components/ResetPassword';
import AdminPanel from './components/AdminPanel';
import UserList from './components/UserList';
import DocumentUpload from './components/DocumentUpload';
import TestUpload from './components/TestUpload';
import PrepDashboard from './components/PrepDashboard';
import StudyFetchDashboard from './components/StudyFetchDashboard';
import HybridDashboard from './components/HybridDashboard';
import PDFViewerFixed from './components/PDFViewerFixed';
import ProtectedRoute from './components/ProtectedRoute';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '32402427703-636ai8dcanhb6ltnf4n2vktcbvrcflsi.apps.googleusercontent.com';

// Log environment variables status (only in development)
if (process.env.NODE_ENV === 'development') {
    console.log('🔐 Frontend Environment Variables Status:');
    console.log('  REACT_APP_GOOGLE_CLIENT_ID:', process.env.REACT_APP_GOOGLE_CLIENT_ID
        ? `✅ Set (${process.env.REACT_APP_GOOGLE_CLIENT_ID.substring(0, 20)}...)`
        : '❌ Not set (using fallback)');
    console.log('  Using GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID.substring(0, 30) + '...');
}

function App() {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
                <Router>
                    <div className="min-h-screen bg-gray-50">
                        <Toaster position="top-right" />
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route
                                path="/dashboard/*"
                                element={
                                    <ProtectedRoute>
                                        <HybridDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute requireAdmin>
                                        <AdminPanel />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/users"
                                element={
                                    <ProtectedRoute requireAdmin>
                                        <UserList />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/documents"
                                element={
                                    <ProtectedRoute>
                                        <DocumentUpload />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/test-upload"
                                element={
                                    <ProtectedRoute>
                                        <TestUpload />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/" element={<Navigate to="/login" replace />} />
                        </Routes>
                    </div>
                </Router>
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}

export default App;
