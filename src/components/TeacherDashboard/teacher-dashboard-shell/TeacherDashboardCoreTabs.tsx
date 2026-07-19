import { useQuizStore } from '../../../../stores/quizStore';
import type { TeacherDashboardTab } from '../../../stores/useTeacherDashboardUIStore';
import type { Quiz, StudentResult } from '../../../types';
import { CreateTab, ManageTab, OverviewTab, ResultsTab } from './dashboardLazyTabs';
import type { ResultsLoadState } from './types';

interface TeacherDashboardCoreTabsProps {
  activeTab: TeacherDashboardTab;
  resultsLoadState: ResultsLoadState;
  resultsLoadError: string | null;
  loadTeacherResults: () => Promise<void>;
  filteredResults: StudentResult[];
  quizzes: Quiz[];
  editingQuiz: Quiz | null;
  setEditingQuiz: (quiz: Quiz | null) => void;
  setActiveTab: (tab: TeacherDashboardTab) => void;
  openAccessCodeEditor: (quizId: string, currentCode: string) => void;
  removeQuiz: any;
  createQuiz: any;
  modifyQuiz: any;
}

export const TeacherDashboardCoreTabs = (props: TeacherDashboardCoreTabsProps) => (
  <>
    {props.activeTab === 'overview' && (
      <OverviewTab
        resultsLoadState={props.resultsLoadState}
        resultsError={props.resultsLoadError}
        onRetryResults={props.loadTeacherResults}
      />
    )}
    {props.activeTab === 'results' && (
      <ResultsTab
        results={props.filteredResults}
        quizzes={props.quizzes}
        onRefresh={async () => {
          await props.loadTeacherResults();
          return useQuizStore.getState().results;
        }}
      />
    )}
    {props.activeTab === 'manage' && (
      <ManageTab
        quizzes={props.quizzes}
        onDelete={props.removeQuiz}
        onEdit={quiz => {
          props.setEditingQuiz(quiz);
          props.setActiveTab('create');
        }}
        onManageCode={props.openAccessCodeEditor}
      />
    )}
    {props.activeTab === 'create' && (
      <CreateTab
        editingQuiz={props.editingQuiz}
        onSaveQuiz={props.createQuiz}
        onUpdateQuiz={props.modifyQuiz}
        onSuccess={() => {
          props.setEditingQuiz(null);
          props.setActiveTab('manage');
        }}
      />
    )}
  </>
);
