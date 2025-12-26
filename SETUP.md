# セットアップガイド

このドキュメントは、Xサーバー（または他のPHPホスティング）にアプリをデプロイする手順を説明します。

## 前提条件

- Xサーバーのアカウント
- FTPクライアント（FileZilla、Cyberduckなど）またはSSHアクセス
- HTTPSが有効なドメイン

## ステップ1: ファイルのアップロード

### FTPを使用する場合

1. FTPクライアントでXサーバーに接続
2. 以下のファイルとディレクトリを `public_html/` (またはサブディレクトリ) にアップロード：

```
.
├── index.html
├── manifest.json
├── sw.js
├── app.js
├── style.css
├── icon-192.png
├── icon-512.png
├── config.php
├── composer.json
├── composer.lock
├── vendor/ (ディレクトリ全体)
├── api/
│   ├── subscribe.php
│   └── send-push.php
└── data/
    └── subscriptions.json
```

### SSHを使用する場合

```bash
# サーバーにログイン
ssh your-username@your-server.com

# ディレクトリに移動
cd public_html

# Gitからクローン（または）
git clone <repository-url> .

# Composerの依存関係をインストール（まだの場合）
composer install
```

## ステップ2: パーミッションの設定（オプション）

**注意**: `data` ディレクトリと `data/subscriptions.json` ファイルは、初回アクセス時に自動的に作成されます。手動で作成する必要はありません。

ただし、パーミッションエラーが発生する場合は、以下の設定を行ってください：

### FTPの場合

1. `data` ディレクトリを右クリック → パーミッション → `777`
2. `data/subscriptions.json` を右クリック → パーミッション → `666`

### SSHの場合

```bash
# dataディレクトリが存在する場合
chmod 777 data

# subscriptions.jsonが存在する場合
chmod 666 data/subscriptions.json
```

### 手動でディレクトリとファイルを作成する場合

```bash
mkdir -p data
echo '[]' > data/subscriptions.json
chmod 777 data
chmod 666 data/subscriptions.json
```

## ステップ3: 設定ファイルの編集

`config.php` を編集：

```php
return [
    'vapid' => [
        'subject' => 'mailto:your-email@example.com', // ← 変更
        'publicKey' => 'BNF2KP-UyNhY4w7khRCa7G-vkRoHHFOpzklLfnM-VXnjKe3rVt0iyK2WLFJTv3MKf9UNZn-tx5lrGWCPrsKLK0I',
        'privateKey' => '4H3SEmzhpzaIX3ELlISahB9JnjpjacWJo9EQY6a1mAE',
    ],
    // ...
];
```

## ステップ4: 動作確認

1. ブラウザで `https://your-domain.com/` にアクセス
2. 「通知を許可する」ボタンをクリック
3. ブラウザの通知許可プロンプトで「許可」を選択
4. メッセージを入力して送信
5. 通知が届くことを確認

## ステップ5: 複数デバイスでテスト

1. スマホでも同じURLにアクセス
2. 通知を許可
3. Macから送信 → スマホに通知が届くことを確認
4. スマホから送信 → Macに通知が届くことを確認

## トラブルシューティング

### 1. 「Permission denied」エラー

```bash
chmod 777 data
chmod 666 data/subscriptions.json
```

### 2. 「500 Internal Server Error」

- PHPのバージョンを確認（PHP 7.4以上必要）
- エラーログを確認：`/home/your-username/error_log`

### 3. 通知が届かない

- HTTPSを使用していることを確認
- ブラウザの開発者ツールでコンソールエラーを確認
- `data/subscriptions.json` にサブスクリプションが保存されているか確認

### 4. Composer依存関係のエラー

ローカルで再インストール：

```bash
rm -rf vendor
composer install --no-dev
```

その後、`vendor/` ディレクトリ全体を再アップロード

## Xサーバー特有の設定

### PHP バージョンの変更

1. Xサーバーのサーバーパネルにログイン
2. 「PHP Ver.切替」をクリック
3. 対象のドメインを選択
4. PHP 7.4以上を選択
5. 「変更」をクリック

### .htaccess の設定（オプション）

HTTPをHTTPSにリダイレクトする場合：

```apache
# .htaccess
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
```

## セキュリティ推奨事項

### 1. config.php の保護

Webルートの外に配置することを推奨：

```
/home/your-username/
├── public_html/          # Webルート
│   ├── index.html
│   └── ...
└── config/               # Webルート外
    └── config.php
```

`api/subscribe.php` と `api/send-push.php` で設定ファイルのパスを変更：

```php
$config = require __DIR__ . '/../../config/config.php';
```

### 2. data ディレクトリの保護

`.htaccess` を `data/` ディレクトリに配置：

```apache
# data/.htaccess
Deny from all
```

ただし、PHPからは書き込み可能にする必要があります。

## 完了！

これでクロスデバイスプッシュ通知PWAアプリのセットアップが完了しました。

質問がある場合は、README.mdのトラブルシューティングセクションを参照してください。
