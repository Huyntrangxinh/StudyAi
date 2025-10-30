import React, { useState } from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const TestUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploaded, setUploaded] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            console.log('Uploading file:', file.name, 'Type:', file.type, 'Size:', file.size);

            const response = await fetch('http://localhost:3001/api/upload', {
                method: 'POST',
                headers: {
                    'x-user-id': 'demo-user'
                },
                body: formData
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                setUploaded(true);
                toast.success('Upload thành công!');
            } else {
                toast.error(`Upload thất bại: ${data.error}`);
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Upload thất bại: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Test Upload</h2>

            <div className="space-y-4">
                <div>
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>

                {file && (
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded">
                        <FileText className="h-5 w-5 text-red-500" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                        </>
                    )}
                </button>

                {uploaded && (
                    <div className="flex items-center space-x-2 p-3 bg-green-50 rounded text-green-700">
                        <CheckCircle className="h-5 w-5" />
                        <span>Upload thành công!</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestUpload;


