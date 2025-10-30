// Mock database service for browser environment
// In production, this would connect to a real API

export interface User {
    id: string;
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'teacher' | 'student';
    isActive: boolean;
    studentId?: string;
    classId?: string;
    dateOfBirth?: string;
    createdAt: string;
    updatedAt: string;
}

// In-memory storage
let users: User[] = [];

// Database service functions
export const dbService = {
    // Lấy tất cả users
    getAllUsers: (): User[] => {
        return [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    // Lấy user theo ID
    getUserById: (id: string): User | undefined => {
        return users.find(user => user.id === id);
    },

    // Lấy user theo email
    getUserByEmail: (email: string): User | undefined => {
        return users.find(user => user.email === email);
    },

    // Tạo user mới
    createUser: (userData: {
        id: string;
        name: string;
        email: string;
        password: string;
        role: 'admin' | 'teacher' | 'student';
        isActive?: boolean;
        studentId?: string;
        classId?: string;
        dateOfBirth?: string;
    }): boolean => {
        try {
            // Kiểm tra email đã tồn tại chưa
            const existingUser = users.find(user => user.email === userData.email);
            if (existingUser) {
                return false;
            }

            const newUser: User = {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                password: userData.password,
                role: userData.role,
                isActive: userData.isActive ?? true,
                studentId: userData.studentId,
                classId: userData.classId,
                dateOfBirth: userData.dateOfBirth,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            users.push(newUser);
            return true;
        } catch (error) {
            console.error('Error creating user:', error);
            return false;
        }
    },

    // Cập nhật user
    updateUser: (id: string, updates: {
        name?: string;
        email?: string;
        password?: string;
        isActive?: boolean;
        studentId?: string;
        classId?: string;
        dateOfBirth?: string;
    }): boolean => {
        try {
            const userIndex = users.findIndex(user => user.id === id);
            if (userIndex === -1) {
                return false;
            }

            // Kiểm tra email trùng lặp (nếu có thay đổi email)
            if (updates.email && updates.email !== users[userIndex].email) {
                const existingUser = users.find(user => user.email === updates.email && user.id !== id);
                if (existingUser) {
                    return false;
                }
            }

            users[userIndex] = {
                ...users[userIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            return true;
        } catch (error) {
            console.error('Error updating user:', error);
            return false;
        }
    },

    // Xóa user
    deleteUser: (id: string): boolean => {
        try {
            const userIndex = users.findIndex(user => user.id === id);
            if (userIndex === -1) {
                return false;
            }

            users.splice(userIndex, 1);
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            return false;
        }
    },

    // Lấy users theo role
    getUsersByRole: (role: 'admin' | 'teacher' | 'student'): User[] => {
        return users.filter(user => user.role === role).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    // Đếm users theo role
    countUsersByRole: (role: 'admin' | 'teacher' | 'student'): number => {
        return users.filter(user => user.role === role).length;
    },

    // Đếm tổng users
    countAllUsers: (): number => {
        return users.length;
    },

    // Reset database (xóa tất cả dữ liệu)
    resetDatabase: (): void => {
        users = [];
        localStorage.removeItem('users_data');
        console.log('Database reset');
    },

    // Clear localStorage và khởi tạo lại dữ liệu mẫu
    resetToSampleData: (): void => {
        localStorage.removeItem('users_data');
        initializeSampleData();
        console.log('Reset to sample data');
    }
};

// Lưu dữ liệu vào localStorage để persist
const saveToLocalStorage = () => {
    try {
        localStorage.setItem('users_data', JSON.stringify(users));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
};

// Load dữ liệu từ localStorage
const loadFromLocalStorage = () => {
    try {
        const savedData = localStorage.getItem('users_data');
        if (savedData) {
            const parsedUsers = JSON.parse(savedData);
            users = parsedUsers;
        } else {
            // Chỉ tạo dữ liệu mẫu khi localStorage trống
            initializeSampleData();
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        // Nếu có lỗi parse, tạo dữ liệu mẫu
        initializeSampleData();
    }
};

// Khởi tạo dữ liệu mẫu
const initializeSampleData = () => {
    const sampleUsers: User[] = [
        {
            id: 'admin-1',
            name: 'Admin',
            email: 'admin@ictu.edu.vn',
            password: 'admin123',
            role: 'admin',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'teacher-1',
            name: 'Giáo viên 1',
            email: 'teacher1@ictu.edu.vn',
            password: 'teacher123',
            role: 'teacher',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'student-1',
            name: 'Sinh viên 1',
            email: 'student1@ictu.edu.vn',
            password: 'student123',
            role: 'student',
            isActive: true,
            studentId: 'SV001',
            classId: 'CNTT01',
            dateOfBirth: '2000-01-01',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];

    users = sampleUsers;
    saveToLocalStorage();
    console.log('Initialized sample data');
};

// Load dữ liệu khi khởi tạo
loadFromLocalStorage();

// Override các hàm để tự động save
const originalCreateUser = dbService.createUser;
const originalUpdateUser = dbService.updateUser;
const originalDeleteUser = dbService.deleteUser;

dbService.createUser = (userData) => {
    const result = originalCreateUser(userData);
    if (result) {
        saveToLocalStorage();
    }
    return result;
};

dbService.updateUser = (id, updates) => {
    const result = originalUpdateUser(id, updates);
    if (result) {
        saveToLocalStorage();
    }
    return result;
};

dbService.deleteUser = (id) => {
    const result = originalDeleteUser(id);
    if (result) {
        saveToLocalStorage();
    }
    return result;
};

export default dbService;
