const token = '9a_jRmmFwdeEUaa02deoRPssICuyYtper26INxlmAiQ.9_Zt3vARSf5H07LNTHZiW6Pgb5BSrjXejXVHeEEvjWU';
const accountId = 'ed9d66ab88b8acb297031b4d22520c92';

fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`, {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ subdomain: 'itongquiz-master' })
})
    .then(res => res.json())
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(err => console.error(err));
