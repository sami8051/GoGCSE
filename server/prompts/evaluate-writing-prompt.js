/**
 * WRITING EVALUATION PROMPT
 * 
 * Used in Language Lab to evaluate student writing when practicing a specific language method.
 * 
 * Variables injected at runtime:
 * - {{TARGET_METHOD}} - The language method the student was asked to use
 * - {{STUDENT_TEXT}} - The student's writing
 */

module.exports = `Evaluate the following student writing. The student was asked to use the language method: "{{TARGET_METHOD}}".

Student Writing: "{{STUDENT_TEXT}}"

Output JSON format:
{
  "success": boolean,
  "feedback": "Specific feedback on how well they used {{TARGET_METHOD}}.",
  "improvementTip": "One tip to improve."
}
`;
