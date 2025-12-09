<?php
require_once __DIR__ . '/../../../src/bootstrap.php';

use Game\GameState;
use Game\Rules;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    file_put_contents(__DIR__ . '/../../../debug.txt', "create_room called at " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);
    // 1. Create Game State
    $game = GameState::create();

    // 2. Generate Board
    // For Phase 1, we just initialize standard resources.
    // In a real impl, we'd save tiles to DB here.
    // Rules::generateBoard($game->gameId);

    // 3. Return ID
    header('Content-Type: application/json');
    echo json_encode([
        'gameId' => $game->gameId,
        'message' => 'Game created successfully'
    ]);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}
