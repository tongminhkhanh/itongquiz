import React, { useEffect, memo } from 'react';
import { 
    useClassManagement, 
    ClassListView, 
    ClassDetailView, 
    CreateClassModal, 
    TransferTeacherModal 
} from '../../features/class-management';

interface ClassManagementTabProps {
    isAdmin: boolean;
    username: string | null;
}

const ClassManagementTab: React.FC<ClassManagementTabProps> = memo(({ isAdmin, username }) => {
    const {
        selectedClass,
        setSelectedClass,
        showCreateModal,
        setShowCreateModal,
        handleCreateClass,
        handleDeleteClass,
        openTransferModal,
        closeTransferModal,
        transferClassroom,
        transferTeacherUsername,
        setTransferTeacherUsername,
        teachers,
        handleTransferTeacher,
        isLoadingTeachers,
        isTransferring,
        transferError,
        store,
    } = useClassManagement(isAdmin, username);

    const { classes, fetchClasses, fetchStudents } = store;

    // Load classes initially
    useEffect(() => {
        if (username) fetchClasses(isAdmin ? undefined : username);
    }, [username, isAdmin, fetchClasses]);

    // Prefetch students when a class is selected
    useEffect(() => {
        if (selectedClass && !store.students[selectedClass.id]) {
            fetchStudents(selectedClass.id);
        }
    }, [selectedClass, store.students, fetchStudents]);

    return (
        <div className="animate-fade-in relative min-h-[500px]">
            {!selectedClass ? (
                <ClassListView
                    classes={classes}
                    isAdmin={isAdmin}
                    onSelectClass={setSelectedClass}
                    onCreateClick={() => setShowCreateModal(true)}
                    onTransferClick={openTransferModal}
                    onDeleteClick={handleDeleteClass}
                />
            ) : (
                <ClassDetailView
                    classroom={selectedClass}
                    isAdmin={isAdmin}
                    onBack={() => setSelectedClass(null)}
                />
            )}

            {showCreateModal && (
                <CreateClassModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateClass}
                    isLoading={store.isLoading}
                />
            )}

            {transferClassroom && (
                <TransferTeacherModal
                    classroom={transferClassroom}
                    teachers={teachers}
                    selectedTeacherUsername={transferTeacherUsername}
                    onSelectTeacher={setTransferTeacherUsername}
                    onClose={closeTransferModal}
                    onSubmit={handleTransferTeacher}
                    isLoadingTeachers={isLoadingTeachers}
                    isSaving={isTransferring}
                    error={transferError}
                />
            )}
        </div>
    );
});

export default ClassManagementTab;
