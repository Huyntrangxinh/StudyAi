import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

type Setter<T> = (value: T | ((prev: T) => T)) => void;

interface UseViewTestHandlerParams {
    latestResultCache: Record<number, any>;
    setLatestResultCache: Setter<Record<number, any>>;
    fetchLatestResult: (testId: number) => Promise<any>;
    setCurrentTestId: Setter<number | null>;
    setTestQuestions: Setter<any[]>;
    setSelectedAnswers: Setter<Map<number, number | string>>;
    setTestScore: Setter<{ correct: number; total: number }>;
    setViewAllQuestions: Setter<boolean>;
    setShowTestView: Setter<boolean>;
    setShowReviewTest: Setter<boolean>;
    setCurrentQuestionIndex: Setter<number>;
    setTestStartTime: Setter<Date | null>;
    setElapsedTime: Setter<number>;
}

export function useViewTestHandler(params: UseViewTestHandlerParams) {
    const navigate = useNavigate();

    const {
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
    } = params;

    const handleViewTestClick = async (test: any, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const cached = latestResultCache[test.id];
        let latest = cached !== undefined ? cached : await fetchLatestResult(test.id);
        if (cached === undefined && latest) setLatestResultCache(prev => ({ ...prev, [test.id]: latest }));
        console.log('latest', latest);
        if (latest) {
            try {
                const r = await fetch(`http://localhost:3001/api/tests/${test.id}`);
                if (r.ok) {
                    const testData = await r.json();
                    setCurrentTestId(test.id);
                    const normalized = (Array.isArray(testData.questions) ? testData.questions : [])
                        .filter((q: any) => q.question_type !== 'trueFalse' && q.type !== 'trueFalse')
                        .map((q: any) => ({
                            ...q,
                            correctAnswer: (q.question_type === 'multipleChoice' && typeof q.correctAnswer === 'string' && !isNaN(Number(q.correctAnswer))) ? Number(q.correctAnswer) : q.correctAnswer
                        }));
                    setTestQuestions(normalized);
                    const map = new Map<number, number | string>();
                    if (latest && latest.answers) {
                        try {
                            const entries = Object.entries(latest.answers as Record<string, any>);
                            for (const [k, v] of entries) {
                                const qi = Number(k);
                                if (isNaN(qi)) continue;
                                if (typeof v === 'number') {
                                    map.set(qi, v);
                                } else if (typeof v === 'string' || typeof v === 'boolean') {
                                    map.set(qi, String(v));
                                }
                            }
                        } catch { }
                    }
                    setSelectedAnswers(map);
                    try {
                        let correct = 0;
                        normalized.forEach((q: any, idx: number) => {
                            const ans = map.get(idx);
                            if (q.type === 'fillBlank' || q.type === 'shortAnswer') {
                                const cText = String(q.correctAnswer ?? '').trim().toLowerCase();
                                const aText = String(ans ?? '').trim().toLowerCase();
                                if (cText && aText && cText === aText) correct++;
                            } else {
                                let correctIdx: number | undefined;
                                if (typeof q.correctAnswer === 'number') correctIdx = q.correctAnswer; else if (q.correctAnswer !== undefined) {
                                    const correctText = String(q.correctAnswer);
                                    correctIdx = q.options?.findIndex((opt: string) => (opt || '').replace(/^\s*[A-D]\.\s*/i, '').trim().toLowerCase() === correctText.toLowerCase());
                                }
                                if (typeof ans === 'number' && correctIdx !== undefined && ans === correctIdx) correct++;
                            }
                        });
                        setTestScore({ correct, total: normalized.length });
                    } catch { }
                    setViewAllQuestions(false);
                    setShowTestView(false);
                    setShowReviewTest(true);
                    console.log('Navigating to review-test', { testId: test.id });
                    navigate('/dashboard/review-test');
                } else {
                    console.error('Failed to load test detail (latest exists):', r.status, r.statusText);
                    return;
                }
            } catch (err) {
                console.error('Error loading test detail (latest exists):', err);
                return;
            }
        } else {
            await new Promise(r => setTimeout(r, 200));
            latest = await fetchLatestResult(test.id);
            if (latest) {
                if (!latestResultCache[test.id]) setLatestResultCache(prev => ({ ...prev, [test.id]: latest }));
                try {
                    const r = await fetch(`http://localhost:3001/api/tests/${test.id}`);
                    if (r.ok) {
                        const testData = await r.json();
                        setCurrentTestId(test.id);
                        const normalized = (Array.isArray(testData.questions) ? testData.questions : [])
                            .filter((q: any) => q.question_type !== 'trueFalse' && q.type !== 'trueFalse')
                            .map((q: any) => ({
                                ...q,
                                correctAnswer: (q.question_type === 'multipleChoice' && typeof q.correctAnswer === 'string' && !isNaN(Number(q.correctAnswer))) ? Number(q.correctAnswer) : q.correctAnswer
                            }));
                        setTestQuestions(normalized);
                        const map = new Map<number, number | string>();
                        try {
                            const entries = Object.entries(latest.answers || {} as Record<string, any>);
                            for (const [k, v] of entries) map.set(Number(k), typeof v === 'number' ? v : String(v));
                        } catch { }
                        setSelectedAnswers(map);
                        setViewAllQuestions(false);
                        setShowTestView(false);
                        setShowReviewTest(true);
                        console.log('Navigating to review-test (after retry latest)', { testId: test.id });
                        navigate('/dashboard/review-test');
                        return;
                    } else {
                        console.error('Failed to load test detail after retry latest:', r.status, r.statusText);
                        return;
                    }
                } catch (err) {
                    console.error('Error loading test detail after retry latest:', err);
                    return;
                }
            }
            try {
                const response = await fetch(`http://localhost:3001/api/tests/${test.id}`);
                if (response.ok) {
                    const testData = await response.json();
                    setCurrentTestId(test.id);
                    const normalized = (Array.isArray(testData.questions) ? testData.questions : [])
                        .filter((q: any) => q.question_type !== 'trueFalse' && q.type !== 'trueFalse')
                        .map((q: any) => ({
                            ...q,
                            correctAnswer: (q.question_type === 'multipleChoice' && typeof q.correctAnswer === 'string' && !isNaN(Number(q.correctAnswer))) ? Number(q.correctAnswer) : q.correctAnswer
                        }));
                    setTestQuestions(normalized);
                    setCurrentQuestionIndex(0);
                    setSelectedAnswers(new Map());
                    setTestStartTime(new Date());
                    setElapsedTime(0);
                    setViewAllQuestions(false);
                    setShowReviewTest(false);
                    setShowTestView(true);
                    console.log('Navigating to test (start new)', { testId: test.id });
                    navigate('/dashboard/test');
                } else {
                    console.error('Failed to load test detail for starting test:', response.status, response.statusText);
                    toast.error('Không thể tải bài kiểm tra');
                    return;
                }
            } catch (err) {
                console.error('Error loading test detail for starting test:', err);
                toast.error('Không thể tải bài kiểm tra');
                return;
            }
        }
    };

    return { handleViewTestClick };
}


