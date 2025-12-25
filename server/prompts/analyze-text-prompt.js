/**
 * TEXT ANALYSIS PROMPT
 * 
 * Used in Language Lab to analyze a piece of text for language methods and structural features.
 * 
 * Variables injected at runtime:
 * - {{TEXT}} - The text to analyze
 */

module.exports = `Analyze the following text for language methods and structural features used by the writer.
Focus on techniques relevant to GCSE English Language (e.g., metaphor, simile, personification, alliteration, pathetic fallacy, sentence structure, etc.).

Text: "{{TEXT}}"

Output JSON format:
{
  "methods": [
    {
      "name": "Method Name",
      "quote": "Quote from text",
      "effect": "Explanation of the effect on the reader"
    }
  ],
  "summary": "Brief summary of the writer's style"
}
`;
