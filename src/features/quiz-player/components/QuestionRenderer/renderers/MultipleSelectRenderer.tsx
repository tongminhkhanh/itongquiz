import React from 'react';
import { Check } from 'lucide-react';
import { BaseRendererProps } from '../types';
import MathSpan from '../atoms/MathSpan';
import SelectableChoice from '../atoms/SelectableChoice';

const MultipleSelectRenderer: React.FC<BaseRendererProps> = ({
  question: question,
  answers,
  onAnswerChange,
}) => {
  const options = (question as any).options ?? [];

  return (
    <div className="grid grid-cols-1 gap-3">
      {options.map((option: unknown, index: number) => {
        const label = String.fromCharCode(65 + index);
        const currentAnswers = (answers[question.id] as string[]) || [];
        const isSelected = currentAnswers.includes(label);

        return (
          <SelectableChoice
            key={index}
            selected={isSelected}
            onClick={() => {
              const newAnswers = isSelected
                ? currentAnswers.filter((answer) => answer !== label)
                : [...currentAnswers, label].sort();
              onAnswerChange(question.id, newAnswers);
            }}
            className="flex min-h-14 items-center rounded-2xl p-3 text-left"
          >
            <span className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 group-aria-pressed:bg-emerald-500 group-aria-pressed:text-white">
              {isSelected ? <Check className="h-4 w-4" aria-hidden="true" /> : label}
            </span>
            <MathSpan
              content={typeof option === 'string' ? option.replace(/^[A-Za-z][.)]\s*/, '') : String(option)}
              className="flex-1"
            />
          </SelectableChoice>
        );
      })}
    </div>
  );
};

export default React.memo(MultipleSelectRenderer);
