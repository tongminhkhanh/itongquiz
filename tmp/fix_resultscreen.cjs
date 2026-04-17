const fs = require('fs');
const path = 'src/components/student/ResultScreen/index.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add useRef to react import
content = content.replace(
    "import React, { useState, useCallback, useMemo } from 'react';",
    "import React, { useState, useCallback, useMemo, useRef } from 'react';"
);

// 2. Remove ResultTabs import
content = content.replace("import ResultTabs from './ResultTabs';", "// ResultTabs import removed");

fs.writeFileSync(path, content);
console.log('Successfully updated ResultScreen/index.tsx');
