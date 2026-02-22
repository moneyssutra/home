import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, CheckCheck, ArrowRight, Coins, RefreshCw, BellRing, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const NotificationBell = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [swipingId, setSwipingId] = useState(null);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // Fetch notifications and unread count
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [notifRes, countRes] = await Promise.all([
        axios.get(`${backendUrl}/api/notifications`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/notifications/unread-count`, { withCredentials: true })
      ]);
      
      setNotifications(notifRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);
  
  // Fetch on mount and periodically
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);
  
  const handleBellClick = () => {
    setIsOpen(true);
    fetchNotifications();
  };
  
  const handleClose = () => {
    setIsOpen(false);
    setSwipingId(null);
    setSwipeX(0);
  };
  
  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await axios.patch(
          `${backendUrl}/api/notifications/${notification.id}/read`,
          {},
          { withCredentials: true }
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
    
    // Navigate and close panel
    if (notification.actionUrl) {
      handleClose();
      navigate(notification.actionUrl);
    }
  };
  
  const handleMarkAllRead = async () => {
    try {
      await axios.patch(
        `${backendUrl}/api/notifications/mark-all-read`,
        {},
        { withCredentials: true }
      );
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };
  
  const handleDeleteNotification = async (notificationId) => {
    try {
      await axios.delete(
        `${backendUrl}/api/notifications/${notificationId}`,
        { withCredentials: true }
      );
      const deleted = notifications.find(n => n.id === notificationId);
      if (deleted && !deleted.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };
  
  // Swipe handlers
  const handleTouchStart = (e, notificationId) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipingId(notificationId);
  };
  
  const handleTouchMove = (e) => {
    if (!swipingId) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    // Only allow right swipe
    if (diff > 0) {
      setSwipeX(Math.min(diff, 100));
    }
  };
  
  const handleTouchEnd = () => {
    if (swipeX > 80) {
      // Dismiss notification
      handleDeleteNotification(swipingId);
    }
    setSwipingId(null);
    setSwipeX(0);
  };
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case "income_reminder":
        return <Coins className="h-5 w-5 text-[#00D09C]" />;
      case "auto_entry":
        return <RefreshCw className="h-5 w-5 text-[#00D09C]" />;
      default:
        return <BellRing className="h-5 w-5 text-[#00D09C]" />;
    }
  };
  
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
  
  return (
    <>
      {/* Bell Button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        data-testid="notification-bell"
      >
        <Bell className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      
      {/* Backdrop with blur */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          onClick={handleClose}
          data-testid="notification-backdrop"
        />
      )}
      
      {/* Bottom Sheet Drawer */}
      <div 
        className={`fixed inset-x-0 bottom-0 z-[101] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '85vh' }}
        data-testid="notification-drawer"
      >
        <div className="mx-4 mb-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(85vh - 32px)' }}>
          {/* Fixed Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00D09C]/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-[#00D09C]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-lg">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-gray-500">{unreadCount} unread</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-3 py-1.5 text-xs text-[#00D09C] hover:bg-[#00D09C]/10 font-medium flex items-center gap-1 rounded-lg transition-colors"
                  data-testid="mark-all-read-btn"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="close-notifications-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Scrollable Notification List */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {loading && notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="animate-spin h-8 w-8 border-3 border-[#00D09C] border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-gray-400">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              /* Empty State */
              <div className="p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-[#00D09C]/10 flex items-center justify-center mx-auto mb-4">
                  <Inbox className="h-10 w-10 text-[#00D09C]" />
                </div>
                <h4 className="font-semibold text-gray-800 text-lg mb-1">You're all caught up!</h4>
                <p className="text-gray-500 text-sm">No new notifications at the moment.</p>
              </div>
            ) : (
              <div className="py-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="relative overflow-hidden"
                    onTouchStart={(e) => handleTouchStart(e, notification.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {/* Swipe delete background */}
                    <div 
                      className="absolute inset-y-0 left-0 bg-red-500 flex items-center justify-start pl-4"
                      style={{ width: swipingId === notification.id ? `${swipeX}px` : 0 }}
                    >
                      <X className="h-5 w-5 text-white" />
                    </div>
                    
                    {/* Notification Card */}
                    <div
                      onClick={() => handleNotificationClick(notification)}
                      className={`mx-3 my-2 p-4 rounded-xl cursor-pointer transition-all ${
                        !notification.isRead 
                          ? "bg-[#00D09C]/5 border border-[#00D09C]/20" 
                          : "bg-gray-50 border border-gray-100"
                      }`}
                      style={{
                        transform: swipingId === notification.id ? `translateX(${swipeX}px)` : 'translateX(0)',
                        transition: swipingId === notification.id ? 'none' : 'transform 0.2s ease-out'
                      }}
                      data-testid={`notification-card-${notification.id}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          !notification.isRead ? "bg-[#00D09C]/20" : "bg-gray-200"
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm break-words ${
                              !notification.isRead ? "font-semibold text-gray-800" : "font-medium text-gray-700"
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="w-2.5 h-2.5 rounded-full bg-[#00D09C] flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1 break-words" style={{ wordWrap: 'break-word' }}>
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                            
                            {notification.actionUrl && (
                              <button 
                                className="flex items-center gap-1 text-sm font-medium text-[#00D09C] hover:text-[#00B88A] transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification);
                                }}
                                data-testid={`view-btn-${notification.id}`}
                              >
                                View
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Swipe hint for first-time users */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">Swipe right on a notification to dismiss</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationBell;
