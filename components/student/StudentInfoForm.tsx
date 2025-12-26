import React from 'react';
import { Clock } from 'lucide-react';
import { Quiz } from '../../types';
import { SCHOOL_NAME } from '../../constants';

interface StudentInfoFormProps {
    quiz: Quiz;
    studentName: string;
    studentClass: string;
    onNameChange: (name: string) => void;
    onClassChange: (className: string) => void;
    onStart: () => void;
    onExit: () => void;
}

/**
 * Form for entering student name and class before starting quiz
 */
const StudentInfoForm: React.FC<StudentInfoFormProps> = ({
    quiz,
    studentName,
    studentClass,
    onNameChange,
    onClassChange,
    onStart,
    onExit
}) => {
    const isValid = studentName.trim() && studentClass;

    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-lg mt-10 border-t-4 border-orange-500">
            <h2 className="text-2xl font-bold text-center text-orange-600 mb-2">{SCHOOL_NAME}</h2>
            <h3 className="text-xl font-semibold text-center text-gray-800 mb-6">{quiz.title}</h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Họ và tên học sinh</label>
                    <input
                        type="text"
                        value={studentName}
                        onChange={(e) => onNameChange(e.target.value)}
                        className="mt-1 w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
                        placeholder="Ví dụ: Lò Văn A"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Lớp</label>
                    <select
                        value={studentClass}
                        onChange={(e) => onClassChange(e.target.value)}
                        className="mt-1 w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
                    >
                        <option value="">Chọn lớp...</option>
                        {Array.from({ length: 9 }, (_, i) => i + 1).map(num => (
                            <option key={`${quiz.classLevel}A${num}`} value={`${quiz.classLevel}A${num}`}>
                                {quiz.classLevel}A{num}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                    <p className="text-sm text-yellow-800 font-semibold flex items-center">
                        <Clock className="w-4 h-4 mr-2" /> Thời gian làm bài: {quiz.timeLimit} phút
                    </p>
                </div>

                <button
                    onClick={onStart}
                    disabled={!isValid}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-md"
                >
                    Bắt đầu làm bài
                </button>

                <button onClick={onExit} className="w-full text-gray-500 hover:text-gray-700 mt-2 text-sm">
                    Quay lại
                </button>
            </div>
        </div>
    );
};

export default StudentInfoForm;
