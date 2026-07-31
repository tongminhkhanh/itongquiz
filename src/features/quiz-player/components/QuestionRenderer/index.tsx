import React from 'react';
import { BaseRendererProps } from './types';
import SmartText from './utils/SmartText';

import MCQRenderer from './renderers/MCQRenderer';
import TrueFalseRenderer from './renderers/TrueFalseRenderer';
import MultipleSelectRenderer from './renderers/MultipleSelectRenderer';
import MatchingRenderer from './renderers/MatchingRenderer';
import OrderingRenderer from './renderers/OrderingRenderer';
import ImageQuestionRenderer from './renderers/ImageQuestionRenderer';
import FillInTheBlankRenderer from './renderers/FillInTheBlankRenderer';
import ShortAnswerRenderer from './renderers/ShortAnswerRenderer';
import MathRenderer from './renderers/MathRenderer';
import GeometryRenderer from './renderers/GeometryRenderer';
import DragDropRenderer from './renderers/DragDropRenderer';
import UnderlineRenderer from './renderers/UnderlineRenderer';

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: 'Trắc nghiệm một đáp án',
  MULTIPLE_CHOICE: 'Trắc nghiệm một đáp án',
  TRUE_FALSE: 'Đúng / Sai',
  MULTIPLE_SELECT: 'Trắc nghiệm nhiều đáp án',
  MATCHING: 'Nối cặp',
  ORDERING: 'Sắp xếp thứ tự',
  IMAGE: 'Câu hỏi hình ảnh',
  IMAGE_QUESTION: 'Câu hỏi hình ảnh',
  FILL_IN_THE_BLANK: 'Điền vào chỗ trống',
  DROPDOWN: 'Điền vào chỗ trống',
  DRAG_DROP: 'Điền vào chỗ trống',
  CATEGORIZATION: 'Phân loại',
  SHORT_ANSWER: 'Trả lời ngắn',
  MATH_INPUT: 'Nhập đáp án toán',
  GEOMETRY: 'Hình học',
  UNDERLINE: 'Gạch chân',
};

const QuestionRenderer: React.FC<BaseRendererProps> = (props) => {
  const { question: question, index, quizId } = props;
  const rawType = (question.type || 'MCQ').toString().toUpperCase();
  const normalizedType = rawType.replace(/-/g, '_');
  const questionTypeLabel = QUESTION_TYPE_LABELS[normalizedType] || 'Câu hỏi';

  const renderers: Record<string, React.FC<BaseRendererProps>> = {
    MCQ: MCQRenderer,
    MULTIPLE_CHOICE: MCQRenderer,
    TRUE_FALSE: TrueFalseRenderer,
    MULTIPLE_SELECT: MultipleSelectRenderer,
    MATCHING: MatchingRenderer,
    ORDERING: OrderingRenderer,
    IMAGE: ImageQuestionRenderer,
    IMAGE_QUESTION: ImageQuestionRenderer,
    FILL_IN_THE_BLANK: FillInTheBlankRenderer,
    DROPDOWN: FillInTheBlankRenderer,
    DRAG_DROP: FillInTheBlankRenderer,
    CATEGORIZATION: DragDropRenderer,
    SHORT_ANSWER: ShortAnswerRenderer,
    MATH_INPUT: MathRenderer,
    GEOMETRY: GeometryRenderer,
    UNDERLINE: UnderlineRenderer,
  };

  const SelectedRenderer = renderers[normalizedType]
    || ((question as any).mathType ? MathRenderer : MCQRenderer);

  return (
    <section
      className="question-renderer-shell overflow-hidden rounded-3xl border border-transparent bg-white shadow-sm"
      data-testid="question-card"
      data-math-quiz-id={quizId || ''}
      data-math-question-id={question.id}
      data-math-question-type={normalizedType}
      data-math-format-version={(question as any).mathFormatVersion || (question as any).math_format_version || 1}
    >
      <div
        className="m-3 rounded-2xl bg-gradient-to-br from-sky-50 via-white to-teal-50 px-5 py-5 sm:m-4 sm:px-6 sm:py-6"
        data-testid="question-prompt"
      >
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
          <span className="uppercase tracking-wide text-sky-700">
            Câu {index + 1}
          </span>
          <span className="text-slate-500">{questionTypeLabel}</span>
        </div>
        <h2 className="text-slate-900">
          <SmartText
            content={(question as any).mainQuestion || (question as any).content || (question as any).question}
            className="text-base font-semibold leading-relaxed sm:text-lg"
          />
        </h2>
      </div>

      <div className="space-y-6 p-5 pt-2 sm:p-7 sm:pt-3">
        {question.image && normalizedType !== 'IMAGE' && normalizedType !== 'IMAGE_QUESTION' ? (
          <div className="mb-6 flex justify-center">
            <img
              src={question.image}
              alt={`Câu ${index + 1}`}
              className="max-h-72 rounded-[10px] border border-slate-200 object-contain"
            />
          </div>
        ) : null}

        <SelectedRenderer {...props} />
      </div>
    </section>
  );
};

export default React.memo(QuestionRenderer);
export * from './types';
