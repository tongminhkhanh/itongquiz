import React from 'react';

interface AccessCodeFormProps {
    quizTitle: string;
    enteredCode: string;
    codeError: string;
    onCodeChange: (code: string) => void;
    onVerify: () => void;
    onExit: () => void;
}

/**
 * Form for entering quiz access code
 * Displayed when quiz requires access code verification
 */
const AccessCodeForm: React.FC<AccessCodeFormProps> = ({
    quizTitle,
    enteredCode,
    codeError,
    onCodeChange,
    onVerify,
    onExit
}) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onVerify();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border-t-4 border-orange-500">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">🔐</div>
                    <h2 className="text-2xl font-bold text-gray-800">{quizTitle}</h2>
                    <p className="text-gray-500 mt-2">Bài kiểm tra này yêu cầu mã truy cập</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nhập mã làm bài</label>
                        <input
                            type="text"
                            value={enteredCode}
                            onChange={e => onCodeChange(e.target.value.toUpperCase())}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập mã 6 ký tự..."
                            maxLength={6}
                            className="w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-center font-mono text-2xl tracking-widest uppercase"
                            autoFocus
                        />
                        {codeError && (
                            <p className="mt-2 text-red-500 text-sm text-center font-medium">
                                ❌ {codeError}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={onVerify}
                        disabled={enteredCode.length < 1}
                        className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Xác nhận mã
                    </button>

                    <button
                        onClick={onExit}
                        className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                        ← Quay lại trang chủ
                    </button>
                </div>

                <p className="text-xs text-gray-400 text-center mt-4">
                    Mã làm bài được giáo viên cung cấp trước khi kiểm tra
                </p>
            </div>
        </div>
    );
};

export default AccessCodeForm;
