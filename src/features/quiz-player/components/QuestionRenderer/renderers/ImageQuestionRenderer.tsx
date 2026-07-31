import React from 'react';
import { Check } from 'lucide-react';
import { BaseRendererProps } from '../types';
import MathSpan from '../atoms/MathSpan';
import SelectableChoice from '../atoms/SelectableChoice';

const ImageQuestionRenderer: React.FC<BaseRendererProps> = ({
  question: question,
  answers,
  onAnswerChange,
}) => {
  const optionImages: string[] = (question as any).optionImages || [];
  const hasOptionImages = optionImages.some((image: string) => image && image.trim());
  const options = (question as any).options || [];

  return (
    <div className="space-y-4">
      {hasOptionImages ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((option: string, index: number) => {
            const label = String.fromCharCode(65 + index);
            const isSelected = answers[question.id] === label;
            const imageUrl = optionImages[index];

            return (
              <SelectableChoice
                key={index}
                selected={isSelected}
                onClick={() => onAnswerChange(question.id, label)}
                className="relative flex flex-col overflow-hidden rounded-2xl text-left"
              >
                <span className="absolute left-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-sm font-bold text-slate-600 shadow-sm group-aria-pressed:bg-emerald-500 group-aria-pressed:text-white">
                  {isSelected ? <Check className="h-4 w-4" aria-hidden="true" /> : label}
                </span>

                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={`Đáp án ${label}`}
                    className="h-40 w-full bg-slate-50 object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}

                {option && option.trim() ? (
                  <div className={`w-full flex-1 p-3 ${imageUrl ? 'bg-white/80' : 'pt-10'}`}>
                    <MathSpan content={option} className="text-sm font-medium text-slate-800" />
                  </div>
                ) : null}
              </SelectableChoice>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {options.map((option: string, index: number) => {
            const label = String.fromCharCode(65 + index);
            const isSelected = answers[question.id] === label;

            return (
              <SelectableChoice
                key={index}
                selected={isSelected}
                onClick={() => onAnswerChange(question.id, label)}
                className="flex min-h-14 items-center rounded-2xl p-3 text-left"
              >
                <span className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 group-aria-pressed:bg-emerald-500 group-aria-pressed:text-white">
                  {isSelected ? <Check className="h-4 w-4" aria-hidden="true" /> : label}
                </span>
                <MathSpan content={option} className="flex-1" />
              </SelectableChoice>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default React.memo(ImageQuestionRenderer);
