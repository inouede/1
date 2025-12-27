const CACHE_NAME = 'pwa-push-notification-v3';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './icon-192.png',
  './icon-512.png'
];

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

  // プッシュデータがある場合は使用
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('📄 Parsed JSON data:', data);
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      console.log('⚠️ Not JSON, using text:', event.data.text());
      notificationData.body = event.data.text();
    }
  }

  console.log('📢 Showing notification with data:', notificationData);

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

  event.waitUntil(notificationPromise);
});

// 通知クリック時のイベント
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('./')
  );
});
