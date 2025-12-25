import React from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import ResultsDashboard from './ResultsDashboard';

const ResultsRoute: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { examResult, examData, answers = {} } = location.state || {};

    if (!examResult) {
        return <Navigate to="/" />;
    }

    const handleDownloadModelAnswers = () => {
        if (!examResult?.generatedModelAnswers || !examData) return;

        const element = document.createElement("a");
        const file = new Blob([examResult.generatedModelAnswers], { type: 'text/markdown' });
        element.href = URL.createObjectURL(file);
        element.download = `Model_Answers_${examData.type}_${Date.now()}.md`;
        document.body.appendChild(element);
        element.click();
    };

    return (
        <ResultsDashboard
            result={examResult}
            paper={examData}
            answers={answers}
            onDownloadModelAnswers={handleDownloadModelAnswers}
            onHome={() => navigate('/')}
        />
    );
};

export default ResultsRoute;
