/**
 * Push Notification Service
 * Handles service worker registration and push subscription management.
 */

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * Check if push notifications are supported
 */
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Get the current notification permission status
 */
export const getPermissionStatus = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
};

/**
 * Register the service worker
 */
export const registerServiceWorker = async () => {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('Service Worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

/**
 * Get the VAPID public key from backend
 */
const getVapidPublicKey = async () => {
  try {
    const response = await fetch(`${backendUrl}/api/push/vapid-key`, {
      credentials: 'include'
    });
    const data = await response.json();
    return data.public_key;
  } catch (error) {
    console.error('Failed to fetch VAPID key:', error);
    return null;
  }
};

/**
 * Convert URL-safe base64 to Uint8Array
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async () => {
  if (!isPushSupported()) {
    return { success: false, error: 'Push not supported' };
  }
  
  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permission denied', permission };
    }
    
    // Get service worker registration
    let registration = await navigator.serviceWorker.ready;
    
    // Get VAPID public key
    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) {
      return { success: false, error: 'Failed to get VAPID key' };
    }
    
    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });
    
    // Send subscription to backend
    const response = await fetch(`${backendUrl}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))))
        }
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }
    
    console.log('Push subscription successful');
    return { success: true, subscription };
    
  } catch (error) {
    console.error('Push subscription failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Unsubscribe locally
      await subscription.unsubscribe();
      
      // Remove from backend
      await fetch(`${backendUrl}/api/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Push unsubscribe failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if currently subscribed to push
 */
export const isSubscribed = async () => {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    return false;
  }
};

/**
 * Initialize push notifications (call on app startup)
 */
export const initPushNotifications = async () => {
  if (!isPushSupported()) {
    console.log('Push notifications not supported on this browser');
    return;
  }
  
  await registerServiceWorker();
  
  // Auto-subscribe if permission already granted
  if (Notification.permission === 'granted') {
    const subscribed = await isSubscribed();
    if (!subscribed) {
      await subscribeToPush();
    }
  }
};
