-- Legacy rankings shared one entry per group, year and person.
-- Assign each entry once to the earliest eligible event. Duels already
-- carry their exact event. Keep unattributable rows available for recovery.
CREATE TABLE competition_event_map (
  group_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  event_id TEXT,
  PRIMARY KEY (group_id, year, user_id)
);

INSERT INTO competition_event_map
SELECT c.group_id,c.year,c.user_id,(
  SELECT e.id FROM events e
  JOIN members m ON m.event_id=e.id AND m.user_id=c.user_id AND m.status='approved'
  WHERE e.group_id=c.group_id
    AND e.gift_at>=printf('%04d-12-31T23:00:00.000Z',c.year-1)
    AND e.gift_at<printf('%04d-12-31T23:00:00.000Z',c.year)
  ORDER BY e.created_at,e.id
  LIMIT 1
)
FROM competition_entries c;

CREATE TABLE competition_migration_unassigned (
  kind TEXT NOT NULL,
  data TEXT NOT NULL
);

CREATE TABLE competition_event_entries (
  event_id TEXT NOT NULL REFERENCES events(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  adjustment INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, user_id)
);

INSERT INTO competition_event_entries
SELECT m.event_id,c.user_id,c.adjustment FROM competition_entries c
JOIN competition_event_map m USING (group_id,year,user_id)
WHERE m.event_id IS NOT NULL;

INSERT INTO competition_migration_unassigned
SELECT 'entry',json_object('group_id',c.group_id,'year',c.year,'user_id',c.user_id,'adjustment',c.adjustment)
FROM competition_entries c JOIN competition_event_map m USING (group_id,year,user_id)
WHERE m.event_id IS NULL;

CREATE TABLE competition_event_duels (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  receiver_id TEXT NOT NULL REFERENCES users(id),
  questions TEXT NOT NULL,
  expires INTEGER NOT NULL,
  CHECK (sender_id != receiver_id)
);

INSERT INTO competition_event_duels
SELECT id,event_id,sender_id,receiver_id,questions,expires FROM competition_duels;

CREATE TABLE competition_event_attempts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  game TEXT NOT NULL,
  duel_id TEXT NOT NULL DEFAULT '',
  ordinal INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL,
  expires INTEGER NOT NULL,
  raw_score INTEGER,
  score INTEGER,
  UNIQUE (event_id, user_id, game, duel_id, ordinal)
);

INSERT INTO competition_event_attempts
SELECT a.id,CASE WHEN a.duel_id='' THEN m.event_id ELSE d.event_id END,
  a.user_id,a.game,a.duel_id,a.ordinal,a.revision,a.state,a.expires,a.raw_score,a.score
FROM competition_attempts a
LEFT JOIN competition_event_map m USING (group_id,year,user_id)
LEFT JOIN competition_duels d ON d.id=a.duel_id
WHERE CASE WHEN a.duel_id='' THEN m.event_id ELSE d.event_id END IS NOT NULL;

INSERT INTO competition_migration_unassigned
SELECT 'attempt',json_object(
  'id',a.id,'group_id',a.group_id,'year',a.year,'user_id',a.user_id,
  'game',a.game,'duel_id',a.duel_id,'ordinal',a.ordinal,'revision',a.revision,
  'state',a.state,'expires',a.expires,'raw_score',a.raw_score,'score',a.score
)
FROM competition_attempts a
LEFT JOIN competition_event_map m USING (group_id,year,user_id)
LEFT JOIN competition_duels d ON d.id=a.duel_id
WHERE CASE WHEN a.duel_id='' THEN m.event_id ELSE d.event_id END IS NULL;

CREATE TABLE competition_event_adjustments (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

INSERT INTO competition_event_adjustments
SELECT a.id,m.event_id,a.user_id,a.owner_id,a.action,a.points,a.reason,a.created_at
FROM competition_adjustments a JOIN competition_event_map m USING (group_id,year,user_id)
WHERE m.event_id IS NOT NULL;

INSERT INTO competition_migration_unassigned
SELECT 'adjustment',json_object(
  'id',a.id,'group_id',a.group_id,'year',a.year,'user_id',a.user_id,'owner_id',a.owner_id,
  'action',a.action,'points',a.points,'reason',a.reason,'created_at',a.created_at
)
FROM competition_adjustments a LEFT JOIN competition_event_map m USING (group_id,year,user_id)
WHERE m.event_id IS NULL;

DROP TABLE competition_event_map;
DROP TABLE competition_attempts;
DROP TABLE competition_entries;
DROP TABLE competition_adjustments;
DROP TABLE competition_duels;
ALTER TABLE competition_event_attempts RENAME TO competition_attempts;
ALTER TABLE competition_event_entries RENAME TO competition_entries;
ALTER TABLE competition_event_adjustments RENAME TO competition_adjustments;
ALTER TABLE competition_event_duels RENAME TO competition_duels;
CREATE INDEX competition_duels_event ON competition_duels(event_id,expires);
CREATE INDEX competition_scores ON competition_attempts(event_id,user_id,game,score);
DROP INDEX IF EXISTS notification_weekly_group;
