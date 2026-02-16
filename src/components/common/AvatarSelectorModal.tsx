/**
 * Avatar Selector Modal
 *
 * Displays a grid of sticker avatars for students to choose from.
 * Calls API to persist the selection.
 */

import React, { useState } from 'react';
import { AVATAR_LIST, getAvatarUrl } from '../../config/avatars';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { Loader2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AvatarSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentAvatar?: string;
}

const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = ({ isOpen, onClose, currentAvatar }) => {
    const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || 'owl');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const studentSession = useClassroomStore(s => s.studentSession);
    const updateAvatar = useClassroomStore(s => s.updateAvatar);

    const handleSave = async () => {
        if (!studentSession) return;
        setIsSaving(true);

        const ok = await updateAvatar(studentSession.studentId, selectedAvatar);

        setIsSaving(false);
        if (ok) {
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
            }, 1200);
        }
    };

    if (!isOpen) return null;

    const hasChanged = selectedAvatar !== (currentAvatar || 'owl');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0"
                style={{ backgroundColor: 'rgba(255, 251, 240, 0.85)', backdropFilter: 'blur(4px)' }}
            />

            {/* Modal */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="avatar-modal"
            >
                {/* Close Button */}
                <button onClick={onClose} className="avatar-modal__close">
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="avatar-modal__header">
                    <div className="avatar-modal__preview">
                        <img
                            src={getAvatarUrl(selectedAvatar)}
                            alt="Selected Avatar"
                            className="avatar-modal__preview-img"
                        />
                    </div>
                    <h2 className="avatar-modal__title">Chọn Avatar của em!</h2>
                    <p className="avatar-modal__subtitle">Bấm vào hình yêu thích rồi nhấn Lưu nhé</p>
                </div>

                {/* Grid */}
                <div className="avatar-modal__grid">
                    {AVATAR_LIST.map((avatar) => (
                        <button
                            key={avatar.id}
                            onClick={() => setSelectedAvatar(avatar.id)}
                            className={`avatar-modal__item ${selectedAvatar === avatar.id ? 'avatar-modal__item--selected' : ''}`}
                            title={avatar.name}
                        >
                            <img
                                src={avatar.url}
                                alt={avatar.name}
                                className="avatar-modal__item-img"
                                loading="lazy"
                            />
                            {selectedAvatar === avatar.id && (
                                <span className="avatar-modal__item-check">
                                    <Check className="w-3 h-3" />
                                </span>
                            )}
                            <span className="avatar-modal__item-name">{avatar.name}</span>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="avatar-modal__footer">
                    {showSuccess ? (
                        <div className="avatar-modal__success">
                            🎉 Đã đổi avatar thành công!
                        </div>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasChanged}
                            className="avatar-modal__save-btn"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                'Lưu thay đổi'
                            )}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default AvatarSelectorModal;
