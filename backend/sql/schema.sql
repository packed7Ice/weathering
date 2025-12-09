-- Games table: stores global game state
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    turn_count INTEGER DEFAULT 0,
    active_player_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    current_season TEXT DEFAULT 'Normal', -- Normal, Rainy, Dry, etc.
    turn_phase TEXT DEFAULT 'roll', -- roll, main
    dev_deck TEXT -- JSON encoded deck
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    color TEXT NOT NULL,
    name TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    resource_wood INTEGER DEFAULT 0,
    resource_brick INTEGER DEFAULT 0,
    resource_sheep INTEGER DEFAULT 0,
    resource_wheat INTEGER DEFAULT 0,
    resource_ore INTEGER DEFAULT 0,
    dev_cards TEXT, -- JSON encoded hand
    FOREIGN KEY(game_id) REFERENCES games(id)
);

-- Board Layout (Tiles)
-- Store static board info + dynamic state (future proofing)
CREATE TABLE IF NOT EXISTS tiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    q INTEGER NOT NULL, -- Axial coordinates q
    r INTEGER NOT NULL, -- Axial coordinates r
    resource_type TEXT NOT NULL, -- wood, brick, sheep, wheat, ore, desert
    number_token INTEGER, -- 2-12
    FOREIGN KEY(game_id) REFERENCES games(id)
);

-- Constructions (Roads, Settlements, Cities)
-- Represented by edge/vertex coordinates?
-- For simplicity in Phase 1, we might just store a list of built items in a JSON blob or separate table.
-- Let's use a table for structured access.
CREATE TABLE IF NOT EXISTS constructions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    player_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- road, settlement, city
    x INTEGER, -- Abstract coordinate? Or maybe just an ID of the intersection/edge
    y INTEGER,
    z INTEGER, -- For hexagonal systems usually 3 coords
    location_id TEXT, -- formatted string key for ease "q,r,dir"
    FOREIGN KEY(game_id) REFERENCES games(id),
    FOREIGN KEY(player_id) REFERENCES players(id)
);

-- Weather Snapshots
CREATE TABLE IF NOT EXISTS weather_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT,
    city TEXT,
    temp REAL, -- Celsius
    weather_main TEXT, -- Rain, Snow, Clear, Clouds
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
