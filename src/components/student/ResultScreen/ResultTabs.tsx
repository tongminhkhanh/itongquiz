import React from 'react';
import { TabType } from './index';
import { FileText, ListChecks, BarChart3, Lightbulb } from 'lucide-react';

interface Props {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    hasRecommendations?: boolean;
}

const tabs: { id: TabType; label: string; icon: React.ReactNode; description: string }[] = [
    {
        id: 'overview',
        label: 'Tổng quan',
        icon: <FileText className="w-5 h-5" />,
        description: 'Điểm và nhận xét'
    },
    {
        id: 'details',
        label: 'Chi tiết',
        icon: <ListChecks className="w-5 h-5" />,
        description: 'Xem từng câu'
    },
    {
        id: 'statistics',
        label: 'Phân tích',
        icon: <BarChart3 className="w-5 h-5" />,
        description: 'Biểu đồ thống kê'
    },
    {
        id: 'recommendations',
        label: 'Gợi ý',
        icon: <Lightbulb className="w-5 h-5" />,
        description: 'AI tư vấn'
    },
];

const ResultTabs: React.FC<Props> = ({ activeTab, onTabChange, hasRecommendations }) => {
    return (
        <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
            <div className="max-w-5xl mx-auto px-4">
                <div className="flex overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const showBadge = tab.id === 'recommendations' && hasRecommendations;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`
                  relative flex items-center gap-2 px-6 py-4 min-w-fit
                  font-medium text-sm transition-all duration-200
                  border-b-2 -mb-[2px]
                  ${isActive
                                        ? 'text-indigo-600 border-indigo-600'
                                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                                    }
                `}
                            >
                                <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                                    {tab.icon}
                                </span>
                                <span className="hidden sm:inline">{tab.label}</span>

                                {/* Notification badge for recommendations */}
                                {showBadge && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Hide scrollbar but keep functionality */}
            <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </div>
    );
};

export default ResultTabs;
