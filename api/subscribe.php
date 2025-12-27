<?php
/**
 * プッシュ通知サブスクリプション登録API
 */

// エラー出力を抑制（JSONのみ返す）
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

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

    if (!$data || !isset($data['subscription'])) {
        throw new Exception('Invalid request data');
    }

    $subscription = $data['subscription'];

    // サブスクリプションの検証
    if (!isset($subscription['endpoint']) || !isset($subscription['keys'])) {
        throw new Exception('Invalid subscription format');
    }

    // 既存のサブスクリプションを読み込み
    $subscriptions = [];
    if (file_exists($config['subscriptions_file'])) {
        $content = file_get_contents($config['subscriptions_file']);
        $subscriptions = json_decode($content, true) ?: [];
    }

    // 重複チェック（同じendpointがある場合は更新）
    $found = false;
    foreach ($subscriptions as $key => $sub) {
        if ($sub['endpoint'] === $subscription['endpoint']) {
            $subscriptions[$key] = $subscription;
            $subscriptions[$key]['updated_at'] = date('Y-m-d H:i:s');
            $found = true;
            break;
        }
    }

    // 新規の場合は追加
    if (!$found) {
        $subscription['created_at'] = date('Y-m-d H:i:s');
        $subscription['updated_at'] = date('Y-m-d H:i:s');
        $subscriptions[] = $subscription;
    }

    // ファイルに保存
    $result = file_put_contents(
        $config['subscriptions_file'],
        json_encode($subscriptions, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
    );

    if ($result === false) {
        throw new Exception('Failed to save subscription');
    }

    echo json_encode([
        'success' => true,
        'message' => 'Subscription saved successfully',
        'total_subscriptions' => count($subscriptions)
    ]);

} catch (Exception $e) {
    error_log('Subscription error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());

    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
} catch (Throwable $e) {
    error_log('Fatal error in subscription: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error: ' . $e->getMessage(),
        'type' => get_class($e)
    ]);
}
