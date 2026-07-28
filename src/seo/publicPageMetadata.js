export const SITE_ORIGIN = 'https://www.thitong.site';

export const PUBLIC_PAGE_METADATA = Object.freeze({
    '/': {
        title: 'ItOng Quiz - Nền tảng tạo đề và ôn thi cho học sinh Tiểu học Ít Ong',
        description: 'ItOng Quiz giúp giáo viên tạo đề trắc nghiệm nhanh, hỗ trợ học sinh ôn thi chương trình GDPT 2018.',
        keywords: 'Ít Ong, ItOng Quiz, luyện thi tiểu học, trắc nghiệm tiểu học, GDPT 2018, ôn thi online',
        heading: 'ItOng Quiz',
        summary: 'Nền tảng giao bài, luyện tập và theo dõi tiến bộ dành cho Trường Tiểu học Ít Ong.',
    },
    '/about': {
        title: 'Giới thiệu iTongQuiz - Trường Tiểu học Ít Ong',
        description: 'Khám phá iTongQuiz, nền tảng giao bài, luyện tập và theo dõi tiến bộ dành cho giáo viên và học sinh Trường Tiểu học Ít Ong.',
        keywords: 'giới thiệu iTongQuiz, Trường Tiểu học Ít Ong, nền tảng học tập tiểu học',
        heading: 'Giới thiệu iTongQuiz',
        summary: 'Một không gian học tập trực tuyến an toàn, đơn giản và gần gũi cho giáo viên, học sinh và phụ huynh.',
    },
    '/contact': {
        title: 'Liên hệ hỗ trợ - iTongQuiz',
        description: 'Liên hệ hỗ trợ iTongQuiz qua email, website và biểu mẫu tạo sẵn nội dung dành cho giáo viên, học sinh và phụ huynh.',
        keywords: 'liên hệ iTongQuiz, hỗ trợ tài khoản iTongQuiz, Trường Tiểu học Ít Ong',
        heading: 'Liên hệ iTongQuiz',
        summary: 'Gửi yêu cầu hỗ trợ về tài khoản, bài học hoặc phản hồi để nhà trường hỗ trợ kịp thời.',
    },
    '/privacy': {
        title: 'Chính sách bảo mật - ItOng Quiz',
        description: 'Tìm hiểu cách iTongQuiz bảo vệ thông tin và dữ liệu học tập của giáo viên, học sinh và phụ huynh.',
        keywords: 'chính sách bảo mật, iTongQuiz, Trường Tiểu học Ít Ong',
        heading: 'Chính sách bảo mật',
        summary: 'Thông tin về cách thu thập, sử dụng và bảo vệ dữ liệu trên iTongQuiz.',
    },
    '/tos': {
        title: 'Điều khoản sử dụng - ItOng Quiz',
        description: 'Điều khoản sử dụng iTongQuiz dành cho giáo viên, học sinh và phụ huynh Trường Tiểu học Ít Ong.',
        keywords: 'điều khoản sử dụng, iTongQuiz, Trường Tiểu học Ít Ong',
        heading: 'Điều khoản sử dụng',
        summary: 'Các nguyên tắc sử dụng nền tảng học tập iTongQuiz an toàn và hiệu quả.',
    },
});

export const getPublicPageMetadata = (pathname) => PUBLIC_PAGE_METADATA[pathname] || PUBLIC_PAGE_METADATA['/'];

export const buildPublicStructuredData = (canonicalUrl, metadata) => {
    const pathname = new URL(canonicalUrl).pathname;
    const pageType = pathname === '/about'
        ? 'AboutPage'
        : pathname === '/contact'
            ? 'ContactPage'
            : 'WebPage';
    const graph = [
        {
            '@type': 'WebSite',
            name: 'ItOng Quiz',
            url: `${SITE_ORIGIN}/`,
            inLanguage: 'vi',
            description: PUBLIC_PAGE_METADATA['/'].description,
        },
        {
            '@type': 'EducationalOrganization',
            name: 'Trường Tiểu học Ít Ong',
            alternateName: 'ItOng Quiz',
            url: SITE_ORIGIN,
        },
        {
            '@type': pageType,
            name: metadata.title,
            url: canonicalUrl,
            description: metadata.description,
            inLanguage: 'vi',
        },
    ];

    if (pathname !== '/') {
        graph.push({
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${SITE_ORIGIN}/` },
                { '@type': 'ListItem', position: 2, name: metadata.heading, item: canonicalUrl },
            ],
        });
    }

    return { '@context': 'https://schema.org', '@graph': graph };
};
