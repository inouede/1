<?php
header('Content-Type: application/json');

$file = __DIR__ . '/api/send-push.php';
$content = file_get_contents($file);

echo json_encode([
    'file' => 'api/send-push.php',
    'last_modified' => date('Y-m-d H:i:s', filemtime($file)),
    'file_size' => filesize($file),
    'has_totalSent' => strpos($content, '$totalSent') !== false,
    'has_count_results' => strpos($content, 'count($results)') !== false,
    'version' => 'fixed'
], JSON_PRETTY_PRINT);
