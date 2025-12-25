/**
 * PROMPTS INDEX
 * 
 * Central export for all prompt files.
 * Import this file in server/index.js to use the prompts.
 */

const examGenerationSystem = require('./exam-generation-system');
const markingGrids = require('./marking-grids');
const markingPrompt = require('./marking-prompt');
const modelAnswersPrompt = require('./model-answers-prompt');
const analyzeTextPrompt = require('./analyze-text-prompt');
const evaluateWritingPrompt = require('./evaluate-writing-prompt');
const jsonFormats = require('./json-formats');

module.exports = {
    examGenerationSystem,
    markingGrids,
    markingPrompt,
    modelAnswersPrompt,
    analyzeTextPrompt,
    evaluateWritingPrompt,
    jsonFormats
};
