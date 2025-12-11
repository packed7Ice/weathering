<?php

namespace Game;

class AiService
{
    public static function executeStep(GameState $state)
    {
        $playerIndex = $state->activePlayerIndex;

        // Safety: If it's Human's turn (Index 0), do nothing.
        // (Though API shouldn't be called, just safety)
        if ($playerIndex === 0) {
            return ['action' => 'none', 'message' => 'Waiting for human player'];
        }

        // Setup Phase Logic
        if (strpos($state->turnPhase, 'setup') === 0) {
            return self::executeSetupStep($state, $playerIndex);
        }

        // Main Phase Logic
        if ($state->turnPhase === 'main' || $state->turnPhase === 'roll') {
            return self::executeMainStep($state, $playerIndex);
        }

        return ['action' => 'none', 'message' => 'Unknown phase'];
    }

    private static function executeSetupStep(GameState $state, $playerIndex)
    {
        $player = $state->players[$playerIndex];
        self::log("AI Setup Turn: Player $playerIndex ({$player['name']}) - Phase: {$state->turnPhase}");

        // Check construction counts
        $sCount = 0;
        $rCount = 0;
        foreach ($state->constructions as $c) {
            if ($c['player_id'] == $player['id']) {
                if ($c['type'] == 'settlement') $sCount++;
                if ($c['type'] == 'road') $rCount++;
            }
        }
        $limit = ($state->turnPhase === 'setup_1') ? 1 : 2;
        self::log("Counts: S=$sCount, R=$rCount / Limit=$limit");

        // Priority 1: Settlement
        if ($sCount < $limit) {
            self::log("Searching for Settlement spot...");
            $spot = self::findValidLocation($state, $playerIndex, 'settlement');
            if ($spot) {
                self::log("Found Settlement spot: $spot");
                Rules::build($state, $playerIndex, 'settlement', $spot);
                return ['action' => 'build', 'type' => 'settlement', 'locationId' => $spot, 'message' => 'AI built Settlement'];
            } else {
                self::log("ERROR: No valid settlement spots found!");
                throw new \Exception("AI stuck: No valid settlement spots.");
            }
        }

        // Priority 2: Road
        if ($rCount < $limit) {
            self::log("Searching for Road spot...");
            // For Setup Road, we SHOULD place it next to the settlement we just placed (or any of ours).
            // Especially in Setup 2, it implies the second settlement.
            // Let's look for valid road spots adjacent to ANY of our settlements.
            $spot = self::findValidRoadSpotNextToSettlement($state, $player['id']);

            if (!$spot) {
                // Fallback to global search if tailored search fails (though it shouldn't)
                self::log("Fallback: Searching global road spots...");
                $spot = self::findValidLocation($state, $playerIndex, 'road');
            }

            if ($spot) {
                self::log("Found Road spot: $spot");
                Rules::build($state, $playerIndex, 'road', $spot);
                return ['action' => 'build', 'type' => 'road', 'locationId' => $spot, 'message' => 'AI built Road'];
            } else {
                self::log("ERROR: No valid road spots found!");
                throw new \Exception("AI stuck: No valid road spots.");
            }
        }

        // If limit reached but rule didn't auto-advance? 
        // Logic in Rules::build advances turn automatically in setup.
        // If we correspond to Rules, we shouldn't be here if limits met.
        // Check if turn changed?
        self::log("AI Waiting (Limit Reached)");
        return ['action' => 'wait', 'message' => 'Turn advancing...'];
    }

    private static function executeMainStep(GameState $state, $playerIndex)
    {
        self::log("AI Main Turn: Player $playerIndex - Phase: {$state->turnPhase}");

        // 1. Roll Dice
        if ($state->turnPhase === 'roll') {
            $dice = Rules::rollDice($state);
            // In simplified AI, we don't fetch weather buffs or process production here?
            // Wait, Rules::rollDice only generates number.
            // resolve_turn.php handles production.
            // We must replicate that or call a shared helper?
            // Replicating production logic here is messy.
            // BETTER: AiService just tells the API Controller "I want to roll".
            // But here we are "Executing Step".
            // Ideally AiService calls Rules directly.

            // Production Logic Copy (Ideally refactor to minimal)
            // Or let's just do minimal production here.
            $weatherClient = new \Infra\WeatherApiClient();
            $weatherData = $weatherClient->fetchCurrentWeather(); // Mock or Fetch
            $weatherEffects = WeatherEffects::calculateBuffs($weatherData);
            Rules::resolveProduction($state, $dice, $weatherEffects);

            // Auto save happens in Rules
            return ['action' => 'roll_dice', 'dice' => $dice, 'message' => "AI rolled $dice"];
        }

        // 2. Build or Trade
        // Simple AI: Try to build City > Settlement > Road.
        // Check resources.

        $actions = ['city', 'settlement', 'road'];
        foreach ($actions as $type) {
            // Check cost
            if (self::canAfford($state, $playerIndex, $type)) {
                $loc = self::findValidLocation($state, $playerIndex, $type);
                if ($loc) {
                    // Build it
                    Rules::build($state, $playerIndex, $type, $loc);
                    return ['action' => 'build', 'type' => $type, 'message' => "AI built $type"];
                }
            }
        }

        // 3. End Turn
        // If we did nothing above, end turn.
        $state->activePlayerIndex = ($state->activePlayerIndex + 1) % count($state->players);
        $state->turnCount++;
        $state->turnPhase = 'roll';
        $state->save();

        return ['action' => 'end_turn', 'message' => 'AI ended turn'];
    }

