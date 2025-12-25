/**
 * MODEL ANSWERS PROMPT
 * 
 * Used to generate detailed mark schemes and model answers for an exam paper.
 * 
 * Variables injected at runtime:
 * - {{PAPER_TITLE}} - The title of the paper
 * - {{SOURCE_A}} - First 1000 chars of Source A
 * - {{SOURCE_B_SECTION}} - First 1000 chars of Source B (if Paper 2)
 * - {{QUESTIONS_LIST}} - List of questions with their text
 */

module.exports = `Create a detailed Mark Scheme and Model Answer document for this GCSE English Language Exam Paper ({{PAPER_TITLE}}).

Source A:
{{SOURCE_A}}...
{{SOURCE_B_SECTION}}

Questions:
{{QUESTIONS_LIST}}

Output Requirements:
- Format as valid Markdown.
- Include "Examiner's Report" style commentary.
- For the optional writing questions, provide a model for BOTH options.
`;
