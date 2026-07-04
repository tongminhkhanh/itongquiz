import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Share2, Trophy, Calendar, Star, User } from 'lucide-react';
import { Certificate } from './certificates.types';

interface CertificateCardProps {
    cert: Certificate;
}

const CertificateCard: React.FC<CertificateCardProps> = ({ cert }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [imgError, setImgError] = useState(false);

    const formattedDate = new Date(cert.issuedAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const handleDownload = async () => {
        if (!cert.pngUrl || isDownloading) return;
        setIsDownloading(true);
        try {
            const res = await fetch(cert.pngUrl);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chung-nhan-${cert.id}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            // fallback: mở tab mới
            window.open(cert.pngUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        if (!cert.pngUrl) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: cert.title,
                    text: `Tôi đã nhận được chứng nhận: ${cert.title}`,
                    url: cert.pngUrl,
                });
            } catch {
                // bỏ qua nếu user cancel
            }
        } else {
            // Fallback: copy link
            await navigator.clipboard.writeText(cert.pngUrl).catch(() => {});
            toast.success('Đã copy link chứng nhận!');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-md border border-amber-100 overflow-hidden hover:shadow-lg transition-shadow duration-200">
            {/* Certificate Image Preview */}
            <div className="relative bg-gradient-to-br from-amber-50 to-yellow-100 aspect-[4/3] flex items-center justify-center overflow-hidden">
                {cert.pngUrl && !imgError ? (
                    <img
                        src={cert.pngUrl}
                        alt={cert.title}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 text-amber-400 p-6">
                        <Trophy size={48} className="opacity-60" />
                        <p className="text-sm font-medium text-amber-600 text-center">{cert.title}</p>
                    </div>
                )}

                {/* Ribbon badge */}
                <div className="absolute top-3 right-3">
                    <div className="bg-amber-400 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow">
                        <Star size={10} fill="white" />
                        Chứng nhận
                    </div>
                </div>
            </div>

            {/* Card Info */}
            <div className="p-4">
                <h3 className="font-bold text-gray-800 text-sm md:text-base line-clamp-2 mb-2">
                    {cert.title}
                </h3>

                <div className="space-y-1 mb-3">
                    {cert.quizTitle && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Trophy size={12} className="text-amber-400 shrink-0" />
                            <span className="line-clamp-1">{cert.quizTitle}</span>
                        </div>
                    )}
                    {cert.studentScore !== null && cert.studentScore !== undefined && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Star size={12} className="text-amber-400 shrink-0" />
                            <span>Điểm: <span className="font-semibold text-amber-600">{cert.studentScore}</span></span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <User size={12} className="text-indigo-400 shrink-0" />
                        <span className="line-clamp-1">GV: {cert.teacherName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar size={12} className="text-indigo-400 shrink-0" />
                        <span>{formattedDate}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading || !cert.pngUrl}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-colors"
                    >
                        <Download size={13} />
                        {isDownloading ? 'Đang tải...' : 'Tải về'}
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={!cert.pngUrl}
                        className="flex items-center justify-center gap-1.5 bg-amber-400 hover:bg-amber-500 disabled:bg-amber-200 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-colors"
                    >
                        <Share2 size={13} />
                        Chia sẻ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CertificateCard;
