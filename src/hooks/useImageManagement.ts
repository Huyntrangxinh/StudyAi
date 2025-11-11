import { useState, useCallback } from 'react';
import { ImageModalType, ImageSourceType } from '../types/flashcard';
import { searchImages } from '../utils/imageSearch';

export const useImageManagement = () => {
    const [showImageModal, setShowImageModal] = useState<boolean>(false);
    const [imageModalType, setImageModalType] = useState<ImageModalType>(null);
    const [showImageSearch, setShowImageSearch] = useState<boolean>(false);
    const [imageSearchTerm, setImageSearchTerm] = useState<string>('');
    const [imageSearchResults, setImageSearchResults] = useState<any[]>([]);
    const [isSearchingImages, setIsSearchingImages] = useState<boolean>(false);
    const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [selectedImage, setSelectedImage] = useState<string>('');
    const [selectedImageType, setSelectedImageType] = useState<ImageSourceType>(null);
    const [termImage, setTermImage] = useState<string>('');
    const [definitionImage, setDefinitionImage] = useState<string>('');

    const handleImageSearch = useCallback(async (query: string) => {
        if (!query.trim()) return;

        setIsSearchingImages(true);
        try {
            const results = await searchImages(query);
            setImageSearchResults(results);
        } catch (error) {
            console.error('Error searching images:', error);
            setImageSearchResults([]);
        } finally {
            setIsSearchingImages(false);
        }
    }, []);

    const closeImageModal = useCallback(() => {
        setShowImageModal(false);
        setImageModalType(null);
        setShowImageSearch(false);
        setShowUrlInput(false);
        setSelectedImage('');
        setSelectedImageType(null);
        setImageUrl(''); // Clear URL input when closing
    }, []);

    const selectImage = useCallback((imageUrl: string, type: ImageSourceType = 'search') => {
        console.log('🔵 selectImage called:', { imageUrl, type, imageModalType });

        // Store imageModalType in a variable before any state updates
        const currentModalType = imageModalType;

        if (!currentModalType) {
            console.warn('⚠️ imageModalType is null, cannot update image');
            return;
        }

        console.log('🔵 Updating image for type:', currentModalType);

        // Update the appropriate image state first
        if (currentModalType === 'term') {
            console.log('🔵 Setting termImage to:', imageUrl);
            setTermImage(imageUrl);
        } else if (currentModalType === 'definition') {
            console.log('🔵 Setting definitionImage to:', imageUrl);
            setDefinitionImage(imageUrl);
        }

        // Update other states
        setSelectedImage(imageUrl);
        setSelectedImageType(type);
        setShowImageSearch(false);
        setShowUrlInput(false);

        // Close the modal after a short delay to ensure state updates
        setTimeout(() => {
            console.log('🔵 Closing modal after image update');
            closeImageModal();
        }, 100);
    }, [imageModalType, closeImageModal]);

    const openImageModal = useCallback((type: 'term' | 'definition') => {
        setImageModalType(type);
        setShowImageModal(true);
        setSelectedImage('');
        setSelectedImageType(null);
        setImageUrl(''); // Clear URL input when opening modal
    }, []);

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Vui lòng chọn file hình ảnh');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB');
                return;
            }

            const imageUrl = URL.createObjectURL(file);
            selectImage(imageUrl, 'upload');
        }
    }, [selectImage]);

    const handleUrlSubmit = useCallback(() => {
        console.log('🔵 handleUrlSubmit called:', { imageUrl, imageModalType });
        if (!imageUrl.trim()) {
            alert('Vui lòng nhập URL hình ảnh');
            return;
        }

        try {
            new URL(imageUrl);
            console.log('🔵 URL is valid, calling selectImage');
            selectImage(imageUrl.trim(), 'url');
        } catch (error) {
            console.error('❌ Invalid URL:', error);
            alert('URL không hợp lệ');
        }
    }, [imageUrl, selectImage, imageModalType]);

    const removeSelectedImage = useCallback(() => {
        setSelectedImage('');
        setSelectedImageType(null);
    }, []);

    return {
        showImageModal,
        imageModalType,
        showImageSearch,
        imageSearchTerm,
        setImageSearchTerm,
        imageSearchResults,
        isSearchingImages,
        showUrlInput,
        imageUrl,
        setImageUrl,
        selectedImage,
        setSelectedImage,
        selectedImageType,
        setSelectedImageType,
        termImage,
        setTermImage,
        definitionImage,
        setDefinitionImage,
        handleImageSearch,
        selectImage,
        openImageModal,
        closeImageModal,
        handleFileUpload,
        handleUrlSubmit,
        removeSelectedImage,
        setShowImageSearch,
        setShowUrlInput
    };
};

