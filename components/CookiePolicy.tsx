import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CookiePolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <Link to="/login" className="inline-flex items-center gap-2 text-edexcel-blue hover:text-edexcel-teal mb-6">
                    <ArrowLeft size={18} />
                    Back
                </Link>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
                    <p className="text-gray-500 mb-8">Last updated: December 2024</p>

                    <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700">
                            This Cookie Policy explains how GoGCSE ("we", "us", or "our") uses cookies and similar technologies
                            to recognize you when you visit our website. It explains what these technologies are and why we use
                            them, as well as your rights to control our use of them.
                        </p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">1. What are cookies?</h2>
                        <p className="text-gray-700">
                            Cookies are small data files that are placed on your computer or mobile device when you visit a website.
                            Cookies are widely used by website owners in order to make their websites work, or to work more efficiently,
                            as well as to provide reporting information.
                        </p>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">2. Why do we use cookies?</h2>
                        <p className="text-gray-700 mb-2">We use cookies for several reasons:</p>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            <li><strong>Essential Cookies:</strong> strictly necessary for the website to function (e.g., to keep you logged in).</li>
                            <li><strong>Performance & Analytics Cookies:</strong> to track how users use the site so we can improve it.</li>
                            <li><strong>Functionality Cookies:</strong> to remember your preferences (like your username or language).</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">3. Cookies we use</h2>

                        <div className="overflow-x-auto mt-4 mb-8">
                            <table className="w-full border-collapse border border-gray-200 text-sm">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="border border-gray-200 p-2 text-left">Category</th>
                                        <th className="border border-gray-200 p-2 text-left">Purpose</th>
                                        <th className="border border-gray-200 p-2 text-left">Opt-out?</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-200 p-2 font-medium">Strictly Necessary</td>
                                        <td className="border border-gray-200 p-2">Login authentication, security, session management.</td>
                                        <td className="border border-gray-200 p-2 text-red-600">No (Required)</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-200 p-2 font-medium">Performance / Analytics</td>
                                        <td className="border border-gray-200 p-2">Google Analytics (anonymised) to see which pages are popular.</td>
                                        <td className="border border-gray-200 p-2 text-green-600">Yes</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">4. Children and Cookies</h2>
                        <p className="text-gray-700">
                            For users identified as under 18, we strictly limit data collection. We do not use advertising or
                            tracking cookies for marketing purposes for child accounts. Analytics data is anonymised.
                        </p>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">5. How can I control cookies?</h2>
                        <p className="text-gray-700">
                            You have the right to decide whether to accept or reject non-essential cookies. You can exercise your
                            cookie rights by setting your preferences in the Cookie Consent Manager (coming soon) or by amending
                            your web browser controls.
                        </p>

                        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">6. Updates to this policy</h2>
                        <p className="text-gray-700">
                            We may update this Cookie Policy from time to time in order to reflect, for example, changes to the
                            cookies we use or for other operational, legal, or regulatory reasons.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookiePolicy;
