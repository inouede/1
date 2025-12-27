<?php
/**
 * Web Push 設定ファイル
 */

return [
    // VAPIDキー
    'vapid' => [
        'subject' => 'mailto:u-akamatsu@inoue-de.com',
        'publicKey' => 'BNF2KP-UyNhY4w7khRCa7G-vkRoHHFOpzklLfnM-VXnjKe3rVt0iyK2WLFJTv3MKf9UNZn-tx5lrGWCPrsKLK0I',
        'privateKey' => '4H3SEmzhpzaIX3ELlISahB9JnjpjacWJo9EQY6a1mAE',
    ],

    // サブスクリプション保存ファイル
    'subscriptions_file' => __DIR__ . '/data/subscriptions.json',

    // デフォルト通知設定
    'notification' => [
        'ttl' => 2419200, // Time to live (秒) - 4週間
    ],
];
