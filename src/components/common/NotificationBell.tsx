import React, { useState, useEffect } from 'react';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

export default function NotificationBell({ userId }: { userId: string | null }) {
  const { notifications } = useRealtimeNotifications(userId);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        🛎️
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border z-50 max-h-[400px] overflow-auto">
          <div className="p-4 border-b font-medium">Thông báo</div>
          <div className="divide-y">
            {notifications.length > 0 ? notifications.map((notif, index) => (
              <div key={index} className="p-4 hover:bg-gray-50">
                <div className="font-medium">{notif.title}</div>
                <div className="text-sm text-gray-600 mt-1">{notif.message}</div>
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(notif.timestamp).toLocaleTimeString('vi-VN')}
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-gray-500">Không có thông báo mới</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}