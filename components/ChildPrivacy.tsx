import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, UserCheck, Lock, Eye } from 'lucide-react';

const ChildPrivacy: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <Link to="/login" className="inline-flex items-center gap-2 text-edexcel-blue hover:text-edexcel-teal mb-6">
                    <ArrowLeft size={18} />
                    Back
                </Link>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Shield className="text-indigo-600" size={24} />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Privacy Information for Students</h1>
                    </div>

                    <p className="text-lg text-gray-600 mb-8 border-b border-gray-100 pb-6">
                        This page explains how we keep your information safe and what we do with it. We want you to understand how GoGCSE works.
                    </p>

                    <div className="grid gap-6">
                        {/* 1. What info */}
                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                            <div className="flex items-start gap-4">
                                <UserCheck className="text-blue-600 mt-1" size={24} />
                                <div>
                                    <h3 className="text-lg font-bold text-blue-900 mb-2">1. The Information We Collect</h3>
                                    <p className="text-blue-800 mb-2">When you sign up, we ask for your:</p>
                                    <ul className="list-disc pl-5 text-blue-800 text-sm space-y-1">
                                        <li>Name (so we know what to call you)</li>
                                        <li>Email (to log you in)</li>
                                        <li>Age (to make sure you are old enough)</li>
                                        <li>Exam answers (to help you practice)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* 2. Why collect */}
                        <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                            <div className="flex items-start gap-4">
                                <Eye className="text-emerald-600 mt-1" size={24} />
                                <div>
                                    <h3 className="text-lg font-bold text-emerald-900 mb-2">2. Why We Need It</h3>
                                    <p className="text-emerald-800 mb-2">We use this information to:</p>
                                    <ul className="list-disc pl-5 text-emerald-800 text-sm space-y-1">
                                        <li>Create your account</li>
                                        <li>Save your scores so you can see your progress</li>
                                        <li>Use AI to mark your practice exams</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* 3. Keeping it safe */}
                        <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                            <div className="flex items-start gap-4">
                                <Lock className="text-amber-600 mt-1" size={24} />
                                <div>
                                    <h3 className="text-lg font-bold text-amber-900 mb-2">3. Keeping It Safe</h3>
                                    <p className="text-amber-800 mb-2">
                                        We store your information securely. We <strong>never</strong> sell your information to
                                        advertisers or other companies to contact you.
                                    </p>
                                    <p className="text-amber-800">
                                        Only you (and us, for technical help) can see your account details.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 border-t border-gray-100 pt-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Your Rights</h3>
                        <p className="text-gray-700 mb-4">
                            You are in control of your data. You can always:
                        </p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <li className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                Ask to see what info we have
                            </li>
                            <li className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                Ask us to fix mistakes
                            </li>
                            <li className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                Ask us to delete your account
                            </li>
                            <li className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                Change your mind about emails
                            </li>
                        </ul>
                    </div>

                    <div className="mt-8 bg-gray-50 p-6 rounded-xl">
                        <p className="text-gray-700 font-medium">Need help?</p>
                        <p className="text-gray-600 text-sm mt-1">
                            If you have questions about privacy, you can ask a parent or guardian to email us at
                            <span className="font-mono text-indigo-600 ml-1">support@gogcse.com</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChildPrivacy;
