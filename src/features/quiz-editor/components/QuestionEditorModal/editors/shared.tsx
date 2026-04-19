/**
 * shared.ts
 * Shared types and mini-components used across all editor forms.
 */
import React from 'react';

/** A consistent label+field wrapper used in every editor form. */
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

/** A remove button (✕) for list-based fields. */
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

/** An "add more" text button. */
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

/** Controlled text input. */
export const TextInput: React.FC<
    React.InputHTMLAttributes<HTMLInputElement> & { value: string }
> = (props) => (
    <input
        {...props}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-sm ${props.className ?? ''}`}
    />
);
