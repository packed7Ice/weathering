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
        // 1. Roll Dice (Validation inside Rules::rollDice)
        try {
            $dice = Rules::rollDice($state);
            $response['dice'] = $dice;
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
            exit;
        }

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
    } elseif ($action === 'build') {
        $payload = $input['payload'] ?? [];
        $type = $payload['type'] ?? null;
        $locationId = $payload['locationId'] ?? null;

        if (!$type || !$locationId) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing type or locationId for build']);
            exit;
        }

        try {
            // Assume active player is the one building (for Phase 1 single player)
            // In multiplayer, we should check session or token against $state->activePlayerIndex
            Rules::build($state, $state->activePlayerIndex, $type, $locationId);
            $response['message'] = "Built $type at $locationId";
        } catch (Exception $e) {
            error_log(date('Y-m-d H:i:s') . " Build Error: " . $e->getMessage() . " Payload: " . json_encode($payload) . " GameId: " . $gameId . "\n", 3, __DIR__ . '/../../../logs/error.log');
            http_response_code(400); // Bad Request (e.g. not enough resources)
            echo json_encode(['error' => $e->getMessage()]);
            exit;
        }
    } elseif ($action === 'trade') {
        $payload = $input['payload'] ?? [];
        $offer = $payload['offer'] ?? null;
        $want = $payload['want'] ?? null;

        if (!$offer || !$want) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing offer or want for trade']);
            exit;
        }

        try {
            Rules::bankTrade($state, $state->activePlayerIndex, $offer, $want);
            $response['message'] = "Traded 4 $offer for 1 $want";
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
            exit;
        }
    } elseif ($action === 'buy_dev_card') {
        try {
            $card = Rules::buyDevCard($state, $state->activePlayerIndex);
            $response['message'] = "Bought Development Card";
            $response['card'] = $card; // In real game, only show to active player. Here strict single player, so ok.
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
            exit;
        }
    } elseif ($action === 'play_dev_card') {
        $payload = $input['payload'] ?? [];
        $type = $payload['cardType'] ?? null;
        try {
            $result = Rules::playDevCard($state, $state->activePlayerIndex, $type, $payload);
            $response['message'] = $result['message'];
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
            exit;
        }
    } elseif ($action === 'end_turn') {
        // Basic turn rotation
        $state->activePlayerIndex = ($state->activePlayerIndex + 1) % count($state->players);
        $state->turnCount++;
        $state->turnPhase = 'roll'; // Reset phase
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

    // Check for Victory
    $winCheck = Rules::checkWinCondition($state);
    if ($winCheck['gameOver']) {
        $response['game_over'] = true; // Use valid JSON key
        $response['winner'] = $winCheck['winner'];
        $response['message'] = "Game Over! Winner: " . $winCheck['winner']['name'];
    }

    echo json_encode(['status' => 'ok', 'gameState' => $state, 'actionResponse' => $response]);
}
