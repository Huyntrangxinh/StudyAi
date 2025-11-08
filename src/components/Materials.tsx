import React, { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    FolderPlus,
    ChevronDown,
    FileText,
    Pencil,
    Upload,
    ArrowLeft
} from 'lucide-react';

interface Material {
    id: string;
    name: string;
    type: string;
    created_at: string;
    file_path?: string;
    size?: number;
}

interface MaterialsProps {
    studySetId: string;
    studySetName: string;
    onBack: () => void;
    isCollapsed?: boolean;
    onMaterialClick?: (materialId: string) => void;
}

const Materials: React.FC<MaterialsProps> = ({ studySetId, studySetName, onBack, isCollapsed = false, onMaterialClick }) => {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('All Types');
    const [showUploadModal, setShowUploadModal] = useState(false);

    useEffect(() => {
        loadMaterials();
    }, [studySetId]);

    const loadMaterials = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`http://localhost:3001/api/materials/${studySetId}`);
            if (response.ok) {
                const data = await response.json();
                setMaterials(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error loading materials:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
        } catch {
            return dateString;
        }
    };

    const filteredMaterials = materials.filter(material => {
        const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedType === 'All Types' || material.type === selectedType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="fixed inset-0 bg-white overflow-y-auto" style={{ marginLeft: isCollapsed ? '64px' : '192px' }}>
            <div className="p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-4 mb-2">
                        <button
                            onClick={onBack}
                            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
                            title="Quay lại"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-700" />
                        </button>
                        <h1 className="text-3xl font-bold" style={{ color: '#3b315c' }}>Tài liệu</h1>
                    </div>
                    <p className="text-gray-600 ml-14">Tải lên và quản lý tài liệu học tập của bạn tại đây.</p>
                </div>

                {/* Filter Section - Top */}
                <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-700">Đang xem tài liệu của</span>
                        <div className="relative">
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">{studySetName.charAt(0).toUpperCase()}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">{studySetName}</span>
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <button className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
                            Xem tất cả
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            <span className="text-sm">Gộp tài liệu</span>
                        </button>
                        <div className="relative">
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
                                <span className="text-sm text-gray-700">{selectedType === 'All Types' ? 'Tất cả loại' : selectedType}</span>
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-4 pr-10 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                    </div>
                </div>

                {/* Action Cards - First Row */}
                <div className="mb-6 grid grid-cols-2 gap-4 max-w-4xl">
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
                    >
                        <Plus className="w-6 h-6 text-gray-700" />
                        <span className="text-base font-medium text-gray-900">Thêm tài liệu</span>
                    </button>
                    <button className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left">
                        <FolderPlus className="w-6 h-6 text-gray-700" />
                        <span className="text-base font-medium text-gray-900">Tạo thư mục</span>
                    </button>
                </div>

                {/* Materials List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-500">Đang tải tài liệu...</div>
                    </div>
                ) : filteredMaterials.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Không tìm thấy tài liệu</h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm ? 'Thử từ khóa tìm kiếm khác' : 'Tải lên tài liệu đầu tiên để bắt đầu'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Tải lên tài liệu
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4">
                        {filteredMaterials.map((material) => (
                            <div
                                key={material.id}
                                onClick={() => onMaterialClick?.(material.id)}
                                className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                            >
                                <div className="relative flex-shrink-0">
                                    <FileText className="w-10 h-10 text-blue-400" />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                        <Pencil className="w-2.5 h-2.5 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{material.name || 'Tài liệu chưa có tên'}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(material.created_at)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
};

export default Materials;

