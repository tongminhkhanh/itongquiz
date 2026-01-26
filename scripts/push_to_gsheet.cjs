const fs = require('fs');
const path = require('path');

// CONFIG
const GAS_URL = 'https://script.google.com/macros/s/[REDACTED]/exec';
const TOKEN = 'ioe-4e23be7934269856066e6a3c2062e33ae4cdcc98';
const BANK_DIR = path.resolve(__dirname, '../src/data/ioe_bank/grade3');
const BATCH_SIZE = 50; // Push 50 questions at a time

async function pushQuestions() {
    console.log('🚀 Starting import to Google Sheet...');

    if (!fs.existsSync(BANK_DIR)) {
        console.error('❌ Bank directory not found');
        return;
    }

    const files = fs.readdirSync(BANK_DIR).filter(f => f.endsWith('.json'));
    let totalSuccess = 0;

    for (const file of files) {
        console.log(`\n📄 Processing file: ${file}`);
        const content = JSON.parse(fs.readFileSync(path.join(BANK_DIR, file), 'utf8'));
        const questions = content.questions || [];

        if (questions.length === 0) {
            console.log('   ⚠️ No questions found');
            continue;
        }

        console.log(`   Found ${questions.length} questions. pushing in batches...`);

        // Split into batches
        for (let i = 0; i < questions.length; i += BATCH_SIZE) {
            const batch = questions.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;

            try {
                const response = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // GAS requires simple content type sometimes
                    body: JSON.stringify({
                        action: 'add_bank_questions',
                        token: TOKEN,
                        questions: batch
                    })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    console.log(`   ✅ Batch ${batchNum}: Added ${result.added} questions (Skipped ${result.skipped})`);
                    totalSuccess += result.added;
                } else {
                    console.error(`   ❌ Batch ${batchNum} Failed:`, result.message);
                }
            } catch (err) {
                console.error(`   ❌ Batch ${batchNum} Network Error:`, err.message);
            }

            // Small delay to be nice to Google API
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log(`\n✨ Import completed! Total questions added: ${totalSuccess}`);
}

pushQuestions();
