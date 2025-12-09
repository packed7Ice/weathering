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

    public static function rollDice(GameState $state)
    {
        if ($state->turnPhase !== 'roll') {
            throw new \Exception("Already rolled this turn.");
        }
        $state->turnPhase = 'main';
        $state->save();

        return rand(1, 6) + rand(1, 6);
    }

    public static function canBuild(GameState $state, $playerIndex, $type, $locationId)
    {
        $player = $state->players[$playerIndex];

        // 1. Check if location is already taken
        $existing = null;
        foreach ($state->constructions as $c) {
            if ($c['location_id'] === $locationId) {
                $existing = $c;
                break;
            }
        }

        if ($type === 'city') {
            if (!$existing) return ['ok' => false, 'error' => 'Must upgrade an existing settlement'];
            if ($existing['type'] !== 'settlement') return ['ok' => false, 'error' => 'Can only upgrade settlements'];
            if ($existing['player_id'] != $player['id']) return ['ok' => false, 'error' => 'Not your settlement'];
        } else {
            if ($existing) return ['ok' => false, 'error' => 'Location already occupied'];
        }

        // 2. Check Resources
        $cost = self::getCost($type);

        foreach ($cost as $res => $amount) {
            $current = $player["resource_$res"] ?? 0;
            if ($current < $amount) {
                return ['ok' => false, 'error' => "Not enough $res. Need $amount, have $current"];
            }
        }

        // 3. Adjacency Validation (Phase 2 Simplified)
        return ['ok' => true];
    }

    public static function build(GameState $state, $playerIndex, $type, $locationId)
    {
        if ($state->turnPhase !== 'main') {
            throw new \Exception("Must roll dice first.");
        }

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

        if ($type === 'city') {
            $state->upgradeConstruction($locationId, 'city');
            $player['score'] += 1; // 1 (settlement) -> 2 (city), so add 1
        } else {
            $state->addConstruction($type, $locationId, $player['id']);
            if ($type === 'settlement') {
                $player['score'] += 1;
            }
        }

        // Save player
        $state->savePlayer($playerIndex);
    }

    public static function bankTrade(GameState $state, $playerIndex, $offerType, $wantType)
    {
        if ($state->turnPhase !== 'main') {
            throw new \Exception("Must roll dice first.");
        }

        $player = &$state->players[$playerIndex];

        // 1. Validate Resources (Bank Trade 4:1)
        if (!isset($player["resource_$offerType"]) || $player["resource_$offerType"] < 4) {
            throw new \Exception("Not enough $offerType to trade (Need 4)");
        }

        // 2. Execute Trade
        $player["resource_$offerType"] -= 4;

        if (!isset($player["resource_$wantType"])) $player["resource_$wantType"] = 0;
        $player["resource_$wantType"] += 1;

        // 3. Save
        $state->savePlayer($playerIndex);
    }

    public static function buyDevCard(GameState $state, $playerIndex)
    {
        if ($state->turnPhase !== 'main') {
            throw new \Exception("Must roll dice first.");
        }

        $player = &$state->players[$playerIndex];

        // 1. Check Resources (Sheep, Wheat, Ore)
        if (($player['resource_sheep'] ?? 0) < 1 || ($player['resource_wheat'] ?? 0) < 1 || ($player['resource_ore'] ?? 0) < 1) {
            throw new \Exception("Not enough resources. Need Sheep, Wheat, Ore.");
        }

        // 2. Check Deck
        if (empty($state->devDeck)) {
            throw new \Exception("No development cards left.");
        }

        // 3. Deduct Resources
        $player['resource_sheep']--;
        $player['resource_wheat']--;
        $player['resource_ore']--;

        // 4. Draw Card
        $card = array_shift($state->devDeck);
        if (!isset($player['dev_cards'])) $player['dev_cards'] = [];
        $player['dev_cards'][] = ['type' => $card, 'bought_turn' => $state->turnCount, 'played' => false];

        // 5. Save
        $state->savePlayer($playerIndex);
        $state->save(); // Save deck state

        return $card;
    }

    public static function checkWinCondition(GameState $state)
    {
        // Victory Point Goal
        $goal = 10;

        foreach ($state->players as $player) {
            // Base score from buildings (updated in build())
            $vp = $player['score'];

            // Add other logical VPs here (Longest Road, Largest Army, Development Cards)
            // For Phase 2, we just rely on the stored 'score'.

            if ($vp >= $goal) {
                return [
                    'gameOver' => true,
                    'winner' => [
                        'id' => $player['id'],
                        'name' => $player['name'] ?? 'Player ' . ($state->getPlayerIndex($player['id']) + 1),
                        'score' => $vp
                    ]
                ];
            }
        }

        return ['gameOver' => false];
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

                // Check all vertices of this tile for constructions
                // HexTile generates vertices 0-5. ID format: q_r_v_i
                for ($i = 0; $i < 6; $i++) {
                    $vertexId = "{$tile['q']}_{$tile['r']}_v_{$i}";

                    // Find construction at this vertex
                    foreach ($state->constructions as $c) {
                        if ($c['location_id'] === $vertexId) {
                            $multiplier = ($c['type'] === 'city') ? 2 : 1;
                            $finalAmount = $amount * $multiplier;

                            if ($finalAmount > 0) {
                                // Find owner of construction
                                $ownerIndex = $state->getPlayerIndex($c['player_id']);
                                if ($ownerIndex !== -1) {
                                    $player = &$state->players[$ownerIndex];
                                    $resKey = 'resource_' . $tile['resource_type'];

                                    if (isset($player[$resKey])) {
                                        $player[$resKey] += $finalAmount;

                                        // Track production
                                        if (!isset($produced[$player['id']])) $produced[$player['id']] = [];
                                        if (!isset($produced[$player['id']][$tile['resource_type']])) $produced[$player['id']][$tile['resource_type']] = 0;
                                        $produced[$player['id']][$tile['resource_type']] += $finalAmount;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return $produced;
    }
}
