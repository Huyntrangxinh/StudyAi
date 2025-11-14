import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Upload, Clock, FileText, Sparkles, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailForm {
    email: string;
}

interface CodeForm {
    code: string;
}

interface NewPasswordForm {
    password: string;
    confirmPassword: string;
}

const ResetPassword: React.FC = () => {
    const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
    const [userEmail, setUserEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const navigate = useNavigate();

    const emailForm = useForm<EmailForm>();
    const codeForm = useForm<CodeForm>();
    const passwordForm = useForm<NewPasswordForm>();

    const handleSendCode = async (data: EmailForm) => {
        setSending(true);
        try {
            const response = await fetch('http://localhost:3001/api/auth/send-reset-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.email }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Không thể gửi mã đặt lại mật khẩu');
            }

            setUserEmail(data.email);
            setStep('code');
            toast.success('Mã đặt lại mật khẩu đã được gửi đến email của bạn!');
        } catch (error: any) {
            console.error('Send reset code error:', error);
            toast.error(error.message || 'Không thể gửi mã đặt lại mật khẩu');
        } finally {
            setSending(false);
        }
    };

    const handleCodeChange = (index: number, value: string) => {
        if (value.length > 1) return;

        const newDigits = [...codeDigits];
        newDigits[index] = value.replace(/\D/g, '');
        setCodeDigits(newDigits);

        if (value && index < 5) {
            codeInputRefs.current[index + 1]?.focus();
        }

        codeForm.setValue('code', newDigits.join(''));
    };

    const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
            codeInputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newDigits = [...codeDigits];

        for (let i = 0; i < 6; i++) {
            newDigits[i] = pastedData[i] || '';
        }

        setCodeDigits(newDigits);
        codeForm.setValue('code', newDigits.join(''));

        const lastFilledIndex = newDigits.findIndex(d => !d) - 1;
        const focusIndex = lastFilledIndex >= 0 ? lastFilledIndex : Math.min(pastedData.length - 1, 5);
        codeInputRefs.current[focusIndex]?.focus();
    };

    const handleVerifyCode = async (data: CodeForm) => {
        try {
            const response = await fetch('http://localhost:3001/api/auth/verify-reset-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    code: data.code,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Mã code không đúng hoặc đã hết hạn');
            }

            setStep('password');
            toast.success('Mã code hợp lệ! Vui lòng đặt mật khẩu mới.');
        } catch (error: any) {
            console.error('Verify code error:', error);
            toast.error(error.message || 'Mã code không đúng');
        }
    };

    const handleResetPassword = async (data: NewPasswordForm) => {
        try {
            const response = await fetch('http://localhost:3001/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    password: data.password,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Không thể đặt lại mật khẩu');
            }

            toast.success('Đặt lại mật khẩu thành công!');
            navigate('/login');
        } catch (error: any) {
            console.error('Reset password error:', error);
            toast.error(error.message || 'Không thể đặt lại mật khẩu');
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Section - Promotional Content */}
            <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between" style={{ backgroundColor: '#423070' }}>
                {/* Logo */}
                <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-8">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                            <Sparkles className="w-8 h-8" style={{ color: '#423070' }} />
                        </div>
                        <span className="text-white text-2xl font-bold">STUDY FETCH</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-center">
                    {/* Headline */}
                    <h1 className="text-4xl font-bold text-white mb-12 leading-tight">
                        92% học sinh đạt điểm cao hơn với StudyFetch
                    </h1>

                    {/* Upload Box */}
                    <div className="bg-white rounded-xl p-8 mb-8 text-center">
                        <div className="flex flex-col items-center justify-center mb-4">
                            <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                                <Upload className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-600 text-sm">Nhấp để tải lên hoặc kéo thả</p>
                        </div>
                        <div className="flex items-center justify-center space-x-4 mt-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-xs font-medium">MP4</span>
                            <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-xs font-medium">DOC</span>
                            <span className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs font-medium">PDF</span>
                            <span className="px-3 py-1 bg-green-100 text-green-600 rounded text-xs font-medium">TXT</span>
                        </div>
                    </div>

                    {/* Process Flow */}
                    <div className="space-y-6">
                        {/* Spark.E Creating */}
                        <div className="bg-white rounded-xl p-6 text-center">
                            <p className="text-gray-800 font-medium">Spark.E đang tạo tài liệu học tập</p>
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl p-4 text-center">
                                <Clock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-700 font-medium">Buổi học trực tuyến</p>
                            </div>
                            <div className="bg-white rounded-xl p-4 text-center">
                                <FileText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-700 font-medium">Thẻ ghi nhớ AI</p>
                            </div>
                            <div className="bg-white rounded-xl p-4 text-center">
                                <FileText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-700 font-medium">Kế hoạch học tập tức thì</p>
                            </div>
                        </div>

                        {/* And much more */}
                        <div className="flex items-center justify-center space-x-2 text-white">
                            <Sparkles className="w-4 h-4" />
                            <p className="text-sm">... Và nhiều hơn nữa!</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Section - Reset Password Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
                <div className="w-full max-w-md">
                    {/* Title */}
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">
                        Đặt lại mật khẩu
                    </h2>

                    {/* Reset Password Card */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                        {step === 'email' ? (
                            <form className="space-y-6" onSubmit={emailForm.handleSubmit(handleSendCode)}>
                                {/* Email Input */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                        Địa chỉ email
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            {...emailForm.register('email', {
                                                required: 'Email là bắt buộc',
                                                pattern: {
                                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                    message: 'Email không hợp lệ'
                                                }
                                            })}
                                            type="email"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Nhập email của bạn"
                                        />
                                    </div>
                                    {emailForm.formState.errors.email && (
                                        <p className="mt-1 text-sm text-red-600">{emailForm.formState.errors.email.message}</p>
                                    )}
                                </div>

                                {/* Send Reset Link Button */}
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="w-full bg-blue-600 text-white py-3 rounded-full font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending ? 'Đang gửi...' : 'Gửi mã đặt lại'}
                                </button>

                                {/* Back to Login Link */}
                                <div className="text-center">
                                    <Link
                                        to="/login"
                                        className="text-sm text-blue-600 hover:text-blue-500 font-medium flex items-center justify-center"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Quay lại đăng nhập
                                    </Link>
                                </div>
                            </form>
                        ) : step === 'code' ? (
                            <>
                                {/* Back button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('email');
                                        setCodeDigits(['', '', '', '', '', '']);
                                        codeForm.reset();
                                    }}
                                    className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Quay lại
                                </button>

                                {/* Code Form */}
                                <form className="space-y-6" onSubmit={codeForm.handleSubmit(handleVerifyCode)}>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Mã xác thực
                                        </label>
                                        <div className="flex space-x-2 justify-center">
                                            {codeDigits.map((digit, index) => (
                                                <input
                                                    key={index}
                                                    ref={(el) => (codeInputRefs.current[index] = el)}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => handleCodeChange(index, e.target.value)}
                                                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                                                    onPaste={index === 0 ? handlePaste : undefined}
                                                    className="w-12 h-12 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            ))}
                                        </div>
                                        <input
                                            {...codeForm.register('code', {
                                                required: 'Mã xác thực là bắt buộc',
                                                validate: (value) => value.length === 6 || 'Mã xác thực phải có 6 số'
                                            })}
                                            type="hidden"
                                        />
                                        {codeForm.formState.errors.code && (
                                            <p className="mt-1 text-sm text-red-600">{codeForm.formState.errors.code.message}</p>
                                        )}
                                        <p className="mt-2 text-sm text-gray-500 text-center">
                                            Mã đã được gửi đến <strong>{userEmail}</strong>
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-blue-600 text-white py-3 rounded-full font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Xác thực
                                    </button>
                                </form>
                            </>
                        ) : (
                            <>
                                {/* Back button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('code');
                                        passwordForm.reset();
                                    }}
                                    className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Quay lại
                                </button>

                                {/* New Password Form */}
                                <form className="space-y-6" onSubmit={passwordForm.handleSubmit(handleResetPassword)}>
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                            Mật khẩu mới
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                {...passwordForm.register('password', {
                                                    required: 'Mật khẩu là bắt buộc',
                                                    minLength: {
                                                        value: 6,
                                                        message: 'Mật khẩu phải có ít nhất 6 ký tự'
                                                    }
                                                })}
                                                type={showPassword ? 'text' : 'password'}
                                                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Nhập mật khẩu mới"
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                                ) : (
                                                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                                )}
                                            </button>
                                        </div>
                                        {passwordForm.formState.errors.password && (
                                            <p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.password.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                            Xác nhận mật khẩu
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                {...passwordForm.register('confirmPassword', {
                                                    required: 'Xác nhận mật khẩu là bắt buộc',
                                                    validate: (value) =>
                                                        value === passwordForm.watch('password') || 'Mật khẩu xác nhận không khớp'
                                                })}
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Nhập lại mật khẩu"
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                                ) : (
                                                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                                )}
                                            </button>
                                        </div>
                                        {passwordForm.formState.errors.confirmPassword && (
                                            <p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-blue-600 text-white py-3 rounded-full font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Đặt lại mật khẩu
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
