// DOM要素
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const charCount = document.getElementById('char-count');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const requestPermissionBtn = document.getElementById('request-permission-btn');
const installPrompt = document.getElementById('install-prompt');
const installBtn = document.getElementById('install-btn');
const messageHistory = document.getElementById('message-history');

// グローバル変数
let deferredPrompt;
let swRegistration = null;

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
      break;

    case 'denied':
      updateStatus('error', '❌ 通知が拒否されています（ブラウザ設定から許可してください）');
      requestPermissionBtn.style.display = 'none';
      sendBtn.disabled = true;
      break;

    case 'default':
      updateStatus('warning', '⚠️ 通知の許可が必要です');
      requestPermissionBtn.style.display = 'block';
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
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    updateStatus('error', '❌ 通知許可のリクエストに失敗しました');
  }
}

// プッシュ通知送信
async function sendNotification() {
  const message = messageInput.value.trim();

  if (!message) {
    return;
  }

  if (Notification.permission !== 'granted') {
    alert('通知の許可が必要です');
    return;
  }

  try {
    // Service Workerが利用可能な場合
    if (swRegistration) {
      // Service Workerを通じて通知を表示
      await swRegistration.showNotification('📨 新しいメッセージ', {
        body: message,
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'message-notification',
        requireInteraction: false,
        actions: [],
        data: {
          dateOfArrival: Date.now(),
          message: message
        }
      });
    } else {
      // フォールバック: 通常の通知
      new Notification('📨 新しいメッセージ', {
        body: message,
        icon: './icon-192.png',
        vibrate: [200, 100, 200]
      });
    }

    // メッセージ履歴に追加
    addToHistory(message);

    // 入力フィールドをクリア
    messageInput.value = '';
    charCount.textContent = '0';
    sendBtn.disabled = true;

    // 成功メッセージ表示
    showToast('✅ 通知を送信しました！');

  } catch (error) {
    console.error('Error sending notification:', error);
    alert('通知の送信に失敗しました: ' + error.message);
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
