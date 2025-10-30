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
    Plus
} from 'lucide-react';

const StudyFetchDashboard: React.FC = () => {
    const [activeSection, setActiveSection] = useState('home');

    const navigationItems = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'sets', label: 'My Sets', icon: Layers },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'study', label: 'My First Stu...', icon: BookOpen, active: true },
        { id: 'chat', label: 'Chat', icon: MessageCircle },
        { id: 'lecture', label: 'Live Lecture', icon: Video },
        { id: 'flashcards', label: 'Flashcards', icon: CreditCard },
        { id: 'tests', label: 'Tests & QuizFetch', icon: CheckSquare },
        { id: 'tutor', label: 'Tutor Me', icon: HelpCircle },
        { id: 'arcade', label: 'Arcade', icon: Gamepad2 },
        { id: 'essay', label: 'Essay Grading', icon: FileText },
        { id: 'explainers', label: 'Explainers', icon: Play },
        { id: 'audio', label: 'Audio Recap', icon: Volume2 },
        { id: 'notes', label: 'Notes & Materials', icon: Notebook }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Left Sidebar */}
            <div className="w-64 bg-white shadow-lg flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">SF</span>
                        </div>
                        <span className="font-bold text-xl text-gray-900">STUDY FETCH</span>
                    </div>
                </div>

                {/* Search and Flame */}
                <div className="p-4 border-b">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 text-gray-600">
                            <Flame className="w-4 h-4" />
                            <span className="text-sm">0</span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4">
                    <ul className="space-y-2">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.active || activeSection === item.id;

                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => setActiveSection(item.id)}
                                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${isActive
                                                ? 'bg-blue-50 text-blue-600'
                                                : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Upload Button */}
                <div className="p-4 border-t">
                    <button className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>Upload</span>
                    </button>
                </div>

                {/* Tutorial Button */}
                <div className="p-4">
                    <button className="w-full flex items-center justify-center space-x-2 bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors">
                        <Play className="w-4 h-4" />
                        <span>Tutorials</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex">
                {/* Main Dashboard */}
                <div className="flex-1 p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">🤖</span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    Good afternoon, Trần Thị Huyền Trang!
                                </h1>
                                <p className="text-lg text-gray-600 mt-1">
                                    Which study set are you working on today?
                                </p>
                            </div>
                        </div>

                        {/* Study Set Buttons */}
                        <div className="flex items-center space-x-4 mb-6">
                            <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                <BookOpen className="w-4 h-4" />
                                <span>My First Study Set</span>
                            </button>
                            <button className="flex items-center space-x-2 border-2 border-dashed border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors">
                                <Plus className="w-4 h-4" />
                                <span>Add Set</span>
                            </button>
                        </div>

                        <div className="flex items-center space-x-4 text-sm">
                            <button className="text-blue-600 hover:text-blue-700">+ Add Set</button>
                            <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-700">
                                <Layers className="w-4 h-4" />
                                <span>See All My Sets</span>
                            </button>
                        </div>
                    </div>

                    {/* Study Set Card */}
                    <div className="bg-blue-50 rounded-2xl p-8 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <BookOpen className="w-6 h-6 text-blue-600" />
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">My First Study Set</h2>
                                    <p className="text-gray-600">0 materials</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button className="p-2 text-gray-600 hover:text-gray-800">
                                    <Bookmark className="w-5 h-5" />
                                </button>
                                <button className="p-2 text-gray-600 hover:text-gray-800">
                                    <Settings className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Feature Buttons */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {[
                                { icon: CheckSquare, label: 'Tests/Quizzes', count: 0 },
                                { icon: Play, label: 'Explainers', count: 0 },
                                { icon: HelpCircle, label: 'Tutor Me', count: 0 },
                                { icon: Gamepad2, label: 'Arcade', count: 0 },
                                { icon: CreditCard, label: 'Flashcards', count: 0 },
                                { icon: Volume2, label: 'Audio Recap', count: 0 }
                            ].map((feature, index) => {
                                const Icon = feature.icon;
                                return (
                                    <div key={index} className="bg-white rounded-lg p-4 text-center">
                                        <div className="flex items-center justify-center space-x-2 mb-2">
                                            <Icon className="w-5 h-5 text-blue-600" />
                                            <span className="text-2xl font-bold text-gray-900">{feature.count}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{feature.label}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Start Learning Button */}
                        <div className="text-center mb-6">
                            <button className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto">
                                <Play className="w-5 h-5" />
                                <span>Start Learning</span>
                            </button>
                        </div>

                        {/* Study Path Info */}
                        <div className="text-center text-gray-600">
                            <p className="text-lg mb-2">No study path created yet</p>
                            <p className="text-sm">
                                Click "Start Learning" to begin creating your personalized study path and track your progress
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-80 p-6 space-y-6">
                    {/* Streak Card */}
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Flame className="w-5 h-5 text-orange-500" />
                                <span className="text-2xl font-bold text-gray-900">0 day streak!</span>
                            </div>
                            <button className="text-blue-600 hover:text-blue-700 text-sm">View Leaderboard</button>
                        </div>
                    </div>

                    {/* Materials Card */}
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Materials</h3>
                            <button className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                                <Upload className="w-4 h-4" />
                                <span>Upload</span>
                            </button>
                        </div>
                        <div className="text-center text-gray-600">
                            <p className="mb-2">No materials yet</p>
                            <p className="text-sm">Click Upload to add materials</p>
                        </div>
                    </div>

                    {/* Upcoming Card */}
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Calendar className="w-5 h-5 text-gray-600" />
                                <h3 className="text-lg font-semibold text-gray-900">Upcoming</h3>
                            </div>
                            <button className="text-gray-600 hover:text-gray-800">
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="text-center text-gray-600">
                            <p className="mb-2">No upcoming events</p>
                            <button className="text-blue-600 hover:text-blue-700 text-sm">View All</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudyFetchDashboard;
