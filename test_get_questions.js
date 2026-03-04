async function test() {
    const url = 'https://itongquiz-api.sample_user_baf53feb.workers.dev/api';
    const token = '[REDACTED-COMPROMISED-SHARED-TOKEN]';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_questions', token })
        });

        if (!response.ok) {
            throw new Error('HTTP error: ' + response.status);
        }
        const data = await response.json();
        console.log('Number of questions directly from D1:', data.length);
        if (data.length > 0) {
            console.log('Sample question:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('Questions data is empty!');
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
