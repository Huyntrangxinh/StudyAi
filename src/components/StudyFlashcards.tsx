import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Star, Share, Upload, Plus, Link, Lightbulb, Brain, Book } from 'lucide-react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useAIChat } from '../hooks/useAIChat';
import { useFlashcardStudy } from '../hooks/useFlashcardStudy';
import { isFillBlankCard, isMultipleChoiceCard } from '../utils/flashcardStudyHelpers';
import { renderMessage } from '../utils/messageRenderer';
import { FillBlankCard } from './study/FillBlankCard';
import { MultipleChoiceCard } from './study/MultipleChoiceCard';
import { PairCard } from './study/PairCard';
import { CardNavigation } from './study/CardNavigation';
import { ActionBar } from './study/ActionBar';
import { AISidebar } from './study/AISidebar';
import { StudyHeader } from './study/StudyHeader';
import { CardFlipContainer } from './study/CardFlipContainer';
import { FloatingChatToggle } from './study/FloatingChatToggle';
import { CardDisplayArea } from './study/CardDisplayArea';
import { ResizableDivider } from './study/ResizableDivider';
import { EmptyState } from './study/EmptyState';
import { ScrollbarStyles } from './study/ScrollbarStyles';
import { useCardNavigation } from '../hooks/useCardNavigation';
import { useSidebarResize } from '../hooks/useSidebarResize';
import { useAuth } from '../hooks/useAuth';

interface StudyFlashcardsProps {
    flashcards: Array<{
        id: string;
        term: string;
        definition: string;
        termImage?: string;
        definitionImage?: string;
        type?: string; // 'pair', 'fillblank', 'multiplechoice'
        fillBlankAnswers?: string[]; // Correct answers for fill in the blank
        multipleChoiceOptions?: string[]; // Options for multiple choice
        correctAnswerIndex?: number; // Correct answer index for multiple choice
    }>;
    onBack: () => void;
    isCollapsed: boolean;
    flashcardName?: string;
    studySetId?: string;
    flashcardSetId?: number; // ID of the flashcard set
}

