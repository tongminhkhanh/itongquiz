import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import InteractiveMathText, { getInteractiveBlankIds } from '../src/features/quiz-player/components/QuestionRenderer/atoms/InteractiveMathText';
import FillInTheBlankRenderer from '../src/features/quiz-player/components/QuestionRenderer/renderers/FillInTheBlankRenderer';

vi.mock('better-react-mathjax', () => ({
  MathJax: ({ children }: { children: React.ReactNode }) => <span data-testid="mathjax">{children}</span>,
  MathJaxContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

beforeAll(() => {
  Object.defineProperty(window, 'MathJax', {
    configurable: true,
    value: { typesetPromise: vi.fn(() => Promise.resolve()) },
  });
});

describe('InteractiveMathText', () => {
  it('renders a blank inside a fraction numerator without splitting invalid TeX fragments', () => {
    render(
      <InteractiveMathText
        content={'Điền $\\frac{[1]}{8}$'}
        renderBlank={(id) => <input aria-label={`blank-${id}`} />}
      />,
    );

    expect(screen.getByLabelText('blank-1')).toBeInTheDocument();
    const fraction = screen.getByTestId('interactive-fraction');
    expect(fraction).toContainElement(screen.getByLabelText('blank-1'));
    expect(screen.queryByText('$\\frac{')).not.toBeInTheDocument();
  });

  it('renders top-level blanks inside one long math block while keeping surrounding formulas typeset', () => {
    render(
      <InteractiveMathText
        content={'$\\frac{1}{8}, [1], \\frac{5}{8}, [2]$'}
        renderBlank={(id) => <input aria-label={`blank-${id}`} />}
      />,
    );

    expect(screen.getByLabelText('blank-1')).toBeInTheDocument();
    expect(screen.getByLabelText('blank-2')).toBeInTheDocument();
    expect(screen.getAllByTestId('mathjax').length).toBeGreaterThan(0);
  });

  it('assigns stable sequential ids to answer-bearing legacy placeholders', () => {
    render(
      <InteractiveMathText
        content={'Thứ tự: [$\\frac{2}{5}$], [$\\frac{3}{5}$]'}
        renderBlank={(id) => <input aria-label={`blank-${id}`} />}
      />,
    );

    expect(screen.getByLabelText('blank-0')).toBeInTheDocument();
    expect(screen.getByLabelText('blank-1')).toBeInTheDocument();
  });

  it('preserves named dropdown ids so each select uses its own saved blank', () => {
    const content = 'Lá xanh [select1]. Biện pháp [select2] và [select3].';

    expect(getInteractiveBlankIds(content)).toEqual(['select1', 'select2', 'select3']);

    render(
      <InteractiveMathText
        content={content}
        renderBlank={(id) => <input aria-label={`blank-${id}`} />}
      />,
    );

    expect(screen.getByLabelText('blank-select1')).toBeInTheDocument();
    expect(screen.getByLabelText('blank-select2')).toBeInTheDocument();
    expect(screen.getByLabelText('blank-select3')).toBeInTheDocument();
  });

  it('maps every named dropdown to the matching saved options and answer key', () => {
    const onAnswerChange = vi.fn();
    render(
      <FillInTheBlankRenderer
        question={{
          id: 'dropdown-1',
          type: 'DROPDOWN',
          question: 'Chọn đáp án',
          text: 'Lá xanh [select1]. Biện pháp [select2] và [select3].',
          blanks: [
            { id: 'select1', correctAnswer: 'như', options: ['như', 'là', 'hơn'] },
            { id: 'select2', correctAnswer: 'nhân hóa', options: ['nhân hóa', 'so sánh', 'nhân cách'] },
            { id: 'select3', correctAnswer: 'so sánh', options: ['so sánh', 'nhân hóa', 'điệp ngữ'] },
          ],
        } as any}
        index={0}
        answers={{}}
        onAnswerChange={onAnswerChange}
      />,
    );

    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(selects).toHaveLength(3);
    expect(Array.from(selects[0].options).map((option) => option.text)).toEqual(['...', 'như', 'là', 'hơn']);
    expect(Array.from(selects[1].options).map((option) => option.text)).toEqual(['...', 'nhân hóa', 'so sánh', 'nhân cách']);
    expect(Array.from(selects[2].options).map((option) => option.text)).toEqual(['...', 'so sánh', 'nhân hóa', 'điệp ngữ']);

    fireEvent.change(selects[2], { target: { value: 'điệp ngữ' } });
    expect(onAnswerChange).toHaveBeenCalledWith('dropdown-1', 'điệp ngữ', 'select3');
  });

  it('does not treat the optional root index in sqrt as an answer blank', () => {
    render(
      <InteractiveMathText
        content={'Tính \\(\\sqrt[3]{8}\\)'}
        renderBlank={(id) => <input aria-label={`blank-${id}`} />}
      />,
    );

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('mathjax')).toHaveTextContent('\\(\\sqrt[3]{8}\\)');
  });
});
