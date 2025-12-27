// DOM要素
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const charCount = document.getElementById('char-count');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const requestPermissionBtn = document.getElementById('request-permission-btn');
const resubscribeBtn = document.getElementById('resubscribe-btn');
const installPrompt = document.getElementById('install-prompt');
const installBtn = document.getElementById('install-btn');
const messageHistory = document.getElementById('message-history');

// グローバル変数
let deferredPrompt;
let swRegistration = null;

// VAPID公開鍵（config.phpと同じ値）
const VAPID_PUBLIC_KEY = 'BNF2KP-UyNhY4w7khRCa7G-vkRoHHFOpzklLfnM-VXnjKe3rVt0iyK2WLFJTv3MKf9UNZn-tx5lrGWCPrsKLK0I';

// APIエンドポイント
const API_ENDPOINTS = {
  subscribe: './api/subscribe.php',
  sendPush: './api/send-push.php'
};

// アプリ初期化
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// アプリケーション初期化
async function initApp() {
  // Service Worker登録
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('./sw.js');
      console.log('Service Worker registered successfully:', swRegistration);

      // Service Workerがアクティブになるのを待つ
      await navigator.serviceWorker.ready;
      console.log('Service Worker is ready and active');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  // 通知ステータス確認
  checkNotificationPermission();

  // イベントリスナー設定
  setupEventListeners();

  // PWAインストールプロンプト設定
  setupInstallPrompt();

  // 履歴をローカルストレージから読み込み
  loadMessageHistory();
}

// イベントリスナー設定
function setupEventListeners() {
  // メッセージ入力
  messageInput.addEventListener('input', () => {
    const length = messageInput.value.length;
    charCount.textContent = length;
    sendBtn.disabled = length === 0 || Notification.permission !== 'granted';
  });

  // 送信ボタン
  sendBtn.addEventListener('click', sendNotification);

  // 通知許可ボタン
  requestPermissionBtn.addEventListener('click', requestNotificationPermission);

  // 再登録ボタン
  resubscribeBtn.addEventListener('click', resubscribeToPush);

  // インストールボタン
  installBtn.addEventListener('click', installApp);
}

// 通知許可状態確認
function checkNotificationPermission() {
  if (!('Notification' in window)) {
    updateStatus('error', '❌ このブラウザは通知をサポートしていません');
    return;
  }

  const permission = Notification.permission;

  switch (permission) {
    case 'granted':
      updateStatus('success', '✅ 通知が許可されています');
      sendBtn.disabled = messageInput.value.length === 0;
      requestPermissionBtn.style.display = 'none';
      resubscribeBtn.style.display = 'block';
      // プッシュサブスクリプションを登録
      subscribeToPush();
      break;

    case 'denied':
      updateStatus('error', '❌ 通知が拒否されています（ブラウザ設定から許可してください）');
      requestPermissionBtn.style.display = 'none';
      resubscribeBtn.style.display = 'none';
      sendBtn.disabled = true;
      break;

    case 'default':
      updateStatus('warning', '⚠️ 通知の許可が必要です');
      requestPermissionBtn.style.display = 'block';
      resubscribeBtn.style.display = 'none';
      sendBtn.disabled = true;
      break;
  }
}

// ステータス表示更新
function updateStatus(type, message) {
  statusText.textContent = message;
  statusIndicator.className = 'status-indicator status-' + type;
}

// 通知許可リクエスト
async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    checkNotificationPermission();

    if (permission === 'granted') {
      console.log('Notification permission granted');
      // プッシュサブスクリプションを登録
      await subscribeToPush();
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    updateStatus('error', '❌ 通知許可のリクエストに失敗しました');
  }
}

// プッシュサブスクリプション登録
async function subscribeToPush() {
  if (!('serviceWorker' in navigator)) {
    console.error('Service Worker not supported');
    return;
  }

  try {
    // Service Workerがアクティブになるのを待つ
    const registration = await navigator.serviceWorker.ready;
    console.log('Attempting to subscribe to push notifications...');

    // 既存のサブスクリプションを確認
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // 新規サブスクリプション作成
      const vapidPublicKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      console.log('✅ Push subscription created:', subscription);
    } else {
      console.log('ℹ️ Push subscription already exists:', subscription);
    }

    // サーバーに送信
    await sendSubscriptionToServer(subscription);

  } catch (error) {
    console.error('Failed to subscribe to push:', error);
  }
}

// プッシュサブスクリプション再登録
async function resubscribeToPush() {
  if (!('serviceWorker' in navigator)) {
    console.error('Service Worker not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // 既存のサブスクリプションを削除
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('🗑️ Unsubscribing from existing push subscription...');
      await existingSubscription.unsubscribe();
      console.log('✅ Successfully unsubscribed');
      showToast('🗑️ 既存の登録を解除しました');
    }

    // 新しいサブスクリプションを作成
    console.log('🔄 Creating new push subscription...');
    const vapidPublicKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey
    });

    console.log('✅ New push subscription created:', newSubscription);

    // サーバーに送信
    await sendSubscriptionToServer(newSubscription);

    showToast('✅ プッシュ通知を再登録しました');

  } catch (error) {
    console.error('❌ Failed to resubscribe to push:', error);
    showToast('❌ 再登録に失敗しました');
  }
}

