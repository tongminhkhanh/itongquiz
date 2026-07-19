import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuizStore } from '../../stores/quizStore';
import { useSeo } from '../hooks/useSeo';
import { AppGlobals } from './AppGlobals';
import { AppRoutes } from './AppRoutes';
import { useLegacyQuizQuery } from './useLegacyQuizQuery';
import { useLoadQuizzes } from './useLoadQuizzes';
import { useQuizUrlSelection } from './useQuizUrlSelection';
import { useSystemSettings } from './useSystemSettings';
import { useTeacherEntry } from './useTeacherEntry';

const App: React.FC = () => {
    const quizStore = useQuizStore();
    const location = useLocation();
    const giftShopEnabled = String(import.meta.env.VITE_FEATURE_GIFT_SHOP_V2 || 'false').toLowerCase() === 'true';

    useSeo(location.pathname, quizStore.view, quizStore.selectedQuiz, giftShopEnabled);
    useLoadQuizzes();
    useTeacherEntry();
    useLegacyQuizQuery();
    const aiAssistantEnabled = useSystemSettings();
    useQuizUrlSelection();

    return (
        <>
            <AppRoutes giftShopEnabled={giftShopEnabled} />
            <AppGlobals showChatbot={aiAssistantEnabled && quizStore.view !== 'student'} />
        </>
    );
};

export default App;
