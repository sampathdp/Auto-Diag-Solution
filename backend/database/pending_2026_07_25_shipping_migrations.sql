-- Run this against the PRODUCTION database.
-- Covers the 3 shipping migrations added on 2026-07-25.
-- Paste the whole file into phpMyAdmin/Adminer and run it.

-- ---------------------------------------------------------------------------
-- 1) 2026_07_25_000001_create_shipping_districts_table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_districts (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    name       VARCHAR(150) NOT NULL,
    is_active  TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_shipping_districts_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO migrations (migration, batch)
VALUES ('2026_07_25_000001_create_shipping_districts_table',
        (SELECT b FROM (SELECT COALESCE(MAX(batch), 0) + 1 AS b FROM migrations) t));

-- ---------------------------------------------------------------------------
-- 2) 2026_07_25_000002_create_shipping_rates_table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_rates (
    id                      BIGINT PRIMARY KEY AUTO_INCREMENT,
    district_id             BIGINT NOT NULL,
    rate                    DECIMAL(10,2) NOT NULL,
    free_shipping_threshold DECIMAL(10,2) NULL,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_shipping_rates_district_id (district_id),
    FOREIGN KEY (district_id) REFERENCES shipping_districts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO migrations (migration, batch)
VALUES ('2026_07_25_000002_create_shipping_rates_table',
        (SELECT b FROM (SELECT COALESCE(MAX(batch), 0) + 1 AS b FROM migrations) t));

-- ---------------------------------------------------------------------------
-- 3) 2026_07_25_000003_alter_customer_addresses_add_district_id
-- ---------------------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_addresses' AND COLUMN_NAME = 'district_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE customer_addresses
     ADD COLUMN district_id BIGINT NULL AFTER emirate,
     ADD INDEX idx_customer_addresses_district_id (district_id),
     ADD CONSTRAINT fk_customer_addresses_district FOREIGN KEY (district_id) REFERENCES shipping_districts(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO migrations (migration, batch)
VALUES ('2026_07_25_000003_alter_customer_addresses_add_district_id',
        (SELECT b FROM (SELECT COALESCE(MAX(batch), 0) + 1 AS b FROM migrations) t));

-- Done. After this, the new /admin/shipping section and district-based checkout
-- pricing will work against production.
