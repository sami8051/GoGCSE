import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExamResult, ExamPaper } from '../types';

export class PdfService {
    static generateExamPdf(result: ExamResult, paper: ExamPaper): Blob {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // --- Header ---
        doc.setFontSize(22);
        doc.setTextColor(41, 128, 185); // Edexcel Blue
        doc.text("Exam Result Report", pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Paper: ${paper.title}`, 14, 35);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 42);

        // --- Score Summary ---
        doc.setDrawColor(200);
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(14, 50, pageWidth - 28, 25, 3, 3, 'FD');

        doc.setFontSize(14);
        doc.text(`Total Score: ${result.totalScore} / ${result.maxScore}`, 20, 62);
        doc.text(`Grade Estimate: ${result.gradeEstimate}`, 20, 70); // Estimate

        // --- Overall Feedback ---
        doc.setFontSize(14);
        doc.setTextColor(41, 128, 185);
        doc.text("Examiner's Feedback", 14, 90);

        doc.setFontSize(10);
        doc.setTextColor(60);
        const feedbackLines = doc.splitTextToSize(result.overallFeedback, pageWidth - 28);
        doc.text(feedbackLines, 14, 98);

        let finalY = 98 + (feedbackLines.length * 5) + 10;

        // --- Detailed Breakdown Table ---
        const tableData = result.questionResults.map(q => [
            q.questionId,
            `${q.score} / ${q.maxScore}`,
            `Level ${q.level}`,
            q.feedback.substring(0, 200) + (q.feedback.length > 200 ? '...' : '')
        ]);

        autoTable(doc, {
            startY: finalY,
            head: [['Q', 'Score', 'Level', 'Feedback']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 20 },
                2: { cellWidth: 20 },
                3: { cellWidth: 'auto' }
            }
        });

        // Get final Y from table
        finalY = (doc as any).lastAutoTable.finalY + 15;

        // --- Model Answers Section ---
        if (finalY > 250) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(41, 128, 185);
        doc.text("Detailed Analysis", 14, finalY);
        finalY += 10;

        result.questionResults.forEach((q) => {
            if (finalY > 250) {
                doc.addPage();
                finalY = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(`Question ${q.questionId} (${q.score}/${q.maxScore})`, 14, finalY);
            finalY += 7;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);

            const studentLabel = "Your Answer:";
            doc.text(studentLabel, 14, finalY);
            // Check if student answer exists (it should now!)
            let sAns = q.studentAnswer || "(No answer recorded)";
            // Truncate if insanely long to save space
            if (sAns.length > 500) sAns = sAns.substring(0, 500) + "... [truncated]";
            const sLines = doc.splitTextToSize(sAns, pageWidth - 40);
            doc.text(sLines, 14, finalY + 5);
            finalY += (sLines.length * 5) + 10;

            const modelLabel = "Model Answer / Key Points:";
            doc.setTextColor(0, 100, 0); // Greenish
            doc.text(modelLabel, 14, finalY);
            doc.setTextColor(60);
            const mLines = doc.splitTextToSize(q.modelAnswer, pageWidth - 40);
            doc.text(mLines, 14, finalY + 5);

            finalY += (mLines.length * 5) + 15;
        });

        // --- Source Materials Section ---
        if (paper.sources && paper.sources.length > 0) {
            doc.addPage();
            finalY = 20;

            doc.setFontSize(16);
            doc.setTextColor(41, 128, 185);
            doc.setFont("helvetica", "bold");
            doc.text("Source Materials Booklet", 14, finalY);
            finalY += 15;

            paper.sources.forEach(source => {
                if (finalY > 250) {
                    doc.addPage();
                    finalY = 20;
                }

                doc.setFontSize(12);
                doc.setTextColor(0);
                doc.setFont("helvetica", "bold");
                doc.text(`Source ${source.id}: ${source.title}`, 14, finalY);
                finalY += 7;

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(80);
                doc.text(`${source.author} (${source.year})`, 14, finalY);
                finalY += 10;

                doc.setTextColor(0);
                doc.setFont("times", "roman"); // Serif for reading text
                doc.setFontSize(11);

                const contentLines = doc.splitTextToSize(source.content, pageWidth - 28);

                // Render lines ensuring page breaks
                // We can't just dump all lines because it might overflow the single page check
                // So we assume splitTextToSize handles width, but we need to loop for height

                // Simpler approach given jsPDF limitations without heavy logic:
                // Use autoTable to handle the text flow across pages? 
                // Or just chunk it. Let's use a simple loop.

                let currentY = finalY;
                const lineHeight = 5;

                for (let i = 0; i < contentLines.length; i++) {
                    if (currentY > 280) {
                        doc.addPage();
                        currentY = 20;
                    }
                    doc.text(contentLines[i], 14, currentY);
                    currentY += lineHeight;
                }

                finalY = currentY + 15;
                doc.setFont("helvetica", "normal"); // Reset
            });
        }

        return doc.output('blob');
    }
}
