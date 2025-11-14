import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import { Mail, Upload, Clock, FileText, Sparkles, Info, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailForm {
    email: string;
}

interface VerificationForm {
    code: string;
    name: string;
    password: string;
}

// Extend Window interface for Google API
declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    prompt: (notification?: (notification: any) => void) => void;
                    renderButton: (element: HTMLElement, config: any) => void;
                };
            };
        };
    }
}

const Register: React.FC = () => {
    const { loginWithGoogle, loading } = useAuth();
    const navigate = useNavigate();
    const googleButtonRef = useRef<HTMLDivElement>(null);

    const [step, setStep] = useState<'email' | 'verification'>('email');
    const [userEmail, setUserEmail] = useState('');
    const [sendingCode, setSendingCode] = useState(false);
    const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
    const [showPassword, setShowPassword] = useState(false);
    const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const emailForm = useForm<EmailForm>();
    const verificationForm = useForm<VerificationForm>();

    const handleGoogleSuccess = async (credentialResponse: any) => {
        if (credentialResponse.credential) {
            const success = await loginWithGoogle(credentialResponse.credential);
            if (success) {
                navigate('/dashboard');
            }
        }
    };

    const handleGoogleError = () => {
        console.error('Google login failed');
    };

    // Initialize Google Sign-In
    useEffect(() => {
        const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '32402427703-636ai8dcanhb6ltnf4n2vktcbvrcflsi.apps.googleusercontent.com';

        const initializeGoogle = () => {
            if (window.google?.accounts?.id) {
                // Initialize Google Sign-In API with client_id
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (response: any) => {
                        handleGoogleSuccess({ credential: response.credential });
                    },
                });

                // Render Google Sign-In button in the hidden container
                if (googleButtonRef.current) {
                    window.google.accounts.id.renderButton(googleButtonRef.current, {
                        type: 'standard',
                        theme: 'outline',
                        size: 'large',
                        text: 'signin_with',
                        shape: 'pill',
                        locale: 'vi',
                    });
                }
            }
        };

        if (window.google?.accounts?.id) {
            initializeGoogle();
        } else {
            const checkInterval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    initializeGoogle();
                    clearInterval(checkInterval);
                }
            }, 100);
            setTimeout(() => clearInterval(checkInterval), 5000);
        }

        return () => { };
    }, []);

    const handleCustomGoogleClick = () => {
        if (googleButtonRef.current) {
            const googleButton = googleButtonRef.current.querySelector('div[role="button"]') as HTMLElement;
            if (googleButton) {
                googleButton.click();
            } else {
                if (window.google?.accounts?.id) {
                    window.google.accounts.id.prompt();
                }
            }
        }
    };

    const handleSendCode = async (data: EmailForm) => {
        setSendingCode(true);
        try {
            const response = await fetch('http://localhost:3001/api/auth/send-verification-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.email }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Không thể gửi mã code');
            }

            setUserEmail(data.email);
            setStep('verification');
            toast.success('Mã xác thực đã được gửi đến email của bạn!');
        } catch (error: any) {
            console.error('Send code error:', error);
            toast.error(error.message || 'Không thể gửi mã xác thực');
        } finally {
            setSendingCode(false);
        }
    };

    const handleCodeChange = (index: number, value: string) => {
        if (value.length > 1) return; // Only allow single digit

        const newDigits = [...codeDigits];
        newDigits[index] = value.replace(/\D/g, ''); // Only numbers
        setCodeDigits(newDigits);

        // Auto-focus next input
        if (value && index < 5) {
            codeInputRefs.current[index + 1]?.focus();
        }

        // Update form value
        verificationForm.setValue('code', newDigits.join(''));
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
        verificationForm.setValue('code', newDigits.join(''));

        // Focus last filled input or first empty
        const lastFilledIndex = newDigits.findIndex(d => !d) - 1;
        const focusIndex = lastFilledIndex >= 0 ? lastFilledIndex : Math.min(pastedData.length - 1, 5);
        codeInputRefs.current[focusIndex]?.focus();
    };

    const handleVerifyCode = async (data: VerificationForm) => {
        try {
            const response = await fetch('http://localhost:3001/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    code: data.code,
                    name: data.name,
                    password: data.password,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Xác thực thất bại');
            }

            toast.success('Đăng ký thành công!');
            navigate('/login');
        } catch (error: any) {
            console.error('Verify code error:', error);
            toast.error(error.message || 'Xác thực thất bại');
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

            {/* Right Section - Register Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
                <div className="w-full max-w-md">
                    {/* Title */}
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">
                        Đăng ký
                    </h2>

                    {/* Register Card */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                        {step === 'email' ? (
                            <>
                                {/* Social Login Buttons */}
                                <div className="space-y-3 mb-6">
                                    <div
                                        ref={googleButtonRef}
                                        style={{
                                            position: 'absolute',
                                            opacity: 0,
                                            pointerEvents: 'none',
                                            width: '1px',
                                            height: '1px',
                                            overflow: 'hidden'
                                        }}
                                    />

                                    <button
                                        type="button"
                                        onClick={handleCustomGoogleClick}
                                        className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors bg-white relative"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        <span className="text-gray-700 font-medium">Tiếp tục với Google</span>
                                    </button>
                                </div>

                                {/* Separator */}
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-gray-500">Hoặc đăng ký bằng email</span>
                                    </div>
                                </div>

                                {/* Email Form */}
                                <form className="space-y-6" onSubmit={emailForm.handleSubmit(handleSendCode)}>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                            Email của bạn
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

                                        <div className="mt-3 flex items-start space-x-2">
                                            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-gray-600">
                                                Mẹo: Có email .edu? Bạn có thể đủ điều kiện nhận premium miễn phí!
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={sendingCode || loading}
                                        className="w-full bg-blue-600 text-white py-3 rounded-full font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        {sendingCode ? 'Đang gửi...' : 'Tiếp tục →'}
                                    </button>

                                    <div className="text-center">
                                        <p className="text-sm text-gray-600">
                                            <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                                                Tôi đã có tài khoản
                                            </Link>
                                        </p>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <>
                                {/* Back button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('email');
                                        setCodeDigits(['', '', '', '', '', '']);
                                        verificationForm.reset();
                                    }}
                                    className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Quay lại
                                </button>

                                {/* Verification Form */}
                                <form className="space-y-6" onSubmit={verificationForm.handleSubmit(handleVerifyCode)}>
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
                                            {...verificationForm.register('code', {
                                                required: 'Mã xác thực là bắt buộc',
                                                validate: (value) => value.length === 6 || 'Mã xác thực phải có 6 số'
                                            })}
                                            type="hidden"
                                        />
                                        {verificationForm.formState.errors.code && (
                                            <p className="mt-1 text-sm text-red-600">{verificationForm.formState.errors.code.message}</p>
                                        )}
                                        <p className="mt-2 text-sm text-gray-500 text-center">
                                            Mã đã được gửi đến <strong>{userEmail}</strong>
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                            Họ và tên
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                {...verificationForm.register('name', {
                                                    required: 'Họ và tên là bắt buộc',
                                                    minLength: {
                                                        value: 2,
                                                        message: 'Họ và tên phải có ít nhất 2 ký tự'
                                                    }
                                                })}
                                                type="text"
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Nhập họ và tên"
                                            />
                                        </div>
                                        {verificationForm.formState.errors.name && (
                                            <p className="mt-1 text-sm text-red-600">{verificationForm.formState.errors.name.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                            Mật khẩu
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                {...verificationForm.register('password', {
                                                    required: 'Mật khẩu là bắt buộc',
                                                    minLength: {
                                                        value: 6,
                                                        message: 'Mật khẩu phải có ít nhất 6 ký tự'
                                                    }
                                                })}
                                                type={showPassword ? 'text' : 'password'}
                                                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Nhập mật khẩu"
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
                                        {verificationForm.formState.errors.password && (
                                            <p className="mt-1 text-sm text-red-600">{verificationForm.formState.errors.password.message}</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-600 text-white py-3 rounded-full font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Đang xử lý...' : 'Hoàn tất đăng ký'}
                                    </button>
                                </form>
                            </>
                        )}

                        {/* Terms and Privacy */}
                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-500">
                                Bằng cách đăng ký, bạn đồng ý với{' '}
                                <Link to="/terms" className="text-blue-600 hover:text-blue-500">
                                    Điều khoản Dịch vụ
                                </Link>
                                {' '}và{' '}
                                <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
                                    Chính sách Bảo mật
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
