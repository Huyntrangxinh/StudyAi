import React, { useState } from 'react';
import {
    Home,
    BarChart3,
    BookOpen,
    ClipboardList,
    TrendingUp,
    ArrowLeft,
    Menu,
    ChevronDown,
    Brain,
    FileText,
    Settings,
    Users,
    Target,
    BookMarked,
    UserPlus,
    GraduationCap,
    Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
    activeSection: string;
    onSectionChange: (section: string) => void;
    isCollapsed?: boolean;
    onToggleCollapse?: (collapsed: boolean) => void;
}

interface NavigationItem {
    id: string;
    label: string;
    icon: any;
    hasSubmenu?: boolean;
    submenu?: {
        id: string;
        label: string;
        icon: any;
    }[];
}

const Sidebar: React.FC<SidebarProps> = ({
    activeSection,
    onSectionChange,
    isCollapsed = false,
    onToggleCollapse
}) => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [selectedProgram, setSelectedProgram] = useState('IELTS');
    const [expandedSections, setExpandedSections] = useState<string[]>([]);

    const navigationItems: NavigationItem[] = [
        { id: 'overview', label: 'Tổng quan', icon: Home },
        { id: 'study-plan', label: 'Study plan', icon: BarChart3 },
        { id: 'courses', label: 'My courses', icon: BookOpen },
        { id: 'test-practice', label: 'Test Practice', icon: ClipboardList },
        { id: 'learning-profile', label: 'Learning Profile', icon: TrendingUp },
        { id: 'ai-learning', label: 'AI Học tập', icon: Brain },
        { id: 'import-docs', label: 'Import tài liệu', icon: FileText },
        { id: 'courses-management', label: 'Khóa học', icon: BookMarked },
        { id: 'settings', label: 'Cài đặt', icon: Settings },
        { id: 'progress', label: 'Tiến độ học tập', icon: Target },
        { id: 'assignments', label: 'Bài tập', icon: BookOpen },
    ];

    // Add admin-specific items with submenu
    if (isAdmin) {
        navigationItems.push({
            id: 'admin',
            label: 'Quản trị hệ thống',
            icon: Users,
            hasSubmenu: true,
            submenu: [
                { id: 'add-teacher', label: 'Thêm giáo viên', icon: UserPlus },
                { id: 'add-student', label: 'Thêm sinh viên', icon: GraduationCap },
                { id: 'upload-file', label: 'Upload file', icon: Upload }
            ]
        });
    }

    const toggleExpanded = (sectionId: string) => {
        setExpandedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    return (
        <div className={`fixed left-0 top-0 h-screen bg-white shadow-lg z-50 transition-all duration-300 ease-in-out flex flex-col ${isCollapsed ? 'w-16' : 'w-64'
            }`}>
            {/* Logo Section */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => onToggleCollapse?.(!isCollapsed)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <Menu className="h-6 w-6 text-gray-600" />
                    </button>
                    {!isCollapsed && (
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                                <span className="text-white font-bold text-sm">P</span>
                            </div>
                            <span className="text-blue-600 font-bold text-lg">REP</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Program Selection */}
            {!isCollapsed && (
                <div className="p-4 border-b">
                    <label htmlFor="program-select" className="block text-sm font-medium text-gray-700 mb-2">
                        Chương trình bạn chọn
                    </label>
                    <div className="relative">
                        <select
                            id="program-select"
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            value={selectedProgram}
                            onChange={(e) => setSelectedProgram(e.target.value)}
                        >
                            <option value="IELTS">IELTS</option>
                            <option value="TOEIC">TOEIC</option>
                            <option value="TOEFL">TOEFL</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <ChevronDown className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Links */}
            <nav className="flex-1 p-4 overflow-y-auto sidebar-scroll">
                <ul className="space-y-2">
                    {navigationItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        const isExpanded = expandedSections.includes(item.id);
                        const hasSubmenu = item.hasSubmenu;

                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => {
                                        if (hasSubmenu) {
                                            toggleExpanded(item.id);
                                        } else {
                                            onSectionChange(item.id);
                                        }
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                                        : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        {!isCollapsed && <span className="font-medium">{item.label}</span>}
                                    </div>
                                    {hasSubmenu && !isCollapsed && (
                                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    )}
                                </button>

                                {/* Submenu */}
                                {hasSubmenu && isExpanded && item.submenu && !isCollapsed && (
                                    <ul className="ml-6 mt-2 space-y-1">
                                        {item.submenu.map((subItem) => {
                                            const SubIcon = subItem.icon;
                                            const isSubActive = activeSection === subItem.id;

                                            return (
                                                <li key={subItem.id}>
                                                    <button
                                                        onClick={() => onSectionChange(subItem.id)}
                                                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${isSubActive
                                                            ? 'bg-blue-50 text-blue-600'
                                                            : 'text-gray-600 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <SubIcon className="h-4 w-4" />
                                                        <span className="font-medium">{subItem.label}</span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Return to Homepage */}
            <div className="p-4 border-t">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    title={isCollapsed ? "Trở về trang chủ" : undefined}
                >
                    <ArrowLeft className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span className="font-medium">Trở về trang chủ</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
