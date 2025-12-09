<?php
require_once __DIR__ . '/../src/bootstrap.php';

use Infra\Db;

try {
    $pdo = Db::pdo();
    $stmt = $pdo->query("SELECT name FROM sqlite_master WHERE type='table';");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Tables: " . implode(", ", $tables) . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
