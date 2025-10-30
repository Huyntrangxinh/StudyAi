import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Plus, User as UserIcon, Shield, Users, Upload, FileText, FileSpreadsheet, X, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { parseFile, StudentData } from '../utils/fileParser';

const AdminPanel: React.FC = () => {
    const { user, addTeacher, addStudent } = useAuth();
    const navigate = useNavigate();
    const [showAddForm, setShowAddForm] = useState(false);
    const [showAddStudentForm, setShowAddStudentForm] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [parsedStudents, setParsedStudents] = useState<StudentData[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);
    const [editForm, setEditForm] = useState<StudentData>({
        name: '',
        email: '',
        studentId: '',
        classId: '',
        dateOfBirth: ''
    });
    const [newTeacher, setNewTeacher] = useState({ name: '', email: '' });
    const [newStudent, setNewStudent] = useState({
        name: '',
        email: '',
        dateOfBirth: '',
        studentId: '',
        classId: ''
    });

    const handleAddTeacher = async () => {
        if (!newTeacher.name || !newTeacher.email) {
            toast.error('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        if (!newTeacher.email.includes('@')) {
            toast.error('Email không hợp lệ!');
            return;
        }

        const success = await addTeacher(newTeacher.email, newTeacher.name);
        if (success) {
            setNewTeacher({ name: '', email: '' });
            setShowAddForm(false);
        }
    };

    const handleAddStudent = async () => {
        if (!newStudent.name || !newStudent.email || !newStudent.dateOfBirth || !newStudent.studentId || !newStudent.classId) {
            toast.error('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        if (!newStudent.email.includes('@')) {
            toast.error('Email không hợp lệ!');
            return;
        }

        const success = await addStudent(
            newStudent.name,
            newStudent.studentId,
            newStudent.dateOfBirth
        );

        if (success) {
            setNewStudent({ name: '', email: '', dateOfBirth: '', studentId: '', classId: '' });
            setShowAddStudentForm(false);
        }
    };

    const handleFileSelect = (file: File) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv' // .csv
        ];

        if (!allowedTypes.includes(file.type)) {
            toast.error('Chỉ hỗ trợ file PDF, Excel (.xlsx, .xls) và CSV!');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            toast.error('File quá lớn! Vui lòng chọn file nhỏ hơn 10MB.');
            return;
        }

        setUploadedFile(file);
        toast.success(`Đã chọn file: ${file.name}`);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        setParsedStudents([]);
        setShowPreview(false);
    };

    const handlePreviewFile = async () => {
        if (!uploadedFile) {
            toast.error('Vui lòng chọn file trước!');
            return;
        }

        try {
            toast('Đang đọc file...', {
                icon: '⏳',
            });

            const students = await parseFile(uploadedFile);
            setParsedStudents(students);
            setShowPreview(true);
            toast.success(`Đã đọc được ${students.length} sinh viên từ file!`);
        } catch (error) {
            console.error('Error parsing file:', error);
            toast.error('Có lỗi xảy ra khi đọc file');
        }
    };

    const handleProcessFile = async () => {
        if (parsedStudents.length === 0) {
            toast.error('Không có dữ liệu sinh viên để xử lý!');
            return;
        }

        try {
            toast('Đang tạo tài khoản sinh viên...', {
                icon: '⏳',
            });

            // Add students to system
            let successCount = 0;
            for (const student of parsedStudents) {
                try {
                    const success = await addStudent(
                        student.name,
                        student.studentId,
                        student.dateOfBirth
                    );
                    if (success) {
                        successCount++;
                    }
                } catch (error) {
                    console.error(`Failed to add student ${student.name}:`, error);
                }
            }

            toast.success(`Đã tạo thành công ${successCount}/${parsedStudents.length} tài khoản sinh viên!`);
            setUploadedFile(null);
            setParsedStudents([]);
            setShowPreview(false);
            setShowUploadForm(false);
        } catch (error) {
            toast.error('Có lỗi xảy ra khi tạo tài khoản!');
            console.error('Account creation error:', error);
        }
    };

    const handleEditStudent = (student: StudentData) => {
        setEditingStudent(student);
        setEditForm({ ...student });
    };

    const handleSaveEdit = () => {
        if (!editingStudent) return;

        const updatedStudents = parsedStudents.map(student =>
            student === editingStudent ? editForm : student
        );
        setParsedStudents(updatedStudents);
        setEditingStudent(null);
        setEditForm({
            name: '',
            email: '',
            studentId: '',
            classId: '',
            dateOfBirth: ''
        });
        toast.success('Đã cập nhật thông tin sinh viên');
    };

    const handleCancelEdit = () => {
        setEditingStudent(null);
        setEditForm({
            name: '',
            email: '',
            studentId: '',
            classId: '',
            dateOfBirth: ''
        });
    };

    const handleDeleteStudent = (studentToDelete: StudentData) => {
        const updatedStudents = parsedStudents.filter(student => student !== studentToDelete);
        setParsedStudents(updatedStudents);
        toast.success('Đã xóa sinh viên khỏi danh sách');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="text-gray-500 hover:text-gray-700 mr-4"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <h1 className="text-xl font-semibold text-gray-900">
                                Quản lý người dùng
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                                    <Shield className="h-4 w-4 text-primary-600" />
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-700">{user?.name}</span>
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                        Quản trị viên
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                Quản lý người dùng
                            </h2>
                            <p className="text-gray-600">
                                Quản lý tài khoản giáo viên và sinh viên trong hệ thống
                            </p>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => navigate('/users')}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                <Users className="h-4 w-4 mr-2" />
                                Xem danh sách người dùng
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm('Bạn có chắc chắn muốn reset database về dữ liệu mẫu? Tất cả dữ liệu hiện tại sẽ bị mất!')) {
                                        localStorage.removeItem('users_data');
                                        window.location.reload();
                                    }
                                }}
                                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reset Database
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add Buttons */}
                <div className="flex space-x-2 mb-6">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="btn-primary flex items-center space-x-2"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Thêm giáo viên</span>
                    </button>

                    <button
                        onClick={() => setShowAddStudentForm(true)}
                        className="btn-secondary flex items-center space-x-2"
                    >
                        <UserIcon className="h-4 w-4" />
                        <span>Thêm sinh viên</span>
                    </button>

                    <button
                        onClick={() => setShowUploadForm(true)}
                        className="btn-secondary flex items-center space-x-2"
                    >
                        <Upload className="h-4 w-4" />
                        <span>Upload File</span>
                    </button>
                </div>

                {/* Add Teacher Form */}
                {showAddForm && (
                    <div className="card mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Thêm giáo viên mới
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Họ và tên
                                </label>
                                <input
                                    type="text"
                                    value={newTeacher.name}
                                    onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                                    className="input-field"
                                    placeholder="Nhập họ và tên"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={newTeacher.email}
                                    onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                                    className="input-field"
                                    placeholder="Nhập email"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-4">
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="btn-secondary"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAddTeacher}
                                className="btn-primary"
                            >
                                Thêm giáo viên
                            </button>
                        </div>
                    </div>
                )}

                {/* Add Student Form */}
                {showAddStudentForm && (
                    <div className="card mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Thêm sinh viên mới
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Họ và tên
                                </label>
                                <input
                                    type="text"
                                    value={newStudent.name}
                                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                    className="input-field"
                                    placeholder="Nhập họ và tên"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={newStudent.email}
                                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                    className="input-field"
                                    placeholder="Nhập email"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mã sinh viên
                                </label>
                                <input
                                    type="text"
                                    value={newStudent.studentId}
                                    onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                                    className="input-field"
                                    placeholder="Nhập mã sinh viên"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ngày sinh
                                </label>
                                <input
                                    type="date"
                                    value={newStudent.dateOfBirth}
                                    onChange={(e) => setNewStudent({ ...newStudent, dateOfBirth: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Lớp học
                                </label>
                                <input
                                    type="text"
                                    value={newStudent.classId}
                                    onChange={(e) => setNewStudent({ ...newStudent, classId: e.target.value })}
                                    className="input-field"
                                    placeholder="Nhập lớp học"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-4">
                            <button
                                onClick={() => setShowAddStudentForm(false)}
                                className="btn-secondary"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAddStudent}
                                className="btn-primary"
                            >
                                Thêm sinh viên
                            </button>
                        </div>
                    </div>
                )}

                {/* Upload Form */}
                {showUploadForm && (
                    <div className="card mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Upload danh sách sinh viên
                        </h3>

                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            {uploadedFile ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center space-x-3">
                                        {uploadedFile.type.includes('pdf') ? (
                                            <FileText className="h-12 w-12 text-red-500" />
                                        ) : uploadedFile.type.includes('excel') || uploadedFile.type.includes('spreadsheet') ? (
                                            <FileSpreadsheet className="h-12 w-12 text-green-500" />
                                        ) : (
                                            <FileText className="h-12 w-12 text-blue-500" />
                                        )}
                                        <div className="text-left">
                                            <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleRemoveFile}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <div className="flex justify-center space-x-3">
                                        <button
                                            onClick={handlePreviewFile}
                                            className="btn-secondary"
                                        >
                                            Xem trước dữ liệu
                                        </button>
                                        <button
                                            onClick={handleProcessFile}
                                            className="btn-primary"
                                        >
                                            Tạo tài khoản sinh viên
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-lg font-medium text-gray-900 mb-2">
                                        Kéo thả file vào đây hoặc click để chọn
                                    </p>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Hỗ trợ file PDF, Excel (.xlsx, .xls), CSV
                                    </p>
                                    <input
                                        type="file"
                                        accept=".pdf,.xlsx,.xls,.csv"
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="btn-primary cursor-pointer"
                                    >
                                        Chọn file
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Preview Students */}
                {showPreview && parsedStudents.length > 0 && (
                    <div className="card mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Xem trước dữ liệu sinh viên ({parsedStudents.length} sinh viên)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            STT
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Mã sinh viên
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Họ và tên
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ngày sinh
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Lớp học
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {parsedStudents.map((student, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {index + 1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {student.studentId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {student.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {student.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {student.dateOfBirth}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {student.classId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleEditStudent(student)}
                                                        className="text-blue-600 hover:text-blue-900 text-xs px-2 py-1 rounded border border-blue-300 hover:bg-blue-50"
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteStudent(student)}
                                                        className="text-red-600 hover:text-red-900 text-xs px-2 py-1 rounded border border-red-300 hover:bg-red-50"
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>Lưu ý:</strong> Hệ thống sẽ tự động tạo email theo format <span className="font-mono bg-gray-100 px-1 rounded">mã sinh viên@ictu.edu.vn</span> (ví dụ: dtc235340001@ictu.edu.vn).
                                Mật khẩu mặc định sẽ là ngày sinh (DD/MM/YYYY).
                            </p>
                        </div>
                    </div>
                )}

                {/* Edit Student Modal */}
                {editingStudent && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Sửa thông tin sinh viên
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Họ và tên
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mã sinh viên
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.studentId}
                                        onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value, email: `${e.target.value.toLowerCase()}@ictu.edu.vn` })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Ngày sinh
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.dateOfBirth}
                                        onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Lớp học
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.classId}
                                        onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminPanel;