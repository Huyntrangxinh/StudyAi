import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import AdminPanel from './components/AdminPanel';
import UserList from './components/UserList';
import DocumentUpload from './components/DocumentUpload';
import TestUpload from './components/TestUpload';
import PrepDashboard from './components/PrepDashboard';
import StudyFetchDashboard from './components/StudyFetchDashboard';
import HybridDashboard from './components/HybridDashboard';
import PDFViewerFixed from './components/PDFViewerFixed';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="min-h-screen bg-gray-50">
                    <Toaster position="top-right" />
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
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
    );
}

export default App;
