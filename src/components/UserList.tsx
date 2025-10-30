import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User as UserType } from '../contexts/AuthContext';
import { User as UserIcon, Mail, Trash2, Search, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const UserList: React.FC = () => {
    const { getAllUsers, updateUser, deleteUser } = useAuth();
    const [allUsers, setAllUsers] = useState<UserType[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'teachers' | 'students'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadUsers();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadUsers = async () => {
        try {
            const users = await getAllUsers();
            setAllUsers(users);
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Không thể tải danh sách người dùng');
        }
    };

    const filteredUsers = allUsers.filter(user => {
        // Filter by role
        if (activeTab === 'teachers' && user.role !== 'teacher') return false;
        if (activeTab === 'students' && user.role !== 'student') return false;

        // Filter by search term (MSV, name, email)
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            return (
                user.name.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower) ||
                (user.studentId && user.studentId.toLowerCase().includes(searchLower))
            );
        }

        return true;
    });

    const handleToggleStatus = async (id: string) => {
        const user = allUsers.find(u => u.id === id);
        if (user) {
            const success = await updateUser(id, { isActive: !user.isActive });
            if (success) {
                loadUsers(); // Reload users after update
            }
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
            const success = await deleteUser(id);
            if (success) {
                loadUsers(); // Reload users after deletion
            }
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-red-100 text-red-800';
            case 'teacher':
                return 'bg-blue-100 text-blue-800';
            case 'student':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleText = (role: string) => {
        switch (role) {
            case 'admin':
                return 'Admin';
            case 'teacher':
                return 'Giáo viên';
            case 'student':
                return 'Sinh viên';
            default:
                return role;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => window.history.back()}
                                className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h1 className="text-xl font-semibold text-gray-900">
                                Quản lý người dùng
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'all'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Tất cả ({allUsers.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('teachers')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'teachers'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Giáo viên ({allUsers.filter(u => u.role === 'teacher').length})
                            </button>
                            <button
                                onClick={() => setActiveTab('students')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'students'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Sinh viên ({allUsers.filter(u => u.role === 'student').length})
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, email hoặc mã sinh viên..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                </div>

                {/* Users List */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Danh sách người dùng ({filteredUsers.length})
                        </h3>
                    </div>

                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-8">
                            <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">Không tìm thấy người dùng nào</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Người dùng
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Vai trò
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Trạng thái
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Thông tin bổ sung
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.name}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                                                    <div className="text-sm text-gray-900">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                                                    {getRoleText(user.role)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {user.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {user.role === 'student' && (
                                                    <div className="text-xs text-gray-500">
                                                        {user.studentId && <div>Mã SV: {user.studentId}</div>}
                                                        {user.classId && <div>Lớp: {user.classId}</div>}
                                                        {user.dateOfBirth && <div>Ngày sinh: {user.dateOfBirth}</div>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleToggleStatus(user.id)}
                                                        className={`text-xs px-2 py-1 rounded ${user.isActive
                                                            ? 'text-red-600 hover:text-red-900 border border-red-300 hover:bg-red-50'
                                                            : 'text-green-600 hover:text-green-900 border border-green-300 hover:bg-green-50'
                                                            }`}
                                                    >
                                                        {user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="text-red-600 hover:text-red-900 text-xs px-2 py-1 rounded border border-red-300 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserList;
