import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface PDFMetadata {
  subject?: string;
  questionTypes?: string[];
  difficulty?: string;
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

async function extractTextFromPDF(filePath: string): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  return result.text;
}

async function generateQuestionsWithGemini(
  pdfText: string,
  metadata: PDFMetadata,
  patternText?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const subject = metadata.subject || 'mathematics';
  const questionTypes = metadata.questionTypes || ['problem-solving', 'conceptual', 'application'];
  const difficulty = metadata.difficulty || 'mixed';

  const questionTypeDesc = questionTypes.join(', ');

  // Build question breakdown
  let questionBreakdown = '';
  
  if (metadata.questionsByType) {
    const types = metadata.questionsByType;
    const parts: string[] = [];
    if (types.mcq > 0) parts.push(`${types.mcq} Multiple Choice Questions (MCQ)`);
    if (types.fillInBlanks > 0) parts.push(`${types.fillInBlanks} Fill in the Blanks questions`);
    if (types.trueFalse > 0) parts.push(`${types.trueFalse} True/False questions`);
    if (types.general > 0) parts.push(`${types.general} General questions`);
    
    if (parts.length > 0) {
      questionBreakdown += '\n\n1 Mark Questions:\n' + parts.map(p => `- ${p}`).join('\n');
    }
  }
  
  if (metadata.questionsByMarks) {
    const marks = metadata.questionsByMarks;
    const parts: string[] = [];
    if (marks['2'] > 0) parts.push(`${marks['2']} questions of 2 marks each`);
    if (marks['3'] > 0) parts.push(`${marks['3']} questions of 3 marks each`);
    if (marks['4'] > 0) parts.push(`${marks['4']} questions of 4 marks each`);
    if (marks['5'] > 0) parts.push(`${marks['5']} questions of 5 marks each`);
    if (marks['6'] > 0) parts.push(`${marks['6']} questions of 6 marks each`);
    if (marks['10'] > 0) parts.push(`${marks['10']} questions of 10 marks each`);
    
    if (parts.length > 0) {
      questionBreakdown += '\n\nQuestions by Marks:\n' + parts.map(p => `- ${p}`).join('\n');
    }
  }

  const customInstructionsSection = metadata.customInstructions 
    ? `\n\nCUSTOM INSTRUCTIONS (HIGHEST PRIORITY):\n${metadata.customInstructions}\n\nPlease follow these custom instructions carefully as they take precedence over other settings.`
    : '';

  // Subject-specific intelligent question generation guidelines
  const subjectSpecificGuidelines = {
    mathematics: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 MATHEMATICS - SMART QUESTION GENERATION GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TOPIC COVERAGE - EQUAL WEIGHTAGE:
   - Analyze ALL topics/chapters in the provided content
   - Distribute questions EQUALLY across ALL topics (if 4 topics, ~25% questions per topic)
   - Don't skip any topic, even if briefly covered in the content
   - Example: If content covers Algebra, Calculus, Geometry, Statistics - ensure equal representation

2. QUESTION TYPE DISTRIBUTION:
   - 40% Numerical/Computational problems (calculations, solving equations, finding values)
   - 30% Conceptual understanding (proofs, derivations, explanations)
   - 20% Application-based (word problems, real-world scenarios)
   - 10% Theorem/Formula based (state and prove, verify formulas)

3. NUMERICAL QUESTIONS - MUST INCLUDE:
   - Actual calculations with numbers (NOT just symbolic)
   - Step-by-step arithmetic/algebraic solutions
   - Clear numerical answers (e.g., "Find the value of x" should give x = 5.2, not just x)
   - Mix of integers, decimals, fractions based on difficulty
   - Include units where applicable (meters, seconds, dollars, etc.)

4. DIFFICULTY PROGRESSION:
   - Easy (30%): Direct formula application, basic computations
   - Medium (50%): Multi-step problems, requires concept understanding
   - Hard (20%): Involves multiple concepts, creative thinking

5. SMART QUESTION CHARACTERISTICS:
   - Clear, unambiguous problem statements
   - Sufficient data provided (not missing information)
   - Realistic numbers (avoid extremely large or complex values for basic level)
   - Questions should test understanding, not just memorization
   - Include diagrams where helpful (mention "diagram not shown" if complex)

EXAMPLE QUESTION QUALITY:
❌ BAD: "Solve the equation." (Too vague)
✅ GOOD: "Solve for x: $3x + 7 = 22$. Show all steps."

❌ BAD: "Find the derivative." (Which function?)
✅ GOOD: "Find $\\frac{d}{dx}(x^3 + 2x^2 - 5x + 1)$ and evaluate at $x = 2$."
`,
    physics: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚛️ PHYSICS - SMART QUESTION GENERATION GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TOPIC COVERAGE:
   - Equal representation from all chapters (Mechanics, Thermodynamics, Optics, etc.)
   - Cover both theory and numerical problems
   
2. QUESTION DISTRIBUTION:
   - 50% Numerical problems with calculations
   - 25% Derivations and proofs
   - 15% Conceptual/Theory questions
   - 10% Diagram-based or experimental questions

3. NUMERICAL PROBLEMS - REQUIREMENTS:
   - Realistic values with proper SI units
   - Clear given data and what to find
   - Step-by-step solution with formula application
   - Final answer with correct units and significant figures

4. TOPIC BALANCE:
   - If content covers 5 topics, aim for 20% questions per topic
   - Don't overemphasize one topic

EXAMPLE:
✅ GOOD: "A car accelerates from rest to 20 m/s in 5 seconds. Calculate: (a) acceleration (b) distance traveled. Use $v = u + at$ and $s = ut + \\frac{1}{2}at^2$."
`,
    chemistry: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 CHEMISTRY - SMART QUESTION GENERATION GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. BALANCED COVERAGE:
   - Organic, Inorganic, Physical Chemistry - equal weightage
   - Both theoretical and numerical questions

2. QUESTION TYPES:
   - 40% Numerical (stoichiometry, molarity, pH calculations)
   - 30% Reactions and equations
   - 20% Naming, structures, properties
   - 10% Experimental procedures

3. NUMERICAL PRECISION:
   - Use molar masses, Avogadro's number accurately
   - Show dimensional analysis
   - Proper chemical formulas and equations
`,
    biology: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧬 BIOLOGY - SMART QUESTION GENERATION GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. EQUAL TOPIC DISTRIBUTION:
   - Cover all units equally (Cell Biology, Genetics, Ecology, etc.)

2. QUESTION STYLE:
   - 50% Descriptive (explain, describe, differentiate)
   - 25% Diagram-based (label, draw, identify)
   - 15% Application (case studies, scenarios)
   - 10% Numerical (genetics ratios, population calculations)

3. QUALITY MARKERS:
   - Use proper scientific terminology
   - Include specific examples from nature
   - Avoid yes/no questions, prefer "explain why"
`,
    history: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 HISTORY - SMART QUESTION GENERATION GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TIME PERIOD BALANCE:
   - Equal coverage across all time periods mentioned in content
   - Ancient, Medieval, Modern - balanced representation

2. QUESTION TYPES FOR HISTORY:
   - 40% Analytical (causes, effects, significance, analyze)
   - 30% Descriptive (describe events, movements, personalities)
   - 20% Chronological (timelines, sequence of events, dates)
   - 10% Comparative (compare two periods, leaders, movements)

3. PROPER HISTORICAL QUESTIONS:
   - Include specific dates, names, places
   - Ask "Why" and "How" not just "What"
   - Questions should test understanding of causation
   - Include primary source analysis where applicable

4. AVOID:
   - Generic "what happened" questions
   - Questions answerable in one word
   - Obscure trivial details

EXAMPLES:
❌ BAD: "Who was the first president?"
✅ GOOD: "Analyze the factors that led to [specific event] in [year]. How did this impact [region/people]?"

✅ GOOD: "Compare the economic policies of [Leader A] and [Leader B]. What were the key differences and their impacts on society?"

✅ GOOD: "Explain the significance of [Historical Event] in the context of [Time Period]. How did it change the course of history?"
`,
    'computer-science': `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💻 COMPUTER SCIENCE - SMART QUESTION GENERATION GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. BALANCED TOPICS:
   - Programming, Data Structures, Algorithms, Theory - equal coverage

2. QUESTION MIX:
   - 40% Code writing/analysis
   - 30% Algorithm design and analysis
   - 20% Theoretical concepts
   - 10% Problem-solving with pseudocode

3. CODE QUESTIONS:
   - Include actual code snippets
   - Ask for output, debugging, or code completion
   - Use proper syntax and formatting
`,
    economics: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 ECONOMICS - SMART QUESTION GENERATION GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. COVERAGE:
   - Microeconomics and Macroeconomics - balanced
   
2. QUESTION TYPES:
   - 40% Numerical (demand-supply, GDP, inflation calculations)
   - 30% Analytical (explain concepts, cause-effect)
   - 20% Graphical (draw and explain curves)
   - 10% Case studies

3. INCLUDE:
   - Real-world economic scenarios
   - Use of formulas with actual numbers
   - Graph sketches where needed
`,
    statistics: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 STATISTICS - SMART QUESTION GENERATION GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TOPIC BALANCE:
   - Descriptive and Inferential statistics equally

2. HEAVY NUMERICAL:
   - 70% Numerical calculations (mean, median, variance, probability)
   - 20% Interpretation of results
   - 10% Theoretical concepts

3. DATA QUALITY:
   - Provide actual datasets
   - Realistic numbers
   - Step-by-step calculations shown
`
  };

  const selectedGuideline = subjectSpecificGuidelines[subject as keyof typeof subjectSpecificGuidelines] || `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 GENERAL SUBJECT - SMART QUESTION GENERATION GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. EQUAL TOPIC COVERAGE:
   - Identify all topics in the content
   - Distribute questions equally across all topics

2. QUESTION QUALITY:
   - Clear, specific questions
   - Include examples and context
   - Test understanding, not just recall
   - Provide sufficient detail in solutions
`;

  const patternSection = patternText
<<<<<<< HEAD
    ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUESTION PAPER PATTERN/FORMAT TO FOLLOW (HIGHEST PRIORITY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${patternText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL PATTERN ANALYSIS INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST carefully analyze and EXACTLY replicate the above question paper pattern. Pay METICULOUS attention to:

1. HEADER & TITLE FORMAT:
   - Exact title format, font sizes, and styling
   - School/Institution name format (if present)
   - Subject name presentation
   - Date, time, duration format
   - Maximum marks display
   - Any logos or decorative elements

2. INSTRUCTIONS SECTION:
   - EXACTLY replicate the instruction text word-for-word
   - Match the numbering/bullet format
   - Preserve the instruction order
   - Match any special formatting (bold, italic, etc.)
   - Include ALL instructions from the pattern

3. SECTION STRUCTURE:
   - Exact section names (e.g., "Section A", "Part I", "MCQs", etc.)
   - Section descriptions and mark allocations
   - Number of questions in each section
   - Choice instructions (e.g., "Attempt any 5 out of 7")

4. QUESTION NUMBERING & FORMAT:
   - Question numbering style (1., Q1., (a), i., etc.)
   - Sub-question format
   - Mark indication format [2 marks], (3), [5M], etc.
   - Spacing between questions

5. QUESTION TYPES & DISTRIBUTION:
   - Exact count of each question type
   - MCQ format (a/b/c/d or 1/2/3/4 or i/ii/iii/iv)
   - Fill in the blanks format
   - True/False format
   - Short answer format
   - Long answer format
   - Match the following format
   - Diagram/graph questions format

6. MARK DISTRIBUTION:
   - Exact marks for each question
   - Total marks calculation
   - Section-wise mark distribution
   - Match the marking scheme EXACTLY

7. VISUAL FORMATTING:
   - Page layout and margins
   - Spacing between sections
   - Boxes/frames around instructions or sections
   - Horizontal lines/dividers
   - Tables or grids (if any)
   - Any special symbols or characters

8. LANGUAGE & TONE:
   - Match the formal/informal tone
   - Question phrasing style
   - Technical terminology level
   - Complexity level matching the pattern

9. SPECIAL FEATURES:
   - "OR" questions format
   - Internal choice presentations
   - Bonus questions (if any)
   - Reference to appendices or annexures
   - Any special notes or warnings

⚠️ ABSOLUTE REQUIREMENT: Generate questions that look IDENTICAL to the pattern paper in structure, format, instructions, marking scheme, and presentation. The generated paper should be indistinguishable from the pattern in terms of format and structure, differing only in the actual question content.
`
    : '';

  const prompt = `
⚠️⚠️⚠️ CRITICAL OUTPUT REQUIREMENT ⚠️⚠️⚠️
Your response MUST contain ONLY valid LaTeX code starting with \\documentclass and ending with \\end{document}.
DO NOT include ANY conversational text, explanations, or acknowledgments.
DO NOT say "Okay", "I understand", "Here is", or any other commentary.
Start your response directly with \\documentclass and nothing else before it.

You are an expert ${subject} educator and question paper creator. ${patternText ? 'You have been provided with a question paper PATTERN/FORMAT that you MUST follow EXACTLY.' : 'Based on the following educational content, generate comprehensive questions with solutions.'}
=======
    ? `\n\n=== CRITICAL: QUESTION PAPER PATTERN TO REPLICATE EXACTLY ===\n\n${patternText}\n\n=== END OF PATTERN ===\n\nYOU MUST ANALYZE AND REPLICATE THIS PATTERN PRECISELY:\n\n1. STRUCTURE ANALYSIS:\n   - Identify all section divisions (Section A, B, C, etc.)\n   - Note the exact numbering format (Q.1, Question 1, 1., etc.)\n   - Observe spacing between questions\n   - Identify header/footer format\n\n2. MARK DISTRIBUTION:\n   - Count questions in each mark category\n   - Note how marks are indicated [X marks], (X), etc.\n   - Match the total marks and time duration\n\n3. QUESTION FORMAT:\n   - Replicate the exact question phrasing style\n   - Match MCQ format: (a), (b), (c), (d) OR A., B., C., D.\n   - Use same indentation and spacing\n   - Copy the instruction format exactly\n\n4. LAYOUT ELEMENTS:\n   - Replicate header boxes and borders\n   - Match font styles (\\\\textbf, \\\\large, etc.)\n   - Use same page margins and geometry\n   - Include any tables, rules, or decorative elements\n\n5. CONTENT STYLE:\n   - Match the difficulty level shown in pattern\n   - Use similar language and terminology\n   - Keep question lengths comparable\n   - Maintain same level of detail\n\nYOUR GENERATED OUTPUT MUST BE VISUALLY AND STRUCTURALLY INDISTINGUISHABLE FROM THE PATTERN.`
    : '';

  const prompt = `
You are an expert ${subject} educator and LaTeX document formatter.
>>>>>>> 57224a0 (pdf comes right but in website it is latex when we upload pattern)

${patternSection ? '>>> PRIORITY 1: PATTERN MATCHING <<<\n' + patternSection + '\n\n>>> PRIORITY 2: CONTENT SOURCE <<<\n' : ''}Content:
${pdfText}
${patternSection ? '' : '\n\nPlease generate high-quality ' + subject + ' questions based on this content.' + questionBreakdown}

<<<<<<< HEAD
${patternText ? '\n⚠️⚠️⚠️ CRITICAL: Your PRIMARY task is to EXACTLY replicate the pattern/format of the uploaded question paper sample while creating NEW questions based on the content provided. Think of it as creating a question paper that uses the EXACT SAME template/format as the pattern, but with different questions.\n' : ''}
${selectedGuideline}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 MANDATORY CONTENT ANALYSIS & QUESTION DISTRIBUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEFORE generating questions, you MUST:

1. ANALYZE THE CONTENT:
   - Read through the ENTIRE provided content carefully
   - Identify ALL distinct topics/chapters/units covered
   - List all topics mentally before proceeding

2. CALCULATE DISTRIBUTION:
   - Count total number of topics (let's call it N)
   - Divide total questions equally: Each topic gets approximately (Total Questions / N) questions
   - Example: If generating 20 questions and found 4 topics → 5 questions per topic

3. ENSURE NO TOPIC IS SKIPPED:
   - Every topic mentioned in the content MUST have at least 1 question
   - Avoid clustering all questions on just first few topics
   - Go through content systematically, not just initial pages

4. QUALITY OVER QUANTITY:
   - Questions should be fundamental/basic but intelligent
   - Test core understanding, not obscure details
   - Students should be able to answer with proper study
   - Avoid trick questions or unnecessarily complex wording

5. SOLUTION QUALITY:
   - Every solution must be complete and educational
   - Show all intermediate steps
   - Explain the reasoning, not just final answer
   - For numerical: show formula → substitution → calculation → result

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please generate high-quality ${subject} questions based on this content.${questionBreakdown}

Question Requirements:
${patternText ? '⚠️ FOLLOW THE PATTERN FORMAT EXACTLY - The pattern paper format takes ABSOLUTE PRIORITY over everything below!' : ''}
- Question types: ${questionTypeDesc}
- Difficulty level: ${difficulty}
- Each question should be clear and well-formatted
- Provide detailed step-by-step solutions
- Use proper LaTeX notation for all mathematical expressions${customInstructionsSection}

${patternText ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LaTeX GENERATION INSTRUCTIONS FOR PATTERN REPLICATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 PRIMARY OBJECTIVE: Create a question paper that looks IDENTICAL to the pattern in every visual aspect.

STEP-BY-STEP REPLICATION PROCESS:

1. DOCUMENT SETUP:
   - Replicate exact paper size (A4/Letter/Legal)
   - Match margin sizes (top, bottom, left, right)
   - Copy page orientation (portrait/landscape)
   - Use same font size and family

2. HEADER REPLICATION:
   - Copy institution/school name EXACTLY (spelling, capitalization, formatting)
   - Replicate logo placement if present
   - Match title format: box style, font size, bold/italic
   - Copy exam name/code format
   - Match time/duration display format
   - Replicate maximum marks display style
   - Copy date format exactly

3. INSTRUCTION BOX:
   - Use EXACT same instruction text (word-for-word, no paraphrasing)
   - Match box style (solid border, dashed, double, thick, thin)
   - Copy instruction numbering format (1. 2. 3. or i. ii. iii. or a) b) c))
   - Preserve instruction order exactly
   - Match font styling in instructions (bold, italic, underline)
   - Replicate spacing between instruction points

4. SECTION STRUCTURE:
   - Use EXACT section names from pattern (e.g., \"Section A\" not \"Part 1\")
   - Copy section descriptions verbatim
   - Match section mark distribution
   - Replicate \"attempt X out of Y\" instructions
   - Copy section dividers/lines style
   - Match spacing between sections

5. QUESTION FORMATTING:
   - Replicate question number format: Q.1, 1., Question 1, (1), etc.
   - Match mark indication: [5], (5 marks), [5M], 5 marks, etc.
   - Copy question-mark spacing/alignment
   - For sub-questions: match (a), (i), a), i., 1.1, etc.
   - Replicate indentation for sub-parts
   - Match spacing between questions

6. QUESTION TYPE FORMATS:
   - MCQ: Copy option format - (a)/(b)/(c)/(d) or A./B./C./D. or 1)/2)/3)/4)
   - Fill in blanks: Match blank line style and length
   - True/False: Copy T/F presentation format
   - Match the following: Replicate table/column structure
   - Short answer: Match space allocation format
   - Long answer: Copy mark breakdown if present

