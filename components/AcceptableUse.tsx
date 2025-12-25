import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const AcceptableUse: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <Link to="/login" className="inline-flex items-center gap-2 text-edexcel-blue hover:text-edexcel-teal mb-6">
                    <ArrowLeft size={18} />
                    Back
                </Link>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Acceptable Use Policy</h1>
                    <p className="text-gray-500 mb-8">Last updated: December 2024</p>

                    <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700">
                            This Acceptable Use Policy ("AUP") outlines the rules for using GoGCSE. By accessing our platform,
                            you agree to follow these rules.
                        </p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">1. Academic Integrity</h2>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                            <p className="text-red-800 font-bold mb-2">⛔ STRICTLY PROHIBITED</p>
                            <ul className="list-disc pl-6 space-y-1 text-red-700 text-sm">
                                <li>Using the platform to cheat in real examinations</li>
                                <li>Sharing answers to real exam papers</li>
                                <li>Uploading copyrighted exam materials</li>
                            </ul>
                        </div>
                        <p className="text-gray-700">
                            GoGCSE is for <strong>practice only</strong>. You must not use our tools to gain an unfair advantage
                            in official assessments.
                        </p>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">2. Prohibited Content</h2>
                        <p className="text-gray-700 mb-2">You must NOT upload, generate, or share content that is:</p>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            <li>Offensive, abusive, or hateful</li>
                            <li>Sexually explicit or violent</li>
                            <li>Harassing or bullying towards others</li>
                            <li>False, misleading, or fraudulent</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">3. Account Security</h2>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            <li>Do not share your password with anyone</li>
                            <li>Do not access someone else's account</li>
                            <li>Notify us immediately if you suspect unauthorized access</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">4. System Abuse</h2>
                        <p className="text-gray-700 mb-2">You agree NOT to:</p>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            <li>Attempt to damage, hack, or interfere with the website</li>
                            <li>Use automated scripts or bots to access the site</li>
                            <li>Data scrape or harvest user information</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">5. Consequences of Breach</h2>
                        <p className="text-gray-700">
                            If you violate this policy, we may:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            <li>Issue a warning</li>
                            <li>Suspend your account</li>
                            <li>Permanently terminate your account without refund</li>
                            <li>Report illegal activity to law enforcement</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AcceptableUse;
