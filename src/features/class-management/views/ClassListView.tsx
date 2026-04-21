import React from 'react';
import { Plus } from 'lucide-react';
import { Classroom } from '../types';
import { Button } from '../../../components/common';
import { ClassCard } from '../components/ClassCard';

interface ClassListViewProps {
    classes: Classroom[];
    isAdmin: boolean;
    onSelectClass: (classroom: Classroom) => void;
    onCreateClick: () => void;
    onTransferClick: (classroom: Classroom) => void;
    onDeleteClick: (classroom: Classroom) => void;
}

export const ClassListView: React.FC<ClassListViewProps> = ({
    classes, isAdmin, onSelectClass, onCreateClick, onTransferClick, onDeleteClick
}) => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-800">Danh sách lớp học</h2>
                {isAdmin && (
                    <Button onClick={onCreateClick} variant="primary" icon={<Plus className="w-5 h-5" />}>
                        Tạo lớp mới
                    </Button>
                )}
            </div>

            {classes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Chưa có lớp học nào</h3>
                    {isAdmin ? (
                        <>
                            <p className="text-gray-500 mb-6">Hãy tạo lớp học đầu tiên của bạn</p>
                            <Button onClick={onCreateClick} variant="primary">Tạo lớp ngay</Button>
                        </>
                    ) : (
                        <p className="text-gray-500 mb-6">
                            Giáo viên không có quyền tạo lớp. Vui lòng liên hệ quản trị viên để được cấp lớp, sau đó bạn có thể thêm học sinh thủ công hoặc nhập Excel.
                        </p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <ClassCard
                            key={cls.id}
                            classroom={cls}
                            isAdmin={isAdmin}
                            onClick={() => onSelectClass(cls)}
                            onTransfer={() => onTransferClick(cls)}
                            onDelete={() => onDeleteClick(cls)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
