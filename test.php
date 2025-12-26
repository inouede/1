<?php
/**
 * デバッグ用テストスクリプト
 * ブラウザで test.php にアクセスして確認
 */

echo "<h1>PWA Push Notification - Debug Test</h1>";

// 1. PHP バージョン確認
echo "<h2>1. PHP Version</h2>";
echo "PHP Version: " . phpversion() . "<br>";

// 2. 設定ファイル読み込みテスト
echo "<h2>2. Config File Test</h2>";
try {
    $config = require __DIR__ . '/config.php';
    echo "✅ Config file loaded successfully<br>";
    echo "VAPID Subject: " . $config['vapid']['subject'] . "<br>";
    echo "Subscriptions file: " . $config['subscriptions_file'] . "<br>";
} catch (Exception $e) {
    echo "❌ Error loading config: " . $e->getMessage() . "<br>";
}

// 3. Composer autoload テスト
echo "<h2>3. Composer Autoload Test</h2>";
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    echo "✅ vendor/autoload.php exists<br>";
    require __DIR__ . '/vendor/autoload.php';

    // web-push ライブラリ確認
    if (class_exists('Minishlink\WebPush\WebPush')) {
        echo "✅ WebPush class is available<br>";
    } else {
        echo "❌ WebPush class not found<br>";
    }
} else {
    echo "❌ vendor/autoload.php not found<br>";
}

// 4. data ディレクトリテスト
echo "<h2>4. Data Directory Test</h2>";
$dataDir = __DIR__ . '/data';
if (is_dir($dataDir)) {
    echo "✅ data directory exists<br>";
    echo "Permissions: " . substr(sprintf('%o', fileperms($dataDir)), -4) . "<br>";

    if (is_writable($dataDir)) {
        echo "✅ data directory is writable<br>";

        // テストファイル作成
        $testFile = $dataDir . '/test.txt';
        if (file_put_contents($testFile, 'test')) {
            echo "✅ Successfully created test file<br>";
            unlink($testFile);
        } else {
            echo "❌ Failed to create test file<br>";
        }
    } else {
        echo "❌ data directory is NOT writable<br>";
    }
} else {
    echo "❌ data directory does not exist<br>";
    echo "Attempting to create...<br>";
    if (mkdir($dataDir, 0777, true)) {
        echo "✅ Successfully created data directory<br>";
    } else {
        echo "❌ Failed to create data directory<br>";
    }
}

// 5. subscriptions.json テスト
echo "<h2>5. Subscriptions File Test</h2>";
$subsFile = $dataDir . '/subscriptions.json';
if (file_exists($subsFile)) {
    echo "✅ subscriptions.json exists<br>";
    echo "Permissions: " . substr(sprintf('%o', fileperms($subsFile)), -4) . "<br>";
    $content = file_get_contents($subsFile);
    echo "Content: " . htmlspecialchars($content) . "<br>";
    $subs = json_decode($content, true);
    echo "Subscriptions count: " . count($subs) . "<br>";
} else {
    echo "⚠️ subscriptions.json does not exist<br>";
    echo "Attempting to create...<br>";
    if (file_put_contents($subsFile, json_encode([], JSON_PRETTY_PRINT))) {
        echo "✅ Successfully created subscriptions.json<br>";
        chmod($subsFile, 0666);
    } else {
        echo "❌ Failed to create subscriptions.json<br>";
    }
}

// 6. API エンドポイントテスト
echo "<h2>6. API Endpoints</h2>";
echo "Subscribe API: <a href='api/subscribe.php' target='_blank'>api/subscribe.php</a><br>";
echo "Send Push API: <a href='api/send-push.php' target='_blank'>api/send-push.php</a><br>";

if (file_exists(__DIR__ . '/api/subscribe.php')) {
    echo "✅ subscribe.php exists<br>";
} else {
    echo "❌ subscribe.php not found<br>";
}

if (file_exists(__DIR__ . '/api/send-push.php')) {
    echo "✅ send-push.php exists<br>";
} else {
    echo "❌ send-push.php not found<br>";
}

echo "<h2>7. Recommendations</h2>";
echo "<ul>";
echo "<li>PHP version should be 7.4 or higher</li>";
echo "<li>data directory should have 777 permissions</li>";
echo "<li>subscriptions.json should have 666 permissions</li>";
echo "<li>vendor directory must be uploaded completely</li>";
echo "</ul>";

echo "<hr>";
echo "<p>Test completed at: " . date('Y-m-d H:i:s') . "</p>";
