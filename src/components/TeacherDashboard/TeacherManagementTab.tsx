import React, { useState, useEffect, useCallback } from 'react';
import { callApi } from '../../services/apiAdapter';
import { UserPlus, Pencil, Trash2, X, Save, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react';

// Teacher data from D1
interface TeacherRecord {
    username: string;
    password: string;
    full_name: string;
    role: string;
    class: string;
}

// Form state for create/edit
interface TeacherForm {
    username: string;
    password: string;
    fullName: string;
    role: string;
    teacherClass: string;
}

const EMPTY_FORM: TeacherForm = {
    username: '',
    password: '',
    fullName: '',
    role: 'teacher',
    teacherClass: '',
};

const TeacherManagementTab: React.FC = () => {
    const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingUsername, setEditingUsername] = useState<string | null>(null);
    const [form, setForm] = useState<TeacherForm>(EMPTY_FORM);
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

    // Fetch teachers list
    const fetchTeachers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await callApi<TeacherRecord[]>('get_teachers');
            if (Array.isArray(data)) {
                setTeachers(data);
            }
        } catch (err: any) {
            setError(err.message || 'Không thể tải danh sách giáo viên');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

    // Open modal for create
    const handleCreate = () => {
        setEditingUsername(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    };

    // Open modal for edit
    const handleEdit = (teacher: TeacherRecord) => {
        setEditingUsername(teacher.username);
        setForm({
            username: teacher.username,
            password: teacher.password,
            fullName: teacher.full_name,
            role: teacher.role,
            teacherClass: teacher.class || '',
        });
        setShowModal(true);
    };

    // Delete teacher
    const handleDelete = async (username: string, fullName: string) => {
        if (!confirm(`Xác nhận xóa tài khoản "${fullName}" (${username})?`)) return;

        try {
            const result = await callApi<{ status: string; message: string }>('delete_teacher', { username });
            if (result.status === 'success') {
                setTeachers(prev => prev.filter(t => t.username !== username));
            } else {
                alert(result.message || 'Lỗi khi xóa');
            }
        } catch (err: any) {
            alert(err.message || 'Lỗi khi xóa');
        }
    };

    // Save (create or update)
    const handleSave = async () => {
        // Validate
        if (!form.fullName.trim()) { alert('Vui lòng nhập họ tên'); return; }
        if (!form.username.trim()) { alert('Vui lòng nhập tên đăng nhập'); return; }
        if (!editingUsername && !form.password.trim()) { alert('Vui lòng nhập mật khẩu'); return; }

        setSaving(true);
        try {
            if (editingUsername) {
                // Update existing
                const result = await callApi<{ status: string; message: string }>('update_teacher', {
                    username: editingUsername,
                    password: form.password || undefined,
                    fullName: form.fullName,
                    role: form.role,
                    teacherClass: form.teacherClass,
                });
                if (result.status === 'error') { alert(result.message); return; }
            } else {
                // Create new
                const result = await callApi<{ status: string; message: string }>('create_teacher', {
                    username: form.username,
                    password: form.password,
                    fullName: form.fullName,
                    role: form.role,
                    teacherClass: form.teacherClass,
                });
                if (result.status === 'error') { alert(result.message); return; }
            }

            setShowModal(false);
            setForm(EMPTY_FORM);
            await fetchTeachers();
        } catch (err: any) {
            alert(err.message || 'Lỗi khi lưu');
        } finally {
            setSaving(false);
        }
    };

    // Toggle password visibility
    const togglePassword = (username: string) => {
        setShowPasswords(prev => ({ ...prev, [username]: !prev[username] }));
    };

    // Role display
    const roleLabel = (role: string) => {
        if (role === 'admin') return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Admin</span>;
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Giáo viên</span>;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Quản lý Giáo viên</h2>
                    <p className="text-sm text-gray-500">Tạo, sửa, xóa tài khoản giáo viên</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchTeachers}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Làm mới
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        Thêm giáo viên
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
            ) : (
                /* Table */
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Họ tên</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Mật khẩu</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Vai trò</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Lớp</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teachers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-gray-400">
                                            Chưa có giáo viên nào. Nhấn "Thêm giáo viên" để bắt đầu.
                                        </td>
                                    </tr>
                                ) : (
                                    teachers.map((t, idx) => (
                                        <tr key={t.username} className="border-b border-gray-100 hover:bg-orange-50/50 transition-colors">
                                            <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{t.full_name}</td>
                                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">{t.username}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-gray-500 font-mono text-xs">
                                                        {showPasswords[t.username] ? t.password : '••••••'}
                                                    </span>
                                                    <button
                                                        onClick={() => togglePassword(t.username)}
                                                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showPasswords[t.username]
                                                            ? <EyeOff className="w-3.5 h-3.5" />
                                                            : <Eye className="w-3.5 h-3.5" />
                                                        }
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{roleLabel(t.role)}</td>
                                            <td className="px-4 py-3 text-gray-600">{t.class || '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleEdit(t)}
                                                        className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500 hover:text-blue-700 transition-colors"
                                                        title="Sửa"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(t.username, t.full_name)}
                                                        className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {teachers.length > 0 && (
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                            Tổng cộng: {teachers.length} giáo viên
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
                        {/* Modal header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-xl">
                                    <UserPlus className="w-6 h-6 text-orange-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    {editingUsername ? 'Sửa giáo viên' : 'Thêm giáo viên mới'}
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Họ tên <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.fullName}
                                    onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                                    placeholder="VD: Cô Hương"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên đăng nhập <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.username}
                                    onChange={e => setForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                                    placeholder="VD: huong"
                                    disabled={!!editingUsername}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${editingUsername ? 'bg-gray-100 text-gray-500' : ''}`}
                                />
                                {editingUsername && (
                                    <p className="text-xs text-gray-400 mt-1">Không thể đổi username</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mật khẩu {!editingUsername && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type="text"
                                    value={form.password}
                                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder={editingUsername ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                                    <select
                                        value={form.role}
                                        onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value="teacher">Giáo viên</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lớp phụ trách</label>
                                    <input
                                        type="text"
                                        value={form.teacherClass}
                                        onChange={e => setForm(prev => ({ ...prev, teacherClass: e.target.value }))}
                                        placeholder="VD: 3a1"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {editingUsername ? 'Cập nhật' : 'Tạo tài khoản'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherManagementTab;
