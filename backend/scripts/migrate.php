<?php
require_once __DIR__ . '/../src/bootstrap.php';

use Infra\Db;

echo "Running Migration...\n";

try {
    $sql = file_get_contents(__DIR__ . '/../sql/schema.sql');
    if (!$sql) {
        die("Error: schema.sql not found.\n");
    }

    $pdo = Db::pdo();
    // Execute multiple statements
    // PDO might not support multiple statements in one go for some drivers, but SQLite usually does or we split.
    // SQLite can handle exec() with multiple statements.

    $pdo->exec($sql);

    echo "Migration Completed Successfully.\n";
} catch (Exception $e) {
    echo "Migration Failed: " . $e->getMessage() . "\n";
}
