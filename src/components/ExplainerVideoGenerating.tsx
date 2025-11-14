import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface NavState {
    prompt: string;
    content?: string; // Material content (full PDF text)
    studySetId?: string | number | null;
    language: 'vi' | 'en';
    title?: string;
    materialId?: number;
}

const ExplainerVideoGenerating: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const params = (location.state || {}) as Partial<NavState>;
    const startAt = useMemo(() => Date.now(), []);
    const estimatedTotalMs = useMemo(() => {
        const text = (params.prompt || '').trim();
        const words = text ? text.split(/\s+/).length : 0;
        // Heuristic: 1-3 mins depending on prompt length
        if (words > 180) return 180000; // ~3m
        if (words > 120) return 150000; // 2.5m
        if (words > 80) return 120000;  // 2m
        if (words > 40) return 90000;   // 1.5m
        return 60000;                   // 1m
    }, [params.prompt]);
    const [remaining, setRemaining] = useState<string>('00:00');

    useEffect(() => {
        const t = setInterval(() => {
            const diff = Date.now() - startAt;
            const left = Math.max(0, estimatedTotalMs - diff);
            const mm = Math.floor(left / 60000).toString().padStart(2, '0');
            const ss = Math.floor((left % 60000) / 1000).toString().padStart(2, '0');
            setRemaining(`${mm}:${ss}`);
        }, 500);
        return () => clearInterval(t);
    }, [startAt, estimatedTotalMs]);

    useEffect(() => {
        let hasStarted = false;
        // Ask notification permission up-front
        try {
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'default') {
                    Notification.requestPermission().catch(() => { });
                }
            }
        } catch { }

        const run = async () => {
            if (hasStarted) return; hasStarted = true;
            try {
                if (!user?.id || !params.prompt || !params.language) {
                    navigate('/dashboard/explainers');
                    return;
                }

                // Nếu có content từ material, slideshow sẽ tự tạo audio; nếu không, tạo audio riêng trước
                let audioUrl: string | null = null;
                let transcript: string;
                let script: string;

                if (params.content && params.content.trim()) {
                    // Trường hợp: Có material content - slideshow sẽ tự tạo audio từ content
                    console.log('📄 Using material content, length:', params.content.length);
                    // Không cần tạo audio riêng, slideshow API sẽ tự xử lý
                    transcript = params.content.trim();
                    script = params.content.trim();
                } else {
                    // Trường hợp: Tạo từ prompt thông thường - cần tạo audio riêng
                    const audioResp = await fetch('http://localhost:3001/api/audio/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: params.prompt.trim(),
                            userId: user.id,
                            studySetId: params.studySetId,
                            language: params.language
                        })
                    });
                    if (!audioResp.ok) {
                        const e = await audioResp.json().catch(() => ({}));
                        throw new Error(e.error || 'Tạo audio thất bại');
                    }
                    const audioData = await audioResp.json();
                    audioUrl = audioData.audioUrl;
                    transcript = audioData.transcript || audioData.script || params.prompt.trim();
                    script = audioData.script || params.prompt.trim();
                }

                // 2) Tạo slideshow video
                const videoResp = await fetch('http://localhost:3001/api/explainers/slideshow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: params.content ? params.content.trim() : (script || params.prompt.trim()),
                        audioUrl: audioUrl, // null nếu có content, slideshow sẽ tự tạo
                        userId: user.id,
                        studySetId: params.studySetId || null,
                        prompt: params.content ? `Material: ${params.materialId}` : params.prompt.trim(),
                        videoTitle: params.title,
                        language: params.language
                    })
                });
                if (!videoResp.ok) {
                    const e = await videoResp.json().catch(() => ({}));
                    throw new Error(e.error || 'Tạo slideshow thất bại');
                }
                const videoData = await videoResp.json();

                // 3) Điều hướng tới trang kết quả
                try {
                    // Lưu transcript vào database nếu có
                    if (transcript && videoData.id) {
                        try {
                            await fetch(`http://localhost:3001/api/videos/${videoData.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    transcript: transcript
                                })
                            }).catch(() => {
                                // Ignore errors when updating transcript
                            });
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                    if (typeof window !== 'undefined' && 'Notification' in window) {
                        if (Notification.permission === 'granted') {
                            new Notification('Video đã sẵn sàng', {
                                body: 'Video của bạn đã được tạo xong. Nhấp để xem kết quả.',
                            });
                        }
                    }
                } catch { }

                navigate('/dashboard/explainers/video/result', {
                    state: {
                        id: videoData.id || null,
                        videoUrl: videoData.videoUrl,
                        audioUrl: audioUrl,
                        transcript: transcript || null,
                        title: params.title || params.prompt,
                        prompt: params.content ? `Material: ${params.materialId}` : params.prompt,
                        userName: user?.name || 'User'
                    }
                });
            } catch (e: any) {
                console.error('Create video error:', e);
                navigate('/dashboard/explainers');
            }
        };
        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex-1 bg-white min-h-screen p-6 pt-16 max-w-6xl mx-auto">
            {/* Header with Tabs - full width */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    {/* Tabs */}
                    <div className="flex items-center space-x-1 border-b border-gray-200">
                        <button
                            onClick={() => navigate('/dashboard/explainers')}
                            className={`px-4 py-2 text-sm font-medium transition-colors relative text-blue-600`}
                        >
                            Tạo video giải thích
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                        </button>
                        <button
                            onClick={() => navigate('/dashboard/explainers?tab=my-videos')}
                            className={`px-4 py-2 text-sm font-medium transition-colors relative text-gray-600 hover:text-gray-900`}
                        >
                            Video của tôi
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                {/* Placeholder đúng vị trí khung video 16:9 */}
                <div className="overflow-hidden">
                    <div className="aspect-video bg-white flex items-center justify-center">
                        <div className="text-center">
                            <img src="/car.gif" alt="loading" className="mx-auto mb-4 w-36 h-36 md:w-40 md:h-40 object-contain" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">Đang tạo video...</h2>
                            <p className="text-sm text-gray-600 mb-3">AI đang xử lý nội dung và ghép giọng đọc.</p>
                            <div className="text-xs text-gray-500 mb-1">Thời gian dự kiến còn lại</div>
                            <div className="text-3xl font-mono tracking-widest text-blue-600">{remaining}</div>
                            <div className="text-xs text-gray-500 mt-3">Sau khi hoàn tất, chúng tôi sẽ thông báo cho bạn.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExplainerVideoGenerating;


