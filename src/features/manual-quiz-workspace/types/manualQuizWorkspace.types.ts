export interface ManualQuizSeed {
    title: string;
    classLevel: string;
    category: string;
    timeLimit: number;
    tags: string[];
    requireCode: boolean;
    accessCode?: string;
    showOnHome: boolean;
}

export interface ManualQuizNavigationState {
    manualQuizSeed?: ManualQuizSeed;
}
