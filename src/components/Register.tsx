import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import { Mail, Upload, Clock, FileText, Sparkles, Info } from 'lucide-react';

interface RegisterForm {
    email: string;
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
    const { register: registerUser, loginWithGoogle, loading } = useAuth();
    const navigate = useNavigate();
    const googleButtonRef = useRef<HTMLDivElement>(null);

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<RegisterForm>();

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
        const initializeGoogle = () => {
            if (window.google?.accounts?.id && googleButtonRef.current) {
                // Render Google Sign-In button in the hidden container
                window.google.accounts.id.renderButton(googleButtonRef.current, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'pill',
                    locale: 'vi',
                    callback: (response: any) => {
                        handleGoogleSuccess({ credential: response.credential });
                    },
                });
            }
        };

        // Wait for Google API to load
        if (window.google?.accounts?.id) {
            initializeGoogle();
        } else {
            // Check periodically if Google API is loaded
            const checkInterval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    initializeGoogle();
                    clearInterval(checkInterval);
                }
            }, 100);

            // Cleanup after 5 seconds
            setTimeout(() => clearInterval(checkInterval), 5000);
        }

        return () => {
            // Cleanup
        };
    }, []);

    const handleCustomGoogleClick = () => {
        // Find and click the Google button inside the hidden container
        if (googleButtonRef.current) {
            const googleButton = googleButtonRef.current.querySelector('div[role="button"]') as HTMLElement;
            if (googleButton) {
                googleButton.click();
            } else {
                // Fallback: try to trigger Google One Tap
                if (window.google?.accounts?.id) {
                    window.google.accounts.id.prompt();
                }
            }
        }
    };

    const onSubmit = async (data: RegisterForm) => {
        // For now, just navigate to a page where user can complete registration
        // Or you can add password field later
        navigate('/dashboard');
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
                        {/* Social Login Buttons */}
                        <div className="space-y-3 mb-6">
                            {/* Hidden container for Google Sign-In button - rendered but invisible */}
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

                            {/* Custom Google Button */}
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

                        {/* Register Form */}
                        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                            {/* Email Input */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email của bạn
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        {...register('email', {
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
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                                )}

                                {/* Tip */}
                                <div className="mt-3 flex items-start space-x-2">
                                    <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-gray-600">
                                        Mẹo: Có email .edu? Bạn có thể đủ điều kiện nhận premium miễn phí!
                                    </p>
                                </div>
                            </div>

                            {/* Continue Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-3 rounded-full font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Đang xử lý...' : 'Tiếp tục →'}
                            </button>

                            {/* Login Link */}
                            <div className="text-center">
                                <p className="text-sm text-gray-600">
                                    <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                                        Tôi đã có tài khoản
                                    </Link>
                                </p>
                            </div>
                        </form>

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
