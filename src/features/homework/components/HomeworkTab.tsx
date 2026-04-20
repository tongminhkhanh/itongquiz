import React, { useState, useEffect } from 'react';
import { Plus, BookText, Users, Clock, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { Button } from '../../../components/common';
import { AssignmentCreator } from './AssignmentCreator';
import { useHomeworkStore } from '../stores/useHomeworkStore';
import { useAuthStore } from '../../../../stores/authStore';
import { useClassroomStore } from '../../../stores/useClassroomStore';
import { AssignmentSubmissionsView } from './AssignmentSubmissionsView';
import { HomeworkAssignment } from '../types';

export const HomeworkTab: React.FC = () => {
  const { assignments, deleteAssignment, fetchTeacherAssignments, isLoading } = useHomeworkStore();
  const { fetchClasses } = useClassroomStore();
  const { username } = useAuthStore();
  const [showCreator, setShowCreator] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAssignment, setSelectedAssignment] = useState<HomeworkAssignment | null>(null);

  useEffect(() => {
    if (username) {
      fetchTeacherAssignments(username);
      fetchClasses(username);
    }
  }, [username, fetchTeacherAssignments, fetchClasses]);

  if (selectedAssignment) {
    return (
      <AssignmentSubmissionsView 
        assignment={selectedAssignment} 
        onBack={() => setSelectedAssignment(null)} 
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Trung tâm Bài tập Tự luận</h1>
          <p className="text-slate-500 mt-1">Quản lý và chấm điểm bài tập tự luận tự động bằng trí tuệ nhân tạo.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-1 flex shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          
          <Button 
            variant="primary" 
            onClick={() => setShowCreator(!showCreator)}
            icon={showCreator ? <Plus className="w-4 h-4 rotate-45 transition-transform" /> : <Plus className="w-4 h-4" />}
            className="rounded-2xl px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-500 shadow-lg shadow-indigo-200"
          >
            {showCreator ? 'Đóng bộ tạo' : 'Giao bài tập mới'}
          </Button>
        </div>
      </div>

      {/* Creator Overlay */}
      {showCreator && (
        <div className="animate-in zoom-in-95 duration-300">
          <AssignmentCreator onSuccess={() => setShowCreator(false)} />
        </div>
      )}

      {/* Loading State */}
      {isLoading && assignments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 animate-pulse font-medium">Đang tải danh sách bài tập...</p>
        </div>
      )}

      {/* Assignment List */}
      {!isLoading && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
          {assignments.map((hw) => (
            <div 
              key={hw.id} 
              onClick={() => setSelectedAssignment(hw)}
              className={`group bg-white border border-slate-100 p-5 transition-all hover:shadow-xl hover:border-indigo-100 cursor-pointer relative ${
                viewMode === 'grid' ? 'rounded-3xl' : 'rounded-2xl flex items-center justify-between'
              }`}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); deleteAssignment(hw.id); }}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-500">
                  <BookText className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors uppercase text-sm tracking-wide">{hw.title}</h3>
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium bg-slate-50 px-2 py-0.5 rounded-lg">
                      <Users className="w-3.5 h-3.5" />
                      Lớp {hw.class_id}
                    </div>
                    <div className="flex items-center gap-1.5 font-medium bg-slate-50 px-2 py-0.5 rounded-lg">
                      <Clock className="w-3.5 h-3.5" />
                      Hạn: {new Date(hw.deadline).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>

              {viewMode === 'grid' && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Tiến độ nộp bài</span>
                    <span className="text-indigo-600 font-bold">{hw.submitted_count || 0} học sinh</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700 bg-indigo-500"
                      style={{ width: `${(Number(hw.submitted_count || 0) / Math.max(Number(hw.total_students) || 1, 1)) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                      ĐANG MỞ
                    </span>
                    <button className="text-indigo-500 text-xs font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Xem chi tiết <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {viewMode === 'list' && (
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Đã nộp</p>
                    <p className="text-sm font-bold text-indigo-600">{hw.submitted_count || 0}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && assignments.length === 0 && (
        <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
           <BookText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
           <h3 className="text-xl font-bold text-slate-600">Chưa có bài tập nào</h3>
           <p className="text-slate-400 max-w-xs mx-auto mt-2">Bấm vào nút "Giao bài tập mới" để bắt đầu trải nghiệm chấm bài bằng AI.</p>
        </div>
      )}
    </div>
  );
};
