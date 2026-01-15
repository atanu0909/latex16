'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  content: string;
}

interface Question {
  number: number;
  question: string;
  solution: string;
}

export default function LatexPreview({ content }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [visibleSolutions, setVisibleSolutions] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Parse questions and solutions from LaTeX content
    const parseQuestions = () => {
      const parsedQuestions: Question[] = [];
      
      console.log('Starting to parse LaTeX content...');
      console.log('Full content length:', content.length);
      
      // First, extract just the questions section to avoid parsing preamble
      let questionsContent = content;
      
      // Remove everything before \begin{document}
      const docStart = content.indexOf('\\begin{document}');
      if (docStart !== -1) {
        questionsContent = content.substring(docStart);
      }
      
      // Look for the main questions section after instructions
      // Try multiple section markers
      const sectionMarkers = [
        /(?:SECTION:\s*QUESTIONS|Questions Section|QUESTIONS|BEGIN QUESTIONS)([\s\S]*?)(?=\\end\{document\}|$)/i,
        /(?:\\end\{tabular\}[\s\S]*?\\end\{tabular\})([\s\S]*?)(?=\\end\{document\}|$)/, // After header tables
        /(?:\\end\{enumerate\}[\s\S]{0,200})(\\textbf\{Q|\\noindent[\s\S]*?Q\.|^\s*\d+\.)/m // After instructions enumerate
      ];
      
      for (const marker of sectionMarkers) {
        const match = questionsContent.match(marker);
        if (match) {
          questionsContent = match[1] || match[0];
          console.log('Found questions section with marker');
          break;
        }
      }
      
      console.log('Questions content length after extraction:', questionsContent.length);
      console.log('First 500 chars:', questionsContent.substring(0, 500));
      
      // ENHANCED: Try multiple patterns in order of specificity
      const patterns = [
        // Pattern 1: \noindent\textbf{Q.N} format (standard format)
        {
          regex: /\\noindent\\textbf\{Q\.(\d+)\}\s*\\hfill\s*\\textbf\{\[([^\]]+)\]\}([\s\S]*?)(?=\\noindent\\textbf\{Q\.\d+\}|\\end\{document\}|$)/g,
          solutionPattern: /([\s\S]*?)\\noindent\\textbf\{Solution:\}([\s\S]*?)(?=\\noindent\\rule|$)/
        },
        // Pattern 2: \textbf{Q.N} \hfill format (common in patterns) - MORE FLEXIBLE
        {
          regex: /\\textbf\{Q\.(\d+)\}\s*\\hfill\s*\\textbf\{\[([^\]]+)\]\}([\s\S]*?)(?=\\textbf\{Q\.\d+\}|\\end\{document\}|$)/g,
          solutionPattern: /([\s\S]*?)(?:\\textbf\{)?Solution[:\.]?(?:\})?[\s\S]*?([\s\S]*?)$/
        },
        // Pattern 2b: \textbf{Q.N} without \hfill (pattern variations)
        {
          regex: /\\textbf\{Q\.(\d+)\}[\s\S]*?\[([^\]]+)\]([\s\S]*?)(?=\\textbf\{Q\.\d+\}|\\end\{document\}|$)/g,
          solutionPattern: /([\s\S]*?)(?:\\textbf\{)?(?:Solution|Ans)[:\.\)]?(?:\})?[\s\S]*?([\s\S]*?)$/
        },
        // Pattern 3: \subsection* format
        {
          regex: /\\subsection\*\{(?:Q\.|Question)\s*(\d+)\s*\[([^\]]+)\]\}([\s\S]*?)(?=\\subsection\*\{(?:Q\.|Question)|\\end\{document\}|$)/g,
          solutionPattern: /([\s\S]*?)\\subsection\*\{Solution\}([\s\S]*?)(?=\\vspace|$)/
        },
        // Pattern 4: Simple numbered format (Q1, Q.1, Question 1, etc.) - very flexible
        {
          regex: /(?:^|\\noindent\s*)(?:\\textbf\{)?(?:Q\.?|Question)\s*(\d+)(?:\})?(?:\s*[\(\[]?([^\]\)]*?marks?)[\]\)]?)?[:\.\)]?\s*([\s\S]*?)(?=(?:^|\\noindent\s*)(?:\\textbf\{)?(?:Q\.?|Question)\s*\d+|\\end\{document\}|$)/gm,
          solutionPattern: /([\s\S]*?)(?:\\textbf\{)?(?:Solution|Answer|Ans)[:\.\)]?(?:\})?[\s\S]*?([\s\S]*?)$/
        },
        // Pattern 5: Section-based
        {
          regex: /\\section\*\{(?:Question\s+)?(\d+)(?:\s*\[([^\]]+)\])?\}([\s\S]*?)(?=\\section\*\{|\\end\{document\}|$)/g,
          solutionPattern: /([\s\S]*?)\\section\*\{Solution\}([\s\S]*?)$/
        },
        // Pattern 6: Number with period at start of line (very common in custom patterns)
        {
          regex: /(?:^|\n)\s*(\d+)[\.\)]\s*([\s\S]*?)(?=(?:^|\n)\s*\d+[\.\)]|\\end\{document\}|$)/gm,
          solutionPattern: /([\s\S]*?)(?:Solution|Answer|Ans)[:\.\)]?\s*([\s\S]*?)$/
        }
      ];
      
      for (const pattern of patterns) {
        let match;
        pattern.regex.lastIndex = 0;
        
        console.log('Trying pattern with regex:', pattern.regex.source.substring(0, 100));
        
        while ((match = pattern.regex.exec(questionsContent)) !== null) {
          const questionNumber = parseInt(match[1]);
          const marks = match[2] || 'N/A';
          const fullContent = match[3] || match[2]; // Some patterns have content in different groups
          
          console.log(`Found potential question ${questionNumber}, content length: ${fullContent?.length}`);
          
          if (isNaN(questionNumber) || !fullContent || fullContent.trim().length < 5) {
            console.log('Skipping - invalid number or too short');
            continue;
          }
          
          // Filter out instructions/non-questions - be more lenient
          const lowerContent = fullContent.toLowerCase();
          if (lowerContent.includes('instructions to candidates') ||
              lowerContent.includes('general instructions') ||
              (lowerContent.includes('answer any') && fullContent.length < 100) ||
              lowerContent.includes('examination paper') ||
              lowerContent.includes('duration:') && lowerContent.includes('maximum marks:')) {
            console.log('Skipping - matches instruction pattern');
            continue;
          }
          
          // Try to split by solution
          const solutionMatch = fullContent.match(pattern.solutionPattern);
          
          let questionText, solutionText;
          if (solutionMatch) {
            questionText = solutionMatch[1].trim();
            solutionText = solutionMatch[2]?.trim() || '';
          } else {
            questionText = fullContent.trim();
            solutionText = '';
          }
          
          // More lenient length check
          if (questionText.length > 5) {
            console.log(`Adding question ${questionNumber}`);
            parsedQuestions.push({
              number: questionNumber,
              question: questionText,
              solution: solutionText
            });
          }
        }
        
        if (parsedQuestions.length > 0) {
          console.log(`Found ${parsedQuestions.length} questions with pattern`);
          break;
        }
      }

      // Remove duplicates and sort by question number
      const uniqueQuestions = Array.from(
        new Map(parsedQuestions.map(q => [q.number, q])).values()
      ).sort((a, b) => a.number - b.number);

      console.log(`Final parsed questions count: ${uniqueQuestions.length}`);
      if (uniqueQuestions.length > 0) {
        console.log('First question:', uniqueQuestions[0]);
      }

      setQuestions(uniqueQuestions);
    };

    if (content) {
      parseQuestions();
    }
  }, [content]);

  useEffect(() => {
    if (previewRef.current && typeof window !== 'undefined' && questions.length > 0) {
      // Render LaTeX math using KaTeX
      const renderMath = async () => {
        try {
          const katex = await import('katex');
          const renderMathInElement = (await import('katex/dist/contrib/auto-render')).default;
          
          if (previewRef.current) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
              if (previewRef.current) {
                renderMathInElement(previewRef.current, {
                  delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false },
                  ],
                  throwOnError: false,
                  trust: true,
                });
              }
            }, 100);
          }
        } catch (error) {
          console.error('KaTeX rendering error:', error);
        }
      };

      renderMath();
    }
  }, [questions, visibleSolutions]);

  const toggleSolution = (questionNumber: number) => {
    setVisibleSolutions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionNumber)) {
        newSet.delete(questionNumber);
      } else {
        newSet.add(questionNumber);
      }
      return newSet;
    });
  };

  // Convert LaTeX content to HTML-friendly format
  const formatContent = (latex: string) => {
    // Remove documentclass and preamble for preview
    let formatted = latex
      .replace(/\\documentclass(?:\[[^\]]*\])?\{[^}]*\}/g, '')
      .replace(/\\usepackage(?:\[[^\]]*\])?\{[^}]*\}/g, '')
      .replace(/\\geometry\{[^}]*\}/g, '')
      .replace(/\\pagestyle\{[^}]*\}/g, '')
      .replace(/\\setlength\{[^}]*\}\{[^}]*\}/g, '')
      .replace(/\\addtolength\{[^}]*\}\{[^}]*\}/g, '')
      .replace(/\\fancyhf\{\}/g, '')
      .replace(/\\fancyhead\[[^\]]*\]\{[^}]*\}/g, '')
      .replace(/\\fancyfoot\[[^\]]*\]\{[^}]*\}/g, '')
      .replace(/\\begin\{document\}/g, '')
      .replace(/\\end\{document\}/g, '')
      .replace(/\\maketitle/g, '')
      .replace(/\\title\{([^}]*)\}/g, '')
      .replace(/\\author\{([^}]*)\}/g, '')
      .replace(/\\date\{([^}]*)\}/g, '')
      .replace(/\\noindent/g, '')
      .replace(/\\centering/g, '')
      .replace(/\\phantom\{[^}]*\}/g, '')
      .replace(/\\dimexpr[^}]*\\fboxsep[^}]*\\fboxrule/g, '100%')
      .replace(/\\vspace\{[^}]*\}/g, '<div class="my-4"></div>')
      .replace(/\\hspace\{[^}]*\}/g, '<span class="inline-block w-4"></span>')
      .replace(/\\newpage/g, '<div class="border-t-2 border-gray-300 my-8"></div>');

    // Convert center environment
    formatted = formatted
      .replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, '<div class="text-center">$1</div>');

    // Convert fbox and parbox - special handling for instruction boxes
    formatted = formatted
      .replace(/\\fbox\{\\parbox\{[^}]*\}\{([\s\S]*?)\}\}/g, (match, content) => {
        // For instruction boxes, use special formatting
        const processed = content
          .replace(/\\begin\{itemize\}\[leftmargin=\*,?\s*itemsep=[^\]]*\]/g, '<ul class="list-disc ml-5 space-y-0.5 my-2">')
          .replace(/\\begin\{itemize\}\[itemsep=[^\]]*\]/g, '<ul class="list-disc ml-5 space-y-0.5 my-2">')
          .replace(/\\begin\{itemize\}/g, '<ul class="list-disc ml-5 space-y-1 my-2">');
        return `<div class="border-2 border-black p-4 my-6 bg-white">${processed}</div>`;
      })
      .replace(/\\fbox\{([\s\S]*?)\}/g, '<div class="border-2 border-gray-800 p-4 rounded-md inline-block">$1</div>');

    // Convert rules and lines
    formatted = formatted
      .replace(/\\rule\{[^}]*\}\{[^}]*\}/g, '<hr class="border-t-2 border-gray-400 my-2" />');

    // Convert sections
    formatted = formatted
      .replace(/\\section\*\{([^}]*)\}/g, '<h2 class="text-2xl font-bold mt-8 mb-4 text-purple-700">$1</h2>')
      .replace(/\\subsection\*\{([^}]*)\}/g, '<h3 class="text-xl font-semibold mt-6 mb-3 text-indigo-600">$1</h3>')
      .replace(/\\section\{([^}]*)\}/g, '<h2 class="text-2xl font-bold mt-8 mb-4 text-purple-700">$1</h2>')
      .replace(/\\subsection\{([^}]*)\}/g, '<h3 class="text-xl font-semibold mt-6 mb-3 text-indigo-600">$1</h3>');

    // Convert font sizes
    formatted = formatted
      .replace(/\{\\Large\s+(.*?)\}/g, '<span class="text-2xl">$1</span>')
      .replace(/\{\\large\s+(.*?)\}/g, '<span class="text-xl">$1</span>')
      .replace(/\{\\small\s+(.*?)\}/g, '<span class="text-sm">$1</span>')
      .replace(/\{\\tiny\s+(.*?)\}/g, '<span class="text-xs">$1</span>');

    // Convert lists with better support for itemize options (default case)
    formatted = formatted
      .replace(/\\begin\{itemize\}(?:\[[^\]]*\])?/g, '<ul class="list-disc ml-6 my-3 space-y-1">')
      .replace(/\\end\{itemize\}/g, '</ul>')
      .replace(/\\begin\{enumerate\}(?:\[[^\]]*\])?/g, '<ol class="list-decimal ml-6 my-3 space-y-1">')
      .replace(/\\end\{enumerate\}/g, '</ol>')
      .replace(/\\item(?:\s*\[[^\]]*\])?/g, '<li class="ml-0 pl-1">');

    // Convert text formatting
    formatted = formatted
      .replace(/\\textbf\{([^}]*)\}/g, '<strong>$1</strong>')
      .replace(/\\textit\{([^}]*)\}/g, '<em>$1</em>')
      .replace(/\\emph\{([^}]*)\}/g, '<em>$1</em>')
      .replace(/\\underline\{([^}]*)\}/g, '<u>$1</u>');

    // Convert line breaks
    formatted = formatted
      .replace(/\\\\\[?[^\]]*\]?/g, '<br/>')
      .replace(/\\newline/g, '<br/>');

    // Handle special characters (but preserve $ for math mode)
    formatted = formatted
      .replace(/\\&/g, '&')
      .replace(/\\%/g, '%')
      .replace(/\\#/g, '#')
      // Only unescape underscores outside math mode (simplified approach)
      .replace(/\\_(?![^$]*\$)/g, '_');
    
    // Handle additional LaTeX commands
    formatted = formatted
      .replace(/\\bigskip/g, '<div class="my-6"></div>')
      .replace(/\\medskip/g, '<div class="my-4"></div>')
      .replace(/\\smallskip/g, '<div class="my-2"></div>')
      .replace(/\\quad/g, '<span class="inline-block w-8"></span>')
      .replace(/\\qquad/g, '<span class="inline-block w-16"></span>')
      .replace(/\\par\s*/g, '</p><p class="my-4">');

    // Add paragraph breaks for double newlines
    formatted = formatted
      .split('\n\n')
      .map(para => para.trim())
      .filter(para => para.length > 0 && !para.match(/^<[^>]+>$/))
      .map(para => {
        // Don't wrap if already wrapped in HTML tags
        if (para.match(/^<(div|h[1-6]|ul|ol|hr)/)) {
          return para;
        }
        return `<p class="my-4">${para}</p>`;
      })
      .join('\n');

    return formatted;
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-purple-50 border-2 border-purple-200 rounded-xl p-4 sm:p-8 max-h-[700px] overflow-y-auto">
      {questions.length > 0 ? (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-purple-700">📚 Generated Questions</h1>
            <p className="text-sm text-gray-600 mt-2">{questions.length} question{questions.length > 1 ? 's' : ''} found</p>
          </div>
          
          <div ref={previewRef} className="space-y-4">
            {questions.map((q) => (
              <div key={q.number} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-purple-200">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 flex justify-between items-center">
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <span className="bg-white text-purple-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                      {q.number}
                    </span>
                    Question {q.number}
                  </h2>
                  {q.solution && (
                    <button
                      onClick={() => toggleSolution(q.number)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                        visibleSolutions.has(q.number)
                          ? 'bg-white text-purple-600 hover:bg-purple-50'
                          : 'bg-purple-700 text-white hover:bg-purple-800'
                      }`}
                    >
                      {visibleSolutions.has(q.number) ? '🔼 Hide Solution' : '👁️ See Solution'}
                    </button>
                  )}
                </div>
                
                {/* Question Content */}
                <div className="p-6">
                  <div className="prose prose-lg max-w-none text-gray-800">
                    <div dangerouslySetInnerHTML={{ __html: formatContent(q.question) }} />
                  </div>
                  
                  {/* Solution Section */}
                  {q.solution && visibleSolutions.has(q.number) && (
                    <div className="mt-6 pt-6 border-t-2 border-purple-200 animate-fadeIn">
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-5 border-l-4 border-green-500">
                        <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
                          <span>✅</span> Solution
                        </h3>
                        <div className="prose prose-lg max-w-none text-gray-800">
                          <div dangerouslySetInnerHTML={{ __html: formatContent(q.solution) }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div ref={previewRef} className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-6xl mb-4 text-center">⚠️</div>
          <h3 className="text-2xl font-bold text-gray-700 mb-4 text-center">No Questions Detected</h3>
          <p className="text-gray-600 text-center mb-6">
            The LaTeX content was generated, but questions couldn't be parsed automatically. 
            Please download the PDF to view the formatted questions.
          </p>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">Showing raw LaTeX content:</p>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto text-left">
              <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">{content.substring(0, 2000)}...</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
