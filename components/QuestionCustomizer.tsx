'use client';

import { useState } from 'react';

interface QuestionConfig {
  subject: string;
  questionTypes: string[];
  difficulty: string;
  studentClass: string;
  customInstructions?: string;
  questionsByType?: {
    mcq: number;
    fillInBlanks: number;
    trueFalse: number;
    general: number;
  };
  questionsByMarks?: {
    '2': number;
    '3': number;
    '4': number;
    '5': number;
    '6': number;
    '10': number;
  };
}

interface Props {
  config: QuestionConfig;
  onConfigChange: (config: QuestionConfig) => void;
}

const SUBJECTS = [
  { value: 'mathematics', label: '📐 Mathematics' },
  { value: 'physics', label: '⚛️ Physics' },
  { value: 'chemistry', label: '🧪 Chemistry' },
  { value: 'biology', label: '🧬 Biology' },
  { value: 'computer-science', label: '💻 Computer Science' },
  { value: 'english', label: '📚 English' },
  { value: 'hindi', label: '🇮🇳 Hindi' },
  { value: 'social-science', label: '🌍 Social Science' },
  { value: 'history', label: '📜 History' },
  { value: 'geography', label: '🗺️ Geography' },
  { value: 'political-science', label: '🏛️ Political Science' },
  { value: 'economics', label: '💰 Economics' },
  { value: 'accountancy', label: '📊 Accountancy' },
  { value: 'business-studies', label: '💼 Business Studies' },
  { value: 'statistics', label: '📈 Statistics' },
  { value: 'engineering', label: '⚙️ Engineering' },
  { value: 'environmental-science', label: '🌱 Environmental Science' },
  { value: 'psychology', label: '🧠 Psychology' },
  { value: 'sociology', label: '👥 Sociology' },
  { value: 'philosophy', label: '💭 Philosophy' },
  { value: 'sanskrit', label: '🕉️ Sanskrit' },
  { value: 'general-science', label: '🔬 General Science' },
];

const QUESTION_TYPES = [
  { value: 'problem-solving', label: 'Problem Solving' },
  { value: 'conceptual', label: 'Conceptual Understanding' },
  { value: 'application', label: 'Real-world Application' },
  { value: 'proof-based', label: 'Proof & Derivation' },
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'true-false', label: 'True/False' },
];

const DIFFICULTIES = [
  { value: 'easy', label: '🟢 Easy' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'hard', label: '🔴 Hard' },
  { value: 'mixed', label: '🎯 Mixed' },
];

const CLASSES = [
  { value: '6', label: 'Class 6' },
  { value: '7', label: 'Class 7' },
  { value: '8', label: 'Class 8' },
  { value: '9', label: 'Class 9' },
  { value: '10', label: 'Class 10' },
  { value: '11', label: 'Class 11' },
  { value: '12', label: 'Class 12' },
  { value: 'college', label: 'College/University' },
];

