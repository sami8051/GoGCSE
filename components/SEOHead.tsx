import React, { useEffect } from 'react';

interface SEOHeadProps {
    title: string;
    description?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({ title, description }) => {
    useEffect(() => {
        document.title = `${title} | GoGCSE`;

        if (description) {
            let metaDescription = document.querySelector("meta[name='description']");
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.setAttribute('name', 'description');
                document.head.appendChild(metaDescription);
            }
            metaDescription.setAttribute('content', description);
        }
    }, [title, description]);

    return null; // This component doesn't render anything visible
};

export default SEOHead;
