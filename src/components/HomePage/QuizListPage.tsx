import React from 'react';
import { Search, Clock, ChevronRight, ArrowLeft, Lock } from 'lucide-react';

// --- Fluent Emoji CDN Base ---
const FLUENT_CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets';

// --- Subject Config (imported from HomePage) ---
const SUBJECT_CONFIG: Record<string, {
    label: string;
    title: string;
    desc: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
    btnColor: string;
    btnBorder: string;
    btnText: string;
    btnLabel: string;
    highlight?: boolean;
}> = {
    'class': {
        label: 'Bài Tập',
        title: 'Bài Tập Lớp',
        desc: 'Bài tập được giao từ thầy cô.',
        icon: `${FLUENT_CDN}/Books/3D/books_3d.png`,
        color: '#3B82F6',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        btnColor: 'bg-blue-500 hover:bg-blue-400',
        btnBorder: 'border-blue-700',
        btnText: 'text-white',
        btnLabel: 'Bắt đầu',
    },
    'ioe': {
        label: 'Tiếng Anh',
        title: 'English Fun',
        desc: 'Hello! How are you?',
        icon: `${FLUENT_CDN}/Speech%20balloon/3D/speech_balloon_3d.png`,
        color: '#F59E0B',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        btnColor: 'bg-yellow-400 hover:bg-yellow-300',
        btnBorder: 'border-yellow-600',
        btnText: 'text-yellow-900',
        btnLabel: 'Start Now',
    },
    'vioedu': {
        label: 'Toán Học',
        title: 'Toán Thông Minh',
        desc: 'Cộng trừ nhân chia thật dễ!',
        icon: `${FLUENT_CDN}/Abacus/3D/abacus_3d.png`,
        color: '#3B82F6',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        btnColor: 'bg-blue-500 hover:bg-blue-400',
        btnBorder: 'border-blue-700',
        btnText: 'text-white',
        btnLabel: 'Bắt đầu',
    },
    'trang-nguyen': {
        label: 'Tiếng Việt',
        title: 'Vua Tiếng Việt',
        desc: 'Ghép chữ, đoán từ, kể chuyện.',
        icon: `${FLUENT_CDN}/Pencil/3D/pencil_3d.png`,
        color: '#EC4899',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        btnColor: 'bg-pink-500 hover:bg-pink-400',
        btnBorder: 'border-pink-700',
        btnText: 'text-white',
        btnLabel: 'Bắt đầu',
        highlight: true,
    },
    'science': {
        label: 'Khoa Học',
        title: 'Nhà Khoa Học',
        desc: 'Thí nghiệm và khám phá.',
        icon: `${FLUENT_CDN}/Test%20tube/3D/test_tube_3d.png`,
        color: '#10B981',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        btnColor: 'bg-green-500 hover:bg-green-400',
        btnBorder: 'border-green-700',
        btnText: 'text-white',
        btnLabel: 'Bắt đầu',
    },
    'history': {
        label: 'Lịch Sử',
        title: 'Sử Việt Hào Hùng',
        desc: 'Danh nhân và sự kiện.',
        icon: `${FLUENT_CDN}/Scroll/3D/scroll_3d.png`,
        color: '#F97316',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        btnColor: 'bg-orange-500 hover:bg-orange-400',
        btnBorder: 'border-orange-700',
        btnText: 'text-white',
        btnLabel: 'Bắt đầu',
    },
};

// --- Grade Config ---
const GRADE_LEVELS = [
    { id: 'all', label: 'Tất cả' },
    { id: '1', label: 'Lớp 1' },
    { id: '2', label: 'Lớp 2' },
    { id: '3', label: 'Lớp 3' },
    { id: '4', label: 'Lớp 4' },
    { id: '5', label: 'Lớp 5' },
];

// --- Types ---
interface Quiz {
    id: string;
    title: string;
    category?: string;
    timeLimit: number;
    questions: any[];
    requireCode?: boolean;
}

interface Props {
    category: string;
    quizzes: Quiz[];
    onBack: () => void;
    onQuizClick: (quiz: Quiz) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    selectedGrade: string | null;
    onGradeChange: (grade: string | null) => void;
}

