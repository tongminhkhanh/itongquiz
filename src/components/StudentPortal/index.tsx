import React, { useEffect } from 'react';
import { useClassroomStore } from '../../stores/useClassroomStore';
import StudentLogin from './StudentLogin';
import AssignmentsView from './AssignmentsView';

const StudentPortal: React.FC = () => {
    const store = useClassroomStore();

    useEffect(() => {
        // Try to restore session on mount
        store.restoreStudentSession();
    }, []);

    if (store.studentSession) {
        return <AssignmentsView />;
    }

    return <StudentLogin />;
};

export default StudentPortal;
