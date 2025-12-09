<?php

namespace Game;

class Rules
{
    public static function generateBoard($gameId)
    {
        // Generate standard hexagonal board (e.g. 3-4-5-4-3 layout or simple 3 rings)
        // For Catan, usually 19 tiles.
        // Resources: 4 Wood, 4 Sheep, 4 Wheat, 3 Brick, 3 Ore, 1 Desert
        // Numbers: 2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12

        // Return array of tiles config
        // This function should INSERT into DB
    }

    public static function rollDice()
    {
        return rand(1, 6) + rand(1, 6);
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
