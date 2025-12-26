/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GOOGLE_SHEET_ID: string;
    readonly VITE_QUIZ_GID: string;
    readonly VITE_QUESTION_GID: string;
    readonly VITE_TEACHER_GID: string;
    readonly VITE_RESULTS_GID: string;
    readonly VITE_GOOGLE_SCRIPT_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
