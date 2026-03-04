const fs = require('fs');

function processFile(file) {
    let content = fs.readFileSync(file, 'utf8');

    // Thêm import apiAdapter
    if (!content.includes('apiAdapter')) {
        content = content.replace(
            /from '\.\.\/config\/constants';/,
            "from '../config/constants';\nimport { callApi } from './apiAdapter';"
        );
    }

    // Thay thế fetch logic trong callGasApi bằng callApi
    let replaced = content.replace(
        /const callGasApi[^{]+{[\s\S]+?(?=const|export const|\/\*|export function)/,
        (match) => {
            if (match.includes('googleSheet')) {
                return `const callGasApi = async (action: string, payload: any = {}): Promise<any> => {
    return await callApi(action, payload);
};

`;
            } else if (match.includes('classroomService') || match.includes('ClassroomApiResponse')) {
                return `const callGasApi = async <T = any>(action: string, payload: Record<string, any> = {}): Promise<ClassroomApiResponse<T>> => {
    try {
        const data = await callApi<ClassroomApiResponse<T>>(action, payload);
        return data;
    } catch (error: any) {
        console.error(\`[ClassroomService] API Error [\${action}]:\`, error);
        return { status: 'error', message: error.message || 'Unknown API error' };
    }
};

`;
            } else if (match.includes('gamificationService')) {
                return `const callGasApi = async <T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<GamificationApiResponse<T>> => {
    try {
        const data = await callApi<GamificationApiResponse<T>>(action, payload);
        return { status: 'success', data: data.data ?? (data as any) };
    } catch (error: any) {
        console.error(\`[GamificationService] API Error [\${action}]:\`, error);
        return { status: 'error', message: error.message || 'Unknown API error' };
    }
};

`;
            }
            return match;
        }
    );

    fs.writeFileSync(file, replaced);
    console.log('Fixed:', file);
}

processFile('src/services/googleSheetService.ts');
processFile('src/services/classroomService.ts');
processFile('src/services/gamificationService.ts');
