import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Set limit to 50mb to allow large base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// MySQL connection configuration from env or standard XAMPP defaults
const dbConfig: mysql.ConnectionOptions = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306'),
  connectTimeout: 10000, // 10s timeout to fail fast on unreachable IPs
};

if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  };
}

const DB_NAME = process.env.DB_NAME || 'pinjam_iphone';

let pool: mysql.Pool;

async function initDB() {
  try {
    // 1. First connect without a database selected to check/create it
    const connection = await mysql.createConnection(dbConfig);
    console.log('Database server connected successfully.');

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`Database "${DB_NAME}" checked/created.`);
    await connection.end();

    // 2. Create the connection pool with the database selected
    pool = mysql.createPool({
      ...dbConfig,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 3. Create tables if they do not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`email\` VARCHAR(255) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`customers\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`phone\` VARCHAR(20) NOT NULL,
        \`address\` TEXT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Migration: rename iphones to items
    try {
      const [tables] = await pool.query("SHOW TABLES LIKE 'iphones'") as any[];
      if (tables.length > 0) {
        console.log('Migrating iphones table to items...');
        const [itemsTableExists] = await pool.query("SHOW TABLES LIKE 'items'") as any[];
        if (itemsTableExists.length === 0) {
          await pool.query("RENAME TABLE `iphones` TO `items`");
          console.log('Table "iphones" renamed to "items".');
        }
      }
    } catch (e: any) {
      console.error('Migration error (renaming table iphones to items):', e.message);
    }

    // Migration: rename columns inside items and transactions
    try {
      const [itemsTableExists] = await pool.query("SHOW TABLES LIKE 'items'") as any[];
      if (itemsTableExists.length > 0) {
        const [itemsCols] = await pool.query("SHOW COLUMNS FROM `items` LIKE 'imei'") as any[];
        if (itemsCols.length > 0) {
          try {
            await pool.query("ALTER TABLE `items` RENAME COLUMN `imei` TO `serial_number`");
          } catch (renameErr) {
            await pool.query("ALTER TABLE `items` CHANGE COLUMN `imei` `serial_number` VARCHAR(50) NOT NULL UNIQUE");
          }
          console.log('Column "imei" in "items" renamed to "serial_number".');
        }
      }
    } catch (e: any) {
      console.error('Migration error (items columns):', e.message);
    }

    try {
      const [itemsTableExists] = await pool.query("SHOW TABLES LIKE 'items'") as any[];
      if (itemsTableExists.length > 0) {
        const [itemsCatCol] = await pool.query("SHOW COLUMNS FROM `items` LIKE 'category'") as any[];
        if (itemsCatCol.length === 0) {
          await pool.query("ALTER TABLE `items` ADD COLUMN `category` VARCHAR(100) NOT NULL DEFAULT 'iPhone'");
          console.log('Column "category" added to "items".');
        }
      }
    } catch (e: any) {
      console.error('Migration error (items category):', e.message);
    }

    try {
      const [txTableExists] = await pool.query("SHOW TABLES LIKE 'transactions'") as any[];
      if (txTableExists.length > 0) {
        const [txCols] = await pool.query("SHOW COLUMNS FROM `transactions` LIKE 'iphone_id'") as any[];
        if (txCols.length > 0) {
          console.log('Migrating transactions.iphone_id to item_id...');
          // Drop old foreign key if it exists
          try {
            await pool.query("ALTER TABLE `transactions` DROP FOREIGN KEY `fk_transactions_iphones`");
          } catch (e: any) {
            console.log('Foreign key fk_transactions_iphones not found or already dropped.');
          }
          await pool.query("ALTER TABLE `transactions` CHANGE COLUMN `iphone_id` `item_id` VARCHAR(36) NOT NULL");
          console.log('Column "iphone_id" in "transactions" renamed to "item_id".');
        }
      }
    } catch (e: any) {
      console.error('Migration error (transactions columns):', e.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`items\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`serial_number\` VARCHAR(50) NOT NULL UNIQUE,
        \`category\` VARCHAR(100) NOT NULL DEFAULT 'iPhone',
        \`price_3h\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`price_6h\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`price_12h\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`price_24h\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`daily_price\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`color\` VARCHAR(50) NOT NULL DEFAULT '',
        \`status\` ENUM('available', 'rented', 'maintenance') DEFAULT 'available',
        \`image_url\` LONGTEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`transactions\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`customer_id\` VARCHAR(36) NOT NULL,
        \`item_id\` VARCHAR(36) NOT NULL,
        \`start_date\` DATETIME NOT NULL,
        \`duration_hours\` INT NOT NULL DEFAULT 0,
        \`total_price\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`status\` ENUM('active', 'completed', 'late') DEFAULT 'active',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_transactions_customers\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_transactions_items\` FOREIGN KEY (\`item_id\`) REFERENCES \`items\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`vouchers\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`code\` VARCHAR(50) NOT NULL UNIQUE,
        \`type\` ENUM('nominal', 'percentage') NOT NULL,
        \`value\` DECIMAL(15,2) NOT NULL,
        \`is_active\` BOOLEAN DEFAULT TRUE,
        \`expires_at\` DATETIME DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`categories\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL UNIQUE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    console.log('Database tables checked/created successfully.');

    // Add voucher columns to transactions if not exists
    try {
      await pool.query('ALTER TABLE `transactions` ADD COLUMN `discount_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00');
      await pool.query('ALTER TABLE `transactions` ADD COLUMN `voucher_code` VARCHAR(50) DEFAULT NULL');
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.error('Migration error (transactions columns):', e.message);
      }
    }

    // Add actual_return_date column to transactions if not exists
    try {
      await pool.query('ALTER TABLE `transactions` ADD COLUMN `actual_return_date` DATETIME DEFAULT NULL');
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.error('Migration error (transactions actual_return_date column):', e.message);
      }
    }

    // Add expires_at column to vouchers if not exists
    try {
      await pool.query('ALTER TABLE `vouchers` ADD COLUMN `expires_at` DATETIME DEFAULT NULL');
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.error('Migration error (vouchers expires_at column):', e.message);
      }
    }

    // Add reset_token and reset_token_expires columns to users if not exists
    try {
      await pool.query('ALTER TABLE `users` ADD COLUMN `reset_token` VARCHAR(255) DEFAULT NULL');
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.error('Migration error (users reset_token column):', e.message);
      }
    }

    try {
      await pool.query('ALTER TABLE `users` ADD COLUMN `reset_token_expires` DATETIME DEFAULT NULL');
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.error('Migration error (users reset_token_expires column):', e.message);
      }
    }

    // 4. Seed initial data if empty
    // Seed default admin user
    const [users] = await pool.query('SELECT * FROM `users` LIMIT 1') as any[];
    if (users.length === 0) {
      const adminId = uuidv4();
      // plaintext check, using admin@pinjamiphone.com / admin123
      await pool.query(
        'INSERT INTO `users` (`id`, `email`, `password`) VALUES (?, ?, ?)',
        [adminId, 'admin@pinjamiphone.com', 'admin123']
      );
      console.log('Default admin user seeded successfully.');
    }

    // Seed default customers
    const [customers] = await pool.query('SELECT * FROM `customers` LIMIT 1') as any[];
    if (customers.length === 0) {
      const c1_id = uuidv4();
      const c2_id = uuidv4();
      await pool.query(`
        INSERT INTO \`customers\` (\`id\`, \`name\`, \`phone\`, \`address\`) VALUES 
        (?, 'Budi Santoso', '08123456789', 'Jl. Sudirman No 1'),
        (?, 'Siti Aminah', '08987654321', 'Jl. Thamrin No 2')
      `, [c1_id, c2_id]);
      console.log('Default customers seeded successfully.');
    }

    // Seed default items
    const [items] = await pool.query('SELECT * FROM `items` LIMIT 1') as any[];
    if (items.length === 0) {
      await pool.query(`
        INSERT INTO \`items\` (\`id\`, \`name\`, \`serial_number\`, \`category\`, \`price_3h\`, \`price_6h\`, \`price_12h\`, \`price_24h\`, \`daily_price\`, \`color\`, \`status\`, \`image_url\`) VALUES 
        (?, 'iPhone 13 Pro', '123456789012345', 'iPhone', 50000.00, 80000.00, 120000.00, 150000.00, 150000.00, 'Sierra Blue', 'available', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80'),
        (?, 'iPhone 14 Pro Max', '987654321098765', 'iPhone', 80000.00, 120000.00, 180000.00, 250000.00, 250000.00, 'Deep Purple', 'available', 'https://images.unsplash.com/photo-1698243141673-c6c7475dbe99?w=800&q=80'),
        (?, 'iPhone 12 Mini', '456123789456123', 'iPhone', 30000.00, 50000.00, 80000.00, 100000.00, 100000.00, 'Product Red', 'available', 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800&q=80')
      `, [uuidv4(), uuidv4(), uuidv4()]);
      console.log('Default items seeded successfully.');
    }

    // Seed default categories
    const [categories] = await pool.query('SELECT * FROM `categories` LIMIT 1') as any[];
    if (categories.length === 0) {
      const defaultCats = ['iPhone', 'Android', 'Laptop', 'Kamera', 'Game Console', 'Lainnya'];
      for (const cat of defaultCats) {
        await pool.query(
          'INSERT INTO `categories` (`id`, `name`) VALUES (?, ?)',
          [uuidv4(), cat]
        );
      }
      console.log('Default categories seeded successfully.');
    }

  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

