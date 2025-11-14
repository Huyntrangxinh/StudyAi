import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { apiService, User as ApiUser } from '../services/apiService';

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'teacher' | 'admin';
    isActive: boolean;
    createdAt: string;
    dateOfBirth?: string;
    studentId?: string;
    classId?: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<boolean>;
    loginWithGoogle: (credential: string) => Promise<boolean>;
    register: (email: string, password: string, name: string) => Promise<boolean>;
    logout: () => void;
    loading: boolean;
    isAdmin: boolean;
    isTeacher: boolean;
    isStudent: boolean;
    // Admin functions
    addTeacher: (name: string, email: string) => Promise<boolean>;
    addStudent: (name: string, studentId: string, dateOfBirth: string) => Promise<boolean>;
    getAllUsers: () => Promise<User[]>;
    updateUser: (id: string, updates: Partial<User>) => Promise<boolean>;
    deleteUser: (id: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Kiểm tra localStorage để lấy thông tin user đã đăng nhập
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            setLoading(true);

            // Sử dụng API service để đăng nhập
            const apiUser = await apiService.login(email, password);

            if (!apiUser) {
                toast.error('Email hoặc mật khẩu không đúng!');
                return false;
            }

            // Convert API user to frontend user format
            const frontendUser: User = {
                id: apiUser.id,
                email: apiUser.email,
                name: apiUser.name,
                role: apiUser.role,
                isActive: true,
                createdAt: apiUser.created_at,
                studentId: apiUser.student_id,
            };

            // Đăng nhập thành công
            setUser(frontendUser);
            localStorage.setItem('user', JSON.stringify(frontendUser));
            toast.success('Đăng nhập thành công!');
            return true;
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Đăng nhập thất bại!');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const loginWithGoogle = async (credential: string): Promise<boolean> => {
        try {
            setLoading(true);

            const response = await fetch('http://localhost:3001/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Google login failed');
            }

            const data = await response.json();
            const apiUser = data.user;

            if (!apiUser) {
                toast.error('Đăng nhập Google thất bại!');
                return false;
            }

            // Convert API user to frontend user format
            const frontendUser: User = {
                id: apiUser.id,
                email: apiUser.email,
                name: apiUser.name,
                role: apiUser.role,
                isActive: true,
                createdAt: apiUser.created_at || new Date().toISOString(),
                studentId: apiUser.student_id,
            };

            setUser(frontendUser);
            localStorage.setItem('user', JSON.stringify(frontendUser));
            toast.success('Đăng nhập Google thành công!');
            return true;
        } catch (error: any) {
            console.error('Google login error:', error);
            toast.error(error.message || 'Đăng nhập Google thất bại!');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const register = async (email: string, password: string, name: string): Promise<boolean> => {
        try {
            setLoading(true);

            // Kiểm tra email có đúng domain không
            if (!email.endsWith('@ictu.edu.vn')) {
                toast.error('Email phải có đuôi @ictu.edu.vn!');
                return false;
            }

            // Sử dụng API service để đăng ký
            const apiUser = await apiService.register(email, password, name, 'student');

            // Convert API user to frontend user format
            const frontendUser: User = {
                id: apiUser.id,
                email: apiUser.email,
                name: apiUser.name,
                role: apiUser.role,
                isActive: true,
                createdAt: apiUser.created_at,
                studentId: apiUser.student_id,
            };

            setUser(frontendUser);
            localStorage.setItem('user', JSON.stringify(frontendUser));
            toast.success('Đăng ký thành công!');
            return true;
        } catch (error: any) {
            console.error('Register error:', error);
            toast.error(error.message || 'Đăng ký thất bại!');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        toast.success('Đăng xuất thành công!');
    };

    const addTeacher = async (name: string, email: string): Promise<boolean> => {
        try {
            await apiService.createUser({
                email,
                password: 'teacher123', // Default password
                name,
                role: 'teacher',
            });
            return true;
        } catch (error: any) {
            console.error('Add teacher error:', error);
            throw new Error(error.message || 'Thêm giáo viên thất bại!');
        }
    };

    const addStudent = async (name: string, studentId: string, dateOfBirth: string): Promise<boolean> => {
        try {
            // Generate email from student ID
            const email = `${studentId}@ictu.edu.vn`;

            // Convert date format from YYYY-MM-DD to DD/MM/YYYY for password
            const dateObj = new Date(dateOfBirth);
            const day = dateObj.getDate().toString().padStart(2, '0');
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const year = dateObj.getFullYear();
            const password = `${day}/${month}/${year}`;

            await apiService.createUser({
                email,
                password,
                name,
                role: 'student',
                student_id: studentId,
            });
            return true;
        } catch (error: any) {
            console.error('Add student error:', error);
            throw new Error(error.message || 'Thêm sinh viên thất bại!');
        }
    };

    const getAllUsers = async (): Promise<User[]> => {
        try {
            const apiUsers = await apiService.getAllUsers();
            return apiUsers.map(apiUser => ({
                id: apiUser.id,
                email: apiUser.email,
                name: apiUser.name,
                role: apiUser.role,
                isActive: true,
                createdAt: apiUser.created_at,
                studentId: apiUser.student_id,
            }));
        } catch (error) {
            console.error('Get all users error:', error);
            return [];
        }
    };

    const updateUser = async (id: string, updates: Partial<User>): Promise<boolean> => {
        try {
            const apiUpdates: any = {};
            if (updates.email) apiUpdates.email = updates.email;
            if (updates.name) apiUpdates.name = updates.name;
            if (updates.role) apiUpdates.role = updates.role;
            if (updates.studentId) apiUpdates.student_id = updates.studentId;

            await apiService.updateUser(id, apiUpdates);
            toast.success('Cập nhật người dùng thành công!');
            return true;
        } catch (error: any) {
            console.error('Update user error:', error);
            toast.error(error.message || 'Cập nhật người dùng thất bại!');
            return false;
        }
    };

    const deleteUser = async (id: string): Promise<boolean> => {
        try {
            await apiService.deleteUser(id);
            toast.success('Xóa người dùng thành công!');
            return true;
        } catch (error: any) {
            console.error('Delete user error:', error);
            toast.error(error.message || 'Xóa người dùng thất bại!');
            return false;
        }
    };

    const value: AuthContextType = {
        user,
        login,
        loginWithGoogle,
        register,
        logout,
        loading,
        isAdmin: user?.role === 'admin',
        isTeacher: user?.role === 'teacher',
        isStudent: user?.role === 'student',
        addTeacher,
        addStudent,
        getAllUsers,
        updateUser,
        deleteUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};