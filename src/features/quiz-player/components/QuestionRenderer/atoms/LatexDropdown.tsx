import React, { useRef, useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import MathSpan from './MathSpan';

interface LatexDropdownProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

/**
 * LatexDropdown: Custom dropdown that renders LaTeX inside each option.
 */
const LatexDropdown: React.FC<LatexDropdownProps> = React.memo(({ 
    options, 
    value, 
    onChange, 
    placeholder = '-- Chọn --', 
    className = '' 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const hasLatex = options.some(opt => /\$[^$]+\$/.test(opt));

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // If no LaTeX in options, use native <select> for better UX
    if (!hasLatex) {
        return (
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`mx-1 px-2 py-0.5 border-2 rounded-md font-medium transition-all cursor-pointer ${value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-indigo-300'
                    } ${className}`}
            >
                <option value="">{placeholder}</option>
                {options.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }

    return (
        <div ref={dropdownRef} className={`inline-block relative mx-1 ${className}`}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 border-2 rounded-md font-medium transition-all cursor-pointer min-w-[70px] ${value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-indigo-300'
                    }`}
            >
                {value ? (
                    <MathSpan content={value} className="flex-1 text-left" />
                ) : (
                    <span className="flex-1 text-left text-gray-400">{placeholder}</span>
                )}
                <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Options popover */}
            {isOpen && (
                <div className="absolute z-[100] mt-1 left-0 min-w-full w-max bg-white border-2 border-indigo-200 rounded-xl shadow-xl py-1 max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95">
                    {/* Empty/reset option */}
                    <button
                        type="button"
                        onClick={() => { onChange(''); setIsOpen(false); }}
                        className="w-full text-left px-3 py-2 text-gray-400 hover:bg-gray-50 transition-colors text-sm"
                    >
                        {placeholder}
                    </button>
                    {options.map((opt, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                            className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${opt === value
                                ? 'bg-indigo-50 text-indigo-700 font-bold'
                                : 'hover:bg-indigo-50/50 text-gray-700'
                                }`}
                        >
                            {opt === value && (
                                <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            )}
                            <MathSpan content={opt} className="flex-1 text-sm md:text-base" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});

export default LatexDropdown;