// サブスクリプションをサーバーに送信
async function sendSubscriptionToServer(subscription) {
  try {
    console.log('Sending subscription to server:', API_ENDPOINTS.subscribe);
    console.log('Subscription data:', subscription.toJSON());

    const response = await fetch(API_ENDPOINTS.subscribe, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error:', errorText);
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Server response:', data);

    if (data.success) {
      console.log('✅ Subscription saved successfully:', data);
      showToast(`✅ デバイスを登録しました (合計: ${data.total_subscriptions}台)`);
    } else {
      console.error('❌ Failed to save subscription:', data.error);
      showToast('❌ デバイス登録に失敗しました');
    }
  } catch (error) {
    console.error('❌ Error sending subscription to server:', error);
    showToast('❌ サーバーとの通信に失敗しました');
  }
}

// VAPID公開鍵をUint8Arrayに変換
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// プッシュ通知送信（全デバイスに送信）
async function sendNotification() {
  const message = messageInput.value.trim();

  if (!message) {
    return;
  }

  if (Notification.permission !== 'granted') {
    alert('通知の許可が必要です');
    return;
  }

  // 送信ボタンを無効化
  sendBtn.disabled = true;
  sendBtn.textContent = '送信中...';

  try {
    console.log('Sending push notification to:', API_ENDPOINTS.sendPush);
    console.log('Message:', message);

    // バックエンドAPIにメッセージを送信
    const response = await fetch(API_ENDPOINTS.sendPush, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error:', errorText);
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Server response:', data);

    if (data.success) {
      console.log('✅ Push notification sent:', data);

      // メッセージ履歴に追加
      addToHistory(message);

      // 入力フィールドをクリア
      messageInput.value = '';
      charCount.textContent = '0';

      // 成功メッセージ表示
      showToast(`✅ ${data.stats.success}台のデバイスに通知を送信しました！`);
    } else {
      throw new Error(data.error || 'Failed to send push notification');
    }

  } catch (error) {
    console.error('❌ Error sending notification:', error);
    showToast('❌ 通知の送信に失敗しました: ' + error.message);
  } finally {
    // 送信ボタンを有効化
    sendBtn.disabled = messageInput.value.length === 0;
    sendBtn.textContent = '送信して通知を受け取る';
  }
}

// メッセージ履歴に追加
function addToHistory(message) {
  // ローカルストレージから履歴取得
  let history = JSON.parse(localStorage.getItem('messageHistory') || '[]');

  // 新しいメッセージを追加
  history.unshift({
    message: message,
    timestamp: new Date().toISOString()
  });

  // 最新10件のみ保持
  history = history.slice(0, 10);

  // ローカルストレージに保存
  localStorage.setItem('messageHistory', JSON.stringify(history));

  // 表示更新
  renderMessageHistory(history);
}

// メッセージ履歴読み込み
function loadMessageHistory() {
  const history = JSON.parse(localStorage.getItem('messageHistory') || '[]');
  renderMessageHistory(history);
}

// メッセージ履歴表示
function renderMessageHistory(history) {
  if (history.length === 0) {
    messageHistory.innerHTML = '<p class="empty-state">まだメッセージがありません</p>';
    return;
  }

  messageHistory.innerHTML = history.map(item => {
    const date = new Date(item.timestamp);
    const formattedDate = date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="message-item">
        <div class="message-content">${escapeHtml(item.message)}</div>
        <div class="message-time">${formattedDate}</div>
      </div>
    `;
  }).join('');
}

// HTMLエスケープ
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// トースト通知表示
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// PWAインストールプロンプト設定
function setupInstallPrompt() {
  // beforeinstallpromptイベント
  window.addEventListener('beforeinstallprompt', (e) => {
    // デフォルトのインストールプロンプトを防止
    e.preventDefault();

    // イベントを保存
    deferredPrompt = e;

    // インストールボタンを表示
    installPrompt.style.display = 'block';
  });

  // アプリがインストールされた後
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    installPrompt.style.display = 'none';
    deferredPrompt = null;
    showToast('✅ アプリがインストールされました！');
  });
}

// PWAインストール
async function installApp() {
  if (!deferredPrompt) {
    return;
  }

  // インストールプロンプトを表示
  deferredPrompt.prompt();

  // ユーザーの選択を待つ
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);

  // プロンプトを再利用できないのでクリア
  deferredPrompt = null;
  installPrompt.style.display = 'none';
}

// Service Workerからのメッセージ受信
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('Message from service worker:', event.data);
  });
}
