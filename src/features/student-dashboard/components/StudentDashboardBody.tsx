import { StudentHomeworkSection } from '@/src/features/homework/components/StudentHomeworkSection';
import {
  AssignedWorkSection, LearningProgressPanel, RewardSidebar, StudentDashboardHero,
  SubjectPracticeGrid, WeeklyQuestsPanel,
} from '@/src/components/HomePage/student-dashboard';
import type { StudentDashboardContentProps } from './content.types';

export const StudentDashboardBody = ({
  studentSession, assignments, attendance, practice, rewards,
  giftShopEnabled, onOpenGiftShop, onOpenBadges, onSelectHomework,
}: StudentDashboardContentProps) => (
  <div className="flex flex-col gap-7 md:gap-10">
    <StudentDashboardHero
      firstName={studentSession.fullName.split(' ').pop() || studentSession.fullName}
      hasReadyAssignment={assignments.hasReadyAssignment}
      attendanceClaimed={attendance.claimedToday}
      attendanceLabel={attendance.badgeText}
      attendanceAvailable={attendance.isAvailable}
      onPrimaryAction={assignments.scrollToPrimaryTarget}
      onAttendance={attendance.open}
    />
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] xl:items-start">
      <div data-testid="student-dashboard-main-column" className="min-w-0 space-y-8">
        <AssignedWorkSection
          quizzes={assignments.pagedQuizzes}
          isLoading={assignments.isLoading}
          errorMessage={assignments.errorMessage}
          page={assignments.page}
          totalPages={assignments.totalPages}
          onRetry={() => void assignments.retry()}
          onPageChange={assignments.setPage}
          onStartQuiz={assignments.startQuiz}
        />
        <StudentHomeworkSection studentId={studentSession.studentId}
          classId={studentSession.classId} onSelectAssignment={onSelectHomework} />
        <WeeklyQuestsPanel
          quests={rewards.weeklyQuests}
          isLoading={rewards.isWeeklyQuestsLoading}
          errorMessage={rewards.weeklyQuestsError}
          claimingQuestId={rewards.claimingWeeklyQuestId}
          onRetry={() => void rewards.retryWeeklyQuests()}
          onClaim={rewards.claimWeeklyQuest}
        />
        <SubjectPracticeGrid subjects={practice.subjects}
          onSelectSubject={practice.selectSubject} />
      </div>
      <aside data-testid="student-dashboard-side-column"
        className="min-w-0 space-y-6 xl:sticky xl:top-24">
        <LearningProgressPanel
          dashboard={rewards.dashboard}
          isLoading={rewards.isLoading}
          errorMessage={rewards.errorMessage}
          expanded={rewards.isJourneyExpanded}
          claimingMissionId={rewards.claimingMissionId}
          onToggle={rewards.toggleJourney}
          onRetry={() => void rewards.retryDashboard()}
          onClaimMission={rewards.claimMission}
        />
        <RewardSidebar
          dashboard={rewards.dashboard}
          giftShopEnabled={giftShopEnabled}
          isProcessing={rewards.isLoading}
          onOpenChest={rewards.claimChest}
          onOpenGiftShop={onOpenGiftShop}
          onOpenBadges={onOpenBadges}
        />
      </aside>
    </div>
    <div className="hidden pb-12 text-center md:block">
      <p className="text-sm font-medium text-slate-400">ÍtOngQuiz © 2026 - Môi trường học tập tích cực</p>
    </div>
  </div>
);
