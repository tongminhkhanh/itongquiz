import React from 'react';

interface QuizPlayerLayoutProps {
  mobileNavigation: React.ReactNode;
  sidebarNavigation: React.ReactNode;
  children: React.ReactNode;
}

const QuizPlayerLayout: React.FC<QuizPlayerLayoutProps> = ({
  mobileNavigation,
  sidebarNavigation,
  children,
}) => (
  <main data-testid="quiz-player-main" className="min-h-0 flex-1 bg-slate-50">
    <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-5 sm:py-7 lg:px-8">
      <div data-testid="quiz-mobile-navigation" className="mb-5 lg:hidden">
        {mobileNavigation}
      </div>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <section className="min-w-0 space-y-5">{children}</section>
        <aside data-testid="quiz-sidebar-navigation" className="hidden lg:block">
          {sidebarNavigation}
        </aside>
      </div>
    </div>
  </main>
);

export default QuizPlayerLayout;