7. VISUAL ELEMENTS:
   - Copy all horizontal lines (thickness, style, placement)
   - Replicate boxes/frames (around sections, questions, etc.)
   - Match table structures exactly
   - Copy any decorative elements
   - Replicate footer style
   - Match page numbering format

8. SPACING & LAYOUT:
   - Match vertical spacing between elements
   - Copy line spacing within questions
   - Replicate paragraph spacing
   - Match indentation levels
   - Copy margin notes or side notes format

9. SPECIAL FEATURES:
   - \"OR\" questions: Copy exact format and placement
   - Internal choice: Match presentation style
   - Section-end marks: Replicate total marks display
   - Reference sections: Copy format if present
   - Rough work space: Match if indicated

10. CONTENT GENERATION:
    - NEW questions based on provided textbook content
    - Questions must FIT the pattern structure
    - Maintain same difficulty level as pattern
    - Match question length/complexity to pattern

⚠️ CRITICAL: Your output should be indistinguishable from the pattern when compiled. 
Only the actual question content should differ - everything else must be IDENTICAL.

⚠️⚠️⚠️ CRITICAL LaTeX SYNTAX RULES - MUST FOLLOW:
1. NEVER use bare underscores (_) outside math mode - they will cause compilation errors
2. For fill-in-the-blank questions, use: \\underline{\\hspace{3cm}} or \\rule{3cm}{0.4pt}
3. For blanks with text, use: \\underline{\\phantom{sample text}}
4. ALL underscores outside \\$ ... \\$ MUST be escaped as \\_
5. Ensure all math content is inside \\$ ... \\$ for inline or \\[ ... \\] for display
6. NEVER use ___ or ____ for blanks - use proper LaTeX commands
7. Ensure \\item commands are inside proper list environments (itemize/enumerate)
8. Close all opened environments and braces properly
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : `
Format your response ENTIRELY in LaTeX using this EXACT structure for a proper exam paper:

\\documentclass[12pt,a4paper]{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage{graphicx}
\\usepackage{array}
\\usepackage{multirow}
\\usepackage{setspace}
\\geometry{a4paper, left=2cm, right=2cm, top=2.5cm, bottom=2.5cm}

% Page style
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\small\\textbf{${subject.charAt(0).toUpperCase() + subject.slice(1)} - Question Paper}}
\\fancyhead[R]{\\small\\textbf{Page \\thepage}}
\\fancyfoot[C]{\\small\\textit{Turn over}}
\\renewcommand{\\headrulewidth}{0.5pt}
\\renewcommand{\\footrulewidth}{0.5pt}

\\begin{document}
\\setstretch{1.15}

% Top Border
\\noindent\\rule{\\textwidth}{2pt}
\\vspace{0.2cm}

% Header Section - Professional Format
\\begin{center}
\\begin{tabular}{|p{\\dimexpr\\textwidth-2\\tabcolsep-2\\arrayrulewidth}|}
\\hline
\\multicolumn{1}{|c|}{\\Large\\textbf{EXAMINATION}} \\\\
\\multicolumn{1}{|c|}{\\vspace{0.1cm}} \\\\
\\multicolumn{1}{|c|}{\\large\\textbf{${subject.charAt(0).toUpperCase() + subject.slice(1).toUpperCase()}}} \\\\
\\hline
\\end{tabular}
\\end{center}

\\vspace{0.3cm}

% Exam Details Table
\\noindent\\begin{tabular}{|p{0.48\\textwidth}|p{0.48\\textwidth}|}
\\hline
\\textbf{Duration:} 3 Hours & \\textbf{Maximum Marks:} 100 \\\\
\\hline
\\textbf{Difficulty:} ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} & \\textbf{Date:} \\underline{\\hspace{4cm}} \\\\
\\hline
\\end{tabular}

\\vspace{0.4cm}

% Instructions Box - Professional Style
\\noindent\\fbox{\\parbox{\\dimexpr\\textwidth-2\\fboxsep-2\\fboxrule\\relax}{
\\begin{center}
\\textbf{\\large GENERAL INSTRUCTIONS}
\\end{center}
\\vspace{0.2cm}
\\begin{enumerate}[leftmargin=1.5cm, itemsep=3pt, topsep=5pt]
    \\item All questions are compulsory unless stated otherwise.
    \\item Read each question carefully before attempting.
    \\item Marks are indicated against each question.
    \\item Show all necessary working and reasoning.
    \\item Write your answers neatly and legibly.
    \\item Rough work should be done on separate sheets.
    \\item Use of calculator is permitted where applicable.
    ${questionBreakdown ? '\\item ' + questionBreakdown.replace(/\n/g, '\n    \\item ').replace('1 Mark Questions:', '\\textbf{Section breakdown:} 1 Mark Questions').replace('Questions by Marks:', 'Higher Mark Questions') : ''}
\\end{enumerate}
\\vspace{0.1cm}
}}

\\vspace{0.5cm}
\\noindent\\rule{\\textwidth}{1pt}
\\vspace{0.3cm}

% Questions Section Header
\\begin{center}
\\textbf{\\Large SECTION: QUESTIONS}
\\end{center}
\\vspace{0.3cm}
\\noindent\\rule{\\textwidth}{0.5pt}
\\vspace{0.4cm}

[Now generate each question using this EXACT format with proper spacing:

\\noindent\\textbf{Q.1} \\hfill \\textbf{[X marks]}
\\vspace{0.2cm}

\\noindent [Question text with proper LaTeX math formatting. Ensure proper line spacing and indentation.]

\\vspace{0.3cm}

\\noindent\\textbf{Solution:}
\\vspace{0.1cm}

\\noindent [Detailed step-by-step solution with proper formatting]

\\vspace{0.5cm}
\\noindent\\rule{0.5\\textwidth}{0.3pt}
\\vspace{0.5cm}

Repeat for all questions. For MCQs, use this format:

\\noindent\\textbf{Q.1} \\hfill \\textbf{[1 mark]}
\\vspace{0.2cm}

\\noindent [MCQ question text]

\\vspace{0.2cm}
\\noindent\\begin{enumerate}[label=(\\alph*), leftmargin=1.5cm, itemsep=2pt]
    \\item Option A
    \\item Option B
    \\item Option C
    \\item Option D
\\end{enumerate}

\\vspace{0.3cm}

For Fill in the Blanks:
\\noindent\\textbf{Q.X} \\hfill \\textbf{[1 mark]}
\\vspace{0.2cm}

\\noindent Fill in the blank: [text] \\underline{\\hspace{3cm}} [more text].

\\vspace{0.3cm}]

\\end{document}

\\end{document}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL LATEX SYNTAX REQUIREMENTS (MUST FOLLOW TO AVOID COMPILATION ERRORS):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ SPECIAL CHARACTERS - ABSOLUTE RULES:
1. UNDERSCORES: 
   - NEVER EVER write bare underscores: ___ or ____ or _
   - For fill-in-blanks: Use \\underline{\\hspace{3cm}} or \\rule{3cm}{0.4pt}
   - For subscripts: Use math mode $x_1$ or escape as \\_
   - If you write ___ the PDF will FAIL to compile!

2. OTHER SPECIAL CHARACTERS (outside math mode):
   - & must be \\&
   - % must be \\%
   - # must be \\#
   - $ must be \\$ (except for math delimiters)
   - ~ must be \\~{}
   - ^ must be \\^{} (except in math mode)

3. MATH MODE:
   - Inline math: $x + y$
   - Display math: \\[ x + y \\] or $$x + y$$
   - NEVER use bare $ signs outside math mode
   - For exponents/superscripts: MUST use math mode: $e^{kt}$ NOT e^(kt)
   - For subscripts: MUST use math mode: $x_1$ NOT x_1

4. FORMATTING:
   - Use \\noindent\\textbf{Q.N} \\hfill \\textbf{[X marks]} for each question header (where N is question number)
   - Use \\noindent\\textbf{Solution:} for each solution
   - For MCQs: Use (a), (b), (c), (d) format or \begin{enumerate}[label=(\alph*)]
   - Add \\vspace{0.5cm} between questions for spacing
   - All \\item commands MUST be inside \\begin{itemize} or \\begin{enumerate}
   - Add \\noindent\\rule{0.5\\textwidth}{0.3pt} after each question-solution pair as separator

5. STRUCTURE:
   - Close all braces { } properly
   - Close all environments (every \\begin{X} needs \\end{X})
   - Number questions consecutively starting from 1
   - Make questions relevant to the provided content

6. BEST PRACTICES:
   - Test all LaTeX syntax mentally before outputting
   - When in doubt, use simpler LaTeX commands
   - Prefer standard commands over custom ones
   - Keep formatting consistent throughout

⚠️ REMEMBER: One syntax error will break the entire PDF compilation. Be meticulous!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`}
=======
${patternSection ? '\n\n>>> GENERATION INSTRUCTIONS <<<\n\nYou MUST:\n1. Extract the EXACT LaTeX structure from the pattern above\n2. Keep ALL formatting elements: \\\\documentclass, \\\\usepackage, \\\\geometry, headers, footers, boxes, tables, rules\n3. Maintain the EXACT question numbering and section format\n4. Match the mark distribution precisely\n5. Generate NEW questions (from the content PDF) that fit this EXACT format\n6. Use the same spacing, fonts, and layout\n7. Include solutions in the SAME format as shown in pattern (if pattern has solutions)\n\nYour output should be ready-to-compile LaTeX that looks IDENTICAL to the pattern but with new questions from the content.' : 'Question Requirements:\n- Question types: ' + questionTypeDesc + '\n- Difficulty level: ' + difficulty + '\n- Each question should be clear and well-formatted\n- Provide detailed step-by-step solutions\n- Use proper LaTeX notation for all mathematical expressions' + customInstructionsSection + '\n\nFormat your response ENTIRELY in LaTeX using this EXACT structure for a proper exam paper:'}

