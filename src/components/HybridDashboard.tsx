import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
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
    Sun,
    Pencil,
    Search,
    CheckCircle2,
    X,
    ArrowRight,
    ChevronRight,
    ArrowLeft,
    PenTool,
    ListChecks,
    Lightbulb,
    Book,
    Send,
    RotateCcw,
    Eye,
    Trash2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useViewTestHandler } from '../hooks/useViewTestHandler';
import DashboardContent from './DashboardContent';
import StudySetCard from './StudySetCard';
import StudySetDetail from './StudySetDetail';
import PDFViewerFixed from './PDFViewerFixed';
import Flashcards from './Flashcards';
import ExplainerVideoPage from './ExplainerVideoPage';
import ExplainerVideoGenerating from './ExplainerVideoGenerating';
import ExplainerVideoResultPage from './ExplainerVideoResultPage';
// @ts-ignore - Temporary fix for webpack cache issue
import ArcadePage from './ArcadePage';
import MatchGame from './games/MatchGame';
import toast from 'react-hot-toast';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const HybridDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
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
    const [showExplainerVideo, setShowExplainerVideo] = useState(false);
    const [showExplainerVideoResult, setShowExplainerVideoResult] = useState(false);
    const [showExplainerVideoGenerating, setShowExplainerVideoGenerating] = useState(false);
    const [showArcade, setShowArcade] = useState(false);
    const [showGamePlay, setShowGamePlay] = useState(false);
    const [currentGameId, setCurrentGameId] = useState<number | null>(null);
    const [showPractice, setShowPractice] = useState(false);
    const [practiceTab, setPracticeTab] = useState<'tests' | 'quizfetch'>('tests');
    const [showCreateTest, setShowCreateTest] = useState(false);
    const [testCreationMode, setTestCreationMode] = useState<'materials' | 'flashcards' | null>(null);
    const [showMaterialSelection, setShowMaterialSelection] = useState(false);
    const [materialsInSet, setMaterialsInSet] = useState<Array<{ id: string; name: string; created_at?: string; size?: number; file_path?: string }>>([]);
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isLoadingMaterials, setIsLoadingMaterials] = useState<boolean>(false);
    const [homeStats, setHomeStats] = useState<{ materialsCount: number; testsCount: number; flashcardsCount: number; explainersCount: number }>({ materialsCount: 0, testsCount: 0, flashcardsCount: 0, explainersCount: 0 });
    const [recentMaterials, setRecentMaterials] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
    const [savedTests, setSavedTests] = useState<Array<{ id: number; name: string; description?: string; created_at: string; study_set_id: number }>>([]);
    const [isLoadingTests, setIsLoadingTests] = useState(false);
    const [showTestTypeSelection, setShowTestTypeSelection] = useState(false);
    const [testTypeCounts, setTestTypeCounts] = useState<{ multipleChoice: number; shortAnswer: number; freeResponse: number; trueFalse: number; fillBlank: number }>({
        multipleChoice: 0,
        shortAnswer: 0,
        freeResponse: 0,
        trueFalse: 0,
        fillBlank: 0
    });
    const [selectedTestType, setSelectedTestType] = useState<'multipleChoice' | 'shortAnswer' | 'freeResponse' | 'trueFalse' | 'fillBlank'>('multipleChoice');
    const [isGeneratingTest, setIsGeneratingTest] = useState(false);
    const [testQuestions, setTestQuestions] = useState<Array<{
        id: string;
        type: string;
        question: string;
        options?: string[];
        correctAnswer?: number | string;
    }>>([]);
    const [currentTestId, setCurrentTestId] = useState<number | null>(null);
    const [latestResultCache, setLatestResultCache] = useState<Record<number, any>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [showTestView, setShowTestView] = useState(false);
    const [selectedAnswers, setSelectedAnswers] = useState<Map<number, number | string>>(new Map());
    const [viewAllQuestions, setViewAllQuestions] = useState(false);
    const [testStartTime, setTestStartTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    const [questionSlideDirection, setQuestionSlideDirection] = useState<'left' | 'right' | null>(null);
    const [isQuestionTransitioning, setIsQuestionTransitioning] = useState(false);
    const [previousSlideDirection, setPreviousSlideDirection] = useState<'left' | 'right' | null>(null);
    const [showReviewTest, setShowReviewTest] = useState(false);
    const [testScore, setTestScore] = useState({ correct: 0, total: 0 });
    // Chatbot states for Review Test
    const [showAiSidebar, setShowAiSidebar] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(600);
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<Array<{ type: 'user' | 'ai', message: string; citations?: Array<{ page: number; excerpt?: string; materialId?: string; materialName?: string }>; correctAnswer?: string }>>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [selectedQuestionForChat, setSelectedQuestionForChat] = useState<number | null>(null);
    const [testMaterialId, setTestMaterialId] = useState<string | null>(null);
    const [testMaterialName, setTestMaterialName] = useState<string | null>(null);
    const [citationMaterialId, setCitationMaterialId] = useState<string | null>(null);
    const [citationPage, setCitationPage] = useState<number | null>(null);
    const [showCitationModal, setShowCitationModal] = useState(false);
    const [citationPdfUrl, setCitationPdfUrl] = useState<string | null>(null);
    const [worldText, setWorldText] = useState<string>('');
    const [worldPage, setWorldPage] = useState<number | null>(null);
    const [worldQuestionIndex, setWorldQuestionIndex] = useState<number | null>(null);

    // Handle start learning
    const handleStartLearning = () => {
        // Reset all view states
        setShowPractice(false);
        setShowCreateTest(false);
        setShowMaterialSelection(false);
        setShowTestTypeSelection(false);
        setShowTestView(false);
        setShowReviewTest(false);
        setShowFlashcards(false);
        setShowStudySetDetail(false);
        setShowMaterialViewer(false);

        // Reload data when starting learning
        if (user?.id) {
            loadStudySets().then(() => {
                if (selectedStudySet?.id) {
                    loadHomeStats(selectedStudySet.id);
                } else if (studySets.length > 0 && studySets[0]?.id) {
                    loadHomeStats(studySets[0].id);
                    setSelectedStudySet(studySets[0]);
                }
            });
        }
        if (selectedStudySet) {
            setShowStudySetDetail(true);
        }
    };

    // Helper: fetch latest result for a test
    const fetchLatestResult = async (testId: number) => {
        const tryOnce = async (userKey: string) => {
            const url = `http://localhost:3001/api/tests/${testId}/results/latest?userId=${encodeURIComponent(userKey)}&ts=${Date.now()}`;
            const res = await fetch(url).catch(() => null as any);
            if (!res || res.status === 204 || !res.ok) return null;
            return await res.json();
        };

        // Retry current-user result a few times (commit delay safety)
        const userKey = String(user?.id || '');
        for (let i = 0; i < 3; i++) {
            const data = await tryOnce(userKey);
            if (data) return data;
            await new Promise(r => setTimeout(r, 200));
        }
        // Fallback to any result
        return await tryOnce('all');
    };

    // Handle view material
    const handleViewMaterial = () => {
        setShowMaterialViewer(true);
    };

    // Handle open material from citation - Open in modal and load world text
    const handleOpenCitation = async (materialId: string | undefined, page: number) => {
        if (!materialId) {
            console.warn('No materialId provided for citation');
            return;
        }

        // Find material in the study set
        const material = materialsInSet.find((m: any) => String(m.id) === String(materialId));
        if (!material) {
            console.warn('Material not found for citation:', materialId);
            // Try to use testMaterialId as fallback
            if (!testMaterialId) return;
            const fallbackMaterial = materialsInSet.find((m: any) => String(m.id) === String(testMaterialId));
            if (!fallbackMaterial || !fallbackMaterial.file_path) return;

            try {
                // Load PDF file for modal
                const fileResp = await fetch(`http://localhost:3001/api/materials/file/${fallbackMaterial.file_path}`);
                if (fileResp.ok) {
                    const blob = await fileResp.blob();
                    const url = URL.createObjectURL(blob);
                    setCitationPdfUrl(url);
                    setCitationPage(page);
                    setCitationMaterialId(testMaterialId);
                    setShowCitationModal(true);
                }

                // Load PDF text for world section
                const textResp = await fetch(`http://localhost:3001/api/materials/text/${fallbackMaterial.file_path}?page=${page}`);
                if (textResp.ok) {
                    const textData = await textResp.json();
                    setWorldText(textData.text || '');
                    setWorldPage(page);
                    // Set the current question index for which world text is loaded
                    setWorldQuestionIndex(selectedQuestionForChat !== null ? selectedQuestionForChat : null);
                }
            } catch (error) {
                console.error('Error loading PDF:', error);
            }
            return;
        }

        if (!material.file_path) {
            console.warn('Material has no file_path');
            return;
        }

        try {
            // Load PDF file for modal
            const fileResp = await fetch(`http://localhost:3001/api/materials/file/${material.file_path}`);
            if (fileResp.ok) {
                const blob = await fileResp.blob();
                const url = URL.createObjectURL(blob);
                setCitationPdfUrl(url);
                setCitationPage(page);
                setCitationMaterialId(materialId);
                setShowCitationModal(true);
            } else {
                console.error('Failed to load PDF file');
            }

            // Load PDF text from specific page for world section
            const textResp = await fetch(`http://localhost:3001/api/materials/text/${material.file_path}?page=${page}`);
            if (textResp.ok) {
                const textData = await textResp.json();
                setWorldText(textData.text || '');
                setWorldPage(page);
                // Set the current question index for which world text is loaded
                setWorldQuestionIndex(selectedQuestionForChat !== null ? selectedQuestionForChat : null);
            } else {
                console.error('Failed to load PDF text');
            }
        } catch (error) {
            console.error('Error loading PDF:', error);
        }
    };

    // Hook: view test handler (moved logic from inline onClick)
    const { handleViewTestClick } = useViewTestHandler({
        latestResultCache,
        setLatestResultCache,
        fetchLatestResult,
        setCurrentTestId,
        setTestQuestions,
        setSelectedAnswers,
        setTestScore,
        setViewAllQuestions,
        setShowTestView,
        setShowReviewTest,
        setCurrentQuestionIndex,
        setTestStartTime,
        setElapsedTime,
    });

    const handleViewFlashcards = () => {
        setShowFlashcards(true);
    };

    const handleBackFromFlashcards = () => {
        setShowFlashcards(false);
        setActiveSection('home'); // Set về home khi quay lại
        // Reload data when going back from flashcards
        if (user?.id) {
            loadStudySets().then(() => {
                if (selectedStudySet?.id) {
                    loadHomeStats(selectedStudySet.id);
                } else if (studySets.length > 0 && studySets[0]?.id) {
                    loadHomeStats(studySets[0].id);
                }
            });
        }
    };

    // Handle generate test from materials
    const handleGenerateTest = async () => {
        try {
            setIsGeneratingTest(true);
            setShowTestTypeSelection(false);

            // Lấy file PDF đầu tiên đã chọn
            const firstId = Array.from(selectedMaterialIds)[0];
            const material = materialsInSet.find((m: any) => String(m.id) === String(firstId));
            if (!material || !material.file_path) {
                alert('Không tìm thấy file tài liệu đã chọn.');
                setIsGeneratingTest(false);
                return;
            }

            // Lưu thông tin material để sử dụng cho citations
            setTestMaterialId(material.id);
            setTestMaterialName(material.name || 'Tài liệu');

            // Tải file PDF
            const fileResp = await fetch(`http://localhost:3001/api/materials/file/${material.file_path}`);
            if (!fileResp.ok) {
                alert('Không tải được file tài liệu.');
                setIsGeneratingTest(false);
                return;
            }
            const blob = await fileResp.blob();

            // Gửi request đến Flask để tạo câu hỏi (bắt đầu với trắc nghiệm)
            const form = new FormData();
            form.append('document', new File([blob], material.name || 'document.pdf', { type: blob.type || 'application/pdf' }));
            form.append('requests', JSON.stringify({
                multiple_choice: testTypeCounts.multipleChoice || 0,
                short_answer: testTypeCounts.shortAnswer || 0,
                free_response: testTypeCounts.freeResponse || 0,
                true_false: testTypeCounts.trueFalse || 0,
                fill_blank: testTypeCounts.fillBlank || 0,
            }));

            const flaskUrl = (process.env.REACT_APP_FLASK_URL || 'http://localhost:5050') + '/api/generate';
            const genResp = await fetch(flaskUrl, { method: 'POST', body: form });

            if (!genResp.ok) {
                const errText = await genResp.text().catch(() => '');
                alert('AI tạo câu hỏi thất bại: ' + (errText || ('HTTP ' + genResp.status)));
                setIsGeneratingTest(false);
                return;
            }

            const genData = await genResp.json();

            // Xử lý response và chuyển đổi thành test questions
            const questions: Array<{
                id: string;
                type: string;
                question: string;
                options?: string[];
                correctAnswer?: number | string;
            }> = [];

            // Xử lý Multiple Choice
            const mc = Array.isArray(genData.multiple_choice) ? genData.multiple_choice : [];
            mc.forEach((item: any, index: number) => {
                const options = Array.isArray(item.options) ? item.options : [];
                const correctAnswer = String(item.correct_answer || '');
                let correctIndex = options.findIndex((opt: string) =>
                    String(opt).trim().toLowerCase() === correctAnswer.trim().toLowerCase()
                );
                if (correctIndex === -1) {
                    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                    const labelIndex = labels.findIndex(l => l === correctAnswer.trim().toUpperCase());
                    if (labelIndex >= 0 && labelIndex < options.length) {
                        correctIndex = labelIndex;
                    } else {
                        const numIndex = parseInt(correctAnswer);
                        if (!isNaN(numIndex) && numIndex >= 0 && numIndex < options.length) {
                            correctIndex = numIndex;
                        }
                    }
                }
                if (correctIndex === -1 && options.length > 0) {
                    correctIndex = 0;
                }

                questions.push({
                    id: `mc_${index}`,
                    type: 'multipleChoice',
                    question: String(item.question || ''),
                    options: options,
                    correctAnswer: correctIndex
                });
            });

            // Xử lý Short Answer
            const sa = Array.isArray(genData.short_answer) ? genData.short_answer : [];
            sa.forEach((item: any, index: number) => {
                questions.push({
                    id: `sa_${index}`,
                    type: 'shortAnswer',
                    question: String(item.question || ''),
                    correctAnswer: String(item.answer || item.correct_answer || '')
                });
            });

            // Xử lý Free Response (FRQ)
            const fr = Array.isArray(genData.free_response) ? genData.free_response : [];
            fr.forEach((item: any, index: number) => {
                questions.push({
                    id: `fr_${index}`,
                    type: 'freeResponse',
                    question: String(item.question || ''),
                    correctAnswer: String(item.answer || item.correct_answer || '')
                });
            });

            // Bỏ True/False hoàn toàn theo yêu cầu

            // Xử lý Fill in the Blank
            const fb = Array.isArray(genData.fill_blank) ? genData.fill_blank : [];
            fb.forEach((item: any, index: number) => {
                questions.push({
                    id: `fb_${index}`,
                    type: 'fillBlank',
                    question: String(item.question || ''),
                    correctAnswer: String(item.answer || item.correct_answer || '')
                });
            });

            // Lưu test vào database
            try {
                const studySetId = selectedStudySet?.id || (studySets.length > 0 ? studySets[0].id : null);
                if (!studySetId || !user?.id) {
                    throw new Error('Missing studySetId or userId');
                }

                const testName = `Bài kiểm tra ${selectedStudySet?.name || 'Test'} - ${new Date().toLocaleDateString('vi-VN')}`;
                const materialIds = Array.from(selectedMaterialIds).map(id => parseInt(String(id))).filter(id => !isNaN(id));

                const saveResponse = await fetch('http://localhost:3001/api/tests', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        studySetId: studySetId,
                        userId: user.id,
                        name: testName,
                        description: `Bài kiểm tra được tạo từ ${materialIds.length} tài liệu`,
                        questions: questions.map((q, idx) => ({
                            type: q.type,
                            question: q.question,
                            options: q.options || null,
                            correctAnswer: q.correctAnswer,
                            position: idx
                        })),
                        materialIds: materialIds,
                        timeLimit: null
                    }),
                });

                if (!saveResponse.ok) {
                    const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
                    console.error('Failed to save test:', errorData);
                    // Vẫn tiếp tục hiển thị test dù không lưu được
                } else {
                    const savedTest = await saveResponse.json();
                    console.log('Test saved successfully:', savedTest.id);
                    // Reload saved tests list
                    await loadSavedTests();
                    // Also reload home stats to update test count
                    if (selectedStudySet?.id) {
                        await loadHomeStats(selectedStudySet.id);
                    }
                }
            } catch (saveError) {
                console.error('Error saving test to database:', saveError);
                // Vẫn tiếp tục hiển thị test dù không lưu được
            }

            setTestQuestions(questions);
            setCurrentQuestionIndex(0);
            setSelectedAnswers(new Map());
            setTestStartTime(new Date());
            setElapsedTime(0);
            setIsGeneratingTest(false);
            setShowTestView(true);
            navigate('/dashboard/test');
        } catch (error) {
            console.error('Error generating test:', error);
            alert('Có lỗi xảy ra khi tạo bài kiểm tra');
            setIsGeneratingTest(false);
        }
    };

    // Load study sets from database
    const loadStudySets = async (): Promise<Array<{ id: string, name: string, description: string, createdAt: string }>> => {
        try {
            const response = await fetch(`http://localhost:3001/api/study-sets?userId=${user?.id || '0'}`);
            if (response.ok) {
                const data = await response.json();
                setStudySets(data);
                // Auto-select first study set if available
                if (data.length > 0 && !selectedStudySet) {
                    setSelectedStudySet(data[0]);
                }
                return data;
            }
            return [];
        } catch (error) {
            console.error('Error loading study sets:', error);
            return [];
        }
    };

    // Load materials for study set
    const loadMaterialsForStudySet = async (studySetId: string) => {
        try {
            setIsLoadingMaterials(true);
            const res = await fetch(`http://localhost:3001/api/materials/${studySetId}`);
            const data = res.ok ? await res.json() : [];
            setMaterialsInSet(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to load materials for study set', e);
            setMaterialsInSet([]);
        } finally {
            setIsLoadingMaterials(false);
        }
    };

    // Load home stats (materials, tests, flashcards, videos counts)
    const loadHomeStats = async (studySetId: string | number | null) => {
        if (!studySetId) {
            setHomeStats({ materialsCount: 0, testsCount: 0, flashcardsCount: 0, explainersCount: 0 });
            setRecentMaterials([]);
            return;
        }

        try {
            // Load materials
            const materialsRes = await fetch(`http://localhost:3001/api/materials/${studySetId}`);
            const materialsData = materialsRes.ok ? await materialsRes.json() : [];
            const materialsCount = Array.isArray(materialsData) ? materialsData.length : 0;

            // Get recent materials (last 3)
            const recent = Array.isArray(materialsData)
                ? materialsData.sort((a: any, b: any) => {
                    const dateA = new Date(a.created_at || 0);
                    const dateB = new Date(b.created_at || 0);
                    return dateB.getTime() - dateA.getTime();
                }).slice(0, 3)
                : [];
            setRecentMaterials(recent);

            // Load tests count
            const testsRes = await fetch(`http://localhost:3001/api/tests/study-set/${studySetId}`);
            const testsData = testsRes.ok ? await testsRes.json() : [];
            const testsCount = Array.isArray(testsData) ? testsData.length : 0;

            // Load flashcard sets count
            const flashcardSetsRes = await fetch('http://localhost:3001/api/flashcard-sets');
            const allFlashcardSets = flashcardSetsRes.ok ? await flashcardSetsRes.json() : [];
            const flashcardsCount = Array.isArray(allFlashcardSets)
                ? allFlashcardSets.filter((s: any) => String(s.study_set_id) === String(studySetId)).length
                : 0;

            // Load videos count (explainers)
            let explainersCount = 0;
            if (user?.id) {
                try {
                    const videosRes = await fetch(`http://localhost:3001/api/videos?userId=${user.id}&studySetId=${studySetId}`);
                    if (videosRes.ok) {
                        const videosData = await videosRes.json();
                        explainersCount = Array.isArray(videosData) ? videosData.length : 0;
                    }
                } catch (videosError) {
                    console.error('Error loading videos count:', videosError);
                }
            }

            setHomeStats({ materialsCount, testsCount, flashcardsCount, explainersCount });
        } catch (error) {
            console.error('Error loading home stats:', error);
            setHomeStats({ materialsCount: 0, testsCount: 0, flashcardsCount: 0, explainersCount: 0 });
            setRecentMaterials([]);
        }
    };

    // Load saved tests for Practice view
    const loadSavedTests = async () => {
        if (!selectedStudySet?.id) {
            setSavedTests([]);
            return;
        }

        setIsLoadingTests(true);
        try {
            const response = await fetch(`http://localhost:3001/api/tests/study-set/${selectedStudySet.id}`);
            if (response.ok) {
                const tests = await response.json();
                setSavedTests(Array.isArray(tests) ? tests : []);
            } else {
                console.error('Failed to load tests:', response.status);
                setSavedTests([]);
            }
        } catch (error) {
            console.error('Error loading saved tests:', error);
            setSavedTests([]);
        } finally {
            setIsLoadingTests(false);
        }
    };

    // Load materials when material selection view is shown
    useEffect(() => {
        if (showMaterialSelection) {
            const currentStudySetId = selectedStudySet?.id || (studySets.length > 0 ? studySets[0].id : null);
            if (currentStudySetId) {
                loadMaterialsForStudySet(currentStudySetId);
            }
        }
    }, [showMaterialSelection, selectedStudySet, studySets]);

    // Add new study set
    const addStudySet = async () => {
        if (!newSetName.trim()) {
            alert('Vui lòng nhập tên study set');
            return;
        }

        try {
            console.log('Creating study set with user:', user);
            console.log('User ID:', user?.id);

            // Check if server is reachable first (with timeout)
            const healthController = new AbortController();
            const healthTimeout = setTimeout(() => healthController.abort(), 3000);
            try {
                const healthCheck = await fetch('http://localhost:3001/api/health', {
                    method: 'GET',
                    signal: healthController.signal
                });
                clearTimeout(healthTimeout);
                if (!healthCheck.ok) {
                    throw new Error('Server health check failed');
                }
            } catch (healthError: any) {
                clearTimeout(healthTimeout);
                console.error('Server health check failed:', healthError);
                if (healthError.name === 'AbortError') {
                    toast.error('Server không phản hồi. Vui lòng đảm bảo server Node.js đang chạy trên port 3001.');
                } else {
                    toast.error('Không thể kết nối đến server. Vui lòng đảm bảo server Node.js đang chạy trên port 3001.');
                }
                return;
            }

            // Create request with timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
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
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (response.ok) {
                const newSet = await response.json();
                console.log('✅ Study set created successfully:', newSet);

                // Ensure newSet has all required fields for consistency
                const formattedSet = {
                    id: String(newSet.id || newSet.lastID),
                    name: newSet.name,
                    description: newSet.description || '',
                    createdAt: newSet.createdAt || newSet.created_at || new Date().toISOString(),
                    user_id: newSet.userId || newSet.user_id,
                    status: newSet.status || 'active',
                    color: newSet.color || '#3b82f6',
                    icon: newSet.icon || 'book'
                };

                setStudySets(prev => [...prev, formattedSet]);
                setSelectedStudySet(formattedSet); // Auto-select the new study set
                setNewSetName('');
                setNewSetDescription('');
                setShowAddSetModal(false);
                setShowStudySetDetail(true);
                // Reload study sets to ensure we have the latest data
                await loadStudySets();
                // Reload home stats
                if (newSet.id) {
                    await loadHomeStats(newSet.id);
                }
                toast.success('Đã tạo study set thành công!');
            } else {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText || `HTTP ${response.status}` };
                }
                console.error('API Error:', errorData);
                console.error('Response status:', response.status);
                console.error('Response text:', errorText);
                toast.error('Có lỗi xảy ra khi tạo study set: ' + (errorData.error || `HTTP ${response.status}`));
            }
        } catch (error: any) {
            console.error('Error adding study set:', error);
            console.error('Error details:', error.message, error.stack);

            // Check if it's a network error
            if (error.name === 'AbortError') {
                toast.error('Request timeout. Server không phản hồi kịp thời.');
            } else if (error.message && error.message.includes('Failed to fetch')) {
                toast.error('Không thể kết nối đến server. Vui lòng đảm bảo server Node.js đang chạy trên port 3001.');
            } else {
                toast.error('Có lỗi xảy ra khi tạo study set: ' + (error.message || 'Unknown error'));
            }
        }
    };

    // Load study sets on component mount and when user changes
    React.useEffect(() => {
        if (user?.id) {
            loadStudySets();
        }
    }, [user?.id]);

    // Cảnh báo khi rời trang nếu đang làm bài và còn câu chưa trả lời
    React.useEffect(() => {
        const beforeUnload = (e: BeforeUnloadEvent) => {
            if (showTestView) {
                for (let i = 0; i < testQuestions.length; i++) {
                    if (!selectedAnswers.has(i)) {
                        e.preventDefault();
                        e.returnValue = '';
                        return '';
                    }
                }
            }
            return undefined as any;
        };
        window.addEventListener('beforeunload', beforeUnload);
        return () => window.removeEventListener('beforeunload', beforeUnload);
    }, [showTestView, testQuestions, selectedAnswers]);

    // Load saved tests when Practice view is shown or selectedStudySet changes
    React.useEffect(() => {
        if (showPractice && selectedStudySet?.id) {
            loadSavedTests();
        }
    }, [showPractice, selectedStudySet?.id]);

    // Handle game play URL routing
    React.useEffect(() => {
        const path = location.pathname;
        const gameMatch = path.match(/\/dashboard\/arcade\/game\/(\d+)/);

        if (gameMatch) {
            const gameId = parseInt(gameMatch[1], 10);
            setCurrentGameId(gameId);
            setShowGamePlay(true);
            setShowArcade(false);
        } else if (path === '/dashboard/arcade') {
            setShowArcade(true);
            setShowGamePlay(false);
            setCurrentGameId(null);
        } else if (!path.includes('/arcade')) {
            setShowGamePlay(false);
            setCurrentGameId(null);
        }
    }, [location.pathname]);

    // Load home stats when selected study set changes or when study sets are loaded
    React.useEffect(() => {
        if (selectedStudySet?.id) {
            loadHomeStats(selectedStudySet.id);
        } else if (studySets.length > 0 && studySets[0]?.id) {
            // If no study set selected but we have study sets, load stats for first one
            loadHomeStats(studySets[0].id);
        } else {
            loadHomeStats(null);
        }
    }, [selectedStudySet?.id, studySets.length]);

    // Reload data when location changes back to dashboard
    useEffect(() => {
        if (location.pathname === '/dashboard' && user?.id) {
            // Reload everything when coming back to dashboard
            loadStudySets();
        }
    }, [location.pathname, user?.id]);

    // Timer for test
    useEffect(() => {
        if (showTestView && testStartTime) {
            const interval = setInterval(() => {
                const now = new Date();
                const elapsed = Math.floor((now.getTime() - testStartTime.getTime()) / 1000);
                setElapsedTime(elapsed);
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [showTestView, testStartTime]);

    // Format time as MM:SS or HH:MM:SS
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Remove redundant labels (A. B. C. D.) from option text
    const cleanOptionText = (text: string): string => {
        // Remove patterns like "A. ", "B. ", "C. ", "D. " at the start of text
        return text.replace(/^[A-F]\.\s*/i, '').trim();
    };

    // Handle navigation to next question with animation
    const handleNextQuestion = () => {
        if (currentQuestionIndex < testQuestions.length - 1 && !isQuestionTransitioning) {
            setIsQuestionTransitioning(true);
            setQuestionSlideDirection('left');
            setTimeout(() => {
                setPreviousSlideDirection('left');
                setCurrentQuestionIndex(prev => prev + 1);
                // Reset after animation completes
                setTimeout(() => {
                    setQuestionSlideDirection(null);
                    setIsQuestionTransitioning(false);
                }, 50);
            }, 500);
        }
    };

    // Handle navigation to previous question with animation
    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0 && !isQuestionTransitioning) {
            setIsQuestionTransitioning(true);
            setQuestionSlideDirection('right');
            setTimeout(() => {
                setPreviousSlideDirection('right');
                setCurrentQuestionIndex(prev => prev - 1);
                // Reset after animation completes
                setTimeout(() => {
                    setQuestionSlideDirection(null);
                    setIsQuestionTransitioning(false);
                }, 50);
            }, 500);
        }
    };

    // Animate new question sliding in after old question slides out
    useEffect(() => {
        if (!isQuestionTransitioning && previousSlideDirection) {
            // Component with new key just mounted with initial position
            // Wait a bit then animate it to center position for smoother transition
            const timer = setTimeout(() => {
                setPreviousSlideDirection(null);
            }, 20);
            return () => clearTimeout(timer);
        }
    }, [currentQuestionIndex, isQuestionTransitioning, previousSlideDirection]);

    // Calculate test score
    const calculateTestScore = () => {
        let correct = 0;
        testQuestions.forEach((question, index) => {
            const selectedAns = selectedAnswers.get(index);
            if (question.type === 'fillBlank') {
                const correctText = String(question.correctAnswer || '').trim().toLowerCase();
                const userText = String(selectedAns ?? '').trim().toLowerCase();
                if (correctText && userText && correctText === userText) correct++;
            } else {
                let correctAns: number | undefined;
                if (typeof question.correctAnswer === 'number') {
                    correctAns = question.correctAnswer;
                } else if (question.correctAnswer !== undefined) {
                    // Try to find the index of correct answer in options
                    const correctText = String(question.correctAnswer);
                    correctAns = question.options?.findIndex(opt => cleanOptionText(opt).toLowerCase() === correctText.toLowerCase());
                }
                if (selectedAns !== undefined && correctAns !== undefined && selectedAns === correctAns) {
                    correct++;
                }
            }
        });
        return { correct, total: testQuestions.length };
    };

    // Handle test submission
    const handleSubmitTest = async () => {
        const score = calculateTestScore();
        setTestScore(score);
        // Persist latest result
        if (currentTestId && user?.id) {
            try {
                const answersObj: Record<number, number | string> = {};
                selectedAnswers.forEach((val, key) => { answersObj[key] = val; });
                const timeTaken = testStartTime ? Math.floor((Date.now() - testStartTime.getTime()) / 1000) : null;
                await fetch(`http://localhost:3001/api/tests/${currentTestId}/results`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        score: (score.correct / score.total) * 100,
                        totalQuestions: score.total,
                        correctAnswers: score.correct,
                        timeTaken,
                        answers: answersObj
                    })
                }).catch(() => { });
                const latest = await fetchLatestResult(currentTestId);
                setLatestResultCache(prev => ({ ...prev, [currentTestId]: latest }));
            } catch (e) {
                console.error('Failed to save test result', e);
            }
        }
        setShowTestView(false);
        setShowReviewTest(true);
        navigate('/dashboard/review-test');
    };

    // Sync URL with current view and reload data when navigating back
    useEffect(() => {
        const path = location.pathname;

        // When navigating back to main dashboard, reload data
        if (path === '/dashboard' || path === '/dashboard/') {
            // Reload study sets and stats when returning to dashboard
            if (user?.id) {
                loadStudySets().then(() => {
                    // After study sets loaded, reload stats
                    if (selectedStudySet?.id) {
                        loadHomeStats(selectedStudySet.id);
                    } else if (studySets.length > 0 && studySets[0]?.id) {
                        loadHomeStats(studySets[0].id);
                    }
                });
            }
            return;
        }

        // Reset all states first
        setShowPractice(false);
        setShowCreateTest(false);
        setShowMaterialSelection(false);
        setShowTestTypeSelection(false);
        setShowTestView(false);
        setShowReviewTest(false);
        setShowExplainerVideo(false);
        setShowExplainerVideoGenerating(false);

        // Set states based on URL
        const ready = (location.state as any)?.ready === true;
        if (path === '/dashboard/practice' || path.startsWith('/dashboard/practice')) {
            console.log('Route match: practice -> setShowPractice(true)', { path });
            setShowPractice(true);
        } else if (path === '/dashboard/create-test' || path.startsWith('/dashboard/create-test')) {
            console.log('Route match: create-test -> setShowCreateTest(true)', { path });
            setShowCreateTest(true);
        } else if (path === '/dashboard/material-selection' || path.startsWith('/dashboard/material-selection')) {
            console.log('Route match: material-selection -> setShowMaterialSelection(true)', { path });
            setShowMaterialSelection(true);
        } else if (path === '/dashboard/test-type-selection' || path.startsWith('/dashboard/test-type-selection')) {
            console.log('Route match: test-type-selection -> setShowTestTypeSelection(true)', { path });
            setShowTestTypeSelection(true);
        } else if (path === '/dashboard/test' || path.startsWith('/dashboard/test')) {
            // Chỉ hiển thị test view nếu có test questions
            if (ready || testQuestions.length > 0) {
                console.log('Route match: test -> showTestView', { path, questions: testQuestions.length, ready });
                setShowTestView(true);
            } else {
                // Nếu không có questions, quay về practice (sử dụng setTimeout để tránh vòng lặp)
                console.warn('Route match: test -> redirect to practice (no questions and not ready)', { ready });
                setTimeout(() => navigate('/dashboard/practice'), 0);
            }
        } else if (path === '/dashboard/review-test' || path.startsWith('/dashboard/review-test')) {
            // Chỉ hiển thị review view nếu có test questions và score
            if (ready || (testQuestions.length > 0 && testScore.total > 0)) {
                console.log('Route match: review-test -> showReviewTest', { path, questions: testQuestions.length, total: testScore.total, ready });
                setShowReviewTest(true);
            } else {
                // Nếu không có data, quay về practice (sử dụng setTimeout để tránh vòng lặp)
                console.warn('Route match: review-test -> redirect to practice (missing data and not ready)', { path, questions: testQuestions.length, total: testScore.total, ready });
                setTimeout(() => navigate('/dashboard/practice'), 0);
            }
        } else if (path === '/dashboard/explainers/video/result' || path.startsWith('/dashboard/explainers/video/result')) {
            console.log('Route match: explainers/video/result -> showExplainerVideoResult', { path });
            setShowExplainerVideoResult(true);
            setShowExplainerVideo(false);
            setShowExplainerVideoGenerating(false);
        } else if (path === '/dashboard/explainers/video/generating' || path.startsWith('/dashboard/explainers/video/generating')) {
            console.log('Route match: explainers/video/generating -> showExplainerVideoGenerating', { path });
            setShowExplainerVideoGenerating(true);
            setShowExplainerVideo(false);
            setShowExplainerVideoResult(false);
        } else if (path === '/dashboard/explainers' || path.startsWith('/dashboard/explainers')) {
            console.log('Route match: explainers -> showExplainerVideo', { path });
            setShowExplainerVideo(true);
            setShowExplainerVideoResult(false);
            setShowExplainerVideoGenerating(false);
        }
    }, [location.pathname, navigate]);

    // Send chat message for review test
    const sendReviewChatMessage = async (message?: string) => {
        const messageToSend = message || chatMessage.trim();
        if (!messageToSend || isLoadingChat) return;

        const userMessage = messageToSend.trim();
        if (!message) {
            setChatMessage('');
        }
        setChatHistory(prev => [...prev, { type: 'user', message: userMessage }]);
        setIsLoadingChat(true);

        try {
            const selectedQuestionIndex = selectedQuestionForChat ?? 0;
            const question = testQuestions[selectedQuestionIndex];
            const selectedAns = selectedAnswers.get(selectedQuestionIndex);
            let correctAns: number | undefined;

            if (typeof question.correctAnswer === 'number') {
                correctAns = question.correctAnswer;
            } else if (question.correctAnswer !== undefined) {
                const correctText = String(question.correctAnswer);
                correctAns = question.options?.findIndex(opt => cleanOptionText(opt).toLowerCase() === correctText.toLowerCase());
            }

            const isCorrect = selectedAns !== undefined && correctAns !== undefined && selectedAns === correctAns;

            const testPrompt = `Bạn là AI tutor chuyên giúp học và làm bài kiểm tra tên Huyền Trang. 
            
Thông tin câu hỏi hiện tại:
- Câu hỏi: ${question.question}
- Các đáp án:
${question.options?.map((opt, idx) => `  ${idx + 1}. ${cleanOptionText(opt)}${idx === correctAns ? ' (ĐÁP ÁN ĐÚNG)' : ''}${idx === selectedAns ? ' (ĐÁP ÁN NGƯỜI DÙNG CHỌN)' : ''}`).join('\n')}
- Kết quả: ${isCorrect ? 'ĐÚNG' : 'SAI'}

Câu hỏi của Huyền Trang: ${userMessage}

Hãy trả lời theo format sau:
1. Bắt đầu với "Chào Huyền Trang! 🎉"
2. Nếu câu trả lời đúng, khen ngợi: "Bạn đã trả lời đúng! Tuyệt vời! 🌟"
3. Nếu câu trả lời sai, giải thích tại sao và hướng dẫn đáp án đúng
4. Giải thích chi tiết về câu hỏi và đáp án
5. Đưa ra ví dụ thực tế nếu có thể
6. Kết thúc bằng "Huyền Trang có muốn mình giải thích kỹ hơn phần nào không? 🎉😊"
7. Sử dụng nhiều emoji, tone giáo dục thân thiện, và gọi tên "Huyền Trang" trong câu trả lời.

QUAN TRỌNG: Khi bạn trả lời, hãy chỉ rõ thông tin bạn lấy từ trang nào của tài liệu. Ví dụ: "Theo trang 5 của tài liệu..." hoặc "Thông tin này được đề cập ở trang 3...". Hãy luôn đề cập số trang khi có thể.`;

            const response = await fetch('http://localhost:3001/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: testPrompt,
                    studySetId: selectedStudySet?.id || ''
                })
            });

            if (response.ok) {
                const data = await response.json();

                // Extract citations from response
                let citations: Array<{ page: number; excerpt?: string; materialId?: string; materialName?: string }> = [];

                // Try to get citations from API response first
                if (data.citations && Array.isArray(data.citations) && data.citations.length > 0) {
                    const citationMap = new Map<string, { page: number; excerpt?: string; materialId?: string; materialName?: string }>();

                    data.citations.forEach((cit: any) => {
                        // Try to find material by name if materialName is provided in citation
                        let materialId = testMaterialId;
                        let materialName = testMaterialName;

                        if (cit.materialName || cit.filename) {
                            const fileName = cit.materialName || cit.filename;
                            const foundMaterial = materialsInSet.find((m: any) =>
                                m.name && m.name.toLowerCase().includes(fileName.toLowerCase()) ||
                                fileName.toLowerCase().includes(m.name?.toLowerCase() || '')
                            );
                            if (foundMaterial) {
                                materialId = foundMaterial.id;
                                materialName = foundMaterial.name;
                            }
                        }

                        const page = cit.page || 1;
                        const materialIdStr = materialId || '';
                        // Create unique key: materialId + page
                        const key = `${materialIdStr}-${page}`;

                        // Only add if not already exists (deduplicate)
                        if (!citationMap.has(key)) {
                            citationMap.set(key, {
                                page,
                                excerpt: cit.excerpt,
                                materialId: materialId || undefined,
                                materialName: materialName || undefined
                            });
                        }
                    });

                    citations = Array.from(citationMap.values());
                } else {
                    // Parse citations from response text - support multiple formats
                    // Format 1: "filename.pdf - Trang X" or "filename.pdf - trang X"
                    const filenamePagePattern = /([^\n\r\-]+\.pdf)\s*-\s*[Tt]rang\s+(\d+)/gi;
                    const filenameMatches = Array.from(data.response.matchAll(filenamePagePattern)) as RegExpMatchArray[];

                    // Format 2: Just "Trang X" or "trang X"
                    const pagePattern = /[Tt]rang\s+(\d+)/gi;
                    const pageMatches = Array.from(data.response.matchAll(pagePattern)) as RegExpMatchArray[];

                    // Process filename-based citations
                    const citationMap = new Map<string, { page: number; materialId?: string; materialName?: string }>();

                    filenameMatches.forEach((match) => {
                        const fileName = match[1].trim();
                        const pageNum = parseInt(match[2]);
                        if (!isNaN(pageNum) && pageNum > 0) {
                            // Try to find material matching this filename
                            const foundMaterial = materialsInSet.find((m: any) =>
                                m.name && (
                                    m.name.toLowerCase().includes(fileName.toLowerCase()) ||
                                    fileName.toLowerCase().includes(m.name.toLowerCase())
                                )
                            );

                            const materialId = foundMaterial ? foundMaterial.id : testMaterialId;
                            const materialIdStr = materialId || '';
                            // Create unique key: materialId + page
                            const key = `${materialIdStr}-${pageNum}`;

                            // Only add if not already exists (deduplicate)
                            if (!citationMap.has(key)) {
                                citationMap.set(key, {
                                    page: pageNum,
                                    materialId: materialId || undefined,
                                    materialName: foundMaterial ? foundMaterial.name : fileName
                                });
                            }
                        }
                    });

                    // Process simple page number citations (if no filename found)
                    if (citationMap.size === 0 && testMaterialId) {
                        const pageNumbers = new Set<number>();
                        pageMatches.forEach((match) => {
                            const pageNum = parseInt(match[1]);
                            if (!isNaN(pageNum) && pageNum > 0) {
                                pageNumbers.add(pageNum);
                            }
                        });

                        pageNumbers.forEach(page => {
                            const materialIdStr = testMaterialId || '';
                            const key = `${materialIdStr}-${page}`;
                            // Only add if not already exists (deduplicate)
                            if (!citationMap.has(key)) {
                                citationMap.set(key, {
                                    page,
                                    materialId: testMaterialId,
                                    materialName: testMaterialName || undefined
                                });
                            }
                        });
                    }

                    citations = Array.from(citationMap.values());
                }

                // Final deduplication: Remove any remaining duplicates based on materialId + page
                const finalCitationMap = new Map<string, { page: number; excerpt?: string; materialId?: string; materialName?: string }>();
                citations.forEach(cit => {
                    const materialIdStr = cit.materialId || '';
                    const key = `${materialIdStr}-${cit.page}`;
                    if (!finalCitationMap.has(key)) {
                        finalCitationMap.set(key, cit);
                    }
                });
                citations = Array.from(finalCitationMap.values());

                // Sort citations by page number for better UX
                citations.sort((a, b) => {
                    if (a.materialId !== b.materialId) {
                        const aId = a.materialId || '';
                        const bId = b.materialId || '';
                        return aId.localeCompare(bId);
                    }
                    return a.page - b.page;
                });

                // Get correct answer text for highlighting
                const correctAnswerText = correctAns !== undefined && question.options && question.options[correctAns]
                    ? cleanOptionText(question.options[correctAns])
                    : undefined;

                setChatHistory(prev => [...prev, {
                    type: 'ai',
                    message: data.response,
                    citations: citations.length > 0 ? citations : undefined,
                    correctAnswer: correctAnswerText
                }]);
            } else {
                setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn.' }]);
            }
        } catch (error) {
            console.error('Error sending chat message:', error);
            setChatHistory(prev => [...prev, { type: 'ai', message: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.' }]);
        } finally {
            setIsLoadingChat(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendReviewChatMessage();
        }
    };

    // Render message with markdown support and highlight correct answer
    const renderMessage = (message: string, isUser: boolean = false, correctAnswer?: string) => {
        let html = message;

        // 0. Highlight correct answer FIRST (before other processing to avoid breaking HTML)
        if (!isUser && correctAnswer && correctAnswer.trim()) {
            // Escape special regex characters in correctAnswer
            const escapedAnswer = correctAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Simple approach: find and highlight exact matches (case-insensitive)
            // First, try to match the full answer text
            const fullMatchPattern = new RegExp(`(${escapedAnswer})`, 'gi');
            const parts: string[] = [];
            let lastIndex = 0;
            let match;

            // Reset regex
            fullMatchPattern.lastIndex = 0;

            while ((match = fullMatchPattern.exec(html)) !== null) {
                // Add text before match
                const beforeMatch = html.substring(lastIndex, match.index);
                parts.push(beforeMatch);

                // Check if we're inside an HTML tag (don't highlight inside tags)
                const textBefore = html.substring(0, match.index);
                const lastOpenTag = textBefore.lastIndexOf('<');
                const lastCloseTag = textBefore.lastIndexOf('>');

                // Only highlight if not inside an HTML tag and not already highlighted
                if (lastOpenTag < lastCloseTag || lastOpenTag === -1) {
                    if (!match[0].includes('<mark')) {
                        parts.push(`<mark class="bg-yellow-300 text-yellow-900 px-1.5 py-0.5 rounded font-semibold">${match[1]}</mark>`);
                        lastIndex = fullMatchPattern.lastIndex;
                        continue;
                    }
                }

                // If we can't highlight, just add the original text
                parts.push(match[0]);
                lastIndex = fullMatchPattern.lastIndex;
            }

            // Add remaining text
            if (lastIndex < html.length) {
                parts.push(html.substring(lastIndex));
            }

            // If we made replacements, update html
            if (parts.length > 1) {
                html = parts.join('');
            } else if (parts.length === 0) {
                html = '';
            } else {
                html = parts[0];
            }
        }

        // 1. Replace bold and italic
        if (isUser) {
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
            html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
        } else {
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
            html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>');
        }

        // 2. Replace headings
        html = html.replace(/### (.*?)(?=\n|$)/g, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>');
        html = html.replace(/## (.*?)(?=\n|$)/g, '<h2 class="text-xl font-bold text-gray-900 mt-4 mb-3">$1</h2>');

        // 3. Handle list items: convert lines starting with `• `, `- ` or `* ` into `<li>`
        html = html.replace(/^(\s*)([•\-*])\s(.*?)(?=\n|$)/gm, '$1<li class="ml-4">$3</li>');

        // 4. Wrap consecutive list items in <ul> tags
        html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, '<ul class="list-disc pl-5">$&</ul>');
        html = html.replace(/<ul>\s*<\/ul>/g, ''); // Remove empty ul tags

        // 5. Handle paragraphs and line breaks
        html = html.replace(/\n\n/g, '</p><p>');
        html = html.replace(/(?<!<\/p>)\n(?!<p>|<li>|<h)/g, '<br>');

        return `<div class="space-y-2">${html}</div>`;
    };

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

    const handleNavigation = (itemId: string) => {
        console.log('handleNavigation called with itemId:', itemId);
        // Các section đã được implement
        const implementedSections = ['home', 'admin', 'add-teacher', 'add-student', 'upload-file', 'ai-learning', 'progress', 'assignments'];

        // Nếu đang làm bài và còn câu chưa trả lời, hỏi xác nhận trước khi rời
        if (showTestView) {
            let hasUnanswered = false;
            for (let i = 0; i < testQuestions.length; i++) {
                if (!selectedAnswers.has(i)) { hasUnanswered = true; break; }
            }
            if (hasUnanswered) {
                const ok = window.confirm('Bạn vẫn còn câu chưa trả lời. Bạn có chắc muốn thoát?');
                if (!ok) return;
            }
        }

        if (implementedSections.includes(itemId)) {
            setActiveSection(itemId);
            // Reset tất cả views khi chuyển section
            setShowFlashcards(false);
            setShowMaterialViewer(false);
            setShowStudySetDetail(false);
            setShowPractice(false);
            setShowExplainerVideo(false);
            setShowArcade(false);

            // Đặc biệt cho "Trang chủ": đảm bảo về dashboard chính
            if (itemId === 'home') {
                // Reset tất cả các state liên quan đến test
                setShowReviewTest(false);
                setShowTestView(false);
                setShowCreateTest(false);
                setShowMaterialSelection(false);
                setShowTestTypeSelection(false);
                setTestQuestions([]);
                setCurrentQuestionIndex(0);
                setSelectedAnswers(new Map());
                setViewAllQuestions(false);
                setTestStartTime(null);
                setElapsedTime(0);
                setTestScore({ correct: 0, total: 0 });
                setChatHistory([]);
                setShowAiSidebar(false);
                setSelectedQuestionForChat(null);

                // Reload data from database
                if (user?.id) {
                    loadStudySets().then((reloadedSets) => {
                        // Use the newly loaded study sets
                        const currentStudySetId = selectedStudySet?.id;

                        if (reloadedSets && reloadedSets.length > 0) {
                            // If we had a selected study set, try to find it in reloaded data
                            if (currentStudySetId) {
                                const foundSet = reloadedSets.find((s: any) => String(s.id) === String(currentStudySetId));
                                if (foundSet) {
                                    setSelectedStudySet(foundSet);
                                    loadHomeStats(foundSet.id);
                                } else {
                                    // If old selection not found, use first one
                                    setSelectedStudySet(reloadedSets[0]);
                                    loadHomeStats(reloadedSets[0].id);
                                }
                            } else {
                                // No previous selection, use first one
                                setSelectedStudySet(reloadedSets[0]);
                                loadHomeStats(reloadedSets[0].id);
                            }
                        } else {
                            // No study sets available
                            setSelectedStudySet(null);
                            loadHomeStats(null);
                        }
                    });
                }

                navigate('/dashboard');
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
        } else if (itemId === 'tests') {
            // Xử lý click vào "Tests & QuizFetch"
            setActiveSection(''); // Reset active section
            setShowFlashcards(false);
            setShowMaterialViewer(false);
            setShowStudySetDetail(false);
            setShowPractice(true);
            // Load tests when Practice view is shown
            if (selectedStudySet?.id) {
                loadSavedTests();
            }
            navigate('/dashboard/practice');
        } else if (itemId === 'explainers') {
            // Xử lý click vào "Giải thích"
            console.log('Navigating to explainers page');
            setActiveSection(''); // Reset active section
            setShowFlashcards(false);
            setShowMaterialViewer(false);
            setShowStudySetDetail(false);
            setShowPractice(false);
            setShowArcade(false);
            setShowExplainerVideo(true);
            navigate('/dashboard/explainers');
        } else if (itemId === 'arcade') {
            // Xử lý click vào "Trò chơi"
            console.log('Navigating to arcade page');
            setActiveSection(''); // Reset active section
            setShowFlashcards(false);
            setShowMaterialViewer(false);
            setShowStudySetDetail(false);
            setShowPractice(false);
            setShowExplainerVideo(false);
            setShowArcade(true);
            navigate('/dashboard/arcade');
        } else {
            console.log('Unknown itemId, showing toast:', itemId);
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

        // Gọi logic navigation
        handleNavigation(itemId);
    };

    const renderMaterialSelectionView = () => {
        const currentStudySetId = selectedStudySet?.id || (studySets.length > 0 ? studySets[0].id : null);
        const currentStudySetName = selectedStudySet?.name || (studySets.length > 0 ? studySets[0].name : 'Bộ học');

        return (
            <div className="flex-1 p-8 bg-white min-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Chọn tài liệu</h1>
                        <p className="text-gray-500 mt-2">Chọn tài liệu bạn muốn tạo bài kiểm tra.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => {
                                setShowMaterialSelection(false);
                                setShowCreateTest(true);
                                setSelectedMaterialIds(new Set());
                                setSearchTerm('');
                                navigate('/dashboard/create-test');
                            }}
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                            Quay lại
                        </button>
                        <button
                            onClick={() => {
                                if (selectedMaterialIds.size > 0) {
                                    // Chuyển sang màn hình chọn loại bài kiểm tra
                                    setShowTestTypeSelection(true);
                                    setShowMaterialSelection(false);
                                    navigate('/dashboard/test-type-selection');
                                }
                            }}
                            disabled={selectedMaterialIds.size === 0}
                            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Tiếp tục
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6 flex justify-end">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm tài liệu"
                        className="w-full md:w-96 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Materials Grid */}
                <div className="mt-6">
                    {isLoadingMaterials ? (
                        <div className="py-16 text-center text-gray-500">Đang tải tài liệu...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {/* Upload New Material tile */}
                            <div className="border-2 border-dashed border-gray-200 rounded-xl bg-white p-4 hover:border-gray-300 cursor-pointer flex items-center">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                                    <Plus className="w-6 h-6 text-gray-400" />
                                </div>
                                <div className="font-medium text-gray-800">Tải lên tài liệu mới</div>
                            </div>

                            {/* Materials */}
                            {materialsInSet
                                .filter(m => !searchTerm.trim() || m.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map((m) => {
                                    const selected = selectedMaterialIds.has(String(m.id));
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                const next = new Set(selectedMaterialIds);
                                                const idStr = String(m.id);
                                                if (next.has(idStr)) {
                                                    next.delete(idStr);
                                                } else {
                                                    next.add(idStr);
                                                }
                                                setSelectedMaterialIds(next);
                                            }}
                                            className={`text-left border rounded-xl bg-white p-4 shadow-sm hover:shadow transition flex items-center justify-between ${selected ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                    <img src={(process.env.PUBLIC_URL || '') + '/card.png'} alt="" className="w-5 h-5 object-contain" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 truncate max-w-[260px]" title={m.name}>
                                                        {m.name}
                                                    </div>
                                                    {m.size && (
                                                        <div className="text-xs text-gray-500">
                                                            {(m.size / 1024 / 1024).toFixed(2)} MB
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                                                    }`}
                                            >
                                                {selected && (
                                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}

                            {materialsInSet.length === 0 && !isLoadingMaterials && (
                                <div className="col-span-full text-center text-gray-500 py-16">
                                    Không có tài liệu trong bộ học này.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Advanced section placeholder */}
                <div className="mt-8">
                    <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium">
                        <ChevronRight className="w-5 h-5" />
                        <span>Nâng cao</span>
                    </button>
                </div>
            </div>
        );
    };

    const renderTestTypeSelectionView = () => {
        const clampCount = (num: number) => Math.max(0, Math.min(50, num));
        const totalSelected = testTypeCounts.multipleChoice + testTypeCounts.shortAnswer + testTypeCounts.freeResponse + testTypeCounts.trueFalse + testTypeCounts.fillBlank;

        return (
            <div className="flex-1 p-8 bg-white min-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Chọn loại câu hỏi</h1>
                        <p className="text-gray-500 mt-2">Chọn loại và số lượng câu hỏi cho bài kiểm tra của bạn</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => {
                                setShowTestTypeSelection(false);
                                setShowMaterialSelection(true);
                                navigate('/dashboard/material-selection');
                            }}
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                            Quay lại
                        </button>
                        <button
                            className={`px-5 py-2 rounded-lg transition-colors ${totalSelected > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-200 text-white cursor-not-allowed'}`}
                            disabled={totalSelected === 0 || isGeneratingTest}
                            onClick={async () => {
                                if (totalSelected > 0 && !isGeneratingTest) {
                                    await handleGenerateTest();
                                }
                            }}
                        >
                            Tạo
                        </button>
                    </div>
                </div>

                {/* Test Type Selection Grid */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Multiple Choice */}
                    <div
                        onClick={() => setSelectedTestType('multipleChoice')}
                        className={`bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer ${selectedTestType === 'multipleChoice' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}
                    >
                        <div className="flex items-center space-x-3 text-gray-800">
                            <ListChecks className="w-6 h-6" />
                            <div className="font-medium">Trắc nghiệm</div>
                        </div>
                        <input
                            type="number"
                            min={0}
                            max={50}
                            className="w-20 px-3 py-2 border rounded-lg text-right"
                            value={testTypeCounts.multipleChoice}
                            onChange={(e) => setTestTypeCounts({ ...testTypeCounts, multipleChoice: clampCount(Number(e.target.value)) })}
                            onBlur={(e) => setTestTypeCounts({ ...testTypeCounts, multipleChoice: clampCount(Number(e.target.value)) })}
                            onFocus={() => setSelectedTestType('multipleChoice')}
                        />
                    </div>

                    {/* Short Answer */}
                    <div
                        onClick={() => setSelectedTestType('shortAnswer')}
                        className={`bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer ${selectedTestType === 'shortAnswer' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}
                    >
                        <div className="flex items-center space-x-3 text-gray-800">
                            <FileText className="w-6 h-6" />
                            <div className="font-medium">Câu trả lời ngắn</div>
                        </div>
                        <input
                            type="number"
                            min={0}
                            max={50}
                            className="w-20 px-3 py-2 border rounded-lg text-right"
                            value={testTypeCounts.shortAnswer}
                            onChange={(e) => setTestTypeCounts({ ...testTypeCounts, shortAnswer: clampCount(Number(e.target.value)) })}
                            onBlur={(e) => setTestTypeCounts({ ...testTypeCounts, shortAnswer: clampCount(Number(e.target.value)) })}
                            onFocus={() => setSelectedTestType('shortAnswer')}
                        />
                    </div>

                    {/* Free Response (FRQ) */}
                    <div
                        onClick={() => setSelectedTestType('freeResponse')}
                        className={`bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer ${selectedTestType === 'freeResponse' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}
                    >
                        <div className="flex items-center space-x-3 text-gray-800">
                            <Pencil className="w-6 h-6" />
                            <div className="font-medium">Tự luận (FRQ)</div>
                        </div>
                        <input
                            type="number"
                            min={0}
                            max={50}
                            className="w-20 px-3 py-2 border rounded-lg text-right"
                            value={testTypeCounts.freeResponse}
                            onChange={(e) => setTestTypeCounts({ ...testTypeCounts, freeResponse: clampCount(Number(e.target.value)) })}
                            onBlur={(e) => setTestTypeCounts({ ...testTypeCounts, freeResponse: clampCount(Number(e.target.value)) })}
                            onFocus={() => setSelectedTestType('freeResponse')}
                        />
                    </div>

                    {/* Đã xóa Đúng/Sai theo yêu cầu */}

                    {/* Fill in the Blank */}
                    <div
                        onClick={() => setSelectedTestType('fillBlank')}
                        className={`bg-white border rounded-xl p-4 flex items-center justify-between cursor-pointer ${selectedTestType === 'fillBlank' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}
                    >
                        <div className="flex items-center space-x-3 text-gray-800">
                            <PenTool className="w-6 h-6" />
                            <div className="font-medium">Điền vào chỗ trống</div>
                        </div>
                        <input
                            type="number"
                            min={0}
                            max={50}
                            className="w-20 px-3 py-2 border rounded-lg text-right"
                            value={testTypeCounts.fillBlank}
                            onChange={(e) => setTestTypeCounts({ ...testTypeCounts, fillBlank: clampCount(Number(e.target.value)) })}
                            onBlur={(e) => setTestTypeCounts({ ...testTypeCounts, fillBlank: clampCount(Number(e.target.value)) })}
                            onFocus={() => setSelectedTestType('fillBlank')}
                        />
                    </div>
                </div>

                {/* Example Preview */}
                <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Xem trước ví dụ:</div>
                    {selectedTestType === 'multipleChoice' && (
                        <div className="bg-white border rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-800 mb-3">Cơ quan nào là "nhà máy năng lượng" của tế bào?</div>
                            <div className="space-y-2">
                                {[
                                    { key: 'A', label: 'Nhân tế bào' },
                                    { key: 'B', label: 'Ty thể' },
                                    { key: 'C', label: 'Ribosome' },
                                    { key: 'D', label: 'Lục lạp' },
                                ].map((opt) => (
                                    <label key={opt.key} className="flex items-center justify-between border rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
                                        <div className="flex items-center space-x-3">
                                            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full border text-gray-700">{opt.key}</span>
                                            <span className="text-sm text-gray-800">{opt.label}</span>
                                        </div>
                                        <span className="w-4 h-4 rounded-full border border-gray-300"></span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    {selectedTestType === 'shortAnswer' && (
                        <div className="bg-white border rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-800 mb-2">Câu hỏi: Nước sôi ở nhiệt độ bao nhiêu độ C?</div>
                            <div className="mt-2 text-sm text-gray-600">Trả lời ngắn gọn (1-2 câu): <span className="text-gray-400 italic">100 độ C</span></div>
                        </div>
                    )}
                    {selectedTestType === 'freeResponse' && (
                        <div className="bg-white border rounded-lg p-4">
                            <div className="text-sm text-gray-800"><strong>Câu hỏi:</strong> Hãy giải thích quá trình quang hợp và vai trò của nó đối với sự sống trên Trái Đất.</div>
                            <div className="mt-2 text-xs text-gray-500">Bài làm sẽ được đánh giá dựa trên độ chính xác và tính toàn diện của câu trả lời.</div>
                        </div>
                    )}
                    {/* Preview Đúng/Sai đã xóa */}
                    {selectedTestType === 'fillBlank' && (
                        <div className="bg-white border rounded-lg p-4">
                            <div className="text-sm text-gray-800">Điền từ còn thiếu: Water boils at <strong>_____</strong> °C.</div>
                            <div className="mt-2 text-xs text-gray-500">Đáp án: 100</div>
                        </div>
                    )}
                </div>

                <div className="mt-3 text-xs text-gray-500">Mỗi loại tối đa 50 câu hỏi. Bạn có thể chọn nhiều loại cùng lúc.</div>
            </div>
        );
    };

    const renderLoadingView = () => {
        return (
            <div className="flex-1 flex items-center justify-center bg-white min-h-screen">
                <div className="text-center">
                    <img
                        src="/wait.gif"
                        alt="Loading"
                        className="mx-auto mb-4"
                        style={{ maxWidth: '300px', maxHeight: '300px' }}
                    />
                    <div className="text-xl font-medium text-gray-700">Loading...</div>
                </div>
            </div>
        );
    };

    const renderTestView = () => {
        const currentQuestion = testQuestions[currentQuestionIndex];
        const progress = testQuestions.length > 0 ? ((currentQuestionIndex + 1) / testQuestions.length) * 100 : 0;
        const selectedAnswer = selectedAnswers.get(currentQuestionIndex);
        const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

        // Render single question component
        const renderQuestion = (question: typeof currentQuestion, questionIndex: number, showHeader = true) => {
            const selectedAns = selectedAnswers.get(questionIndex);
            return (
                <div key={question.id} className="mb-12 pb-8">
                    {showHeader && (
                        <>
                            {/* Question Type Header */}
                            <div className="mb-6">
                                {question.type === 'fillBlank' ? (
                                    <>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Điền vào chỗ trống:</h2>
                                        <p className="text-gray-600">Điền từ đúng vào chỗ trống.</p>
                                    </>
                                ) : question.type === 'shortAnswer' ? (
                                    <>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Câu trả lời ngắn:</h2>
                                        <p className="text-gray-600">Viết 1-2 câu trả lời cho câu hỏi dưới đây.</p>
                                    </>
                                ) : question.type === 'trueFalse' ? (
                                    <>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Đúng/Sai:</h2>
                                        <p className="text-gray-600">Chọn Đúng hoặc Sai cho nhận định bên dưới.</p>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Câu hỏi trắc nghiệm:</h2>
                                        <p className="text-gray-600">Chọn đáp án đúng nhất từ các lựa chọn bên dưới.</p>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {/* Question Number and Text */}
                    <div className="mb-6">
                        <div className="text-sm text-gray-500 mb-2">Câu {questionIndex + 1}</div>
                        {question.type === 'fillBlank' ? (
                            <div className="text-xl text-gray-800 leading-relaxed">
                                {(() => {
                                    const parts = String(question.question || '').split('____');
                                    if (parts.length === 1) {
                                        return <p>{question.question}</p>;
                                    }
                                    return (
                                        <p>
                                            {parts[0]}
                                            <input
                                                type="text"
                                                placeholder="Nhập đáp án"
                                                value={typeof selectedAns === 'string' ? selectedAns : ''}
                                                onChange={(e) => {
                                                    const text = e.target.value;
                                                    const newAnswers = new Map(selectedAnswers);
                                                    if (text && text.trim() !== '') newAnswers.set(questionIndex, text);
                                                    else newAnswers.delete(questionIndex);
                                                    setSelectedAnswers(newAnswers);
                                                }}
                                                className="mx-2 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                style={{ minWidth: 160 }}
                                            />
                                            {parts.slice(1).join('')}
                                        </p>
                                    );
                                })()}
                            </div>
                        ) : question.type === 'shortAnswer' ? (
                            <div className="text-xl text-gray-800 leading-relaxed">
                                <p className="mb-4">{question.question}</p>
                                <textarea
                                    placeholder="Nhập câu trả lời của bạn"
                                    value={typeof selectedAns === 'string' ? selectedAns : ''}
                                    onChange={(e) => {
                                        const text = e.target.value;
                                        const newAnswers = new Map(selectedAnswers);
                                        if (text && text.trim() !== '') newAnswers.set(questionIndex, text);
                                        else newAnswers.delete(questionIndex);
                                        setSelectedAnswers(newAnswers);
                                    }}
                                    className="w-full min-h-[120px] px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        ) : (
                            <p className="text-xl text-gray-800 leading-relaxed">{question.question}</p>
                        )}
                    </div>

                    {/* Answer Options */}
                    {question.type !== 'fillBlank' && (
                        <div className="space-y-4">
                            {question.options?.map((option, index) => {
                                const isSelected = selectedAns === index;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            const newAnswers = new Map(selectedAnswers);
                                            newAnswers.set(questionIndex, index);
                                            setSelectedAnswers(newAnswers);
                                        }}
                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${isSelected
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${isSelected
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {labels[index] || String(index + 1)}
                                            </div>
                                            <span className="flex-1 text-gray-800">{cleanOptionText(option)}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        };

        const hasUnanswered = () => {
            for (let i = 0; i < testQuestions.length; i++) {
                if (!selectedAnswers.has(i)) return true;
            }
            return false;
        };

        const confirmLeaveIfUnfinished = (): boolean => {
            if (hasUnanswered()) {
                return window.confirm('Bạn vẫn còn câu chưa trả lời. Bạn có chắc muốn thoát?');
            }
            return true;
        };

        return (
            <div className="flex-1 bg-white min-h-screen flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => {
                                if (!confirmLeaveIfUnfinished()) return;
                                setShowTestView(false);
                                setShowTestTypeSelection(true);
                                setTestQuestions([]);
                                setCurrentQuestionIndex(0);
                                setSelectedAnswers(new Map());
                                setViewAllQuestions(false);
                                setTestStartTime(null);
                                setElapsedTime(0);
                                navigate('/dashboard/test-type-selection');
                            }}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                        >
                            <X className="w-5 h-5" />
                            <span>Thoát</span>
                        </button>
                        <div className="flex-1 mx-8">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-700 font-mono">
                                    {formatTime(elapsedTime)}
                                </span>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                                {currentQuestionIndex + 1}/{testQuestions.length}
                            </span>
                            <button
                                onClick={() => setViewAllQuestions(!viewAllQuestions)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                {viewAllQuestions ? 'Xem một' : 'Xem tất cả'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Question Content */}
                <div className={`max-w-4xl mx-auto px-6 py-12 flex-1 ${viewAllQuestions ? 'overflow-y-auto scrollbar-hover' : ''}`}>
                    {viewAllQuestions ? (
                        // View All Questions Mode
                        <>
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    Tất cả câu hỏi
                                </h2>
                                <p className="text-gray-600">
                                    Chọn đáp án đúng nhất từ các lựa chọn bên dưới cho mỗi câu hỏi.
                                </p>
                            </div>
                            {testQuestions.map((question, index) => renderQuestion(question, index, false))}
                        </>
                    ) : (
                        // Single Question Mode
                        <div className="overflow-hidden relative">
                            <div
                                key={currentQuestionIndex}
                                className={`transition-all duration-500 ease-out ${
                                    // When transitioning out (old question sliding away)
                                    isQuestionTransitioning && questionSlideDirection === 'left'
                                        ? 'transform -translate-x-full opacity-0'
                                        : isQuestionTransitioning && questionSlideDirection === 'right'
                                            ? 'transform translate-x-full opacity-0'
                                            // When transitioning in (new question sliding in from opposite side)
                                            : !isQuestionTransitioning && previousSlideDirection === 'left'
                                                ? 'transform translate-x-full opacity-0'
                                                : !isQuestionTransitioning && previousSlideDirection === 'right'
                                                    ? 'transform -translate-x-full opacity-0'
                                                    // Normal state
                                                    : 'transform translate-x-0 opacity-100'
                                    }`}
                            >
                                {currentQuestion && (
                                    <>
                                        {renderQuestion(currentQuestion, currentQuestionIndex, true)}

                                        {/* Navigation Buttons */}
                                        <div className="flex items-center justify-between pt-8">
                                            <button
                                                onClick={handlePreviousQuestion}
                                                disabled={currentQuestionIndex === 0 || isQuestionTransitioning}
                                                className={`px-6 py-2 rounded-lg font-medium transition-colors ${currentQuestionIndex === 0 || isQuestionTransitioning
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    }`}
                                            >
                                                Quay lại
                                            </button>
                                            {currentQuestionIndex === testQuestions.length - 1 ? (
                                                <button
                                                    onClick={handleSubmitTest}
                                                    disabled={isQuestionTransitioning}
                                                    className="px-6 py-3 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Nộp bài
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleNextQuestion}
                                                    disabled={isQuestionTransitioning}
                                                    className="px-6 py-3 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Câu hỏi tiếp theo
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderReviewTest = () => {
        const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

        // Helper to get correct answer index
        const getCorrectAnswerIndex = (question: typeof testQuestions[0]): number | undefined => {
            if (typeof question.correctAnswer === 'number') {
                return question.correctAnswer;
            } else if (question.correctAnswer !== undefined) {
                const correctText = String(question.correctAnswer);
                return question.options?.findIndex(opt => cleanOptionText(opt).toLowerCase() === correctText.toLowerCase());
            }
            return undefined;
        };

        return (
            <div className="flex-1 bg-white min-h-screen relative">
                {/* Main Content */}
                <div className={`overflow-y-auto scrollbar-hover ${showAiSidebar ? `mr-[${sidebarWidth + 4}px]` : ''}`}
                    style={showAiSidebar ? { marginRight: `${sidebarWidth + 4}px` } : {}}
                >
                    <div className="max-w-4xl mx-auto p-8">
                        {/* Header */}
                        <button
                            onClick={() => {
                                // Go back to Practice
                                setShowReviewTest(false);
                                setShowTestView(false);
                                setShowCreateTest(false);
                                setShowMaterialSelection(false);
                                setShowTestTypeSelection(false);
                                setShowPractice(true);
                                setTestQuestions([]);
                                setSelectedAnswers(new Map());
                                setChatHistory([]);
                                setSelectedQuestionForChat(null);
                                navigate('/dashboard/practice');
                            }}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Quay lại</span>
                        </button>

                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Xem lại bài kiểm tra của bạn</h1>
                        <p className="text-gray-600 mb-8">Xem lại bài kiểm tra và xem bạn đã làm đúng và sai những gì.</p>

                        {/* Score Summary */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8 flex items-center justify-between">
                            <div className="flex items-center space-x-6">
                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                                    <img
                                        src={(process.env.PUBLIC_URL || '') + '/SPARKE.gif'}
                                        alt="Score"
                                        className="w-20 h-20 object-contain"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = (process.env.PUBLIC_URL || '') + '/Tapta.gif';
                                        }}
                                    />
                                </div>
                                <div>
                                    <div className="text-4xl font-bold text-gray-900 mb-1">
                                        {testScore.correct}/{testScore.total}
                                    </div>
                                    <div className="text-gray-600">
                                        Bạn đã làm đúng {testScore.correct} trên tổng số {testScore.total} câu hỏi.
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowReviewTest(false);
                                    setShowTestView(true);
                                    setCurrentQuestionIndex(0);
                                    setSelectedAnswers(new Map());
                                    setChatHistory([]);
                                    setTestStartTime(new Date());
                                    setElapsedTime(0);
                                    navigate('/dashboard/test');
                                }}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                            >
                                <RotateCcw className="w-5 h-5" />
                                <span>Làm lại</span>
                            </button>
                        </div>

                        {/* Questions List */}
                        <div className="space-y-8">
                            {testQuestions.map((question, index) => {
                                const selectedAns = selectedAnswers.get(index);
                                const correctAns = getCorrectAnswerIndex(question);
                                const isCorrect = question.type === 'fillBlank'
                                    ? (String(selectedAns ?? '').trim().toLowerCase() === String(question.correctAnswer ?? '').trim().toLowerCase() && String(question.correctAnswer ?? '') !== '')
                                    : (selectedAns !== undefined && correctAns !== undefined && selectedAns === correctAns);

                                return (
                                    <div key={question.id || index} className="border-b border-gray-200 pb-8 last:border-b-0">
                                        {/* Question Header */}
                                        <div className="mb-4">
                                            <div className="text-sm text-gray-500 mb-2">Câu {index + 1}</div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xl text-gray-800 leading-relaxed">
                                                    {question.question}
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setSelectedQuestionForChat(index);
                                                        if (!showAiSidebar) setShowAiSidebar(true);
                                                    }}
                                                    className="ml-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium whitespace-nowrap"
                                                >
                                                    Chat về câu hỏi này
                                                </button>
                                            </div>
                                        </div>

                                        {/* Answer display */}
                                        {question.type === 'fillBlank' ? (
                                            <div className="space-y-3">
                                                <div className={`p-4 rounded-lg border-2 ${isCorrect ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-500 bg-red-50 text-red-800'}`}>
                                                    <div className="flex items-center flex-wrap gap-2">
                                                        <span>
                                                            {String(question.question || '').split('____')[0]}
                                                        </span>
                                                        <span className={`px-3 py-1 rounded-md ${isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                                            {String(selectedAns ?? '') || '(trống)'}
                                                        </span>
                                                        <span>
                                                            {String(question.question || '').split('____').slice(1).join('')}
                                                        </span>
                                                        {isCorrect ? (
                                                            <CheckCircle2 className="w-5 h-5 text-green-600 ml-2" />
                                                        ) : (
                                                            <X className="w-5 h-5 text-red-600 ml-2" />
                                                        )}
                                                    </div>
                                                </div>
                                                {!isCorrect && (
                                                    <div className="text-sm text-gray-600">
                                                        <div className="font-medium mb-1">Đáp án đúng:</div>
                                                        <div className="inline-block px-3 py-1 rounded bg-gray-100 text-gray-800 border border-gray-300">{String(question.correctAnswer || '')}</div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {question.type === 'shortAnswer' ? (
                                                    <div className={`p-4 rounded-lg border-2 ${isCorrect ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-800'}`}>
                                                        <div className="mb-2 font-medium">Câu trả lời của bạn:</div>
                                                        <div className="whitespace-pre-wrap">{String(selectedAns ?? '(trống)')}</div>
                                                        {typeof question.correctAnswer === 'string' && question.correctAnswer.trim() !== '' && !isCorrect && (
                                                            <div className="mt-3 text-sm text-gray-700">
                                                                <div className="font-medium mb-1">Đáp án tham khảo:</div>
                                                                <div className="inline-block px-3 py-1 rounded bg-gray-100 text-gray-800 border border-gray-300">{question.correctAnswer}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}
                                                {question.options?.map((option, optIndex) => {
                                                    const isSelected = selectedAns === optIndex;
                                                    const isCorrectOption = optIndex === correctAns;

                                                    let bgColor = 'bg-white';
                                                    let borderColor = 'border-gray-200';
                                                    let textColor = 'text-gray-800';
                                                    let icon = null;

                                                    if (isCorrectOption) {
                                                        bgColor = 'bg-green-50';
                                                        borderColor = 'border-green-500';
                                                        textColor = 'text-green-800';
                                                        icon = (
                                                            <div className="absolute top-2 right-2">
                                                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                                                            </div>
                                                        );
                                                    } else if (isSelected && !isCorrect) {
                                                        bgColor = 'bg-red-50';
                                                        borderColor = 'border-red-500';
                                                        textColor = 'text-red-800';
                                                        icon = (
                                                            <div className="absolute top-2 right-2">
                                                                <X className="w-6 h-6 text-red-500" />
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div
                                                            key={optIndex}
                                                            className={`relative p-4 rounded-lg border-2 ${borderColor} ${bgColor} ${textColor}`}
                                                        >
                                                            {icon}
                                                            <div className="flex items-center space-x-4 pr-8">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${isCorrectOption ? 'bg-green-500 text-white' :
                                                                    isSelected && !isCorrect ? 'bg-red-500 text-white' :
                                                                        'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                    {labels[optIndex] || String(optIndex + 1)}
                                                                </div>
                                                                <span className="flex-1">{cleanOptionText(option)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* World Section - PDF Text Display */}
                                        {worldText && worldQuestionIndex === index && (
                                            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        Nội dung từ PDF - Trang {worldPage}
                                                    </h3>
                                                </div>
                                                <div
                                                    className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto scrollbar-hover p-3 bg-white rounded border border-gray-200"
                                                    dangerouslySetInnerHTML={{
                                                        __html: renderMessage(worldText.replace(/\n/g, '<br>'), false, correctAns !== undefined && question.options ? cleanOptionText(question.options[correctAns]) : undefined).replace(/<div class="space-y-2">|<\/div>/g, '')
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Chatbot Sidebar - Same UI as StudyFlashcards - Fixed Position */}
                {showAiSidebar && (
                    <>
                        {/* Divider */}
                        <div
                            className="fixed top-0 right-0 w-1 cursor-col-resize bg-gray-100 hover:bg-blue-200 transition-colors z-30"
                            style={{ height: '100vh', top: `${isCollapsed ? '64px' : '64px'}` }}
                        ></div>

                        <div
                            className="fixed right-0 flex flex-col min-w-0 overflow-hidden rounded-l-xl shadow-xl bg-white/80 backdrop-blur z-30"
                            style={{
                                width: `${sidebarWidth}px`,
                                minWidth: 600,
                                maxWidth: 'none',
                                height: 'calc(100vh - 64px)',
                                top: '64px'
                            }}
                        >
                            {/* Chat Header */}
                            <div className="bg-white/70 px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => setShowAiSidebar(false)} className="p-2 hover:bg-gray-100 rounded-lg active:scale-95 transition">
                                        <X className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm text-gray-600">AI Tutor</span>
                                </div>
                            </div>

                            {/* Chat Content */}
                            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-white/50">
                                {/* Chat Messages */}
                                {chatHistory.length > 0 ? (
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {chatHistory.map((msg, index) => (
                                            <div key={index} className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.type === 'user'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white text-gray-800'
                                                    }`}>
                                                    <div
                                                        className={`text-sm prose prose-sm max-w-none ${msg.type === 'user' ? 'prose-invert [&_*]:!text-white' : ''}`}
                                                        dangerouslySetInnerHTML={{ __html: renderMessage(msg.message, msg.type === 'user', msg.correctAnswer) }}
                                                    />
                                                </div>
                                                {/* Citations */}
                                                {msg.type === 'ai' && msg.citations && msg.citations.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {msg.citations.map((citation, citIndex) => (
                                                            <button
                                                                key={citIndex}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleOpenCitation(citation.materialId, citation.page);
                                                                }}
                                                                className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200 rounded-lg text-blue-700 font-medium transition-all cursor-pointer flex items-center space-x-1 shadow-sm hover:shadow-md"
                                                                title={citation.materialName ? `Click để xem ${citation.materialName} - Trang ${citation.page}` : `Click để xem trang ${citation.page}`}
                                                            >
                                                                <FileText className="w-3 h-3 flex-shrink-0" />
                                                                <span className="whitespace-nowrap">
                                                                    {citation.materialName ? `${citation.materialName} - ` : ''}Trang {citation.page}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {isLoadingChat && (
                                            <div className="flex justify-start">
                                                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-white text-gray-800">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="flex space-x-1">
                                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                        </div>
                                                        <span className="text-sm text-gray-600">AI đang suy nghĩ...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col px-4 pt-6 items-center justify-start">
                                        <div className="mb-4">
                                            <div className="w-28 h-28 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mx-auto mb-3 flex items-center justify-center shadow">
                                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                                                    <img
                                                        src={(process.env.PUBLIC_URL || '') + '/quizzes-icon.webp'}
                                                        alt="Spark.E"
                                                        className="w-20 h-20 object-contain"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Hello, I'm Spark.E</h2>

                                        {/* Current Question Info */}
                                        {selectedQuestionForChat !== null && testQuestions[selectedQuestionForChat] && (
                                            <div className="w-full max-w-md mb-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                <h3 className="text-sm font-semibold text-blue-800 mb-2">📚 Câu hỏi hiện tại: Câu {selectedQuestionForChat + 1}</h3>
                                                <div className="text-sm text-blue-700">
                                                    <p>{testQuestions[selectedQuestionForChat].question}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Suggested prompts */}
                                        <div className="w-full max-w-md space-y-3">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    sendReviewChatMessage('Tại sao đáp án này đúng?');
                                                }}
                                                className="w-full flex items-stretch rounded-2xl overflow-hidden bg-white text-left hover:shadow transition-shadow"
                                            >
                                                <div className="flex-1 px-5 py-4">
                                                    <div className="text-gray-800 font-medium leading-snug">Tại sao đáp án này đúng?</div>
                                                </div>
                                                <div className="w-24 bg-indigo-50 flex items-center justify-center">
                                                    <Lightbulb className="w-6 h-6 text-indigo-400" />
                                                </div>
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    sendReviewChatMessage('Giải thích khái niệm đằng sau câu hỏi này');
                                                }}
                                                className="w-full flex items-stretch rounded-2xl overflow-hidden bg-white text-left hover:shadow transition-shadow"
                                            >
                                                <div className="flex-1 px-5 py-4">
                                                    <div className="text-gray-800 font-medium leading-snug">Giải thích khái niệm<br />đằng sau câu hỏi này</div>
                                                </div>
                                                <div className="w-24 bg-blue-50 flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                    </svg>
                                                </div>
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    sendReviewChatMessage('Hướng dẫn tôi cách giải bài này');
                                                }}
                                                className="w-full flex items-stretch rounded-2xl overflow-hidden bg-white text-left hover:shadow transition-shadow"
                                            >
                                                <div className="flex-1 px-5 py-4">
                                                    <div className="text-gray-800 font-medium leading-snug">Hướng dẫn tôi cách<br />giải bài này</div>
                                                </div>
                                                <div className="w-24 bg-emerald-50 flex items-center justify-center">
                                                    <Book className="w-6 h-6 text-emerald-500" />
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Input Area */}
                            <div className="p-3 md:p-4 bg-white/80 backdrop-blur w-full overflow-hidden sticky bottom-0">
                                <div className="flex items-center w-full">
                                    <div className="flex items-center w-full bg-white rounded-full px-4 py-3 shadow">
                                        <button className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                                            <span className="text-gray-600 text-sm">🖼️</span>
                                        </button>
                                        <input
                                            type="text"
                                            placeholder="Ask your AI tutor anything..."
                                            className="flex-1 min-w-0 bg-transparent outline-none text-sm md:text-base placeholder-gray-400"
                                            value={chatMessage}
                                            onChange={(e) => setChatMessage(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            disabled={isLoadingChat}
                                        />
                                    </div>
                                    <button
                                        className="ml-2 w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0 shadow disabled:opacity-50"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            sendReviewChatMessage();
                                        }}
                                        disabled={isLoadingChat || !chatMessage.trim()}
                                    >
                                        {isLoadingChat ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Floating chat toggle when sidebar hidden */}
                {!showAiSidebar && (
                    <div className="fixed right-4 bottom-8 z-20">
                        <button
                            onClick={() => setShowAiSidebar(true)}
                            className="w-40 h-40 rounded-3xl bg-transparent flex items-center justify-center"
                            title="Open chat"
                        >
                            <img
                                src={(process.env.PUBLIC_URL || '') + '/chatbot.gif'}
                                alt="Chatbot"
                                className="w-full h-full object-contain"
                            />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderCreateTestView = () => {
        return (
            <div className="flex-1 p-8 bg-white min-h-screen">
                {/* Header with buttons */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tạo bài kiểm tra</h1>
                        <p className="text-gray-600">Tạo bài kiểm tra thử từ bộ học của bạn và sẵn sàng cho bài kiểm tra.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => {
                                setShowCreateTest(false);
                                setTestCreationMode(null);
                            }}
                            className="px-6 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={() => {
                                if (testCreationMode === 'materials') {
                                    // Show material selection view
                                    setShowMaterialSelection(true);
                                    setShowCreateTest(false);
                                    navigate('/dashboard/material-selection');
                                } else if (testCreationMode === 'flashcards') {
                                    // Handle flashcards mode here
                                    console.log('Continue with flashcards mode');
                                }
                            }}
                            disabled={!testCreationMode}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${testCreationMode
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Tiếp tục
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-4xl">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Bạn muốn tạo bài kiểm tra như thế nào?</h2>

                    {/* Only From Materials Card */}
                    <div className="grid grid-cols-1 gap-6 mb-8">
                        {/* From Materials Card */}
                        <div
                            onClick={() => setTestCreationMode('materials')}
                            className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${testCreationMode === 'materials'
                                ? 'border-blue-500 bg-blue-50 shadow-lg'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="relative">
                                    <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <FileText className="w-8 h-8 text-blue-600" />
                                    </div>
                                    {/* Checkmarks and pencil overlay */}
                                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                        <Pencil className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Từ tài liệu</h3>
                            <p className="text-gray-600">Tạo bài kiểm tra từ tài liệu trong Bộ học của bạn.</p>
                        </div>
                        {/* Removed Flashcards option by request */}
                    </div>


                </div>

            </div>
        );
    };

    const renderPracticeView = () => {
        // Get all study sets for dropdown
        const practiceMaterials = studySets.length > 0 ? studySets : [];

        return (
            <div className="flex-1 p-8 bg-white min-h-screen">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Thực hành</h1>
                    <p className="text-gray-600">Sẵn sàng cho bài kiểm tra của bạn, đã đến lúc luyện tập!</p>
                </div>

                {/* Choose an Option to Start Studying */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Chọn một tùy chọn để bắt đầu học</h2>
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        {/* Take a Practice Test Card */}
                        <div
                            onClick={() => {
                                setShowCreateTest(true);
                                navigate('/dashboard/create-test');
                            }}
                            className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                                    <Pencil className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Làm bài kiểm tra thử</h3>
                            <p className="text-gray-700">Tạo bài kiểm tra thử từ bộ học của bạn và sẵn sàng cho bài kiểm tra.</p>
                        </div>

                        {/* QuizFetch Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <ClipboardList className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">QuizFetch</h3>
                            <p className="text-gray-700">Tạo quiz từ tài liệu của bạn và học khi trả lời câu hỏi.</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-300 mb-6">
                        <button
                            onClick={() => setPracticeTab('tests')}
                            className={`px-6 py-3 font-medium transition-colors ${practiceTab === 'tests'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Bài kiểm tra
                        </button>
                        <button
                            onClick={() => setPracticeTab('quizfetch')}
                            className={`px-6 py-3 font-medium transition-colors ${practiceTab === 'quizfetch'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            QuizFetch
                        </button>
                    </div>

                    {/* Viewing Tests for Section */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700 font-medium">Đang xem bài kiểm tra cho</span>
                            {practiceMaterials.length > 0 ? (
                                <select
                                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedStudySet?.id || ''}
                                    onChange={(e) => {
                                        const next = studySets.find((s: any) => String(s.id) === String(e.target.value));
                                        if (next) {
                                            setSelectedStudySet(next as any);
                                            loadSavedTests();
                                            loadHomeStats(String(next.id));
                                        }
                                    }}
                                >
                                    {practiceMaterials.map((material) => (
                                        <option key={material.id} value={material.id}>
                                            • {material.name.length > 30 ? material.name.substring(0, 30) + '...' : material.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <select className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option>Chưa có bộ học nào</option>
                                </select>
                            )}
                            <button className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium">
                                Xem tất cả
                            </button>
                        </div>
                        <div className="flex items-center space-x-2 border border-gray-300 rounded-lg px-4 py-2 bg-white">
                            <Search className="w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                className="outline-none text-gray-900 bg-transparent w-48"
                            />
                        </div>
                    </div>

                    {/* Tests Grid - Similar to Flashcards */}
                    {isLoadingTests ? (
                        <div className="bg-white rounded-xl p-12 border-2 border-dashed border-gray-300 text-center">
                            <p className="text-gray-600">Đang tải...</p>
                        </div>
                    ) : savedTests.length > 0 ? (
                        <div className="mb-10">
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">Danh sách bài kiểm tra</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {savedTests.map((test) => {
                                    // Parse material count from description or material_ids
                                    let questionCount = 0;
                                    if (test.description && test.description.includes('tài liệu')) {
                                        // Extract number from description if available
                                        const match = test.description.match(/(\d+)/);
                                        if (match) {
                                            questionCount = parseInt(match[1]);
                                        }
                                    }

                                    return (
                                        <div
                                            key={test.id}
                                            className="border border-gray-200 rounded-xl bg-white p-4 shadow-sm hover:shadow transition cursor-pointer"
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-gray-900 truncate">{test.name}</div>
                                                        {test.description && (
                                                            <div className="text-xs text-gray-500 truncate mt-1">{test.description}</div>
                                                        )}
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            {new Date(test.created_at).toLocaleDateString('vi-VN')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-4">
                                                    <button
                                                        title="Xem"
                                                        onClick={(e) => handleViewTestClick(test, e)}
                                                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        title="Đổi tên"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const newName = window.prompt('Nhập tên mới cho bài kiểm tra', test.name || '');
                                                            if (!newName || newName.trim() === '' || newName === test.name) return;
                                                            try {
                                                                const res = await fetch(`http://localhost:3001/api/tests/${test.id}`, {
                                                                    method: 'PATCH',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ name: newName.trim() })
                                                                });
                                                                if (res.ok) {
                                                                    setSavedTests(prev => prev.map(t => t.id === test.id ? { ...t, name: newName.trim() } : t));
                                                                    toast.success('Đã đổi tên bài kiểm tra');
                                                                } else {
                                                                    toast.error('Đổi tên không thành công');
                                                                }
                                                            } catch {
                                                                toast.error('Đổi tên không thành công');
                                                            }
                                                        }}
                                                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        title="Xóa"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (!window.confirm('Bạn có chắc muốn xóa bài kiểm tra này?')) return;
                                                            try {
                                                                const del = await fetch(`http://localhost:3001/api/tests/${test.id}`, { method: 'DELETE' });
                                                                if (del.ok || del.status === 204) {
                                                                    setSavedTests(prev => prev.filter(t => t.id !== test.id));
                                                                    toast.success('Đã xóa bài kiểm tra');
                                                                    if (selectedStudySet?.id) loadHomeStats(selectedStudySet.id);
                                                                } else {
                                                                    toast.error('Xóa không thành công');
                                                                }
                                                            } catch {
                                                                toast.error('Xóa không thành công');
                                                            }
                                                        }}
                                                        className="p-2 rounded-lg hover:bg-gray-100 text-red-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-12 border-2 border-dashed border-gray-300 text-center">
                            <div className="flex justify-center mb-6">
                                <img
                                    src="/testing.png"
                                    alt="Bài kiểm tra thử"
                                    className="w-32 h-32 object-contain"
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Bài kiểm tra thử</h3>
                            <p className="text-gray-600 mb-6">Sẵn sàng cho bài kiểm tra của bạn, đã đến lúc luyện tập!</p>
                            <button
                                onClick={() => {
                                    setShowCreateTest(true);
                                    navigate('/dashboard/create-test');
                                }}
                                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors font-medium shadow-lg"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Tạo mới</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderMainContent = () => {
        // If admin section, use old DashboardContent logic
        if (user?.role === 'admin' && ['admin', 'add-teacher', 'add-student', 'upload-file', 'ai-learning', 'progress', 'assignments'].includes(activeSection)) {
            return <DashboardContent activeSection={activeSection} />;
        }

        // Show Loading view if generating test
        if (isGeneratingTest) {
            return renderLoadingView();
        }

        // Show Review Test view if test is submitted
        if (showReviewTest && testQuestions.length > 0) {
            return renderReviewTest();
        }

        // Show Test view if test is ready
        if (showTestView && testQuestions.length > 0) {
            return renderTestView();
        }

        // Show Test Type Selection view if requested
        if (showTestTypeSelection) {
            return renderTestTypeSelectionView();
        }

        // Show Material Selection view if requested
        if (showMaterialSelection) {
            return renderMaterialSelectionView();
        }

        // Show Create Test view if requested
        if (showCreateTest) {
            return renderCreateTestView();
        }

        // Show Practice view if requested
        if (showPractice) {
            return renderPracticeView();
        }

        // Show Explainer Video Result page if requested
        if (showExplainerVideoResult) {
            return (
                <ExplainerVideoResultPage
                    onBack={() => {
                        setShowExplainerVideoResult(false);
                        setShowExplainerVideo(true);
                        navigate('/dashboard/explainers?tab=my-videos');
                    }}
                />
            );
        }

        // Show Explainer Video Generating page
        if (showExplainerVideoGenerating) {
            return <ExplainerVideoGenerating />;
        }

        // Show Explainer Video page if requested
        if (showExplainerVideo) {
            return (
                <ExplainerVideoPage
                    studySetId={selectedStudySet?.id}
                    onBack={() => {
                        setShowExplainerVideo(false);
                        setActiveSection('home');
                    }}
                />
            );
        }

        // Show Game Play screen if requested
        if (showGamePlay && currentGameId) {
            // Pass location.state if available (new game), otherwise just pass id
            const gameDataFromState = location.state?.gameData;
            return (
                <MatchGame
                    gameData={gameDataFromState || {
                        id: currentGameId
                    } as any}
                />
            );
        }

        // Show Arcade page if requested
        if (showArcade) {
            return (
                <ArcadePage
                    studySetId={selectedStudySet?.id}
                    onBack={() => {
                        setShowArcade(false);
                        setActiveSection('home');
                    }}
                    isCollapsed={isCollapsed}
                />
            );
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
                        setCitationMaterialId(null);
                        setCitationPage(null);
                        // Reload data when going back
                        if (user?.id) {
                            loadStudySets().then(() => {
                                if (selectedStudySet?.id) {
                                    loadHomeStats(selectedStudySet.id);
                                }
                            });
                        }
                    }}
                    isCollapsed={isCollapsed}
                    initialPage={citationPage || undefined}
                    targetMaterialId={citationMaterialId || undefined}
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
                        // Reload data when going back
                        if (user?.id) {
                            loadStudySets().then((reloadedSets) => {
                                if (reloadedSets && reloadedSets.length > 0) {
                                    const currentId = selectedStudySet?.id;
                                    const foundSet = currentId
                                        ? reloadedSets.find((s: any) => String(s.id) === String(currentId))
                                        : null;
                                    const setToUse = foundSet || reloadedSets[0];
                                    if (setToUse) {
                                        setSelectedStudySet(setToUse);
                                        loadHomeStats(setToUse.id);
                                    }
                                }
                            });
                        }
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
                            studySetId={selectedStudySet?.id}
                            materialsCount={homeStats.materialsCount}
                            testsCount={homeStats.testsCount}
                            flashcardsCount={homeStats.flashcardsCount}
                            explainersCount={homeStats.explainersCount}
                            onStartLearning={handleStartLearning}
                            onFeatureClick={(featureId) => {
                                console.log('onFeatureClick called with featureId:', featureId);
                                handleNavigation(featureId);
                            }}
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
                                {recentMaterials.length > 0 ? (
                                    recentMaterials.map((material) => {
                                        const date = material.created_at
                                            ? new Date(material.created_at).toLocaleDateString('vi-VN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })
                                            : 'Không xác định';
                                        return (
                                            <div key={material.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{material.name || 'Tài liệu không tên'}</p>
                                                    <p className="text-sm text-gray-500">{date}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center text-gray-500 py-4">
                                        <p className="text-sm">Chưa có tài liệu nào</p>
                                    </div>
                                )}
                                {recentMaterials.length > 0 && (
                                    <div className="text-right">
                                        <button
                                            onClick={() => {
                                                if (selectedStudySet) {
                                                    setShowStudySetDetail(true);
                                                    setActiveSection('home');
                                                }
                                            }}
                                            className="text-blue-600 hover:text-blue-700 text-sm"
                                        >
                                            Xem tất cả
                                        </button>
                                    </div>
                                )}
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
                                // và không phải đang ở test/review test/practice
                                isActive = !showFlashcards && !showMaterialViewer && !showStudySetDetail &&
                                    !showReviewTest && !showTestView && !showCreateTest &&
                                    !showMaterialSelection && !showTestTypeSelection && !showPractice &&
                                    !showExplainerVideo && !showExplainerVideoResult && !showExplainerVideoGenerating &&
                                    !showArcade;
                            } else if (item.id === 'flashcards') {
                                // Flashcards active khi: đang xem flashcards
                                isActive = showFlashcards;
                            } else if (item.id === 'tests') {
                                // Tests active khi: đang ở màn test/review test/practice/create test
                                isActive = showReviewTest || showTestView || showCreateTest ||
                                    showMaterialSelection || showTestTypeSelection || showPractice ||
                                    activeSection === 'tests';
                            } else if (item.id === 'explainers') {
                                // Explainers active khi: đang xem explainer video page hoặc result page
                                isActive = showExplainerVideo || showExplainerVideoResult || showExplainerVideoGenerating;
                            } else if (item.id === 'arcade') {
                                // Arcade active khi: đang xem arcade page
                                isActive = showArcade;
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

            {/* Citation PDF Modal */}
            {showCitationModal && citationPdfUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => {
                    setShowCitationModal(false);
                    if (citationPdfUrl) {
                        URL.revokeObjectURL(citationPdfUrl);
                    }
                    setCitationPdfUrl(null);
                }}>
                    <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {materialsInSet.find((m: any) => String(m.id) === String(citationMaterialId))?.name || 'Tài liệu'} - Trang {citationPage}
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowCitationModal(false);
                                    if (citationPdfUrl) {
                                        URL.revokeObjectURL(citationPdfUrl);
                                    }
                                    setCitationPdfUrl(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        {/* PDF Viewer */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                            <div className="flex justify-center">
                                <Document
                                    file={citationPdfUrl}
                                    onLoadSuccess={({ numPages }) => {
                                        if (citationPage && citationPage > 0 && citationPage <= numPages) {
                                            // Scroll to the specific page after PDF loads
                                            setTimeout(() => {
                                                const pageElement = document.querySelector(`[data-page-number="${citationPage}"]`);
                                                if (pageElement) {
                                                    pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                            }, 500);
                                        }
                                    }}
                                    onLoadError={(error) => {
                                        console.error('PDF load error:', error);
                                    }}
                                    loading={
                                        <div className="flex items-center justify-center h-96">
                                            <div className="text-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                                <p className="text-gray-500">Đang tải PDF...</p>
                                            </div>
                                        </div>
                                    }
                                >
                                    <Page
                                        pageNumber={citationPage || 1}
                                        width={Math.min(800, window.innerWidth - 100)}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                        className="shadow-lg"
                                    />
                                </Document>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HybridDashboard;