const QuizListPage: React.FC<Props> = ({
    category,
    quizzes,
    onBack,
    onQuizClick,
    searchTerm,
    onSearchChange,
    selectedGrade,
    onGradeChange,
}) => {
    const categoryConfig = SUBJECT_CONFIG[category] || SUBJECT_CONFIG['class'];

    return (
        <div className="quiz-list-page">
            {/* Decorative Elements */}
            <img
                src={`${FLUENT_CDN}/Sun/3D/sun_3d.png`}
                alt=""
                className="quiz-list-deco quiz-list-deco--sun"
            />
            <img
                src={`${FLUENT_CDN}/Cloud/3D/cloud_3d.png`}
                alt=""
                className="quiz-list-deco quiz-list-deco--cloud-1"
            />
            <img
                src={`${FLUENT_CDN}/Cloud/3D/cloud_3d.png`}
                alt=""
                className="quiz-list-deco quiz-list-deco--cloud-2"
            />

            {/* Main Container */}
            <div className="quiz-list-container">
                {/* Breadcrumb */}
                <div className="quiz-list-breadcrumb">
                    <button onClick={onBack} className="quiz-list-breadcrumb__home">
                        🏠 Home
                    </button>
                    <span className="quiz-list-breadcrumb__separator">&gt;</span>
                    <span className="quiz-list-breadcrumb__current">{categoryConfig.label}</span>
                </div>

                {/* Header */}
                <header className="quiz-list-header">
                    <div className="quiz-list-header__content">
                        <img
                            src={categoryConfig.icon}
                            alt=""
                            className="quiz-list-header__icon"
                        />
                        <div className="quiz-list-header__text">
                            <h1 className="quiz-list-header__title">{categoryConfig.title}</h1>
                            <p className="quiz-list-header__desc">{categoryConfig.desc}</p>
                        </div>
                    </div>

                </header>

                {/* Search Bar */}
                <div className="quiz-list-search">
                    <Search className="quiz-list-search__icon" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Tìm bài ôn tập..."
                        className="quiz-list-search__input"
                    />
                </div>

                {/* Grade Filter */}
                <div className="quiz-list-grade-filter">
                    {GRADE_LEVELS.map((grade) => (
                        <button
                            key={grade.id}
                            onClick={() => onGradeChange(grade.id === 'all' ? null : grade.id)}
                            className={`quiz-list-grade-pill ${(grade.id === 'all' && !selectedGrade) || selectedGrade === grade.id
                                ? 'quiz-list-grade-pill--active'
                                : ''
                                }`}
                            style={{
                                ...(((grade.id === 'all' && !selectedGrade) || selectedGrade === grade.id) && {
                                    background: categoryConfig.color,
                                    color: '#ffffff',
                                    borderColor: categoryConfig.color,
                                }),
                            }}
                        >
                            {grade.label}
                        </button>
                    ))}
                </div>

                {/* Quiz Grid */}
                <div className="quiz-list-grid">
                    {quizzes.length > 0 ? (
                        quizzes.map((quiz) => {
                            const quizCategory = quiz.category || 'class';
                            const quizConfig = SUBJECT_CONFIG[quizCategory] || categoryConfig;
                            return (
                                <button
                                    key={quiz.id}
                                    onClick={() => onQuizClick(quiz)}
                                    className="quiz-list-card"
                                >
                                    {/* Top Stripe */}
                                    <div
                                        className="quiz-list-card__stripe"
                                        style={{ background: quizConfig.color }}
                                    />

                                    {/* Header with Icon */}
                                    <div className="quiz-list-card__header">
                                        <img
                                            src={quizConfig.icon}
                                            alt=""
                                            className="quiz-list-card__icon"
                                        />
                                        {quiz.requireCode && (
                                            <Lock className="quiz-list-card__lock" />
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h3 className="quiz-list-card__title">{quiz.title}</h3>

                                    {/* Metadata */}
                                    <div className="quiz-list-card__meta">
                                        <span>
                                            <Clock className="w-3.5 h-3.5" /> {quiz.timeLimit} phút
                                        </span>
                                        <span>📝 {quiz.questions.length} câu</span>
                                    </div>

                                    {/* CTA */}
                                    <div
                                        className="quiz-list-card__cta"
                                        style={{ color: quizConfig.color }}
                                    >
                                        Bắt đầu <ChevronRight className="w-4 h-4" />
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        <div className="quiz-list-empty">
                            <img
                                src={`${FLUENT_CDN}/See-no-evil%20monkey/3D/see-no-evil_monkey_3d.png`}
                                alt=""
                                className="quiz-list-empty__img"
                            />
                            <h3 className="quiz-list-empty__title">Không tìm thấy bài nào!</h3>
                            <p className="quiz-list-empty__text">Thử tìm từ khóa khác xem sao?</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizListPage;