${patternSection ? '' : '\n\\documentclass[12pt,a4paper]{article}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\usepackage{geometry}\n\\usepackage{enumitem}\n\\usepackage{fancyhdr}\n\\usepackage{graphicx}\n\\geometry{margin=0.75in, top=1in, bottom=1in}\n\n\\pagestyle{fancy}\n\\fancyhf{}\n\\fancyhead[L]{\\textbf{' + subject.charAt(0).toUpperCase() + subject.slice(1) + ' Examination}}\n\\fancyhead[R]{\\textbf{Page \\thepage}}\n\\fancyfoot[C]{\\small All questions carry marks as indicated}\n\n\\begin{document}\n\n% Header Section\n\\begin{center}\n{\\Large \\textbf{EXAMINATION PAPER}}\\\\[0.3cm]\n{\\large \\textbf{Subject: ' + subject.charAt(0).toUpperCase() + subject.slice(1) + '}}\\\\[0.2cm]\n{\\textbf{Difficulty Level: ' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + '}}\\\\[0.2cm]\n\\rule{\\textwidth}{0.4pt}\n\\end{center}\n\n\\vspace{0.3cm}\n\n% Instructions Box\n\\noindent\\fbox{\\parbox{\\dimexpr\\textwidth-2\\fboxsep-2\\fboxrule}{\n\\textbf{INSTRUCTIONS TO CANDIDATES:}\\\\[0.2cm]\n\\begin{itemize}[leftmargin=*, itemsep=0pt]\n\\item Read all questions carefully before attempting.\n\\item Answer all questions in the space provided or on separate sheets.\n\\item Show all working for full credit.\n\\item Marks for each question are indicated in brackets.\n\\item Use of calculator is permitted (if applicable).\n' + (questionBreakdown ? '\\item ' + questionBreakdown.replace(/\n/g, '\n\\item ').replace('1 Mark Questions:', '\\textbf{Section A:} 1 Mark Questions').replace('Questions by Marks:', '\\textbf{Section B:} Higher Mark Questions') : '') + '\n\\end{itemize}\n}}\n\n\\vspace{0.5cm}\n\n% Questions Section\n\\section*{QUESTIONS}\n\n[Now generate each question using this EXACT format:\n\n\\subsection*{Question 1 [X marks]}\n[Question text with proper LaTeX math formatting]\n\n\\subsection*{Solution}\n[Detailed solution with step-by-step explanation]\n\n\\vspace{0.5cm}\n\nRepeat for all questions, ensuring proper numbering and mark allocation.]\n\n\\end{document}\n\nCRITICAL FORMATTING REQUIREMENTS:\n- Use \\subsection*{Question N [X marks]} for each question header\n- Use \\subsection*{Solution} for each solution\n- Use $...$ for inline math and $$...$$ or \\[...\\] for display math\n- For MCQs: Use (a), (b), (c), (d) format\n- For Fill in Blanks: Use \\underline{\\hspace{3cm}} for blanks\n- Add \\vspace{0.5cm} between questions for spacing\n- Make questions relevant to the provided content\n- STRICTLY follow the custom instructions if provided\n- Number questions consecutively starting from 1'}
>>>>>>> 57224a0 (pdf comes right but in website it is latex when we upload pattern)
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 16 * 1024 * 1024, // 16MB
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        return res.status(500).json({ error: 'Failed to parse form data' });
      }

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const patternFile = Array.isArray(files.patternFile) ? files.patternFile[0] : files.patternFile;

      const filePath = (file as File).filepath;
      const patternFilePath = patternFile ? (patternFile as File).filepath : null;

      try {
        // Extract metadata
        const metadata: PDFMetadata = {
          subject: Array.isArray(fields.subject) ? fields.subject[0] : fields.subject,
          questionTypes: Array.isArray(fields.questionTypes) 
            ? fields.questionTypes 
            : (fields.questionTypes ? [fields.questionTypes] : undefined),
          difficulty: Array.isArray(fields.difficulty) ? fields.difficulty[0] : fields.difficulty,
          customInstructions: Array.isArray(fields.customInstructions) ? fields.customInstructions[0] : fields.customInstructions,
        };

        // Parse JSON fields
        if (fields.questionsByType) {
          const qbtStr = Array.isArray(fields.questionsByType) ? fields.questionsByType[0] : fields.questionsByType;
          try {
            metadata.questionsByType = JSON.parse(qbtStr);
          } catch (e) {
            console.error('Error parsing questionsByType:', e);
          }
        }

        if (fields.questionsByMarks) {
          const qbmStr = Array.isArray(fields.questionsByMarks) ? fields.questionsByMarks[0] : fields.questionsByMarks;
          try {
            metadata.questionsByMarks = JSON.parse(qbmStr);
          } catch (e) {
            console.error('Error parsing questionsByMarks:', e);
          }
        }

        // Extract text from PDF
        const pdfText = await extractTextFromPDF(filePath);

        if (!pdfText.trim()) {
          // Clean up uploaded files
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          if (patternFilePath && fs.existsSync(patternFilePath)) {
            fs.unlinkSync(patternFilePath);
          }
          return res.status(400).json({ error: 'Could not extract text from PDF' });
        }

        // Extract pattern text if pattern file provided
        let patternText: string | undefined;
        if (patternFilePath) {
          try {
            patternText = await extractTextFromPDF(patternFilePath);
          } catch (error) {
            console.error('Error extracting pattern text:', error);
            // Continue without pattern if extraction fails
          }
        }

        // Generate questions using Gemini
        let latexContent = await generateQuestionsWithGemini(pdfText, metadata, patternText);
        
        // Extract LaTeX from AI response - handle multiple formats
        // 1. Remove any conversational text before the LaTeX
        // 2. Extract content from markdown code blocks
        // 3. Find the actual \documentclass start
        
        // First, try to extract from markdown code blocks
        const codeBlockMatch = latexContent.match(/```(?:latex)?\s*\n([\s\S]*?)\n```/i);
        if (codeBlockMatch) {
          latexContent = codeBlockMatch[1];
        } else {
          // Remove leading markdown code fence if present
          latexContent = latexContent.replace(/^```(?:latex)?\s*\n?/i, '');
          // Remove trailing markdown code fence if present
          latexContent = latexContent.replace(/\n?```\s*$/i, '');
        }
        
        // Find the start of actual LaTeX (should begin with \documentclass)
        const docStartMatch = latexContent.match(/\\documentclass[\s\S]*/);
        if (docStartMatch) {
          latexContent = docStartMatch[0];
        }
        
        // Trim any remaining whitespace
        latexContent = latexContent.trim();

        // Clean up uploaded files
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        if (patternFilePath && fs.existsSync(patternFilePath)) {
          fs.unlinkSync(patternFilePath);
        }

        return res.status(200).json({
          success: true,
          latex: latexContent,
        });
      } catch (error: any) {
        console.error('Processing error:', error);
        // Clean up on error
        if (filePath && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
          }
        }
        if (patternFilePath && fs.existsSync(patternFilePath)) {
          try {
            fs.unlinkSync(patternFilePath);
          } catch (cleanupError) {
            console.error('Pattern cleanup error:', cleanupError);
          }
        }
        return res.status(500).json({ error: error.message || 'Failed to process PDF' });
      }
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
