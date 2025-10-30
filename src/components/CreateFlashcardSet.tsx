import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share, Upload, User, Link, Plus, Search, FileCog, GraduationCap } from 'lucide-react';
import StudyFlashcardsWrapper from './StudyFlashcardsWrapper';

interface CreateFlashcardSetProps {
    onBack: () => void;
    studySetId: string;
    studySetName: string;
    isCollapsed?: boolean;
}

const CreateFlashcardSet: React.FC<CreateFlashcardSetProps> = ({ onBack, studySetId, studySetName, isCollapsed = false }) => {
    const [selectedOption, setSelectedOption] = useState<string>('');
    const [showScratchEditor, setShowScratchEditor] = useState<boolean>(false);
    const [termText, setTermText] = useState<string>('');
    const [definitionText, setDefinitionText] = useState<string>('');
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [createdCount, setCreatedCount] = useState<number>(0);
    const [flashcardName] = useState<string>(() => `Flashcard ${Math.floor(Math.random() * 1000000)}`);
    const [isReverseEnabled, setIsReverseEnabled] = useState<boolean>(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
    type Card = {
        id: string;
        term: string;
        definition: string;
        termImage?: string;
        definitionImage?: string;
        saved?: boolean;   // đã lưu DB hay chưa
        dbId?: number;     // id trong DB (nếu có)
    };

    const [flashcards, setFlashcards] = useState<Card[]>([]);
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [editTerm, setEditTerm] = useState<string>('');
    const [editDefinition, setEditDefinition] = useState<string>('');
    const [showImageModal, setShowImageModal] = useState<boolean>(false);
    const [imageModalType, setImageModalType] = useState<'term' | 'definition' | null>(null);
    const [showImageSearch, setShowImageSearch] = useState<boolean>(false);
    const [imageSearchTerm, setImageSearchTerm] = useState<string>('');
    const [imageSearchResults, setImageSearchResults] = useState<any[]>([]);
    const [isSearchingImages, setIsSearchingImages] = useState<boolean>(false);
    const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [selectedImage, setSelectedImage] = useState<string>('');
    const [selectedImageType, setSelectedImageType] = useState<'search' | 'upload' | 'url' | null>(null);
    const [termImage, setTermImage] = useState<string>('');
    const [definitionImage, setDefinitionImage] = useState<string>('');
    const [showStudyMode, setShowStudyMode] = useState<boolean>(false);
    const [isLoadingFlashcards, setIsLoadingFlashcards] = useState<boolean>(false);
    // Keep the exact flashcards created in this editor session to study immediately
    const [studyFlashcardsForSession, setStudyFlashcardsForSession] = useState<Array<{ id: string; term: string; definition: string; termImage?: string; definitionImage?: string }>>([]);

    // Load flashcards from database when entering study mode
    const loadFlashcardsFromDB = async () => {
        try {
            setIsLoadingFlashcards(true);
            console.log('Loading flashcards for studySetId:', studySetId);
            const response = await fetch(`http://localhost:3001/api/flashcards/${studySetId}`);
            console.log('Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Raw data from API:', data);

                // Ensure data is an array and has the correct structure
                if (Array.isArray(data)) {
                    const formattedData = data.map(card => ({
                        id: card.id,
                        term: card.front || '',
                        definition: card.back || '',
                        termImage: card.term_image || card.termImage,
                        definitionImage: card.definition_image || card.definitionImage
                    }));

                    console.log('Formatted flashcards:', formattedData);
                    setFlashcards(formattedData);
                } else {
                    console.error('Data is not an array:', data);
                    setFlashcards([]);
                }
            } else {
                console.error('Failed to load flashcards from DB, status:', response.status);
                const errorText = await response.text();
                console.error('Error response:', errorText);
            }
        } catch (error) {
            console.error('Error loading flashcards from DB:', error);
        } finally {
            setIsLoadingFlashcards(false);
        }
    };

    // Load flashcards when entering study mode
    useEffect(() => {
        // Only hit DB if we don't already have the created flashcards for this session
        if (showStudyMode && studyFlashcardsForSession.length === 0) {
            console.log('Loading flashcards from DB because studyFlashcardsForSession is empty');
            loadFlashcardsFromDB();
        } else if (showStudyMode && studyFlashcardsForSession.length > 0) {
            console.log('Using studyFlashcardsForSession:', studyFlashcardsForSession);
        }
    }, [showStudyMode, studySetId, studyFlashcardsForSession.length]);

    const options = [
        {
            id: 'scratch',
            title: 'Bắt đầu từ đầu',
            description: 'Tạo bộ thẻ ghi nhớ từ đầu.',
            icon: 'writing.gif',
            color: 'bg-blue-50 border-blue-200 hover:border-blue-300'
        },
        {
            id: 'material',
            title: 'Tạo từ tài liệu',
            description: 'Tạo bộ thẻ ghi nhớ từ tài liệu trong bộ học hiện tại',
            icon: 'Teaching.gif',
            color: 'bg-green-50 border-green-200 hover:border-green-300'
        }
    ];

    const handleContinue = () => {
        if (!selectedOption) return;
        if (selectedOption === 'scratch') {
            setShowScratchEditor(true);
            return;
        }
        // Các lựa chọn khác có thể được xử lý sau
    };

    const saveFlashcard = async () => {
        if (!termText.trim() || !definitionText.trim() || isSaving) return;

        const currentTerm = termText.trim();
        const currentDefinition = definitionText.trim();

        setIsSaving(true);
        try {
            const res = await fetch('http://localhost:3001/api/flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    front: currentTerm,
                    back: currentDefinition,
                    studySetId: Number(studySetId),
                    materialId: null
                })
            });

            if (!res.ok) throw new Error(await res.text());
            const savedCard = await res.json();

            // chỉ set state MỘT LẦN sau khi lưu thành công
            setFlashcards(prev => [
                ...prev,
                {
                    id: String(savedCard.id),
                    term: currentTerm,
                    definition: currentDefinition,
                    termImage: termImage || '',
                    definitionImage: definitionImage || '',
                    saved: true,
                    dbId: Number(savedCard.id)
                }
            ]);
        } catch (e) {
            console.error(e);
            alert('Lưu thẻ thất bại');
            return;
        } finally {
            setIsSaving(false);
        }

        // dọn form
        setTermText('');
        setDefinitionText('');
        setTermImage('');
        setDefinitionImage('');
        setSelectedImage('');
        setSelectedImageType(null);
        setCreatedCount(c => c + 1);
    };

    const saveAllFlashcards = async (cardsParam?: Card[]) => {
        const cards = cardsParam ?? flashcards;      // ưu tiên mảng được truyền vào
        const toSave = cards.filter(c => !c.saved);

        if (toSave.length === 0) {
            const studyList = cards.map(fc => ({
                id: String(fc.dbId ?? fc.id),
                term: fc.term,
                definition: fc.definition,
                termImage: fc.termImage,
                definitionImage: fc.definitionImage
            }));
            setStudyFlashcardsForSession(studyList);
            return studyList;
        }

        try {
            setIsSaving(true);
            const results = await Promise.all(
                toSave.map(async (fc) => {
                    const res = await fetch('http://localhost:3001/api/flashcards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            front: fc.term,
                            back: fc.definition,
                            studySetId: Number(studySetId),
                            materialId: null
                        })
                    });
                    if (!res.ok) throw new Error(await res.text());
                    const saved = await res.json();
                    return { uiId: fc.id, dbId: Number(saved.id), term: saved.front ?? fc.term, definition: saved.back ?? fc.definition };
                })
            );

            // cập nhật lại mảng gốc (nếu muốn)
            setFlashcards(prev =>
                (cardsParam ?? prev).map(fc => {
                    const hit = results.find(r => r.uiId === fc.id);
                    return hit ? { ...fc, id: String(hit.dbId), dbId: hit.dbId, term: hit.term, definition: hit.definition, saved: true } : fc;
                })
            );

            const studyList = (cardsParam ?? flashcards).map(fc => ({
                id: String(fc.dbId ?? fc.id),
                term: fc.term,
                definition: fc.definition,
                termImage: fc.termImage,
                definitionImage: fc.definitionImage
            }));
            setStudyFlashcardsForSession(studyList);
            return studyList;
        } finally {
            setIsSaving(false);
        }
    };

    const deleteFlashcard = (id: string) => {
        setFlashcards(prev => prev.filter(card => card.id !== id));
    };

    const startEdit = (card: any) => {
        setEditingCardId(card.id);
        setEditTerm(card.term);
        setEditDefinition(card.definition);
    };

    const saveEdit = () => {
        if (editingCardId && editTerm.trim() && editDefinition.trim()) {
            setFlashcards(prev => prev.map(card =>
                card.id === editingCardId
                    ? { ...card, term: editTerm.trim(), definition: editDefinition.trim() }
                    : card
            ));
            setEditingCardId(null);
            setEditTerm('');
            setEditDefinition('');
        }
    };

    const cancelEdit = () => {
        setEditingCardId(null);
        setEditTerm('');
        setEditDefinition('');
    };

    const searchImages = async (query: string) => {
        if (!query.trim()) return;

        setIsSearchingImages(true);
        try {
            const PIXABAY_API_KEY = '52964011-5fc353a36548e7363e6b02445';
            const response = await fetch(
                `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=12&safesearch=true`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch images');
            }

            const data = await response.json();

            // Transform Pixabay response to our format
            const results = data.hits.map((hit: any) => ({
                id: hit.id.toString(),
                url: hit.largeImageURL,
                title: hit.tags || 'Image',
                thumbnail: hit.webformatURL,
                user: hit.user,
                views: hit.views,
                downloads: hit.downloads
            }));

            setImageSearchResults(results);
        } catch (error) {
            console.error('Error searching images:', error);
            // Fallback to empty results on error
            setImageSearchResults([]);
        } finally {
            setIsSearchingImages(false);
        }
    };

    const selectImage = (imageUrl: string, type: 'search' | 'upload' | 'url' = 'search') => {
        setSelectedImage(imageUrl);
        setSelectedImageType(type);
        setShowImageSearch(false);
        setShowUrlInput(false);

        // Auto-confirm the selection
        if (imageModalType) {
            if (imageModalType === 'term') {
                setTermImage(imageUrl);
                console.log('Term image selected:', imageUrl);
            } else if (imageModalType === 'definition') {
                setDefinitionImage(imageUrl);
                console.log('Definition image selected:', imageUrl);
            }
            closeImageModal();
        }

        console.log('Selected image:', imageUrl, 'Type:', type);
    };

    const openImageModal = (type: 'term' | 'definition') => {
        setImageModalType(type);
        setShowImageModal(true);
        setSelectedImage('');
        setSelectedImageType(null);
    };

    const closeImageModal = () => {
        setShowImageModal(false);
        setImageModalType(null);
        setShowImageSearch(false);
        setShowUrlInput(false);
        setSelectedImage('');
        setSelectedImageType(null);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Vui lòng chọn file hình ảnh');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB');
                return;
            }

            // Create object URL for preview
            const imageUrl = URL.createObjectURL(file);
            selectImage(imageUrl, 'upload');
        }
    };

    const handleUrlSubmit = () => {
        if (!imageUrl.trim()) {
            alert('Vui lòng nhập URL hình ảnh');
            return;
        }

        // Basic URL validation
        try {
            new URL(imageUrl);
            selectImage(imageUrl, 'url');
        } catch {
            alert('URL không hợp lệ');
        }
    };

    const removeSelectedImage = () => {
        setSelectedImage('');
        setSelectedImageType(null);
    };


    // Nếu đang ở chế độ học, hiển thị StudyFlashcards
    if (showStudyMode) {
        const toStudy = studyFlashcardsForSession.length > 0 ? studyFlashcardsForSession : flashcards;
        console.log('Entering study mode with flashcards:', toStudy);

        if (isLoadingFlashcards && studyFlashcardsForSession.length === 0) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Đang tải thẻ ghi nhớ...</p>
                    </div>
                </div>
            );
        }

        return (
            <StudyFlashcardsWrapper
                flashcards={toStudy}
                onBack={() => setShowStudyMode(false)}
                isCollapsed={isCollapsed}
                flashcardName={flashcardName}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">

            {/* Flashcard Header - chỉ hiện khi ở editor */}
            {showScratchEditor && (
                <div className={`bg-white fixed top-0 right-0 z-10 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'}`}>
                    <div className="w-full px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={onBack}
                                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                    <span>Quay lại</span>
                                </button>
                                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-yellow-400 rounded-lg flex items-center justify-center">
                                    <img src="/18.gif" alt="Flashcard" className="w-6 h-6 object-contain" />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <h1 className="text-xl font-bold text-gray-900">{flashcardName}</h1>
                                    <button className="p-1 text-gray-400 hover:text-gray-600">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>
                                <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-1">
                                    <Plus className="w-4 h-4" />
                                    <span>New</span>
                                </button>
                                <button className="p-2 text-gray-400 hover:text-gray-600">
                                    <Upload className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-gray-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                    </svg>
                                    <span className="text-sm">Share</span>
                                </button>
                                <button className="px-3 py-2 text-gray-600 hover:bg-gray-50 border border-gray-300 rounded-lg flex items-center space-x-2">
                                    <span className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">i</span>
                                    <span className="text-sm">Feedback</span>
                                </button>
                                <button className="p-2 text-gray-400 hover:text-gray-600">
                                    <Link className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-gray-600">
                                    <Upload className="w-4 h-4" />
                                </button>
                                <div className="relative">
                                    <button className="p-2 text-gray-400 hover:text-gray-600">
                                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">H</div>
                                    </button>
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">1</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content - Scrollable */}
            <div className={`${showScratchEditor ? 'pt-16' : 'pt-0'} flex-1 overflow-y-auto pb-20 transition-all duration-300`}>
                <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col min-h-0">
                    {/* Title Section */}


                    {!showScratchEditor && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">Chọn một tùy chọn *</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {options.map((option) => (
                                    <div
                                        key={option.id}
                                        onClick={() => setSelectedOption(option.id)}
                                        className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${selectedOption === option.id
                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                            : `${option.color} border-gray-200`
                                            }`}
                                    >
                                        <div className="flex items-start space-x-2">
                                            <div className="flex-shrink-0">
                                                {option.id === 'scratch' ? (
                                                    <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
                                                        <img src={`/${option.icon}`} alt={option.title} className="w-full h-full object-contain" />
                                                    </div>
                                                ) : option.id === 'material' ? (
                                                    <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
                                                        <img src={`/${option.icon}`} alt={option.title} className="w-full h-full object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">{option.icon}</div>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <h3 className="text-xl font-bold text-gray-900 mb-1">{option.title}</h3>
                                                <p className="text-gray-600 text-base">{option.description}</p>
                                            </div>
                                            {selectedOption === option.id && (
                                                <div className="absolute top-4 right-4">
                                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {showScratchEditor && (
                        <div className="mb-4">

                            {/* Empty State */}
                            <div className="text-center py-4">
                                <div className="w-32 h-32 mx-auto mb-4">
                                    <img src="/18.gif" alt="Flashcard" className="w-full h-full object-contain" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Thêm thẻ ghi nhớ đầu tiên</h3>
                                <p className="text-gray-600">Thẻ ghi nhớ là cách tuyệt vời để ghi nhớ thông tin.</p>
                            </div>

                            {/* Existing Flashcards */}
                            {flashcards.map((flashcard, index) => (
                                <div key={`${flashcard.dbId ?? flashcard.id}`} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 w-full mb-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Thẻ ghi nhớ {index + 1}</h3>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => startEdit(flashcard)}
                                                className="p-1 text-blue-400 hover:text-blue-600"
                                                title="Chỉnh sửa"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => deleteFlashcard(flashcard.id)}
                                                className="p-1 text-red-400 hover:text-red-600"
                                                title="Xóa"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {editingCardId === flashcard.id ? (
                                        // Edit Mode
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-3">Thuật ngữ</label>
                                                <textarea
                                                    value={editTerm}
                                                    onChange={(e) => setEditTerm(e.target.value)}
                                                    className="w-full h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 text-sm resize-none"
                                                    placeholder="Nhập thuật ngữ..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-3">Định nghĩa</label>
                                                <textarea
                                                    value={editDefinition}
                                                    onChange={(e) => setEditDefinition(e.target.value)}
                                                    className="w-full h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 text-sm resize-none"
                                                    placeholder="Nhập định nghĩa..."
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        // View Mode
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-3">Thuật ngữ</label>
                                                <div className="w-full min-h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 text-sm">
                                                    {flashcard.term}
                                                </div>
                                                {flashcard.termImage && (
                                                    <div className="mt-3 relative group">
                                                        <img
                                                            src={flashcard.termImage}
                                                            alt="Term image"
                                                            className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const updatedFlashcards = flashcards.map(f =>
                                                                    f.id === flashcard.id
                                                                        ? { ...f, termImage: '' }
                                                                        : f
                                                                );
                                                                setFlashcards(updatedFlashcards);
                                                            }}
                                                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-3">Định nghĩa</label>
                                                <div className="w-full min-h-24 rounded-lg border border-gray-200 p-4 bg-purple-50 text-sm">
                                                    {flashcard.definition}
                                                </div>
                                                {flashcard.definitionImage && (
                                                    <div className="mt-3 relative group">
                                                        <img
                                                            src={flashcard.definitionImage}
                                                            alt="Definition image"
                                                            className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const updatedFlashcards = flashcards.map(f =>
                                                                    f.id === flashcard.id
                                                                        ? { ...f, definitionImage: '' }
                                                                        : f
                                                                );
                                                                setFlashcards(updatedFlashcards);
                                                            }}
                                                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Edit Action Buttons */}
                                    {editingCardId === flashcard.id && (
                                        <div className="flex justify-end space-x-2 mt-4">
                                            <button
                                                onClick={cancelEdit}
                                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                onClick={saveEdit}
                                                disabled={!editTerm.trim() || !editDefinition.trim()}
                                                className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                                            >
                                                Lưu
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* New Flashcard Form */}
                            <div className="bg-gray-50 rounded-xl shadow-lg border border-gray-200 p-4 w-full">
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">Thẻ ghi nhớ mới</h3>

                                {/* Options Row */}
                                <div className="flex flex-wrap items-center gap-6 mb-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-700">Loại</span>
                                        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-w-48">
                                            <option>Thuật ngữ và Định nghĩa</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-700">Tạo ngược</span>
                                        <button
                                            onClick={() => setIsReverseEnabled(!isReverseEnabled)}
                                            className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${isReverseEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${isReverseEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                        </button>
                                        <span className={`text-xs ${isReverseEnabled ? 'text-green-500' : 'text-red-500'}`}>
                                            {isReverseEnabled ? 'BẬT' : 'TẮT'}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-700">Thuật ngữ dạng âm thanh</span>
                                        <button
                                            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                                            className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${isAudioEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${isAudioEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                        </button>
                                        <span className={`text-xs ${isAudioEnabled ? 'text-green-500' : 'text-red-500'}`}>
                                            {isAudioEnabled ? 'BẬT' : 'TẮT'}
                                        </span>
                                    </div>
                                </div>

                                {/* Input Fields */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">Thuật ngữ</label>
                                        <textarea
                                            value={termText}
                                            onChange={(e) => setTermText(e.target.value)}
                                            className="w-full h-24 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 bg-purple-50 resize-none text-sm"
                                            placeholder="Nhập nội dung ở đây..."
                                        />
                                        <button
                                            onClick={() => openImageModal('term')}
                                            className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>Thêm hình ảnh</span>
                                        </button>
                                        {termImage && (
                                            <div className="mt-3 relative group">
                                                <img
                                                    src={termImage}
                                                    alt="Term image"
                                                    className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                                <button
                                                    onClick={() => setTermImage('')}
                                                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">Định nghĩa</label>
                                        <textarea
                                            value={definitionText}
                                            onChange={(e) => setDefinitionText(e.target.value)}
                                            className="w-full h-24 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 p-4 bg-purple-50 resize-none text-sm"
                                            placeholder="Nhập nội dung ở đây..."
                                        />
                                        <button
                                            onClick={() => openImageModal('definition')}
                                            className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>Thêm hình ảnh</span>
                                        </button>
                                        {definitionImage && (
                                            <div className="mt-3 relative group">
                                                <img
                                                    src={definitionImage}
                                                    alt="Definition image"
                                                    className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                                <button
                                                    onClick={() => setDefinitionImage('')}
                                                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Image Selection Modal */}
                                {showImageModal && (
                                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-lg font-semibold text-gray-900">
                                                    Thêm hình ảnh cho {imageModalType === 'term' ? 'Thuật ngữ' : 'Định nghĩa'}
                                                </h4>
                                                <button
                                                    onClick={closeImageModal}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Three Options */}
                                            <div className="space-y-4">
                                                {/* Option 1: Search */}
                                                <div className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h5 className="font-medium text-gray-900">Tìm kiếm từ internet</h5>
                                                            <p className="text-sm text-gray-500">Tìm hình ảnh từ Pixabay</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowImageSearch(!showImageSearch)}
                                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                    >
                                                        Tìm kiếm hình ảnh
                                                    </button>
                                                </div>

                                                {/* Option 2: URL */}
                                                <div className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h5 className="font-medium text-gray-900">Dán URL</h5>
                                                            <p className="text-sm text-gray-500">Nhập link hình ảnh trực tiếp</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowUrlInput(!showUrlInput)}
                                                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                                    >
                                                        Dán URL hình ảnh
                                                    </button>
                                                </div>

                                                {/* Option 3: Upload */}
                                                <div className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h5 className="font-medium text-gray-900">Tải lên từ máy</h5>
                                                            <p className="text-sm text-gray-500">Chọn file từ thiết bị của bạn</p>
                                                        </div>
                                                    </div>
                                                    <label className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer flex items-center justify-center">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleFileUpload}
                                                            className="hidden"
                                                        />
                                                        Tải lên hình ảnh
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Search Section */}
                                            {showImageSearch && (
                                                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                                    <h5 className="font-medium text-gray-900 mb-3">Tìm kiếm hình ảnh</h5>
                                                    <div className="flex items-center space-x-2 mb-4">
                                                        <input
                                                            type="text"
                                                            value={imageSearchTerm}
                                                            onChange={(e) => setImageSearchTerm(e.target.value)}
                                                            placeholder="Tìm kiếm hình ảnh..."
                                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    searchImages(imageSearchTerm);
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => searchImages(imageSearchTerm)}
                                                            disabled={isSearchingImages}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                            {isSearchingImages ? 'Đang tìm...' : 'Tìm kiếm'}
                                                        </button>
                                                    </div>

                                                    {/* Search Results */}
                                                    {imageSearchResults.length > 0 && (
                                                        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                                                            {imageSearchResults.map((image) => (
                                                                <div
                                                                    key={image.id}
                                                                    className="relative group cursor-pointer bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
                                                                    onClick={() => selectImage(image.url, 'search')}
                                                                >
                                                                    <img
                                                                        src={image.thumbnail}
                                                                        alt={image.title}
                                                                        className="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-200"
                                                                    />
                                                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                                                                        <div className="opacity-0 group-hover:opacity-100 bg-white rounded-full p-1 shadow-lg">
                                                                            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                                            </svg>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* No Results */}
                                                    {imageSearchResults.length === 0 && imageSearchTerm && !isSearchingImages && (
                                                        <div className="text-center py-4 text-gray-500">
                                                            <p className="text-sm">Không tìm thấy hình ảnh nào</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* URL Input Section */}
                                            {showUrlInput && (
                                                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                                    <h5 className="font-medium text-gray-900 mb-3">Dán URL hình ảnh</h5>
                                                    <div className="flex space-x-2">
                                                        <input
                                                            type="url"
                                                            value={imageUrl}
                                                            onChange={(e) => setImageUrl(e.target.value)}
                                                            placeholder="https://example.com/image.jpg"
                                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                                        />
                                                        <button
                                                            onClick={handleUrlSubmit}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                                        >
                                                            Thêm
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">Hỗ trợ: JPG, PNG, GIF, WebP</p>
                                                </div>
                                            )}


                                            {/* Action Buttons */}
                                            <div className="flex justify-end space-x-3 mt-6">
                                                <button
                                                    onClick={closeImageModal}
                                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                                                >
                                                    Đóng
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Add Flashcard Button - Right aligned */}
                                <div className="flex justify-end mt-4">
                                    <button
                                        onClick={saveFlashcard}
                                        disabled={!termText.trim() || !definitionText.trim() || isSaving}
                                        className={`px-4 py-2 rounded-full flex items-center space-x-2 disabled:opacity-50 transition-colors duration-200 ${termText.trim() && definitionText.trim()
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-gray-400 text-white hover:bg-gray-500'
                                            }`}
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Thêm thẻ ghi nhớ</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advanced Section */}
                    {!showScratchEditor && (
                        <div className="mb-6">
                            <div className="max-w-2xl">
                                <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                                    <span className="text-lg">›</span>
                                    <span className="font-medium">Nâng cao</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Fixed Action Buttons - Only show when in flashcard editor */}
                    {showScratchEditor && (
                        <div className={`fixed bottom-0 z-20 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'} w-full bg-white border-t border-gray-200 p-4 flex justify-center space-x-4 shadow-lg`} style={{ transform: 'translateX(-20px)' }}>
                            <button
                                onClick={async () => {
                                    // Tạo mảng CỤC BỘ để dùng ngay, không phụ thuộc setState
                                    const cardsToSave: Card[] = [
                                        ...flashcards,
                                        ...(termText.trim() && definitionText.trim()
                                            ? [{
                                                id: `tmp-${Date.now()}`,
                                                term: termText.trim(),
                                                definition: definitionText.trim(),
                                                termImage: termImage || '',
                                                definitionImage: definitionImage || '',
                                                saved: false
                                            }]
                                            : [])
                                    ];

                                    // Dọn form (để lần sau không bị lặp)
                                    setTermText('');
                                    setDefinitionText('');
                                    setTermImage('');
                                    setDefinitionImage('');

                                    // (tuỳ chọn) cập nhật state cho khớp UI nhưng KHÔNG đọc lại từ state ngay sau đó
                                    setFlashcards(cardsToSave);

                                    // Lưu dựa trên MẢNG TRUYỀN VÀO → không bị mất thẻ cuối
                                    const results = await saveAllFlashcards(cardsToSave);
                                    if (results.length > 0) setShowStudyMode(true);
                                }}
                                className="px-6 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 flex items-center"
                            >
                                <GraduationCap className="w-4 h-4 mr-2" />
                                Học ngay
                            </button>
                        </div>
                    )}

                    {/* Fixed Action Buttons - Only show when selecting options */}
                    {!showScratchEditor && (
                        <div className={`fixed bottom-0 z-20 transition-all duration-300 ${isCollapsed ? 'left-16' : 'left-40'} w-full bg-white border-t border-gray-200 p-4 flex justify-center space-x-4 shadow-lg`}>
                            <button
                                onClick={onBack}
                                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition-colors duration-200"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleContinue}
                                disabled={!selectedOption}
                                className={`px-6 py-2 rounded-lg transition-colors duration-200 ${selectedOption
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                Tiếp tục
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateFlashcardSet;
