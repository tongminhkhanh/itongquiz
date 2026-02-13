import React, { useState, useEffect, useCallback } from 'react';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useAuthStore } from '../../../stores/authStore';
import { Classroom, Student, CreateStudentPayload } from '../../types/classroom.types';
import {
    Plus, Users, Trash2, ChevronLeft, Copy, Check, RefreshCw,
    Loader2, X, Eye, EyeOff, KeyRound, UserPlus, Phone, Search
} from 'lucide-react';
import { Button } from '../common';

// ==========================================
// CLASS MANAGEMENT TAB (Main View)
// ==========================================

const ClassManagementTab: React.FC = () => {
    const authStore = useAuthStore();
    const store = useClassroomStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState<Classroom | null>(null);

    // Load classes on mount
    useEffect(() => {
        if (authStore.username) {
            store.fetchClasses(authStore.username);
        }
    }, [authStore.username]);

    // If a class is selected, show detail view
    if (selectedClass) {
        return (
            <ClassDetailView
                classroom={selectedClass}
                onBack={() => setSelectedClass(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Quản lý Lớp học</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {store.classes.length} lớp • {authStore.teacherName}
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    variant="primary"
                    icon={<Plus className="w-4 h-4" />}
                >
                    Tạo lớp mới
                </Button>
            </div>

            {/* Error */}
            {store.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center justify-between">
                    <span>{store.error}</span>
                    <button onClick={store.clearError} className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Loading */}
            {store.isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
            )}

            {/* Empty State */}
            {!store.isLoading && store.classes.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Chưa có lớp nào</h3>
                    <p className="text-gray-400 mb-6">Bấm "Tạo lớp mới" để bắt đầu quản lý học sinh</p>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        variant="primary"
                        icon={<Plus className="w-4 h-4" />}
                    >
                        Tạo lớp mới
                    </Button>
                </div>
            )}

            {/* Class Cards Grid */}
            {!store.isLoading && store.classes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {store.classes.map((cls) => (
                        <ClassCard
                            key={cls.id}
                            classroom={cls}
                            onClick={() => setSelectedClass(cls)}
                            onDelete={() => {
                                if (confirm(`Xóa lớp "${cls.name}"? Tất cả học sinh và bài tập trong lớp sẽ bị xóa.`)) {
                                    store.removeClass(cls.id);
                                }
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Create Class Modal */}
            {showCreateModal && (
                <CreateClassModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={async (name) => {
                        if (!authStore.username) return;
                        const result = await store.addClass({
                            name,
                            teacherUsername: authStore.username,
                        });
                        if (result) setShowCreateModal(false);
                    }}
                    isLoading={store.isLoading}
                />
            )}
        </div>
    );
};

// ==========================================
// CLASS CARD
// ==========================================

const ClassCard: React.FC<{
    classroom: Classroom;
    onClick: () => void;
    onDelete: () => void;
}> = ({ classroom, onClick, onDelete }) => {
    return (
        <div
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-orange-200 transition-all cursor-pointer group"
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                    <Users className="w-6 h-6 text-orange-500" />
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Xóa lớp"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">{classroom.name}</h3>
            <p className="text-sm text-gray-400">
                Tạo ngày {new Date(classroom.createdAt).toLocaleDateString('vi-VN')}
            </p>
        </div>
    );
};

// ==========================================
// CREATE CLASS MODAL
// ==========================================

const CreateClassModal: React.FC<{
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
    isLoading: boolean;
}> = ({ onClose, onCreate, isLoading }) => {
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        await onCreate(name.trim());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Tạo lớp mới</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên lớp</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="VD: Lớp Toán 5A"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button onClick={onClose} variant="secondary" className="flex-1">Hủy</Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            disabled={!name.trim() || isLoading}
                            icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        >
                            {isLoading ? 'Đang tạo...' : 'Tạo lớp'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==========================================
// CLASS DETAIL VIEW (Students list)
// ==========================================

const ClassDetailView: React.FC<{
    classroom: Classroom;
    onBack: () => void;
}> = ({ classroom, onBack }) => {
    const store = useClassroomStore();
    const students = store.students[classroom.id] || [];
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [resetResult, setResetResult] = useState<{ studentId: string; password: string } | null>(null);

    useEffect(() => {
        store.fetchStudents(classroom.id);
    }, [classroom.id]);

    const filteredStudents = students.filter((s) =>
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Copy all login info to clipboard
    const handleCopyAllLogins = useCallback(() => {
        const lines = students.map(
            (s) => `Họ tên: ${s.fullName} | Tài khoản: ${s.username}`
        );
        const text = `📋 Danh sách tài khoản - ${classroom.name}\n${'─'.repeat(40)}\n${lines.join('\n')}\n${'─'.repeat(40)}\n⚠️ Mật khẩu đã được mã hóa. Dùng chức năng "Đặt lại MK" nếu HS quên.`;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId('all');
            setTimeout(() => setCopiedId(null), 2000);
        });
    }, [students, classroom.name]);

    // Handle reset password
    const handleResetPassword = async (studentId: string) => {
        if (!confirm('Đặt lại mật khẩu cho học sinh này?')) return;
        const newPassword = await store.resetPassword(studentId);
        if (newPassword) {
            setResetResult({ studentId, password: newPassword });
        } else {
            alert('Lỗi khi đặt lại mật khẩu.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800">{classroom.name}</h2>
                    <p className="text-gray-500 text-sm">{students.length} học sinh</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleCopyAllLogins}
                        variant="secondary"
                        icon={copiedId === 'all' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    >
                        {copiedId === 'all' ? 'Đã copy!' : 'Copy TK'}
                    </Button>
                    <Button
                        onClick={() => setShowAddModal(true)}
                        variant="primary"
                        icon={<UserPlus className="w-4 h-4" />}
                    >
                        Thêm HS
                    </Button>
                </div>
            </div>

            {/* Search */}
            {students.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm học sinh..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                </div>
            )}

            {/* Loading */}
            {store.isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
            )}

            {/* Empty */}
            {!store.isLoading && students.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Chưa có học sinh</h3>
                    <p className="text-gray-400 mb-6">Bấm "Thêm HS" để thêm học sinh vào lớp</p>
                    <Button
                        onClick={() => setShowAddModal(true)}
                        variant="primary"
                        icon={<UserPlus className="w-4 h-4" />}
                    >
                        Thêm học sinh
                    </Button>
                </div>
            )}

            {/* Students Table */}
            {!store.isLoading && filteredStudents.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">#</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Họ tên</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tài khoản</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">SĐT phụ huynh</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student, idx) => (
                                <tr key={student.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                                    <td className="py-3 px-4 text-sm text-gray-400">{idx + 1}</td>
                                    <td className="py-3 px-4 font-medium text-gray-800">{student.fullName}</td>
                                    <td className="py-3 px-4">
                                        <code className="bg-gray-100 px-2 py-0.5 rounded text-sm text-gray-600">
                                            {student.username}
                                        </code>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-500">
                                        {student.parentPhone || '—'}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleResetPassword(student.id)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="Đặt lại mật khẩu"
                                            >
                                                <KeyRound className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Xóa học sinh "${student.fullName}"?`)) {
                                                        store.removeStudent(student.id, classroom.id);
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                title="Xóa học sinh"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Reset Password Result Toast */}
            {resetResult && (
                <div className="fixed bottom-6 right-6 bg-green-600 text-white rounded-xl shadow-2xl p-4 max-w-sm z-50 animate-in slide-in-from-bottom">
                    <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold">🔑 Mật khẩu mới</p>
                        <button onClick={() => setResetResult(null)} className="text-green-200 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="bg-green-700/50 rounded-lg p-2 flex items-center justify-between">
                        <code className="text-lg font-mono tracking-wider">{resetResult.password}</code>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(resetResult.password);
                                setCopiedId(resetResult.studentId);
                                setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="p-1.5 hover:bg-green-600 rounded-lg"
                        >
                            {copiedId === resetResult.studentId
                                ? <Check className="w-4 h-4" />
                                : <Copy className="w-4 h-4" />
                            }
                        </button>
                    </div>
                    <p className="text-green-200 text-xs mt-2">Gửi mật khẩu này cho học sinh. Chỉ hiển thị một lần!</p>
                </div>
            )}

            {/* Add Student Modal */}
            {showAddModal && (
                <AddStudentModal
                    classId={classroom.id}
                    onClose={() => setShowAddModal(false)}
                    onAdd={async (payload) => {
                        const result = await store.addStudent(payload);
                        if (result) setShowAddModal(false);
                    }}
                    isLoading={store.isLoading}
                    error={store.error}
                />
            )}
        </div>
    );
};

// ==========================================
// ADD STUDENT MODAL
// ==========================================

const AddStudentModal: React.FC<{
    classId: string;
    onClose: () => void;
    onAdd: (payload: CreateStudentPayload) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}> = ({ classId, onClose, onAdd, isLoading, error }) => {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [parentPhone, setParentPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Auto-generate username from full name
    useEffect(() => {
        if (fullName.trim()) {
            const parts = fullName.trim().toLowerCase().split(/\s+/);
            const firstName = parts[parts.length - 1] || '';
            const lastInitial = parts[0]?.[0] || '';
            const mid = parts.length > 2 ? parts.slice(1, -1).map(p => p[0]).join('') : '';
            const suffix = Math.floor(Math.random() * 900 + 100);
            // Remove Vietnamese diacritics
            const clean = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
            setUsername(clean(`${firstName}.${lastInitial}${mid}.${suffix}`));
        }
    }, [fullName]);

    // Auto-generate password
    useEffect(() => {
        const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
        let pw = '';
        for (let i = 0; i < 6; i++) pw += chars[Math.floor(Math.random() * chars.length)];
        setPassword(pw);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim() || !username.trim() || !password.trim()) return;
        await onAdd({
            fullName: fullName.trim(),
            username: username.trim(),
            password: password.trim(),
            classId,
            parentPhone: parentPhone.trim() || undefined,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Thêm học sinh</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Họ và tên <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="H?c sinh m?u 299c47"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            autoFocus
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tên đăng nhập <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="an.nv.123"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-mono"
                        />
                        <p className="text-xs text-gray-400 mt-1">Tự động tạo từ tên. Có thể chỉnh sửa.</p>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mật khẩu <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-mono pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Mật khẩu sẽ được mã hóa khi lưu. Ghi lại để gửi cho HS.</p>
                    </div>

                    {/* Parent Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            SĐT phụ huynh <span className="text-gray-400">(không bắt buộc)</span>
                        </label>
                        <input
                            type="tel"
                            value={parentPhone}
                            onChange={(e) => setParentPhone(e.target.value)}
                            placeholder="0987654321"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button onClick={onClose} variant="secondary" className="flex-1">
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            disabled={!fullName.trim() || !username.trim() || !password.trim() || isLoading}
                            icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        >
                            {isLoading ? 'Đang thêm...' : 'Thêm HS'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClassManagementTab;
