import React from 'react';

interface QuizPlayerLayoutProps {
  mobileNavigation: React.ReactNode;
  sidebarNavigation: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  children: React.ReactNode;
}

const QuizPlayerLayout: React.FC<QuizPlayerLayoutProps> = ({
  mobileNavigation,
  sidebarNavigation,
  sidebarFooter,
  children,
}) => (
  <main data-testid="quiz-player-main" className="min-h-0 flex-1 bg-slate-50 lg:overflow-hidden">
    <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-5 sm:py-7 lg:h-full lg:px-8">
      <div data-testid="quiz-mobile-navigation" className="mb-5 lg:hidden">
        {mobileNavigation}
      </div>
      <div className="grid gap-7 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-stretch">
        <section
          data-testid="quiz-question-scroll"
          className="min-w-0 space-y-5 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pr-2"
        >
          {children}
        </section>
        <aside
          data-testid="quiz-sidebar-navigation"
          className="hidden lg:flex lg:h-full lg:min-h-0 lg:flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto">{sidebarNavigation}</div>
          {sidebarFooter ? <div className="shrink-0 pt-4">{sidebarFooter}</div> : null}
        </aside>
      </div>
    </div>
  </main>
);

export default QuizPlayerLayout;
