import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSeo } from '../src/hooks/useSeo';
import { PUBLIC_PAGE_METADATA, SITE_ORIGIN } from '../src/seo/publicPageMetadata';

const SeoProbe: React.FC<{ pathname: string }> = ({ pathname }) => {
    useSeo(pathname, 'home', null, false);
    return null;
};

describe('useSeo public metadata', () => {
    it('uses the same canonical metadata source as the prerendered public page', () => {
        render(<SeoProbe pathname="/contact" />);

        expect(document.title).toBe(PUBLIC_PAGE_METADATA['/contact'].title);
        expect(document.querySelector('meta[name="description"]')?.getAttribute('content'))
            .toBe(PUBLIC_PAGE_METADATA['/contact'].description);
        expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href'))
            .toBe(`${SITE_ORIGIN}/contact`);
    });

    it('canonicalizes query-driven SPA states to the public route and marks quizzes noindex', () => {
        const selectedQuiz = {
            id: 'quiz-1',
            title: 'Bài luyện tập riêng',
            classLevel: '4',
            category: 'toan',
            questions: [],
        } as never;
        const QuizProbe = () => {
            useSeo('/', 'student', selectedQuiz, false);
            return null;
        };

        render(<QuizProbe />);

        expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_ORIGIN}/`);
        expect(document.querySelector('meta[name="robots"]')?.getAttribute('content'))
            .toBe('noindex, nofollow, noarchive');
    });
});