export default function QuestionCustomizer({ config, onConfigChange }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onConfigChange({ ...config, subject: e.target.value });
  };

  const handleQuestionTypeToggle = (type: string) => {
    const types = config.questionTypes.includes(type)
      ? config.questionTypes.filter(t => t !== type)
      : [...config.questionTypes, type];
    
    if (types.length > 0) {
      onConfigChange({ ...config, questionTypes: types });
    }
  };

  const handleDifficultyChange = (difficulty: string) => {
    onConfigChange({ ...config, difficulty });
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onConfigChange({ ...config, studentClass: e.target.value });
  };

  const handleCustomInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onConfigChange({ ...config, customInstructions: e.target.value });
  };

  const handleQuestionTypeCountChange = (type: keyof NonNullable<QuestionConfig['questionsByType']>, delta: number) => {
    const current = config.questionsByType || { mcq: 0, fillInBlanks: 0, trueFalse: 0, general: 0 };
    const newValue = Math.max(0, (current[type] || 0) + delta);
    onConfigChange({
      ...config,
      questionsByType: { ...current, [type]: newValue }
    });
  };

  const handleQuestionMarkCountChange = (marks: keyof NonNullable<QuestionConfig['questionsByMarks']>, delta: number) => {
    const current = config.questionsByMarks || { '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '10': 0 };
    const newValue = Math.max(0, (current[marks] || 0) + delta);
    onConfigChange({
      ...config,
      questionsByMarks: { ...current, [marks]: newValue }
    });
  };

  const getTotalQuestionsByType = () => {
    const types = config.questionsByType || { mcq: 0, fillInBlanks: 0, trueFalse: 0, general: 0 };
    return types.mcq + types.fillInBlanks + types.trueFalse + types.general;
  };

  const getTotalQuestionsByMarks = () => {
    const marks = config.questionsByMarks || { '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '10': 0 };
    return marks['2'] + marks['3'] + marks['4'] + marks['5'] + marks['6'] + marks['10'];
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl mb-6 sm:mb-8 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-6 md:px-8 py-4 sm:py-6 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
      >
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
          ⚙️ Customize Questions
        </h2>
        <span className="text-2xl sm:text-3xl transform transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          {/* Class and Subject Selection - Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Class Selection */}
            <div>
              <label className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">
                🏛️ Select Class
              </label>
              <select
                value={config.studentClass}
                onChange={handleClassChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-base sm:text-lg font-medium bg-white"
              >
                {CLASSES.map(cls => (
                  <option key={cls.value} value={cls.value}>
                    {cls.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">
                📚 Subject
              </label>
              <select
                value={config.subject}
                onChange={handleSubjectChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-base sm:text-lg font-medium bg-white"
              >
                {SUBJECTS.map(subject => (
                  <option key={subject.value} value={subject.value}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Types */}
          <div>
            <label className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">
              📝 Question Types (select at least one)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {QUESTION_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => handleQuestionTypeToggle(type.value)}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                    config.questionTypes.includes(type.value)
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">
              🎯 Difficulty Level
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {DIFFICULTIES.map(diff => (
                <button
                  key={diff.value}
                  onClick={() => handleDifficultyChange(diff.value)}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                    config.difficulty === diff.value
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div>
            <label className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">
              💡 Custom Instructions (Optional) ⭐
            </label>
            <textarea
              value={config.customInstructions || ''}
              onChange={handleCustomInstructionsChange}
              placeholder="Examples: • Focus on Chapter 3: Photosynthesis only • Include more questions on chemical equations • Make difficulty level: moderate to hard • Focus on topics: cell structure, DNA replication • Include real-world application questions"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-xs sm:text-sm min-h-[80px] sm:min-h-[100px] resize-y"
              rows={4}
            />
            <p className="mt-2 text-xs sm:text-sm text-yellow-700 flex items-start gap-2">
              <span>💡</span>
              <span><strong>Smart Tips:</strong> Be specific about chapters, topics, difficulty level, or question style. These instructions take highest priority during generation.</span>
            </p>
          </div>

          {/* 1 Mark Questions */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-xl border-2 border-blue-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
              1 Mark Questions <span className="text-blue-600">(Total: {getTotalQuestionsByType()})</span>
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {[
                { key: 'mcq' as const, label: 'Multiple Choice (MCQ)' },
                { key: 'fillInBlanks' as const, label: 'Fill in the Blanks' },
                { key: 'trueFalse' as const, label: 'True or False' },
                { key: 'general' as const, label: 'General Questions' }
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                  <span className="font-medium text-gray-700 text-sm sm:text-base">{item.label}</span>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => handleQuestionTypeCountChange(item.key, -1)}
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-700 transition-colors text-sm sm:text-base"
                    >
                      -
                    </button>
                    <span className="w-10 sm:w-12 text-center font-bold text-base sm:text-lg text-gray-800">
                      {config.questionsByType?.[item.key] || 0}
                    </span>
                    <button
                      onClick={() => handleQuestionTypeCountChange(item.key, 1)}
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-white transition-colors text-sm sm:text-base"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Questions by Marks */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-6 rounded-xl border-2 border-purple-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
              Questions by Marks <span className="text-purple-600">(Total: {getTotalQuestionsByMarks()})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {[
                { key: '2' as const, label: '2 Marks' },
                { key: '3' as const, label: '3 Marks' },
                { key: '4' as const, label: '4 Marks' },
                { key: '5' as const, label: '5 Marks' },
                { key: '6' as const, label: '6 Marks' },
                { key: '10' as const, label: '10 Marks' }
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                  <span className="font-medium text-gray-700 text-sm sm:text-base">{item.label}</span>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => handleQuestionMarkCountChange(item.key, -1)}
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-700 transition-colors text-sm sm:text-base"
                    >
                      -
                    </button>
                    <span className="w-10 sm:w-12 text-center font-bold text-base sm:text-lg text-gray-800">
                      {config.questionsByMarks?.[item.key] || 0}
                    </span>
                    <button
                      onClick={() => handleQuestionMarkCountChange(item.key, 1)}
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold text-white transition-colors text-sm sm:text-base"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Summary */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm sm:text-base">📋 Configuration Summary:</h3>
            <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
              <li>• Class: <span className="font-medium">{CLASSES.find(c => c.value === config.studentClass)?.label}</span></li>
              <li>• Subject: <span className="font-medium">{SUBJECTS.find(s => s.value === config.subject)?.label}</span></li>
              <li>• Total 1 Mark Questions: <span className="font-medium">{getTotalQuestionsByType()}</span></li>
              <li>• Total Questions by Marks: <span className="font-medium">{getTotalQuestionsByMarks()}</span></li>
              <li>• Question Types: <span className="font-medium">{config.questionTypes.map(t => QUESTION_TYPES.find(qt => qt.value === t)?.label).join(', ') || 'None'}</span></li>
              <li>• Difficulty: <span className="font-medium">{DIFFICULTIES.find(d => d.value === config.difficulty)?.label}</span></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