const StudyFlashcards: React.FC<StudyFlashcardsProps> = ({ flashcards, onBack, isCollapsed, flashcardName, studySetId, flashcardSetId }) => {
    // Test log - should appear immediately
    console.log('🔊 [STUDY] ========== StudyFlashcards COMPONENT RENDERED ==========');
    console.log('🔊 [STUDY] Props:', {
        flashcardsLength: flashcards?.length,
        isCollapsed,
        flashcardName,
        studySetId
    });
    console.warn('⚠️ [STUDY] TEST WARN LOG - If you see this, component is rendering');
    console.error('❌ [STUDY] TEST ERROR LOG - If you see this, component is rendering');

    const { user } = useAuth();
    const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
        try { return localStorage.getItem('ttsEnabled') === '1'; } catch { return false; }
    });
    // AI Sidebar state - can be closed
    const [showAiSidebar, setShowAiSidebar] = useState<boolean>(true);
    const [showHint, setShowHint] = useState<boolean>(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showBookmarkedOnly, setShowBookmarkedOnly] = useState<boolean>(false);
    const [shuffledFlashcards, setShuffledFlashcards] = useState<any[]>([]);

    const studyState = useFlashcardStudy({
        flashcards,
        currentCardIndex,
        userId: user?.id,
        flashcardSetId: flashcardSetId
    });
    const {
        isFlipped,
        setIsFlipped,
        isShuffled,
        setIsShuffled,
        slideDirection,
        setSlideDirection,
        isSliding,
        setIsSliding,
        bookmarkedCards,
        fillBlankInput,
        setFillBlankInput,
        fillBlankChecked,
        fillBlankIsCorrect,
        fillBlankHint,
        showCorrectAnswer,
        setShowCorrectAnswer,
        correctAnswer,
        selectedOptionIndex,
        setSelectedOptionIndex,
        multipleChoiceChecked,
        multipleChoiceIsCorrect,
        flipCard,
        toggleBookmark,
        showFillBlankHint,
        checkFillBlankAnswer,
        checkMultipleChoiceAnswer
    } = studyState;


    // Filter flashcards based on bookmark filter
    const filteredFlashcards = showBookmarkedOnly
        ? flashcards.filter(card => studyState.bookmarkedCards.has(String(card.id)))
        : flashcards;

    // Use shuffled flashcards if shuffle is active, otherwise use filtered flashcards
    const displayedFlashcards = isShuffled && shuffledFlashcards.length > 0
        ? shuffledFlashcards
        : filteredFlashcards;

    const navigation = useCardNavigation({
        flashcardsLength: displayedFlashcards.length,
        isSliding,
        setIsSliding,
        slideDirection,
        setSlideDirection,
        setIsFlipped
    });
    const { currentCardIndex: navCurrentCardIndex, nextCard, prevCard } = navigation;

    useEffect(() => {
        // When shuffled, use navCurrentCardIndex directly
        // When not shuffled, map navigation index back to original flashcards array index
        if (isShuffled) {
            // When shuffled, the displayedFlashcards is already shuffled, so use navCurrentCardIndex directly
            setCurrentCardIndex(navCurrentCardIndex);
        } else if (showBookmarkedOnly && displayedFlashcards.length > 0) {
            const displayedCard = displayedFlashcards[navCurrentCardIndex];
            if (displayedCard) {
                const originalIndex = flashcards.findIndex(card => card.id === displayedCard.id);
                if (originalIndex >= 0) {
                    setCurrentCardIndex(originalIndex);
                }
            }
        } else {
            setCurrentCardIndex(navCurrentCardIndex);
        }
    }, [navCurrentCardIndex, showBookmarkedOnly, displayedFlashcards, flashcards, isShuffled]);

    // Track previous showBookmarkedOnly to detect changes
    const prevShowBookmarkedOnly = React.useRef(showBookmarkedOnly);

    // Adjust currentCardIndex when filter changes and reset shuffle
    useEffect(() => {
        // Only reset shuffle when bookmark filter actually changes (not on every render)
        if (prevShowBookmarkedOnly.current !== showBookmarkedOnly && isShuffled) {
            setIsShuffled(false);
            setShuffledFlashcards([]);
        }
        prevShowBookmarkedOnly.current = showBookmarkedOnly;

        if (showBookmarkedOnly && filteredFlashcards.length > 0) {
            // If current card is not in filtered list, go to first bookmarked card
            const currentCard = flashcards[currentCardIndex];
            if (!currentCard || !studyState.bookmarkedCards.has(String(currentCard.id))) {
                const firstBookmarkedIndex = flashcards.findIndex(card =>
                    studyState.bookmarkedCards.has(String(card.id))
                );
                if (firstBookmarkedIndex >= 0) {
                    setCurrentCardIndex(firstBookmarkedIndex);
                }
            }
        }
    }, [showBookmarkedOnly, studyState.bookmarkedCards, flashcards, currentCardIndex, filteredFlashcards.length, isShuffled]);

    const resize = useSidebarResize({ isCollapsed, showAiSidebar });
    const { sidebarWidth, setSidebarWidth, isResizing, setIsResizing, cardMaxWidth } = resize;

    // Get current card from displayed flashcards
    // When shuffled, use navCurrentCardIndex directly since shuffledFlashcards is already the displayed list
    // When not shuffled, map currentCardIndex to displayedFlashcards index
    const displayedIndex = isShuffled
        ? navCurrentCardIndex
        : (showBookmarkedOnly
            ? displayedFlashcards.findIndex(card => card.id === flashcards[currentCardIndex]?.id)
            : currentCardIndex);
    const currentCard = displayedFlashcards[displayedIndex >= 0 ? displayedIndex : 0] || flashcards[currentCardIndex];

    const { speakText, unlockTTS, hasUserInteracted } = useTextToSpeech();


    const aiChat = useAIChat({ currentCard, studySetId });
    const {
        chatMessage,
        setChatMessage,
        chatHistory,
        isLoadingChat,
        sendChatMessage,
        handleAISubmit
    } = aiChat;

    const handleShowCorrectAnswer = () => {
        setShowCorrectAnswer(true);
    };

    // Auto speak when moving to a new card (chỉ đọc term khi card xuất hiện lần đầu)
    useEffect(() => {
        console.log('🔊 [STUDY] Auto-speak effect triggered (new card)');
        console.log('🔊 [STUDY] Conditions:', {
            audioEnabled,
            hasCurrentCard: !!currentCard,
            hasUserInteracted,
            currentCardIndex
        });

        if (!audioEnabled) {
            console.log('⏭️ [STUDY] Skipping TTS - audio disabled');
            return;
        }
        if (!currentCard) {
            console.log('⏭️ [STUDY] Skipping TTS - no current card');
            return;
        }
        if (!hasUserInteracted) {
            console.log('⏳ [STUDY] Waiting for user interaction before TTS');
            return;
        }

        // Chỉ đọc term khi card xuất hiện (không phụ thuộc vào isFlipped)
        const term = currentCard.term?.toString().trim();
        if (term) {
            console.log('🔊 [STUDY] Scheduling TTS for term (new card):', term.substring(0, 50));
            const timer = setTimeout(() => {
                console.log('🔊 [STUDY] ========== Calling speakText for TERM ==========');
                console.log('🔊 [STUDY] Term:', term);
                speakText(term);
                console.log('🔊 [STUDY] speakText called for term');
            }, 400);
            return () => {
                console.log('🔊 [STUDY] Cleaning up term TTS timer');
                clearTimeout(timer);
            };
        } else {
            console.log('⏭️ [STUDY] No term to speak');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCardIndex, audioEnabled, hasUserInteracted]);


    const shuffleCards = useCallback(() => {
        if (!isShuffled) {
            // Shuffle the current filtered flashcards
            const cardsToShuffle = [...filteredFlashcards];
            // Fisher-Yates shuffle algorithm
            for (let i = cardsToShuffle.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cardsToShuffle[i], cardsToShuffle[j]] = [cardsToShuffle[j], cardsToShuffle[i]];
            }
            // Update state in a single batch to avoid flickering
            setShuffledFlashcards(cardsToShuffle);
            setIsShuffled(true);
            // Reset to first card after shuffling
            setCurrentCardIndex(0);
        } else {
            // Unshuffle - go back to original order
            // Update state in a single batch to avoid flickering
            setIsShuffled(false);
            setShuffledFlashcards([]);
            // Reset to first card
            setCurrentCardIndex(0);
        }
    }, [isShuffled, filteredFlashcards]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    };

    // Removed sendChatMessage - now using useAIChat hook
    // Removed handleAISubmit - now using useAIChat hook
    // Removed renderMessage - now using messageRenderer utility
    // Removed toggleBookmark - now using useFlashcardStudy hook
    // Removed flipCard - now using useFlashcardStudy hook



    // Show hint bubble after 3s when chatbot is hidden
    useEffect(() => {
        if (!showAiSidebar) {
            const t = setTimeout(() => setShowHint(true), 3000);
            const autoHide = setTimeout(() => setShowHint(false), 9000);
            return () => {
                clearTimeout(t);
                clearTimeout(autoHide);
            };
        }
        setShowHint(false);
    }, [showAiSidebar]);

    console.error('🔊 [STUDY] Checking render conditions...');
    console.error('🔊 [STUDY] currentCard:', !!currentCard);
    console.error('🔊 [STUDY] flashcards.length:', flashcards.length);

    if (!currentCard || flashcards.length === 0) {
        console.error('⏭️ [STUDY] Rendering EmptyState - no cards available');
        return <EmptyState flashcardsLength={flashcards.length} onBack={onBack} isCollapsed={isCollapsed} />;
    }

    console.error('✅ [STUDY] Rendering main StudyFlashcards UI');

    return (
        <>
            <ScrollbarStyles />
            <div className="min-h-screen bg-white transition-all duration-300">
                <StudyHeader isCollapsed={isCollapsed} flashcardName={flashcardName} onBack={onBack} />

                <div className={`relative flex h-[calc(100vh-64px)] pt-16 ${isResizing ? 'select-none' : ''}`}
                >
                    <div
                        className="flex-1 flex flex-col max-w-4xl mx-auto px-4"
                        style={{ minWidth: 0 }}
                    >
                        <CardDisplayArea
                            currentCardIndex={showBookmarkedOnly ? displayedIndex : currentCardIndex}
                            totalCards={displayedFlashcards.length}
                            cardMaxWidth={cardMaxWidth}
                            currentCard={currentCard}
                            isFlipped={isFlipped}
                            slideDirection={slideDirection}
                            isSliding={isSliding}
                            bookmarkedCards={bookmarkedCards}
                            fillBlankInput={fillBlankInput}
                            fillBlankChecked={fillBlankChecked}
                            fillBlankIsCorrect={fillBlankIsCorrect}
                            fillBlankHint={fillBlankHint}
                            showCorrectAnswer={showCorrectAnswer}
                            correctAnswer={correctAnswer}
                            selectedOptionIndex={selectedOptionIndex}
                            multipleChoiceChecked={multipleChoiceChecked}
                            multipleChoiceIsCorrect={multipleChoiceIsCorrect}
                            onFlip={flipCard}
                            onToggleBookmark={toggleBookmark}
                            onShowFillBlankHint={showFillBlankHint}
                            onSetFillBlankInput={setFillBlankInput}
                            onCheckFillBlankAnswer={checkFillBlankAnswer}
                            onShowCorrectAnswer={handleShowCorrectAnswer}
                            onSetSelectedOptionIndex={setSelectedOptionIndex}
                            onCheckMultipleChoiceAnswer={checkMultipleChoiceAnswer}
                            onPrev={prevCard}
                            onNext={nextCard}
                        />

                        <ActionBar
                            isShuffled={isShuffled}
                            audioEnabled={audioEnabled}
                            isBookmarked={currentCard ? bookmarkedCards.has(String(currentCard.id)) : false}
                            showBookmarkedOnly={showBookmarkedOnly}
                            isFlipped={isFlipped}
                            showAiSidebar={showAiSidebar}
                            sidebarWidth={sidebarWidth}
                            isCollapsed={isCollapsed}
                            onShuffle={shuffleCards}
                            onToggleBookmarkFilter={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
                            onToggleAudio={() => {
                                const v = !audioEnabled;
                                setAudioEnabled(v);
                                try { localStorage.setItem('ttsEnabled', v ? '1' : '0'); } catch { }
                                if (v) {
                                    unlockTTS();
                                }
                                if (v && currentCard && !isFlipped) {
                                    setTimeout(() => {
                                        const term = currentCard.term?.toString().trim();
                                        if (term) speakText(term);
                                    }, 300);
                                }
                            }}
                            onReplayAudio={() => {
                                console.log('🔊 [STUDY] ========== Replay Audio Button Clicked ==========');
                                console.log('🔊 [STUDY] Card state:', { isFlipped, hasCurrentCard: !!currentCard });

                                if (isFlipped) {
                                    // Đọc definition khi đã lật
                                    const definition = currentCard?.definition?.toString().trim();
                                    console.log('🔊 [STUDY] Replaying DEFINITION:', definition?.substring(0, 50));
                                    if (definition) {
                                        speakText(definition);
                                        console.log('🔊 [STUDY] speakText called for definition (replay)');
                                    } else {
                                        console.log('⏭️ [STUDY] No definition to replay');
                                    }
                                } else {
                                    // Đọc term khi chưa lật
                                    const term = currentCard?.term?.toString().trim();
                                    console.log('🔊 [STUDY] Replaying TERM:', term?.substring(0, 50));
                                    if (term) {
                                        speakText(term);
                                        console.log('🔊 [STUDY] speakText called for term (replay)');
                                    } else {
                                        console.log('⏭️ [STUDY] No term to replay');
                                    }
                                }
                            }}
                            onToggleBookmark={toggleBookmark}
                            onFlip={flipCard}
                        />
                    </div>

                    <ResizableDivider
                        showAiSidebar={showAiSidebar}
                        onMouseDown={() => setIsResizing(true)}
                    />

                    <AISidebar
                        showAiSidebar={showAiSidebar}
                        sidebarWidth={sidebarWidth}
                        currentCard={currentCard}
                        chatHistory={chatHistory}
                        isLoadingChat={isLoadingChat}
                        chatMessage={chatMessage}
                        onClose={() => setShowAiSidebar(false)}
                        onSetSidebarWidth={(width) => {
                            // Ensure width is never smaller than default (350px)
                            setSidebarWidth(Math.max(350, width));
                        }}
                        onSetChatMessage={setChatMessage}
                        onSendChatMessage={sendChatMessage}
                        onHandleAISubmit={handleAISubmit}
                        onKeyPress={handleKeyPress}
                    />
                </div>

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
        </>
    );
};

export default StudyFlashcards;
