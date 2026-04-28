import React, { useState } from 'react';
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react';
import { Classroom, CreateStudentPayload } from '../types';
import { Button } from '../../../components/common';
import { StudentTable } from '../components/StudentTable';
import { AddStudentModal } from '../components/Modals';
import { useClassroomStore } from '../../../stores/useClassroomStore';
import { callApi } from '../../../services/apiAdapter';
import { showSuccess, showError } from '../../../utils/toast';

interface ClassDetailViewProps {
    classroom: Classroom;
    isAdmin: boolean;
    onBack: () => void;
}

export const ClassDetailView: React.FC<ClassDetailViewProps> = ({ classroom, isAdmin, onBack }) => {
    const store = useClassroomStore();
    const students = store.students[classroom.id] || [];
    const isLoadingStudents = store.isLoading;
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    const handleAddStudent = async (payload: CreateStudentPayload) => {
        setIsSaving(true);
        setAddError(null);
        try {
            const added = await store.addStudent(payload);
            if (added) {
                setShowAddModal(false);
            } else {
                setAddError('Tên đăng nhập đã tồn tại hoặc có lỗi xảy ra.');
            }
        } catch (err: unknown) {
            const normalizedError = err instanceof Error ? err : new Error(String(err));
            setAddError(normalizedError.message || 'Lỗi thêm học sinh');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddBatch = async (payloads: CreateStudentPayload[]) => {
        setIsSaving(true);
        setAddError(null);
        try {
            let successCount = 0;
            for (const payload of payloads) {
                const added = await store.addStudent(payload);
                if (added) successCount++;
            }
            if (successCount === payloads.length) {
                showSuccess(`Đã thêm thành công ${successCount} học sinh`);
                setShowAddModal(false);
            } else {
                setAddError(`Đã thêm ${successCount}/${payloads.length} học sinh. Một số bị lỗi (có thể trùng tên đăng nhập).`);
            }
        } catch (err: unknown) {
             const normalizedError = err instanceof Error ? err : new Error(String(err));
             setAddError(normalizedError.message || 'Lỗi thêm danh sách học sinh');
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetPassword = async (studentId: string) => {
        try {
            await callApi('reset_student_password', { studentId });
            showSuccess('Đã khôi phục mật khẩu mặc định: 123456');
        } catch (error) {
            showError('Lỗi khi khôi phục mật khẩu');
        }
    };

    const handleRemoveStudent = async (studentId: string, classId: string) => {
        await store.removeStudent(studentId, classId);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-gray-800 hover:bg-white rounded-xl transition-all shadow-sm">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Lớp {classroom.name}</h2>
                        <p className="text-sm text-gray-500 mt-1">Sĩ số: {students.length} học sinh</p>
                    </div>
                </div>
                <Button onClick={() => setShowAddModal(true)} variant="primary" icon={<UserPlus className="w-4 h-4" />}>
                    Thêm học sinh
                </Button>
            </div>

            {isLoadingStudents ? (
                 <div className="flex items-center justify-center py-12">
                     <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                 </div>
            ) : students.length > 0 ? (
                <StudentTable
                    students={students}
                    isAdmin={isAdmin}
                    classId={classroom.id}
                    onResetPassword={handleResetPassword}
                    onRemoveStudent={handleRemoveStudent}
                />
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserPlus className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Chưa có học sinh</h3>
                    <p className="text-gray-500 mb-6">Thêm học sinh để bắt đầu giao bài tập</p>
                    <Button onClick={() => setShowAddModal(true)} variant="primary">Thêm học sinh đầu tiên</Button>
                </div>
            )}

            {showAddModal && (
                <AddStudentModal
                    classId={classroom.id}
                    onClose={() => setShowAddModal(false)}
                    onAdd={handleAddStudent}
                    onAddBatch={handleAddBatch}
                    isLoading={isSaving}
                    error={addError}
                />
            )}
        </div>
    );
};
