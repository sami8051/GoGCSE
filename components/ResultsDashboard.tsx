import React, { useState, useEffect } from 'react';
import { ExamResult, ExamPaper, StudentAnswer } from '../types';
import { Printer, Home, CheckCircle, XCircle, ArrowRight, ArrowUp, ChevronDown, ChevronUp, GripVertical, Menu, X, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface ResultsDashboardProps {
  result: ExamResult;
  paper: ExamPaper | null;
  answers: Record<string, StudentAnswer>;
  onDownloadModelAnswers: () => void;
  onHome: () => void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ result, paper, answers, onDownloadModelAnswers, onHome }) => {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [activeHash, setActiveHash] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Default to expanding all questions on load for full visibility per requirements
  useEffect(() => {
    const allIds = (result.questionResults || result.breakdown || []).map((q: any) => q.questionId);
    setExpandedQuestions(new Set(allIds));
  }, [result]);

  const toggleQuestion = (id: string) => {
    const newSet = new Set(expandedQuestions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedQuestions(newSet);
  };

  const toggleAll = (expand: boolean) => {
    if (expand) {
      const allIds = (result.questionResults || []).map(q => q.questionId);
      setExpandedQuestions(new Set(allIds));
    } else {
      setExpandedQuestions(new Set());
    }
  };

  const scrollToQuestion = (id: string) => {
    const el = document.getElementById(`q-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHash(id);
      setIsMobileMenuOpen(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowBackToTop(scrollTop > 500);
  };

  const scrollToTop = () => {
    const scrollContainer = document.getElementById('results-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const aoData = [
    { name: 'AO1', value: 0 },
    { name: 'AO2', value: 0 },
    { name: 'AO3', value: 0 },
    { name: 'AO4', value: 0 },
    { name: 'AO5', value: 0 },
    { name: 'AO6', value: 0 },
  ];

  (result.questionResults || result.breakdown || []).forEach((qr: any) => {
    if (qr.aos) {
      Object.entries(qr.aos).forEach(([key, val]) => {
        const idx = parseInt(key.replace('AO', '')) - 1;
        if (aoData[idx]) aoData[idx].value += ((val as number) || 0);
      });
    }
  });

  return (
    // ROOT SCROLL CONTAINER: strict h-screen and overflow-y-auto to allow scrolling within fixed body
    <div
      id="results-scroll-container"
      onScroll={handleScroll}
      className="h-screen overflow-y-auto bg-gray-50 font-sans print:bg-white print:p-0 flex flex-col print:h-auto print:overflow-visible scroll-smooth"
    >

      {/* Top Navigation (Hidden on Print) */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center shadow-sm print:hidden">
        <div className="flex items-center gap-3 md:gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <Menu size={24} />
          </button>

          <button onClick={onHome} className="flex items-center gap-2 text-gray-600 hover:text-edexcel-blue font-medium transition-colors">
            <Home size={20} /> <span className="hidden sm:inline">Home</span>
          </button>
          <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
          <h1 className="text-sm md:text-lg font-bold text-gray-800 truncate max-w-[150px] sm:max-w-md">Results: {paper?.title || `Exam Result - ${new Date(result.date?.toDate ? result.date.toDate() : result.date).toLocaleDateString()}`}</h1>
        </div>
        <div className="flex gap-2 md:gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-edexcel-dark text-white px-3 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-sm text-xs md:text-sm"
          >
            <Printer size={16} /> <span className="hidden sm:inline">Print PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 max-w-[1400px] mx-auto w-full relative">

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <aside className="relative w-72 bg-white h-full shadow-2xl p-4 overflow-y-auto animate-in slide-in-from-left duration-200 flex flex-col">
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h3 className="font-bold text-gray-800 text-lg">Question Map</h3>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2 flex-1">
                {(result.questionResults || result.breakdown || []).map((q: any) => (
                  <button
                    key={q.questionId}
                    onClick={() => scrollToQuestion(q.questionId)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${activeHash === q.questionId ? 'bg-blue-50 text-edexcel-blue border border-blue-100' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'}`}
                  >
                    <span className="truncate font-semibold">Q{q.questionId}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${q.score === q.maxScore ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {q.score}/{q.maxScore}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <button onClick={() => { toggleAll(true); setIsMobileMenuOpen(false); }} className="block w-full text-left py-2 text-sm text-blue-600 font-bold hover:underline">Expand All</button>
                <button onClick={() => { toggleAll(false); setIsMobileMenuOpen(false); }} className="block w-full text-left py-2 text-sm text-gray-500 font-medium hover:underline">Collapse All</button>
              </div>
            </aside>
          </div>
        )}

        {/* Desktop Sticky Sidebar */}
        <aside className="hidden lg:block w-72 sticky top-0 h-screen p-6 border-r border-gray-200 mr-4 bg-gray-50/50 backdrop-blur-sm z-30 overflow-hidden">
          <div className="pt-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Question Navigator</h3>
            <div className="space-y-1 mb-8">
              {(result.questionResults || result.breakdown || []).map((q: any) => (
                <button
                  key={q.questionId}
                  onClick={() => scrollToQuestion(q.questionId)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex justify-between items-center group ${activeHash === q.questionId ? 'bg-blue-50 text-edexcel-blue' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <span className="truncate">Question {q.questionId}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${q.score === q.maxScore ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'}`}>
                    {q.score}/{q.maxScore}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-200">
              <button onClick={() => toggleAll(true)} className="block w-full text-left text-xs text-blue-600 font-bold mb-3 hover:underline">Expand All Cards</button>
              <button onClick={() => toggleAll(false)} className="block w-full text-left text-xs text-gray-500 font-medium hover:underline">Collapse All Cards</button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-3 md:p-8 lg:p-12 print:p-0 print:w-full min-w-0">

          {/* DISCLAIMER BANNER - CRITICAL */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 md:p-6 mb-6 md:mb-8 flex gap-4 items-start print:hidden">
            <AlertCircle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-900 text-sm md:text-base mb-2">⚠️ Important Disclaimer</p>
              <ul className="text-amber-800 text-xs md:text-sm space-y-1 leading-relaxed">
                <li>• AI-generated results may contain errors. Always verify with your teacher or official textbooks.</li>
                <li>• These grades are estimates only and not official qualifications.</li>
                <li>• GoGCSE is independent and not affiliated with exam boards or educational authorities.</li>
                <li>• Use this tool for practice and revision purposes only.</li>
              </ul>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-8 shadow-sm border border-gray-200 mb-6 md:mb-10 print:shadow-none print:border-none print:p-0 print:mb-8 break-inside-avoid">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-8">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-2 print:mb-0">
                  <span className="px-3 py-1 bg-edexcel-blue text-white text-[10px] md:text-xs font-bold uppercase rounded-full print:hidden">Official Simulation</span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">Performance Summary</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 my-6 md:my-8 print:grid-cols-4">
                  <div className="bg-blue-50 p-4 md:p-5 rounded-xl border border-blue-100 print:bg-white print:border-gray-200">
                    <span className="block text-[10px] md:text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Estimated Grade</span>
                    <span className="text-3xl md:text-4xl font-extrabold text-edexcel-blue">{result.gradeEstimate}</span>
                  </div>
                  <div className="bg-gray-50 p-4 md:p-5 rounded-xl border border-gray-100 print:bg-white print:border-gray-200">
                    <span className="block text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Marks</span>
                    <span className="text-2xl md:text-3xl font-bold text-gray-800">{result.totalScore} <span className="text-sm md:text-lg text-gray-400 font-normal">/ {result.maxScore}</span></span>
                  </div>
                  <div className="bg-gray-50 p-4 md:p-5 rounded-xl border border-gray-100 print:bg-white print:border-gray-200">
                    <span className="block text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Reading</span>
                    <span className="text-xl md:text-2xl font-bold text-gray-800">
                      {(result.questionResults || result.breakdown || []).filter((q: any) => q.questionId.length < 2 || parseInt(q.questionId) <= 4 || (paper?.type === 'PAPER_2' && parseInt(q.questionId) <= 6)).reduce((a, b) => a + b.score, 0)}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-4 md:p-5 rounded-xl border border-gray-100 print:bg-white print:border-gray-200">
                    <span className="block text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Writing</span>
                    <span className="text-xl md:text-2xl font-bold text-gray-800">
                      {(result.questionResults || result.breakdown || []).filter((q: any) => parseInt(q.questionId) >= 5 || q.questionId.includes('7')).reduce((a, b) => a + b.score, 0)}
                    </span>
                  </div>
                </div>

                <div className="pl-4 md:pl-6 py-2 border-l-4 border-edexcel-blue bg-gray-50 rounded-r-lg print:bg-white print:pl-0 print:border-l-0">
                  <p className="text-gray-700 text-sm md:text-lg italic leading-relaxed">"{result.overallFeedback}"</p>
                </div>
              </div>

              <div className="w-full md:w-64 h-48 print:hidden flex-shrink-0 hidden md:block">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aoData.filter(d => d.value > 0)}>
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Bar dataKey="value" fill="#005f87" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-center text-xs text-gray-400 mt-2 font-medium">AO Performance Breakdown</p>
              </div>
            </div>

            {/* AI LIABILITY WARNING - CRITICAL */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 md:p-6 mb-6 md:mb-8 flex gap-4 items-start print:hidden">
              <AlertCircle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-900 text-sm md:text-base mb-1">⚠️ Important: AI-Generated Results</p>
                <p className="text-amber-800 text-xs md:text-sm leading-relaxed">
                  AI can make mistakes. Always check with your teacher or official textbooks. This is not an official grade.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 md:mb-6 print:hidden">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Detailed Analysis</h2>
            <div className="flex gap-2 text-xs md:text-sm lg:hidden">
              <button onClick={() => toggleAll(true)} className="text-blue-600 font-bold hover:bg-blue-50 px-3 py-1 rounded transition-colors">Expand All</button>
              <button onClick={() => toggleAll(false)} className="text-gray-500 hover:bg-gray-100 px-3 py-1 rounded transition-colors">Collapse</button>
            </div>
          </div>

          <div className="space-y-6 md:space-y-12 print:space-y-16 pb-20">
            {(result.questionResults || result.breakdown || []).map((qResult: any) => {
              const questionData = paper?.questions?.find(q => q.id === qResult.questionId);
              const studentAnswerData = answers[qResult.questionId];
              // Fallback to stored answer if available (future exams)
              const studentAnswerText = qResult.studentAnswer || studentAnswerData?.text;
              const isExpanded = expandedQuestions.has(qResult.questionId);

              // Skip rendering if data is somehow missing AND we don't have a result to show (shouldn't happen given we map over results)
              if (!qResult) return null;

              return (
                <div
                  id={`q-${qResult.questionId}`}
                  key={qResult.questionId}
                  className={`bg-white rounded-xl shadow-sm border transition-all duration-300 print:shadow-none print:border-none print:block break-inside-avoid
                    ${isExpanded ? 'border-gray-300 shadow-md ring-1 ring-black/5' : 'border-gray-200'}`}
                >
                  {/* Collapsible Header */}
                  <div
                    onClick={() => toggleQuestion(qResult.questionId)}
                    className="cursor-pointer bg-gray-50 p-4 md:p-6 border-b border-gray-200 flex justify-between items-start hover:bg-gray-100 transition-colors print:bg-white print:border-b-2 print:border-black print:px-0"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="bg-white p-2 rounded-md shadow-sm border border-gray-200 text-gray-400 print:hidden hidden sm:block">
                        <GripVertical size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-lg md:text-xl font-bold text-gray-900">Question {qResult.questionId}</span>
                          <span className="text-xs md:text-sm px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md font-medium print:bg-transparent print:p-0 border border-gray-300 print:border-none">
                            {qResult.score} / {qResult.maxScore} Marks
                          </span>
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 font-mono">
                          Assessing: {Object.keys(qResult.aos).join(', ')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {qResult.level > 0 && (
                        <div className="text-right hidden sm:block">
                          <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Level</div>
                          <div className="text-xl font-bold text-edexcel-blue">{qResult.level}</div>
                        </div>
                      )}
                      <button className="text-gray-400 print:hidden p-1 md:p-2 hover:bg-gray-200 rounded-full transition-colors">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {(isExpanded || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
                    <div className="p-4 md:p-6 lg:p-10 space-y-8 md:space-y-10 print:px-0 print:block">

                      {/* 1) Question Text */}
                      <div className="prose max-w-none text-gray-800">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Question</h4>
                        <p className="text-base md:text-lg font-serif font-medium leading-relaxed border-l-4 border-gray-300 pl-4">
                          {questionData?.text || <span className="text-gray-400 italic">(Question text not available for this result)</span>}
                        </p>
                      </div>

                      {/* 2) Marks Awarded (Detailed) */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Marks Awarded</h4>
                        <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                          {Object.entries(qResult.aos).map(([ao, score]) => (
                            <div key={ao} className="bg-gray-50 border border-gray-200 px-3 py-1 rounded font-mono">
                              <span className="font-bold text-gray-700">{ao}:</span> {score}
                            </div>
                          ))}
                          <div className="ml-auto font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded">
                            Total: {qResult.score} / {qResult.maxScore}
                          </div>
                        </div>
                      </div>

                      {/* 3) Student Answer - FULL VISIBILITY ENFORCED */}
                      <div>
                        {/* Image Display for Visual Prompts */}
                        {/* Image Display for Visual Prompts */}
                        {questionData?.images && (
                          <div className="max-w-md rounded-lg overflow-hidden border border-gray-200 shadow-sm mb-6">
                            <img
                              src={questionData.images[typeof studentAnswerData?.selectedImageIndex === 'number' ? studentAnswerData.selectedImageIndex : 0]}
                              alt="Prompt Image"
                              className="w-full h-auto object-cover max-h-64"
                            />
                          </div>
                        )}

                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          Your Answer <span className="text-gray-300">|</span> {studentAnswerText ? studentAnswerText.split(/\s+/).length : 0} words
                        </h4>
                        {/* CRITICAL: whitespace-pre-wrap ensures newlines are respected, break-words prevents overflow, h-auto ensures expansion */}
                        <div className="w-full bg-blue-50/30 border border-blue-100 rounded-lg p-4 md:p-6 lg:p-8 font-serif text-gray-800 text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words h-auto overflow-visible">
                          {studentAnswerText || <span className="text-gray-400 italic">(No answer text available for this result)</span>}
                        </div>
                      </div>

                      {/* 4) Model Answer - FULL VISIBILITY ENFORCED */}
                      <div className="pt-2">
                        <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2 bg-green-50 w-fit px-2 py-1 rounded border border-green-100">
                          Model Answer / Suggested Response
                        </h4>
                        <div className="w-full bg-green-50/20 border border-green-100 rounded-lg p-4 md:p-6 lg:p-8 font-serif text-gray-800 text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words h-auto overflow-visible">
                          {qResult.modelAnswer?.replace(/^(Prompt \d:|Option \d:|Image \d:)\s*/i, '')}
                        </div>
                      </div>

                      {/* 5) Examiner Feedback */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Examiner Feedback</h4>
                        <div className="bg-yellow-50 rounded-lg p-4 md:p-6 border border-yellow-100 text-gray-800 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                          {qResult.feedback}
                        </div>
                      </div>

                      {/* 6) Comparison Highlights */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detailed Comparison</h4>
                        <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                          {qResult.comparisonPoints.map((point, i) => (
                            <div key={i} className="flex items-start gap-3 text-xs md:text-sm p-3 rounded bg-gray-50 border border-gray-100">
                              <div className="mt-0.5 shrink-0">
                                {point.type === 'strength' && <CheckCircle className="text-green-600" size={16} />}
                                {point.type === 'weakness' && <XCircle className="text-red-500" size={16} />}
                                {point.type === 'missing' && <div className="w-4 h-4 rounded-full border-2 border-orange-400 flex items-center justify-center text-[10px] font-bold text-orange-500">M</div>}
                                {point.type === 'improvement' && <ArrowUp className="text-blue-500" size={16} />}
                              </div>
                              <span className="text-gray-700 leading-relaxed">{point.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Source Materials Section */}
          {paper?.sources && paper.sources.length > 0 && (
            <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 print:shadow-none print:border-none print:px-0 print:block break-inside-avoid">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Source Materials</h2>
              <div className="space-y-8">
                {paper.sources.map((source) => (
                  <div key={source.id} className="prose max-w-none">
                    <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">
                      Source {source.id}: {source.title} <span className="text-sm font-normal text-gray-500">by {source.author} ({source.year})</span>
                    </h3>
                    <div className="font-serif p-6 bg-gray-50 rounded-lg text-gray-800 leading-relaxed whitespace-pre-wrap border border-gray-100 print:bg-white print:border-none print:p-0 text-justify">
                      {source.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12 text-center print:hidden pb-12">
            <button onClick={scrollToTop} className="inline-flex items-center gap-2 text-gray-500 hover:text-edexcel-blue font-medium transition-colors p-4 bg-white rounded-full shadow-sm border border-gray-200">
              <ArrowUp size={20} /> Back to Top
            </button>
          </div>
        </main>

        {/* Floating Back to Top for Mobile */}
        <button
          onClick={scrollToTop}
          className={`fixed bottom-6 right-6 z-50 p-3 bg-edexcel-blue text-white rounded-full shadow-xl hover:bg-edexcel-dark transition-all duration-300 md:hidden ${showBackToTop ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
        >
          <ArrowUp size={24} />
        </button>
      </div>
    </div>
  );
};

export default ResultsDashboard;