<?php

namespace Game;

class Rules
{
    public static function generateBoard($gameId)
    {
        $db = \Infra\Db::pdo();

        // Standard Catan Resources (19 total)
        $resources = array_merge(
            array_fill(0, 4, 'wood'),
            array_fill(0, 4, 'sheep'),
            array_fill(0, 4, 'wheat'),
            array_fill(0, 3, 'brick'),
            array_fill(0, 3, 'ore'),
            ['desert']
        );
        shuffle($resources);

        // Standard Catan Numbers (18 total, skip desert)
        // 2, 12: 1x
        // 3..11: 2x
        $numbers = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];
        shuffle($numbers);

        // Coordinates for default hex shape (spiral from center)
        // q, r
        $coords = [
            [0, 0], // center
            [1, 0],
            [1, -1],
            [0, -1],
            [-1, 0],
            [-1, 1],
            [0, 1], // inner ring
            [2, 0],
            [2, -1],
            [2, -2],
            [1, -2],
            [0, -2],
            [-1, -1],
            [-2, 0],
            [-2, 1],
            [-2, 2],
            [-1, 2],
            [0, 2],
            [1, 1] // outer ring
        ];

        $stmt = $db->prepare("INSERT INTO tiles (game_id, q, r, resource_type, number_token) VALUES (?, ?, ?, ?, ?)");

        $numIndex = 0;
        foreach ($coords as $index => $coord) {
            if (!isset($resources[$index])) break; // Safety

            $res = $resources[$index];
            $q = $coord[0];
            $r = $coord[1];

            $token = 0;
            if ($res !== 'desert') {
                $token = $numbers[$numIndex] ?? 7;
                $numIndex++;
            }

            $stmt->execute([$gameId, $q, $r, $res, $token]);
        }
    }

    public static function rollDice()
    {
        return rand(1, 6) + rand(1, 6);
    }

    public static function canBuild(GameState $state, $playerIndex, $type, $locationId)
    {
        // 1. Check if location is already taken
        foreach ($state->constructions as $c) {
            if ($c['location_id'] === $locationId) {
                return ['ok' => false, 'error' => 'Location already occupied'];
            }
        }

        // 2. Check Resources
        $player = $state->players[$playerIndex];
        $cost = self::getCost($type);

        foreach ($cost as $res => $amount) {
            $current = $player["resource_$res"] ?? 0;
            if ($current < $amount) {
                return ['ok' => false, 'error' => "Not enough $res. Need $amount, have $current"];
            }
        }

        // 3. Adjacency Validation (Phase 2 Simplified: Skipping strictly for now or just check road connection eventually)
        // For "Phase 2 Initial", we trust the client UI mostly, but in real game we must check graph.

        return ['ok' => true];
    }

    public static function build(GameState $state, $playerIndex, $type, $locationId)
    {
        $check = self::canBuild($state, $playerIndex, $type, $locationId);
        if (!$check['ok']) {
            throw new \Exception($check['error']);
        }

        $player = &$state->players[$playerIndex];
        $cost = self::getCost($type);

        // Deduct Resources
        foreach ($cost as $res => $amount) {
            $player["resource_$res"] -= $amount;
        }
        // Save player resource state (assuming GameState handles array reference update or we explicitly save)
        $state->savePlayer($playerIndex);

        // Add Construction
        $state->addConstruction($type, $locationId, $player['id']);

        // Update Score (Settlement +1, City +2)
        if ($type === 'settlement') {
            $player['score'] += 1;
            $state->savePlayer($playerIndex);
        }
    }

    private static function getCost($type)
    {
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

    public static function resolveProduction(GameState $state, $diceRoll, $weatherBuffs)
    {
        $produced = [];
        // weatherBuffs format: [['type' => 'production_bonus', 'target' => 'wood', 'amount' => 1, ...], ...]

        foreach ($state->board as $tile) {
            // Check if tile number matches dice roll (except 7 which is robber, ignored for now)
            if ($tile['number_token'] == $diceRoll) {
                // Determine base production amount
                $amount = 1;

                // Apply Weather Buffs
                if ($weatherBuffs && isset($weatherBuffs['buffs'])) {
                    foreach ($weatherBuffs['buffs'] as $buff) {
                        if ($buff['type'] === 'production_bonus' && $buff['target'] === $tile['resource_type']) {
                            $amount += $buff['amount'];
                        }
                        if ($buff['type'] === 'production_penalty' && $buff['target'] === $tile['resource_type']) {
                            $amount += $buff['amount']; // amount is negative
                        }
                    }
                }

                if ($amount < 0) $amount = 0;

                // Assign to players who have buildings on this tile
                // For Phase 2 simplification: give to active player if they just rolled? 
                // Or proper Catan: give to ALL players near tile.
                // LIMITATION: Phase 1 didn't implement "constructions" with precise coordinates yet.
                // TEMP FIX: Give resources to ALL players for matched tiles to verify "production works".
                // In real game, we check $state->constructions against $tile->id coordinates.

                if ($amount > 0) {
                    foreach ($state->players as &$player) {
                        // Simplify: Every player gets resource if lucky (Upgrade later to vertex check)
                        $resKey = 'resource_' . $tile['resource_type'];
                        if (isset($player[$resKey])) {
                            $player[$resKey] += $amount;

                            if (!isset($produced[$player['id']])) $produced[$player['id']] = [];
                            if (!isset($produced[$player['id']][$tile['resource_type']])) $produced[$player['id']][$tile['resource_type']] = 0;
                            $produced[$player['id']][$tile['resource_type']] += $amount;
                        }
                    }
                }
            }
        }

        return $produced;
    }
}
