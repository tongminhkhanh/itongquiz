import React from 'react';
import { Users, Trash2, RefreshCw } from 'lucide-react';
import { Classroom } from '../../types';

interface ClassCardProps {
    classroom: Classroom;
    isAdmin: boolean;
    onClick: () => void;
    onTransfer: () => void;
    onDelete: () => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({ classroom, isAdmin, onClick, onTransfer, onDelete }) => {
    return (
        <div
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-orange-200 transition-all cursor-pointer group"
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                    <Users className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {isAdmin && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onTransfer();
                            }}
                            className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg"
                            title="Xóa giáo viên phụ trách"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        title="Xóa lớp học"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">{classroom.name}</h3>
            <p className="text-sm text-gray-500 mb-1">
                GV phụ trách: {classroom.teacherFullName || classroom.teacherUsername || 'Chưa phân công'}
            </p>
            <p className="text-sm text-gray-400">
                Tạo ngày {new Date(classroom.createdAt).toLocaleDateString('vi-VN')}
            </p>
        </div>
    );
};
