const CACHE_NAME = 'pwa-push-notification-v4';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './icon-192.png',
  './icon-512.png'
];

// IndexedDB設定
const DB_NAME = 'PushNotificationDB';
const DB_VERSION = 1;
const STORE_NAME = 'messages';

// IndexedDBを開く
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

// メッセージを保存
async function saveMessage(message, type) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const messageData = {
      message: message,
      type: type, // 'sent' or 'received'
      timestamp: new Date().toISOString()
    };

    await store.add(messageData);
    console.log('💾 Message saved to IndexedDB:', messageData);
  } catch (error) {
    console.error('❌ Failed to save message to IndexedDB:', error);
  }
}

// Service Workerのインストール
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Service Workerのアクティベーション
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチイベント
self.addEventListener('fetch', (event) => {
  // .js, .css ファイルはネットワーク優先（キャッシュ更新のため）
  if (event.request.url.endsWith('.js') || event.request.url.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 成功したらキャッシュも更新
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // ネットワークエラー時はキャッシュを使用
          return caches.match(event.request);
        })
    );
  } else {
    // その他のファイルはキャッシュ優先
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});

// プッシュ通知の受信
self.addEventListener('push', (event) => {
  console.log('🔔 Service Worker: Push notification received');
  console.log('📦 Push event data:', event.data ? event.data.text() : 'No data');

  let notificationData = {
    title: 'プッシュ通知',
    body: '新しいメッセージがあります',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'notification-tag',
    requireInteraction: false
  };

  let messageText = '新しいメッセージがあります';

  // プッシュデータがある場合は使用
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('📄 Parsed JSON data:', data);
      notificationData = { ...notificationData, ...data };
      messageText = data.body || messageText;
    } catch (e) {
      console.log('⚠️ Not JSON, using text:', event.data.text());
      messageText = event.data.text();
      notificationData.body = messageText;
    }
  }

  console.log('📢 Showing notification with data:', notificationData);

  // 受信メッセージをIndexedDBに保存
  const savePromise = saveMessage(messageText, 'received');

  const notificationPromise = self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: notificationData.vibrate,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction
  }).then(() => {
    console.log('✅ Notification displayed successfully');
  }).catch((error) => {
    console.error('❌ Failed to show notification:', error);
  });

  event.waitUntil(Promise.all([notificationPromise, savePromise]));
});

// 通知クリック時のイベント
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('./')
  );
});
