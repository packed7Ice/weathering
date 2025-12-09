<?php
require_once __DIR__ . '/../../../src/bootstrap.php';

use Game\GameState;
use Game\Rules;
use Game\WeatherEffects;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Input: { gameId: string, action: string, payload: any }
    $input = json_decode(file_get_contents('php://input'), true);
    $gameId = $input['gameId'] ?? null;
    $action = $input['action'] ?? null;

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

    // --------------------------------------------------------------------------------
    // Action Dispatch
    // --------------------------------------------------------------------------------

    $response = [
        'success' => true,
        'gameId' => $state->gameId,
        'action' => $action
    ];

    if ($action === 'roll_dice') {
        // 1. Roll Dice
        $dice = Rules::rollDice();
        $response['dice'] = $dice;

        // 2. Fetch Weather (needed for buffs)
        // In optimized version, we might cache this on state, but for now fetch fresh.
        $weatherClient = new \Infra\WeatherApiClient();
        $weatherData = $weatherClient->fetchCurrentWeather();
        $weatherEffects = WeatherEffects::calculateBuffs($weatherData);

        // 3. Resolve Production
        $produced = Rules::resolveProduction($state, $dice, $weatherEffects);
        $response['produced'] = $produced;

        // 4. Save Updates (Resources are updated on player objects in resolveProduction)
        // We need to loop through players and save them
        foreach ($state->players as $index => $p) {
            if (isset($produced[$p['id']])) {
                $state->savePlayer($index);
            }
        }

        // Log message
        $response['message'] = "Rolled $dice. Production distributed.";
    } elseif ($action === 'end_turn') {
        // Basic turn rotation
        $state->activePlayerIndex = ($state->activePlayerIndex + 1) % count($state->players);
        $state->turnCount++;
        $state->save();
        $response['message'] = "Turn ended. Active player is now " . $state->activePlayerIndex;
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Unknown action']);
        exit;
    }

    // After action, save the game state if it was modified
    // (Actions like roll_dice and end_turn already save, but this ensures consistency)
    $state->save();

    echo json_encode(['status' => 'ok', 'newState' => $state, 'actionResponse' => $response]);
}
