import React from 'react';
import { Check } from 'lucide-react';
import { BaseRendererProps } from '../types';
import MathSpan from '../atoms/MathSpan';
import SelectableChoice from '../atoms/SelectableChoice';

const MCQRenderer: React.FC<BaseRendererProps> = ({
  question: question,
  answers,
  onAnswerChange,
}) => {
  const rawOptions = (question as any).options ?? [];
  const isGrouped = Array.isArray(rawOptions[0]) && rawOptions.length > 0;

  if (isGrouped) {
    return (
      <div className="space-y-7">
        {(rawOptions as any[]).map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            {rawOptions.length > 1 ? (
              <p className="text-sm font-semibold text-slate-500">Nhóm {groupIndex + 1}</p>
            ) : null}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {group.map((option: string, optionIndex: number) => {
                const label = String.fromCharCode(65 + optionIndex);
                const answerKey = question.id;
                const isSelected = answers[answerKey] === `${groupIndex}-${label}`;

                return (
                  <SelectableChoice
                    key={optionIndex}
                    selected={isSelected}
                    onClick={() => onAnswerChange(answerKey, `${groupIndex}-${label}`)}
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
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {rawOptions.map((option: unknown, index: number) => {
        const label = String.fromCharCode(65 + index);
        const isSelected = answers[question.id] === label;

        return (
          <SelectableChoice
            key={index}
            selected={isSelected}
            onClick={() => onAnswerChange(question.id, label)}
            className="flex min-h-16 items-center rounded-2xl p-4 text-left"
          >
            <span className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 group-aria-pressed:bg-emerald-500 group-aria-pressed:text-white">
              {isSelected ? <Check className="h-4 w-4" aria-hidden="true" /> : label}
            </span>
            <div className="min-w-0 flex-1">
              <MathSpan
                content={typeof option === 'string' ? option.replace(/^[A-Za-z][.)]\s*/, '') : String(option)}
                className="block overflow-hidden text-ellipsis font-medium leading-relaxed text-slate-800"
              />
            </div>
          </SelectableChoice>
        );
      })}
    </div>
  );
};

export default React.memo(MCQRenderer);
