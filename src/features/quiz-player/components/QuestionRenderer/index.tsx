import React from 'react';
import { BaseRendererProps } from './types';
import SmartText from './utils/SmartText';

// Import specialized renderers
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

/**
 * QuestionRenderer Dispatcher Engine
 * Maps question types to their respective specialized components.
 * 
 * Includes the common 'Question Shell' (Index, Content, Image).
 */
const QuestionRenderer: React.FC<BaseRendererProps> = (props) => {
    const { question: q, index } = props;
    const rawType = (q.type || 'MCQ').toString().toUpperCase();
    const normalizedType = rawType.replace(/-/g, '_');

    // DEBUG LOG - Sẽ xóa sau khi tìm ra lỗi
    // Question UI Rendering

    // Dispatcher Mapping
    const renderers: Record<string, React.FC<BaseRendererProps>> = {
        'MCQ': MCQRenderer,
        'MULTIPLE_CHOICE': MCQRenderer,
        'TRUE_FALSE': TrueFalseRenderer,
        'MULTIPLE_SELECT': MultipleSelectRenderer,
        'MATCHING': MatchingRenderer,
        'ORDERING': OrderingRenderer,
        'IMAGE': ImageQuestionRenderer,
        'IMAGE_QUESTION': ImageQuestionRenderer,
        'FILL_IN_THE_BLANK': FillInTheBlankRenderer,
        'DROPDOWN': FillInTheBlankRenderer,
        'DRAG_DROP': FillInTheBlankRenderer,
        'CATEGORIZATION': DragDropRenderer,
        'SHORT_ANSWER': ShortAnswerRenderer,
        'MATH_INPUT': MathRenderer,
        'GEOMETRY': GeometryRenderer,
        'UNDERLINE': UnderlineRenderer,
    };

    const SelectedRenderer = renderers[normalizedType] || 
                            ((q as any).mathType ? MathRenderer : MCQRenderer);

    return (
        <div className="question-renderer-shell bg-white rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-500">
            {/* 1. Question Header (Index & Content) */}
            <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-start gap-4 rounded-t-2xl">
                <span className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm mt-1">
                    {index + 1}
                </span>
                <div className="text-orange-900 font-medium text-lg min-h-[40px] flex items-center py-1">
                    <SmartText 
                        content={(q as any).mainQuestion || (q as any).content || (q as any).question} 
                        className="leading-relaxed" 
                    />
                </div>
            </div>

            {/* 2. Question Body (Image & Interaction) */}
            <div className="p-5 md:p-8 space-y-6">
                {/* Global Question Image Rendering */}
                {q.image && normalizedType !== 'IMAGE' && normalizedType !== 'IMAGE_QUESTION' && (
                    <div className="flex justify-center mb-6">
                        <img 
                            src={q.image} 
                            alt={`Câu ${index + 1}`} 
                            className="max-h-72 rounded-xl border-2 border-gray-100 shadow-sm object-contain"
                        />
                    </div>
                )}

                {/* Specialized Renderer */}
                <SelectedRenderer {...props} />
            </div>
        </div>
    );
};

export default React.memo(QuestionRenderer);
export * from './types';
