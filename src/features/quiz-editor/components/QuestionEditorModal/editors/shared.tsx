/** Shared types and mini-components used across all editor forms. */
import React from 'react';
import { NewlineMathText } from '../../../../../components/common';
import { analyzeMathText, hasMathSyntax } from '../../../../../utils/mathText';

export const FieldRow: React.FC<{
    label: string;
    hint?: string;
    children: React.ReactNode;
}> = ({ label, hint, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
        {children}
    </div>
);

export const MathFieldPreview: React.FC<{ value: string; className?: string }> = ({ value, className }) => {
    if (!hasMathSyntax(value)) return null;
    const issues = analyzeMathText(value);

    return (
        <div className={`mt-1.5 rounded-lg border px-2.5 py-2 text-sm ${
            issues.length > 0
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-blue-100 bg-blue-50/60 text-gray-700'
        } ${className || ''}`}>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
                Xem trước công thức
            </div>
            <NewlineMathText content={value} as="span" className="quiz-text-preserve-inline" />
            {issues.length > 0 && (
                <p className="mt-1 text-xs font-semibold">
                    ⚠ {issues[0].message}
                </p>
            )}
        </div>
    );
};

export const RemoveBtn: React.FC<{ onClick: () => void; title?: string }> = ({
    onClick,
    title = 'Xóa',
}) => (
    <button
        type="button"
        onClick={onClick}
        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
        title={title}
    >
        ✕
    </button>
);

export const AddRowBtn: React.FC<{ onClick: () => void; label: string }> = ({
    onClick,
    label,
}) => (
    <button
        type="button"
        onClick={onClick}
        className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-1"
    >
        + {label}
    </button>
);

export const TextInput: React.FC<
    React.InputHTMLAttributes<HTMLInputElement> & { value: string; showMathPreview?: boolean }
> = ({ showMathPreview = true, ...props }) => (
    <div className="w-full min-w-0">
        <input
            {...props}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-sm ${props.className ?? ''}`}
        />
        {showMathPreview && <MathFieldPreview value={props.value} />}
    </div>
);