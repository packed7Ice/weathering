<?php
require_once __DIR__ . '/../../../src/bootstrap.php';

use Game\GameState;
use Game\AiService;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $gameId = $input['gameId'] ?? null;

    if (!$gameId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing gameId']);
        exit;
    }

    $state = GameState::load($gameId);
    if (!$state) {
        http_response_code(404);
        echo json_encode(['error' => 'Game not found']);
        exit;
    }

    // Verify it is NOT player 0's turn
    if ($state->activePlayerIndex === 0) {
        echo json_encode(['status' => 'waiting', 'gameState' => $state, 'message' => 'Human turn']);
        exit;
    }

    try {
        // Execute One Step
        $result = AiService::executeStep($state);

        // State is saved inside executeStep / Rules
        // Reload strict for return
        // No, $state object is mutated.

        echo json_encode([
            'status' => 'ok',
            'gameState' => $state,
            'aiAction' => $result
        ]);
    } catch (Exception $e) {
        file_put_contents('c:/xampp/htdocs/weathering/backend/ai_debug.txt', date('Y-m-d H:i:s') . " - AI API Error: " . $e->getMessage() . "\n", FILE_APPEND);
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
}
