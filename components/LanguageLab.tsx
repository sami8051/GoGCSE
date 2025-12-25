import React, { useState, useMemo, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { ArrowLeft, Search, PenTool, CheckCircle, AlertCircle, Sparkles, BookOpen, GraduationCap, ChevronDown, ChevronUp, Lightbulb, Quote, Target, Lock } from 'lucide-react';

import { auth, saveLabSession, db, ADMIN_EMAILS } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
interface LanguageLabProps {
    onHome: () => void;
}

type Tab = 'learn' | 'analyzer' | 'gym';
type KnowledgeCategory = 'techniques' | 'grammar' | 'writing';

interface KnowledgeItem {
    name: string;
    definition: string;
    example: string;
    literarySource?: string;
    examTip: string;
    level: 'foundation' | 'intermediate' | 'advanced';
}

// Knowledge Base Data
const knowledgeBase: Record<KnowledgeCategory, { title: string; description: string; items: KnowledgeItem[] }> = {
    techniques: {
        title: 'Language Techniques',
        description: 'Master the literary and rhetorical devices used by writers to create meaning and effect.',
        items: [
            { name: 'Metaphor', definition: 'A direct comparison stating one thing IS another, without using "like" or "as".', example: '"Life is a journey with many winding roads."', literarySource: 'Common in Shakespeare and Romantic poetry', examTip: 'Always explain the effect—what does the comparison suggest about the subject?', level: 'foundation' },
            { name: 'Simile', definition: 'A comparison using "like" or "as" to show similarity between two different things.', example: '"Her smile was like sunshine breaking through clouds."', literarySource: 'Dickens uses extended similes in Great Expectations', examTip: 'Identify what quality is being compared and why the writer chose that image.', level: 'foundation' },
            { name: 'Personification', definition: 'Giving human qualities, emotions, or actions to non-human things or abstract concepts.', example: '"The wind whispered secrets through the trees."', literarySource: 'Shelley\'s "Ozymandias" personifies the desert', examTip: 'Consider why the writer wants readers to see the object as alive or conscious.', level: 'foundation' },
            { name: 'Alliteration', definition: 'Repetition of the same consonant sound at the beginning of nearby words.', example: '"Peter Piper picked a peck of pickled peppers."', literarySource: 'Anglo-Saxon poetry like Beowulf relies heavily on alliteration', examTip: 'Link the sound to the mood—harsh sounds for tension, soft sounds for calm.', level: 'foundation' },
            { name: 'Pathetic Fallacy', definition: 'Using weather or nature to reflect the emotional state of characters or the mood of a scene.', example: '"The storm raged as her anger reached its peak."', literarySource: 'Brontë uses storms in Wuthering Heights to mirror passion', examTip: 'This is a specific type of personification—always link weather to emotion.', level: 'intermediate' },
            { name: 'Onomatopoeia', definition: 'Words that phonetically imitate the sound they describe.', example: '"The bees buzzed lazily around the hive."', literarySource: 'War poetry uses onomatopoeia for battlefield sounds', examTip: 'Explain how the sound word creates a sensory, immersive experience.', level: 'foundation' },
            { name: 'Oxymoron', definition: 'Two contradictory terms placed together to create a paradoxical effect.', example: '"The silence was deafening."', literarySource: 'Romeo and Juliet: "loving hate" and "heavy lightness"', examTip: 'Show how the contradiction reveals complexity or tension in meaning.', level: 'intermediate' },
            { name: 'Hyperbole', definition: 'Deliberate and obvious exaggeration for emphasis or dramatic effect.', example: '"I\'ve told you a million times!"', literarySource: 'Common in satirical writing and comedy', examTip: 'Consider whether it creates humour, emphasises emotion, or makes a point.', level: 'foundation' },
            { name: 'Sibilance', definition: 'Repetition of "s", "sh", "z" sounds to create a hissing effect.', example: '"The snake slithered silently through the shadows."', literarySource: 'Often used to create menacing or secretive atmospheres', examTip: 'Link sibilance to the mood—often sinister, seductive, or soothing.', level: 'intermediate' },
            { name: 'Juxtaposition', definition: 'Placing two contrasting elements side by side to highlight their differences.', example: '"It was the best of times, it was the worst of times."', literarySource: 'Dickens\' A Tale of Two Cities opening', examTip: 'Explain what the contrast reveals about themes or characters.', level: 'intermediate' },
            { name: 'Anaphora', definition: 'Repetition of a word or phrase at the beginning of successive clauses or sentences.', example: '"We shall fight on the beaches, we shall fight on the landing grounds, we shall fight..."', literarySource: 'Churchill\'s WWII speeches; Martin Luther King\'s "I Have a Dream"', examTip: 'Shows emphasis and builds rhetorical power—great for speeches.', level: 'advanced' },
            { name: 'Epistrophe', definition: 'Repetition of a word or phrase at the END of successive clauses.', example: '"See no evil, hear no evil, speak no evil."', literarySource: 'Lincoln\'s Gettysburg Address: "of the people, by the people, for the people"', examTip: 'Creates rhythm and reinforces a key concept at clause endings.', level: 'advanced' },
            { name: 'Tricolon', definition: 'A series of three parallel elements (the "rule of three") for emphasis and rhythm.', example: '"Veni, vidi, vici" (I came, I saw, I conquered)', literarySource: 'Used extensively in political rhetoric and advertising', examTip: 'Three elements feel complete and memorable—identify why these three.', level: 'intermediate' },
            { name: 'Asyndeton', definition: 'Omitting conjunctions between words or clauses to create pace and urgency.', example: '"I came, I saw, I conquered."', literarySource: 'Caesar\'s famous quote demonstrates power through brevity', examTip: 'Creates speed and directness—often shows confidence or urgency.', level: 'advanced' },
            { name: 'Polysyndeton', definition: 'Using many conjunctions (and, or, but) in quick succession for effect.', example: '"And the rain fell and the wind blew and the night grew darker."', literarySource: 'Biblical prose and Hemingway\'s writing style', examTip: 'Slows pace, suggests overwhelming accumulation or relentlessness.', level: 'advanced' },
            { name: 'Chiasmus', definition: 'A reversal of grammatical structures in successive phrases (AB, BA pattern).', example: '"Ask not what your country can do for you, ask what you can do for your country."', literarySource: 'JFK\'s inaugural address; common in Shakespeare', examTip: 'The reversal creates balance and makes ideas memorable.', level: 'advanced' },
            { name: 'Antithesis', definition: 'Contrasting ideas expressed in balanced, parallel grammatical structures.', example: '"To err is human; to forgive, divine."', literarySource: 'Pope\'s "Essay on Criticism"; Milton\'s Paradise Lost', examTip: 'Different from juxtaposition—antithesis requires parallel structure.', level: 'advanced' },
            { name: 'Euphemism', definition: 'A milder or indirect word substituted for one considered harsh or blunt.', example: '"He passed away" instead of "He died"', literarySource: 'Political and corporate language often uses euphemisms', examTip: 'Consider what is being hidden or softened, and why.', level: 'intermediate' },
            { name: 'Litotes', definition: 'Understatement using double negatives or negating the opposite.', example: '"She\'s not unattractive" (meaning she is attractive)', literarySource: 'Common in British humour and Old English poetry', examTip: 'Often creates irony or understated emphasis.', level: 'advanced' },
            { name: 'Synecdoche', definition: 'A part represents the whole, or the whole represents a part.', example: '"All hands on deck!" (hands = sailors)', literarySource: 'Shakespeare: "lend me your ears" (ears = attention)', examTip: 'Identify what part/whole relationship exists and its effect.', level: 'advanced' },
            { name: 'Metonymy', definition: 'Substituting the name of something with something closely associated.', example: '"The Crown" for the monarchy; "Wall Street" for finance', literarySource: 'Common in journalism and political writing', examTip: 'Different from synecdoche—metonymy is association, not part/whole.', level: 'advanced' },
            { name: 'Zeugma', definition: 'A figure of speech where one word (usually a verb or adjective) applies to multiple words in different senses.', example: '"She lowered her standards and her neckline."', literarySource: 'Pope\'s "The Rape of the Lock" and Dickens use zeugma for wit', examTip: 'Creates surprising connections or humour—often used for satirical effect.', level: 'advanced' },
            { name: 'Anadiplosis', definition: 'Repetition of the last word of one clause at the beginning of the next clause.', example: '"Fear leads to anger. Anger leads to hate. Hate leads to suffering."', literarySource: 'Yoda in Star Wars; also found in biblical and classical texts', examTip: 'Creates a chain of logic or escalation—shows cause and effect.', level: 'advanced' },
            { name: 'Enjambment', definition: 'In poetry, continuing a sentence beyond the end of a line without pause.', example: '"I wandered lonely as a cloud / That floats on high..."', literarySource: 'Wordsworth\'s "Daffodils" uses enjambment throughout', examTip: 'Creates flow, urgency, or highlights the word at line breaks.', level: 'intermediate' },
            { name: 'Caesura', definition: 'A strong pause within a line of poetry, often marked by punctuation.', example: '"To be, or not to be. || That is the question."', literarySource: 'Shakespeare uses caesura for dramatic emphasis', examTip: 'The pause creates emphasis—what comes before/after the break?', level: 'intermediate' },
        ]
    },
    grammar: {
        title: 'Grammar Essentials',
        description: 'Essential grammatical knowledge for accurate writing and language analysis.',
        items: [
            { name: 'Simple Sentence', definition: 'A sentence containing one independent clause with a subject and verb.', example: '"The dog barked."', examTip: 'Simple sentences create impact through directness and clarity.', level: 'foundation' },
            { name: 'Compound Sentence', definition: 'Two independent clauses joined by a coordinating conjunction (FANBOYS: for, and, nor, but, or, yet, so).', example: '"I wanted to go, but the weather was terrible."', examTip: 'Shows equal importance between two connected ideas.', level: 'foundation' },
            { name: 'Complex Sentence', definition: 'An independent clause joined with one or more dependent clauses using subordinating conjunctions.', example: '"Although it was raining, we went for a walk."', examTip: 'The main clause holds the key idea; subordinate clauses add detail.', level: 'foundation' },
            { name: 'Minor Sentence', definition: 'A sentence fragment used deliberately for effect, lacking subject or verb.', example: '"Silence. Complete, utter silence."', examTip: 'Creates drama, emphasis, or mimics natural speech patterns.', level: 'intermediate' },
            { name: 'Active Voice', definition: 'The subject performs the action of the verb directly.', example: '"The cat chased the mouse."', examTip: 'Active voice is direct and engaging—preferred in most writing.', level: 'foundation' },
            { name: 'Passive Voice', definition: 'The subject receives the action; the doer may be omitted or follow "by".', example: '"The mouse was chased by the cat."', examTip: 'Creates formality, shifts focus to receiver, or obscures responsibility.', level: 'intermediate' },
            { name: 'First Person Narrative', definition: 'Using "I" to tell the story from the narrator\'s perspective.', example: '"I walked into the room and immediately sensed danger."', examTip: 'Creates intimacy and subjectivity—we see only what the narrator knows.', level: 'foundation' },
            { name: 'Third Person Limited', definition: 'Using "he/she/they" but limited to one character\'s thoughts and perceptions.', example: '"She wondered what he was thinking as he stared out the window."', examTip: 'Balances intimacy with objectivity—common in modern fiction.', level: 'intermediate' },
            { name: 'Third Person Omniscient', definition: 'An all-knowing narrator who can access any character\'s thoughts.', example: '"John didn\'t know that Mary had already left, but we know she was miles away."', examTip: 'Allows dramatic irony and broader perspective on events.', level: 'intermediate' },
            { name: 'Present Tense', definition: 'Action happening now; creates immediacy and tension.', example: '"I walk through the door. The room is empty."', examTip: 'Creates immediacy—common in modern literary fiction for tension.', level: 'foundation' },
            { name: 'Past Tense', definition: 'Action that has already happened; traditional narrative tense.', example: '"I walked through the door. The room was empty."', examTip: 'The default for most storytelling—feels natural and established.', level: 'foundation' },
            { name: 'Imperative Mood', definition: 'Commands or instructions; verb at the start, often with implied "you".', example: '"Stop right there!" "Consider the evidence."', examTip: 'Creates authority, urgency, or direct reader engagement.', level: 'intermediate' },
            { name: 'Interrogative', definition: 'Questions used to engage the reader or create uncertainty.', example: '"What would you do in this situation?"', examTip: 'Rhetorical questions don\'t need answers—they make readers think.', level: 'foundation' },
            { name: 'Modal Verbs', definition: 'Verbs expressing possibility, necessity, or obligation (can, could, may, might, must, shall, should, will, would).', example: '"You should consider the consequences."', examTip: 'Different modals show different levels of certainty or obligation.', level: 'intermediate' },
            { name: 'Noun Phrase', definition: 'A group of words centred on a noun, providing more detail.', example: '"The old, weathered wooden door"', examTip: 'Extended noun phrases add detail and create vivid imagery.', level: 'intermediate' },
        ]
    },
    writing: {
        title: 'Writing Skills',
        description: 'Techniques for crafting effective creative and transactional writing.',
        items: [
            { name: 'Hook Opening', definition: 'Starting with something attention-grabbing to immediately engage the reader.', example: '"The day I died was the most interesting day of my life."', examTip: 'Start with action, dialogue, a question, or a striking statement.', level: 'foundation' },
            { name: 'In Medias Res', definition: 'Beginning a narrative in the middle of the action, rather than from the start.', example: 'Starting a story with a chase scene, then explaining how it began later.', examTip: 'Creates immediate tension and curiosity—avoid too much backstory.', level: 'intermediate' },
            { name: 'Cyclical Structure', definition: 'Ending where you began, creating a sense of completeness or irony.', example: 'Starting and ending with the same image or phrase, but with changed meaning.', examTip: 'Shows development or change—the same words mean something different by the end.', level: 'intermediate' },
            { name: 'Foreshadowing', definition: 'Hints or clues about what will happen later in the narrative.', example: '"Little did she know that this would be the last peaceful morning."', examTip: 'Creates tension and makes readers feel clever when the prediction pays off.', level: 'intermediate' },
            { name: 'Flashback', definition: 'Interrupting the narrative to show events from the past.', example: '"As she touched the old photograph, memories flooded back..."', examTip: 'Use sparingly and signal clearly—don\'t confuse the reader.', level: 'intermediate' },
            { name: 'Show Don\'t Tell', definition: 'Demonstrating emotions or situations through action and detail rather than stating them.', example: '"His hands trembled as he reached for the door" instead of "He was nervous."', examTip: 'Let readers infer emotions from physical details and actions.', level: 'foundation' },
            { name: 'Sensory Description', definition: 'Using all five senses (sight, sound, smell, taste, touch) to create vivid scenes.', example: '"The acrid smoke stung her eyes; somewhere, glass shattered."', examTip: 'Go beyond sight—sound, smell, and touch create immersive writing.', level: 'foundation' },
            { name: 'Pathetic Fallacy in Writing', definition: 'Using setting and weather to reflect character emotions or story mood.', example: 'A storm brewing as conflict increases; sunshine as hope returns.', examTip: 'Avoid clichés—find fresh ways to mirror emotion in environment.', level: 'intermediate' },
            { name: 'Dialogue', definition: 'Speech between characters that reveals personality and advances plot.', example: '"I never said I was sorry." She turned away. "Maybe that\'s the problem."', examTip: 'Each character should sound distinct. Use dialogue tags sparingly.', level: 'foundation' },
            { name: 'Paragraph for Effect', definition: 'Using paragraph length deliberately—short for impact, long for description.', example: 'A single-word paragraph: "Silence." after a long descriptive paragraph.', examTip: 'Vary paragraph length. Short paragraphs create drama and pace.', level: 'intermediate' },
            { name: 'Rhetorical Questions', definition: 'Questions that don\'t expect an answer, used to engage or persuade.', example: '"How many more lives must be lost before we act?"', examTip: 'Powerful in speeches and articles—make the reader think.', level: 'foundation' },
            { name: 'Direct Address', definition: 'Speaking directly to the reader using "you" to create engagement.', example: '"You might think this doesn\'t affect you. Think again."', examTip: 'Creates connection and makes arguments feel personal and urgent.', level: 'foundation' },
            { name: 'Statistics & Evidence', definition: 'Using facts, figures, and research to support arguments.', example: '"According to recent studies, 73% of teenagers..."', literarySource: 'Essential for Article, Speech, and Letter writing', examTip: 'Even in exams, you can create plausible statistics for effect.', level: 'foundation' },
            { name: 'Anecdote', definition: 'A short personal story used to illustrate a point or engage readers.', example: '"Last summer, I witnessed something that changed my perspective forever..."', examTip: 'Makes abstract arguments concrete and relatable.', level: 'intermediate' },
            { name: 'Counter-Argument', definition: 'Acknowledging opposing views before refuting them.', example: '"Some argue that... However, this ignores the fact that..."', examTip: 'Shows balanced thinking and strengthens your argument.', level: 'intermediate' },
            { name: 'Emotive Language', definition: 'Words chosen to provoke an emotional response from the reader.', example: '"innocent children", "brutal attack", "heroic sacrifice"', examTip: 'Powerful in persuasive writing but use judiciously—don\'t overdo it.', level: 'foundation' },
            { name: 'Formal Register', definition: 'Sophisticated vocabulary and complex sentences for professional contexts.', example: '"Furthermore, it is imperative that we consider..."', examTip: 'Use for letters to authorities, formal articles, and official speeches.', level: 'intermediate' },
            { name: 'Informal Register', definition: 'Conversational tone with contractions and colloquial language.', example: '"Let\'s be honest—we\'ve all been there, haven\'t we?"', examTip: 'Use for friendly letters, blogs, or when connecting with peers.', level: 'intermediate' },
        ]
    }
};

const LanguageLab: React.FC<LanguageLabProps> = ({ onHome }) => {
    const [activeTab, setActiveTab] = useState<Tab>('learn');
    const [inputText, setInputText] = useState('');
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Knowledge Base state
    const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory>('techniques');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [levelFilter, setLevelFilter] = useState<'all' | 'foundation' | 'intermediate' | 'advanced'>('all');

    // Gym state
    const [selectedMethod, setSelectedMethod] = useState('Metaphor');
    const [practiceText, setPracticeText] = useState('');
    const [evaluationResult, setEvaluationResult] = useState<any>(null);
    const [gymCategory, setGymCategory] = useState<'techniques' | 'writing'>('techniques');

    // User approval state
    const [isApproved, setIsApproved] = useState(true); // Default to true, check on mount

    // Check user approval status on mount
    useEffect(() => {
        const checkApproval = async () => {
            const user = auth.currentUser;
            if (!user) {
                setIsApproved(false);
                return;
            }
            // Admins are always approved
            if (ADMIN_EMAILS.includes(user.email || '')) {
                setIsApproved(true);
                return;
            }
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setIsApproved(userDoc.data().isApproved ?? false);
                } else {
                    setIsApproved(false);
                }
            } catch (error) {
                console.error("Failed to check approval status:", error);
                setIsApproved(false);
            }
        };
        checkApproval();
    }, []);

    const languageTechniques = [
        // Core Methods
        'Metaphor', 'Simile', 'Personification', 'Alliteration',
        'Pathetic Fallacy', 'Onomatopoeia', 'Oxymoron', 'Hyperbole',
        'Sibilance', 'Juxtaposition',
        // Advanced Methods
        'Anaphora', 'Epistrophe', 'Tricolon', 'Asyndeton', 'Polysyndeton',
        'Chiasmus', 'Antithesis', 'Euphemism', 'Litotes', 'Synecdoche',
        'Metonymy', 'Zeugma', 'Anadiplosis', 'Enjambment', 'Caesura'
    ];

    const writingSkills = [
        'Hook Opening', 'In Medias Res', 'Cyclical Structure', 'Foreshadowing',
        'Flashback', 'Show Don\'t Tell', 'Sensory Description', 'Pathetic Fallacy in Writing',
        'Dialogue', 'Paragraph for Effect', 'Rhetorical Questions', 'Direct Address',
        'Statistics & Evidence', 'Anecdote', 'Counter-Argument', 'Emotive Language',
        'Formal Register', 'Informal Register'
    ];

    const methods = gymCategory === 'techniques' ? languageTechniques : writingSkills;

    // Filter knowledge base items
    const filteredItems = useMemo(() => {
        const category = knowledgeBase[selectedCategory];
        return category.items.filter(item => {
            const matchesSearch = searchQuery === '' ||
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.definition.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesLevel = levelFilter === 'all' || item.level === levelFilter;
            return matchesSearch && matchesLevel;
        });
    }, [selectedCategory, searchQuery, levelFilter]);

    const toggleExpanded = (name: string) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'foundation': return 'bg-green-100 text-green-700 border-green-200';
            case 'intermediate': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'advanced': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const handleAnalyze = async () => {
        if (!inputText.trim()) return;
        setLoading(true);
        setAnalysisResult(null);
        try {
            const gemini = new GeminiService();
            const result = await gemini.analyzeTextForMethods(inputText);
            setAnalysisResult(result);
        } catch (error) {
            console.error(error);
            alert("Analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };



    const handleEvaluate = async () => {
        if (!practiceText.trim()) return;
        setLoading(true);
        setEvaluationResult(null);
        try {
            const gemini = new GeminiService();
            const result = await gemini.evaluateWritingPractice(practiceText, selectedMethod);
            setEvaluationResult(result);

            // Auto-save if user is logged in
            if (auth.currentUser) {
                saveLabSession(auth.currentUser.uid, selectedMethod, practiceText, result)
                    .then(() => console.log("Lab session saved"))
                    .catch(e => console.error("Failed to save lab session", e));
            }
        } catch (error) {
            console.error(error);
            alert("Evaluation failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <nav className="bg-white border-b border-gray-200 py-4 px-6 md:px-12 flex items-center gap-4 sticky top-0 z-10">
                <button
                    onClick={onHome}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center text-white font-serif font-bold">L</div>
                    <span className="font-bold text-lg text-gray-800">Language Lab</span>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-6 py-8">

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 md:gap-4 mb-8 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('learn')}
                        className={`pb-4 px-3 md:px-4 font-medium flex items-center gap-2 transition-colors border-b-2 text-sm md:text-base ${activeTab === 'learn'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <GraduationCap size={20} />
                        <span className="hidden sm:inline">Knowledge Base</span>
                        <span className="sm:hidden">Learn</span>
                    </button>
                    <button
                        onClick={() => {
                            if (!isApproved) {
                                alert('This section requires account approval. Please wait for admin approval.');
                                return;
                            }
                            setActiveTab('analyzer');
                        }}
                        disabled={!isApproved}
                        className={`pb-4 px-3 md:px-4 font-medium flex items-center gap-2 transition-colors border-b-2 text-sm md:text-base ${!isApproved
                            ? 'border-transparent text-gray-400 cursor-not-allowed'
                            : activeTab === 'analyzer'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Search size={20} />
                        <span className="hidden sm:inline">Method Analyzer</span>
                        <span className="sm:hidden">Analyze</span>
                        {!isApproved && <Lock size={14} />}
                    </button>
                    <button
                        onClick={() => {
                            if (!isApproved) {
                                alert('This section requires account approval. Please wait for admin approval.');
                                return;
                            }
                            setActiveTab('gym');
                        }}
                        disabled={!isApproved}
                        className={`pb-4 px-3 md:px-4 font-medium flex items-center gap-2 transition-colors border-b-2 text-sm md:text-base ${!isApproved
                            ? 'border-transparent text-gray-400 cursor-not-allowed'
                            : activeTab === 'gym'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <PenTool size={20} />
                        <span className="hidden sm:inline">Writer's Gym</span>
                        <span className="sm:hidden">Practice</span>
                        {!isApproved && <Lock size={14} />}
                    </button>
                </div>

                {activeTab === 'learn' ? (
                    <div className="space-y-6">
                        {/* Category Tabs */}
                        <div className="flex flex-wrap gap-3">
                            {(Object.keys(knowledgeBase) as KnowledgeCategory[]).map(cat => {
                                // Only 'techniques' is accessible for unapproved users
                                const isRestricted = !isApproved && (cat === 'grammar' || cat === 'writing');

                                return (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            if (isRestricted) {
                                                alert('This section requires account approval. Please wait for admin approval.');
                                                return;
                                            }
                                            setSelectedCategory(cat);
                                            setSearchQuery('');
                                        }}
                                        disabled={isRestricted}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${isRestricted
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                            : selectedCategory === cat
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                                            }`}
                                    >
                                        {isRestricted && <Lock size={14} />}
                                        {knowledgeBase[cat].title}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Category Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
                            <h2 className="text-2xl font-bold mb-2">{knowledgeBase[selectedCategory].title}</h2>
                            <p className="text-indigo-100">{knowledgeBase[selectedCategory].description}</p>
                        </div>

                        {/* Search and Filter */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search techniques, definitions..."
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex gap-2">
                                {(['all', 'foundation', 'intermediate', 'advanced'] as const).map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setLevelFilter(level)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${levelFilter === level
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Results count */}
                        <p className="text-sm text-gray-500">
                            Showing {filteredItems.length} of {knowledgeBase[selectedCategory].items.length} items
                        </p>

                        {/* Knowledge Items */}
                        <div className="space-y-4">
                            {filteredItems.map((item) => {
                                const isExpanded = expandedItems.has(item.name);
                                return (
                                    <div
                                        key={item.name}
                                        className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                                    >
                                        <button
                                            onClick={() => toggleExpanded(item.name)}
                                            className="w-full p-5 flex items-start justify-between text-left"
                                        >
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${getLevelColor(item.level)}`}>
                                                        {item.level}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 text-sm">{item.definition}</p>
                                            </div>
                                            <div className="ml-4 mt-1 text-gray-400">
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="px-5 pb-5 pt-0 space-y-4 border-t border-gray-100">
                                                {/* Example */}
                                                <div className="bg-slate-50 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 text-slate-600 font-medium text-sm mb-2">
                                                        <Quote size={16} />
                                                        Example
                                                    </div>
                                                    <p className="text-slate-800 font-serif italic">{item.example}</p>
                                                </div>

                                                {/* Literary Source */}
                                                {item.literarySource && (
                                                    <div className="bg-purple-50 rounded-lg p-4">
                                                        <div className="flex items-center gap-2 text-purple-700 font-medium text-sm mb-1">
                                                            <BookOpen size={16} />
                                                            Found in Literature
                                                        </div>
                                                        <p className="text-purple-800 text-sm">{item.literarySource}</p>
                                                    </div>
                                                )}

                                                {/* Exam Tip */}
                                                <div className="bg-amber-50 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-1">
                                                        <Lightbulb size={16} />
                                                        Exam Tip
                                                    </div>
                                                    <p className="text-amber-800 text-sm">{item.examTip}</p>
                                                </div>

                                                {/* Practice Button */}
                                                <button
                                                    onClick={() => { setActiveTab('gym'); setSelectedMethod(item.name); }}
                                                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
                                                >
                                                    <Target size={16} />
                                                    Practice using {item.name} in Writer's Gym →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {filteredItems.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No items match your search. Try adjusting your filters.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'analyzer' ? (
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <BookOpen size={20} className="text-indigo-600" />
                                    Input Text
                                </h2>
                                <p className="text-gray-500 text-sm mb-4">
                                    Paste a paragraph from a book, article, or your own writing. AI will identify the language methods used.
                                </p>
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="The wind howled like a banshee, tearing through the trees..."
                                    className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-serif text-lg leading-relaxed"
                                />
                                <button
                                    onClick={handleAnalyze}
                                    disabled={loading || !inputText.trim()}
                                    className={`mt-4 w-full py-3 rounded-lg font-bold text-white transition-all ${loading || !inputText.trim()
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
                                        }`}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Sparkles className="animate-spin" size={18} /> Analyzing...
                                        </span>
                                    ) : (
                                        "Analyze Text"
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {analysisResult ? (
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
                                    <h2 className="text-xl font-bold text-gray-800 mb-4">Analysis Results</h2>

                                    <div className="mb-6 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                        <h3 className="font-bold text-indigo-900 mb-1">Summary</h3>
                                        <p className="text-indigo-800 text-sm">{analysisResult.summary}</p>
                                    </div>

                                    <div className="space-y-4">
                                        {analysisResult.methods.map((method: any, idx: number) => (
                                            <div key={idx} className="border-l-4 border-purple-500 pl-4 py-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-sm">
                                                        {method.name}
                                                    </span>
                                                </div>
                                                <p className="text-gray-800 font-serif italic mb-2">"{method.quote}"</p>
                                                <p className="text-gray-600 text-sm">{method.effect}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                    <Search size={48} className="mb-4 opacity-20" />
                                    <p>Enter text and click Analyze to see the breakdown of language methods.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <PenTool size={20} className="text-indigo-600" />
                                    Practice Area
                                </h2>

                                {/* Gym Category Tabs */}
                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={() => { setGymCategory('techniques'); setSelectedMethod('Metaphor'); }}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${gymCategory === 'techniques'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Language Techniques
                                    </button>
                                    <button
                                        onClick={() => { setGymCategory('writing'); setSelectedMethod('Hook Opening'); }}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${gymCategory === 'writing'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Writing Skills
                                    </button>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {gymCategory === 'techniques' ? 'Target Technique' : 'Target Skill'}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {methods.map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setSelectedMethod(m)}
                                                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${selectedMethod === m
                                                    ? 'bg-indigo-600 text-white font-medium'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                                    <p className="text-yellow-800 text-sm">
                                        <strong>Challenge:</strong> {gymCategory === 'techniques'
                                            ? <>Write a sentence or short paragraph using <u>{selectedMethod}</u>.</>
                                            : <>Practice <u>{selectedMethod}</u> by writing a short example.</>
                                        }
                                    </p>
                                </div>

                                <textarea
                                    value={practiceText}
                                    onChange={(e) => setPracticeText(e.target.value)}
                                    placeholder={gymCategory === 'techniques'
                                        ? `Write something using a ${selectedMethod}...`
                                        : `Practice ${selectedMethod} here...`}
                                    className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-serif text-lg"
                                />

                                <button
                                    onClick={handleEvaluate}
                                    disabled={loading || !practiceText.trim()}
                                    className={`mt-4 w-full py-3 rounded-lg font-bold text-white transition-all ${loading || !practiceText.trim()
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
                                        }`}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Sparkles className="animate-spin" size={18} /> Checking...
                                        </span>
                                    ) : (
                                        "Check My Writing"
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {evaluationResult ? (
                                <div className={`p-6 rounded-xl shadow-sm border ${evaluationResult.success ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                                    }`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        {evaluationResult.success ? (
                                            <CheckCircle className="text-green-600" size={32} />
                                        ) : (
                                            <AlertCircle className="text-orange-600" size={32} />
                                        )}
                                        <h2 className={`text-xl font-bold ${evaluationResult.success ? 'text-green-800' : 'text-orange-800'
                                            }`}>
                                            {evaluationResult.success ? 'Great Job!' : 'Keep Trying'}
                                        </h2>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-bold text-gray-900 mb-1">Feedback</h3>
                                            <p className="text-gray-700">{evaluationResult.feedback}</p>
                                        </div>

                                        <div className="bg-white/50 p-4 rounded-lg">
                                            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                                <Sparkles size={16} className="text-yellow-600" />
                                                Tip for Improvement
                                            </h3>
                                            <p className="text-gray-700 italic">{evaluationResult.improvementTip}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                    <PenTool size={48} className="mb-4 opacity-20" />
                                    <p>Write your text and click Check to see if you used the method effectively.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LanguageLab;
