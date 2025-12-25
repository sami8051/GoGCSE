import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-50 border-t border-gray-200 py-8 px-4 mt-auto">
            <div className="max-w-5xl mx-auto space-y-4">
                {/* Main Disclaimer */}
                <p className="text-xs text-gray-600 text-center leading-relaxed font-medium">
                    GoGCSE is an independent revision tool powered by Artificial Intelligence. We are not affiliated with, endorsed by, or connected to Ofqual, the Department for Education, or any exam boards (AQA, Edexcel, OCR, WJEC). Content is for practice only.
                </p>
                
                {/* Legal Notices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-500 leading-relaxed">
                    <div>
                        <p className="font-semibold text-gray-700 mb-1">AI Disclaimer:</p>
                        <p>AI-generated content may contain errors. Always verify important information with official sources before relying on it for academic decisions.</p>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-700 mb-1">Not Official Grades:</p>
                        <p>Results are estimates for practice purposes only. They are not official grades and should not be submitted as qualifications.</p>
                    </div>
                </div>
                
                {/* Copyright */}
                <p className="text-xs text-gray-400 text-center pt-4 border-t border-gray-200">
                    © 2025 GoGCSE. All rights reserved. This is an independent educational tool.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
