import React, { useState } from 'react';
import { X, Play } from 'lucide-react';

interface YouTubeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (url: string, generateNotes: boolean) => void;
}

const YouTubeModal: React.FC<YouTubeModalProps> = ({ isOpen, onClose, onImport }) => {
    const [url, setUrl] = useState('');
    const [generateNotes, setGenerateNotes] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            onImport(url.trim(), generateNotes);
            setUrl('');
            setGenerateNotes(false);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 w-full max-w-md mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                            <Play className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Add YouTube Video</h3>
                            <p className="text-sm text-gray-600">Import educational content from YouTube.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* URL Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            YouTube Video URL
                        </label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Paste your YouTube video link to import its content. We'll extract the transcript and create study materials.
                        </p>
                    </div>

                    {/* Generate Study Notes Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium text-gray-700">Generate Study Notes</h4>
                            <p className="text-xs text-gray-500">Transform your documents into digestible study materials.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setGenerateNotes(!generateNotes)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${generateNotes ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${generateNotes ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Play className="w-4 h-4" />
                            <span>Import Video</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default YouTubeModal;
