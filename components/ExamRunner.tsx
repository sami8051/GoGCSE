import React, { useState, useEffect } from 'react';
import { ExamPaper, Question, StudentAnswer } from '../types';
import SourcePanel from './SourcePanel';
import { Clock, BookOpen, Grid, Save, Flag, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, X, LogOut } from 'lucide-react';

interface ExamRunnerProps {
  paper: ExamPaper;
  onFinish: (answers: Record<string, StudentAnswer>, duration: number) => void;
  onDiscard: () => void;
}

const ExamRunner: React.FC<ExamRunnerProps> = ({ paper, onFinish, onDiscard }) => {
  // Filter questions for navigation - we want to show optional groups as a single "step" or handle selection
  // Current approach: Show all questions, but visually group mutually exclusive ones.
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [showSources, setShowSources] = useState(true);
  const [timeLeft, setTimeLeft] = useState(paper.timeLimitMinutes * 60);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [showQuestionNav, setShowQuestionNav] = useState(false);

  // For Questions with options (Grouped), track which one is "active" for the user
  // We derive this from the answers or default to the first in the group
  const [selectedOptionalQuestions, setSelectedOptionalQuestions] = useState<Record<string, string>>({});

  // Initialize and Load Autosave
  useEffect(() => {
    const saved = localStorage.getItem(`exam_draft_${paper.id}`);
    if (saved) {
      const parsedAnswers = JSON.parse(saved);
      setAnswers(parsedAnswers);

      // Restore selected options based on where answers exist
      const newSelectedOptions: Record<string, string> = {};
      paper.questions.forEach(q => {
        if (q.optionalGroup && parsedAnswers[q.id]?.text) {
          newSelectedOptions[q.optionalGroup] = q.id;
        }
      });
      setSelectedOptionalQuestions(prev => ({ ...prev, ...newSelectedOptions }));
    } else {
      const initialAnswers: Record<string, StudentAnswer> = {};
      paper.questions.forEach(q => {
        // Initialize all, but we will filter empty ones on submit
        initialAnswers[q.id] = { questionId: q.id, text: '', timestamp: Date.now(), isFlagged: false };
      });
      setAnswers(initialAnswers);
    }
  }, [paper]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = paper.questions[currentQuestionIndex];

  // Logic for EITHER/OR questions
  const isOptionalGroup = !!currentQuestion.optionalGroup;
  // If this question is part of a group, is it the selected one?
  const groupSelection = isOptionalGroup ? selectedOptionalQuestions[currentQuestion.optionalGroup!] : null;
  // If no selection made yet for this group, default to current (but don't enforce until interaction)

  // Handle Selection of Option
  const selectOption = (qId: string, group: string) => {
    setSelectedOptionalQuestions(prev => ({ ...prev, [group]: qId }));
    // When switching, we might want to jump to that question index if they are adjacent
    const newIndex = paper.questions.findIndex(q => q.id === qId);
    if (newIndex !== -1) setCurrentQuestionIndex(newIndex);
  };

  const currentAnswer = answers[currentQuestion.id]?.text || '';

  const handleAnswerChange = (text: string) => {
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: {
        ...answers[currentQuestion.id],
        text,
        timestamp: Date.now()
      }
    };

    // If typing in an optional question, auto-select it as the choice for that group
    if (currentQuestion.optionalGroup) {
      setSelectedOptionalQuestions(prev => ({ ...prev, [currentQuestion.optionalGroup!]: currentQuestion.id }));

      // Clear answer of the OTHER option in the group to avoid ambiguity?
      // For now, we just keep it but submission logic filters it out.
    }

    setAnswers(newAnswers);
    localStorage.setItem(`exam_draft_${paper.id}`, JSON.stringify(newAnswers));
  };

  const handleImageSelect = (index: number) => {
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: {
        ...answers[currentQuestion.id],
        selectedImageIndex: index,
        timestamp: Date.now()
      }
    };
    setAnswers(newAnswers);
  };

  const handleFlag = () => {
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: {
        ...answers[currentQuestion.id],
        isFlagged: !answers[currentQuestion.id].isFlagged
      }
    };
    setAnswers(newAnswers);
    localStorage.setItem(`exam_draft_${paper.id}`, JSON.stringify(newAnswers));
  };

  const wordCount = currentAnswer.trim().split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Sources Drawer */}
      <SourcePanel
        sources={paper.sources}
        isOpen={showSources}
        onToggle={() => setShowSources(!showSources)}
      />

      {/* Main Exam Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showSources ? 'md:ml-[45%] lg:ml-[45%]' : ''}`}>

        {/* Disclaimer Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 lg:px-6 py-3 flex gap-2 items-start">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-medium">This is a practice exam. Grades are AI-generated estimates and not official qualifications. Use for revision purposes only.</p>
        </div>

        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSources(!showSources)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${showSources ? 'bg-edexcel-dark text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <BookOpen size={16} />
              <span className="hidden sm:inline">{showSources ? 'Hide Sources' : 'Show Sources'}</span>
            </button>
            <button
              onClick={() => setShowQuestionNav(!showQuestionNav)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <Grid size={20} />
            </button>
            <div className="hidden lg:block">
              <h1 className="text-sm font-bold text-gray-800">{paper.title}</h1>
              <span className="text-xs text-gray-500">Specimen 1EN0 • {paper.timeLimitMinutes} mins</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-edexcel-dark'}`}>
              <Clock size={20} />
              {formatTime(timeLeft)}
            </div>

            <button
              onClick={() => setIsDiscardModalOpen(true)}
              className="px-3 md:px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-md font-bold text-xs md:text-sm transition-all flex items-center gap-2"
              title="Leave & Discard Progress"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Leave Exam</span>
            </button>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="bg-edexcel-blue hover:bg-edexcel-dark text-white px-4 md:px-6 py-2 rounded-md font-bold text-xs md:text-sm shadow-sm transition-transform active:scale-95"
            >
              Finish & Submit
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">

          {/* Question Navigator */}
          <div className={`${showQuestionNav ? 'absolute inset-y-0 left-0 w-64 bg-white shadow-xl z-30 transform translate-x-0' : 'hidden lg:flex lg:w-20 lg:flex-col lg:items-center lg:border-r lg:bg-gray-50 lg:py-4'} transition-transform duration-200 overflow-y-auto`}>
            <div className="w-full px-4 lg:px-2 space-y-2 pb-20 pt-4 lg:pt-0">
              <div className="flex justify-between items-center lg:hidden mb-4 px-2">
                <h3 className="font-bold text-gray-500">Questions</h3>
                <button onClick={() => setShowQuestionNav(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {paper.questions.map((q, idx) => {
                const ans = answers[q.id];
                const isActive = idx === currentQuestionIndex;
                const isAnswered = ans?.text.length > 5;
                const isFlagged = ans?.isFlagged;

                // Visual Grouping for Optional Questions
                const isGroupStart = q.optionalGroup && (!paper.questions[idx - 1]?.optionalGroup || paper.questions[idx - 1].optionalGroup !== q.optionalGroup);
                const isGroupEnd = q.optionalGroup && (!paper.questions[idx + 1]?.optionalGroup || paper.questions[idx + 1].optionalGroup !== q.optionalGroup);
                const isSelectedInGroup = q.optionalGroup ? selectedOptionalQuestions[q.optionalGroup] === q.id : true;
                const isDimmed = q.optionalGroup && selectedOptionalQuestions[q.optionalGroup] && !isSelectedInGroup;

                return (
                  <div key={q.id}>
                    {isGroupStart && <div className="text-[10px] text-center uppercase font-bold text-gray-400 mt-2 mb-1">OR</div>}
                    <button
                      onClick={() => {
                        setCurrentQuestionIndex(idx);
                        setShowQuestionNav(false);
                        if (q.optionalGroup) selectOption(q.id, q.optionalGroup);
                      }}
                      className={`w-full lg:w-12 lg:h-12 flex items-center lg:justify-center px-4 py-3 lg:p-0 rounded-lg text-left lg:text-center text-sm font-bold transition-all
                          ${isActive ? 'bg-edexcel-blue text-white shadow-md ring-2 ring-blue-300' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}
                          ${isFlagged ? 'ring-2 ring-orange-400' : ''}
                          ${isAnswered && !isActive ? 'bg-blue-50 border-blue-200 text-edexcel-dark' : ''}
                          ${isDimmed ? 'opacity-40 grayscale' : ''}
                        `}
                    >
                      <span className="lg:hidden mr-2">Question</span>
                      {q.number}
                      {isFlagged && <Flag size={10} className="ml-auto lg:absolute lg:top-1 lg:right-1 text-orange-500" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Question Area */}
          <main className="flex-1 overflow-y-auto bg-gray-100 p-3 md:p-4 lg:p-8">
            <div className="max-w-4xl mx-auto pb-20">

              {/* Optional Group Selection Banner */}
              {isOptionalGroup && (
                <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-purple-600" size={24} />
                    <div>
                      <h3 className="font-bold text-gray-900">Choice of Question</h3>
                      <p className="text-sm text-gray-600">You must answer EITHER Question {paper.questions.filter(q => q.optionalGroup === currentQuestion.optionalGroup)[0].number} OR Question {paper.questions.filter(q => q.optionalGroup === currentQuestion.optionalGroup)[1].number}.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {paper.questions.filter(q => q.optionalGroup === currentQuestion.optionalGroup).map(q => (
                      <button
                        key={q.id}
                        onClick={() => selectOption(q.id, q.optionalGroup!)}
                        className={`px-4 py-2 rounded text-sm font-bold border ${selectedOptionalQuestions[q.optionalGroup!] === q.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      >
                        Q{q.number}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Question Card */}
              <div className={`bg-white rounded-xl shadow-sm border transition-opacity duration-300 ${isOptionalGroup && groupSelection && groupSelection !== currentQuestion.id ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100 border-gray-200'}`}>

                {/* Header */}
                <div className="p-4 md:p-6 lg:p-10 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 md:gap-3 mb-2">
                        <span className="bg-edexcel-dark text-white px-3 py-1 rounded text-xs md:text-sm font-bold shadow-sm">
                          Question {currentQuestion.number}
                        </span>
                        {isOptionalGroup && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider">Option</span>}
                      </div>
                      <div className="text-xs md:text-sm font-medium text-gray-500">
                        {currentQuestion.marks} Marks • {currentQuestion.aos.join(', ')}
                      </div>
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-100 px-2 py-1 rounded">
                      Section {currentQuestion.section}
                    </span>
                  </div>

                  {currentQuestion.sourceRef && (
                    <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
                      <BookOpen className="text-edexcel-blue mt-0.5 shrink-0" size={18} />
                      <div className="text-xs md:text-sm text-edexcel-dark font-medium">
                        Refer to: {currentQuestion.sourceRef}
                      </div>
                    </div>
                  )}

                  <h2 className="text-lg md:text-xl lg:text-2xl font-serif text-gray-900 leading-relaxed">
                    {currentQuestion.text}
                  </h2>

                  {/* Image Prompts Logic */}
                  {currentQuestion.images && currentQuestion.images.length > 0 && (
                    <div className="mt-8">
                      <p className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Select an image prompt:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.images.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleImageSelect(idx)}
                            className={`relative group cursor-pointer rounded-lg overflow-hidden border-4 transition-all ${answers[currentQuestion.id]?.selectedImageIndex === idx ? 'border-edexcel-blue ring-4 ring-blue-100' : 'border-transparent hover:border-gray-300'}`}
                          >
                            <img src={imgUrl} alt={`Prompt ${idx + 1}`} className="w-full h-48 object-cover" />
                            <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-bold backdrop-blur-sm">
                              Option {idx + 1}
                            </div>
                            {answers[currentQuestion.id]?.selectedImageIndex === idx && (
                              <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center backdrop-blur-[1px]">
                                <CheckCircle className="text-white drop-shadow-md" size={48} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Answer Area */}
                <div className="relative">
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    className="w-full min-h-[400px] p-4 md:p-10 text-base md:text-lg leading-relaxed bg-white rounded-b-xl focus:bg-blue-50/30 outline-none resize-y font-serif"
                    placeholder={isOptionalGroup && groupSelection !== currentQuestion.id ? "You have selected the other option." : "Start typing your answer here..."}
                    spellCheck={false}
                    disabled={isOptionalGroup && groupSelection !== currentQuestion.id}
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-4 text-xs text-gray-400 font-sans pointer-events-none bg-white/80 p-2 rounded backdrop-blur">
                    <span className={answers[currentQuestion.id]?.text ? 'text-green-600 flex items-center gap-1' : 'opacity-0'}>
                      <Save size={12} /> Saved
                    </span>
                    <span>{wordCount} words {currentQuestion.wordCountTarget ? `/ ~${currentQuestion.wordCountTarget}` : ''}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex justify-between items-center pt-8">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="flex items-center gap-2 px-4 md:px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm text-sm md:text-base"
                >
                  <ChevronLeft size={20} /> <span className="hidden sm:inline">Previous</span>
                </button>

                <button
                  onClick={handleFlag}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded transition-colors ${answers[currentQuestion.id]?.isFlagged ? 'text-orange-600 bg-orange-50' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <Flag size={16} fill={answers[currentQuestion.id]?.isFlagged ? "currentColor" : "none"} />
                  {answers[currentQuestion.id]?.isFlagged ? 'Flagged' : 'Flag'}
                </button>

                <button
                  disabled={currentQuestionIndex === paper.questions.length - 1}
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  className="flex items-center gap-2 px-4 md:px-6 py-3 bg-edexcel-dark text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-sm text-sm md:text-base"
                >
                  <span className="hidden sm:inline">Next</span> <ChevronRight size={20} />
                </button>
              </div>

            </div>
          </main>
        </div>
      </div>

      {/* Submit Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-2 text-gray-900">Finish Exam?</h3>
            <p className="text-gray-600 mb-6">
              You are about to submit your assessment.
              <br />
              Note: Unanswered optional questions will be ignored.
            </p>

            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-100">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Answered</span>
                <span className="font-bold">{Object.values(answers).filter((a: StudentAnswer) => a.text.trim().length > 0).length} Questions</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-edexcel-blue"
                  style={{ width: `${(Object.values(answers).filter((a: StudentAnswer) => a.text.trim().length > 0).length / paper.questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="flex-1 py-3 text-gray-700 font-medium bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Return
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(`exam_draft_${paper.id}`);
                  const duration = (paper.timeLimitMinutes * 60) - timeLeft;
                  onFinish(answers, duration);
                }}
                className="flex-1 py-3 bg-edexcel-blue text-white font-bold rounded-lg hover:bg-edexcel-dark shadow-lg transition-colors"
              >
                Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Discard Modal */}
      {isDiscardModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-gray-900 text-center">Discard Exam?</h3>
            <p className="text-gray-600 mb-8 text-center">
              Are you sure you want to leave? All your progress and answers for this paper will be <strong>permanently deleted</strong>.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setIsDiscardModalOpen(false)}
                className="flex-1 py-3 text-gray-700 font-medium bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Stay & Continue
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(`exam_draft_${paper.id}`);
                  onDiscard();
                }}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg transition-colors"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamRunner;