const fs = require('fs');
const path = 'src/types/domain.types.ts';
let content = fs.readFileSync(path, 'utf8');
const searchStr = "    showOnHome?: boolean; // Whether to show on HomePage library\n    _assignmentData?: any; // Optional assignment metadata (avoid circular dependency)";
const replaceStr = "    showOnHome?: boolean; // Whether to show on HomePage library\n    isPractice?: boolean; // Whether this quiz is in practice mode\n    _assignmentData?: any; // Optional assignment metadata (avoid circular dependency)";

// Try exact match with \n, and fallback to \r\n if needed
if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(path, content);
    console.log('Successfully updated file (LF)');
} else {
    const searchStrCRLF = searchStr.replace(/\n/g, '\r\n');
    const replaceStrCRLF = replaceStr.replace(/\n/g, '\r\n');
    if (content.includes(searchStrCRLF)) {
        content = content.replace(searchStrCRLF, replaceStrCRLF);
        fs.writeFileSync(path, content);
        console.log('Successfully updated file (CRLF)');
    } else {
        console.log('Search string not found in any format');
    }
}
