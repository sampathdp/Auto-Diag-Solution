-- Run this against the PRODUCTION database (auto-diag-api.salonflow.cloud).
-- Covers the 4 migrations added on 2026-07-19 for the account/checkout backend.
-- Safe to re-run: each block checks whether it already applied before touching anything.
--
-- If you have phpMyAdmin/Adminer, just paste the whole file and run it.
-- If you have shell access instead, prefer: php console.php migrate  (does the same thing,
-- and stamps the ledger for you — skip this file entirely in that case).

-- Make sure the migrations ledger table exists (same as console.php's ensureMigrationsLedger()).
CREATE TABLE IF NOT EXISTS migrations (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    migration  VARCHAR(255) NOT NULL,
    batch      INT NOT NULL,
    run_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_migrations_migration (migration)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 1) 2026_07_19_000001_alter_users_add_profile_fields
-- ---------------------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'dob'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN dob DATE NULL AFTER phone',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'language'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN language VARCHAR(5) NOT NULL DEFAULT ''en'' AFTER dob',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER language',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO migrations (migration, batch)
VALUES ('2026_07_19_000001_alter_users_add_profile_fields',
        (SELECT b FROM (SELECT COALESCE(MAX(batch), 0) + 1 AS b FROM migrations) t));

-- ---------------------------------------------------------------------------
-- 2) 2026_07_19_000002_create_customer_vehicles_table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_vehicles (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id        BIGINT NOT NULL,
    year           INT NOT NULL,
    make           VARCHAR(100) NOT NULL,
    model          VARCHAR(100) NOT NULL,
    trim           VARCHAR(150) NULL,
    body_type      VARCHAR(100) NULL,
    engine         VARCHAR(100) NULL,
    fuel_type      VARCHAR(50) NULL,
    transmission   VARCHAR(50) NULL,
    drive_type     VARCHAR(50) NULL,
    color          VARCHAR(50) NULL,
    vin            VARCHAR(50) NULL,
    license_plate  VARCHAR(30) NULL,
    mileage        INT NULL,
    nickname       VARCHAR(100) NULL,
    purchase_date  DATE NULL,
    is_default     TINYINT(1) NOT NULL DEFAULT 0,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_vehicles_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO migrations (migration, batch)
VALUES ('2026_07_19_000002_create_customer_vehicles_table',
        (SELECT b FROM (SELECT COALESCE(MAX(batch), 0) + 1 AS b FROM migrations) t));

-- ---------------------------------------------------------------------------
-- 3) 2026_07_19_000003_create_notification_preferences_table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id             BIGINT NOT NULL,
    email_orders        TINYINT(1) NOT NULL DEFAULT 1,
    email_promotions    TINYINT(1) NOT NULL DEFAULT 0,
    sms_orders          TINYINT(1) NOT NULL DEFAULT 1,
    sms_promotions      TINYINT(1) NOT NULL DEFAULT 0,
    whatsapp_updates    TINYINT(1) NOT NULL DEFAULT 0,
    push_notifications  TINYINT(1) NOT NULL DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_notification_preferences_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO migrations (migration, batch)
VALUES ('2026_07_19_000003_create_notification_preferences_table',
        (SELECT b FROM (SELECT COALESCE(MAX(batch), 0) + 1 AS b FROM migrations) t));

-- ---------------------------------------------------------------------------
-- 4) 2026_07_19_000004_alter_customer_addresses_add_instructions
--    (this is the one causing the current 500 on POST /account/addresses)
-- ---------------------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_addresses' AND COLUMN_NAME = 'delivery_instructions'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE customer_addresses ADD COLUMN delivery_instructions TEXT NULL AFTER landmark',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO migrations (migration, batch)
VALUES ('2026_07_19_000004_alter_customer_addresses_add_instructions',
        (SELECT b FROM (SELECT COALESCE(MAX(batch), 0) + 1 AS b FROM migrations) t));

-- Done. After this, "POST /account/addresses" (and the vehicles/notifications/
-- checkout endpoints that depend on these tables/columns) should work on production.
