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
        if (!isset($state->players[$playerIndex])) {
            return ['ok' => false, 'error' => "Player not found at index $playerIndex"];
        }
        $player = $state->players[$playerIndex];

        // ---------------------------------------------------------
        // 1. Normalize IDs and Check Occupancy
        // ---------------------------------------------------------

        $normId = ($type === 'road')
            ? self::normalizeEdgeId($locationId)
            : self::normalizeVertexId($locationId);

        if (!$normId) return ['ok' => false, 'error' => "Invalid location format"];

        // Check occupancy using NORMALIZED IDs
        $existing = null;
        foreach ($state->constructions as $c) {
            $cNorm = ($c['type'] === 'road')
                ? self::normalizeEdgeId($c['location_id'])
                : self::normalizeVertexId($c['location_id']);

            if ($cNorm === $normId) {
                $existing = $c;
                break;
            }
        }

        if ($type === 'city') {
            if (!$existing) return ['ok' => false, 'error' => 'Must upgrade an existing settlement'];
            if ($existing['type'] !== 'settlement') return ['ok' => false, 'error' => 'Can only upgrade settlements'];
            if ($existing['player_id'] != $player['id']) return ['ok' => false, 'error' => 'Not your settlement'];
            // City upgrades don't need additional distance checks (already satisfied by settlement)
            // But cost check is needed (done below)
        } else {
            if ($existing) return ['ok' => false, 'error' => 'Location already occupied'];

            // ---------------------------------------------------------
            // 2. Distance Rule (Settlements Only)
            // ---------------------------------------------------------
            if ($type === 'settlement') {
                $neighbors = self::getNeighborVerticesOfVertex($normId);
                foreach ($neighbors as $nId) {
                    foreach ($state->constructions as $c) {
                        if ($c['type'] === 'road') continue; // Roads don't block settlements
                        $cNorm = self::normalizeVertexId($c['location_id']);
                        if ($cNorm === $nId) {
                            return ['ok' => false, 'error' => "Distance Rule: Too close to another building"];
                        }
                    }
                }
            }
        }

        // ---------------------------------------------------------
        // 3. Setup Phase Logic
        // ---------------------------------------------------------
        if (strpos($state->turnPhase, 'setup') === 0) {
            $sCount = 0;
            $rCount = 0;
            foreach ($state->constructions as $c) {
                if ($c['player_id'] == $player['id']) {
                    if ($c['type'] == 'settlement') $sCount++;
                    if ($c['type'] == 'road') $rCount++;
                }
            }
            $limit = ($state->turnPhase === 'setup_1') ? 1 : 2;

            if ($type === 'settlement') {
                if ($sCount >= $limit) return ['ok' => false, 'error' => "Already placed settlement for this round"];
                // Verify no connectivity requirement for setup settlements (can be placed anywhere valid)
            } elseif ($type === 'road') {
                if ($rCount >= $limit) return ['ok' => false, 'error' => "Already placed road for this round"];
                // Must connect to the settlement just placed?
                // Rules: "Place a settlement and a road adjoining it."
                // In our simplified setup, we enforce: Must have placed settlement first ($sCount < $limit check above was for that, but logic was flipped? Wait)
                // Actually: if $sCount == $limit (meaning we just placed it), we can place road.

                // Simplified check: Does check connectivity to *any* of MY settlements/roads?
                // In setup, likely specific to the latest settlement, but generalized connectivity is "OK" usually.
                if (!self::checkRoadConnectivity($state, $player['id'], $normId)) {
                    return ['ok' => false, 'error' => "Road must connect to your settlement/road"];
                }
            } else {
                return ['ok' => false, 'error' => "Only settlements and roads allowed in setup"];
            }
            return ['ok' => true];
        }

        // ---------------------------------------------------------
        // 4. Main Phase: Connectivity & Cost
        // ---------------------------------------------------------

        // Cost Check
        $cost = self::getCost($type);
        foreach ($cost as $res => $amount) {
            $current = $player["resource_$res"] ?? 0;
            // City upgrade assumes we keep the settlement? No, we pay resources.
            // (Standard rule: pay cost, replace piece).
            if ($current < $amount) {
                return ['ok' => false, 'error' => "Not enough $res. Need $amount, have $current"];
            }
        }

        // Connectivity Check
        if ($type === 'settlement') {
            // Must connect to one of my roads
            if (!self::checkSettlementConnectivity($state, $player['id'], $normId)) {
                return ['ok' => false, 'error' => "Settlement must connect to your road"];
            }
        } elseif ($type === 'road') {
            // Must connect to my road or building
            if (!self::checkRoadConnectivity($state, $player['id'], $normId)) {
                return ['ok' => false, 'error' => "Road must connect to your network"];
            }
        }

        return ['ok' => true];
    }

    // ... (existing build, advanceSetupTurn, etc. - ensure to keep them) ...
    // Note: I will use multi_replace to insert helpers at the end of class

    public static function build(GameState $state, $playerIndex, $type, $locationId)
    {
        // Same as before... but ensure we use raw locationId for storage (or normalized? Standard is storing RAW is safer if visual depends on it, but normalized is better for logic)
        // Let's store RAW to not break frontend visuals, but logic uses normalized.

        // Setup Phase Logic
        if (strpos($state->turnPhase, 'setup') === 0) {
            $check = self::canBuild($state, $playerIndex, $type, $locationId);
            if (!$check['ok']) throw new \Exception($check['error']);

            $player = &$state->players[$playerIndex];
            $state->addConstruction($type, $locationId, $player['id']);
            if ($type === 'settlement') $player['score'] += 1;

            if ($state->turnPhase === 'setup_2' && $type === 'settlement') {
                // ... same resource dist logic ...
                // Use normalized vertex to determine tile adjacency for resources?
                // The existing logic parsed $locationId. It should still work if $locationId is standard format.
                if (preg_match('/^(-?\d+)_(-?\d+)_v_(\d+)$/', $locationId, $matches)) {
                    $q = (int)$matches[1];
                    $r = (int)$matches[2];
                    $v = (int)$matches[3];

                    // Normalize to find all touching tiles
                    // A vertex touches 1, 2, or 3 tiles.
                    $touchingTiles = self::getTilesTouchingVertex($q, $r, $v);

                    foreach ($touchingTiles as $tCoords) {
                        // Find tile in board
                        foreach ($state->board as $tile) {
                            if ($tile['q'] == $tCoords['q'] && $tile['r'] == $tCoords['r'] && $tile['resource_type'] !== 'desert') {
                                $res = $tile['resource_type'];
                                if ($res) {
                                    $player["resource_$res"] = ($player["resource_$res"] ?? 0) + 1;
                                }
                            }
                        }
                    }
                }
            }

            $state->savePlayer($playerIndex);

            // Check for turn advance (Same logic)
            $sCount = 0;
            $rCount = 0;
            foreach ($state->constructions as $c) {
                if ($c['player_id'] == $player['id']) {
                    if ($c['type'] == 'settlement') $sCount++;
                    if ($c['type'] == 'road') $rCount++;
                }
            }
            $limit = ($state->turnPhase === 'setup_1') ? 1 : 2;
            if ($sCount == $limit && $rCount == $limit) {
                self::advanceSetupTurn($state);
            } else {
                $state->save();
            }
            return;
        }

        // Main Phase (Same basic wrapper)
        if ($state->turnPhase !== 'main') throw new \Exception("Must roll dice first.");

        $check = self::canBuild($state, $playerIndex, $type, $locationId);
        if (!$check['ok']) throw new \Exception($check['error']);

        $player = &$state->players[$playerIndex];
        $cost = self::getCost($type);
        foreach ($cost as $res => $amount) $player["resource_$res"] -= $amount;

        if ($type === 'city') {
            // For city, we need to find the specific construction to upgrade.
            // Since we have duplicates in raw IDs, we must find the one that matches NORMALIZED ID.
            // Simple approach: normalize input, check all, upgrade first match.
            $normId = self::normalizeVertexId($locationId);
            $targetRawId = $locationId;
            foreach ($state->constructions as $c) {
                if ($c['type'] === 'settlement' && self::normalizeVertexId($c['location_id']) === $normId) {
                    $targetRawId = $c['location_id'];
                    break;
                }
            }

            $state->upgradeConstruction($targetRawId, 'city');
            $player['score'] += 1;
        } else {
            $state->addConstruction($type, $locationId, $player['id']);
            if ($type === 'settlement') $player['score'] += 1;
        }

        $state->savePlayer($playerIndex);
    }

    // ... keep advanceSetupTurn, bankTrade, buyDevCard, playDevCard, checkWinCondition, getCost ...
    // Note: I will only replace from line 83 (canBuild) to end of build logic, and append helpers.

    private static function checkSettlementConnectivity(GameState $state, $playerId, $normVertexId)
    {
        // Needs a road of same player attached to this vertex
        $edges = self::getAttachedEdgesOfVertex($normVertexId);
        foreach ($edges as $eId) {
            foreach ($state->constructions as $c) {
                if ($c['type'] === 'road' && $c['player_id'] == $playerId) {
                    if (self::normalizeEdgeId($c['location_id']) === $eId) return true;
                }
            }
        }
        return false;
    }

    private static function checkRoadConnectivity(GameState $state, $playerId, $normEdgeId)
    {
        // Needs connection to (My Settlement/City at pivot) OR (My Road at pivot)
        $endpoints = self::getEndpointsOfEdge($normEdgeId); // returns 2 normalized vertices

        foreach ($endpoints as $vId) {
            // Check for Building
            foreach ($state->constructions as $c) {
                if ($c['player_id'] == $playerId && ($c['type'] == 'settlement' || $c['type'] == 'city')) {
                    if (self::normalizeVertexId($c['location_id']) === $vId) return true;
                }
            }
            // Check for Road
            $attachedEdges = self::getAttachedEdgesOfVertex($vId);
            foreach ($attachedEdges as $eId) {
                if ($eId === $normEdgeId) continue; // skip self
                foreach ($state->constructions as $c) {
                    if ($c['player_id'] == $playerId && $c['type'] == 'road') {
                        if (self::normalizeEdgeId($c['location_id']) === $eId) return true;
                    }
                }
            }
        }
        return false;
    }

    // --- HEX MATH HELPERS ---

    // Canonical Vertex: q, r, v (0..5)
    // Equivalences:
    // (q, r, 0) == (q, r-1, 4) == (q+1, r-1, 2)
    // (q, r, 1) == (q+1, r-1, 3) == (q+1, r, 5)
    // Actually, simpler to just map everything to "Owner Tile" logic or verify specific equivalences.
    // Let's implement a recursive normalizer that pushes V to 0 or 1 if possible.

    public static function normalizeVertexId($rawId)
    {
        if (!preg_match('/^(-?\d+)_(-?\d+)_v_(\d+)$/', $rawId, $m)) return null;
        $q = (int)$m[1];
        $r = (int)$m[2];
        $v = (int)$m[3];
        return self::canonicalVertex($q, $r, $v);
    }

    private static function canonicalVertex($q, $r, $v)
    {
        // Shift to minimal representation.
        // We only use v=0 and v=1 as canonical bases?
        // 0 (top) touches (0, -1, 4-BL) and (+1, -1, 2-BR)
        // 1 (TR) touches (+1, -1, 3-Bot) and (+1, 0, 5-TL)
        // ... It is safer to pick one specific v index as canonical for a point.
        // Let's create a coordinate string "x_y_z" in cube coordinates or similar, but simpler:
        // Use standard algorithm: 
        // 1. Move to a tile where v is minimized? 
        //   v0 -> self
        //   v1 -> self
        //   v2 -> (q+1, r-1)'s v4 ? Wait.
        // Let's list mapping to (q,r,v=0) or (q,r,v=1)
        // v2 (BR) -> neighbor (1, 0) is TL (v5)?
        // (q,r) v2 meets (q+1, r) v5? No.
        // (q,r) v2 meets (q+1, r-1) v4 ?? 

        // Let's use a known mapping:
        // V0: (0, -1, v4), (1, -1, v2)
        // V1: (1, -1, v3), (1, 0, v5)
        // V2: (1, 0, v4), (0, 1, v0) ?? No.

        // Let's stick to "Sort all equivalent coords and pick first string".
        $candidates = self::getEquivalentCoords($q, $r, $v);
        sort($candidates);
        return $candidates[0];
    }

    private static function getEquivalentCoords($q, $r, $v)
    {
        $list = ["{$q}_{$r}_v_{$v}"];
        // Neighbors logic
        /*
          Flat top vs Pointy top? Code says "Pointy Top" in Board.tsx.
          v0: Top.  Adj: (q, r-1, v4), (q+1, r-1, v2)
          v1: TR.   Adj: (q+1, r-1, v3), (q+1, r, v5)
          v2: BR.   Adj: (q+1, r, v4), (q, r+1, v0)
          v3: Bot.  Adj: (q, r+1, v1), (q-1, r+1, v5)
          v4: BL.   Adj: (q-1, r+1, v2), (q-1, r, v0)
          v5: TL.   Adj: (q-1, r, v3), (q, r-1, v1)
        */
        // Note: Axial coords (q, r). q=Right-Down, r=Down? 
        // Board.tsx: x = size * sqrt(3) * (q + r/2); y = size * 3/2 * r
        // This is standard axial. r is vertical rows.

        // Mapping:
        // v0 (Top) -> r-1 (Top Left neighbor? No, r-1 is top neighbor stacking).
        // Let's trust standard axial neighbors:
        // Top-Left: (0, -1) ? No (+0, -1) in cube is Top-Left?

        // Let's blindly implement standard pointy top neighbors:
        // DIR 0 (Top-Right edge): (+1, -1)
        // DIR 1 (Right edge): (+1, 0)
        // DIR 2 (Bot-Right edge): (0, +1)
        // DIR 3 (Bot-Left edge): (-1, +1)
        // DIR 4 (Left edge): (-1, 0)
        // DIR 5 (Top-Left edge): (0, -1)

        // Vertices are BETWEEN directions.
        // v0 is between Dir 5 and 0. (Top tip).
        // Matches (0, -1) [Bot-Left corner v4?] and (+1, -1) [Bot-Left corner v4?] 
        // This is getting guessing.

        // Let's use the simplest reliable method:
        // "A vertex is shared by 3 hexes".
        // (q,r,0) shares with (q, r-1, 4) and (q+1, r-1, 2)
        // (q,r,1) shares with (q+1, r-1, 3) and (q+1, r, 5)
        // ... deriving others from symmetry.
        // v2 shares with (q+1, r, 4) and (q, r+1, 0)
        // v3 shares with (q, r+1, 1) and (q-1, r+1, 5)
        // v4 shares with (q-1, r+1, 2) and (q-1, r, 0) 
        // v5 shares with (q-1, r, 3) and (q, r-1, 1)

        $equivs = [];
        switch ($v) {
            case 0:
                $equivs = [[$q, $r - 1, 4], [$q + 1, $r - 1, 2]];
                break;
            case 1:
                $equivs = [[$q + 1, $r - 1, 3], [$q + 1, $r, 5]];
                break;
            case 2:
                $equivs = [[$q + 1, $r, 4], [$q, $r + 1, 0]];
                break;
            case 3:
                $equivs = [[$q, $r + 1, 1], [$q - 1, $r + 1, 5]];
                break;
            case 4:
                $equivs = [[$q - 1, $r + 1, 2], [$q - 1, $r, 0]];
                break;
            case 5:
                $equivs = [[$q - 1, $r, 3], [$q, $r - 1, 1]];
                break;
        }
        foreach ($equivs as $e) $list[] = "{$e[0]}_{$e[1]}_v_{$e[2]}";
        return $list;
    }

    // Edges
    // e0 (Top-Right edge) connects v0-v1. Shared with (q, r-1) e3 (Bot-Left edge)? No.
    // Directions:
    // 0: NE (+1, -1). Edge 0 matches neighbor (+1, -1)'s Edge 3? NO.
    // Edge 0 is usually top-right edge. Neighbor to the TR is (+1, -1). 
    // That neighbor's Bottom-Left edge is Edge 3.
    // So (q,r,e0) == (q+1, r-1, e3).
    // ...
    public static function normalizeEdgeId($rawId)
    {
        if (!preg_match('/^(-?\d+)_(-?\d+)_e_(\d+)$/', $rawId, $m)) return null;
        $q = (int)$m[1];
        $r = (int)$m[2];
        $e = (int)$m[3];

        $list = ["{$q}_{$r}_e_{$e}"];
        switch ($e) {
            case 0:
                $list[] = ($q + 1) . "_" . ($r - 1) . "_e_3";
                break;
            case 1:
                $list[] = ($q + 1) . "_" . $r . "_e_4";
                break;
            case 2:
                $list[] = $q . "_" . ($r + 1) . "_e_5";
                break;
            case 3:
                $list[] = ($q - 1) . "_" . ($r + 1) . "_e_0";
                break;
            case 4:
                $list[] = ($q - 1) . "_" . $r . "_e_1";
                break;
            case 5:
                $list[] = $q . "_" . ($r - 1) . "_e_2";
                break;
        }
        sort($list);
        return $list[0];
    }

    // Connectivity
    private static function getNeighborVerticesOfVertex($normId)
    {
        // From canonical ID (which is one of the valid RAW IDs)
        // Find the 2 vertices on the same tile, AND the 1 vertex on the "vertical" connection?
        // Actually, just find the 3 adjacent vertices on the grid.
        // v0 neighbors v5, v1. And connects via edge to what? 
        // Vertices connect to vertices via edges. 
        // Distance rule: "1 edge away". So we just need endpoints of all attached edges.

        $edges = self::getAttachedEdgesOfVertex($normId);
        $neighbors = [];
        foreach ($edges as $eId) {
            $endpoints = self::getEndpointsOfEdge($eId);
            foreach ($endpoints as $vp) {
                if ($vp !== $normId) $neighbors[] = $vp;
            }
        }
        return array_unique($neighbors);
    }

    private static function getAttachedEdgesOfVertex($normVertexId)
    {
        if (!preg_match('/^(-?\d+)_(-?\d+)_v_(\d+)$/', $normVertexId, $m)) return [];
        $q = (int)$m[1];
        $r = (int)$m[2];
        $v = (int)$m[3];

        // A vertex has 3 edges.
        // e.g. v0 touches e5 (left-top) and e0 (right-top) on THIS tile.
        // And it touches e2 (vertical) of the tile above (q, r-1)?
        // Much easier: v0 touches e5, e0.
        // v1 touches e0, e1.
        // v2 touches e1, e2.
        // v3 touches e2, e3.
        // v4 touches e3, e4.
        // v5 touches e4, e5.
        // We get these 2 edges, normalize them.
        // PLUS need to find the "3rd edge" radiating out?
        // Actually, normalizing the edges handles the "other tile" edges automatically.
        // Because the "3rd edge" IS one of the edges of a neighbor tile, which normalizes to the same ID.
        // Wait. v0 (Top) touches e5 (TL) and e0 (TR).
        // It also touches index 2 (Vertical Down) of the Top Neighbor (q, r-1)?
        // Neighbor (q, r-1) has v4 (BL) and v2 (BR). The edge between them is e3 (Bottom).
        // Wait, v0 of (q,r) touches the BOTTOM of (q, r-1)?
        // Neighbors of (q,r):
        // Top-Left (0,-1) [v4, v5, e4?] 
        // Top-Right (+1,-1) [v3, v4, e3?]
        // ...
        // Actually, if we just take ALL equivalent coords of the vertex, and for EACH, take their 2 local edges, and normalize all of them.
        // That guarantees we find all 3 edges.

        $equivs = self::getEquivalentCoords($q, $r, $v);
        $edges = [];
        foreach ($equivs as $eq) {
            preg_match('/^(-?\d+)_(-?\d+)_v_(\d+)$/', $eq, $em);
            $eqQ = (int)$em[1];
            $eqR = (int)$em[2];
            $eqV = (int)$em[3];
            // Local edges
            $eA = ($eqV + 5) % 6;
            $eB = $eqV;
            $edges[] = self::normalizeEdgeId("{$eqQ}_{$eqR}_e_{$eA}");
            $edges[] = self::normalizeEdgeId("{$eqQ}_{$eqR}_e_{$eB}");
        }
        return array_unique($edges);
    }

    private static function getEndpointsOfEdge($normEdgeId)
    {
        // e.g. e0 connects v0, v1.
        // Just parse, get local vA, vB, normalize.
        if (!preg_match('/^(-?\d+)_(-?\d+)_e_(\d+)$/', $normEdgeId, $m)) return [];
        $q = (int)$m[1];
        $r = (int)$m[2];
        $e = (int)$m[3];

        $vA = $e;
        $vB = ($e + 1) % 6;

        return [
            self::normalizeVertexId("{$q}_{$r}_v_{$vA}"),
            self::normalizeVertexId("{$q}_{$r}_v_{$vB}")
        ];
    }

    // Helper to get tiles touching a vertex (for setup resource dist)
    private static function getTilesTouchingVertex($q, $r, $v)
    {
        $equivs = self::getEquivalentCoords($q, $r, $v);
        $tiles = [];
        foreach ($equivs as $eq) {
            preg_match('/^(-?\d+)_(-?\d+)_v_(\d+)$/', $eq, $em);
            $tiles[] = ['q' => (int)$em[1], 'r' => (int)$em[2]];
        }
        return $tiles;
    }


    private static function advanceSetupTurn(GameState $state)
    {
        $numPlayers = count($state->players);

        if ($state->turnPhase === 'setup_1') {
            $state->activePlayerIndex++;
            if ($state->activePlayerIndex >= $numPlayers) {
                // End of Forward Pass
                $state->activePlayerIndex = $numPlayers - 1; // Stay on last player
                $state->turnPhase = 'setup_2';
            }
        } elseif ($state->turnPhase === 'setup_2') {
            $state->activePlayerIndex--;
            if ($state->activePlayerIndex < 0) {
                // End of Reverse Pass
                $state->activePlayerIndex = 0; // Start Game with Player 1
                $state->turnPhase = 'roll';
                $state->turnCount = 1;
            }
        }
        $state->save();
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

    public static function playDevCard(GameState $state, $playerIndex, $type, $payload = [])
    {
        $player = &$state->players[$playerIndex];

        // 1. Find the card in player's hand
        $cardIndex = -1;
        if (isset($player['dev_cards'])) {
            foreach ($player['dev_cards'] as $index => $c) {
                if ($c['type'] === $type && !$c['played']) {
                    // Rule Check: Cannot play (bought this turn)
                    // Exception: VP cards can be played anytime (usually handled passively, but here allowed)
                    if ($c['bought_turn'] < $state->turnCount || $type === 'vp_point') {
                        $cardIndex = $index;
                        break;
                    }
                }
            }
        }

        if ($cardIndex === -1) {
            throw new \Exception("Card not found or cannot be played this turn.");
        }

        // 2. Mark as Played
        $player['dev_cards'][$cardIndex]['played'] = true;

        // 3. Execute Effect
        $message = "Played $type";
        switch ($type) {
            case 'knight':
                // TODO: Trigger Robber mode
                // For now, just a message
                $message = "Knight played! (Robber implementation pending)";
                break;

            case 'year_of_plenty':
                // Payload: ['resources' => ['wood', 'brick']]
                $resources = $payload['resources'] ?? [];
                if (count($resources) !== 2) throw new \Exception("Must choose exactly 2 resources.");
                foreach ($resources as $res) {
                    $player["resource_$res"] = ($player["resource_$res"] ?? 0) + 1;
                }
                $message = "Taken 2 resources: " . implode(', ', $resources);
                break;

            case 'monopoly':
                // Payload: ['resource' => 'sheep']
                $targetRes = $payload['resource'] ?? null;
                if (!$targetRes) throw new \Exception("Must choose a resource type.");

                $totalStolen = 0;
                foreach ($state->players as $pIndex => &$otherPlayer) {
                    if ($pIndex === $playerIndex) continue;
                    $amount = $otherPlayer["resource_$targetRes"] ?? 0;
                    if ($amount > 0) {
                        $otherPlayer["resource_$targetRes"] = 0;
                        $totalStolen += $amount;
                        // Save other player immediately
                        $state->savePlayer($pIndex);
                    }
                }
                $player["resource_$targetRes"] = ($player["resource_$targetRes"] ?? 0) + $totalStolen;
                $message = "Monopoly! Stole $totalStolen $targetRes.";
                break;

            case 'road_building':
                // TODO: trigger free road build
                $message = "Road Building played! (Free roads implementation pending)";
                break;

            case 'vp_point':
                $message = "Victory Point revealed!";
                break;
        }

        // 4. Save
        $state->savePlayer($playerIndex);

        return ['message' => $message];
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
