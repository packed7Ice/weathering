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

    public function __construct($gameId)
    {
        $this->gameId = $gameId;
    }

    public static function create()
    {
        $id = uniqid('g_');
        $db = Db::pdo();

        $stmt = $db->prepare("INSERT INTO games (id, turn_count, active_player_index, current_season) VALUES (?, 0, 0, 'Normal')");
        $stmt->execute([$id]);

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
            resource_wood = ?, resource_brick = ?, resource_sheep = ?, resource_wheat = ?, resource_ore = ? 
            WHERE id = ?");

        $stmt->execute([
            $p['score'],
            $p['resource_wood'],
            $p['resource_brick'],
            $p['resource_sheep'],
            $p['resource_wheat'],
            $p['resource_ore'],
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
        $stmt = $db->prepare("UPDATE games SET turn_count = ?, active_player_index = ?, current_season = ? WHERE id = ?");
        $stmt->execute([$this->turnCount, $this->activePlayerIndex, $this->season, $this->gameId]);
    }
}
