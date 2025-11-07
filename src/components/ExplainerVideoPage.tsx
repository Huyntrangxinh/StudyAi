import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Beaker, Cog, Laptop, FileText, Share2, MessageCircle, Link2, Download, Play, Loader2, MoreVertical, X, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useVideoGeneration } from '../hooks/useVideoGeneration';
import { useAuth } from '../hooks/useAuth';
import VideoOptionsModal, { VideoOptions } from './VideoOptionsModal';

// Component cho Video Card với hover preview
const VideoCard: React.FC<{
    video: Video;
    user: any;
    onMenuClick: (videoId: number) => void;
    openMenuId: number | null;
    onRefreshStatus: (videoId: number) => void;
    refreshingVideoId: number | null;
    onUpdateTitle: (videoId: number) => void;
    onDeleteVideo: (videoId: number) => Promise<void>;
    onNavigate: (video: Video) => void;
}> = ({ video, user, onMenuClick, openMenuId, onRefreshStatus, refreshingVideoId, onUpdateTitle, onDeleteVideo, onNavigate }) => {
    const [isHovered, setIsHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (isHovered && videoRef.current && video.status === 'completed' && video.video_url) {
            videoRef.current.play().catch(() => {
                // Auto-play bị block, không sao
            });
        } else if (!isHovered && videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    }, [isHovered, video.status, video.video_url]);

    return (
        <div
            onClick={() => {
                if (video.status === 'completed' && video.video_url) {
                    onNavigate(video);
                }
            }}
            onMouseEnter={() => {
                if (video.status === 'completed' && video.video_url) {
                    setIsHovered(true);
                }
            }}
            onMouseLeave={() => {
                setIsHovered(false);
            }}
            className={`bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow ${video.status === 'completed' && video.video_url ? 'cursor-pointer' : ''}`}
        >
            {/* Ảnh bìa - chỉ hiển thị thumbnail hoặc gradient */}
            {video.status === 'completed' && video.video_url ? (
                <div className="aspect-video bg-gradient-to-br from-purple-500 to-blue-600 flex flex-col items-center justify-center relative overflow-hidden group rounded-t-xl">
                    {/* Video preview - hiện khi hover */}
                    <video
                        ref={videoRef}
                        src={video.video_url}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isHovered ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                    />

                    {/* Thumbnail/placeholder - ẩn khi hover */}
                    <div className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
                        {video.thumbnail_url ? (
                            <img
                                src={video.thumbnail_url}
                                alt={video.video_title || video.prompt}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                                <Play className="w-16 h-16 text-white opacity-80 mb-2" />
                                <h3 className="text-white text-xl font-bold text-center px-4 line-clamp-2">
                                    {video.video_title && video.video_title.trim().length > 0 ? video.video_title : video.prompt}
                                </h3>
                            </div>
                        )}
                    </div>

                    {/* Overlay play icon - chỉ hiện khi không hover */}
                    {!isHovered && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all">
                            <Play className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                </div>
            ) : (
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex flex-col items-center justify-center relative rounded-t-xl">
                    {video.status === 'processing' || video.status === 'pending' ? (
                        <>
                            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-3" />
                            <p className="text-sm text-gray-700 mb-2">Đang xử lý...</p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRefreshStatus(video.id);
                                }}
                                disabled={refreshingVideoId === video.id}
                                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                            >
                                {refreshingVideoId === video.id ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Đang kiểm tra...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🔄</span>
                                        <span>Kiểm tra lại</span>
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <Play className="w-12 h-12 text-blue-600 opacity-50 mb-3" />
                            <p className="text-sm text-gray-700">Tạo video thất bại</p>
                        </>
                    )}
                </div>
            )}
            <div className="p-4">
                <div className="flex items-start justify-between">
                    <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                        {video.video_title && video.video_title.trim().length > 0 ? video.video_title : video.prompt}
                    </h3>
                    <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                            data-menu-button
                            onClick={() => onMenuClick(video.id)}
                            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        >
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                        {openMenuId === video.id && (
                            <div data-menu-dropdown className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMenuClick(video.id); // Đóng menu trước
                                        onUpdateTitle(video.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg"
                                >
                                    Cập nhật tiêu đề
                                </button>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        onMenuClick(video.id); // Đóng menu trước
                                        await onDeleteVideo(video.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors last:rounded-b-lg"
                                >
                                    Xóa video
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                        {new Date(video.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    {video.duration && (
                        <span>{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

interface ExplainerVideoPageProps {
    studySetId?: string | number;
    onBack?: () => void;
}

interface Video {
    id: number;
    prompt: string;
    status: string;
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    video_title?: string;
    created_at: string;
}

const ExplainerVideoPage: React.FC<ExplainerVideoPageProps> = ({ studySetId, onBack }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { generateVideo, isGenerating, currentVideo } = useVideoGeneration();
    const [activeTab, setActiveTab] = useState<'create' | 'my-videos'>('create');
    const [prompt, setPrompt] = useState('');
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [imageSearchEnabled, setImageSearchEnabled] = useState(false);
    const [myVideos, setMyVideos] = useState<Video[]>([]);
    const [isLoadingVideos, setIsLoadingVideos] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioTranscript, setAudioTranscript] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isCreatingVideo, setIsCreatingVideo] = useState(false);
    const [genStartTime, setGenStartTime] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState<string>('00:00');
    useEffect(() => {
        let t: any = null;
        if (isCreatingVideo && genStartTime) {
            t = setInterval(() => {
                const diff = Date.now() - genStartTime;
                const mm = Math.floor(diff / 60000).toString().padStart(2, '0');
                const ss = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
                setElapsed(`${mm}:${ss}`);
            }, 500);
        } else {
            setElapsed('00:00');
        }
        return () => t && clearInterval(t);
    }, [isCreatingVideo, genStartTime]);
    const [useWebImages, setUseWebImages] = useState(true);
    const [refreshingVideoId, setRefreshingVideoId] = useState<number | null>(null);
    const [showVideoOptions, setShowVideoOptions] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [showTitleModal, setShowTitleModal] = useState(false);
    const [editingVideoId, setEditingVideoId] = useState<number | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [showMaterialsModal, setShowMaterialsModal] = useState(false);
    const [materials, setMaterials] = useState<any[]>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
    const [materialContent, setMaterialContent] = useState<string | null>(null);
    const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);

    // Đóng menu khi click bên ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Nếu click không phải vào button hoặc menu dropdown
            if (!target.closest('[data-menu-button]') && !target.closest('[data-menu-dropdown]')) {
                setOpenMenuId(null);
            }
        };

        if (openMenuId !== null) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openMenuId]);

    const topics = [
        { id: 'chemistry', label: 'Hóa học', icon: Beaker, color: 'bg-blue-100 text-blue-600' },
        { id: 'engineering', label: 'Kỹ thuật', icon: Cog, color: 'bg-green-100 text-green-600' },
        { id: 'data-science', label: 'Khoa học dữ liệu', icon: Laptop, color: 'bg-purple-100 text-purple-600' },
        { id: 'law', label: 'Luật học', icon: FileText, color: 'bg-orange-100 text-orange-600' },
    ];

    // Load materials từ study set
    const loadMaterials = async () => {
        if (!studySetId) return;

        setIsLoadingMaterials(true);
        try {
            const resp = await fetch(`http://localhost:3001/api/materials/${studySetId}`);
            if (resp.ok) {
                const data = await resp.json();
                setMaterials(data || []);
            } else {
                toast.error('Không thể tải danh sách tài liệu');
            }
        } catch (e) {
            console.error('Failed to load materials:', e);
            toast.error('Có lỗi xảy ra khi tải tài liệu');
        } finally {
            setIsLoadingMaterials(false);
        }
    };

    // Handler để cập nhật tiêu đề
    const handleUpdateTitle = async () => {
        if (!editingVideoId || !editingTitle.trim() || !user?.id) return;

        try {
            const resp = await fetch(`http://localhost:3001/api/videos/${editingVideoId}/title`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, title: editingTitle.trim() })
            });

            if (resp.ok) {
                await loadMyVideos();
                setShowTitleModal(false);
                setEditingVideoId(null);
                setEditingTitle('');
                toast.success('Cập nhật tiêu đề thành công');
            } else {
                toast.error('Không thể cập nhật tiêu đề');
            }
        } catch (e) {
            console.error('Update title error:', e);
            toast.error('Có lỗi xảy ra khi cập nhật tiêu đề');
        }
    };


    // Refresh video status (HeyGen removed - this is now handled automatically)
    const refreshVideoStatus = async (videoId: number) => {
        setRefreshingVideoId(videoId);
        try {
            const response = await fetch(`http://localhost:3001/api/videos/${videoId}/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to refresh video status');
            }

            const data = await response.json();
            toast.success(data.message || 'Đã cập nhật trạng thái video');

            // Reload videos
            await loadMyVideos();
        } catch (error: any) {
            console.error('Error refreshing video status:', error);
            toast.error('Không thể cập nhật trạng thái video');
        } finally {
            setRefreshingVideoId(null);
        }
    };

    // Load user's videos
    const loadMyVideos = async () => {
        if (!user?.id) {
            console.log('loadMyVideos: No user ID');
            return;
        }

        setIsLoadingVideos(true);
        try {
            const url = `http://localhost:3001/api/videos?userId=${user.id}${studySetId ? `&studySetId=${studySetId}` : ''}`;
            console.log('Loading videos from:', url);
            const response = await fetch(url);
            if (response.ok) {
                const videos = await response.json();
                console.log('Loaded videos:', videos.length, videos);
                setMyVideos(videos);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Failed to load videos:', response.status, errorData);
            }
        } catch (error) {
            console.error('Error loading videos:', error);
        } finally {
            setIsLoadingVideos(false);
        }
    };

    // Load videos when switching to my-videos tab
    useEffect(() => {
        if (activeTab === 'my-videos') {
            loadMyVideos();
        }
    }, [activeTab, user?.id, studySetId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Check if current video is completed and reload my videos
    useEffect(() => {
        if (currentVideo?.status === 'completed') {
            loadMyVideos();
        }
    }, [currentVideo?.status]); // eslint-disable-line react-hooks/exhaustive-deps

    // Check URL params for tab when component mounts or location changes
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        if (tabParam === 'my-videos' && activeTab !== 'my-videos') {
            console.log('URL param tab=my-videos detected, switching tab');
            setActiveTab('my-videos');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCreateVideo = async () => {
        if (!prompt.trim()) {
            toast.error('Vui lòng nhập yêu cầu của bạn');
            return;
        }

        if (!user?.id) {
            toast.error('Vui lòng đăng nhập để tạo video');
            return;
        }

        const videoId = await generateVideo({
            prompt: prompt.trim(),
            webSearchEnabled,
            imageSearchEnabled,
            studySetId,
            userId: user.id
        });

        if (videoId) {
            // Clear prompt after successful submission
            setPrompt('');
            // Optionally switch to my-videos tab
            // setActiveTab('my-videos');
        }
    };

    return (
        <div className="flex-1 bg-white min-h-screen p-8">
            {/* Header with Tabs */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    {/* Tabs */}
                    <div className="flex items-center space-x-1 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'create'
                                ? 'text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Tạo video giải thích
                            {activeTab === 'create' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('my-videos')}
                            className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'my-videos'
                                ? 'text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Video của tôi
                            {activeTab === 'my-videos' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                            )}
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                        <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <Share2 className="w-4 h-4" />
                            <span>Chia sẻ</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            <span>Phản hồi</span>
                        </button>
                        <button className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <Link2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {activeTab === 'create' && (
                <div className="max-w-4xl mx-auto">
                    {/* Title */}
                    <h1 className="text-4xl font-bold text-gray-900 text-center mb-8">
                        Tạo video giải thích
                    </h1>

                    {/* Input Section */}
                    <div className="mb-8">
                        <div className="flex items-center space-x-3">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleCreateVideo();
                                    }
                                }}
                                placeholder="Bạn muốn học về điều gì?"
                                className="flex-1 px-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isGenerating}
                            />
                            <button
                                onClick={() => {
                                    if (!prompt.trim()) {
                                        toast.error('Vui lòng nhập yêu cầu');
                                        return;
                                    }
                                    if (!user?.id) {
                                        toast.error('Vui lòng đăng nhập');
                                        return;
                                    }
                                    setShowVideoOptions(true);
                                }}
                                disabled={!prompt.trim() || isCreatingVideo}
                                className="flex items-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Sparkles className="w-5 h-5" />
                                <span>Create Video</span>
                            </button>
                        </div>

                        {/* Search Toggles */}
                        <div className="flex items-center space-x-6 mt-4">
                            <div className="flex items-center space-x-3">
                                <span className="text-sm text-gray-700">Tìm ảnh từ Pexels</span>
                                <button
                                    onClick={() => setUseWebImages(!useWebImages)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useWebImages ? 'bg-blue-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useWebImages ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className="text-sm text-gray-700">Tìm kiếm Web</span>
                                <button
                                    onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${webSearchEnabled ? 'bg-blue-600' : 'bg-gray-300'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${webSearchEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className="text-sm text-gray-700">Tìm kiếm Hình ảnh</span>
                                <button
                                    onClick={() => setImageSearchEnabled(!imageSearchEnabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${imageSearchEnabled ? 'bg-blue-600' : 'bg-gray-300'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${imageSearchEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Topic Selection */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Chọn chủ đề để bắt đầu
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {topics.map((topic) => {
                                const Icon = topic.icon;
                                return (
                                    <button
                                        key={topic.id}
                                        onClick={() => setPrompt(`Giải thích về ${topic.label.toLowerCase()}`)}
                                        className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all"
                                    >
                                        <div className={`w-12 h-12 rounded-lg ${topic.color} flex items-center justify-center mb-3`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">{topic.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Material Upload Option */}
                    <div className="text-center mb-8">
                        <span className="text-gray-600">hoặc </span>
                        <button
                            onClick={() => {
                                if (studySetId) {
                                    setShowMaterialsModal(true);
                                    loadMaterials();
                                } else {
                                    toast.error('Vui lòng chọn study set trước');
                                }
                            }}
                            className="text-blue-600 hover:text-blue-700 font-medium underline"
                        >
                            tạo từ một trong các tài liệu của bạn
                        </button>
                    </div>

                    {/* Current Video Generation Status */}
                    {currentVideo && (currentVideo.status === 'processing' || currentVideo.status === 'pending') && (
                        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                            <div className="flex items-center space-x-4">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 mb-1">Video đang được tạo</h3>
                                    <p className="text-sm text-gray-600">
                                        {currentVideo.prompt}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Vui lòng đợi trong giây lát. Video sẽ xuất hiện trong tab "Video của tôi" khi hoàn tất.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveTab('my-videos')}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                    Xem video của tôi
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            )}


            {activeTab === 'my-videos' && (
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Video của tôi</h2>
                        <button
                            onClick={() => {
                                console.log('Manual reload triggered, user ID:', user?.id);
                                loadMyVideos();
                            }}
                            className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-2"
                        >
                            <span>Tải lại</span>
                        </button>
                    </div>

                    {isLoadingVideos ? (
                        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                            <p className="text-gray-600">Đang tải video...</p>
                        </div>
                    ) : myVideos.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                            <p className="text-gray-600 mb-4">Chưa có video nào</p>
                            <button
                                onClick={() => {
                                    setActiveTab('create');
                                    setPrompt('');
                                }}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Tạo video đầu tiên
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myVideos.map((video) => (
                                <VideoCard
                                    key={video.id}
                                    video={video}
                                    user={user}
                                    onMenuClick={(videoId) => setOpenMenuId(openMenuId === videoId ? null : videoId)}
                                    openMenuId={openMenuId}
                                    onRefreshStatus={refreshVideoStatus}
                                    refreshingVideoId={refreshingVideoId}
                                    onUpdateTitle={(videoId) => {
                                        const video = myVideos.find(v => v.id === videoId);
                                        if (video) {
                                            setEditingVideoId(videoId);
                                            setEditingTitle(video.video_title || video.prompt || '');
                                            setShowTitleModal(true);
                                        }
                                    }}
                                    onDeleteVideo={async (videoId) => {
                                        try {
                                            await fetch(`http://localhost:3001/api/videos/${videoId}?userId=${user?.id}`, { method: 'DELETE' });
                                            await loadMyVideos();
                                            setOpenMenuId(null);
                                        } catch (e) { console.error(e); }
                                    }}
                                    onNavigate={(video) => {
                                        navigate('/dashboard/explainers/video/result', {
                                            state: {
                                                videoUrl: video.video_url,
                                                audioUrl: (video as any).audio_url || null,
                                                transcript: (video as any).transcript || null,
                                                title: video.video_title && video.video_title.trim().length > 0 ? video.video_title : video.prompt,
                                                prompt: video.prompt,
                                                userName: user?.name || 'AI Assistant',
                                                id: video.id
                                            }
                                        });
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Video Options Modal */}
            <VideoOptionsModal
                isOpen={showVideoOptions}
                onClose={() => {
                    setShowVideoOptions(false);
                    // Reset material content nếu đóng modal
                    if (!showMaterialsModal) {
                        setMaterialContent(null);
                        setSelectedMaterialId(null);
                    }
                }}
                onStart={async (options) => {
                    setShowVideoOptions(false);
                    if (!user?.id) return;

                    // Nếu có materialContent, sử dụng nó; nếu không, dùng prompt
                    const contentToUse = materialContent || prompt.trim();
                    if (!contentToUse) {
                        toast.error('Vui lòng nhập prompt hoặc chọn tài liệu');
                        return;
                    }

                    try {
                        setIsCreatingVideo(true);
                        setGenStartTime(Date.now());
                        setAudioUrl(null);
                        setAudioTranscript(null);
                        setVideoUrl(null);

                        // Chuyển sang màn chờ tạo (giữ navi + header)
                        navigate('/dashboard/explainers/video/generating', {
                            state: {
                                prompt: materialContent ? `Material: ${selectedMaterialId}` : prompt.trim(),
                                content: materialContent, // Nếu có materialContent, truyền vào đây
                                studySetId,
                                language: options.language,
                                title: options.title || (materialContent ? 'Video từ tài liệu' : prompt.trim()),
                                materialId: selectedMaterialId
                            }
                        });
                    } catch (e: any) {
                        console.error('Create video error:', e);
                        toast.error(e.message || 'Lỗi tạo video', { id: 'creating-video' });
                    } finally {
                        setIsCreatingVideo(false);
                    }
                }}
            />

            {/* Update Title Modal */}
            {showTitleModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowTitleModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Cập nhật tiêu đề video</h2>
                            <button
                                onClick={() => {
                                    setShowTitleModal(false);
                                    setEditingVideoId(null);
                                    setEditingTitle('');
                                }}
                                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tiêu đề mới
                            </label>
                            <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleUpdateTitle();
                                    } else if (e.key === 'Escape') {
                                        setShowTitleModal(false);
                                        setEditingVideoId(null);
                                        setEditingTitle('');
                                    }
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="Nhập tiêu đề mới..."
                                autoFocus
                            />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setShowTitleModal(false);
                                    setEditingVideoId(null);
                                    setEditingTitle('');
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpdateTitle}
                                disabled={!editingTitle.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Select Materials Modal */}
            {showMaterialsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowMaterialsModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-semibold text-gray-900">Select Materials</h2>
                            <button
                                onClick={() => {
                                    setShowMaterialsModal(false);
                                    setSelectedMaterial(null);
                                    setSearchQuery('');
                                }}
                                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search materials..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                            <p className="text-sm text-gray-600">Select the material you want to use to create an explainer video.</p>
                        </div>

                        {/* Materials Grid */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {isLoadingMaterials ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-4">
                                    {materials
                                        .filter((material) =>
                                            !searchQuery ||
                                            material.name?.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map((material) => (
                                            <div
                                                key={material.id}
                                                onClick={() => setSelectedMaterial(selectedMaterial === material.id ? null : material.id)}
                                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedMaterial === material.id
                                                    ? 'border-blue-600 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                                                    }`}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <FileText className={`w-8 h-8 flex-shrink-0 ${selectedMaterial === material.id ? 'text-blue-600' : 'text-gray-400'
                                                        }`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-medium truncate ${selectedMaterial === material.id ? 'text-blue-900' : 'text-gray-900'
                                                            }`}>
                                                            {material.name || 'Untitled Document'}
                                                        </p>
                                                        {material.type && (
                                                            <p className="text-xs text-gray-500 mt-1">{material.type}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    {materials.filter((material) =>
                                        !searchQuery ||
                                        material.name?.toLowerCase().includes(searchQuery.toLowerCase())
                                    ).length === 0 && (
                                            <div className="col-span-3 text-center py-12">
                                                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                                <p className="text-gray-500">No materials found</p>
                                                {searchQuery && (
                                                    <p className="text-sm text-gray-400 mt-2">Try a different search term</p>
                                                )}
                                            </div>
                                        )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-6 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setShowMaterialsModal(false);
                                    setSelectedMaterial(null);
                                    setSearchQuery('');
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Cancel</span>
                            </button>
                            <button
                                onClick={async () => {
                                    if (!selectedMaterial) {
                                        toast.error('Vui lòng chọn một tài liệu');
                                        return;
                                    }

                                    const material = materials.find(m => m.id === selectedMaterial);
                                    if (!material) return;

                                    // Load content từ material
                                    try {
                                        toast.loading('Đang đọc nội dung tài liệu...', { id: 'loading-material' });

                                        // Fetch material content từ API
                                        const resp = await fetch(`http://localhost:3001/api/materials/${studySetId}/${material.id}/content`);
                                        if (!resp.ok) {
                                            throw new Error('Không thể đọc nội dung tài liệu');
                                        }

                                        const data = await resp.json();
                                        if (!data.content || !data.content.trim()) {
                                            throw new Error('Tài liệu không có nội dung');
                                        }

                                        setMaterialContent(data.content);
                                        setSelectedMaterialId(material.id);
                                        setShowMaterialsModal(false);
                                        setShowVideoOptions(true);

                                        toast.success(`Đã tải nội dung từ: ${material.name}`, { id: 'loading-material' });
                                    } catch (e: any) {
                                        console.error('Failed to load material content:', e);
                                        toast.error(e.message || 'Có lỗi xảy ra khi đọc tài liệu', { id: 'loading-material' });
                                    }
                                }}
                                disabled={!selectedMaterial}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>Continue</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay removed: đã dùng màn chờ riêng */}
        </div>
    );
};

export default ExplainerVideoPage;