    private static function canAfford(GameState $state, $playerIndex, $type)
    {
        $player = $state->players[$playerIndex];
        $cost = self::getCost($type);
        foreach ($cost as $res => $amt) {
            if (($player["resource_$res"] ?? 0) < $amt) return false;
        }
        return true;
    }

    private static function getCost($type)
    {
        // Duplicate of Rules::getCost, should have made public/shareable.
        // Rules::getCost is private? No, private. 
        // Hardcode for AI now.
        switch ($type) {
            case 'road':
                return ['wood' => 1, 'brick' => 1];
            case 'settlement':
                return ['wood' => 1, 'brick' => 1, 'wheat' => 1, 'sheep' => 1];
            case 'city':
                return ['wheat' => 2, 'ore' => 3];
            default:
                return [];
        }
    }

    private static function findValidLocation(GameState $state, $playerIndex, $type)
    {
        // Scan board. Brute force.
        // Range q=-2..2, r=-2..2.
        // Vertices 0..5. Edges 0..5.

        $candidates = [];

        // Optimize: If road, finding edges. If settlement/city, vertices.
        // Scan radius 3 (enough for standard board)
        for ($q = -3; $q <= 3; $q++) {
            for ($r = -3; $r <= 3; $r++) {
                // Check if tile exists (simple range check or board check)
                // Board has tiles.
                // Just try 0..5 locally.

                if ($type === 'road') {
                    for ($e = 0; $e < 6; $e++) {
                        $locId = "{$q}_{$r}_e_{$e}";
                        $check = Rules::canBuild($state, $playerIndex, $type, $locId);
                        if ($check['ok']) return $locId; // Greedy: Return first found
                    }
                } else {
                    for ($v = 0; $v < 6; $v++) {
                        $locId = "{$q}_{$r}_v_{$v}";
                        $check = Rules::canBuild($state, $playerIndex, $type, $locId);
                        if ($check['ok']) return $locId;
                    }
                }
            }
        }
        return null; // None found
    }

    private static function findValidRoadSpotNextToSettlement(GameState $state, $playerId)
    {
        // Find player's settlements
        foreach ($state->constructions as $c) {
            if ($c['player_id'] == $playerId && ($c['type'] === 'settlement' || $c['type'] === 'city')) {
                // Determine adjacent edges for this vertex
                // Replicate Rules::getAttachedEdgesOfVertex logic roughly
                // Vertex ID: q_r_v_vIndex
                if (preg_match('/^(-?\d+)_(-?\d+)_v_(\d+)$/', $c['location_id'], $m)) {
                    $q = (int)$m[1];
                    $r = (int)$m[2];
                    $v = (int)$m[3];

                    // Helper logic copy with 3rd edge support
                    $edges = self::getAdjacentEdgesOfVertex($q, $r, $v);

                    // Check each edge
                    foreach ($edges as $eId) {
                        // We need normalized edge ID to call Rules::canBuild reliably?
                        // Rules::canBuild calls normalizeEdgeId.
                        $check = Rules::canBuild($state, $state->getPlayerIndex($playerId), 'road', $eId);
                        if ($check['ok']) return $eId;
                    }
                }
            }
        }
        return null;
    }

    private static function getAdjacentEdgesOfVertex($q, $r, $v)
    {
        $edges = [];

        // 1. Local Edge 1 (Incoming)
        $e1 = ($v + 5) % 6;
        $edges[] = "{$q}_{$r}_e_{$e1}";

        // 2. Local Edge 2 (Outgoing)
        $e2 = $v;
        $edges[] = "{$q}_{$r}_e_{$e2}";

        // 3. Neighbor Edge (The 3rd edge radiating from this vertex)
        // Neighbor coordinates based on vertex direction
        $nq = $q;
        $nr = $r;
        $ne = 0;

        switch ($v) {
            case 0:
                $nr--;
                $ne = 3;
                break;       // Top Vertex -> Top Neighbor (Bottom Edge)
            case 1:
                $nq++;
                $nr--;
                $ne = 4;
                break; // TR Vertex -> TR Neighbor (BL Edge)
            case 2:
                $nq++;
                $ne = 5;
                break;       // BR Vertex -> BR Neighbor (TL Edge)
            case 3:
                $nr++;
                $ne = 0;
                break;       // Bottom Vertex -> Bottom Neighbor (Top Edge)
            case 4:
                $nq--;
                $nr++;
                $ne = 1;
                break; // BL Vertex -> BL Neighbor (TR Edge)
            case 5:
                $nq--;
                $ne = 2;
                break;       // TL Vertex -> TL Neighbor (BR Edge)
        }
        $edges[] = "{$nq}_{$nr}_e_{$ne}";

        return $edges;
    }

    private static function log($msg)
    {
        file_put_contents('c:/xampp/htdocs/weathering/backend/ai_debug.txt', date('Y-m-d H:i:s') . " - " . $msg . "\n", FILE_APPEND);
    }
}
