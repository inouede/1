# プッシュ通知PWAアプリ

文章を入力して送信ボタンを押すとプッシュ通知が届くシンプルなPWA（Progressive Web App）です。

## 機能

- 📱 PWAとしてインストール可能
- 🔔 プッシュ通知の送信
- ✅ 通知の許可リクエスト
- 📝 メッセージ入力と送信
- 📜 送信履歴の表示（最新10件）
- 📲 オフライン対応（Service Worker）
- 📱 レスポンシブデザイン

## セットアップ

### 必要要件

- モダンブラウザ（Chrome、Firefox、Safari、Edgeなど）
- HTTPS環境（localhostは例外）
- Webサーバー

### インストール方法

1. リポジトリをクローン

```bash
git clone <repository-url>
cd <repository-directory>
```

2. Webサーバーを起動

Python 3を使用する場合：

```bash
python3 -m http.server 8000
```

Node.jsのhttp-serverを使用する場合：

```bash
npx http-server -p 8000
```

3. ブラウザでアクセス

```
http://localhost:8000
```

**注意**: プッシュ通知機能を完全にテストするには、HTTPS環境が必要です。

## 使い方

### 1. 通知の許可

初回アクセス時、通知の許可を求められます。「通知を許可する」ボタンをクリックして許可してください。

### 2. メッセージの送信

1. テキストエリアにメッセージを入力（最大500文字）
2. 「送信して通知を受け取る」ボタンをクリック
3. プッシュ通知が表示されます

### 3. PWAのインストール

ブラウザがサポートしている場合、「アプリをインストール」ボタンが表示されます。クリックするとホーム画面にアプリを追加できます。

## ファイル構成

```
.
├── index.html          # メインHTMLファイル
├── manifest.json       # PWAマニフェスト
├── sw.js              # Service Worker
├── app.js             # アプリケーションロジック
├── style.css          # スタイルシート
├── icon-192.png       # アプリアイコン (192x192)
├── icon-512.png       # アプリアイコン (512x512)
└── README.md          # このファイル
```

## 技術スタック

- HTML5
- CSS3
- JavaScript (ES6+)
- Service Worker API
- Notification API
- Web App Manifest

## 対応ブラウザ

- Google Chrome 42+
- Mozilla Firefox 44+
- Microsoft Edge 17+
- Safari 11.1+
- Opera 37+

## 制限事項

- プッシュ通知は通知の許可が必要です
- iOS Safariではプッシュ通知のサポートが限定的です
- HTTPではService Workerが動作しません（localhostは例外）

## ライセンス

MIT License

## 開発者

PWA Push Notification Demo App
