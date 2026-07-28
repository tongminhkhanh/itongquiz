import { useEffect } from 'react';
import { Quiz } from '../types';
import { buildPublicStructuredData, getPublicPageMetadata, SITE_ORIGIN } from '../seo/publicPageMetadata';

// SEO Utility Functions
const upsertMetaByName = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
};

const upsertMetaByProperty = (property: string, content: string) => {
    let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
};

const upsertCanonical = (href: string) => {
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', href);
};

const upsertJsonLd = (id: string, payload: Record<string, unknown>) => {
    let tag = document.getElementById(id) as HTMLScriptElement | null;
    if (!tag) {
        tag = document.createElement('script');
        tag.id = id;
        tag.type = 'application/ld+json';
        document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify(payload);
};

const getCanonicalUrl = (pathname: string): string => new URL(pathname, `${SITE_ORIGIN}/`).toString();

const buildStructuredData = (canonicalUrl: string, title: string, description: string, selectedQuiz: Quiz | null) => {
    const organization = {
        '@type': 'EducationalOrganization',
        name: 'Trường Tiểu học Ít Ong',
        alternateName: 'ItOng Quiz',
        url: SITE_ORIGIN,
    };

    if (selectedQuiz) {
        return {
            '@context': 'https://schema.org',
            '@type': 'Quiz',
            name: selectedQuiz.title,
            description,
            url: canonicalUrl,
            educationalLevel: selectedQuiz.classLevel ? `Lớp ${selectedQuiz.classLevel}` : 'Tiểu học',
            about: selectedQuiz.category || 'Trắc nghiệm',
            inLanguage: 'vi',
            isAccessibleForFree: true,
            numberOfQuestions: selectedQuiz.questions?.length || 0,
            publisher: organization,
        };
    }

    return buildPublicStructuredData(canonicalUrl, { title, description, heading: title });
};

/**
 * Custom hook to manage SEO metadata and titles.
 */
export const useSeo = (
    pathname: string,
    view: string,
    selectedQuiz: Quiz | null,
    isGiftShopFeatureEnabled: boolean
) => {
    useEffect(() => {
        const publicMetadata = getPublicPageMetadata(pathname);
        let { title, description, keywords } = publicMetadata;
        let robots = 'index, follow';

        if (view === 'teacher_dash') {
            title = 'Quản lý đề thi - ItOng Quiz';
            robots = 'noindex, nofollow, noarchive';
        } else if (view === 'student' && selectedQuiz) {
            title = `${selectedQuiz.title} - ItOng Quiz`;
            description = `Luyện tập bài thi ${selectedQuiz.title} trên hệ thống ItOng Quiz.`;
            robots = 'noindex, nofollow, noarchive';
            keywords = [
                selectedQuiz.title,
                `Lớp ${selectedQuiz.classLevel || 'Tiểu học'}`,
                selectedQuiz.category || 'trắc nghiệm',
                'ItOng Quiz',
                'ôn thi tiểu học',
            ].join(', ');
        } else if (view === 'student_portal') {
            title = 'Cổng học sinh - ItOng Quiz';
            robots = 'noindex, nofollow, noarchive';
        } else if (view === 'shop' && isGiftShopFeatureEnabled) {
            title = 'Tiệm Tạp Hóa Ít Ong - ItOng Quiz';
            description = 'Đổi quà bằng xu và quản lý voucher trong hệ thống ItOng Quiz.';
            robots = 'noindex, nofollow, noarchive';
        }

        const canonicalUrl = getCanonicalUrl(pathname);
        const structuredData = buildStructuredData(
            canonicalUrl,
            title,
            description,
            pathname === '/' && view === 'student' ? selectedQuiz : null
        );

        document.title = title;

        upsertMetaByName('description', description);
        upsertMetaByName('keywords', keywords);
        upsertMetaByName('robots', robots);

        upsertMetaByProperty('og:title', title);
        upsertMetaByProperty('og:description', description);
        upsertMetaByProperty('og:url', canonicalUrl);
        upsertMetaByProperty('twitter:title', title);
        upsertMetaByProperty('twitter:description', description);
        upsertMetaByProperty('twitter:url', canonicalUrl);

        upsertMetaByName('twitter:title', title);
        upsertMetaByName('twitter:description', description);

        upsertCanonical(canonicalUrl);
        upsertJsonLd('seo-jsonld', structuredData);
    }, [
        pathname,
        view,
        selectedQuiz?.id,
        selectedQuiz?.title,
        selectedQuiz?.classLevel,
        selectedQuiz?.category,
        selectedQuiz?.questions?.length,
        isGiftShopFeatureEnabled,
    ]);
};
