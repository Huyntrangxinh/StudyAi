import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User, BookOpen, Brain, Settings, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const { user, logout, isAdmin, isTeacher, isStudent } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getRoleText = () => {
        switch (user?.role) {
            case 'admin': return 'Quản trị viên';
            case 'teacher': return 'Giáo viên';
            case 'student': return 'Sinh viên';
            default: return 'Người dùng';
        }
    };

    const getRoleColor = () => {
        switch (user?.role) {
            case 'admin': return 'bg-red-100 text-red-800';
            case 'teacher': return 'bg-blue-100 text-blue-800';
            case 'student': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Brain className="h-8 w-8 text-primary-600" />
                            <h1 className="ml-2 text-xl font-bold text-gray-900">
                                Nền tảng học tập AI
                            </h1>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <User className="h-5 w-5 text-gray-400" />
                                <span className="text-sm text-gray-700">{user?.name}</span>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor()}`}>
                                    {getRoleText()}
                                </span>
                            </div>

                            {isAdmin && (
                                <button
                                    onClick={() => navigate('/admin')}
                                    className="btn-secondary flex items-center space-x-1"
                                >
                                    <Users className="h-4 w-4" />
                                    <span>Quản trị</span>
                                </button>
                            )}

                            <button
                                onClick={handleLogout}
                                className="btn-secondary flex items-center space-x-1"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Đăng xuất</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Chào mừng, {user?.name}!
                    </h2>
                    <p className="text-gray-600">
                        Bạn đang sử dụng tài khoản {getRoleText().toLowerCase()}
                    </p>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="card hover:shadow-xl transition-shadow duration-200">
                        <div className="flex items-center mb-4">
                            <Brain className="h-8 w-8 text-primary-600" />
                            <h3 className="ml-3 text-lg font-semibold text-gray-900">
                                AI Học tập
                            </h3>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Tương tác với AI để học tập hiệu quả, đặt câu hỏi và nhận hỗ trợ 24/7
                        </p>
                        <button className="btn-primary w-full">
                            Bắt đầu học
                        </button>
                    </div>

                    <div className="card hover:shadow-xl transition-shadow duration-200">
                        <div className="flex items-center mb-4">
                            <FileText className="h-8 w-8 text-blue-600" />
                            <h3 className="ml-3 text-lg font-semibold text-gray-900">
                                Import tài liệu
                            </h3>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Upload PDF và sử dụng AI để tóm tắt thông minh
                        </p>
                        <button
                            onClick={() => navigate('/documents')}
                            className="btn-primary w-full"
                        >
                            Import tài liệu
                        </button>
                    </div>

                    <div className="card hover:shadow-xl transition-shadow duration-200">
                        <div className="flex items-center mb-4">
                            <BookOpen className="h-8 w-8 text-green-600" />
                            <h3 className="ml-3 text-lg font-semibold text-gray-900">
                                Prep Dashboard
                            </h3>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Giao diện học tập hiện đại với navigation sidebar và AJAX
                        </p>
                        <button
                            onClick={() => navigate('/prep-dashboard')}
                            className="btn-primary w-full"
                        >
                            Mở Prep Dashboard
                        </button>
                    </div>

                    <div className="card hover:shadow-xl transition-shadow duration-200">
                        <div className="flex items-center mb-4">
                            <BookOpen className="h-8 w-8 text-green-600" />
                            <h3 className="ml-3 text-lg font-semibold text-gray-900">
                                Khóa học
                            </h3>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Tham gia các khóa học được thiết kế riêng cho bạn
                        </p>
                        <button className="btn-primary w-full">
                            Xem khóa học
                        </button>
                    </div>

                    <div className="card hover:shadow-xl transition-shadow duration-200">
                        <div className="flex items-center mb-4">
                            <Settings className="h-8 w-8 text-purple-600" />
                            <h3 className="ml-3 text-lg font-semibold text-gray-900">
                                Cài đặt
                            </h3>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Tùy chỉnh trải nghiệm học tập của bạn
                        </p>
                        <button className="btn-primary w-full">
                            Cài đặt
                        </button>
                    </div>
                </div>

                {/* Role-specific content */}
                {isStudent && (
                    <div className="mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Dành cho sinh viên
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="card">
                                <h4 className="font-medium text-gray-900 mb-2">Tiến độ học tập</h4>
                                <p className="text-gray-600">Theo dõi tiến độ học tập của bạn</p>
                            </div>
                            <div className="card">
                                <h4 className="font-medium text-gray-900 mb-2">Bài tập</h4>
                                <p className="text-gray-600">Xem và làm bài tập được giao</p>
                            </div>
                        </div>
                    </div>
                )}

                {isTeacher && (
                    <div className="mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Dành cho giáo viên
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="card">
                                <h4 className="font-medium text-gray-900 mb-2">Quản lý lớp học</h4>
                                <p className="text-gray-600">Tạo và quản lý các lớp học</p>
                            </div>
                            <div className="card">
                                <h4 className="font-medium text-gray-900 mb-2">Tạo bài tập</h4>
                                <p className="text-gray-600">Tạo và giao bài tập cho sinh viên</p>
                            </div>
                        </div>
                    </div>
                )}

                {isAdmin && (
                    <div className="mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Dành cho quản trị viên
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="card">
                                <h4 className="font-medium text-gray-900 mb-2">Quản lý người dùng</h4>
                                <p className="text-gray-600">Quản lý tài khoản sinh viên và giáo viên</p>
                            </div>
                            <div className="card">
                                <h4 className="font-medium text-gray-900 mb-2">Thống kê hệ thống</h4>
                                <p className="text-gray-600">Xem báo cáo và thống kê hệ thống</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
