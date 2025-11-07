import React from 'react';

interface Option {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
}

interface OptionSelectorProps {
    options: Option[];
    selectedOption: string;
    onSelectOption: (id: string) => void;
}

export const OptionSelector: React.FC<OptionSelectorProps> = ({
    options,
    selectedOption,
    onSelectOption
}) => {
    return (
        <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Chọn một tùy chọn *</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {options.map((option) => (
                    <div
                        key={option.id}
                        onClick={() => onSelectOption(option.id)}
                        className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${selectedOption === option.id
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : `${option.color} border-gray-200`
                            }`}
                    >
                        <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0">
                                {option.id === 'scratch' || option.id === 'material' ? (
                                    <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
                                        <img src={`/${option.icon}`} alt={option.title} className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">{option.icon}</div>
                                )}
                            </div>
                            <div className="flex-1 flex flex-col justify-center">
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{option.title}</h3>
                                <p className="text-gray-600 text-base">{option.description}</p>
                            </div>
                            {selectedOption === option.id && (
                                <div className="absolute top-4 right-4">
                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

