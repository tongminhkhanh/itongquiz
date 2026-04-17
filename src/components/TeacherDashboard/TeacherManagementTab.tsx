import React, { useState, useEffect, useCallback } from 'react';
import { callApi } from '../../services/apiAdapter';
import { UserPlus, Pencil, Trash2, X, Save, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { ResponsiveDataView } from '../common';
import { useAuthStore } from '../../../stores/authStore';
import { showError, showSuccess, showConfirm } from '../../utils/toast';

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
    const authStore = useAuthStore();
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
            setError(err.message || 'KhÃ´ng thá»ƒ táº£i danh sÃ¡ch giÃ¡o viÃªn');
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
        showConfirm({
            message: `XÃ¡c nháº­n xÃ³a tÃ i khoáº£n "${fullName}" (${username})?`,
            confirmLabel: 'XÃ³a',
            destructive: true,
            onConfirm: async () => {
                try {
                    const result = await callApi<{ status: string; message: string }>('delete_teacher', {
                        username,
                        actorUsername: authStore.username || '',
                    });
                    if (result.status === 'success') {
                        setTeachers(prev => prev.filter(t => t.username !== username));
                        showSuccess('XÃ³a tÃ i khoáº£n thÃ nh cÃ´ng');
                    } else {
                        showError(result.message || 'Lá»—i khi xÃ³a');
                    }
                } catch (err: any) {
                    showError(err.message || 'Lá»—i khi xÃ³a');
                }
            },
        });
    };


    // Save (create or update)
    const handleSave = async () => {
        if (!form.fullName.trim()) { showError('Vui lÃ²ng nháº­p há» tÃªn'); return; }
        if (!form.username.trim()) { showError('Vui lÃ²ng nháº­p tÃªn Ä‘Äƒng nháº­p'); return; }
        if (!editingUsername && !form.password.trim()) { showError('Vui lÃ²ng nháº­p máº­t kháº©u'); return; }

        setSaving(true);
        try {
            if (editingUsername) {
                const result = await callApi<{ status: string; message: string }>('update_teacher', {
                    username: editingUsername,
                    password: form.password || undefined,
                    fullName: form.fullName,
                    role: form.role,
                    teacherClass: form.teacherClass,
                    actorUsername: authStore.username || '',
                });
                if (result.status === 'error') { showError(result.message); return; }
            } else {
                const result = await callApi<{ status: string; message: string }>('create_teacher', {
                    username: form.username,
                    password: form.password,
                    fullName: form.fullName,
                    role: form.role,
                    teacherClass: form.teacherClass,
                    actorUsername: authStore.username || '',
                });
                if (result.status === 'error') { showError(result.message); return; }
            }

            setShowModal(false);
            setForm(EMPTY_FORM);
            showSuccess(editingUsername ? 'Cáº­p nháº­t thÃ nh cÃ´ng' : 'Táº¡o tÃ i khoáº£n thÃ nh cÃ´ng');
            await fetchTeachers();
        } catch (err: any) {
            showError(err.message || 'Lá»—i khi lÆ°u');
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
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">GiÃ¡o viÃªn</span>;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Quáº£n lÃ½ GiÃ¡o viÃªn</h2>
                    <p className="text-sm text-gray-500">Táº¡o, sá»­a, xÃ³a tÃ i khoáº£n giÃ¡o viÃªn</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchTeachers}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        LÃ m má»›i
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        ThÃªm giÃ¡o viÃªn
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
                <ResponsiveDataView
                    items={teachers}
                    keyExtractor={(teacher) => teacher.username}
                    emptyState={(
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="text-center py-8 text-gray-400">
                                ChÆ°a cÃ³ giÃ¡o viÃªn nÃ o. Nháº¥n "ThÃªm giÃ¡o viÃªn" Ä‘á»ƒ báº¯t Ä‘áº§u.
                            </div>
                        </div>
                    )}
                    renderDesktop={() => (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Há» tÃªn</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Máº­t kháº©u</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Vai trÃ²</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Lá»›p</th>
                                            <th className="text-center px-4 py-3 font-semibold text-gray-600">Thao tÃ¡c</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teachers.map((t, idx) => (
                                            <tr key={t.username} className="border-b border-gray-100 hover:bg-orange-50/50 transition-colors">
                                                <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                                                <td className="px-4 py-3 font-medium text-gray-800">{t.full_name}</td>
                                                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{t.username}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-500 font-mono text-xs">
                                                            {showPasswords[t.username] ? t.password : 'â€¢â€¢â€¢â€¢â€¢â€¢'}
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
                                                <td className="px-4 py-3 text-gray-600">{t.class || '-'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => handleEdit(t)}
                                                            className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500 hover:text-blue-700 transition-colors"
                                                            title="Sá»­a"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(t.username, t.full_name)}
                                                            className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                                                            title="XÃ³a"
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
                            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                                Tá»•ng cá»™ng: {teachers.length} giÃ¡o viÃªn
                            </div>
                        </div>
                    )}
                    renderMobileCard={(teacher, idx) => (
                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs text-slate-400">#{idx + 1}</p>
                                    <p className="text-sm font-bold text-slate-800">{teacher.full_name}</p>
                                    <p className="text-xs text-slate-500 mt-1 font-mono">{teacher.username}</p>
                                </div>
                                {roleLabel(teacher.role)}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-500 font-semibold">Máº­t kháº©u:</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-500 font-mono text-xs">
                                        {showPasswords[teacher.username] ? teacher.password : 'â€¢â€¢â€¢â€¢â€¢â€¢'}
                                    </span>
                                    <button
                                        onClick={() => togglePassword(teacher.username)}
                                        className="h-8 w-8 rounded-md bg-gray-100 text-gray-500 inline-flex items-center justify-center"
                                    >
                                        {showPasswords[teacher.username] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-600">
                                <span className="font-semibold">Lá»›p phá»¥ trÃ¡ch:</span> {teacher.class || '-'}
                            </p>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={() => handleEdit(teacher)}
                                    className="h-10 px-3 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold inline-flex items-center gap-1.5"
                                >
                                    <Pencil className="w-4 h-4" />
                                    Sá»­a
                                </button>
                                <button
                                    onClick={() => handleDelete(teacher.username, teacher.full_name)}
                                    className="h-10 px-3 rounded-lg bg-red-50 text-red-700 text-sm font-semibold inline-flex items-center gap-1.5"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    XÃ³a
                                </button>
                            </div>
                        </div>
                    )}
                />
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white w-full h-dvh md:h-auto md:max-h-[90vh] md:max-w-md rounded-none md:rounded-2xl shadow-xl p-5 md:p-6 md:mx-4 overflow-y-auto">
                        {/* Modal header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-xl">
                                    <UserPlus className="w-6 h-6 text-orange-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    {editingUsername ? 'Sá»­a giÃ¡o viÃªn' : 'ThÃªm giÃ¡o viÃªn má»›i'}
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
                                    Há» tÃªn <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.fullName}
                                    onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                                    placeholder="VD: CÃ´ HÆ°Æ¡ng"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    TÃªn Ä‘Äƒng nháº­p <span className="text-red-500">*</span>
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
                                    <p className="text-xs text-gray-400 mt-1">KhÃ´ng thá»ƒ Ä‘á»•i username</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Máº­t kháº©u {!editingUsername && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type="text"
                                    value={form.password}
                                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder={editingUsername ? 'Äá»ƒ trá»‘ng náº¿u khÃ´ng Ä‘á»•i' : 'Nháº­p máº­t kháº©u'}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vai trÃ²</label>
                                    <select
                                        value={form.role}
                                        onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value="teacher">GiÃ¡o viÃªn</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lá»›p phá»¥ trÃ¡ch</label>
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
                                    Há»§y
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
                                    {editingUsername ? 'Cáº­p nháº­t' : 'Táº¡o tÃ i khoáº£n'}
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
