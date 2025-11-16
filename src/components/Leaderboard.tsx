import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface LeaderboardProps {
    onBack: () => void;
}

interface Leader {
    rank: number;
    name: string;
    streak: number;
    avatar?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
    // Hardcoded leaderboard data
    const leaders: Leader[] = [
        { rank: 1, name: 'Ethereal Wyvern', streak: 291 },
        { rank: 2, name: 'Jo Schumacher', streak: 220 },
        { rank: 3, name: 'Tay', streak: 178 },
        { rank: 4, name: 'Gerardo', streak: 101 },
        { rank: 5, name: 'Ester', streak: 96 },
        { rank: 6, name: 'Rianne', streak: 95 },
        { rank: 7, name: 'Alberto Vinues', streak: 94 },
        { rank: 8, name: 'Mariana', streak: 91 },
        { rank: 9, name: 'Carlos Gustavo Ledezma Villanueva', streak: 84 },
        { rank: 10, name: 'Eliot Moore', streak: 81 },
        { rank: 11, name: 'Daniel Leon', streak: 74 },
        { rank: 12, name: 'Sarah', streak: 71 },
        { rank: 13, name: 'Vasileios Zikos', streak: 70 },
        { rank: 14, name: 'Yosselin Marquez', streak: 66 },
        { rank: 15, name: 'Ryan Akaaboune', streak: 65 },
        { rank: 16, name: 'Gia', streak: 64 },
        { rank: 17, name: 'Clarissa', streak: 64 },
        { rank: 18, name: 'Kaylee', streak: 64 },
        { rank: 19, name: 'Aaron Kwong', streak: 63 },
        { rank: 20, name: 'Driss Ouarghous', streak: 63 },
        { rank: 21, name: 'Dysonious Kay', streak: 63 },
        { rank: 22, name: 'Alex', streak: 62 },
        { rank: 23, name: 'Katerine Arévalo', streak: 61 },
    ];

    const top3 = leaders.slice(0, 3);
    const rest = leaders.slice(3);

    // Generate color for avatar based on name
    const getAvatarColor = (name: string) => {
        const colors = [
            { bg: 'bg-blue-500', text: 'text-white' },
            { bg: 'bg-green-500', text: 'text-white' },
            { bg: 'bg-purple-500', text: 'text-white' },
            { bg: 'bg-orange-500', text: 'text-white' },
            { bg: 'bg-pink-500', text: 'text-white' },
            { bg: 'bg-teal-500', text: 'text-white' },
            { bg: 'bg-indigo-500', text: 'text-white' },
            { bg: 'bg-red-500', text: 'text-white' },
            { bg: 'bg-yellow-500', text: 'text-gray-900' },
            { bg: 'bg-cyan-500', text: 'text-white' },
            { bg: 'bg-emerald-500', text: 'text-white' },
            { bg: 'bg-violet-500', text: 'text-white' },
            { bg: 'bg-amber-500', text: 'text-gray-900' },
            { bg: 'bg-rose-500', text: 'text-white' },
            { bg: 'bg-sky-500', text: 'text-white' },
        ];
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = hash % colors.length;
        return colors[index];
    };

    return (
        <div className="w-full h-full bg-white overflow-y-auto">
            {/* Header */}
            <div className="bg-white px-6 py-4 sticky top-0 z-10">
                <div className="flex items-center space-x-4">
                    
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Title */}
                <h1 className="text-4xl font-bold text-gray-900 mb-8">Bảng Xếp Hạng Học Tập</h1>

                {/* Top 3 Leaders - Large Cards */}
                <div className="grid grid-cols-3 gap-6 mb-12">
                    {/* Rank 2 - Left */}
                    <div className="flex flex-col items-center">
                        <div className="bg-purple-50 rounded-xl shadow-lg p-6 w-full mb-4">
                            <div className="flex flex-col items-center">
                                {/* Avatar - Blue abstract pattern */}
                                <div className="w-24 h-24 bg-blue-500 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-16 h-16 bg-teal-400 rounded-full transform rotate-45"></div>
                                    </div>
                                    <div className="absolute top-0 left-0 w-4 h-4 bg-red-500 transform rotate-45"></div>
                                    <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 transform rotate-45"></div>
                                    <div className="absolute bottom-0 left-0 w-4 h-4 bg-red-500 transform rotate-45"></div>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-red-500 transform rotate-45"></div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Jo Schumacher</h3>
                                <div className="flex items-center space-x-2 text-gray-500">
                                    <span className="text-xl font-bold">{top3[1]?.streak}</span>
                                    <span className="text-sm">Ngày</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-blue-500 rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-2xl">
                            2
                        </div>
                    </div>

