const fs = require('fs');
const p = 'workers/src/routes/phieu.ts';
let c = fs.readFileSync(p, 'utf8');

// Fix 1: JOIN teachers
const old1 = 'SELECT p.*, b.title as batch_title\r\n        FROM phieu_public_links l\r\n        JOIN phieu_nhanxet p ON p.id = l.phieu_id\r\n        LEFT JOIN phieu_batch b ON b.id = l.batch_id\r\n        WHERE l.public_token = ?';
const new1 = 'SELECT p.*, b.title as batch_title,\r\n               t.full_name as teacher_full_name\r\n        FROM phieu_public_links l\r\n        JOIN phieu_nhanxet p ON p.id = l.phieu_id\r\n        LEFT JOIN phieu_batch b ON b.id = l.batch_id\r\n        LEFT JOIN teachers t ON t.username = p.created_by\r\n        WHERE l.public_token = ?';
if (!c.includes(old1)) { console.error('FAIL fix1'); process.exit(1); }
c = c.replace(old1, new1);

// Fix 2: add teacherName to response
const old2 = "title: record.batch_title || record.ten_bai_tap || 'Phieu Ket Qua Hoc Tap',\r\n            phieu: mapPhieu(record),";
const new2 = "title: record.batch_title || record.ten_bai_tap || 'Phieu Ket Qua Hoc Tap',\r\n            teacherName: record.teacher_full_name || record.created_by || '',\r\n            phieu: mapPhieu(record),";
if (!c.includes(old2)) { console.error('FAIL fix2'); process.exit(1); }
c = c.replace(old2, new2);

// Fix 3: add teacher_name to mapPhieu
const old3 = "created_by: row.created_by || 'teacher',\r\n        created_at: row.created_at || '',";
const new3 = "created_by: row.created_by || 'teacher',\r\n        teacher_name: row.teacher_full_name || row.created_by || '',\r\n        created_at: row.created_at || '',";
if (!c.includes(old3)) { console.error('FAIL fix3'); process.exit(1); }
c = c.replace(old3, new3);

fs.writeFileSync(p, c, 'utf8');
console.log('OK: all 3 fixes applied');
