const fs = require('fs');
const path = 'src/components/TeacherDashboard/ClassManagementTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace variant="outline" with variant="secondary"
const searchStr = 'variant="outline"';
const replaceStr = 'variant="secondary"';

if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(path, content);
    console.log('Successfully updated ClassManagementTab.tsx');
} else {
    console.log('Search string not found');
}
