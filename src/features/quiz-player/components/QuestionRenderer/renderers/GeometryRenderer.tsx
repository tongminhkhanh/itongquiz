import React from 'react';
import { BaseRendererProps } from '../types';
import GeometryContainer from '../../../../../components/common/GeometryRenderer';

/**
 * GeometryRenderer: Renders geometry items (GeoGebra/Canvas based).
 */
const GeometryRenderer: React.FC<BaseRendererProps> = ({
    question: q,
    answers,
    onAnswerChange,
}) => {
    const geometryData = (q as any).geometryData;
    const geometryType = (q as any).geometryType;

    if (!geometryData) {
        return (
            <div className="p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                Không tìm thấy dữ liệu hình học.
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-inner border-2 border-gray-100 overflow-hidden">
                <GeometryContainer
                    data={geometryData}
                    type={geometryType}
                    readOnly={true}
                />
            </div>
            
            {/* Input for answer if applicable */}
            <div className="mt-6 w-full max-w-sm">
                <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) => onAnswerChange(q.id, e.target.value)}
                    placeholder="Nhập kết quả quan sát được..."
                    className="w-full p-4 text-center text-xl font-bold border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none"
                />
            </div>
        </div>
    );
};

export default React.memo(GeometryRenderer);
