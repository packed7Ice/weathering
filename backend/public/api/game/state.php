<?php
require_once __DIR__ . '/../../../src/bootstrap.php';

use Game\GameState;
use Infra\WeatherApiClient;
use Game\WeatherEffects;

header('Content-Type: application/json');

$gameId = $_GET['gameId'] ?? null;

if (!$gameId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing gameId']);
    exit;
}

// 1. Load Game State
$state = GameState::load($gameId);
if (!$state) {
    http_response_code(404);
    echo json_encode(['error' => 'Game not found']);
    exit;
}

// 2. Fetch Weather
$weatherClient = new WeatherApiClient();
$weatherData = $weatherClient->fetchCurrentWeather();

// 3. Calculate Buffs
$weatherBuffs = null;
if ($weatherData) {
    $weatherBuffs = WeatherEffects::calculateBuffs($weatherData);
    // Ideally save snapshot to DB here
}

// 4. Return Combined Data
echo json_encode([
    'gameState' => [
        'gameId' => $state->gameId,
        'turnCount' => $state->turnCount,
        'season' => $state->season,
        'players' => $state->players,
        'board' => $state->board,
        'constructions' => $state->constructions
    ],
    'weather' => $weatherBuffs
]);
