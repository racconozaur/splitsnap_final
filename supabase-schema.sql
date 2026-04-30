
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  restaurant_name TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  payer_payment_info JSONB NOT NULL DEFAULT '{}',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  tip DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  number_of_people INTEGER NOT NULL DEFAULT 2,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE participants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_owed DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE selections (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  share DECIMAL(5,4) NOT NULL DEFAULT 1.0 CHECK (share > 0 AND share <= 1),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, item_id)
);

CREATE INDEX idx_items_session_id ON items(session_id);
CREATE INDEX idx_participants_session_id ON participants(session_id);
CREATE INDEX idx_selections_participant_id ON selections(participant_id);
CREATE INDEX idx_selections_item_id ON selections(item_id);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow all operations on sessions" ON sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on items" ON items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on participants" ON participants
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on selections" ON selections
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON sessions TO anon;
GRANT ALL ON items TO anon;
GRANT ALL ON participants TO anon;
GRANT ALL ON selections TO anon;
-- made with Bob
