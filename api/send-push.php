<?php
/**
 * プッシュ通知送信API
 */

require __DIR__ . '/../vendor/autoload.php';

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONSリクエスト（プリフライト）に対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// POSTリクエストのみ受け付け
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// 設定ファイル読み込み
$config = require __DIR__ . '/../config.php';

try {
    // dataディレクトリが存在しない場合は作成
    $dataDir = dirname($config['subscriptions_file']);
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0777, true);
    }

    // subscriptions.jsonが存在しない場合は作成
    if (!file_exists($config['subscriptions_file'])) {
        file_put_contents($config['subscriptions_file'], json_encode([], JSON_PRETTY_PRINT));
        chmod($config['subscriptions_file'], 0666);
    }

    // リクエストボディ取得
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data || !isset($data['message'])) {
        throw new Exception('Message is required');
    }

    $message = $data['message'];

    // サブスクリプション読み込み
    if (!file_exists($config['subscriptions_file'])) {
        throw new Exception('No subscriptions found');
    }

    $subscriptions = json_decode(file_get_contents($config['subscriptions_file']), true);

    if (empty($subscriptions)) {
        throw new Exception('No subscriptions available');
    }

    // WebPushインスタンス作成
    $webPush = new WebPush([
        'VAPID' => [
            'subject' => $config['vapid']['subject'],
            'publicKey' => $config['vapid']['publicKey'],
            'privateKey' => $config['vapid']['privateKey'],
        ]
    ]);

    // 通知ペイロード
    $payload = json_encode([
        'title' => '📨 新しいメッセージ',
        'body' => $message,
        'icon' => './icon-192.png',
        'badge' => './icon-192.png',
        'vibrate' => [200, 100, 200],
        'tag' => 'cross-device-notification',
        'requireInteraction' => false,
        'data' => [
            'dateOfArrival' => time() * 1000,
            'message' => $message,
        ]
    ]);

    // 各サブスクリプションに通知を送信
    $successCount = 0;
    $failedCount = 0;
    $expiredSubscriptions = [];

    foreach ($subscriptions as $index => $sub) {
        try {
            $subscription = Subscription::create([
                'endpoint' => $sub['endpoint'],
                'keys' => $sub['keys']
            ]);

            $webPush->queueNotification(
                $subscription,
                $payload,
                ['TTL' => $config['notification']['ttl']]
            );
        } catch (Exception $e) {
            error_log("Failed to queue notification: " . $e->getMessage());
            $failedCount++;
        }
    }

    // 一括送信
    $results = $webPush->flush();

    // 結果を処理
    $index = 0;
    foreach ($results as $result) {
        if ($result->isSuccess()) {
            $successCount++;
        } else {
            $failedCount++;

            // 410 Gone または 404 Not Found の場合、サブスクリプションを削除
            if ($result->getResponse() &&
                in_array($result->getResponse()->getStatusCode(), [404, 410])) {
                $expiredSubscriptions[] = $index;
            }

            error_log("Push failed: " . $result->getReason());
        }
        $index++;
    }

    // 期限切れのサブスクリプションを削除
    if (!empty($expiredSubscriptions)) {
        foreach (array_reverse($expiredSubscriptions) as $idx) {
            unset($subscriptions[$idx]);
        }
        $subscriptions = array_values($subscriptions); // インデックスを再構築

        file_put_contents(
            $config['subscriptions_file'],
            json_encode($subscriptions, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
    }

    echo json_encode([
        'success' => true,
        'message' => 'Push notifications sent',
        'stats' => [
            'total' => count($results),
            'success' => $successCount,
            'failed' => $failedCount,
            'expired' => count($expiredSubscriptions)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
