const fs = require('fs');
const path = 'src/components/TeacherDashboard/CreateTab.tsx';
let content = fs.readFileSync(path, 'utf8');
const searchStr = "import { FileText, Sparkles, Upload, X, FileCheck, Copy, Check, Link2, BookOpen, Search, Zap, Users, Calendar, Hash, ChevronDown, ChevronUp, Settings, Clock, Wand2, Eye, EyeOff, Lock, Unlock, Edit3, Tag } from 'lucide-react';";
const replaceStr = searchStr + "\nimport { showError, showSuccess } from '../../utils/toast';";
if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(path, content);
    console.log('Successfully updated file');
} else {
    console.log('Search string not found');
}
