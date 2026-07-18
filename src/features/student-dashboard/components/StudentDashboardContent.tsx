import StudentAchievementsPage from '@/src/features/certificates/StudentAchievementsPage';
import CurrentAnnouncementBanner from '@/src/components/common/CurrentAnnouncementBanner';
import { getAvatarUrl } from '@/src/config/avatars';
import { StudentDashboardHeader } from '@/src/components/HomePage/student-dashboard';
import { StudentDashboardBody } from './StudentDashboardBody';
import type { StudentDashboardContentProps } from './content.types';

export const StudentDashboardContent = (props: StudentDashboardContentProps) => {
  const { studentSession, activeSection, giftShopEnabled, rewards } = props;
  return <>
    <CurrentAnnouncementBanner role="student" />
    <StudentDashboardHeader
      studentName={studentSession.fullName}
      className={studentSession.className}
      avatarUrl={studentSession.avatar ? getAvatarUrl(studentSession.avatar) : getAvatarUrl('default')}
      level={rewards.pet?.level || 1}
      coins={rewards.coins}
      activeSection={activeSection}
      giftShopEnabled={giftShopEnabled}
      studentId={studentSession.studentId}
      onSelectSection={props.onSelectSection}
      onOpenGiftShop={props.onOpenGiftShop}
      onOpenLiveExam={props.onOpenLiveExam}
      onOpenAvatar={props.onOpenAvatar}
      onOpenChangePassword={props.onOpenChangePassword}
      onLogout={props.onLogout}
    />
    <main className="w-full max-w-[1280px] mx-auto px-3 py-5 md:px-8 md:py-10 flex-1">
      {activeSection === 'achievements'
        ? <StudentAchievementsPage />
        : <StudentDashboardBody {...props} />}
    </main>
  </>;
};

export type { StudentDashboardContentProps, StudentDashboardSection } from './content.types';
