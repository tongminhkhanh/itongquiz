const fs = require('fs');
const path = require('path');

const BANK_DIR = path.resolve(__dirname, '../src/data/ioe_bank/grade3');
const CSV_FILE = path.resolve(__dirname, '../src/data/ioe_bank/IoeQuestionBank.csv');

const HEADERS = [
    'id', 'type', 'grade', 'round', 'year', 'question',
    'options', 'correctAnswer', 'explanation', 'difficulty',
    'tags', 'source', 'createdAt'
];

let csvContent = HEADERS.join(',') + '\n';
let totalCount = 0;

if (fs.existsSync(BANK_DIR)) {
    const files = fs.readdirSync(BANK_DIR).filter(f => f.endsWith('.json'));

    files.forEach(file => {
        const content = JSON.parse(fs.readFileSync(path.join(BANK_DIR, file), 'utf8'));
        if (content.questions) {
            content.questions.forEach(q => {
                const row = [
                    q.id,
                    q.type,
                    q.grade,
                    q.round || 'school',
                    q.year || 2024,
                    escapeCsv(q.question),
                    escapeCsv(Array.isArray(q.options) ? q.options.join('|') : (q.options || '')),
                    escapeCsv(q.correctAnswer),
                    escapeCsv(q.explanation),
                    q.difficulty || 1,
                    escapeCsv(Array.isArray(q.tags) ? q.tags.join(',') : (q.tags || '')),
                    escapeCsv(q.source),
                    q.createdAt || new Date().toISOString().split('T')[0]
                ];
                csvContent += row.join(',') + '\n';
                totalCount++;
            });
        }
    });
}

fs.writeFileSync(CSV_FILE, csvContent);
console.log(`Successfully combined ${totalCount} questions into ${CSV_FILE}`);

function escapeCsv(text) {
    if (!text) return '';
    text = String(text).replace(/"/g, '""'); // Escape double quotes
    if (text.includes(',') || text.includes('\n') || text.includes('"')) {
        return `"${text}"`;
    }
    return text;
}
