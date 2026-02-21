import { useState, useEffect, useRef } from "react";
import { Bell, X, Check, CheckCheck, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const NotificationBell = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Fetch notifications and unread count
  const fetchNotifications = async () => {
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
      // Set empty state on error to avoid infinite loading
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch on mount and periodically
  useEffect(() => {
    fetchNotifications();
    
    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);
  
  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
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
    
    // Navigate if action URL exists
    if (notification.actionUrl) {
      setIsOpen(false);
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
  
  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
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
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case "income_reminder":
        return "💰";
      case "auto_entry":
        return "🔄";
      default:
        return "🔔";
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
    <div className="relative" ref={dropdownRef}>
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
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden bg-white rounded-xl shadow-xl border border-gray-100 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-[#00D09C] hover:text-[#00B88A] font-medium flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          
          {/* Notification List */}
          <div className="overflow-y-auto max-h-72">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="animate-spin h-6 w-6 border-2 border-[#00D09C] border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.isRead ? "bg-[#00D09C]/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.isRead ? "font-semibold" : "font-medium"} text-gray-800 line-clamp-1`}>
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) => handleDeleteNotification(e, notification.id)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded flex-shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                        {notification.actionUrl && (
                          <span className="text-xs text-[#00D09C] flex items-center gap-0.5">
                            <ExternalLink className="h-3 w-3" />
                            View
                          </span>
                        )}
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-[#00D09C] flex-shrink-0 mt-1.5"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
