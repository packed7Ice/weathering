<?php

namespace Game;

use Infra\Db;
use PDO;

class GameState
{
    public $gameId;
    public $turnCount = 0;
    public $activePlayerIndex = 0;
    public $season = 'Normal';
    public $players = [];
    public $board = []; // Holds tiles
    public $constructions = []; // Holds buildings
    public $turnPhase = 'roll'; // 'roll', 'main'
    public $devDeck = []; // Array of card types

    public function __construct($gameId)
    {
        $this->gameId = $gameId;
    }

    public static function create()
    {
        $id = uniqid('g_');
        $db = Db::pdo();

        // Initialize Deck (Simple distribution)
        // 14 Knight, 5 VP, 2 Road, 2 Plenty, 2 Monopoly = 25 total
        $deck = array_merge(
            array_fill(0, 14, 'knight'),
            array_fill(0, 5, 'vp_point'),
            array_fill(0, 2, 'road_building'),
            array_fill(0, 2, 'year_of_plenty'),
            array_fill(0, 2, 'monopoly')
        );
        shuffle($deck);
        $deckJson = json_encode($deck);

        $stmt = $db->prepare("INSERT INTO games (id, turn_count, active_player_index, current_season, turn_phase, dev_deck) VALUES (?, 0, 0, 'Normal', 'roll', ?)");
        $stmt->execute([$id, $deckJson]);

        return new self($id);
    }

    public static function load($gameId)
    {
        $db = Db::pdo();
        $stmt = $db->prepare("SELECT * FROM games WHERE id = ?");
        $stmt->execute([$gameId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) return null;

        $instance = new self($gameId);
        $instance->turnCount = $row['turn_count'];
        $instance->activePlayerIndex = $row['active_player_index'];
        $instance->season = $row['current_season'];
        $instance->turnPhase = $row['turn_phase'] ?? 'roll';
        $instance->devDeck = json_decode($row['dev_deck'] ?? '[]', true);

        // Load Players
        $stmtP = $db->prepare("SELECT * FROM players WHERE game_id = ?");
        $stmtP->execute([$gameId]);
        $instance->players = $stmtP->fetchAll(PDO::FETCH_ASSOC);

        // Load Tiles
        $stmtT = $db->prepare("SELECT * FROM tiles WHERE game_id = ?");
        $stmtT->execute([$gameId]);
        $instance->board = $stmtT->fetchAll(PDO::FETCH_ASSOC);

        // Load Constructions
        $stmtC = $db->prepare("SELECT * FROM constructions WHERE game_id = ?");
        $stmtC->execute([$gameId]);
        $instance->constructions = $stmtC->fetchAll(PDO::FETCH_ASSOC);

        return $instance;
    }

    public function savePlayer($playerIndex)
    {
        if (!isset($this->players[$playerIndex])) return;
        $p = $this->players[$playerIndex];

        $db = Db::pdo();
        $stmt = $db->prepare("UPDATE players SET 
            score = ?, 
            resource_wood = ?, resource_brick = ?, resource_sheep = ?, resource_wheat = ?, resource_ore = ?,
            dev_cards = ?
            WHERE id = ?");

        $stmt->execute([
            $p['score'],
            $p['resource_wood'],
            $p['resource_brick'],
            $p['resource_sheep'],
            $p['resource_wheat'],
            $p['resource_ore'],
            json_encode($p['dev_cards'] ?? []),
            $p['id']
        ]);
    }

    public function addConstruction($type, $locationId, $playerId)
    {
        $db = Db::pdo();
        $stmt = $db->prepare("INSERT INTO constructions (game_id, type, location_id, player_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([$this->gameId, $type, $locationId, $playerId]);

        // Update local state
        $this->constructions[] = [
            'type' => $type,
            'location_id' => $locationId,
            'player_id' => $playerId
        ];
    }

    public function upgradeConstruction($locationId, $newType)
    {
        $db = Db::pdo();
        $stmt = $db->prepare("UPDATE constructions SET type = ? WHERE game_id = ? AND location_id = ?");
        $stmt->execute([$newType, $this->gameId, $locationId]);

        // Update local state
        foreach ($this->constructions as &$c) {
            if ($c['location_id'] === $locationId) {
                $c['type'] = $newType;
                break;
            }
        }
    }

    public function getPlayer($playerId)
    {
        foreach ($this->players as $p) {
            if ($p['id'] == $playerId) return $p;
        }
        return null;
    }

    public function getPlayerIndex($playerId)
    {
        foreach ($this->players as $index => $p) {
            if ($p['id'] == $playerId) return $index;
        }
        return -1;
    }

    public function save()
    {
        $db = Db::pdo();
        $stmt = $db->prepare("UPDATE games SET turn_count = ?, active_player_index = ?, current_season = ?, turn_phase = ?, dev_deck = ? WHERE id = ?");
        $stmt->execute([$this->turnCount, $this->activePlayerIndex, $this->season, $this->turnPhase, json_encode($this->devDeck), $this->gameId]);
    }
}
