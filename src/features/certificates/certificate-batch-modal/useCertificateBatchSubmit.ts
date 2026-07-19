import { useCallback, useRef, useState } from 'react';
import { showError, showSuccess } from '../../../utils/toast';
import { defaultCertificateDateLine } from './certificateBatchHelpers';
import type { BatchCreateModalProps, BatchStudentRow } from './types';

interface SubmitOptions {
  templateId: string;
  classId: string;
  quizId: string;
  studentRows: BatchStudentRow[];
  selectedIds: Set<string>;
}

export const useCertificateBatchSubmit = (
  createBatch: BatchCreateModalProps['createBatch'],
  onCreated: () => void,
) => {
  const requestIdRef = useRef(crypto.randomUUID());
  const [title, setTitle] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [achievementPrefix, setAchievementPrefix] = useState('Đã hoàn thành xuất sắc');
  const [dateLine, setDateLine] = useState(defaultCertificateDateLine);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (options: SubmitOptions) => {
    if (!options.templateId) {
      showError('Vui lòng chọn mẫu chứng nhận');
      return;
    }
    if (!title.trim()) {
      showError('Vui lòng nhập tiêu đề');
      return;
    }
    const selectedStudents = options.studentRows.filter(student => options.selectedIds.has(student.id));
    if (selectedStudents.length === 0) {
      showError('Cần chọn ít nhất 1 học sinh');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBatch({
        request_id: requestIdRef.current,
        template_id: options.templateId,
        title: title.trim(),
        message: customNote.trim() || undefined,
        achievement_prefix: achievementPrefix.trim(),
        date_line: dateLine.trim(),
        class_id: options.classId,
        quiz_id: options.quizId || undefined,
        student_ids: selectedStudents.map(student => student.id),
      });
      showSuccess(`Đã tiếp nhận ${selectedStudents.length} chứng nhận và đang xử lý.`);
      onCreated();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Gửi thất bại');
    } finally {
      setIsSubmitting(false);
    }
  }, [achievementPrefix, createBatch, customNote, dateLine, onCreated, title]);

  return {
    title,
    setTitle,
    customNote,
    setCustomNote,
    achievementPrefix,
    setAchievementPrefix,
    dateLine,
    setDateLine,
    isSubmitting,
    submit,
  };
};