                    {/* Rank 1 - Center */}
                    <div className="flex flex-col items-center">
                        <div className="bg-purple-50 rounded-xl shadow-lg p-6 w-full mb-4">
                            <div className="flex flex-col items-center">
                                {/* Avatar - Natural scene with pond and lilies */}
                                <div className="w-24 h-24 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-sky-300 to-sky-500">
                                    {/* Pond background */}
                                    <div className="absolute inset-0 bg-blue-400"></div>
                                    {/* Water lilies */}
                                    <div className="absolute bottom-2 left-1/4 w-8 h-8 bg-pink-300 rounded-full"></div>
                                    <div className="absolute bottom-2 right-1/4 w-8 h-8 bg-pink-300 rounded-full"></div>
                                    {/* Foliage background */}
                                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-green-400"></div>
                                    <div className="absolute top-1/4 left-0 w-6 h-6 bg-green-500 rounded-full"></div>
                                    <div className="absolute top-1/4 right-0 w-6 h-6 bg-green-500 rounded-full"></div>
                                    {/* Dewdrop */}
                                    <div className="absolute top-1/3 left-1/4 w-2 h-2 bg-white rounded-full"></div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Ethereal Wyvern</h3>
                                <div className="flex items-center space-x-2 text-gray-500">
                                    <span className="text-xl font-bold">{top3[0]?.streak}</span>
                                    <span className="text-sm">Ngày</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-yellow-500 rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-2xl">
                            1
                        </div>
                    </div>

                    {/* Rank 3 - Right */}
                    <div className="flex flex-col items-center">
                        <div className="bg-purple-50 rounded-xl shadow-lg p-6 w-full mb-4">
                            <div className="flex flex-col items-center">
                                {/* Avatar - Purple abstract pattern */}
                                <div className="w-24 h-24 bg-purple-700 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-purple-800"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-12 h-12 bg-green-500 rounded-full"></div>
                                    </div>
                                    <div className="absolute top-0 left-0 w-4 h-4 bg-green-400 transform rotate-45"></div>
                                    <div className="absolute top-0 right-0 w-4 h-4 bg-green-400 transform rotate-45"></div>
                                    <div className="absolute bottom-0 left-0 w-4 h-4 bg-green-400 transform rotate-45"></div>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 transform rotate-45"></div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Tay</h3>
                                <div className="flex items-center space-x-2 text-gray-500">
                                    <span className="text-xl font-bold">{top3[2]?.streak}</span>
                                    <span className="text-sm">Ngày</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-green-500 rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-2xl">
                            3
                        </div>
                    </div>
                </div>

                {/* Rest of Leaders - 2 Column Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {rest.map((leader) => {
                        const avatarColor = getAvatarColor(leader.name);
                        return (
                            <div
                                key={leader.rank}
                                className="flex items-center space-x-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                            >
                                {/* Rank Number */}
                                <div className="text-gray-500 font-semibold text-sm w-8 flex-shrink-0">
                                    {leader.rank}
                                </div>

                                {/* Avatar with color */}
                                <div className={`w-10 h-10 ${avatarColor.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <span className={`${avatarColor.text} font-semibold text-sm`}>
                                        {leader.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>

                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 text-sm truncate">
                                        {leader.name}
                                    </div>
                                </div>

                                {/* Streak with Fire Icon */}
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <span className="text-base font-bold text-gray-900">{leader.streak}</span>
                                    <img
                                        src="/fire.webp"
                                        alt="fire"
                                        className="w-6 h-6 object-contain"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;

