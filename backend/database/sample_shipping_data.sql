-- Sample shipping districts + rates. Safe to re-run (INSERT IGNORE on districts by
-- unique name; rates looked up by district name so no hardcoded ids).

INSERT IGNORE INTO shipping_districts (name, is_active) VALUES
    ('Dubai - Marina', 1),
    ('Dubai - Deira', 1),
    ('Abu Dhabi City', 1),
    ('Sharjah', 1),
    ('Ajman', 1);

INSERT INTO shipping_rates (district_id, rate, free_shipping_threshold)
SELECT id, 25.00, 400.00 FROM shipping_districts WHERE name = 'Dubai - Marina'
UNION ALL
SELECT id, 20.00, 500.00 FROM shipping_districts WHERE name = 'Dubai - Deira'
UNION ALL
SELECT id, 30.00, 500.00 FROM shipping_districts WHERE name = 'Abu Dhabi City'
UNION ALL
SELECT id, 35.00, NULL FROM shipping_districts WHERE name = 'Sharjah'
ON DUPLICATE KEY UPDATE rate = VALUES(rate), free_shipping_threshold = VALUES(free_shipping_threshold);

-- 'Ajman' deliberately left with no rate row — shows the flat-fee fallback still works.
