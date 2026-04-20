import { useEffect } from 'react';
import { Quiz } from '../types';

const DEFAULT_TITLE = 'ItOng Quiz - Nền tảng tạo đề và ôn thi cho học sinh Tiểu học Ít Ong';
const DEFAULT_DESCRIPTION = 'ItOng Quiz giúp giáo viên tạo đề trắc nghiệm nhanh, hỗ trợ học sinh ôn thi chương trình GDPT 2018.';
const DEFAULT_KEYWORDS = 'Ít Ong, ItOng Quiz, luyện thi tiểu học, trắc nghiệm tiểu học, GDPT 2018, ôn thi online';
const SEO_CATEGORY_WHITELIST = new Set(['all', 'vioedu', 'trang-nguyen', 'ioe', 'on-tap', 'toan', 'tieng-viet']);

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

const getCanonicalUrl = (pathname: string, view: string, selectedQuiz: Quiz | null): string => {
    if (pathname !== '/') {
        return new URL(pathname, `${window.location.origin}/`).toString();
    }

    const canonical = new URL(window.location.origin + '/');

    if (view === 'student' && selectedQuiz?.id) {
        canonical.searchParams.set('quizId', selectedQuiz.id);
        return canonical.toString();
    }

    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    if (category && SEO_CATEGORY_WHITELIST.has(category)) {
        canonical.searchParams.set('category', category);
    }

    return canonical.toString();
};

const buildStructuredData = (canonicalUrl: string, title: string, description: string, selectedQuiz: Quiz | null) => {
    const organization = {
        '@type': 'EducationalOrganization',
        name: 'Trường Tiểu học Ít Ong',
        alternateName: 'ItOng Quiz',
        url: 'https://www.thitong.site',
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

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                name: 'ItOng Quiz',
                url: 'https://www.thitong.site/',
                inLanguage: 'vi',
                description,
            },
            organization,
            {
                '@type': 'WebPage',
                name: title,
                url: canonicalUrl,
                description,
            },
        ],
    };
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
        let title = DEFAULT_TITLE;
        let description = DEFAULT_DESCRIPTION;
        let keywords = DEFAULT_KEYWORDS;
        let robots = 'index, follow';

        if (pathname === '/about') {
            title = 'Giới thiệu trường Ít Ong - ItOng Quiz';
            description = 'Thông tin giới thiệu Trường Tiểu học Ít Ong, quá trình phát triển và hoạt động nổi bật.';
            keywords = 'giới thiệu trường Ít Ong, Trường Tiểu học Ít Ong, ItOng Quiz';
        } else if (pathname === '/contact') {
            title = 'Liên hệ trường Ít Ong - ItOng Quiz';
            description = 'Kênh liên hệ Trường Tiểu học Ít Ong: địa chỉ, hotline, fanpage và bản đồ.';
            keywords = 'liên hệ trường Ít Ong, bản đồ trường Ít Ong, hotline trường Ít Ong';
        } else if (pathname === '/privacy') {
            title = 'Chính sách bảo mật - ItOng Quiz';
        } else if (pathname === '/tos') {
            title = 'Điều khoản sử dụng - ItOng Quiz';
        } else if (view === 'teacher_dash') {
            title = 'Quản lý đề thi - ItOng Quiz';
            robots = 'noindex, nofollow, noarchive';
        } else if (view === 'student' && selectedQuiz) {
            title = `${selectedQuiz.title} - ItOng Quiz`;
            description = `Luyện tập bài thi ${selectedQuiz.title} trên hệ thống ItOng Quiz.`;
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

        const canonicalUrl = getCanonicalUrl(pathname, view, selectedQuiz);
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
