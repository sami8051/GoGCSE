import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

const CookieBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('gogcse_cookie_consent');
        if (!consent) {
            setIsVisible(true);
        } else {
            // Restore state if needed, or simply don't show
            const settings = JSON.parse(consent);
            setAnalyticsEnabled(settings.analytics);
        }
    }, []);

    const handleAcceptAll = () => {
        saveConsent({ necessary: true, analytics: true });
    };

    const handleAcceptSelected = () => {
        saveConsent({ necessary: true, analytics: analyticsEnabled });
    };

    const saveConsent = (settings: { necessary: boolean; analytics: boolean }) => {
        localStorage.setItem('gogcse_cookie_consent', JSON.stringify({
            ...settings,
            timestamp: new Date().toISOString()
        }));
        setIsVisible(false);

        // Use this hook to initialize analytics if true
        if (settings.analytics) {
            console.log("Analytics cookies enabled");
            // window.dispatchEvent(new Event('analytics_allowed'));
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50 p-6 md:p-8">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                        <Cookie className="text-edexcel-teal" size={20} />
                        Cookie Settings
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed max-w-2xl">
                        We use cookies to ensure our website works (Strictly Necessary).
                        With your permission, we’d also like to use analytics cookies to see how you use the site
                        so we can improve it. We do NOT use marketing/advertising cookies.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-6 text-sm">
                        <label className="flex items-center gap-2 text-gray-400 cursor-not-allowed" title="Required for the site to function">
                            <input type="checkbox" checked disabled className="rounded text-gray-400 focus:ring-0" />
                            <span className="font-medium">Strictly Necessary (Always On)</span>
                        </label>

                        <label className="flex items-center gap-2 text-gray-900 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={analyticsEnabled}
                                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                                className="rounded text-edexcel-teal focus:ring-edexcel-teal"
                            />
                            <span className="font-medium">Analytics (Optional)</span>
                        </label>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto min-w-[300px]">
                    <button
                        onClick={handleAcceptSelected}
                        className="px-6 py-2.5 rounded-lg border-2 border-gray-200 font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                        Save Preferences
                    </button>
                    <button
                        onClick={handleAcceptAll}
                        className="px-6 py-2.5 rounded-lg bg-edexcel-teal text-white font-bold hover:bg-teal-700 shadow-md transition-colors"
                    >
                        Accept All
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieBanner;
