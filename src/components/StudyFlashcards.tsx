import React, { useEffect, useState } from 'react';
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
}

const StudyFlashcards: React.FC<StudyFlashcardsProps> = ({ flashcards, onBack, isCollapsed, flashcardName, studySetId }) => {
    const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
        try { return localStorage.getItem('ttsEnabled') === '1'; } catch { return false; }
    });
    const [showAiSidebar, setShowAiSidebar] = useState<boolean>(true);
    const [showHint, setShowHint] = useState<boolean>(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);

    const studyState = useFlashcardStudy({ flashcards, currentCardIndex });
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

    const navigation = useCardNavigation({
        flashcardsLength: flashcards.length,
        isSliding,
        setIsSliding,
        slideDirection,
        setSlideDirection,
        setIsFlipped
    });
    const { currentCardIndex: navCurrentCardIndex, nextCard, prevCard } = navigation;

    useEffect(() => {
        setCurrentCardIndex(navCurrentCardIndex);
    }, [navCurrentCardIndex]);

    const resize = useSidebarResize({ isCollapsed, showAiSidebar });
    const { sidebarWidth, setSidebarWidth, isResizing, setIsResizing, cardMaxWidth } = resize;

    const currentCard = flashcards[currentCardIndex];

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

    // Auto speak when moving to a new card (front side)
    useEffect(() => {
        if (!audioEnabled) return;
        if (!currentCard) return;
        if (isFlipped) return;
        if (!hasUserInteracted) {
            console.log('Waiting for user interaction before TTS');
            return;
        }

        const term = currentCard.term?.toString().trim();
        if (term) {
            const timer = setTimeout(() => {
                speakText(term);
            }, 400);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCardIndex, audioEnabled, isFlipped, hasUserInteracted]);


    const shuffleCards = () => {
        setIsShuffled(!isShuffled);
    };

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

    if (!currentCard || flashcards.length === 0) {
        return <EmptyState flashcardsLength={flashcards.length} onBack={onBack} isCollapsed={isCollapsed} />;
    }

    return (
        <>
            <ScrollbarStyles />
            <div className={`min-h-screen bg-gray-50 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-48'}`}>
                <StudyHeader isCollapsed={isCollapsed} flashcardName={flashcardName} onBack={onBack} />

                <div className={`relative flex h-[calc(100vh-64px)] pt-16 ${isResizing ? 'select-none' : ''}`}
                >
                    <div
                        className={`flex-1 flex flex-col ${isCollapsed ? 'pl-0 pr-1 md:pl-0 md:pr-2 -ml-3 md:-ml-4' : 'pl-0 pr-1 md:pl-0 md:pr-2 -ml-16 md:-ml-20'}`}
                        style={{ minWidth: 0 }}
                    >
                        <CardDisplayArea
                            currentCardIndex={currentCardIndex}
                            totalCards={flashcards.length}
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
                            isBookmarked={bookmarkedCards.has(currentCard?.id || '')}
                            isFlipped={isFlipped}
                            showAiSidebar={showAiSidebar}
                            sidebarWidth={sidebarWidth}
                            onShuffle={shuffleCards}
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
                                const term = currentCard?.term?.toString().trim();
                                if (term) speakText(term);
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
                        onSetSidebarWidth={setSidebarWidth}
                        onSetChatMessage={setChatMessage}
                        onSendChatMessage={sendChatMessage}
                        onHandleAISubmit={handleAISubmit}
                        onKeyPress={handleKeyPress}
                    />
                </div>
                <FloatingChatToggle
                    showAiSidebar={showAiSidebar}
                    showHint={showHint}
                    onOpenChat={() => { setShowAiSidebar(true); setShowHint(false); }}
                    onHideHint={() => setShowHint(false)}
                />
            </div>
        </>
    );
};

export default StudyFlashcards;
