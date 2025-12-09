<?php

// Basic Autoloader
spl_autoload_register(function ($class) {
    // Namespace maps to src/
    // Example: Game\GameState -> src/Game/GameState.php
    // Example: Infra\Db -> src/Infra/Db.php

    $prefix = ''; // Root namespace is implied to be mapped to src
    $base_dir = __DIR__ . '/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

// Load Env
use Infra\Env;
// Expect .env one level up from public, or same level as src/../
Env::load(__DIR__ . '/../.env');

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle Preflight
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Error reporting
ini_set('display_errors', 0); // Do not echo errors to the client (breaks JSON)
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../php-error.log'); // Log to backend/php-error.log
error_reporting(E_ALL);
