import React, { useState } from 'react';
import {
    Home,
    Layers,
    Calendar,
    BookOpen,
    MessageCircle,
    Video,
    CreditCard,
    CheckSquare,
    HelpCircle,
    Gamepad2,
    FileText,
    Play,
    FileText as Notebook,
    Volume2,
    Upload,
    Settings,
    Bookmark,
    Flame,
    ChevronDown,
    Plus,
    Users,
    UserPlus,
    GraduationCap,
    FileSpreadsheet,
    Brain,
    BarChart3,
    ClipboardList,
    UserCheck,
    LogOut,
    Moon,
    Sun
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import DashboardContent from './DashboardContent';
import StudySetCard from './StudySetCard';
import StudySetDetail from './StudySetDetail';
import PDFViewerFixed from './PDFViewerFixed';
import Flashcards from './Flashcards';
import toast from 'react-hot-toast';

const HybridDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [activeSection, setActiveSection] = useState('home');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [studySets, setStudySets] = useState<Array<{ id: string, name: string, description: string, createdAt: string }>>([]);
    const [showAddSetModal, setShowAddSetModal] = useState(false);
    const [newSetName, setNewSetName] = useState('');
    const [newSetDescription, setNewSetDescription] = useState('');
    const [selectedStudySet, setSelectedStudySet] = useState<{ id: string, name: string, description: string, createdAt: string } | null>(null);
    const [showStudySetDetail, setShowStudySetDetail] = useState(false);
    const [showMaterialViewer, setShowMaterialViewer] = useState(false);
    const [showFlashcards, setShowFlashcards] = useState(false);

    // Handle start learning
    const handleStartLearning = () => {
        if (selectedStudySet) {
            setShowStudySetDetail(true);
        }
    };

    // Handle view material
    const handleViewMaterial = () => {
        setShowMaterialViewer(true);
    };

    const handleViewFlashcards = () => {
        setShowFlashcards(true);
    };

    const handleBackFromFlashcards = () => {
        setShowFlashcards(false);
        setActiveSection('home'); // Set về home khi quay lại
    };

    // Load study sets from database
    const loadStudySets = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/study-sets?userId=${user?.id || '0'}`);
            if (response.ok) {
                const data = await response.json();
                setStudySets(data);
                // Auto-select first study set if available
                if (data.length > 0 && !selectedStudySet) {
                    setSelectedStudySet(data[0]);
                }
            }
        } catch (error) {
            console.error('Error loading study sets:', error);
        }
    };

    // Add new study set
    const addStudySet = async () => {
        if (!newSetName.trim()) {
            alert('Vui lòng nhập tên study set');
            return;
        }

        try {
            console.log('Creating study set with user:', user);
            console.log('User ID:', user?.id);

            const response = await fetch('http://localhost:3001/api/study-sets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newSetName.trim(),
                    description: newSetDescription.trim(),
                    userId: user?.id || '0'
                }),
            });

            if (response.ok) {
                const newSet = await response.json();
                setStudySets(prev => [...prev, newSet]);
                setSelectedStudySet(newSet); // Auto-select the new study set
                setNewSetName('');
                setNewSetDescription('');
                setShowAddSetModal(false);
                setShowStudySetDetail(true);
                toast.success('Đã tạo study set thành công!');
            } else {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                toast.error('Có lỗi xảy ra khi tạo study set: ' + (errorData.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error adding study set:', error);
            toast.error('Có lỗi xảy ra khi tạo study set');
        }
    };

    // Load study sets on component mount
    React.useEffect(() => {
        loadStudySets();
    }, []);

    // Navigation items based on user role
    const getNavigationItems = () => {
        const baseItems: Array<{
            id: string;
            label: string;
            icon: any;
            active?: boolean;
            admin?: boolean;
        }> = [
                { id: 'home', label: 'Trang chủ', icon: Home },
                { id: 'sets', label: 'Bộ học của tôi', icon: Layers },
                { id: 'calendar', label: 'Lịch', icon: Calendar },
                { id: 'study', label: 'Bộ học đầu tiên...', icon: BookOpen },
                { id: 'chat', label: 'Trò chuyện', icon: MessageCircle },
                { id: 'lecture', label: 'Bài giảng trực tiếp', icon: Video },
                { id: 'flashcards', label: 'Thẻ ghi nhớ', icon: CreditCard },
                { id: 'tests', label: 'Tests & QuizFetch', icon: CheckSquare },
                { id: 'tutor', label: 'Gia sư của tôi', icon: HelpCircle },
                { id: 'arcade', label: 'Trò chơi', icon: Gamepad2 },
                { id: 'essay', label: 'Chấm điểm bài luận', icon: FileText },
                { id: 'explainers', label: 'Giải thích', icon: Play },
                { id: 'audio', label: 'Tóm tắt âm thanh', icon: Volume2 },
                { id: 'notes', label: 'Ghi chú & Tài liệu', icon: Notebook }
            ];

        // Add admin items if user is admin
        if (user?.role === 'admin') {
            baseItems.push(
                { id: 'admin', label: 'Quản trị hệ thống', icon: Settings, admin: true },
                { id: 'add-teacher', label: 'Thêm giáo viên', icon: UserPlus, admin: true },
                { id: 'add-student', label: 'Thêm sinh viên', icon: GraduationCap, admin: true },
                { id: 'upload-file', label: 'Tải lên file', icon: FileSpreadsheet, admin: true },
                { id: 'ai-learning', label: 'AI Học tập', icon: Brain, admin: true },
                { id: 'progress', label: 'Tiến độ học tập', icon: BarChart3, admin: true },
                { id: 'assignments', label: 'Bài tập', icon: ClipboardList, admin: true }
            );
        }

        return baseItems;
    };

    const navigationItems = getNavigationItems();

    const getIconColor = (itemId: string) => {
        const colorMap: { [key: string]: string } = {
            'home': 'text-blue-600',
            'sets': 'text-green-600',
            'calendar': 'text-purple-600',
            'study': 'text-purple-600',
            'chat': 'text-gray-600',
            'lecture': 'text-green-600',
            'flashcards': 'text-blue-600',
            'tests': 'text-yellow-600',
            'tutor': 'text-purple-600',
            'arcade': 'text-pink-600',
            'essay': 'text-green-600',
            'explainers': 'text-blue-600',
            'audio': 'text-purple-600',
            'notes': 'text-yellow-600',
            'admin': 'text-orange-600',
            'add-teacher': 'text-orange-600',
            'add-student': 'text-orange-600',
            'upload-file': 'text-orange-600',
            'ai-learning': 'text-orange-600',
            'progress': 'text-orange-600',
            'assignments': 'text-orange-600'
        };
        return colorMap[itemId] || 'text-gray-600';
    };

    const handleNavigationClick = (itemId: string, event: React.MouseEvent) => {
        // Tạo hiệu ứng ripple
        const button = event.currentTarget as HTMLButtonElement;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(59, 130, 246, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);

        // Các section đã được implement
        const implementedSections = ['home', 'admin', 'add-teacher', 'add-student', 'upload-file', 'ai-learning', 'progress', 'assignments'];

        if (implementedSections.includes(itemId)) {
            setActiveSection(itemId);
            // Reset tất cả views khi chuyển section
            setShowFlashcards(false);
            setShowMaterialViewer(false);
            setShowStudySetDetail(false);

            // Đặc biệt cho "Trang chủ": đảm bảo về dashboard chính
            if (itemId === 'home') {
                setSelectedStudySet(null);
            }
        } else if (itemId === 'flashcards') {
            // Xử lý click vào "Thẻ ghi nhớ"
            if (selectedStudySet) {
                setActiveSection(''); // Reset active section
                setShowFlashcards(true);
            } else {
                toast.error('Vui lòng chọn một bộ học trước khi xem thẻ ghi nhớ', {
                    duration: 3000,
                    position: 'top-right',
                });
            }
        } else {
            toast.success('Sẽ sớm cập nhật!', {
                duration: 3000,
                position: 'top-right',
                style: {
                    background: '#3B82F6',
                    color: '#fff',
                },
            });
        }
    };

    const renderMainContent = () => {
        // If admin section, use old DashboardContent logic
        if (user?.role === 'admin' && ['admin', 'add-teacher', 'add-student', 'upload-file', 'ai-learning', 'progress', 'assignments'].includes(activeSection)) {
            return <DashboardContent activeSection={activeSection} />;
        }

        // Show Flashcards if requested
        if (showFlashcards && selectedStudySet) {
            return (
                <Flashcards
                    studySetId={selectedStudySet.id}
                    studySetName={selectedStudySet.name}
                    onBack={() => setShowFlashcards(false)}
                    isCollapsed={isCollapsed}
                />
            );
        }

        // Show StudySetDetail if study set was just created
        if (showMaterialViewer && selectedStudySet) {
            return (
                <PDFViewerFixed
                    studySetId={selectedStudySet.id}
                    studySetName={selectedStudySet.name}
                    onBack={() => {
                        setShowMaterialViewer(false);
                        setActiveSection('home');
                    }}
                    isCollapsed={isCollapsed}
                />
            );
        }

        // Show Flashcards if flashcards was clicked
        if (showFlashcards && selectedStudySet) {
            return (
                <Flashcards
                    studySetId={selectedStudySet.id}
                    studySetName={selectedStudySet.name}
                    onBack={handleBackFromFlashcards}
                    isCollapsed={isCollapsed}
                />
            );
        }

        if (showStudySetDetail && selectedStudySet) {
            return (
                <StudySetDetail
                    key={selectedStudySet.id} // Force re-render when study set changes
                    studySet={selectedStudySet}
                    onBack={() => {
                        setShowStudySetDetail(false);
                        setActiveSection('home');
                    }}
                    onViewMaterial={handleViewMaterial}
                    onViewFlashcards={handleViewFlashcards}
                    isCollapsed={isCollapsed}
                />
            );
        }

        // Otherwise, show StudyFetch content
        return (
            <div className="flex-1 p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 flex items-center justify-center">
                                <img
                                    src="/SPARKE.gif"
                                    alt="Avatar"
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        // Fallback to emoji if image fails to load
                                        e.currentTarget.style.display = 'none';
                                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                        if (nextElement) {
                                            nextElement.style.display = 'block';
                                        }
                                    }}
                                />
                                <span className="text-2xl" style={{ display: 'none' }}>🤖</span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    Chào buổi chiều, {user?.name || 'Người dùng'}!
                                </h1>
                                <p className="text-lg text-gray-600 mt-1">
                                    Bạn đang làm việc với bộ học nào hôm nay?
                                </p>
                            </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center space-x-3">
                            <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors">
                                <span>Nâng cấp</span>
                                <ChevronDown className="w-4 h-4 rotate-180" />
                            </button>
                            <button className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 transition-colors">
                                <span>Phản hồi</span>
                                <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs">i</span>
                            </button>
                            <div className="relative">
                                <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center relative">
                                        {/* Diamond shape */}
                                        <div className="w-3 h-3 bg-green-400 transform rotate-45 relative">
                                            {/* Purple triangles pointing inward */}
                                            <div className="absolute -top-1 -left-1 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-purple-600"></div>
                                            <div className="absolute -top-1 -right-1 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-purple-600"></div>
                                            <div className="absolute -bottom-1 -left-1 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-purple-600"></div>
                                            <div className="absolute -bottom-1 -right-1 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-purple-600"></div>
                                        </div>
                                        {/* Notification badge */}
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white border-2 border-purple-600 rounded-full flex items-center justify-center">
                                            <span className="text-purple-600 text-xs font-bold">1</span>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Study Set Buttons */}
                    <div className="flex items-center space-x-4 mb-6">
                        {studySets.length > 0 ? (
                            studySets.map((set) => (
                                <button
                                    key={set.id}
                                    onClick={() => setSelectedStudySet(set)}
                                    className={`flex items-center space-x-3 px-6 py-4 rounded-lg transition-colors shadow-sm ${selectedStudySet?.id === set.id
                                        ? 'bg-blue-100 border-2 border-blue-400 text-gray-900'
                                        : 'bg-white border-2 border-gray-200 text-gray-900 hover:border-blue-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="w-8 h-8 bg-orange-200 rounded-lg flex items-center justify-center">
                                        <div className="flex flex-wrap w-4 h-4">
                                            <div className="w-1 h-1 bg-blue-600 rounded-full m-0.5"></div>
                                            <div className="w-1 h-1 bg-yellow-500 rounded-full m-0.5"></div>
                                            <div className="w-1 h-1 bg-green-500 rounded-full m-0.5"></div>
                                            <div className="w-1 h-1 bg-blue-500 rounded-full m-0.5"></div>
                                        </div>
                                    </div>
                                    <span className="font-semibold text-gray-900">{set.name}</span>
                                </button>
                            ))
                        ) : (
                            <button className="flex items-center space-x-3 bg-blue-50 border-2 border-blue-300 text-gray-900 px-6 py-4 rounded-lg hover:border-blue-400 transition-colors shadow-sm">
                                <div className="w-8 h-8 bg-orange-200 rounded-lg flex items-center justify-center">
                                    <div className="flex flex-wrap w-4 h-4">
                                        <div className="w-1 h-1 bg-blue-600 rounded-full m-0.5"></div>
                                        <div className="w-1 h-1 bg-yellow-500 rounded-full m-0.5"></div>
                                        <div className="w-1 h-1 bg-green-500 rounded-full m-0.5"></div>
                                        <div className="w-1 h-1 bg-blue-500 rounded-full m-0.5"></div>
                                    </div>
                                </div>
                                <span className="font-semibold text-gray-900">Bộ học đầu tiên của tôi</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddSetModal(true)}
                            className="flex items-center space-x-3 bg-gray-50 border-2 border-dashed border-gray-300 text-gray-600 px-6 py-4 rounded-lg hover:border-gray-400 transition-colors shadow-sm"
                        >
                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                                <span className="text-gray-600 text-lg font-bold">+</span>
                            </div>
                            <span className="font-medium text-gray-600">Thêm bộ học</span>
                        </button>
                    </div>

                </div>

                {/* Divider Line */}
                <div className="w-full h-px bg-gray-300 my-6"></div>

                {/* Main Content Area - 2 columns */}
                <div className="flex gap-6">
                    {/* Left Column - Study Set Card */}
                    <div className="flex-1">
                        <StudySetCard
                            studySetName={selectedStudySet?.name || "Bộ học đầu tiên của tôi"}
                            onStartLearning={handleStartLearning}
                        />
                    </div>

                    {/* Right Column - 3 Cards */}
                    <div className="w-80 space-y-6">
                        {/* Streak Card */}
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <Flame className="w-5 h-5 text-orange-500" />
                                    <span className="text-2xl font-bold text-gray-900">Chuỗi 0 ngày!</span>
                                </div>
                                <button className="text-blue-600 hover:text-blue-700 text-sm">Xem bảng xếp hạng</button>
                            </div>
                        </div>

                        {/* Materials Card */}
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Tài liệu</h3>
                                <button className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                                    <Upload className="w-4 h-4" />
                                    <span>Tải lên</span>
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">Tài liệu không tên</p>
                                        <p className="text-sm text-gray-500">25 Thg 10, 2025</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <button className="text-blue-600 hover:text-blue-700 text-sm">Xem tất cả</button>
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Card */}
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Sắp tới</h3>
                                <button className="text-gray-600 hover:text-gray-800">
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-center text-gray-600">
                                <p className="mb-2">Không có sự kiện sắp tới</p>
                                <button className="text-blue-600 hover:text-blue-700 text-sm">Xem tất cả</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Left Sidebar - Fixed */}
            <div className={`fixed left-0 top-0 h-screen z-30 ${isCollapsed ? 'w-16' : 'w-48'} ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex flex-col transition-all duration-300`}>
                {/* Logo */}
                <div className="p-3 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                                <img
                                    src="/SPARKE.gif"
                                    alt="SPARKE"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            {!isCollapsed && (
                                <span className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>STUDY FETCH</span>
                            )}
                        </div>
                        {/* Dark Mode & Collapse Buttons */}
                        <div className="flex items-center space-x-1">
                            {/* Dark Mode Button */}
                            <button
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {isDarkMode ? (
                                    <Sun className="w-3 h-3 text-yellow-600" />
                                ) : (
                                    <Moon className="w-3 h-3 text-gray-600" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search and Flame */}
                <div className="p-2 border-b">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 text-gray-600">
                            <Flame className="w-4 h-4" />
                            {!isCollapsed && <span className="text-sm">0</span>}
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <ul className="space-y-1">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            // Logic active state: chỉ một nút active tại một thời điểm
                            let isActive = false;

                            if (item.id === 'home') {
                                // Home active khi: không có view nào đang mở (dashboard chính)
                                isActive = !showFlashcards && !showMaterialViewer && !showStudySetDetail;
                                if (item.id === 'home') {
                                    console.log('Home active check:', {
                                        showFlashcards,
                                        showMaterialViewer,
                                        showStudySetDetail,
                                        isActive
                                    });
                                }
                            } else if (item.id === 'flashcards') {
                                // Flashcards active khi: đang xem flashcards
                                isActive = showFlashcards;
                                console.log('Flashcards active check:', {
                                    showFlashcards,
                                    isActive
                                });
                            } else {
                                // Các nút khác active khi: đang ở section đó
                                isActive = activeSection === item.id;
                            }
                            const isAdmin = item.admin;

                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={(e) => handleNavigationClick(item.id, e)}
                                        className={`w-full flex items-center space-x-2 px-1.5 py-1 rounded-md text-left transition-all duration-200 text-sm transform hover:scale-105 active:scale-95 ${isActive
                                            ? isDarkMode ? 'bg-blue-900 text-blue-400' : 'bg-blue-50 text-blue-600'
                                            : isAdmin
                                                ? isDarkMode ? 'text-orange-400 hover:bg-orange-900' : 'text-orange-600 hover:bg-orange-50'
                                                : isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0 ${getIconColor(item.id)}`} />
                                        {!isCollapsed && <span className="font-medium">{item.label}</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Upload Button */}
                <div className="p-1 border-t">
                    <button className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm">
                        <Upload className={`${isCollapsed ? 'w-4 h-4' : 'w-4 h-4'}`} />
                        {!isCollapsed && <span>Tải lên</span>}
                    </button>
                </div>

                {/* Logout Button */}
                <div className="p-1">
                    <button
                        onClick={() => {
                            logout();
                        }}
                        className="w-full flex items-center justify-center space-x-2 bg-red-100 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-200 transition-colors text-sm"
                    >
                        <LogOut className={`${isCollapsed ? 'w-4 h-4' : 'w-4 h-4'}`} />
                        {!isCollapsed && <span>Đăng xuất</span>}
                    </button>
                </div>

                {/* Collapse Button */}
                <div className="p-1">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors text-sm"
                    >
                        <ChevronDown className={`w-4 h-4 ${isCollapsed ? 'rotate-90' : '-rotate-90'}`} />
                        {!isCollapsed && <span>Thu gọn</span>}
                    </button>
                </div>
            </div>

            {/* Main Content - With left margin to account for fixed sidebar */}
            <div className={`${isCollapsed ? 'ml-16' : 'ml-48'} transition-all duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {renderMainContent()}
            </div>

            {/* Add Study Set Modal */}
            {showAddSetModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 w-full max-w-md mx-4 shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <Plus className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Tạo Bộ Học</h3>
                                    <p className="text-sm text-gray-600">Tạo một bộ học mới để tổ chức tài liệu của bạn.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAddSetModal(false);
                                    setNewSetName('');
                                    setNewSetDescription('');
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-6">
                            {/* Study Set Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tên Bộ Học <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newSetName}
                                    onChange={(e) => setNewSetName(e.target.value)}
                                    placeholder="Ví dụ: Sinh học Chương 5"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                                    autoFocus
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mô tả (Tùy chọn)
                                </label>
                                <textarea
                                    value={newSetDescription}
                                    onChange={(e) => setNewSetDescription(e.target.value)}
                                    placeholder="Thêm mô tả để giúp bạn nhớ bộ học này về cái gì..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base resize-none"
                                />
                            </div>

                            {/* What happens next section */}
                            <div className="bg-blue-50 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 mb-1">Điều gì sẽ xảy ra tiếp theo?</h4>
                                        <p className="text-sm text-gray-600">
                                            Sau khi tạo bộ học, bạn sẽ có thể thêm tài liệu như tài liệu, video và liên kết.
                                            StudyFetch AI sẽ tạo ra các công cụ học tập cá nhân hóa từ nội dung của bạn.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 mt-8">
                            <button
                                onClick={() => {
                                    setShowAddSetModal(false);
                                    setNewSetName('');
                                    setNewSetDescription('');
                                }}
                                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={addStudySet}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Tạo Bộ Học</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HybridDashboard;
