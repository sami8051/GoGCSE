import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Privacy: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <Link to="/login" className="inline-flex items-center gap-2 text-edexcel-blue hover:text-edexcel-teal mb-6">
                    <ArrowLeft size={18} />
                    Back to Login
                </Link>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Notice</h1>
                    <p className="text-gray-500 mb-8">Last updated: December 2024 | Version 2.0</p>

                    {/* Child-friendly summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                        <p className="text-blue-800 font-medium mb-2">🔒 Privacy Summary (Easy Read)</p>
                        <ul className="text-blue-700 text-sm space-y-1">
                            <li>• We collect your email, name, and exam answers to help you learn.</li>
                            <li>• Your teachers can see your work ONLY if you join their class with a code.</li>
                            <li>• We use Google AI to write questions and mark your work.</li>
                            <li>• We keep your data safe and never sell it.</li>
                            <li>• You can ask us to delete your data at any time.</li>
                        </ul>
                    </div>

                    <div className="prose prose-gray max-w-none">
                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">1. Who We Are (Data Controller)</h2>
                        <p className="text-gray-700">
                            GoGCSE is the Data Controller for your personal information.
                            For privacy inquiries, please use the contact form on our dashboard or email our privacy team.
                        </p>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">2. What Data We Collect & Why</h2>
                        <table className="w-full border-collapse border border-gray-200 text-sm mt-2">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="border border-gray-200 p-2 text-left">Data Type</th>
                                    <th className="border border-gray-200 p-2 text-left">Purpose</th>
                                    <th className="border border-gray-200 p-2 text-left">Legal Basis</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-gray-200 p-2">Email, Display Name</td>
                                    <td className="border border-gray-200 p-2">Account setup & login.</td>
                                    <td className="border border-gray-200 p-2">Contract</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 p-2">Age Confirmation</td>
                                    <td className="border border-gray-200 p-2">Child safety (13+ Only).</td>
                                    <td className="border border-gray-200 p-2">Legal Obligation</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 p-2">Exam Data & AI Logs</td>
                                    <td className="border border-gray-200 p-2">Providing the service & marking.</td>
                                    <td className="border border-gray-200 p-2">Contract</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 p-2">Consent Records</td>
                                    <td className="border border-gray-200 p-2">Proof of agreement to Terms.</td>
                                    <td className="border border-gray-200 p-2">Legal Obligation</td>
                                </tr>
                            </tbody>
                        </table>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">3. Sharing Your Data</h2>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            <li><strong>Service Providers:</strong> We use Google Firebase (hosting/db) and Google Gemini (AI generation). They process data on our behalf.</li>
                            <li><strong>Teachers:</strong> If you join a class via Invite Code, that teacher sees your name and results for that class.</li>
                            <li><strong>Legal:</strong> We may share data if required by UK law or to protect safety.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">4. Cookies (PECR Compliance)</h2>
                        <p className="text-gray-700">
                            We use:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            <li><strong>Strictly Necessary Cookies:</strong> To keep you logged in. You cannot switch these off.</li>
                            <li><strong>Functional/Analytics:</strong> Only set if you give consent via our Cookie Banner.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">5. Children's Privacy</h2>
                        <p className="text-gray-700">
                            This service is for users aged 13 and over. We do not knowingly collect data from children under 13.
                            If we discover an account belongs to a child under 13 without verifiable parental consent, we will delete it.
                        </p>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">6. Your Rights (UK GDPR)</h2>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            <li><strong>Access & Portability:</strong> Ask for a copy of your data.</li>
                            <li><strong>Correction:</strong> Fix mistakes in your data.</li>
                            <li><strong>Deletion:</strong> Ask us to delete your account.</li>
                            <li><strong>Withdraw Consent:</strong> You can leave a class or change cookie settings at any time.</li>
                        </ul>
                        <p className="text-gray-700 mt-2">
                            To exercise these rights, email specific-request@gogcse.com (Example). You also have the right to complain to the ICO (ico.org.uk).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
