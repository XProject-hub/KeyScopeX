-- KeyScopeX Panel Database Schema
-- LineWatchX Project

-- Create database
CREATE DATABASE IF NOT EXISTS keyscopex_panel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE keyscopex_panel;

-- Users table
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `license_key` VARCHAR(64) UNIQUE NOT NULL,
  `license_type` ENUM('FREE', 'PREMIUM') DEFAULT 'FREE',
  `license_status` ENUM('ACTIVE', 'EXPIRED', 'REVOKED') DEFAULT 'ACTIVE',
  `license_expires` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_login` DATETIME NULL,
  `is_admin` BOOLEAN DEFAULT FALSE,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_email` (`email`),
  INDEX `idx_license_type` (`license_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DRM Keys table
CREATE TABLE `drm_keys` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `drm_type` ENUM('Widevine', 'PlayReady', 'ClearKey') NOT NULL,
  `pssh` TEXT NOT NULL,
  `key_id` VARCHAR(255) NOT NULL,
  `key_value` VARCHAR(255) NOT NULL,
  `license_url` TEXT NULL,
  `manifest_url` TEXT NULL,
  `content_title` VARCHAR(255) NULL,
  `content_url` TEXT NULL,
  `captured_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(45) NULL,
  `extension_version` VARCHAR(20) NULL,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_drm_type` (`drm_type`),
  INDEX `idx_key_id` (`key_id`),
  INDEX `idx_captured_at` (`captured_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- License history table
CREATE TABLE `license_history` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `action` ENUM('CREATED', 'ACTIVATED', 'RENEWED', 'UPGRADED', 'DOWNGRADED', 'REVOKED', 'EXPIRED') NOT NULL,
  `old_type` ENUM('FREE', 'PREMIUM') NULL,
  `new_type` ENUM('FREE', 'PREMIUM') NULL,
  `old_expires` DATETIME NULL,
  `new_expires` DATETIME NULL,
  `performed_by` INT UNSIGNED NULL,
  `reason` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(45) NULL,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_action` (`action`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extension activity log
CREATE TABLE `extension_activity` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `license_key` VARCHAR(64) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `extension_version` VARCHAR(20) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_action` (`action`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin activity log
CREATE TABLE `admin_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT UNSIGNED NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_user_id` INT UNSIGNED NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_admin_id` (`admin_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Visitor tracking
CREATE TABLE `visitors` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` TEXT NULL,
  `page` VARCHAR(255) NULL,
  `referrer` TEXT NULL,
  `country` VARCHAR(2) NULL,
  `city` VARCHAR(100) NULL,
  `visited_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ip_address` (`ip_address`),
  INDEX `idx_visited_at` (`visited_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System settings
CREATE TABLE `settings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) UNIQUE NOT NULL,
  `setting_value` TEXT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('site_name', 'KeyScopeX Panel'),
('site_url', 'https://keyscopex.xproject.live'),
('free_license_days', '365'),
('premium_license_days', '365'),
('max_keys_per_free_user', '1000'),
('allow_registration', '1'),
('maintenance_mode', '0');

-- Create default admin user
-- Password: admin123 (CHANGE THIS IMMEDIATELY!)
INSERT INTO `users` (`username`, `email`, `password`, `license_key`, `license_type`, `is_admin`) VALUES
('admin', 'admin@keyscopex.xproject.live', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', UUID(), 'PREMIUM', TRUE);

-- Stored Procedures

-- Generate unique license key
DELIMITER $$
CREATE PROCEDURE `generate_license_key`()
BEGIN
    DECLARE new_key VARCHAR(64);
    DECLARE key_exists INT;
    
    REPEAT
        SET new_key = CONCAT(
            'KSX-',
            SUBSTRING(MD5(RAND()), 1, 8), '-',
            SUBSTRING(MD5(RAND()), 1, 8), '-',
            SUBSTRING(MD5(RAND()), 1, 8)
        );
        SELECT COUNT(*) INTO key_exists FROM users WHERE license_key = new_key;
    UNTIL key_exists = 0 END REPEAT;
    
    SELECT new_key;
END$$

-- Check license validity
DELIMITER $$
CREATE PROCEDURE `check_license`(IN p_license_key VARCHAR(64))
BEGIN
    SELECT 
        u.id,
        u.username,
        u.email,
        u.license_type,
        u.license_status,
        u.license_expires,
        CASE
            WHEN u.license_status != 'ACTIVE' THEN FALSE
            WHEN u.license_expires IS NOT NULL AND u.license_expires < NOW() THEN FALSE
            ELSE TRUE
        END as is_valid
    FROM users u
    WHERE u.license_key = p_license_key;
END$$

-- Get user stats
DELIMITER $$
CREATE PROCEDURE `get_user_stats`(IN p_user_id INT)
BEGIN
    SELECT 
        COUNT(*) as total_keys,
        COUNT(DISTINCT drm_type) as drm_types,
        MIN(captured_at) as first_capture,
        MAX(captured_at) as last_capture
    FROM drm_keys
    WHERE user_id = p_user_id;
END$$

-- Get system stats (admin)
DELIMITER $$
CREATE PROCEDURE `get_system_stats`()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE license_type = 'FREE') as free_users,
        (SELECT COUNT(*) FROM users WHERE license_type = 'PREMIUM') as premium_users,
        (SELECT COUNT(*) FROM drm_keys) as total_keys,
        (SELECT COUNT(*) FROM drm_keys WHERE DATE(captured_at) = CURDATE()) as keys_today,
        (SELECT COUNT(*) FROM extension_activity WHERE DATE(created_at) = CURDATE()) as active_extensions_today,
        (SELECT COUNT(*) FROM visitors WHERE DATE(visited_at) = CURDATE()) as visitors_today;
END$$

DELIMITER ;

-- Views

-- Active users view
CREATE VIEW `active_users` AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.license_type,
    u.license_status,
    u.created_at,
    u.last_login,
    COUNT(DISTINCT dk.id) as total_keys,
    MAX(dk.captured_at) as last_key_capture
FROM users u
LEFT JOIN drm_keys dk ON u.id = dk.user_id
WHERE u.license_status = 'ACTIVE'
GROUP BY u.id;

-- Recent keys view
CREATE VIEW `recent_keys` AS
SELECT 
    dk.*,
    u.username,
    u.license_type
FROM drm_keys dk
JOIN users u ON dk.user_id = u.id
ORDER BY dk.captured_at DESC
LIMIT 100;

-- LineWatchX Project Footer
-- Made with 🧡 by LineWatchX Project

