import { useState, useCallback } from 'react';
import { Card, TypeCounts, Material } from '../types/flashcard';
import { clampCount } from '../utils/flashcardHelpers';

interface UseFlashcardGenerationProps {
    studySetId: string;
    createdStudySetId: number | null;
    setCreatedStudySetId: (id: number | null) => void;
    setFlashcards: React.Dispatch<React.SetStateAction<Card[]>>;
    setShowTypePicker: (show: boolean) => void;
    setShowMaterialPicker: (show: boolean) => void;
    setShowScratchEditor: (show: boolean) => void;
    setIsGenerating: (generating: boolean) => void;
    setGenDone: (done: number | ((prev: number) => number)) => void;
    setGenTotal: (total: number) => void;
}

export const useFlashcardGeneration = ({
    studySetId,
    createdStudySetId,
    setCreatedStudySetId,
    setFlashcards,
    setShowTypePicker,
    setShowMaterialPicker,
    setShowScratchEditor,
    setIsGenerating,
    setGenDone,
    setGenTotal
}: UseFlashcardGenerationProps) => {
    const generateFlashcards = useCallback(async (
        selectedMaterialIds: Set<string>,
        materialsInSet: Material[],
        typeCounts: TypeCounts,
        flashcardName: string,
        topicContext?: string // Optional: specific topic/module title to focus on
    ) => {
        try {
            if (selectedMaterialIds.size === 0) return;
            const totalSelected = clampCount(typeCounts.termDef) + clampCount(typeCounts.fillBlank) + clampCount(typeCounts.multipleChoice);
            if (totalSelected === 0) return;

            let workingSetId = createdStudySetId;
            if (!workingSetId) {
                const res = await fetch('http://localhost:3001/api/flashcard-sets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: flashcardName, studySetId: Number(studySetId) })
                });
                if (res.ok) {
                    const data = await res.json();
                    workingSetId = Number(data.id);
                    setCreatedStudySetId(workingSetId);
                }
            }

            if (!workingSetId) return;

            const firstId = Array.from(selectedMaterialIds)[0];
            const material = materialsInSet.find((m: any) => String(m.id) === String(firstId));
            if (!material || !material.file_path) {
                alert('Không tìm thấy file tài liệu đã chọn.');
                return;
            }

            const fileResp = await fetch(`http://localhost:3001/api/materials/file/${material.file_path}`);
            if (!fileResp.ok) {
                alert('Không tải được file tài liệu.');
                return;
            }
            const blob = await fileResp.blob();
            const form = new FormData();
            form.append('document', new File([blob], material.name || 'document.pdf', { type: blob.type || 'application/pdf' }));
            form.append('requests', JSON.stringify({
                term_definition: clampCount(typeCounts.termDef),
                multiple_choice: clampCount(typeCounts.multipleChoice),
                fill_blank: clampCount(typeCounts.fillBlank),
            }));
            // Add topic context if provided (for sub-module specific flashcards)
            if (topicContext) {
                form.append('topic_context', topicContext);
            }

            setShowTypePicker(false);
            setShowMaterialPicker(false);
            setShowScratchEditor(true);

            const flaskUrl = (process.env.REACT_APP_FLASK_URL || 'http://localhost:5050') + '/api/generate';
            const totalCards = clampCount(typeCounts.termDef) + clampCount(typeCounts.fillBlank) + clampCount(typeCounts.multipleChoice);
            setIsGenerating(true);
            setGenDone(0);
            setGenTotal(totalCards);

            let genResp: Response | null = null;
            try {
                genResp = await fetch(flaskUrl, { method: 'POST', body: form });
            } catch (e) {
                console.error('Fetch to', flaskUrl, 'failed:', e);
                alert('Không kết nối được AI backend (Flask) ở ' + flaskUrl);
                return;
            }
            if (!genResp.ok) {
                const errText = await genResp.text().catch(() => '');
                console.error('Flask error', genResp.status, errText);
                alert('AI tạo nội dung thất bại: ' + (errText || ('HTTP ' + genResp.status)));
                return;
            }
            const genData = await genResp.json();

            // Process term_definition
            const td = Array.isArray(genData.term_definition) ? genData.term_definition : [];
            for (let i = 0; i < td.length; i++) {
                const item = td[i] || {};
                const payload = {
                    front: String(item.term || ''),
                    back: String(item.definition || ''),
                    materialId: null,
                    flashcardSetId: Number(workingSetId ?? studySetId),
                    studySetId: Number(studySetId),
                    type: 'pair'
                };
                try {
                    const saveResp = await fetch('http://localhost:3001/api/flashcards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (saveResp.ok) {
                        const saved = await saveResp.json();
                        setFlashcards(prev => ([
                            ...prev,
                            {
                                id: String(saved.id),
                                term: saved.front || payload.front,
                                definition: saved.back || payload.back,
                                termImage: '',
                                definitionImage: '',
                                saved: true,
                                dbId: Number(saved.id),
                                type: 'pair'
                            }
                        ]));
                        await new Promise(res => setTimeout(res, 150));
                    }
                } catch (e) {
                    console.error('Save term_definition card error', e);
                } finally {
                    setGenDone(d => d + 1);
                    await new Promise(res => setTimeout(res, 50));
                }
            }

            // Process fill_blank
            const fb = Array.isArray(genData.fill_blank) ? genData.fill_blank : [];
            for (let i = 0; i < fb.length; i++) {
                const item = fb[i] || {};
                const questionText = String(item.question || '');
                const answer = String(item.answer || '');
                const fillBlankText = questionText.replace(/____+/g, `{{${answer}}}`);
                const answers = Array.isArray(item.answer) ? item.answer.map((a: any) => String(a)) : [answer];
                const uniqueAnswers: string[] = Array.from(new Set(answers.filter((a: string) => a && a.trim())));

                const payload = {
                    front: fillBlankText,
                    back: JSON.stringify(uniqueAnswers.length > 0 ? uniqueAnswers : [answer]),
                    materialId: null,
                    flashcardSetId: Number(workingSetId ?? studySetId),
                    studySetId: Number(studySetId),
                    type: 'fillblank',
                    fillBlankAnswers: uniqueAnswers.length > 0 ? uniqueAnswers : [answer]
                };
                try {
                    const saveResp = await fetch('http://localhost:3001/api/flashcards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (saveResp.ok) {
                        const saved = await saveResp.json();
                        setFlashcards(prev => ([
                            ...prev,
                            {
                                id: String(saved.id),
                                term: fillBlankText,
                                definition: JSON.stringify(uniqueAnswers.length > 0 ? uniqueAnswers : [answer]),
                                termImage: '',
                                definitionImage: '',
                                saved: true,
                                dbId: Number(saved.id),
                                type: 'fillblank',
                                fillBlankAnswers: uniqueAnswers.length > 0 ? uniqueAnswers : [answer]
                            }
                        ]));
                        await new Promise(res => setTimeout(res, 150));
                    }
                } catch (e) {
                    console.error('Save fill_blank card error', e);
                } finally {
                    setGenDone(d => d + 1);
                    await new Promise(res => setTimeout(res, 50));
                }
            }

            // Process multiple_choice
            const mc = Array.isArray(genData.multiple_choice) ? genData.multiple_choice : [];
            for (let i = 0; i < mc.length; i++) {
                const item = mc[i] || {};
                const question = String(item.question || '');
                const options = Array.isArray(item.options) ? item.options : [];
                const correctAnswer = String(item.correct_answer || '');

                let correctIndex = -1;
                correctIndex = options.findIndex((opt: string) =>
                    String(opt).trim().toLowerCase() === correctAnswer.trim().toLowerCase()
                );

                if (correctIndex === -1) {
                    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                    const labelIndex = labels.findIndex(l => l === correctAnswer.trim().toUpperCase());
                    if (labelIndex >= 0 && labelIndex < options.length) {
                        correctIndex = labelIndex;
                    }
                }

                if (correctIndex === -1) {
                    const numIndex = parseInt(correctAnswer);
                    if (!isNaN(numIndex) && numIndex >= 0 && numIndex < options.length) {
                        correctIndex = numIndex;
                    }
                }

                if (correctIndex === -1 && options.length > 0) {
                    correctIndex = 0;
                }

                const payload = {
                    front: question,
                    back: JSON.stringify({
                        options: options,
                        correctIndex: correctIndex
                    }),
                    materialId: null,
                    flashcardSetId: Number(workingSetId ?? studySetId),
                    studySetId: Number(studySetId),
                    type: 'multiplechoice',
                    multipleChoiceOptions: options,
                    correctAnswerIndex: correctIndex
                };
                try {
                    const saveResp = await fetch('http://localhost:3001/api/flashcards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (saveResp.ok) {
                        const saved = await saveResp.json();
                        setFlashcards(prev => ([
                            ...prev,
                            {
                                id: String(saved.id),
                                term: question,
                                definition: JSON.stringify({
                                    options: options,
                                    correctIndex: correctIndex
                                }),
                                termImage: '',
                                definitionImage: '',
                                saved: true,
                                dbId: Number(saved.id),
                                type: 'multiplechoice',
                                multipleChoiceOptions: options,
                                correctAnswerIndex: correctIndex
                            }
                        ]));
                        await new Promise(res => setTimeout(res, 150));
                    }
                } catch (e) {
                    console.error('Save multiple_choice card error', e);
                } finally {
                    setGenDone(d => d + 1);
                    await new Promise(res => setTimeout(res, 50));
                }
            }

            await new Promise(res => setTimeout(res, 500));
            setIsGenerating(false);
            setShowScratchEditor(true);
        } catch (e) {
            console.error('Generate error', e);
            alert('Có lỗi xảy ra khi tạo flashcards');
        }
    }, [studySetId, createdStudySetId, setCreatedStudySetId, setFlashcards, setShowTypePicker, setShowMaterialPicker, setShowScratchEditor, setIsGenerating, setGenDone, setGenTotal]);

    return { generateFlashcards };
};

