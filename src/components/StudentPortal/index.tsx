import React, { useEffect, useState } from 'react';
import { useClassroomStore } from '../../stores/useClassroomStore';
import StudentLogin from './StudentLogin';
import AssignmentsView from './AssignmentsView';
import StudentDashboard from '../student/StudentDashboard';
import Leaderboard from '../gamification/Leaderboard';

type PortalView = 'dashboard' | 'study' | 'leaderboard';

const StudentPortal: React.FC = () => {
    const store = useClassroomStore();
    const [view, setView] = useState<PortalView>('dashboard');

    useEffect(() => {
        // Try to restore session on mount
        store.restoreStudentSession();
    }, []);

    // Not logged in → Show login
    if (!store.studentSession) {
        return <StudentLogin />;
    }

    // Logged in → Route based on view
    switch (view) {
        case 'study':
            return <AssignmentsView />;
        case 'leaderboard':
            return <Leaderboard onBack={() => setView('dashboard')} />;
        case 'dashboard':
        default:
            return (
                <StudentDashboard
                    onStartStudy={() => setView('study')}
                    onViewLeaderboard={() => setView('leaderboard')}
                />
            );
    }
};

export default StudentPortal;
