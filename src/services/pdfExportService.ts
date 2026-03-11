import jsPDF from 'jspdf';
import { Quiz, StudentResult, QuestionType } from '../types';

interface ExportOptions {
    quiz: Quiz;
    result: StudentResult;
    answers: Record<string, any>;
    studentName?: string;
    studentClass?: string;
}

/**
 * Export quiz result to PDF
 */
export const exportResultToPDF = async (options: ExportOptions): Promise<void> => {
    const { quiz, result, answers, studentName, studentClass } = options;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Helper function to add new page if needed
    const checkNewPage = (requiredHeight: number = 20) => {
        if (yPos + requiredHeight > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
        }
    };

    // Helper to split long text
    const splitText = (text: string, maxWidth: number): string[] => {
        return doc.splitTextToSize(text, maxWidth);
    };

    // ===== HEADER =====
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('KẾT QUẢ BÀI KIỂM TRA', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const titleLines = splitText(quiz.title, pageWidth - 2 * margin);
    doc.text(titleLines, pageWidth / 2, 28, { align: 'center' });

    yPos = 55;

    // ===== STUDENT INFO =====
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);

    if (studentName) {
        doc.setFont('helvetica', 'bold');
        doc.text('Họ tên:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(studentName, margin + 25, yPos);
        yPos += 7;
    }

    if (studentClass) {
        doc.setFont('helvetica', 'bold');
        doc.text('Lớp:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(studentClass, margin + 25, yPos);
        yPos += 7;
    }

    // Date
    doc.setFont('helvetica', 'bold');
    doc.text('Ngày làm:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('vi-VN'), margin + 25, yPos);
    yPos += 12;

    // ===== SCORE SECTION =====
    const scoreBoxWidth = 50;
    const scoreBoxHeight = 30;
    const scoreBoxX = (pageWidth - scoreBoxWidth) / 2;

    // Score box background
    const scoreColor = result.score >= 8 ? [16, 185, 129] : // Green
        result.score >= 5 ? [245, 158, 11] : // Yellow
            [239, 68, 68]; // Red

    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.roundedRect(scoreBoxX, yPos, scoreBoxWidth, scoreBoxHeight, 5, 5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(`${result.score}`, pageWidth / 2, yPos + 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text('điểm', pageWidth / 2, yPos + 23, { align: 'center' });

    yPos += scoreBoxHeight + 10;

    // ===== STATS ROW =====
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    const statsY = yPos;
    const colWidth = (pageWidth - 2 * margin) / 3;

    // Correct
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(margin, statsY, colWidth - 5, 20, 3, 3, 'F');
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.text(`${result.correctCount}`, margin + (colWidth - 5) / 2, statsY + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Câu đúng', margin + (colWidth - 5) / 2, statsY + 16, { align: 'center' });

    // Wrong
    const wrongCount = result.totalQuestions - result.correctCount;
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(margin + colWidth, statsY, colWidth - 5, 20, 3, 3, 'F');
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${wrongCount}`, margin + colWidth + (colWidth - 5) / 2, statsY + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Câu sai', margin + colWidth + (colWidth - 5) / 2, statsY + 16, { align: 'center' });

    // Total
    doc.setFillColor(224, 231, 255);
    doc.roundedRect(margin + 2 * colWidth, statsY, colWidth - 5, 20, 3, 3, 'F');
    doc.setTextColor(79, 70, 229);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${result.totalQuestions}`, margin + 2 * colWidth + (colWidth - 5) / 2, statsY + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Tổng câu', margin + 2 * colWidth + (colWidth - 5) / 2, statsY + 16, { align: 'center' });

    yPos = statsY + 30;

    // ===== QUESTIONS DETAIL =====
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CHI TIẾT CÂU TRẢ LỜI', margin, yPos);
    yPos += 10;

    quiz.questions.forEach((q, index) => {
        checkNewPage(40);

        const answer = answers[q.id];
        const isCorrect = checkAnswer(q, answer);

        // Question number and status
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');

        if (isCorrect) {
            doc.setTextColor(22, 163, 74);
            doc.text(`✓ Câu ${index + 1}`, margin, yPos);
        } else {
            doc.setTextColor(220, 38, 38);
            doc.text(`✗ Câu ${index + 1}`, margin, yPos);
        }

        // Question type badge
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const typeLabel = getQuestionTypeLabel(q.type);
        doc.text(`[${typeLabel}]`, margin + 25, yPos);

        yPos += 6;

        // Question text
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const questionText = getQuestionText(q);
        // Remove LaTeX for PDF (simple cleanup)
        const cleanText = cleanLatex(questionText);
        const questionLines = splitText(cleanText, pageWidth - 2 * margin);
        doc.text(questionLines, margin, yPos);
        yPos += questionLines.length * 5 + 3;

        // Student answer
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Em trả lời: ', margin, yPos);
        doc.setFont('helvetica', 'normal');
        const studentAnswer = formatAnswer(q, answer);
        doc.text(cleanLatex(studentAnswer), margin + 25, yPos);
        yPos += 5;

        // Correct answer (if wrong)
        if (!isCorrect) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(22, 163, 74);
            doc.text('Đáp án đúng: ', margin, yPos);
            doc.setFont('helvetica', 'normal');
            const correctAnswer = getCorrectAnswer(q);
            doc.text(cleanLatex(correctAnswer), margin + 30, yPos);
            yPos += 5;
        }

        doc.setTextColor(0, 0, 0);
        yPos += 5;
    });

    // ===== FOOTER =====
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Trang ${i} / ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
        doc.text(
            'Được tạo bởi iTong Quiz',
            pageWidth - margin,
            pageHeight - 10,
            { align: 'right' }
        );
    }

    // Save the PDF
    const fileName = `ket-qua-${quiz.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`;
    doc.save(fileName);
};

// ===== HELPER FUNCTIONS =====

function checkAnswer(question: any, answer: any): boolean {
    if (!answer && answer !== false && answer !== 0) return false;

    switch (question.type) {
        case QuestionType.MCQ:
        case QuestionType.IMAGE_QUESTION:
            return answer === question.correctAnswer;
        case QuestionType.SHORT_ANSWER:
            return String(answer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
        case QuestionType.TRUE_FALSE:
            const items = question.items || [];
            return items.every((item: any, idx: number) => {
                const itemKey = item.id || `item-${idx}`;
                return answer?.[itemKey] === item.isCorrect;
            });
        case QuestionType.MATCHING:
            const pairs = question.pairs || [];
            return pairs.every((p: any) => answer?.[p.left] === p.right);
        case QuestionType.MULTIPLE_SELECT:
            const studentAns = (answer as string[]) || [];
            const correctAns = question.correctAnswers || [];
            return studentAns.length === correctAns.length && studentAns.every((v: string) => correctAns.includes(v));
        case QuestionType.DRAG_DROP: {
            let ddText = question.text || "";
            const ddBlanks = question.blanks || [];
            if ((!ddText || !ddText.includes('[')) && ddBlanks.length > 0) {
                ddText = ddBlanks.map((_: any, i: number) => `[blank_${i}]`).join(" ");
            }
            const ddParts = ddText.split(/(\[.*?\])/g);
            let ddBlankIndex = 0;
            let isDDCorrect = true;
            ddParts.forEach((part: string, partIdx: number) => {
                if (part.startsWith('[') && part.endsWith(']')) {
                    const correctWord = ddBlanks[ddBlankIndex];
                    const studentWord = answer?.[partIdx];
                    if (studentWord !== correctWord) isDDCorrect = false;
                    ddBlankIndex++;
                }
            });
            return isDDCorrect && ddBlanks.length > 0;
        }
        case QuestionType.DROPDOWN:
            const dropdownBlanks = question.blanks || [];
            return dropdownBlanks.every((b: any) => answer?.[b.id] === b.correctAnswer);
        case QuestionType.ORDERING: {
            let oCorrect = question.correctOrder || [];
            if (!Array.isArray(oCorrect) || oCorrect.length === 0) {
                try { oCorrect = JSON.parse(question.correctAnswer); } catch { }
            }
            if (!Array.isArray(oCorrect)) return false;
            if (Array.isArray(answer)) {
                return answer.length === oCorrect.length && answer.every((val: number, idx: number) => Number(val) === Number(oCorrect[idx]));
            } else if (typeof answer === 'object') {
                for (let i = 0; i < oCorrect.length; i++) {
                    if (Number(answer[oCorrect[i]]) !== i + 1) return false;
                }
                return oCorrect.length > 0;
            }
            return false;
        }
        case QuestionType.CATEGORIZATION:
            return (question.items || []).every((item: any) => {
                const studentCatId = answer?.[item.id];
                return item.categoryId ? studentCatId === item.categoryId : !studentCatId;
            });
        case QuestionType.UNDERLINE: {
            const sIdxs = (answer as number[]) || [];
            const cIdxs = question.correctWordIndexes || [];
            if (sIdxs.length !== cIdxs.length) return false;
            const sS = [...sIdxs].sort((a, b) => a - b);
            const cS = [...cIdxs].sort((a, b) => a - b);
            return sS.every((val, idx) => val === cS[idx]);
        }
        case QuestionType.WORD_SCRAMBLE: {
            const letters = question.letters || [];
            const word = ((answer as number[]) || []).map((i: number) => letters[i]).join('');
            return word.toLowerCase().replace(/\s+/g, '') === (question.correctWord || '').toLowerCase().replace(/\s+/g, '');
        }
        case QuestionType.RIDDLE:
            return String(answer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
        case QuestionType.ERROR_CORRECTION: {
            const ecAnswer = answer as { wrongWord?: string; correctWord?: string } || {};
            const sWrong = String(ecAnswer.wrongWord || '').toLowerCase().trim();
            const sCorrect = String(ecAnswer.correctWord || '').toLowerCase().trim();
            const eWrong = String(question.wrongWord || '').toLowerCase().trim();
            const eCorrect = String(question.correctWord || '').toLowerCase().trim();
            return sWrong !== '' && sCorrect !== '' && sWrong === eWrong && sCorrect === eCorrect;
        }
        default:
            return false;
    }
}

function getQuestionTypeLabel(type: QuestionType): string {
    const labels: Record<string, string> = {
        MCQ: 'Trắc nghiệm',
        TRUE_FALSE: 'Đúng/Sai',
        SHORT_ANSWER: 'Tự luận',
        MATCHING: 'Nối cặp',
        MULTIPLE_SELECT: 'Chọn nhiều',
        DRAG_DROP: 'Kéo thả',
        CATEGORIZATION: 'Phân loại'
    };
    return labels[type] || type;
}

function getQuestionText(question: any): string {
    if (question.type === QuestionType.TRUE_FALSE) {
        return question.mainQuestion || '';
    }
    return question.question || '';
}

function formatAnswer(question: any, answer: any): string {
    if (!answer && answer !== false && answer !== 0) return '(Không trả lời)';

    switch (question.type) {
        case QuestionType.MCQ:
            const optIndex = ['A', 'B', 'C', 'D'].indexOf(answer);
            if (optIndex >= 0 && question.options?.[optIndex]) {
                return `${answer}. ${question.options[optIndex]}`;
            }
            return answer;
        case QuestionType.MULTIPLE_SELECT:
            return (answer as string[]).join(', ');
        case QuestionType.TRUE_FALSE:
            return Object.entries(answer || {})
                .map(([k, v]) => `${v ? 'Đúng' : 'Sai'}`)
                .join(', ');
        case QuestionType.MATCHING:
            return Object.entries(answer || {})
                .map(([left, right]) => `${left} → ${right}`)
                .join('; ');
        default:
            return String(answer);
    }
}

function getCorrectAnswer(question: any): string {
    switch (question.type) {
        case QuestionType.MCQ:
            const ans = question.correctAnswer;
            const idx = ['A', 'B', 'C', 'D'].indexOf(ans);
            if (idx >= 0 && question.options?.[idx]) {
                return `${ans}. ${question.options[idx]}`;
            }
            return ans;
        case QuestionType.MULTIPLE_SELECT:
            return (question.correctAnswers || []).join(', ');
        case QuestionType.TRUE_FALSE:
            return (question.items || [])
                .map((item: any) => item.isCorrect ? 'Đúng' : 'Sai')
                .join(', ');
        case QuestionType.MATCHING:
            return (question.pairs || [])
                .map((p: any) => `${p.left} → ${p.right}`)
                .join('; ');
        case QuestionType.SHORT_ANSWER:
            return question.correctAnswer || '';
        default:
            return '';
    }
}

function cleanLatex(text: string): string {
    if (!text) return '';
    // Remove LaTeX delimiters and convert common patterns
    return text
        .replace(/\$\$(.*?)\$\$/g, '$1')
        .replace(/\$(.*?)\$/g, '$1')
        .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\pm/g, '±')
        .replace(/\\sqrt\{([^}]*)\}/g, '√$1')
        .replace(/\\^(\\d)/g, (_, digit) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[parseInt(digit)] || digit)
        .replace(/\\_/g, '_')
        .replace(/\\\\/g, ' ')
        .trim();
}

/**
 * Share result using Web Share API or clipboard fallback
 */
export const shareResult = async (options: {
    quizTitle: string;
    score: number;
    correctCount: number;
    totalQuestions: number;
    studentName?: string;
}): Promise<{ success: boolean; method: 'share' | 'clipboard' }> => {
    const { quizTitle, score, correctCount, totalQuestions, studentName } = options;

    const shareText = `🎉 ${studentName || 'Em'} đã hoàn thành bài kiểm tra "${quizTitle}"!
📊 Kết quả: ${score} điểm
✅ Đúng: ${correctCount}/${totalQuestions} câu

📱 Làm bài tại: ${window.location.origin}`;

    // Try Web Share API first
    if (navigator.share) {
        try {
            await navigator.share({
                title: `Kết quả: ${quizTitle}`,
                text: shareText,
                url: window.location.href
            });
            return { success: true, method: 'share' };
        } catch (err) {
            // User cancelled or error
            console.log('Share cancelled or failed:', err);
        }
    }

    // Fallback: Copy to clipboard
    try {
        await navigator.clipboard.writeText(shareText);
        return { success: true, method: 'clipboard' };
    } catch (err) {
        console.error('Clipboard copy failed:', err);
        return { success: false, method: 'clipboard' };
    }
};
