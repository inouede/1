# プッシュ通知PWAアプリ（クロスデバイス対応）

文章を入力して送信ボタンを押すと、登録された全デバイスにプッシュ通知が届くPWA（Progressive Web App）です。

## 機能

- 📱 PWAとしてインストール可能
- 🔔 **クロスデバイスプッシュ通知**（Mac → スマホなど）
- ✅ 通知の許可リクエスト
- 📝 メッセージ入力と送信
- 📜 送信履歴の表示（最新10件）
- 📲 オフライン対応（Service Worker）
- 📱 レスポンシブデザイン
- 🔐 VAPID認証対応

## 技術スタック

### フロントエンド
- HTML5
- CSS3
- JavaScript (ES6+)
- Service Worker API
- Push API
- Web App Manifest

### バックエンド
- PHP 7.4+
- [web-push-php](https://github.com/web-push-libs/web-push-php) ライブラリ
- Composer (パッケージ管理)

## セットアップ

### 必要要件

- PHP 7.4 以上
- Composer
- HTTPS環境（localhostは例外）
- モダンブラウザ（Chrome、Firefox、Safari、Edgeなど）

### インストール方法

#### 1. ファイルのアップロード

以下のファイルとディレクトリをXサーバー（または他のPHPホスティング）にアップロードしてください：

```
.
├── index.html          # メインHTMLファイル
├── manifest.json       # PWAマニフェスト
├── sw.js              # Service Worker
├── app.js             # アプリケーションロジック
├── style.css          # スタイルシート
├── icon-192.png       # アプリアイコン (192x192)
├── icon-512.png       # アプリアイコン (512x512)
├── config.php         # 設定ファイル
├── composer.json      # Composer設定
├── composer.lock      # Composerロック
├── vendor/            # Composerの依存関係（全体）
├── api/               # APIディレクトリ
│   ├── subscribe.php  # サブスクリプション登録
│   └── send-push.php  # プッシュ通知送信
└── data/              # データディレクトリ
    └── subscriptions.json  # サブスクリプション保存ファイル
```

#### 2. パーミッション設定

`data/subscriptions.json` に書き込み権限を付与してください：

```bash
chmod 666 data/subscriptions.json
chmod 777 data
```

FTPクライアントの場合は、ファイルのパーミッションを `666`、ディレクトリを `777` に設定してください。

#### 3. 設定ファイルの編集

`config.php` を編集して、VAPIDのsubject（メールアドレス）を設定してください：

```php
'subject' => 'mailto:your-email@example.com', // ← あなたのメールアドレスに変更
```

**注意**: VAPIDキーは既に生成されており、変更する必要はありません。

#### 4. ブラウザでアクセス

```
https://your-domain.com/
```

HTTPS環境でアクセスしてください。HTTPでは動作しません。

## 使い方

### 1. 通知の許可

1. 初回アクセス時、ブラウザで「通知を許可する」ボタンをクリック
2. ブラウザのプロンプトで「許可」を選択
3. デバイスがサーバーに自動登録されます

### 2. 複数デバイスでの登録

- Mac、スマホ、タブレットなど、複数のデバイスでアプリを開き、それぞれで通知を許可してください
- 各デバイスが自動的にサーバーに登録されます

### 3. メッセージの送信

1. 任意のデバイスでメッセージを入力
2. 「送信して通知を受け取る」ボタンをクリック
3. **登録されている全デバイス**にプッシュ通知が届きます

### 4. PWAのインストール

ブラウザがサポートしている場合、「アプリをインストール」ボタンが表示されます。クリックするとホーム画面にアプリを追加できます。

## 仕組み

### プッシュ通知の流れ

```
[デバイスA] メッセージ送信
    ↓
[PHPバックエンド] 全サブスクリプションに送信
    ↓
[ブラウザのプッシュサーバー] (Google FCM, Mozilla Push Service等)
    ↓
[デバイスB, C, D...] 通知受信
```

### VAPID認証

- VAPID (Voluntary Application Server Identification)
- サーバーがプッシュサービスに対して自身を識別するための仕組み
- 公開鍵と秘密鍵のペアを使用
- より安全で信頼性の高いプッシュ通知を実現

## トラブルシューティング

### 通知が届かない場合

1. **HTTPSを使用しているか確認**
   - HTTPでは動作しません（localhostを除く）

2. **ブラウザで通知が許可されているか確認**
   - ブラウザの設定 → サイトの設定 → 通知

3. **Service Workerが正しく登録されているか確認**
   - 開発者ツール → Application → Service Workers

4. **データディレクトリに書き込み権限があるか確認**
   - `data/subscriptions.json` のパーミッションを確認

5. **サブスクリプションが保存されているか確認**
   - `data/subscriptions.json` の内容を確認

### エラーログの確認

PHPのエラーログを確認してください：

```bash
tail -f /path/to/php/error.log
```

## セキュリティ

- VAPIDの秘密鍵は `config.php` に保存されています
- **本番環境では `config.php` をWebルートの外に配置**することを推奨します
- サブスクリプションデータは `data/subscriptions.json` に保存されます
- 定期的に期限切れのサブスクリプションが自動削除されます

## 対応ブラウザ

| ブラウザ | バージョン | プッシュ通知 | PWA |
|---------|-----------|------------|-----|
| Chrome  | 42+       | ✅         | ✅  |
| Firefox | 44+       | ✅         | ✅  |
| Edge    | 17+       | ✅         | ✅  |
| Safari  | 16+       | ⚠️*        | ✅  |
| Opera   | 37+       | ✅         | ✅  |

*Safari 16.4+ でプッシュ通知対応（macOS 13 Ventura以降、iOS 16.4以降）

## カスタマイズ

### 通知の表示内容を変更

`api/send-push.php` の通知ペイロードを編集：

```php
$payload = json_encode([
    'title' => 'カスタムタイトル',
    'body' => $message,
    'icon' => './icon-192.png',
    // ... その他の設定
]);
```

### サブスクリプションの保存先を変更

`config.php` でファイルパスを変更：

```php
'subscriptions_file' => '/path/to/custom/subscriptions.json',
```

## ライセンス

MIT License

## 開発者

PWA Cross-Device Push Notification App
