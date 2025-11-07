import { useState, useCallback } from 'react';
import { Material } from '../types/flashcard';

export const useMaterialManagement = (studySetId: string) => {
    const [materialsInSet, setMaterialsInSet] = useState<Material[]>([]);
    const [isLoadingMaterials, setIsLoadingMaterials] = useState<boolean>(false);
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState<string>('');

    const loadMaterialsForStudySet = useCallback(async () => {
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
    }, [studySetId]);

    const toggleMaterialSelection = useCallback((materialId: string) => {
        setSelectedMaterialIds(prev => {
            const next = new Set(prev);
            if (next.has(materialId)) {
                next.delete(materialId);
            } else {
                next.add(materialId);
            }
            return next;
        });
    }, []);

    return {
        materialsInSet,
        isLoadingMaterials,
        selectedMaterialIds,
        searchTerm,
        setSearchTerm,
        loadMaterialsForStudySet,
        toggleMaterialSelection
    };
};

