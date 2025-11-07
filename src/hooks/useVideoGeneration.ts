import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface VideoGenerationOptions {
    prompt: string;
    webSearchEnabled: boolean;
    imageSearchEnabled: boolean;
    studySetId?: string | number;
    userId: string;
}

interface VideoStatus {
    id: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    prompt?: string;
    script?: string;
    createdAt?: string;
}

export function useVideoGeneration() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentVideo, setCurrentVideo] = useState<VideoStatus | null>(null);
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    const generateVideo = useCallback(async (options: VideoGenerationOptions) => {
        if (!options.prompt.trim()) {
            toast.error('Vui lòng nhập yêu cầu của bạn');
            return null;
        }

        setIsGenerating(true);
        setCurrentVideo(null);

        try {
            const response = await fetch('http://localhost:3001/api/videos/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();

            setCurrentVideo({
                id: data.videoId,
                status: 'processing',
                prompt: options.prompt
            });

            // Start polling for status
            startPolling(data.videoId);

            toast.success('Video đang được tạo! Bạn sẽ nhận được thông báo khi hoàn tất.');

            return data.videoId;

        } catch (error: any) {
            console.error('Error generating video:', error);
            toast.error(error.message || 'Không thể tạo video');
            setIsGenerating(false);
            setCurrentVideo(null);
            return null;
        }
    }, []);

    const startPolling = useCallback((videoId: number) => {
        // Clear any existing polling
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        const startTime = Date.now();
        const MAX_POLLING_TIME = 10 * 60 * 1000; // 10 minutes timeout
        let pollCount = 0;

        const interval = setInterval(async () => {
            try {
                pollCount++;
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                console.log(`Polling video status for videoId: ${videoId} (attempt ${pollCount}, ${elapsed}s elapsed)`);

                const response = await fetch(`http://localhost:3001/api/videos/${videoId}/status`);

                if (!response.ok) {
                    console.error('Status check failed:', response.status, await response.text());
                    throw new Error('Failed to check status');
                }

                const data: VideoStatus = await response.json();
                console.log('Video status response:', data);

                setCurrentVideo(data);

                if (data.status === 'completed') {
                    console.log('✅ Video completed!');
                    clearInterval(interval);
                    setPollingInterval(null);
                    setIsGenerating(false);
                    toast.success('Video đã được tạo thành công!');
                } else if (data.status === 'failed') {
                    console.log('❌ Video failed!');
                    clearInterval(interval);
                    setPollingInterval(null);
                    setIsGenerating(false);
                    toast.error('Tạo video thất bại');
                } else {
                    // Check timeout
                    if (Date.now() - startTime > MAX_POLLING_TIME) {
                        console.warn('⚠️ Polling timeout after 10 minutes');
                        clearInterval(interval);
                        setPollingInterval(null);
                        setIsGenerating(false);
                        toast.error('Video đang xử lý quá lâu. Vui lòng kiểm tra lại sau.');
                    } else {
                        console.log(`Video still processing, status: ${data.status} (${elapsed}s)`);
                    }
                }

            } catch (error) {
                console.error('Error polling video status:', error);
                // Don't stop polling on error, just log it
            }
        }, 3000); // Poll every 3 seconds

        setPollingInterval(interval);
    }, [pollingInterval]);

    const stopPolling = useCallback(() => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
    }, [pollingInterval]);

    const checkStatus = useCallback(async (videoId: number) => {
        try {
            const response = await fetch(`http://localhost:3001/api/videos/${videoId}/status`);

            if (!response.ok) {
                throw new Error('Failed to check status');
            }

            const data: VideoStatus = await response.json();
            setCurrentVideo(data);

            return data;
        } catch (error) {
            console.error('Error checking video status:', error);
            throw error;
        }
    }, []);

    return {
        generateVideo,
        isGenerating,
        currentVideo,
        checkStatus,
        stopPolling
    };
}