let dbInitialized = false;
let dbInitializingPromise: Promise<void> | null = null;

async function ensureDB() {
  if (dbInitialized) return;
  if (!dbInitializingPromise) {
    dbInitializingPromise = initDB().then(() => {
      dbInitialized = true;
    });
  }
  return dbInitializingPromise;
}

// Middleware to ensure DB is connected before handling requests
app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Database initialization failed: ' + err.message });
  }
});

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. AUTHENTICATION
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM `users` WHERE `email` = ? AND `password` = ?', [email, password]) as any[];
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }
    const user = rows[0];
    res.json({ id: user.id, email: user.email });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/session', async (req, res) => {
  // Simple tokenless auth for local dev, can be checked via query/headers if needed
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const userId = authHeader.replace('Bearer ', '');
  try {
    const [rows] = await pool.query('SELECT * FROM `users` WHERE `id` = ?', [userId]) as any[];
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Session invalid' });
    }
    const user = rows[0];
    res.json({ id: user.id, email: user.email });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Konfigurasi Nodemailer Transporter
const mailConfig: any = {
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  secure: process.env.SMTP_SECURE === 'true',
};

if (process.env.SMTP_USER) {
  mailConfig.auth = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD || '',
  };
}

const mailTransporter = nodemailer.createTransport(mailConfig);

