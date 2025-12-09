<?php

// Allow CORS for development (Vite runs on 5173 usually)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Simple Router logic or just include specific files based on path
// For this Phase 1 structure, we might target files directly, but let's have a central loader if needed.
// However, the prompt directory structure suggests `api/game/create_room.php` etc.
// So this index.php might just be a fallback or root test.

echo json_encode(['status' => 'ok', 'message' => 'Weathering API Provider']);
