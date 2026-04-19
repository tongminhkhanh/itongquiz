import React, { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Check, AlertCircle, Upload, Loader2 } from 'lucide-react';
import { Button } from '../../../../../components/common';
import { CreateStudentPayload } from '../../../types';
import { downloadStudentTemplate, parseStudentExcel } from '../../../utils/excelParser';

interface ExcelTabProps {
    classId: string;
    onClose: () => void;
    onSubmit: (payload: CreateStudentPayload[]) => Promise<void>;
    isLoading: boolean;
}

export const ExcelTab: React.FC<ExcelTabProps> = ({ classId, onClose, onSubmit, isLoading }) => {
    const [parsedData, setParsedData] = useState<CreateStudentPayload[] | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setParseError(null);
        setParsedData(null);

        try {
            const students = await parseStudentExcel(file, classId);
            setParsedData(students);
        } catch (err: any) {
            setParseError(err.message || 'Lỗi không xác định.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFormSubmit = async () => {
        if (!parsedData || parsedData.length === 0) return;
        await onSubmit(parsedData);
    };

    return (
        <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-orange-900 text-sm">Tải file mẫu</h3>
                    <p className="text-orange-700 text-xs mt-1">Sử dụng định dạng chuẩn để tránh lỗi</p>
                </div>
                <Button variant="secondary" onClick={downloadStudentTemplate} icon={<Download className="w-4 h-4" />} className="bg-white">
                    Tải xuống
                </Button>
            </div>

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
                        <Button variant="secondary" onClick={() => setParsedData(null)} className="text-sm bg-white">
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

            <div className="flex gap-3 pt-2">
                <Button onClick={onClose} variant="secondary" className="flex-1">
                    Hủy
                </Button>
                <Button
                    onClick={handleFormSubmit}
                    variant="primary"
                    className="flex-1"
                    disabled={!parsedData || isLoading}
                    icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                >
                    {isLoading ? 'Đang thêm...' : 'Tải lên & Thêm'}
                </Button>
            </div>
        </div>
    );
};
