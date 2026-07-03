/**
 * ResultRowPhieuModal
 * Modal preview phiếu kết quả cho từng học sinh từ bảng kết quả.
 * Có 3 nút: 🖨 In phiếu | 📄 Tải PDF | 🖼 Tải ảnh | ✨ AI nhận xét
 *
 * @blueprint senior-engineering-toolkit
 */

import React, { useCallback, useRef, useState } from 'react';
import { X, Printer, FileDown, ImageDown, Loader2, Sparkles } from 'lucide-react';
import type { StudentResult } from '../../../types';
import type { PhieuNhanXetInput, PhieuNhanXet } from '../../homework/types/phieu.types';
import { buildPhieuFromResult } from '../utils/buildPhieuFromResult';
import { exportPhieuAsPDF, exportPhieuAsImage } from '../utils/exportPhieu';
import { useAuthStore } from '../../../../stores/authStore';
import { PhieuBTCard } from './PhieuBTCard';
import PhieuLinkSection from './PhieuLinkSection';

interface Props {
  result: StudentResult;
  quizTitle: string;
  onClose: () => void;
}

const ResultRowPhieuModal: React.FC<Props> = ({ result, quizTitle, onClose }) => {
  const { username } = useAuthStore();
  const phieuRef = useRef<HTMLDivElement>(null);
  const [loadingPDF, setLoadingPDF]   = useState(false);
  const [loadingPNG, setLoadingPNG]   = useState(false);
  const [loadingAI,  setLoadingAI]    = useState(false);
  // savedPhieu: khi được lưu lên server thì có id — dùng cho xuất link
  const [savedPhieu, setSavedPhieu]   = useState<PhieuNhanXet | null>(null);

  // Local editable state — khởi tạo từ builder
  const [phieu, setPhieu] = useState<PhieuNhanXetInput>(() =>
    buildPhieuFromResult(result, quizTitle, 'nhe_nhang', username ?? ''),
  );

  const studentName = result.studentName ?? 'hoc_sinh';

  // Merge partial update từ PhieuBTCard onChange
  const handleChange = useCallback((patch: Partial<PhieuNhanXetInput>) => {
    setPhieu((prev) => ({ ...prev, ...patch }));
  }, []);

  // Tái tạo nhận xét AI (gọi lại buildPhieu với style mới hoặc cùng style)
  const handleRegenerateAI = useCallback(async () => {
    setLoadingAI(true);
    try {
      // Simulate async (có thể thay bằng API call thật nếu có)
      await new Promise((r) => setTimeout(r, 600));
      const styles = ['nhe_nhang', 'vui_ve', 'nghiem_tuc'] as const;
      const currentStyle = phieu.nhan_xet_style ?? 'nhe_nhang';
      const nextStyle = styles[(styles.indexOf(currentStyle) + 1) % styles.length];
      const rebuilt = buildPhieuFromResult(result, quizTitle, nextStyle, username ?? '');
      setPhieu((prev) => ({
        ...prev,
        nhan_xet:        rebuilt.nhan_xet,
        noi_dung_co_gang: rebuilt.noi_dung_co_gang,
        loi_dong_vien:   rebuilt.loi_dong_vien,
        nhan_xet_style:  nextStyle,
      }));
    } finally {
      setLoadingAI(false);
    }
  }, [phieu.nhan_xet_style, result, quizTitle, username]);

  const handlePrint = useCallback(() => { window.print(); }, []);

  const handleDownloadPDF = useCallback(async () => {
    if (!phieuRef.current) return;
    setLoadingPDF(true);
    try {
      await exportPhieuAsPDF(phieuRef.current, studentName);
    } finally {
      setLoadingPDF(false);
    }
  }, [studentName]);

  const handleDownloadImage = useCallback(async () => {
    if (!phieuRef.current) return;
    setLoadingPNG(true);
    try {
      await exportPhieuAsImage(phieuRef.current, studentName);
    } finally {
      setLoadingPNG(false);
    }
  }, [studentName]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  // Label style hiện tại để hiển thị trong nút AI
  const styleLabel: Record<string, string> = {
    nhe_nhang:  'Nhẹ nhàng',
    vui_ve:     'Vui vẻ',
    nghiem_tuc: 'Nghiêm túc',
  };
  const currentStyleName = styleLabel[phieu.nhan_xet_style ?? 'nhe_nhang'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* ── Header modal ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Phiếu kết quả</p>
            <p className="font-bold text-gray-800 text-base leading-tight">{studentName}</p>
            <p className="text-xs text-gray-500 truncate max-w-xs">{quizTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Nút AI nhận xét ── */}
        <div className="flex items-center justify-between px-5 py-2 bg-violet-50 border-b border-violet-100">
          <span className="text-xs text-violet-500 font-semibold">
            Phong cách hiện tại: <span className="text-violet-700">{currentStyleName}</span>
          </span>
          <button
            onClick={handleRegenerateAI}
            disabled={loadingAI}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors disabled:opacity-60"
            title="Tạo lại nhận xét AI với phong cách tiếp theo"
          >
            {loadingAI
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Sparkles className="w-3 h-3" />}
            ✨ AI nhận xét
          </button>
        </div>

        {/* ── Phiếu preview — editable ── */}
        <div ref={phieuRef} className="overflow-hidden p-4 flex justify-center">
          <PhieuBTCard
            phieu={phieu}
            editable={true}
            onChange={handleChange}
            tenGVCN={username ?? ''}
          />
        </div>

        {/* ── Link phụ huynh ── */}
        <PhieuLinkSection
          phieuInput={phieu}
          savedPhieu={savedPhieu}
          onPhieuSaved={setSavedPhieu}
        />

        {/* ── Footer actions ── */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t bg-gray-50 rounded-b-2xl flex-wrap">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Đóng
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={loadingPNG}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-60"
            title="Tải ảnh PNG — tên file = tên học sinh"
          >
            {loadingPNG ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageDown className="w-4 h-4" />}
            Tải ảnh
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={loadingPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-60"
            title="Tải PDF — tên file = tên học sinh"
          >
            {loadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Tải PDF
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
            title="Mở hộp thoại in"
          >
            <Printer className="w-4 h-4" />
            In phiếu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultRowPhieuModal;
