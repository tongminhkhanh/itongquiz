import { Footer } from '../../common';
import CurrentAnnouncementBanner from '../../common/CurrentAnnouncementBanner';
import PasswordChangeDialog from '../../common/PasswordChangeDialog';
import Sidebar from '../Sidebar';
import BottomNavigation from '../BottomNavigation';
import { AccessCodeDialog } from './AccessCodeDialog';
import { TeacherDashboardHeader } from './TeacherDashboardHeader';
import { TeacherDashboardTabContent } from './TeacherDashboardTabContent';
import type { TeacherDashboardLayoutProps } from './types';

export const TeacherDashboardLayout = (props: TeacherDashboardLayoutProps) => (
  <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
    {props.passwordGate && (
      <PasswordChangeDialog
        forced
        authToken={props.passwordGate.token}
        requireCurrentPassword={props.passwordGate.requireCurrentPassword}
        onComplete={props.completePasswordChange}
      />
    )}
    <CurrentAnnouncementBanner role="teacher" />
    <Sidebar
      activeTab={props.activeTab}
      setActiveTab={props.selectTab}
      isGiftShopEnabled={props.giftShopEnabled}
      onLogout={props.onLogout}
      isMobileOpen={props.isMobileMenuOpen}
      setIsMobileOpen={props.setIsMobileMenuOpen}
    />
    <div className="flex min-h-screen min-w-0 w-full flex-1 flex-col pb-20 transition-all duration-300 lg:ml-64 lg:w-[calc(100%-16rem)] lg:flex-none lg:pb-0">
      <TeacherDashboardHeader
        activeTab={props.activeTab}
        setActiveTab={props.setActiveTab}
        searchQuery={props.searchQuery}
        setSearchQuery={props.setSearchQuery}
        onSearchSubmit={props.onSearchSubmit}
        teacherDisplayName={props.displayName}
        teacherInitial={props.teacherInitial}
        isAdmin={props.isAdmin}
        onLogout={props.onLogout}
      />
      <main className="flex-1 p-3 sm:p-5 lg:p-10 overflow-x-hidden">
        <TeacherDashboardTabContent
          activeTab={props.activeTab}
          setActiveTab={props.setActiveTab}
          resultsLoadState={props.resultsLoadState}
          resultsLoadError={props.resultsLoadError}
          loadTeacherResults={props.loadTeacherResults}
          filteredResults={props.filteredResults}
          quizzes={props.quizzes}
          editingQuiz={props.editingQuiz}
          setEditingQuiz={props.setEditingQuiz}
          openAccessCodeEditor={props.openAccessCodeEditor}
          removeQuiz={props.removeQuiz}
          createQuiz={props.createQuiz}
          modifyQuiz={props.modifyQuiz}
          isAdmin={props.isAdmin}
          giftShopEnabled={props.giftShopEnabled}
          username={props.username}
        />
      </main>
      <div className="hidden lg:block">
        <Footer onNavigate={props.onNavigate} showPublicLinks={false} />
      </div>
    </div>
    <BottomNavigation
      activeTab={props.activeTab}
      setActiveTab={props.selectTab}
      onToggleMenu={() => props.setIsMobileMenuOpen(true)}
    />
    <AccessCodeDialog
      editingAccessCode={props.editingAccessCode}
      newAccessCode={props.newAccessCode}
      setNewAccessCode={props.setNewAccessCode}
      onClose={props.closeAccessCodeEditor}
      onSave={props.updateAccessCode}
    />
  </div>
);
