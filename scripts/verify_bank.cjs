const fs = require('fs');
const path = require('path');

const BANK_DIR = path.resolve(__dirname, '../src/data/ioe_bank/grade3');
const REPORT_FILE = path.resolve(__dirname, 'bank_review.html');

// CSS for the report
const STYLES = `
    body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    .type-section { margin-top: 30px; }
    .type-header { background: #34495e; color: white; padding: 10px; border-radius: 4px; display: flex; justify-content: space-between; }
    .question-card { border: 1px solid #ddd; margin-bottom: 10px; padding: 10px; border-radius: 4px; background: #fff; }
    .question-card:hover { border-color: #3498db; }
    .q-meta { font-size: 0.8em; color: #7f8c8d; margin-bottom: 5px; }
    .q-text { font-weight: bold; font-size: 1.1em; color: #2980b9; }
    .q-options { margin: 10px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
    .option { padding: 5px; background: #f9f9f9; border-radius: 3px; }
    .option.correct { background: #dff0d8; color: #3c763d; font-weight: bold; border: 1px solid #d6e9c6; }
    .q-explanation { margin-top: 5px; font-style: italic; color: #666; font-size: 0.9em; border-top: 1px dashed #eee; padding-top: 5px; }
    .warning { color: red; font-weight: bold; }
    .stats { display: flex; gap: 20px; margin-bottom: 20px; }
    .stat-box { background: #ecf0f1; padding: 15px; border-radius: 5px; text-align: center; flex: 1; }
    .stat-val { font-size: 2em; font-weight: bold; color: #e74c3c; }
`;

function generateReview() {
    console.log("🔍 Starting Verification Process...");

    if (!fs.existsSync(BANK_DIR)) {
        console.error("❌ Bank directory not found.");
        return;
    }

    const files = fs.readdirSync(BANK_DIR).filter(f => f.endsWith('.json'));
    let htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>IOE Question Bank Review</title><style>${STYLES}</style></head><body><div class="container"><h1>📋 IOE Question Bank Review</h1>`;

    let totalQuestions = 0;
    let potentialErrors = 0;

    files.forEach(file => {
        const content = JSON.parse(fs.readFileSync(path.join(BANK_DIR, file), 'utf8'));
        const questions = content.questions || [];
        totalQuestions += questions.length;

        // Header for this file
        htmlContent += `<div class="type-section"><div class="type-header"><span>${file}</span><span>${questions.length} questions</span></div>`;

        questions.forEach(q => {
            // Logic Check
            let warnings = [];

            // 1. Check if correct answer exists in options (for MCQ)
            if (q.options && Array.isArray(q.options) && q.options.length > 0) {
                // If options are "A. ...", extract the label
                const correctOpt = q.options.find(opt => {
                    // matches "A" or "A. Content"
                    return opt.startsWith(q.correctAnswer + '.') || opt === q.correctAnswer;
                });

                if (!correctOpt && q.type !== 'VOCABULARY' && q.type !== 'LISTENING' && q.type !== 'SENTENCE_ORDER_DRAG') {
                    // SENTENCE_ORDER_DRAG correct answer is the full sentence, not A/B/C/D
                    warnings.push(`⚠️ Correct Answer '${q.correctAnswer}' NOT found in options!`);
                    potentialErrors++;
                }
            }

            // 2. Check for empty fields
            if (!q.question) warnings.push("⚠️ Question text is empty");
            if (!q.correctAnswer) warnings.push("⚠️ Correct Answer is empty");

            // HTML for this question
            htmlContent += `<div class="question-card">
                <div class="q-meta">${q.id} | Level ${q.difficulty} | ${q.tags?.join(', ')}</div>
                ${warnings.length > 0 ? `<div class="warning">${warnings.join('<br>')}</div>` : ''}
                <div class="q-text">${q.question}</div>`;

            if (q.options && Array.isArray(q.options)) {
                htmlContent += `<div class="q-options">`;
                q.options.forEach(opt => {
                    const isCorrect = (opt.startsWith(q.correctAnswer + '.') || opt === q.correctAnswer);
                    htmlContent += `<div class="option ${isCorrect ? 'correct' : ''}">${opt}</div>`;
                });
                htmlContent += `</div>`;
            } else {
                htmlContent += `<div class="option correct">Answer: ${q.correctAnswer}</div>`;
            }

            htmlContent += `<div class="q-explanation">💡 ${q.explanation}</div></div>`;
        });

        htmlContent += `</div>`;
    });

    // Add stats at top
    const statsHtml = `<div class="stats">
        <div class="stat-box"><div class="stat-val">${totalQuestions}</div><div>Total Questions</div></div>
        <div class="stat-box"><div class="stat-val">${potentialErrors}</div><div>Potential Errors</div></div>
        <div class="stat-box"><div class="stat-val">${files.length}</div><div>Files</div></div>
    </div>`;

    htmlContent = htmlContent.replace('<h1>📋 IOE Question Bank Review</h1>', `<h1>📋 IOE Question Bank Review</h1>${statsHtml}`);
    htmlContent += `</div></body></html>`;

    fs.writeFileSync(REPORT_FILE, htmlContent);
    console.log(`✅ Review generated at: ${REPORT_FILE}`);
    console.log(`   Total Questions: ${totalQuestions}`);
    console.log(`   Potential Errors: ${potentialErrors}`);
}

generateReview();
