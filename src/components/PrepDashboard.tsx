import React, { useState } from 'react';
import { Bell, User, LogOut } from 'lucide-react';
import Sidebar from './Sidebar';
import DashboardContent from './DashboardContent';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const PrepDashboard: React.FC = () => {
    const [activeSection, setActiveSection] = useState('overview');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleSectionChange = (section: string) => {
        setActiveSection(section);
        // AJAX-like behavior - content changes without page reload
        console.log(`Switching to section: ${section}`);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Header */}
            <header className={`fixed top-0 right-0 bg-white shadow-sm border-b z-40 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'left-16' : 'left-64'
                }`}>
                <div className="flex items-center justify-end px-6 py-4">
                    <div className="flex items-center space-x-4">
                        <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                            <Bell className="h-5 w-5" />
                        </button>
                        <div className="flex items-center space-x-2">
                            <User className="h-5 w-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">{user?.name || 'Guest'}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-1 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Sidebar */}
            <Sidebar
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={setIsSidebarCollapsed}
            />

            {/* Main Content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-16' : 'ml-64'
                }`}>
                <DashboardContent activeSection={activeSection} />
            </div>
        </div>
    );
};

export default PrepDashboard;
