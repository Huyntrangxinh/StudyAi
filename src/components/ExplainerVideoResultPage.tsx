import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, List, Share2, ThumbsUp, ThumbsDown, Upload, Download, MoreVertical } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface ExplainerVideoResultPageProps {
    onBack?: () => void;
}

interface Highlight {
    id: string;
    start: number;
    end: number;
}

const ExplainerVideoResultPage: React.FC<ExplainerVideoResultPageProps> = ({ onBack }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'transcript' | 'outline'>('transcript');
    const [menuOpen, setMenuOpen] = useState(false);
    const [currentTitle, setCurrentTitle] = useState<string | null>(null);
    const [likes, setLikes] = useState(0);
    const [dislikes, setDislikes] = useState(0);
    const [showTitleModal, setShowTitleModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [outlineHighlights, setOutlineHighlights] = useState<Highlight[]>([]);
    const [actualOutlineText, setActualOutlineText] = useState<string>('');
    const [videoId, setVideoId] = useState<number | null>((location.state as any)?.id || null);
    const [transcriptFromDb, setTranscriptFromDb] = useState<string | null>(null);
    const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
    const transcriptRef = useRef<HTMLDivElement>(null);
    const outlineRef = useRef<HTMLDivElement>(null);

    // Lấy dữ liệu từ location state hoặc fallback
    const videoUrl = (location.state as any)?.videoUrl || null;
    const audioUrl = (location.state as any)?.audioUrl || null;
    const transcriptFromState = (location.state as any)?.transcript || null;
    const title = (location.state as any)?.title || 'Video giải thích';
    const prompt = (location.state as any)?.prompt || title;
    const userName = (location.state as any)?.userName || user?.name || 'AI Assistant';

    // Use transcript from state or database
    const transcript = transcriptFromState || transcriptFromDb;

    // Tạo unique key cho transcript và outline để lưu highlights
    const transcriptKey = transcript ? `transcript-${videoUrl || audioUrl || title}` : null;
    const outlineKey = transcript ? `outline-${videoUrl || audioUrl || title}` : null;

    // Load highlights từ localStorage khi transcript thay đổi (chỉ nếu chưa có từ database)
    useEffect(() => {
        if (!transcriptKey || !transcript) return;

        // Chỉ load từ localStorage nếu chưa có highlights (có thể từ database)
        // Đợi một chút để database load xong trước
        const timer = setTimeout(() => {
            if (highlights.length === 0) {
                try {
                    const saved = localStorage.getItem(transcriptKey);
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            console.log('Loading transcript highlights from localStorage:', parsed.length);
                            setHighlights(parsed);
                        }
                    }
                } catch (e) {
                    console.error('Failed to load highlights:', e);
                }
            }
        }, 500); // Đợi 500ms để database load xong

        return () => clearTimeout(timer);
    }, [transcriptKey, transcript]);

    // Save highlights vào database và localStorage khi highlights thay đổi
    useEffect(() => {
        if (!transcriptKey || isLoadingFromDb) return;

        // Save to localStorage (fallback)
        try {
            localStorage.setItem(transcriptKey, JSON.stringify(highlights));
        } catch (e) {
            console.error('Failed to save highlights to localStorage:', e);
        }

        // Save to database if videoId exists
        if (videoId && user?.id && highlights.length > 0) {
            console.log('Saving transcript highlights to database:', highlights.length);
            fetch(`http://localhost:3001/api/videos/${videoId}/highlights`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    highlights: highlights,
                    type: 'transcript'
                })
            })
                .then(resp => {
                    if (resp.ok) {
                        console.log('Successfully saved transcript highlights to database');
                    } else {
                        console.error('Failed to save highlights to database:', resp.status);
                    }
                })
                .catch(e => {
                    console.error('Failed to save highlights to database:', e);
                });
        }
    }, [highlights, transcriptKey, videoId, user?.id, isLoadingFromDb]);

    // Load outline highlights từ localStorage (fallback)
    useEffect(() => {
        if (!outlineKey || !transcript) return;

        // Chỉ load từ localStorage nếu chưa có highlights (có thể từ database)
        // Đợi một chút để database load xong trước
        const timer = setTimeout(() => {
            if (outlineHighlights.length === 0) {
                try {
                    const saved = localStorage.getItem(outlineKey);
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            console.log('Loading outline highlights from localStorage:', parsed.length);
                            setOutlineHighlights(parsed);
                        }
                    }
                } catch (e) {
                    console.error('Failed to load outline highlights:', e);
                }
            }
        }, 500); // Đợi 500ms để database load xong

        return () => clearTimeout(timer);
    }, [outlineKey, transcript]);

    // Save outline highlights vào database và localStorage
    useEffect(() => {
        if (!outlineKey || isLoadingFromDb) return;

        // Save to localStorage (fallback)
        try {
            localStorage.setItem(outlineKey, JSON.stringify(outlineHighlights));
        } catch (e) {
            console.error('Failed to save outline highlights to localStorage:', e);
        }

        // Save to database if videoId exists
        if (videoId && user?.id && outlineHighlights.length > 0) {
            console.log('Saving outline highlights to database:', outlineHighlights.length);
            fetch(`http://localhost:3001/api/videos/${videoId}/highlights`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    highlights: outlineHighlights,
                    type: 'outline'
                })
            })
                .then(resp => {
                    if (resp.ok) {
                        console.log('Successfully saved outline highlights to database');
                    } else {
                        console.error('Failed to save outline highlights to database:', resp.status);
                    }
                })
                .catch(e => {
                    console.error('Failed to save outline highlights to database:', e);
                });
        }
    }, [outlineHighlights, outlineKey, videoId, user?.id, isLoadingFromDb]);

    // Fetch video details và highlights từ API
    useEffect(() => {
        const fetchVideoDetails = async () => {
            // Tìm videoId nếu chưa có
            let vidId = videoId;
            if (!vidId && videoUrl && user?.id) {
                try {
                    const resp = await fetch(`http://localhost:3001/api/videos?userId=${user.id}`);
                    if (resp.ok) {
                        const list = await resp.json();
                        if (Array.isArray(list)) {
                            const found = list.find((v: any) => v.video_url === videoUrl);
                            if (found) vidId = found.id;
                        }
                    }
                } catch (e) {
                    console.error('Failed to fetch video list:', e);
                }
            }

            // Fetch video details nếu có videoId
            if (vidId) {
                setVideoId(vidId);
                setIsLoadingFromDb(true);
                try {
                    const resp = await fetch(`http://localhost:3001/api/videos/${vidId}`);
                    if (resp.ok) {
                        const videoData = await resp.json();

                        // Load transcript từ database nếu chưa có từ state
                        if (!transcriptFromState && videoData.transcript) {
                            setTranscriptFromDb(videoData.transcript);
                        }

                        // Load highlights từ database (luôn load, không phụ thuộc vào transcript)
                        if (videoData.highlights) {
                            const dbHighlights = videoData.highlights;
                            if (dbHighlights.transcript && Array.isArray(dbHighlights.transcript)) {
                                console.log('Loading transcript highlights from database:', dbHighlights.transcript.length);
                                setHighlights(dbHighlights.transcript);
                            }
                            if (dbHighlights.outline && Array.isArray(dbHighlights.outline)) {
                                console.log('Loading outline highlights from database:', dbHighlights.outline.length);
                                setOutlineHighlights(dbHighlights.outline);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Failed to fetch video details:', e);
                } finally {
                    setIsLoadingFromDb(false);
                }
            }
        };

        fetchVideoDetails();
    }, [videoUrl, user?.id, videoId, transcriptFromState]);

    // Lưu actualOutlineText từ DOM sau khi render
    useEffect(() => {
        if (outlineRef.current && transcript) {
            // Đợi một chút để DOM render xong
            const timer = setTimeout(() => {
                if (outlineRef.current) {
                    const innerText = outlineRef.current.innerText || '';
                    if (innerText) {
                        setActualOutlineText(innerText);
                    }
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [transcript, outlineHighlights]);

    // Xử lý text selection và highlight
    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        let selectedText = selection.toString().trim();

        // Chỉ highlight nếu có text được chọn và nằm trong transcript container
        if (!selectedText || !transcriptRef.current || !transcript) return;

        if (!transcriptRef.current.contains(range.commonAncestorContainer)) return;

        // Tính toán vị trí trong transcript gốc
        // Lấy text từ DOM để có được vị trí tương đối
        const containerText = transcriptRef.current.innerText || transcriptRef.current.textContent || '';

        // Tạo một range từ đầu container đến start của selection
        const startRange = document.createRange();
        startRange.setStart(transcriptRef.current, 0);
        startRange.setEnd(range.startContainer, range.startOffset);
        const textBeforeSelection = startRange.toString();

        // Tìm vị trí trong transcript gốc bằng cách đếm ký tự
        // Tìm vị trí đầu tiên của selectedText sau textBeforeSelection
        const startIndex = textBeforeSelection.length;
        const endIndex = startIndex + selectedText.length;

        // Verify rằng text tại vị trí này khớp với selectedText
        const actualText = transcript.substring(startIndex, endIndex);
        if (actualText.trim() !== selectedText.trim()) {
            // Nếu không khớp, thử tìm trong transcript gốc
            const foundIndex = transcript.indexOf(selectedText, Math.max(0, startIndex - 100));
            if (foundIndex === -1) {
                selection.removeAllRanges();
                return;
            }

            const startOffset = foundIndex;
            const endOffset = foundIndex + selectedText.length;

            // Kiểm tra xem đã highlight chưa
            const isAlreadyHighlighted = highlights.some(h =>
                (h.start <= startOffset && h.end > startOffset) ||
                (h.start < endOffset && h.end >= endOffset) ||
                (startOffset <= h.start && endOffset > h.start) ||
                (startOffset < h.end && endOffset >= h.end)
            );

            if (isAlreadyHighlighted) {
                const overlappingHighlight = highlights.find(h =>
                    (h.start <= startOffset && h.end > startOffset) ||
                    (h.start < endOffset && h.end >= endOffset) ||
                    (startOffset <= h.start && endOffset > h.start) ||
                    (startOffset < h.end && endOffset >= h.end)
                );

                if (overlappingHighlight) {
                    setHighlights(prev => prev.filter(h => h.id !== overlappingHighlight.id));
                    toast.success('Đã bỏ highlight');
                }
                selection.removeAllRanges();
                return;
            }

            const newHighlight: Highlight = {
                id: `highlight-${Date.now()}-${Math.random()}`,
                start: startOffset,
                end: endOffset
            };

            setHighlights(prev => [...prev, newHighlight].sort((a, b) => a.start - b.start));
            toast.success('Đã highlight');
            selection.removeAllRanges();
            return;
        }

        const startOffset = startIndex;
        const endOffset = endIndex;

        // Kiểm tra xem đã highlight chưa (tránh duplicate)
        const isAlreadyHighlighted = highlights.some(h =>
            (h.start <= startOffset && h.end > startOffset) ||
            (h.start < endOffset && h.end >= endOffset) ||
            (startOffset <= h.start && endOffset > h.start) ||
            (startOffset < h.end && endOffset >= h.end)
        );

        if (isAlreadyHighlighted) {
            // Nếu đã highlight, có thể bỏ highlight (xóa)
            const overlappingHighlight = highlights.find(h =>
                (h.start <= startOffset && h.end > startOffset) ||
                (h.start < endOffset && h.end >= endOffset) ||
                (startOffset <= h.start && endOffset > h.start) ||
                (startOffset < h.end && endOffset >= h.end)
            );

            if (overlappingHighlight) {
                setHighlights(prev => prev.filter(h => h.id !== overlappingHighlight.id));
                toast.success('Đã bỏ highlight');
            }
            selection.removeAllRanges();
            return;
        }

        // Thêm highlight mới
        const newHighlight: Highlight = {
            id: `highlight-${Date.now()}-${Math.random()}`,
            start: startOffset,
            end: endOffset
        };

        setHighlights(prev => [...prev, newHighlight].sort((a, b) => a.start - b.start));
        toast.success('Đã highlight');
        selection.removeAllRanges();
    }, [highlights, transcript]);

    // Render transcript với highlights
    const renderTranscriptWithHighlights = useCallback(() => {
        if (!transcript) return null;

        // Sắp xếp highlights theo start position
        const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

        // Nếu không có highlights, trả về text bình thường
        if (sortedHighlights.length === 0) {
            return transcript;
        }

        // Tạo array các phần tử để render
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;

        sortedHighlights.forEach((highlight, idx) => {
            // Thêm text trước highlight
            if (highlight.start > lastIndex) {
                parts.push(
                    <span key={`text-${idx}`}>
                        {transcript.substring(lastIndex, highlight.start)}
                    </span>
                );
            }

            // Thêm highlighted text
            parts.push(
                <mark
                    key={highlight.id}
                    className="bg-yellow-200 text-gray-900 px-0.5 py-0.5 rounded cursor-pointer hover:bg-yellow-300 transition-colors"
                    onClick={() => {
                        setHighlights(prev => prev.filter(h => h.id !== highlight.id));
                        toast.success('Đã xóa highlight');
                    }}
                    title="Click để xóa highlight"
                >
                    {transcript.substring(highlight.start, highlight.end)}
                </mark>
            );

            lastIndex = highlight.end;
        });

        // Thêm text sau highlight cuối cùng
        if (lastIndex < transcript.length) {
            parts.push(
                <span key="text-end">
                    {transcript.substring(lastIndex)}
                </span>
            );
        }

        return parts;
    }, [transcript, highlights]);

    // Xử lý text selection trong outline
    const handleOutlineSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        let selectedText = selection.toString().trim();

        if (!selectedText || !outlineRef.current) return;

        if (!outlineRef.current.contains(range.commonAncestorContainer)) return;

        // Tính toán vị trí dựa trên innerText thực tế của container
        // Dùng Range API để tính chính xác offset
        const startRange = document.createRange();
        startRange.setStart(outlineRef.current, 0);
        startRange.setEnd(range.startContainer, range.startOffset);
        const textBeforeSelection = startRange.toString();

        // Lấy innerText thực tế để verify
        const actualInnerText = outlineRef.current.innerText || '';

        // Tìm vị trí trong innerText thực tế
        const startIndex = textBeforeSelection.length;

        // Verify: tìm selectedText trong innerText từ vị trí startIndex
        const actualSelected = actualInnerText.substring(startIndex, startIndex + selectedText.length);
        let verifiedStartIndex = startIndex;
        let verifiedEndIndex = startIndex + selectedText.length;

        // Nếu không khớp, thử tìm trong innerText
        if (actualSelected.trim() !== selectedText.trim()) {
            const foundIndex = actualInnerText.indexOf(selectedText, Math.max(0, startIndex - 50));
            if (foundIndex !== -1) {
                verifiedStartIndex = foundIndex;
                verifiedEndIndex = foundIndex + selectedText.length;
            } else {
                // Fallback: dùng startIndex nhưng cần adjust
                verifiedEndIndex = startIndex + selectedText.length;
            }
        }

        // Kiểm tra xem đã highlight chưa (dùng verified indices)
        const isAlreadyHighlighted = outlineHighlights.some(h =>
            (h.start <= verifiedStartIndex && h.end > verifiedStartIndex) ||
            (h.start < verifiedEndIndex && h.end >= verifiedEndIndex) ||
            (verifiedStartIndex <= h.start && verifiedEndIndex > h.start) ||
            (verifiedStartIndex < h.end && verifiedEndIndex >= h.end)
        );

        if (isAlreadyHighlighted) {
            const overlappingHighlight = outlineHighlights.find(h =>
                (h.start <= verifiedStartIndex && h.end > verifiedStartIndex) ||
                (h.start < verifiedEndIndex && h.end >= verifiedEndIndex) ||
                (verifiedStartIndex <= h.start && verifiedEndIndex > h.start) ||
                (verifiedStartIndex < h.end && verifiedEndIndex >= h.end)
            );

            if (overlappingHighlight) {
                setOutlineHighlights(prev => prev.filter(h => h.id !== overlappingHighlight.id));
                toast.success('Đã bỏ highlight');
            }
            selection.removeAllRanges();
            return;
        }

        const newHighlight: Highlight = {
            id: `outline-highlight-${Date.now()}-${Math.random()}`,
            start: verifiedStartIndex,
            end: verifiedEndIndex
        };

        setOutlineHighlights(prev => [...prev, newHighlight].sort((a, b) => a.start - b.start));
        toast.success('Đã highlight');
        selection.removeAllRanges();
    }, [outlineHighlights]);

    // -------- Outline builder (từ transcript) --------
    type OutlineItem = { heading: string; bullets: string[] };

    const splitIntoSentences = (text: string): string[] => {
        return text
            .split(/(?<=[.!?。？！])\s+|\n+/)
            .map(s => s.trim())
            .filter(Boolean);
    };

    const buildOutline = useCallback((text: string): OutlineItem[] => {
        if (!text) return [];

        // Tìm các phần chính bằng cách tìm câu hỏi, tiêu đề, hoặc câu đầu đoạn quan trọng
        const sentences = splitIntoSentences(text);
        if (sentences.length === 0) return [];

        const outline: OutlineItem[] = [];
        let currentSection: OutlineItem | null = null;

        // Tìm các câu có thể là tiêu đề (câu hỏi, câu ngắn, hoặc câu có từ khóa)
        const headingIndicators = /^(what|what is|what are|định nghĩa|là gì|quá trình|process|ví dụ|ứng dụng|tóm tắt|summary|key points|điểm chính|kết luận)/i;
        const isHeading = (s: string) =>
            s.length < 100 && (
                headingIndicators.test(s) ||
                s.includes('?') ||
                s.endsWith(':') ||
                (s.length < 60 && s.split(' ').length < 12)
            );

        // Tách thành các section
        for (let i = 0; i < sentences.length; i++) {
            const sent = sentences[i];

            if (isHeading(sent) && currentSection) {
                // Lưu section cũ và bắt đầu section mới
                if (currentSection.bullets.length > 0 || currentSection.heading.length > 0) {
                    outline.push(currentSection);
                }
                currentSection = { heading: sent, bullets: [] };
            } else if (isHeading(sent) && !currentSection) {
                // Bắt đầu section mới
                currentSection = { heading: sent, bullets: [] };
            } else if (currentSection) {
                // Thêm vào bullets của section hiện tại
                if (currentSection.bullets.length < 8) {
                    currentSection.bullets.push(sent);
                }
            } else {
                // Nếu chưa có section nào, tạo section đầu tiên
                currentSection = { heading: sent, bullets: [] };
            }
        }

        // Thêm section cuối cùng
        if (currentSection && (currentSection.bullets.length > 0 || currentSection.heading.length > 0)) {
            outline.push(currentSection);
        }

        // Nếu không tạo được outline tốt, fallback về cách đơn giản
        if (outline.length === 0 || outline.length < 2) {
            const paragraphs = text.split(/\n\s*\n|\r?\n\r?\n/).map(p => p.trim()).filter(Boolean);
            if (paragraphs.length > 0) {
                outline.length = 0; // Reset
                for (const para of paragraphs.slice(0, 6)) {
                    const paraSentences = splitIntoSentences(para);
                    if (paraSentences.length > 0) {
                        outline.push({
                            heading: paraSentences[0],
                            bullets: paraSentences.slice(1, 7)
                        });
                    }
                }
            }
        }

        return outline.slice(0, 8);
    }, []);

    // Chuẩn hóa chuỗi outline và render giống transcript (đảm bảo vị trí highlight tuyệt đối)
    const getFullOutlineText = useCallback((): string => {
        const items = buildOutline(transcript || '');
        return items.map(it => `${it.heading}${it.bullets.length ? '\n' + it.bullets.join('\n') : ''}`).join('\n\n');
    }, [buildOutline, transcript]);

    // Render text với highlights (helper function)
    const renderTextWithHighlights = useCallback((text: string, highlights: Highlight[]): React.ReactNode => {
        if (!text || highlights.length === 0) return text;
        const sorted = [...highlights].sort((a, b) => a.start - b.start);
        const parts: React.ReactNode[] = [];
        let last = 0;
        sorted.forEach((h, i) => {
            if (h.start > last) {
                parts.push(<span key={`t-${i}`}>{text.substring(last, h.start)}</span>);
            }
            parts.push(
                <mark
                    key={h.id}
                    className="bg-yellow-200 text-gray-900 px-0.5 py-0.5 rounded cursor-pointer hover:bg-yellow-300 transition-colors"
                    onClick={() => {
                        setOutlineHighlights(prev => prev.filter(x => x.id !== h.id));
                        toast.success('Đã xóa highlight');
                    }}
                    title="Click để xóa highlight"
                >
                    {text.substring(h.start, h.end)}
                </mark>
            );
            last = h.end;
        });
        if (last < text.length) {
            parts.push(<span key="t-end">{text.substring(last)}</span>);
        }
        return <>{parts}</>;
    }, []);

    const renderOutlineWithHighlights = useCallback(() => {
        if (!transcript) return null;
        const items = buildOutline(transcript);
        if (items.length === 0) return null;

        const sorted = [...outlineHighlights].sort((a, b) => a.start - b.start);

        // Dùng actualOutlineText nếu có (đã được lưu từ DOM), nếu không dùng getFullOutlineText
        const textToUse = actualOutlineText || getFullOutlineText();

        // Tính toán vị trí của từng item trong text (dựa trên textToUse)
        const itemsWithPositions: Array<{ item: OutlineItem; headingStart: number; headingEnd: number; bulletsStart: number; bulletsEnd: number }> = [];
        let currentPos = 0;

        items.forEach((it) => {
            const headingStart = currentPos;
            const headingEnd = headingStart + it.heading.length;
            const bulletsStart = it.bullets.length > 0 ? headingEnd + 1 : headingEnd; // +1 for \n
            const bulletsText = it.bullets.join('\n');
            const bulletsEnd = bulletsStart + bulletsText.length;

            itemsWithPositions.push({
                item: it,
                headingStart,
                headingEnd,
                bulletsStart,
                bulletsEnd
            });

            currentPos = bulletsEnd + 2; // +2 for \n\n between items
        });

        // Render từng item với format đẹp và highlights
        return (
            <div className="space-y-10 px-2 py-2">
                {itemsWithPositions.map((itemPos, idx) => {
                    // Lấy highlights cho heading
                    const headingHighlights = sorted
                        .filter(h => h.start < itemPos.headingEnd && h.end > itemPos.headingStart)
                        .map(h => ({
                            ...h,
                            start: Math.max(0, h.start - itemPos.headingStart),
                            end: Math.min(itemPos.headingEnd - itemPos.headingStart, h.end - itemPos.headingStart)
                        }));

                    return (
                        <div key={idx} className="">
                            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                                {headingHighlights.length > 0
                                    ? renderTextWithHighlights(itemPos.item.heading, headingHighlights)
                                    : itemPos.item.heading
                                }
                            </h3>
                            {itemPos.item.bullets.length > 0 && (
                                <ul className="list-disc pl-6 text-gray-700 leading-7">
                                    {itemPos.item.bullets.map((bullet, bulletIdx) => {
                                        // Tính offset của bullet trong phần bullets
                                        const bulletStartInBullets = itemPos.item.bullets.slice(0, bulletIdx).reduce((acc, b) => acc + b.length + 1, 0); // +1 for \n
                                        const bulletStartInFull = itemPos.bulletsStart + bulletStartInBullets;
                                        const bulletEndInFull = bulletStartInFull + bullet.length;

                                        // Lấy highlights cho bullet này
                                        const bulletHighlights = sorted
                                            .filter(h => h.start < bulletEndInFull && h.end > bulletStartInFull)
                                            .map(h => ({
                                                ...h,
                                                start: Math.max(0, h.start - bulletStartInFull),
                                                end: Math.min(bullet.length, h.end - bulletStartInFull)
                                            }));

                                        return (
                                            <li key={bulletIdx} className="mb-1">
                                                {bulletHighlights.length > 0
                                                    ? renderTextWithHighlights(bullet, bulletHighlights)
                                                    : bullet
                                                }
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }, [transcript, outlineHighlights, actualOutlineText, getFullOutlineText, buildOutline, renderTextWithHighlights]);

    const renderOutline = useCallback(() => {
        if (!transcript) return (
            <div className="text-center py-12 text-gray-500">
                <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Outline sẽ được cập nhật sớm</p>
            </div>
        );

        const items = buildOutline(transcript);
        if (items.length === 0) {
            return (
                <div className="text-center py-12 text-gray-500">
                    <p>Không tạo được outline từ transcript</p>
                </div>
            );
        }

        // Render gọn: một container duy nhất, whitespace-pre-wrap để xuống dòng đúng
        return (
            <div
                ref={outlineRef}
                className="whitespace-pre-wrap px-2 py-2 select-text cursor-text text-gray-800 leading-relaxed"
                onMouseUp={handleOutlineSelection}
                style={{ userSelect: 'text' }}
            >
                {renderOutlineWithHighlights()}
            </div>
        );
    }, [transcript, buildOutline, renderOutlineWithHighlights, handleOutlineSelection]);

    if (!videoUrl && !audioUrl) {
        return (
            <div className="flex-1 bg-white min-h-screen p-8 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Không tìm thấy video hoặc audio</p>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Quay lại
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: title,
                text: `Xem video giải thích: ${title}`,
                url: window.location.href
            }).catch(() => {
                toast.error('Không thể chia sẻ');
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Đã sao chép link');
        }
    };

    const handleDownload = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Đang tải xuống...');
    };

    return (
        <div className="flex-1 bg-white min-h-screen">
            {/* Header với tabs - giữ nguyên như ExplainerVideoPage */}
            <div className="mb-8 border-b border-gray-200">
                <div className="flex items-center justify-between mb-6 px-8 pt-6">
                    {/* Tabs */}
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => navigate('/dashboard/explainers')}
                            className="px-6 py-3 font-medium transition-colors relative text-gray-600 hover:text-gray-900"
                        >
                            Tạo video giải thích
                        </button>
                        <button
                            onClick={() => navigate('/dashboard/explainers?tab=explore')}
                            className="px-6 py-3 font-medium transition-colors relative text-gray-600 hover:text-gray-900"
                        >
                            Khám phá video
                        </button>
                        <button
                            onClick={() => navigate('/dashboard/explainers?tab=my-videos')}
                            className="px-6 py-3 font-medium transition-colors relative text-gray-600 hover:text-gray-900"
                        >
                            Video của tôi
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleShare}
                            className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Share2 className="w-4 h-4" />
                            <span>Chia sẻ</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <Upload className="w-4 h-4" />
                            <span>Phản hồi</span>
                        </button>
                        <button className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-8 pb-8">
                {/* Title modal */}
                {showTitleModal && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowTitleModal(false)}>
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-semibold mb-4">Cập nhật tiêu đề</h3>
                            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nhập tiêu đề" />
                            <div className="flex justify-end space-x-3 mt-6">
                                <button onClick={() => setShowTitleModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Hủy</button>
                                <button onClick={async () => {
                                    setShowTitleModal(false);
                                    const vid = await (async () => {
                                        if ((location.state as any)?.id) return (location.state as any)?.id as number;
                                        if (!user?.id) return null;
                                        try {
                                            const resp = await fetch(`http://localhost:3001/api/videos?userId=${user.id}`);
                                            if (!resp.ok) return null;
                                            const list = await resp.json();
                                            if (!Array.isArray(list)) return null;
                                            let found = list.find((v: any) => v.video_url === videoUrl);
                                            if (found) return found.id;
                                            const name = String(videoUrl || '').split('/').pop();
                                            found = list.find((v: any) => String(v.video_url || '').split('/').pop() === name);
                                            if (found) return found.id;
                                            const tl = String((currentTitle || title) || '').trim().toLowerCase();
                                            const pr = String(prompt || '').trim().toLowerCase();
                                            found = list.find((v: any) => String(v.video_title || '').trim().toLowerCase() === tl || String(v.prompt || '').trim().toLowerCase() === pr);
                                            if (found) return found.id;
                                            return list[0]?.id || null;
                                        } catch { return null; }
                                    })();
                                    if (!vid || !user?.id) { toast.error('Không tìm thấy video'); return; }
                                    try {
                                        const resp = await fetch(`http://localhost:3001/api/videos/${vid}/title`, {
                                            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, title: newTitle })
                                        });
                                        if (resp.ok) { setCurrentTitle(newTitle); toast.success('Đã cập nhật tiêu đề'); }
                                        else { toast.error('Không cập nhật được tiêu đề'); }
                                    } catch { toast.error('Lỗi mạng'); }
                                }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Lưu</button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Video Player */}
                <div className="mb-6">
                    <div className="bg-black rounded-xl overflow-hidden aspect-video">
                        {videoUrl ? (
                            <video
                                controls
                                src={videoUrl}
                                className="w-full h-full object-contain"
                                preload="metadata"
                            >
                                Trình duyệt của bạn không hỗ trợ video.
                            </video>
                        ) : audioUrl ? (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                                <audio
                                    controls
                                    src={audioUrl}
                                    className="w-full max-w-2xl"
                                >
                                    Trình duyệt của bạn không hỗ trợ audio.
                                </audio>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Video Info */}
                <div className="mb-6">
                    <div className="flex items-start justify-between">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {currentTitle || title}
                        </h1>
                        <div className="relative">
                            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded hover:bg-gray-100">
                                <MoreVertical className="w-5 h-5 text-gray-600" />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                    <button
                                        onClick={() => { setMenuOpen(false); setNewTitle(currentTitle || title || ''); setShowTitleModal(true); }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                    >
                                        Cập nhật tiêu đề
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setMenuOpen(false);
                                            const vid = await (async () => {
                                                if ((location.state as any)?.id) return (location.state as any)?.id as number;
                                                if (!user?.id) return null;
                                                try {
                                                    const resp = await fetch(`http://localhost:3001/api/videos?userId=${user.id}`);
                                                    if (!resp.ok) return null;
                                                    const list = await resp.json();
                                                    if (!Array.isArray(list)) return null;
                                                    let found = list.find((v: any) => v.video_url === videoUrl);
                                                    if (found) return found.id;
                                                    const name = String(videoUrl || '').split('/').pop();
                                                    found = list.find((v: any) => String(v.video_url || '').split('/').pop() === name);
                                                    if (found) return found.id;
                                                    const tl = String((currentTitle || title) || '').trim().toLowerCase();
                                                    const pr = String(prompt || '').trim().toLowerCase();
                                                    found = list.find((v: any) => String(v.video_title || '').trim().toLowerCase() === tl || String(v.prompt || '').trim().toLowerCase() === pr);
                                                    if (found) return found.id;
                                                    return list[0]?.id || null;
                                                } catch { return null; }
                                            })();
                                            if (!vid || !user?.id) { toast.error('Không tìm thấy video'); return; }
                                            if (!window.confirm('Xóa video này?')) return;
                                            try {
                                                await fetch(`http://localhost:3001/api/videos/${vid}?userId=${user?.id}`, { method: 'DELETE' });
                                                toast.success('Đã xóa video');
                                                navigate('/dashboard/explainers?tab=my-videos');
                                            } catch { toast.error('Không xóa được'); }
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        Xóa video
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                        <span>0 views</span>
                        <span className="mx-2">•</span>
                        <span>Vừa tạo</span>
                    </div>

                    {/* Author và Actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-yellow-400 flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">{userName.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-gray-900 font-medium">{userName}</span>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleShare}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Upload className="w-4 h-4" />
                                <span>Share</span>
                            </button>
                            <button
                                onClick={() => setLikes(likes + 1)}
                                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ThumbsUp className="w-4 h-4" />
                                <span>{likes}</span>
                            </button>
                            <button
                                onClick={() => setDislikes(dislikes + 1)}
                                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ThumbsDown className="w-4 h-4" />
                                <span>{dislikes}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Transcript/Outline Tabs */}
                <div className="border-b border-gray-200 mb-4">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => setActiveTab('transcript')}
                            className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors relative ${activeTab === 'transcript'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            <span>Transcript</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('outline')}
                            className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors relative ${activeTab === 'outline'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <List className="w-4 h-4" />
                            <span>Outline</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-lg">
                    {activeTab === 'transcript' ? (
                        <div className="prose max-w-none">
                            {transcript ? (
                                <div
                                    ref={transcriptRef}
                                    className="whitespace-pre-wrap text-gray-800 leading-relaxed p-4 select-text cursor-text"
                                    onMouseUp={handleTextSelection}
                                    style={{ userSelect: 'text' }}
                                >
                                    {renderTranscriptWithHighlights()}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Chưa có transcript</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        renderOutline()
                    )}
                </div>

                {/* Download Section */}
                {(videoUrl || audioUrl) && (
                    <div className="mt-6 flex items-center space-x-4">
                        {videoUrl && (
                            <button
                                onClick={() => handleDownload(videoUrl, 'video.mp4')}
                                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                <span>Tải video</span>
                            </button>
                        )}
                        {audioUrl && (
                            <button
                                onClick={() => handleDownload(audioUrl, 'audio.mp3')}
                                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                <span>Tải audio</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExplainerVideoResultPage;

