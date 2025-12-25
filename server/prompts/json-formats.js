/**
 * JSON FORMAT TEMPLATES
 * 
 * These are the expected JSON output structures for exam generation.
 * Edit these to change the question structures and formats.
 */

const paper1JsonFormat = {
    title: "Paper 1: Fiction and Imaginative Writing",
    description: "19th-century fiction and imaginative writing tasks.",
    sources: [
        { id: "A", title: "Title", author: "Author", year: "18XX", content: "Full text...", summary: "Short summary" }
    ],
    questions: [
        { id: "1", number: "1", text: "From the beginning of the extract...", marks: 1, aos: ["AO1"], section: "A", sourceRef: "Source A (Beginning)", type: "short" },
        { id: "2", number: "2", text: "...", marks: 2, aos: ["AO1"], section: "A", sourceRef: "Source A", type: "short" },
        { id: "3", number: "3", text: "...", marks: 6, aos: ["AO2"], section: "A", sourceRef: "Source A", type: "long" },
        { id: "4", number: "4", text: "In this extract, the writer...", marks: 15, aos: ["AO4"], section: "A", sourceRef: "Source A (Whole Text)", type: "extended" },
        { id: "5", number: "5", text: "Write a story about...", marks: 40, aos: ["AO5", "AO6"], section: "B", type: "extended", optionalGroup: "writing_choice", wordCountTarget: 450 },
        { id: "6", number: "6", text: "Look at the images provided. Write a description suggested by...", marks: 40, aos: ["AO5", "AO6"], section: "B", type: "extended", optionalGroup: "writing_choice", wordCountTarget: 450, imagePromptDescription: "A stormy coastline with a lighthouse", imagePromptDescription2: "An abandoned cabin in the woods" }
    ]
};

const paper2JsonFormat = {
    title: "Paper 2: Non-fiction and Transactional Writing",
    description: "Non-fiction texts and transactional writing.",
    sources: [
        { id: "A", title: "Title", author: "Author", year: "20XX", content: "Full text...", summary: "Summary" },
        { id: "B", title: "Title", author: "Author", year: "18XX", content: "Full text...", summary: "Summary" }
    ],
    questions: [
        { id: "1", number: "1", text: "...", marks: 2, aos: ["AO1"], section: "A", sourceRef: "Source A", type: "short" },
        { id: "2", number: "2", text: "...", marks: 2, aos: ["AO1"], section: "A", sourceRef: "Source B", type: "short" },
        { id: "3", number: "3", text: "...", marks: 15, aos: ["AO2"], section: "A", sourceRef: "Source B", type: "extended" },
        { id: "4", number: "4", text: "...", marks: 1, aos: ["AO3"], section: "A", type: "short" },
        { id: "5", number: "5", text: "...", marks: 1, aos: ["AO3"], section: "A", type: "short" },
        { id: "6", number: "6", text: "...", marks: 15, aos: ["AO4"], section: "A", sourceRef: "Source A", type: "extended" },
        { id: "7a", number: "7a", text: "...", marks: 6, aos: ["AO5"], section: "B", type: "short" },
        { id: "7b", number: "7b", text: "...", marks: 14, aos: ["AO5", "AO6"], section: "B", type: "long" },
        { id: "8", number: "8", text: "...", marks: 40, aos: ["AO5", "AO6"], section: "B", type: "extended", optionalGroup: "writing_choice" },
        { id: "9", number: "9", text: "...", marks: 40, aos: ["AO5", "AO6"], section: "B", type: "extended", optionalGroup: "writing_choice" }
    ]
};

module.exports = {
    paper1: JSON.stringify(paper1JsonFormat, null, 2),
    paper2: JSON.stringify(paper2JsonFormat, null, 2)
};
