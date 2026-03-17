const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const GAS_URL = '[REDACTED-COMPROMISED-VALUE]';
const TOKEN = '[REDACTED-COMPROMISED-SHARED-TOKEN]';

// Helper function to call the GAS API
async function callGasApi(action, payload = {}) {
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, token: TOKEN, ...payload })
        });
        const text = await response.text();
        const json = JSON.parse(text);
        if (json.status === 'success') return json.data;
        if (Array.isArray(json)) return json; // some old endpoints return array directly
        return json;
    } catch (e) {
        console.error(`Error parsing JSON for ${action}:`, e.message);
        return null;
    }
}

// Ensure the data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

const SEED_FILE = path.join(DATA_DIR, 'seed.sql');
let sqlContent = '';

function appendSql(sql) {
    sqlContent += sql + '\n';
}

function escapeSqlString(str) {
    if (str === null || str === undefined || str === '') return 'NULL';
    if (typeof str === 'object') {
        return `'${JSON.stringify(str).replace(/'/g, "''")}'`;
    }
    return `'${String(str).replace(/'/g, "''")}'`;
}

async function main() {
    console.log('Starting migration script from GAS to D1...');
    // Reset SQL content
    fs.writeFileSync(SEED_FILE, '-- Auto-generated seed file from Google Apps Script\n\n');

    // 1. Quizzes
    console.log('Fetching quizzes...');
    let quizzes = await callGasApi('get_quizzes');
    if (quizzes) {
        // Quizzes API returns { status: 'success', data: [...] } ?
        if (quizzes.data) quizzes = quizzes.data;
        // it might be directly the array
        if (Array.isArray(quizzes)) {
            appendSql('-- Table: quizzes');
            for (const q of quizzes) {
                if (!q.id) continue;
                appendSql(`INSERT OR REPLACE INTO quizzes (id, title, classLevel, category, timeLimit, createdAt, accessCode, requireCode, createdBy) VALUES (${escapeSqlString(q.id)}, ${escapeSqlString(q.title)}, ${escapeSqlString(q.classLevel)}, ${escapeSqlString(q.category)}, ${Number(q.timeLimit) || 0}, ${escapeSqlString(q.createdAt)}, ${escapeSqlString(q.accessCode)}, ${q.requireCode ? 1 : 0}, ${escapeSqlString(q.createdBy)});`);
            }
        }
    }

    // 2. Questions
    console.log('Fetching questions...');
    let questions = await callGasApi('get_questions');
    if (questions) {
        if (questions.data) questions = questions.data;
        if (Array.isArray(questions)) {
            appendSql('\n-- Table: questions');
            for (const q of questions) {
                if (!q.id) continue;
                const optionsStr = typeof q.options === 'string' ? q.options : JSON.stringify(q.options || []);
                const itemsStr = typeof q.items === 'string' ? q.items : JSON.stringify(q.items || []);

                appendSql(`INSERT OR REPLACE INTO questions (id, quizId, type, question, options, correctAnswer, items, text, blanks, distractors, sentence, words, correctWordIndexes, image, explanation) VALUES (${escapeSqlString(q.id)}, ${escapeSqlString(q.quizId)}, ${escapeSqlString(q.type)}, ${escapeSqlString(q.question)}, ${escapeSqlString(optionsStr)}, ${escapeSqlString(q.correctAnswer)}, ${escapeSqlString(itemsStr)}, ${escapeSqlString(q.text)}, ${escapeSqlString(q.blanks)}, ${escapeSqlString(q.distractors)}, ${escapeSqlString(q.sentence)}, ${escapeSqlString(q.words)}, ${escapeSqlString(q.correctWordIndexes)}, ${escapeSqlString(q.image)}, ${escapeSqlString(q.explanation)});`);
            }
        }
    }

    // 3. Teachers
    console.log('Fetching teachers...');
    let teachers = await callGasApi('get_teachers');
    if (teachers) {
        if (teachers.data) teachers = teachers.data;
        if (Array.isArray(teachers)) {
            appendSql('\n-- Table: teachers');
            for (const t of teachers) {
                if (!t.username) continue;
                appendSql(`INSERT OR REPLACE INTO teachers (username, password, fullName, role, class) VALUES (${escapeSqlString(t.username)}, ${escapeSqlString(t.password)}, ${escapeSqlString(t.fullName)}, ${escapeSqlString(t.role)}, ${escapeSqlString(t.class)});`);
            }
        }
    }

    // 4. Classes
    console.log('Fetching classes...');
    let classes = await callGasApi('get_classes', { teacherUsername: 'admin' });
    if (classes && classes.data) classes = classes.data;
    if (Array.isArray(classes)) {
        appendSql('\n-- Table: classes');
        for (const c of classes) {
            if (!c.id) continue;
            appendSql(`INSERT OR REPLACE INTO classes (id, name, teacherUsername, createdAt) VALUES (${escapeSqlString(c.id)}, ${escapeSqlString(c.name)}, ${escapeSqlString(c.teacherUsername)}, ${escapeSqlString(c.createdAt)});`);
        }
    } else {
        classes = [];
    }

    // 5. Students
    console.log('Fetching students...');
    let allStudents = [];
    appendSql('\n-- Table: students');
    for (const c of classes) {
        let classStudents = await callGasApi('get_students', { classId: c.id });
        if (classStudents && classStudents.data) classStudents = classStudents.data;
        if (Array.isArray(classStudents)) {
            allStudents = allStudents.concat(classStudents);
            for (const s of classStudents) {
                if (!s.id) continue;
                appendSql(`INSERT OR REPLACE INTO students (id, fullName, username, password, classId, parentPhone, avatar, coins, createdAt) VALUES (${escapeSqlString(s.id)}, ${escapeSqlString(s.fullName)}, ${escapeSqlString(s.username)}, ${escapeSqlString(s.password)}, ${escapeSqlString(s.classId)}, ${escapeSqlString(s.parentPhone)}, ${escapeSqlString(s.avatar)}, ${Number(s.coins) || 0}, ${escapeSqlString(s.createdAt)});`);
            }
        }
    }

    // 6. Results
    console.log('Fetching results...');
    let results = await callGasApi('get_results');
    if (results) {
        if (results.data) results = results.data;
        if (Array.isArray(results)) {
            appendSql('\n-- Table: results');
            for (const r of results) {
                if (!r.id && !r['Student Name']) continue;
                appendSql(`INSERT OR REPLACE INTO results (id, quiz_id, quiz_title, student_name, class_name, score, total_questions, submitted_at, answers) VALUES (${escapeSqlString(r.id)}, ${escapeSqlString(r.quizId || r['Quiz ID'])}, ${escapeSqlString(r.quizTitle || r['Quiz Title'])}, ${escapeSqlString(r['Student Name'] || r.studentName)}, ${escapeSqlString(r['Class'] || r.className)}, ${Number(r.Score || r.score) || 0}, ${Number(r['Total Questions'] || r.totalQuestions) || 0}, ${escapeSqlString(r.Timestamp || r.submittedAt || r.completedAt)}, ${escapeSqlString(r.answers)});`);
            }
        }
    }

    // 7. Assignments
    console.log('Fetching assignments...');
    let assignments = await callGasApi('get_all_assignments');
    if (assignments && assignments.data) assignments = assignments.data;
    if (Array.isArray(assignments)) {
        appendSql('\n-- Table: assignments');
        for (const a of assignments) {
            if (!a.id) continue;
            appendSql(`INSERT OR REPLACE INTO assignments (id, quizId, classId, studentId, deadline, maxAttempts, status, createdAt) VALUES (${escapeSqlString(a.id)}, ${escapeSqlString(a.quizId)}, ${escapeSqlString(a.classId)}, ${escapeSqlString(a.studentId)}, ${escapeSqlString(a.deadline)}, ${Number(a.maxAttempts) || 0}, ${escapeSqlString(a.status)}, ${escapeSqlString(a.createdAt)});`);
        }
    }

    // 8. User Pets (Get via student usernames)
    console.log('Fetching user pets & shop items...');
    let shopItemsSaved = false;
    appendSql('\n-- Table: user_pets');
    for (const s of allStudents) {
        if (!s.username) continue;
        const petData = await callGasApi('get_pet_data', { username: s.username });
        if (petData && petData.pet) {
            const pet = petData.pet;
            const itemsStr = typeof pet.items === 'string' ? pet.items : JSON.stringify(pet.items || []);
            appendSql(`INSERT OR REPLACE INTO user_pets (username, petId, petName, level, exp, expToNext, mood, items, lastActive, imageUrl) VALUES (${escapeSqlString(pet.username || s.username)}, ${escapeSqlString(pet.petId)}, ${escapeSqlString(pet.petName)}, ${Number(pet.level) || 1}, ${Number(pet.exp) || 0}, ${Number(pet.expToNext) || 100}, ${escapeSqlString(pet.mood)}, ${escapeSqlString(itemsStr)}, ${escapeSqlString(pet.lastActive)}, ${escapeSqlString(pet.imageUrl)});`);
        }

        // Save shop items once
        if (!shopItemsSaved && petData && petData.shopItems) {
            appendSql('\n-- Table: shop_items');
            for (const item of petData.shopItems) {
                appendSql(`INSERT OR REPLACE INTO shop_items (id, name, price, type, category, assetUrl) VALUES (${escapeSqlString(item.itemId)}, ${escapeSqlString(item.name)}, ${Number(item.price)}, ${escapeSqlString(item.type)}, ${escapeSqlString(item.category)}, ${escapeSqlString(item.assetUrl)});`);
            }
            shopItemsSaved = true;
            appendSql('\n-- Table: user_pets'); // restore comment block
        }
    }

    fs.appendFileSync(SEED_FILE, sqlContent);
    console.log(`Migration script finished. Data saved to: ${SEED_FILE}`);
}

main().catch(console.error);
