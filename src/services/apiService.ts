const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface User {
    id: string;
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'teacher' | 'student';
    student_id?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateUserData {
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'teacher' | 'student';
    student_id?: string;
}

export interface UpdateUserData {
    email?: string;
    password?: string;
    name?: string;
    role?: 'admin' | 'teacher' | 'student';
    student_id?: string;
}

class ApiService {
    // User management
    async getAllUsers(): Promise<User[]> {
        const response = await fetch(`${API_BASE}/api/users`);
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        return data.users;
    }

    async createUser(userData: CreateUserData): Promise<User> {
        const response = await fetch(`${API_BASE}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create user');
        }

        const data = await response.json();
        return data.user;
    }

    async updateUser(id: string, updates: UpdateUserData): Promise<User> {
        const response = await fetch(`${API_BASE}/api/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update user');
        }

        const data = await response.json();
        return data.user;
    }

    async deleteUser(id: string): Promise<void> {
        const response = await fetch(`${API_BASE}/api/users/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete user');
        }
    }

    // Authentication
    async login(email: string, password: string): Promise<User | null> {
        try {
            const response = await fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            return data.user || null;
        } catch (error) {
            console.error('Login error:', error);
            return null;
        }
    }

    async register(email: string, password: string, name: string, role: 'student' | 'teacher' = 'student'): Promise<User> {
        return this.createUser({
            email,
            password,
            name,
            role,
        });
    }

    // Bookmarks (flashcards)
    async toggleFlashcardBookmark(flashcardId: string | number, userId: string) {
        const response = await fetch(`${API_BASE}/api/flashcards/${flashcardId}/bookmarks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        if (!response.ok) {
            throw new Error('Failed to toggle bookmark');
        }
        return response.json() as Promise<{ status: 'added' | 'removed' }>;
    }

    async getBookmarkedFlashcards(userId: string, flashcardSetId?: string) {
        const params = new URLSearchParams({ userId, ...(flashcardSetId ? { flashcardSetId } : {}) });
        const response = await fetch(`${API_BASE}/api/flashcards/bookmarks?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to fetch bookmarks');
        }
        return response.json() as Promise<Array<{ id: number; front: string; back: string; id_flashcard_set: number }>>;
    }
}

export const apiService = new ApiService();
export default apiService;


