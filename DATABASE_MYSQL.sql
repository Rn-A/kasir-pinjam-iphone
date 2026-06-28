-- Skema Database MySQL untuk Pinjam iPhone (XAMPP phpMyAdmin)

CREATE DATABASE IF NOT EXISTS `pinjam_iphone` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `pinjam_iphone`;

-- 1. Tabel Users (Autentikasi Admin Lokal)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- 2. Tabel Customers
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `address` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- 3. Tabel Items
CREATE TABLE IF NOT EXISTS `items` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `serial_number` VARCHAR(50) NOT NULL UNIQUE,
  `category` VARCHAR(100) NOT NULL DEFAULT 'iPhone',
  `price_3h` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `price_6h` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `price_12h` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `price_24h` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `daily_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `color` VARCHAR(50) NOT NULL DEFAULT '',
  `status` ENUM('available', 'rented', 'maintenance') DEFAULT 'available',
  `image_url` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- 4. Tabel Transactions
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(36) NOT NULL,
  `customer_id` VARCHAR(36) NOT NULL,
  `item_id` VARCHAR(36) NOT NULL,
  `start_date` DATETIME NOT NULL,
  `duration_hours` INT NOT NULL DEFAULT 0,
  `total_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('active', 'completed', 'late') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `discount_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `voucher_code` VARCHAR(50) DEFAULT NULL,
  `actual_return_date` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_transactions_customers` (`customer_id`),
  KEY `fk_transactions_items` (`item_id`),
  CONSTRAINT `fk_transactions_customers` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transactions_items` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Tabel Categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;
