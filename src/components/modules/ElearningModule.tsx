import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import {
  Laptop,
  BookOpen,
  CheckCircle,
  HelpCircle,
  PlayCircle,
  Download,
  Search,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Award,
} from 'lucide-react';

interface LearningResource {
  id: string;
  grade: string;
  subject: string;
  strand: string;
  subStrand: string;
  title: string;
  type: 'Notes' | 'Quiz' | 'Video' | 'Worksheet';
  duration: string;
  kicdApproved: boolean;
}

export const ElearningModule: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;

  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 9');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [quizModalOpen, setQuizModalOpen] = useState<boolean>(false);
  const [activeQuizQuestion, setActiveQuizQuestion] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  const sampleResources: LearningResource[] = [
    {
      id: 'res-1',
      grade: 'Grade 9',
      subject: 'Integrated Science',
      strand: 'Living Things & Environment',
      subStrand: 'Cell Structure & Function',
      title: 'Cell Division, Mitosis & Genetic Inheritance CBC Notes',
      type: 'Notes',
      duration: '25 mins read',
      kicdApproved: true,
    },
    {
      id: 'res-2',
      grade: 'Grade 9',
      subject: 'Pre-Technical & Pre-Career Education',
      strand: 'Materials & Technologies',
      subStrand: 'Safety in Engineering Workshops',
      title: 'Workshop Safety Protocols & PPE Interactive Revision Quiz',
      type: 'Quiz',
      duration: '15 questions',
      kicdApproved: true,
    },
    {
      id: 'res-3',
      grade: 'Grade 9',
      subject: 'Mathematics',
      strand: 'Numbers & Algebra',
      subStrand: 'Quadratic Equations & Graphs',
      title: 'Factorization and Graphical Solutions Step-by-Step Guide',
      type: 'Worksheet',
      duration: '40 mins',
      kicdApproved: true,
    },
    {
      id: 'res-4',
      grade: 'Grade 9',
      subject: 'Social Studies',
      strand: 'Governance & Democracy',
      subStrand: 'Kenya Constitution 2010 Devolved Governments',
      title: 'Devolved County Governments & National Values in Kenya',
      type: 'Notes',
      duration: '30 mins read',
      kicdApproved: true,
    },
    {
      id: 'res-5',
      grade: 'Grade 4',
      subject: 'Science & Technology',
      strand: 'Digital Literacy',
      subStrand: 'Input & Output Devices',
      title: 'Identifying Computer Hardware & Safe Browsing Habits',
      type: 'Notes',
      duration: '20 mins read',
      kicdApproved: true,
    },
    {
      id: 'res-6',
      grade: 'Grade 7',
      subject: 'Agriculture',
      strand: 'Crop Production',
      subStrand: 'Soil Conservation & Water Harvesting',
      title: 'Building Bench Terraces and Drip Irrigation Micro-Gardens',
      type: 'Worksheet',
      duration: '35 mins',
      kicdApproved: true,
    },
  ];

  const quizQuestions = [
    {
      q: 'Which safety gear is compulsory when operating power cutting tools in a junior school pre-tech workshop?',
      options: [
        'Safety goggles & closed leather boots',
        'Woolen gloves and open sandals',
        'Sunhat and sunglasses',
        'Loose necktie and lab apron',
      ],
      correct: 0,
      rationale: 'Eye protection and non-slip steel-toe boots protect against flying debris and sharp drops.',
    },
    {
      q: 'Under the Kenyan CBC framework, what is the primary focus of formative assessment?',
      options: [
        'To rank students in class from position 1 to last',
        'To provide immediate diagnostic feedback to improve learning progress',
        'To punish slow learners with negative points',
        'To replace end-of-year national KCSE exams entirely',
      ],
      correct: 1,
      rationale: 'CBC formative assessment is assessment FOR learning, identifying strengths and learning gaps.',
    },
    {
      q: 'Which of the following values is explicitly nurtured across all CBC strands?',
      options: ['Selfishness', 'Integrity & Social Justice', 'Extreme Rivalry', 'Passive Compliance'],
      correct: 1,
      rationale: 'Integrity, social justice, and respect are foundational core values in the KICD curriculum design.',
    },
  ];

  const filtered = sampleResources.filter((r) => {
    const matchesGrade = selectedGrade === 'all' || r.grade === selectedGrade;
    const matchesType = selectedType === 'all' || r.type === selectedType;
    return matchesGrade && matchesType;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-700/60 text-teal-200 text-xs font-semibold mb-2">
              <Laptop className="w-3.5 h-3.5" />
              KICD Aligned Digital Learning
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              CBC eLearning &amp; Revision Hub
            </h1>
            <p className="text-teal-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Curriculum-aligned digital textbooks, interactive quizzes, teacher schemes of work,
              and revision worksheets for PP1 through Grade 9 at {currentSchool.name}.
            </p>
          </div>

          <button
            onClick={() => {
              setQuizModalOpen(true);
              setActiveQuizQuestion(0);
              setSelectedAnswers({});
              setQuizSubmitted(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl font-bold text-xs shadow transition shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-900" />
            Launch Practice Quiz
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Grade:</span>
          {['all', 'Grade 4', 'Grade 7', 'Grade 8', 'Grade 9'].map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedGrade === g
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {g === 'all' ? 'All Grades' : g}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Format:</span>
          {['all', 'Notes', 'Quiz', 'Worksheet'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                selectedType === t
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {item.grade} &bull; {item.subject}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {item.type}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                {item.title}
              </h3>

              <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                <div>
                  <span className="font-semibold text-slate-700">Strand:</span> {item.strand}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Sub-strand:</span> {item.subStrand}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">{item.duration}</span>
              <button
                onClick={() => {
                  if (item.type === 'Quiz') {
                    setQuizModalOpen(true);
                  } else {
                    alert(`Opening resource: ${item.title}`);
                  }
                }}
                className="flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800"
              >
                <span>{item.type === 'Quiz' ? 'Take Quiz' : 'Study Now'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quiz Modal */}
      {quizModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  CBC Formative Interactive Quiz
                </h3>
              </div>
              <button
                onClick={() => setQuizModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {!quizSubmitted ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Question {activeQuizQuestion + 1} of {quizQuestions.length}</span>
                  <span className="font-bold text-emerald-700">Pass Mark: 75%</span>
                </div>

                <div className="font-bold text-slate-800 text-sm leading-relaxed">
                  {quizQuestions[activeQuizQuestion].q}
                </div>

                <div className="space-y-2">
                  {quizQuestions[activeQuizQuestion].options.map((opt, oIdx) => {
                    const isSelected = selectedAnswers[activeQuizQuestion] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() =>
                          setSelectedAnswers({
                            ...selectedAnswers,
                            [activeQuizQuestion]: oIdx,
                          })
                        }
                        className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] shrink-0 font-bold">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    disabled={activeQuizQuestion === 0}
                    onClick={() => setActiveQuizQuestion((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {activeQuizQuestion < quizQuestions.length - 1 ? (
                    <button
                      disabled={selectedAnswers[activeQuizQuestion] === undefined}
                      onClick={() => setActiveQuizQuestion((p) => p + 1)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-40"
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
                      onClick={() => setQuizSubmitted(true)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-40"
                    >
                      Submit Quiz
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center py-4">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Quiz Completed!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Rubric Level Achieved: <strong>EE1 (Exceeding Expectation - 100%)</strong>
                  </p>
                </div>
                <button
                  onClick={() => setQuizModalOpen(false)}
                  className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Close &amp; Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
