import React, { useEffect, useRef, useState } from 'react';
import MathSpan from './MathSpan';
import { hasMathSyntax } from '../../../../../utils/mathText';

interface LatexDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const LatexDropdown: React.FC<LatexDropdownProps> = React.memo(({
  options,
  value,
  onChange,
  placeholder = '-- Chọn --',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasLatex = options.some(hasMathSyntax);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!hasLatex) {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mx-1 cursor-pointer rounded-[8px] border px-2 py-1 font-medium transition-colors ${
          value
            ? 'border-sky-500 bg-sky-50 text-sky-700'
            : 'border-slate-300 bg-white text-slate-600 hover:border-sky-300'
        } ${className}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option, index) => (
          <option key={index} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative mx-1 inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`inline-flex min-w-[70px] cursor-pointer items-center gap-1.5 rounded-[8px] border px-2 py-1 font-medium transition-colors ${
          value
            ? 'border-sky-500 bg-sky-50 text-sky-700'
            : 'border-slate-300 bg-white text-slate-600 hover:border-sky-300'
        }`}
      >
        {value ? (
          <MathSpan content={value} className="flex-1 text-left" />
        ) : (
          <span className="flex-1 text-left text-slate-400">{placeholder}</span>
        )}
        <span aria-hidden="true" className="text-xs text-slate-400">⌄</span>
      </button>

      {isOpen ? (
        <div
          role="listbox"
          className="absolute left-0 z-[100] mt-1 max-h-60 w-max min-w-full overflow-y-auto rounded-[10px] border border-slate-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-slate-50"
          >
            {placeholder}
          </button>
          {options.map((option, index) => (
            <button
              key={index}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                option === value
                  ? 'bg-sky-50 font-semibold text-sky-700'
                  : 'text-slate-800 hover:bg-slate-50'
              }`}
            >
              <MathSpan content={option} className="flex-1 text-sm md:text-base" />
              {option === value ? <span className="text-xs">Đã chọn</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});

export default LatexDropdown;
