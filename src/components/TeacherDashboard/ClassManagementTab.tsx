import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useAuthStore } from '../../../stores/authStore';
import { Classroom, Student, CreateStudentPayload } from '../../types/classroom.types';
import {
    Plus, Users, Trash2, ChevronLeft, Copy, Check, RefreshCw,
    Loader2, X, Eye, EyeOff, KeyRound, UserPlus, Phone, Search,
    Upload, Download, FileSpreadsheet, AlertCircle
} from 'lucide-react';
import { Button, ResponsiveDataView } from '../common';
import * as XLSX from 'xlsx';

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
        if (authStore.isAdmin) {
            store.fetchClasses();
        } else if (authStore.username) {
            store.fetchClasses(authStore.username);
        }
    }, [authStore.username, authStore.isAdmin]);

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
            <div className="bg-white w-full h-dvh md:h-auto md:max-h-[90vh] md:max-w-md rounded-none md:rounded-2xl shadow-xl p-5 md:p-6 md:mx-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
    const authStore = useAuthStore();
    const store = useClassroomStore();
    const students = store.students[classroom.id] || [];
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

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
        if (!authStore.isAdmin) {
            alert('Chỉ Admin mới được đặt lại mật khẩu học sinh.');
            return;
        }
        if (!authStore.username) {
            alert('Không xác định được tài khoản admin.');
            return;
        }

        const input = window.prompt('Nhập mật khẩu mới cho học sinh (tối thiểu 6 ký tự):', '');
        if (input === null) return;
        const newPassword = input.trim();
        if (newPassword.length < 6) {
            alert('Mật khẩu mới phải từ 6 ký tự.');
            return;
        }
        if (!confirm('Xác nhận đặt lại mật khẩu học sinh này?')) return;

        const ok = await store.resetPassword(studentId, newPassword, authStore.username);
        if (ok) {
            alert('Đặt lại mật khẩu thành công.');
        } else {
            alert(store.error || 'Lỗi khi đặt lại mật khẩu.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
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
                <div className="flex gap-2 w-full sm:w-auto">
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
                <ResponsiveDataView
                    items={filteredStudents}
                    keyExtractor={(student) => student.id}
                    renderDesktop={() => (
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
                                                    {authStore.isAdmin && (
                                                        <button
                                                            onClick={() => handleResetPassword(student.id)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                            title="Đặt lại mật khẩu"
                                                        >
                                                            <KeyRound className="w-4 h-4" />
                                                        </button>
                                                    )}
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
                    renderMobileCard={(student, idx) => (
                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-xs text-slate-400">#{idx + 1}</p>
                                    <p className="text-sm font-bold text-slate-800">{student.fullName}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {authStore.isAdmin && (
                                        <button
                                            onClick={() => handleResetPassword(student.id)}
                                            className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 inline-flex items-center justify-center"
                                            title="Đặt lại mật khẩu"
                                        >
                                            <KeyRound className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (confirm(`Xóa học sinh "${student.fullName}"?`)) {
                                                store.removeStudent(student.id, classroom.id);
                                            }
                                        }}
                                        className="h-10 w-10 rounded-lg bg-red-50 text-red-600 inline-flex items-center justify-center"
                                        title="Xóa học sinh"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="text-sm text-slate-600">
                                <p className="mb-1">
                                    <span className="font-semibold text-slate-500">Tài khoản:</span>{' '}
                                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-700">{student.username}</code>
                                </p>
                                <p>
                                    <span className="font-semibold text-slate-500">SĐT phụ huynh:</span> {student.parentPhone || '—'}
                                </p>
                            </div>
                        </div>
                    )}
                />
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
                    onAddBatch={async (payloads) => {
                        const result = await store.addStudentsBulk(payloads, classroom.id);
                        if (result) setShowAddModal(false);
                        return result;
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
    onAddBatch: (payloads: CreateStudentPayload[]) => Promise<any>;
    isLoading: boolean;
    error: string | null;
}> = ({ classId, onClose, onAdd, onAddBatch, isLoading, error }) => {
    const [activeTab, setActiveTab] = useState<'manual' | 'excel'>('manual');

    // --- State for Manual Tab ---
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [parentPhone, setParentPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // --- State for Excel Tab ---
    const [parsedData, setParsedData] = useState<CreateStudentPayload[] | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-generate username from full name
    useEffect(() => {
        if (fullName.trim()) {
            const parts = fullName.trim().toLowerCase().split(/\s+/);
            const firstName = parts[parts.length - 1] || '';
            const lastInitial = parts[0]?.[0] || '';
            const mid = parts.length > 2 ? parts.slice(1, -1).map(p => p[0]).join('') : '';
            const suffix = Math.floor(Math.random() * 900 + 100);
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
    }, [activeTab]); // regen when switching tabs

    const handleSubmitManual = async (e: React.FormEvent) => {
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

    // --- Excel Handling ---
    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Họ và tên *', 'Tên đăng nhập (để trống tự tạo)', 'Mật khẩu (để trống tự tạo)', 'SĐT phụ huynh'],
            ['Nguyễn Văn A', 'a.nv.101', 'xyz123', '0987654321'],
            ['Trần Thị B', '', '', ''],
            ['Lê Minh C', '', '', '']
        ]);

        // Auto size columns a bit
        ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 15 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'HocSinh');
        XLSX.writeFile(wb, 'Mau_Them_Hoc_Sinh.xlsx');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setParseError(null);
        setParsedData(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                // array of object arrays
                const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

                // validate
                if (data.length <= 1) {
                    setParseError('File trống hoặc không có dữ liệu (cần ít nhất 1 dòng dữ liệu không tính tiêu đề).');
                    setIsUploading(false);
                    return;
                }

                const students: CreateStudentPayload[] = [];
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length === 0 || !row[0] || (typeof row[0] === 'string' && !row[0].trim())) continue; // Skip empty rows

                    const fullNameRow = String(row[0]).trim();
                    let usernameRow = row[1] ? String(row[1]).trim() : '';
                    let passwordRow = row[2] ? String(row[2]).trim() : '';
                    const phoneRow = row[3] ? String(row[3]).trim() : '';

                    // Generate if empty
                    if (!usernameRow) {
                        const parts = fullNameRow.toLowerCase().split(/\s+/);
                        const firstName = parts[parts.length - 1] || '';
                        const lastInitial = parts[0]?.[0] || '';
                        const mid = parts.length > 2 ? parts.slice(1, -1).map(p => p[0]).join('') : '';
                        const suffix = Math.floor(Math.random() * 900 + 100);
                        const clean = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
                        usernameRow = clean(`${firstName}.${lastInitial}${mid}.${suffix}${i}`);
                    }

                    if (!passwordRow) {
                        const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
                        for (let k = 0; k < 6; k++) passwordRow += chars[Math.floor(Math.random() * chars.length)];
                    }

                    students.push({
                        fullName: fullNameRow,
                        username: usernameRow,
                        password: passwordRow,
                        classId,
                        parentPhone: phoneRow,
                    });
                }

                if (students.length === 0) {
                    setParseError('Không tìm thấy dữ liệu học sinh hợp lệ.');
                } else {
                    setParsedData(students);
                }
            } catch (err: any) {
                setParseError('Lỗi đọc file Excel: ' + (err.message || 'Unknown error.'));
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = ''; // reset
            }
        };
        reader.onerror = () => {
            setParseError('Lỗi trình duyệt khi đọc file.');
            setIsUploading(false);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleSubmitExcel = async () => {
        if (!parsedData || parsedData.length === 0) return;
        const res = await onAddBatch(parsedData);
        if (res) {
            if (res.errorCount > 0) {
                alert(`Đã thêm thành công ${res.successCount} học sinh.\nBỏ qua ${res.errorCount} học sinh do bị trùng Tên đăng nhập.`);
            } else {
                alert(`Đã thêm thành công tất cả ${res.successCount} học sinh.`);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-white w-full h-dvh md:h-auto md:max-h-[90vh] md:max-w-lg rounded-none md:rounded-2xl shadow-xl p-5 md:p-6 md:mx-4 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Thêm học sinh</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                    <button
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'manual' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('manual')}
                    >
                        Nhập thủ công
                    </button>
                    <button
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'excel' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('excel')}
                    >
                        Nhập từ Excel
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm mb-4">
                        {error}
                    </div>
                )}

                {activeTab === 'manual' ? (
                    <form onSubmit={handleSubmitManual} className="space-y-4">
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
                ) : (
                    <div className="space-y-6">
                        {/* Download Template */}
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-orange-900 text-sm">Tải file mẫu</h3>
                                <p className="text-orange-700 text-xs mt-1">Sử dụng định dạng chuẩn để tránh lỗi</p>
                            </div>
                            <Button variant="secondary" onClick={handleDownloadTemplate} icon={<Download className="w-4 h-4" />} className="bg-white">
                                Tải xuống
                            </Button>
                        </div>

                        {/* Dropzone / Upload Area */}
                        <div>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            
                            {!parsedData ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${parseError ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-orange-400 hover:bg-orange-50'}`}
                                >
                                    {isUploading ? (
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
                                            <p className="text-gray-600 font-medium">Đang đọc file...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <FileSpreadsheet className={`w-8 h-8 mb-3 ${parseError ? 'text-red-400' : 'text-gray-400'}`} />
                                            <p className="text-gray-700 font-medium mb-1">Chọn file Excel tải lên</p>
                                            <p className="text-gray-400 text-sm">Hỗ trợ .xlsx, .xls</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="border border-green-200 bg-green-50 rounded-xl p-6 text-center">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Check className="w-6 h-6 text-green-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-green-800 mb-1">
                                        Đã tìm thấy {parsedData.length} học sinh
                                    </h3>
                                    <p className="text-green-600 text-sm mb-4">
                                        Dữ liệu hợp lệ, sẵn sàng để tải lên hệ thống.
                                    </p>
                                    <Button variant="outline" onClick={() => setParsedData(null)} className="text-sm bg-white">
                                        Chọn file khác
                                    </Button>
                                </div>
                            )}
                            
                            {parseError && (
                                <div className="flex items-center gap-2 mt-3 text-red-500 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{parseError}</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button onClick={onClose} variant="secondary" className="flex-1">
                                Hủy
                            </Button>
                            <Button
                                onClick={handleSubmitExcel}
                                variant="primary"
                                className="flex-1"
                                disabled={!parsedData || isLoading}
                                icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            >
                                {isLoading ? 'Đang thêm...' : 'Tải lên & Thêm'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassManagementTab;
