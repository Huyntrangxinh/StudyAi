import React, { useState } from 'react';
import {
    Play,
    Trophy,
    Clock,
    BookOpen,
    Target,
    TrendingUp,
    Brain,
    FileText,
    Settings,
    Users,
    BookMarked,
    UserPlus,
    GraduationCap,
    Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
// import InlineDocumentUpload from './InlineDocumentUpload';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface DashboardContentProps {
    activeSection: string;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ activeSection }) => {
    const navigate = useNavigate();
    const { isAdmin, addTeacher, addStudent } = useAuth();

    // Form states
    const [teacherForm, setTeacherForm] = useState({
        name: '',
        email: ''
    });
    const [studentForm, setStudentForm] = useState({
        name: '',
        studentId: '',
        dateOfBirth: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    // Upload file states
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showUploadArea, setShowUploadArea] = useState(false);

    // File parsing states
    const [parsedStudents, setParsedStudents] = useState<any[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const renderOverview = () => (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Xin chào, <span className="text-blue-600">Cùng Prep tiến bộ mỗi ngày nào!</span>
                    </h1>
                </div>
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Play className="h-4 w-4" />
                    <span>Xem giới thiệu</span>
                </button>
            </div>

            {/* Today's Goal Card */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold mb-2">Mục tiêu hôm nay</h2>
                        <p className="text-blue-100 mb-4">
                            Chà, hôm nay không có buổi học nào. Nghỉ ngơi và đừng quên xem lại tiến độ học nhé!
                        </p>
                        <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                            Xem Study Plan
                        </button>
                    </div>
                    <div className="ml-6">
                        <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                            <div className="text-4xl">😴</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Learning Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Learning Profile</h3>
                    <button className="text-blue-600 hover:text-blue-800 font-medium">Xem tất cả</button>
                </div>

                <div className="space-y-4">
                    {/* IELTS Level */}
                    <div>
                        <h4 className="font-medium text-gray-900 mb-2">Your IELTS Level</h4>
                        <div className="flex items-center space-x-4">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                                <span className="text-gray-600">Entry 0.0</span>
                                <span className="text-gray-600">→</span>
                                <span className="text-blue-600 font-medium">Predicted 0.0</span>
                                <span className="text-gray-600">→</span>
                                <div className="flex items-center space-x-1">
                                    <Target className="h-4 w-4 text-blue-600" />
                                    <span className="text-blue-600 font-medium">Target 4.0</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Learning Summary */}
                    <div>
                        <h4 className="font-medium text-gray-900 mb-3">Learning summary</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3">
                                <Clock className="h-5 w-5 text-blue-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Tổng thời lượng</p>
                                    <p className="font-semibold">5 mins</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Trophy className="h-5 w-5 text-yellow-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Tổng số cúp đã đạt</p>
                                    <p className="font-semibold">40</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <BookOpen className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Tổng số bài test</p>
                                    <p className="font-semibold">15</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <TrendingUp className="h-5 w-5 text-purple-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Tổng số bài học</p>
                                    <p className="font-semibold">10</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Study Plan Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Plan</h3>

                <div className="space-y-4">
                    {/* Progress Circle */}
                    <div className="flex items-center space-x-6">
                        <div className="relative w-20 h-20">
                            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                    className="text-gray-200"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                    className="text-blue-600"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    fill="none"
                                    strokeDasharray="75, 100"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg font-bold text-blue-600">4.0</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                                <Trophy className="h-5 w-5 text-yellow-600" />
                                <span className="font-medium">Số cúp đã đạt</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">76/195</p>
                        </div>
                    </div>

                    {/* Units Progress */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">Số Units đạt 2 cúp trở lên</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-green-600">Hoàn thành: 30/65 Units</span>
                                <span className="text-blue-600">Kế hoạch: 65/65 Units</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '46%' }}></div>
                            </div>
                            <p className="text-sm text-gray-600">
                                Bạn đang học chậm hơn kế hoạch, phải cố gắng hơn nữa để...
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Motivational Quote */}
            <div className="flex justify-end">
                <div className="bg-yellow-100 rounded-xl p-4 max-w-sm">
                    <div className="flex items-start space-x-3">
                        <div className="text-2xl">🐝</div>
                        <div>
                            <p className="text-gray-800 font-medium">
                                "Học tập không phải là điểm đến, mà là hành trình."
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStudyPlan = () => (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Study Plan</h1>
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <p className="text-gray-600">Nội dung Study Plan sẽ được hiển thị ở đây...</p>
            </div>
        </div>
    );

    const renderCourses = () => (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <p className="text-gray-600">Danh sách khóa học sẽ được hiển thị ở đây...</p>
            </div>
        </div>
    );

    const renderTestPractice = () => (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Test Practice</h1>
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <p className="text-gray-600">Các bài test sẽ được hiển thị ở đây...</p>
            </div>
        </div>
    );

    const renderLearningProfile = () => (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Learning Profile</h1>
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <p className="text-gray-600">Thông tin học tập chi tiết sẽ được hiển thị ở đây...</p>
            </div>
        </div>
    );

    const renderAILearning = () => (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">AI Học tập</h1>
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <Brain className="h-8 w-8 text-purple-600" />
                    <h2 className="text-xl font-semibold">Trợ lý AI học tập</h2>
                </div>
                <p className="text-gray-600 mb-4">
                    Tương tác với AI để học tập hiệu quả, đặt câu hỏi và nhận hỗ trợ 24/7
                </p>
                <button
                    onClick={() => navigate('/documents')}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                    Bắt đầu trò chuyện với AI
                </button>
            </div>
        </div>
    );

    const renderImportDocs = () => (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Import tài liệu</h1>
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Import tài liệu
                </h2>
                <p className="text-gray-600">
                    Tính năng AI summarization đã được tạm thời vô hiệu hóa.
                    Vui lòng quay lại sau.
                </p>
            </div>
        </div>
    );

    const renderCoursesManagement = () => (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Khóa học</h1>
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <BookMarked className="h-8 w-8 text-green-600" />
                    <h2 className="text-xl font-semibold">Quản lý khóa học</h2>
                </div>
                <p className="text-gray-600 mb-4">
                    Tham gia các khóa học được thiết kế riêng cho bạn
                </p>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    Xem khóa học
                </button>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <Settings className="h-8 w-8 text-gray-600" />
                    <h2 className="text-xl font-semibold">Tùy chỉnh trải nghiệm</h2>
                </div>
                <p className="text-gray-600 mb-4">
                    Tùy chỉnh trải nghiệm học tập của bạn
                </p>
                <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    Cài đặt
                </button>
            </div>
        </div>
    );

    const renderProgress = () => (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Tiến độ học tập</h1>
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <p className="text-gray-600">Thông tin tiến độ học tập chi tiết sẽ được hiển thị ở đây...</p>
            </div>
        </div>
    );

    const renderAssignments = () => (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Bài tập</h1>
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <p className="text-gray-600">Danh sách bài tập sẽ được hiển thị ở đây...</p>
            </div>
        </div>
    );

    const renderAdmin = () => (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Quản trị hệ thống</h1>
        </div>
    );

    const handleTeacherSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacherForm.name.trim() || !teacherForm.email.trim()) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        setIsLoading(true);
        try {
            await addTeacher(teacherForm.name, teacherForm.email);
            toast.success('Thêm giáo viên thành công!');
            setTeacherForm({ name: '', email: '' });
        } catch (error) {
            toast.error('Có lỗi xảy ra khi thêm giáo viên');
        } finally {
            setIsLoading(false);
        }
    };

    const renderAddTeacher = () => {

        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Thêm giáo viên</h1>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <UserPlus className="h-8 w-8 text-blue-600" />
                        <h2 className="text-xl font-semibold">Thêm giáo viên mới</h2>
                    </div>

                    <form onSubmit={handleTeacherSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="teacher-name" className="block text-sm font-medium text-gray-700 mb-2">
                                    Họ và tên
                                </label>
                                <input
                                    type="text"
                                    id="teacher-name"
                                    value={teacherForm.name}
                                    onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                                    placeholder="Nhập họ và tên"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="teacher-email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="teacher-email"
                                    value={teacherForm.email}
                                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                                    placeholder="Nhập email"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setTeacherForm({ name: '', email: '' })}
                                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Đang thêm...' : 'Thêm giáo viên'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const handleStudentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentForm.name.trim() || !studentForm.studentId.trim() || !studentForm.dateOfBirth.trim()) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        setIsLoading(true);
        try {
            await addStudent(studentForm.name, studentForm.studentId, studentForm.dateOfBirth);
            toast.success('Thêm sinh viên thành công!');
            setStudentForm({ name: '', studentId: '', dateOfBirth: '' });
        } catch (error) {
            toast.error('Có lỗi xảy ra khi thêm sinh viên');
        } finally {
            setIsLoading(false);
        }
    };

    // Upload file handlers
    const handleFileSelect = (file: File) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];

        if (!allowedTypes.includes(file.type)) {
            toast.error('Chỉ hỗ trợ file PDF, Excel (.xlsx, .xls), CSV');
            return;
        }

        setSelectedFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Vui lòng chọn file');
            return;
        }

        setIsUploading(true);
        try {
            // Parse file and show preview
            const students = await parseFile(selectedFile);
            console.log('Final parsed students:', students);

            if (students.length === 0) {
                toast.error('Không tìm thấy dữ liệu sinh viên trong file. Vui lòng kiểm tra format file.');
                return;
            }

            setParsedStudents(students);
            setShowPreview(true);
            toast.success(`Đã đọc được ${students.length} sinh viên từ file`);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Đọc file thất bại: ' + (error as Error).message);
        } finally {
            setIsUploading(false);
        }
    };

    const parseFile = async (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    if (!data) {
                        reject(new Error('Không thể đọc file'));
                        return;
                    }

                    // Parse based on file type
                    if (file.type === 'text/csv') {
                        const csvData = parseCSV(data as string);
                        resolve(csvData);
                    } else if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                        // Parse Excel files
                        const excelData = parseExcel(data as ArrayBuffer);
                        resolve(excelData);
                    } else {
                        reject(new Error('Định dạng file không được hỗ trợ'));
                    }
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Lỗi đọc file'));

            // Read as ArrayBuffer for Excel files, as text for CSV
            if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file);
            }
        });
    };

    const parseExcel = (data: ArrayBuffer): any[] => {
        try {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            console.log('Excel data:', jsonData);

            const students: any[] = [];

            // Find header row and column indices
            let headerRow = -1;
            let nameCol = -1;
            let studentIdCol = -1;
            let dobCol = -1;
            let classCol = -1;

            // Look for header row (usually first few rows)
            for (let i = 0; i < Math.min(15, jsonData.length); i++) {
                const row = jsonData[i] as any[];
                if (!row) continue;

                console.log(`Row ${i}:`, row);

                for (let j = 0; j < row.length; j++) {
                    const cell = String(row[j] || '').toLowerCase().trim();
                    console.log(`Cell [${i},${j}]: "${cell}"`);

                    if (cell.includes('họ') && cell.includes('tên')) {
                        nameCol = j;
                        headerRow = i;
                        console.log('Found name column at:', i, j);
                    } else if (cell.includes('mã') && cell.includes('sinh')) {
                        studentIdCol = j;
                        headerRow = i;
                        console.log('Found student ID column at:', i, j);
                    } else if (cell.includes('ngày') && cell.includes('sinh')) {
                        dobCol = j;
                        headerRow = i;
                        console.log('Found date column at:', i, j);
                    } else if (cell.includes('lớp') || cell.includes('class') ||
                        cell.includes('học phần') || cell.includes('course')) {
                        classCol = j;
                        headerRow = i;
                        console.log('Found class column at:', i, j);
                    }
                }

                // If we found all required columns, break
                if (nameCol !== -1 && studentIdCol !== -1 && dobCol !== -1) {
                    break;
                }
            }

            // If we didn't find class column in the main header, search more broadly
            if (classCol === -1) {
                console.log('Class column not found in main header, searching more broadly...');
                for (let i = 0; i < Math.min(20, jsonData.length); i++) {
                    const row = jsonData[i] as any[];
                    if (!row) continue;

                    for (let j = 0; j < row.length; j++) {
                        const cell = String(row[j] || '').toLowerCase().trim();
                        if (cell.includes('lớp') || cell.includes('class') ||
                            cell.includes('học phần') || cell.includes('course') ||
                            cell.includes('k22') || cell.includes('k23') || cell.includes('k24') ||
                            cell.includes('k25') || cell.includes('k26') || cell.includes('k27') ||
                            cell.includes('cnttqt') || cell.includes('công nghệ') ||
                            cell.includes('abc') || cell.includes('xyz') || cell.includes('def')) {
                            classCol = j;
                            console.log('Found class column at:', i, j, 'with value:', cell);
                            break;
                        }
                    }
                    if (classCol !== -1) break;
                }
            }

            console.log('Header detection result:', { headerRow, nameCol, studentIdCol, dobCol, classCol });

            // Find class information once from header rows
            let globalClassName = '';
            for (let k = 0; k < Math.min(10, jsonData.length); k++) {
                const headerRow = jsonData[k] as any[];
                if (!headerRow) continue;

                for (let l = 0; l < headerRow.length; l++) {
                    const cell = String(headerRow[l] || '').trim();
                    if (cell.includes('K22') || cell.includes('K23') || cell.includes('K24') ||
                        cell.includes('K25') || cell.includes('K26') || cell.includes('K27') ||
                        cell.includes('CNTTQT') || cell.includes('Công nghệ') ||
                        cell.includes('phát triển ứng dụng') || cell.includes('K2.D1.01') ||
                        cell.includes('Lớp học phần') || cell.includes('Lớp') ||
                        cell.includes('ABC') || cell.includes('XYZ') || cell.includes('DEF')) {

                        // Extract class code from parentheses
                        const match = cell.match(/\(([^)]+)\)/);
                        if (match) {
                            globalClassName = match[1]; // Get content inside parentheses
                            console.log('Found class code from header row:', k, l, match[1]);
                        } else {
                            globalClassName = cell;
                            console.log('Found global class info from header row:', k, l, cell);
                        }
                        break;
                    }
                }
                if (globalClassName) break;
            }

            // If we found the header row, parse the data
            if (headerRow !== -1 && nameCol !== -1 && studentIdCol !== -1 && dobCol !== -1) {
                for (let i = headerRow + 1; i < jsonData.length; i++) {
                    const row = jsonData[i] as any[];
                    if (!row) continue;

                    const name = String(row[nameCol] || '').trim();
                    const studentId = String(row[studentIdCol] || '').trim();
                    const dateOfBirth = String(row[dobCol] || '').trim();

                    // Use global class name for all students
                    const className = globalClassName || (classCol !== -1 ? String(row[classCol] || '').trim() : '');

                    console.log(`Student data [${i}]:`, { name, studentId, dateOfBirth, className });

                    // Skip empty rows
                    if (!name || !studentId) continue;

                    // Format date if needed
                    let formattedDate = dateOfBirth;
                    if (dateOfBirth && dateOfBirth.includes('/')) {
                        // Convert DD/MM/YYYY to YYYY-MM-DD for date input
                        const parts = dateOfBirth.split('/');
                        if (parts.length === 3) {
                            const [day, month, year] = parts;
                            formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                        }
                    }

                    students.push({
                        name: name,
                        studentId: studentId,
                        dateOfBirth: formattedDate,
                        className: className,
                        email: `${studentId}@ictu.edu.vn` // Auto-generate email
                    });
                }
            } else {
                // If no header found, try to parse with common patterns
                console.log('No header found, trying common patterns...');

                // Try different column combinations
                const possibleCombinations = [
                    { nameCol: 0, idCol: 1, dobCol: 2, classCol: 3 },
                    { nameCol: 1, idCol: 0, dobCol: 2, classCol: 3 },
                    { nameCol: 2, idCol: 1, dobCol: 0, classCol: 3 },
                    { nameCol: 1, idCol: 2, dobCol: 0, classCol: 3 },
                    { nameCol: 0, idCol: 1, dobCol: 3, classCol: 2 },
                    { nameCol: 1, idCol: 0, dobCol: 3, classCol: 2 }
                ];

                for (const combo of possibleCombinations) {
                    console.log('Trying combination:', combo);

                    for (let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i] as any[];
                        if (!row || row.length < 3) continue;

                        const name = String(row[combo.nameCol] || '').trim();
                        const studentId = String(row[combo.idCol] || '').trim();
                        const dateOfBirth = String(row[combo.dobCol] || '').trim();
                        let className = globalClassName || String(row[combo.classCol] || '').trim();

                        // If we got a full class name, extract just the code part
                        if (className && !globalClassName) {
                            const match = className.match(/\(([^)]+)\)/);
                            if (match) {
                                className = match[1];
                            }
                        }

                        // Check if this looks like valid student data
                        if (name && name.length > 2 &&
                            studentId && studentId.match(/[A-Za-z]/) && studentId.match(/\d/)) {

                            // Format date if needed
                            let formattedDate = dateOfBirth;
                            if (dateOfBirth && dateOfBirth.includes('/')) {
                                const parts = dateOfBirth.split('/');
                                if (parts.length === 3) {
                                    const [day, month, year] = parts;
                                    formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                                }
                            }

                            students.push({
                                name: name,
                                studentId: studentId,
                                dateOfBirth: formattedDate,
                                className: className,
                                email: `${studentId}@ictu.edu.vn`
                            });

                            console.log('Found student:', { name, studentId, dateOfBirth, className });
                        }
                    }

                    // If we found students with this combination, break
                    if (students.length > 0) {
                        console.log('Found students with combination:', combo);
                        break;
                    }
                }
            }

            console.log('Parsed students:', students);
            return students;
        } catch (error) {
            console.error('Error parsing Excel file:', error);
            throw new Error('Không thể đọc file Excel');
        }
    };

    const parseCSV = (csvText: string): any[] => {
        const lines = csvText.split('\n');
        const students: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const columns = line.split(',');
            if (columns.length >= 3) {
                const studentId = columns[1].trim();
                students.push({
                    name: columns[0].trim(),
                    studentId: studentId,
                    dateOfBirth: columns[2].trim(),
                    className: columns[3] ? columns[3].trim() : '',
                    email: `${studentId}@ictu.edu.vn` // Auto-generate email
                });
            }
        }

        return students;
    };

    const renderAddStudent = () => {
        const handleEditStudent = (index: number, field: string, value: string) => {
            const updatedStudents = [...parsedStudents];
            updatedStudents[index][field] = value;
            setParsedStudents(updatedStudents);
        };

        const handleDeleteStudent = (index: number) => {
            const updatedStudents = parsedStudents.filter((_, i) => i !== index);
            setParsedStudents(updatedStudents);
        };

        const handleCreateStudents = async () => {
            setIsLoading(true);
            try {
                let successCount = 0;
                for (const student of parsedStudents) {
                    try {
                        // Convert date format from YYYY-MM-DD to DD/MM/YYYY for password
                        let password = student.dateOfBirth;
                        if (student.dateOfBirth.includes('-')) {
                            const parts = student.dateOfBirth.split('-');
                            if (parts.length === 3) {
                                const [year, month, day] = parts;
                                password = `${day}/${month}/${year}`;
                            }
                        }

                        await addStudent(student.name, student.studentId, student.dateOfBirth);
                        successCount++;
                    } catch (error) {
                        console.error(`Failed to add student ${student.name}:`, error);
                    }
                }
                toast.success(`Đã tạo thành công ${successCount}/${parsedStudents.length} tài khoản sinh viên`);
                setParsedStudents([]);
                setShowPreview(false);
                setSelectedFile(null);
            } catch (error) {
                toast.error('Có lỗi xảy ra khi tạo tài khoản sinh viên');
            } finally {
                setIsLoading(false);
            }
        };

        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Thêm sinh viên</h1>

                {/* Manual Form */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <GraduationCap className="h-8 w-8 text-green-600" />
                        <h2 className="text-xl font-semibold">Thêm sinh viên mới</h2>
                    </div>

                    <form onSubmit={handleStudentSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="student-name" className="block text-sm font-medium text-gray-700 mb-2">
                                    Họ và tên
                                </label>
                                <input
                                    type="text"
                                    id="student-name"
                                    value={studentForm.name}
                                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                                    placeholder="Nhập họ và tên"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="student-id" className="block text-sm font-medium text-gray-700 mb-2">
                                    Mã sinh viên
                                </label>
                                <input
                                    type="text"
                                    id="student-id"
                                    value={studentForm.studentId}
                                    onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                                    placeholder="Nhập mã sinh viên"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="student-dob" className="block text-sm font-medium text-gray-700 mb-2">
                                    Ngày sinh
                                </label>
                                <input
                                    type="date"
                                    id="student-dob"
                                    value={studentForm.dateOfBirth}
                                    onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    required
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Mật khẩu mặc định sẽ là ngày sinh (DD/MM/YYYY)
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setStudentForm({ name: '', studentId: '', dateOfBirth: '' })}
                                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Đang thêm...' : 'Thêm sinh viên'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Upload File Area */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <Upload className="h-8 w-8 text-purple-600" />
                        <h2 className="text-xl font-semibold">Upload danh sách sinh viên</h2>
                    </div>

                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-300 hover:border-gray-400'
                            }`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        {selectedFile ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center space-x-2">
                                    <Upload className="h-6 w-6 text-green-600" />
                                    <span className="text-green-600 font-medium">{selectedFile.name}</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Kích thước: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                <button
                                    onClick={() => setSelectedFile(null)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                >
                                    Xóa file
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                                <div>
                                    <p className="text-lg font-medium text-gray-700 mb-2">
                                        Kéo thả file vào đây hoặc click để chọn
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Hỗ trợ file PDF, Excel (.xlsx, .xls), CSV
                                    </p>
                                </div>
                                <button
                                    onClick={() => document.getElementById('file-input')?.click()}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    Chọn file
                                </button>
                                <input
                                    id="file-input"
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.xlsx,.xls,.csv"
                                    onChange={handleFileInput}
                                />
                            </div>
                        )}
                    </div>

                    {/* Upload Actions */}
                    {selectedFile && (
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUploading ? 'Đang upload...' : 'Upload file'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Preview Table */}
                {showPreview && parsedStudents.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <Users className="h-8 w-8 text-blue-600" />
                                <h2 className="text-xl font-semibold">Xem trước danh sách sinh viên</h2>
                            </div>
                            <div className="text-sm text-gray-500">
                                Tổng: {parsedStudents.length} sinh viên
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            STT
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Họ và tên
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Mã sinh viên
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Lớp
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ngày sinh
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {parsedStudents.map((student, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {index + 1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="text"
                                                    value={student.name}
                                                    onChange={(e) => handleEditStudent(index, 'name', e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="text"
                                                    value={student.studentId}
                                                    onChange={(e) => {
                                                        handleEditStudent(index, 'studentId', e.target.value);
                                                        // Auto-update email when student ID changes
                                                        const updatedStudents = [...parsedStudents];
                                                        updatedStudents[index].email = `${e.target.value}@ictu.edu.vn`;
                                                        setParsedStudents(updatedStudents);
                                                    }}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                    {student.email || `${student.studentId}@ictu.edu.vn`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="text"
                                                    value={student.className || ''}
                                                    onChange={(e) => handleEditStudent(index, 'className', e.target.value)}
                                                    placeholder="Nhập lớp"
                                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="text"
                                                    value={student.dateOfBirth}
                                                    onChange={(e) => handleEditStudent(index, 'dateOfBirth', e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => handleDeleteStudent(index)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    setParsedStudents([]);
                                    setSelectedFile(null);
                                }}
                                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateStudents}
                                disabled={isLoading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Đang tạo...' : 'Tạo tài khoản sinh viên'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderUploadFile = () => {

        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Upload file</h1>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <Upload className="h-8 w-8 text-purple-600" />
                        <h2 className="text-xl font-semibold">Upload danh sách sinh viên</h2>
                    </div>

                    {/* File Upload Area */}
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-300 hover:border-gray-400'
                            }`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        {selectedFile ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center space-x-2">
                                    <Upload className="h-6 w-6 text-green-600" />
                                    <span className="text-green-600 font-medium">{selectedFile.name}</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Kích thước: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                <button
                                    onClick={() => setSelectedFile(null)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                >
                                    Xóa file
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                                <div>
                                    <p className="text-lg font-medium text-gray-700 mb-2">
                                        Kéo thả file vào đây hoặc click để chọn
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Hỗ trợ file PDF, Excel (.xlsx, .xls), CSV
                                    </p>
                                </div>
                                <button
                                    onClick={() => document.getElementById('file-input')?.click()}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    Chọn file
                                </button>
                                <input
                                    id="file-input"
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.xlsx,.xls,.csv"
                                    onChange={handleFileInput}
                                />
                            </div>
                        )}
                    </div>

                    {/* Upload Button */}
                    {selectedFile && (
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUploading ? 'Đang upload...' : 'Upload file'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return renderOverview();
            case 'study-plan':
                return renderStudyPlan();
            case 'courses':
                return renderCourses();
            case 'test-practice':
                return renderTestPractice();
            case 'learning-profile':
                return renderLearningProfile();
            case 'ai-learning':
                return renderAILearning();
            case 'import-docs':
                return renderImportDocs();
            case 'courses-management':
                return renderCoursesManagement();
            case 'settings':
                return renderSettings();
            case 'progress':
                return renderProgress();
            case 'assignments':
                return renderAssignments();
            case 'admin':
                return renderAdmin();
            case 'add-teacher':
                return renderAddTeacher();
            case 'add-student':
                return renderAddStudent();
            case 'upload-file':
                return renderUploadFile();
            default:
                return renderOverview();
        }
    };

    return (
        <div className="p-6 min-h-screen bg-gray-50">
            {renderContent()}
        </div>
    );
};

export default DashboardContent;
