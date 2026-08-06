-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE game_status AS ENUM ('WAITING', 'STARTING', 'IN_PROGRESS', 'ROUND_END', 'FINISHED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE round_status AS ENUM ('ACTIVE', 'VOTING', 'RESOLVED', 'ENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE player_role AS ENUM ('INNOCENT', 'MURDERER', 'DETECTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE clue_type AS ENUM ('PHYSICAL', 'TESTIMONY', 'DIGITAL', 'ENVIRONMENTAL', 'RED_HERRING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE sabotage_type AS ENUM ('LIGHTS_OUT', 'FAKE_EVIDENCE', 'FRAME_PLAYER', 'ERASE_FINGERPRINTS', 'DISABLE_CAMERAS', 'LOCK_DOORS', 'FALSE_ALARM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE item_type AS ENUM ('KEY', 'FLASHLIGHT', 'CAMERA', 'NOTE', 'EVIDENCE_BAG', 'LOCKPICK', 'RADIO', 'MEDKIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('CHAT', 'SYSTEM', 'GAME_EVENT', 'PRIVATE', 'ANNOUNCEMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE friend_request_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'GAME_INVITE', 'GAME_STARTING', 'YOUR_TURN', 'GAME_ENDED', 'ACHIEVEMENT', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_host ON games(host_id);
CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user ON game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_clues_game ON clues(game_id);
CREATE INDEX IF NOT EXISTS idx_votes_game ON votes(game_id);
CREATE INDEX IF NOT EXISTS idx_votes_round ON votes(round_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_game ON chat_messages(game_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token);

-- Insert default mansion rooms
INSERT INTO mansion_rooms (id, name, description, connections, secrets, created_at, updated_at)
VALUES
  (uuid_generate_v4(), 'Grand Foyer', 'A magnificent entrance hall with a sweeping staircase and crystal chandelier.', '{"north": "Library", "east": "Dining Room", "west": "Study", "south": "Front Door"}', '{"hidden_passage": "Study"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Library', 'Floor-to-ceiling bookshelves line the walls, a secret door rumored behind one.', '{"south": "Grand Foyer", "east": "Conservatory"}', '{"secret_door": "Study", "hidden_compartment": "Desk"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Study', 'A private office with a large desk, fireplace, and locked drawer.', '{"east": "Grand Foyer", "west": "Secret Passage"}', '{"locked_drawer": "Key", "safe": "Combination"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Dining Room', 'Long mahogany table set for a feast that never happened.', '{"west": "Grand Foyer", "north": "Kitchen", "east": "Ballroom"}', '{"poisoned_wine": "Evidence"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Kitchen', 'Copper pots hang above a cold stove, a back door leads to gardens.', '{"south": "Dining Room", "west": "Pantry", "north": "Servant Quarters"}', '{"knife_missing": "Clue", "pantry_key": "Key"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Ballroom', 'Ornate mirrors reflect the grandeur, a balcony overlooks the gardens.', '{"west": "Dining Room", "north": "Conservatory", "east": "Gallery"}', '{"broken_mirror": "Clue", "balcony_access": "Rope"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Conservatory', 'Exotic plants and a small pond, humid and lush.', '{"south": "Library", "west": "Ballroom"}', '{"rare_flower": "Poison", "pond_key": "Key"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Gallery', 'Portraits of ancestors watch silently, one frame is askew.', '{"west": "Ballroom", "north": "Master Bedroom"}', '{"askew_portrait": "Safe", "hidden_letter": "Note"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Master Bedroom', 'Canopy bed, vanity, a jewelry box sits open and empty.', '{"south": "Gallery", "east": "Ensuite Bathroom", "west": "Walk-in Closet"}', '{"empty_jewelry_box": "Clue", "diary": "Note"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Ensuite Bathroom', 'Marble tub, double sinks, a window slightly ajar.', '{"west": "Master Bedroom"}', '{"wet_footprints": "Clue", "window_latch": "Broken"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Walk-in Closet', 'Rows of clothing, a safe built into the floor.', '{"east": "Master Bedroom"}', '{"floor_safe": "Combination", "hidden_garment": "Evidence"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Servant Quarters', 'Simple bunks, a notice board with schedules.', '{"south": "Kitchen", "east": "Pantry"}', '{"schedule": "Note", "missing_uniform": "Clue"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Pantry', 'Shelves of preserves, a dumbwaiter to the kitchen.', '{"west": "Kitchen", "west": "Servant Quarters"}', '{"dumbwaiter_key": "Key", "preserves_jar": "Poison"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Secret Passage', 'Dusty, narrow, connects Study to Wine Cellar.', '{"east": "Study", "west": "Wine Cellar"}', '{"listening_device": "Evidence", "old_map": "Note"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Wine Cellar', 'Racks of vintage bottles, one recently emptied.', '{"east": "Secret Passage"}', '{"empty_bottle": "Poison", "cork": "Fingerprint"}', NOW(), NOW()),
  (uuid_generate_v4(), 'Front Door', 'Heavy oak, locked from inside. The only exit.', '{"north": "Grand Foyer"}', '{"key_missing": "Clue", "scratches": "Forced_entry"}', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Create mansion_rooms table if not exists (will be created by Prisma)
-- This is just for reference data