app.put('/api/auth/account', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const userId = authHeader.replace('Bearer ', '');
  const { current_password, new_email, new_password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM `users` WHERE `id` = ?', [userId]) as any[];
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    const user = rows[0];

    if (user.password !== current_password) {
      return res.status(400).json({ message: 'Password saat ini salah' });
    }

    if (new_email && new_email !== user.email) {
      const [emailCheck] = await pool.query('SELECT * FROM `users` WHERE `email` = ? AND `id` != ?', [new_email, userId]) as any[];
      if (emailCheck.length > 0) {
        return res.status(400).json({ message: 'Email sudah terdaftar pada akun lain' });
      }
      await pool.query('UPDATE `users` SET `email` = ? WHERE `id` = ?', [new_email, userId]);
      user.email = new_email;
    }

    if (new_password) {
      await pool.query('UPDATE `users` SET `password` = ? WHERE `id` = ?', [new_password, userId]);
    }

    res.json({ id: user.id, email: user.email });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email wajib diisi' });
  }

  // Cek apakah SMTP telah dikonfigurasi di env
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return res.status(500).json({ 
      message: 'Konfigurasi SMTP email pengirim (SMTP_HOST / SMTP_USER) belum disetel di file .env server. Harap konfigurasikan terlebih dahulu.' 
    });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM `users` WHERE `email` = ?', [email]) as any[];
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Email tidak ditemukan di sistem' });
    }
    const user = rows[0];

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 600000); // 10 menit
    const expiresFormatted = expires.toISOString().slice(0, 19).replace('T', ' ');

    await pool.query('UPDATE `users` SET `reset_token` = ?, `reset_token_expires` = ? WHERE `id` = ?', [otp, expiresFormatted, user.id]);

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Pinjam iPhone" <noreply@pinjamiphone.com>',
      to: email,
      subject: 'Kode OTP Pemulihan Kata Sandi - Pinjam iPhone',
      html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 12px; background-color: #3b82f6; border-radius: 50%; color: #ffffff; font-weight: bold; font-size: 24px; width: 48px; height: 48px; line-height: 48px; text-align: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
              
            </div>
            <h2 style="color: #1e293b; margin-top: 16px; margin-bottom: 8px; font-size: 22px; font-weight: 700;">Kode Keamanan (OTP)</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Sistem Manajemen Sewa - Pinjam iPhone</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); text-align: center;">
            <p style="color: #334155; font-size: 15px; line-height: 24px; margin-top: 0; margin-bottom: 24px; text-align: left;">
              Halo Admin, <br><br>
              Kami menerima permintaan untuk mengatur ulang kata sandi Anda. Gunakan kode OTP di bawah ini untuk melanjutkan verifikasi pemulihan akun Anda:
            </p>
            
            <div style="display: inline-block; letter-spacing: 6px; font-size: 32px; font-weight: 800; color: #1e3a8a; background-color: #eff6ff; border: 1px dashed #bfdbfe; padding: 16px 32px; border-radius: 12px; margin: 10px 0 24px 0;">
              ${otp}
            </div>
            
            <p style="color: #64748b; font-size: 13px; line-height: 20px; margin-top: 10px; margin-bottom: 0; text-align: left;">
              Kode OTP ini bersifat rahasia dan hanya berlaku selama <strong>10 menit</strong>. Jangan bagikan kode ini kepada siapapun demi keamanan akun Anda.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Pinjam iPhone. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await mailTransporter.sendMail(mailOptions);
    res.json({ message: 'Kode OTP berhasil dikirim ke email.' });
  } catch (err: any) {
    console.error('Email sending error:', err);
    res.status(500).json({ message: err.message || 'Gagal mengirim email reset password.' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email dan kode OTP wajib diisi' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM `users` WHERE `email` = ? AND `reset_token` = ? AND `reset_token_expires` > NOW()', [email, otp]) as any[];
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Kode OTP tidak valid atau sudah kadaluwarsa' });
    }

    res.json({ message: 'Kode OTP valid' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/reset-password-otp', async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    return res.status(400).json({ message: 'Email, OTP, dan password baru wajib diisi' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM `users` WHERE `email` = ? AND `reset_token` = ? AND `reset_token_expires` > NOW()', [email, otp]) as any[];
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Verifikasi gagal. OTP tidak valid atau sudah kadaluwarsa' });
    }
    const user = rows[0];

    await pool.query('UPDATE `users` SET `password` = ?, `reset_token` = NULL, `reset_token_expires` = NULL WHERE `id` = ?', [password, user.id]);

    res.json({ message: 'Kata sandi berhasil disetel ulang.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});



// 2. ITEMS CRUD
app.get('/api/items', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `items` ORDER BY `created_at` DESC') as any[];
    // Convert status and decimal strings to proper types
    const formatted = rows.map((i: any) => ({
      ...i,
      price_3h: parseFloat(i.price_3h),
      price_6h: parseFloat(i.price_6h),
      price_12h: parseFloat(i.price_12h),
      price_24h: parseFloat(i.price_24h),
      daily_price: parseFloat(i.daily_price),
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `items` WHERE `id` = ?', [req.params.id]) as any[];
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const i = rows[0];
    res.json({
      ...i,
      price_3h: parseFloat(i.price_3h),
      price_6h: parseFloat(i.price_6h),
      price_12h: parseFloat(i.price_12h),
      price_24h: parseFloat(i.price_24h),
      daily_price: parseFloat(i.daily_price),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items', async (req, res) => {
  const { name, serial_number, category, price_3h, price_6h, price_12h, price_24h, daily_price, color, status, image_url } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO `items` (`id`, `name`, `serial_number`, `category`, `price_3h`, `price_6h`, `price_12h`, `price_24h`, `daily_price`, `color`, `status`, `image_url`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, serial_number, category || 'iPhone', price_3h, price_6h, price_12h, price_24h, daily_price, color || '', status || 'available', image_url]
    );
    res.status(201).json({ id, name, serial_number, category, price_3h, price_6h, price_12h, price_24h, daily_price, color, status, image_url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/items/:id', async (req, res) => {
  const fields = req.body;
  const id = req.params.id;
  try {
    // Generate SET query dynamically based on passed parameters
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ message: 'No fields to update' });

    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = keys.map(k => fields[k]);

    await pool.query(`UPDATE \`items\` SET ${setClause} WHERE \`id\` = ?`, [...values, id]);
    
    const [rows] = await pool.query('SELECT * FROM `items` WHERE `id` = ?', [id]) as any[];
    const i = rows[0];
    res.json({
      ...i,
      price_3h: parseFloat(i.price_3h),
      price_6h: parseFloat(i.price_6h),
      price_12h: parseFloat(i.price_12h),
      price_24h: parseFloat(i.price_24h),
      daily_price: parseFloat(i.daily_price),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM `items` WHERE `id` = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 3. CUSTOMERS CRUD
app.get('/api/customers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `customers` ORDER BY `created_at` DESC') as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, phone, address } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO `customers` (`id`, `name`, `phone`, `address`) VALUES (?, ?, ?, ?)',
      [id, name, phone, address]
    );
    res.status(201).json({ id, name, phone, address });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const fields = req.body;
  const id = req.params.id;
  try {
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ message: 'No fields to update' });

    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = keys.map(k => fields[k]);

    await pool.query(`UPDATE \`customers\` SET ${setClause} WHERE \`id\` = ?`, [...values, id]);
    
    const [rows] = await pool.query('SELECT * FROM `customers` WHERE `id` = ?', [id]) as any[];
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM `customers` WHERE `id` = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 3.4 CATEGORIES CRUD
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `categories` ORDER BY `name` ASC') as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Nama kategori wajib diisi' });
  }
  const id = uuidv4();
  try {
    // Check duplication
    const [existing] = await pool.query('SELECT * FROM `categories` WHERE `name` = ?', [name.trim()]) as any[];
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Kategori dengan nama tersebut sudah ada' });
    }
    
    await pool.query(
      'INSERT INTO `categories` (`id`, `name`) VALUES (?, ?)',
      [id, name.trim()]
    );
    res.status(201).json({ id, name: name.trim() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [categoryRows] = await pool.query('SELECT * FROM `categories` WHERE `id` = ?', [id]) as any[];
    if (categoryRows.length === 0) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    }
    const categoryName = categoryRows[0].name;

    const [items] = await pool.query('SELECT * FROM `items` WHERE `category` = ?', [categoryName]) as any[];
    if (items.length > 0) {
      return res.status(400).json({ 
        message: 'Kategori tidak dapat dihapus karena sedang digunakan oleh beberapa barang di katalog.' 
      });
    }

    await pool.query('DELETE FROM `categories` WHERE `id` = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 3.5 VOUCHERS CRUD
app.get('/api/vouchers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `vouchers` ORDER BY `created_at` DESC') as any[];
    res.json(rows.map((r: any) => ({ ...r, value: parseFloat(r.value), is_active: !!r.is_active })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vouchers', async (req, res) => {
  const { code, type, value, is_active, expires_at } = req.body;
  const id = uuidv4();
  const mysqlDate = expires_at ? expires_at.replace('T', ' ') + (expires_at.length === 16 ? ':00' : '') : null;
  try {
    await pool.query(
      'INSERT INTO `vouchers` (`id`, `code`, `type`, `value`, `is_active`, `expires_at`) VALUES (?, ?, ?, ?, ?, ?)',
      [id, code, type, value, is_active !== undefined ? is_active : true, mysqlDate]
    );
    res.status(201).json({ id, code, type, value, is_active: is_active !== undefined ? is_active : true, expires_at });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vouchers/:id', async (req, res) => {
  const fields = req.body;
  const id = req.params.id;
  try {
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ message: 'No fields to update' });
    
    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = keys.map(k => {
      if (k === 'expires_at') {
        const val = fields[k];
        if (val) {
          return val.replace('T', ' ') + (val.length === 16 ? ':00' : '');
        }
        return null;
      }
      return fields[k];
    });

    await pool.query(`UPDATE \`vouchers\` SET ${setClause} WHERE \`id\` = ?`, [...values, id]);
    const [rows] = await pool.query('SELECT * FROM `vouchers` WHERE `id` = ?', [id]) as any[];
    const r = rows[0];
    res.json({ ...r, value: parseFloat(r.value), is_active: !!r.is_active });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vouchers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM `vouchers` WHERE `id` = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vouchers/validate', async (req, res) => {
  const { code } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM `vouchers` WHERE `code` = ? AND `is_active` = TRUE', [code]) as any[];
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Kode voucher tidak valid atau sudah tidak aktif.' });
    }
    const r = rows[0];
    
    // Check if voucher is expired
    if (r.expires_at) {
      const expiresTime = new Date(r.expires_at).getTime();
      const nowTime = new Date().getTime();
      if (nowTime > expiresTime) {
        return res.status(400).json({ message: 'Voucher sudah kadaluwarsa / melewati masa berlaku.' });
      }
    }

    res.json({ ...r, value: parseFloat(r.value), is_active: !!r.is_active });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 4. TRANSACTIONS CRUD (with joined relations)
app.get('/api/transactions', async (req, res) => {
  try {
    const [transactions] = await pool.query('SELECT id, customer_id, item_id, DATE_FORMAT(start_date, "%Y-%m-%dT%H:%i:%s") AS start_date, duration_hours, total_price, status, discount_amount, voucher_code, DATE_FORMAT(actual_return_date, "%Y-%m-%dT%H:%i:%s") AS actual_return_date, created_at FROM `transactions` ORDER BY `start_date` DESC') as any[];
    const [customers] = await pool.query('SELECT * FROM `customers`') as any[];
    const [items] = await pool.query('SELECT * FROM `items`') as any[];

    // Format and join customer & item objects
    const formatted = transactions.map((t: any) => {
      const customer = customers.find((c: any) => c.id === t.customer_id);
      const item = items.find((i: any) => i.id === t.item_id);
      return {
        ...t,
        total_price: parseFloat(t.total_price),
        discount_amount: parseFloat(t.discount_amount),
        customer,
        item: item ? {
          ...item,
          price_3h: parseFloat(item.price_3h),
          price_6h: parseFloat(item.price_6h),
          price_12h: parseFloat(item.price_12h),
          price_24h: parseFloat(item.price_24h),
          daily_price: parseFloat(item.daily_price),
        } : null
      };
    });

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, customer_id, item_id, DATE_FORMAT(start_date, "%Y-%m-%dT%H:%i:%s") AS start_date, duration_hours, total_price, status, discount_amount, voucher_code, DATE_FORMAT(actual_return_date, "%Y-%m-%dT%H:%i:%s") AS actual_return_date, created_at FROM `transactions` WHERE `id` = ?', [req.params.id]) as any[];
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const t = rows[0];
    
    // Retrieve associated customer and item
    const [cRows] = await pool.query('SELECT * FROM `customers` WHERE `id` = ?', [t.customer_id]) as any[];
    const [iRows] = await pool.query('SELECT * FROM `items` WHERE `id` = ?', [t.item_id]) as any[];

    res.json({
      ...t,
      total_price: parseFloat(t.total_price),
      discount_amount: parseFloat(t.discount_amount),
      customer: cRows[0] || null,
      item: iRows[0] ? {
        ...iRows[0],
        price_3h: parseFloat(iRows[0].price_3h),
        price_6h: parseFloat(iRows[0].price_6h),
        price_12h: parseFloat(iRows[0].price_12h),
        price_24h: parseFloat(iRows[0].price_24h),
        daily_price: parseFloat(iRows[0].daily_price),
      } : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { customer_id, item_id, start_date, duration_hours, total_price, status, discount_amount, voucher_code } = req.body;
  const id = uuidv4();
  
  // Format start_date directly to MySQL format (YYYY-MM-DD HH:MM:SS) without UTC conversion
  const mysqlDate = start_date.replace('T', ' ') + (start_date.length === 16 ? ':00' : '');

  try {
    await pool.query(
      'INSERT INTO `transactions` (`id`, `customer_id`, `item_id`, `start_date`, `duration_hours`, `total_price`, `status`, `discount_amount`, `voucher_code`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, customer_id, item_id, mysqlDate, duration_hours, total_price, status || 'active', discount_amount || 0, voucher_code || null]
    );

    // Automatically set item status to 'rented'
    await pool.query('UPDATE `items` SET `status` = "rented" WHERE `id` = ?', [item_id]);

    res.status(201).json({ id, customer_id, item_id, start_date, duration_hours, total_price, status, discount_amount, voucher_code });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/transactions/:id', async (req, res) => {
  const fields = req.body;
  const id = req.params.id;
  try {
    // Check old transaction details
    const [oldRows] = await pool.query('SELECT * FROM `transactions` WHERE `id` = ?', [id]) as any[];
    if (oldRows.length === 0) return res.status(404).json({ message: 'Transaction not found' });
    const oldTx = oldRows[0];

    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ message: 'No fields to update' });

    let setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    let values = keys.map(k => {
      if (k === 'start_date' || k === 'actual_return_date') {
        const val = fields[k];
        if (val) {
          return val.replace('T', ' ') + (val.length === 16 ? ':00' : '');
        }
      }
      return fields[k];
    });

    await pool.query(`UPDATE \`transactions\` SET ${setClause} WHERE \`id\` = ?`, [...values, id]);

    // If status is updated to completed/late, free up the item
    if (fields.status === 'completed' || fields.status === 'late') {
      await pool.query('UPDATE `items` SET `status` = "available" WHERE `id` = ?', [oldTx.item_id]);
    }

    const [rows] = await pool.query('SELECT * FROM `transactions` WHERE `id` = ?', [id]) as any[];
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Start the server only in local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
