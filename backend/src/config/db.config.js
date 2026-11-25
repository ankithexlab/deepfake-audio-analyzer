/**
 * db.config.js
 * ─────────────────────────────────────────────────────────────
 * PostgreSQL Database Connection & Auto-Migration Module.
 * Supports:
 *   - Neon PostgreSQL (Production)
 *   - Local PostgreSQL (Development)
 * ─────────────────────────────────────────────────────────────
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// ============================================================
// PostgreSQL Connection Configuration
// ============================================================

const isProductionDatabase = Boolean(process.env.DATABASE_URL);

const pool = new Pool({
  // Production: Neon connection string
  connectionString: process.env.DATABASE_URL || undefined,

  // Local development fallback
  host: isProductionDatabase
    ? undefined
    : (process.env.DB_HOST || 'localhost'),

  port: isProductionDatabase
    ? undefined
    : (parseInt(process.env.DB_PORT, 10) || 5432),

  user: isProductionDatabase
    ? undefined
    : (process.env.DB_USER || 'postgres'),

  password: isProductionDatabase
    ? undefined
    : (process.env.DB_PASSWORD || 'admin'),

  database: isProductionDatabase
    ? undefined
    : (process.env.DB_NAME || 'deepfake_db'),

  // Neon requires SSL connections
  ssl: isProductionDatabase
    ? { rejectUnauthorized: false }
    : undefined,

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// ============================================================
// Connection Error Handling
// ============================================================

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', {
    error: err.message,
  });
});

// ============================================================
// Database Initialization & Auto-Migration
// ============================================================

async function initDatabase() {
  let client;

  try {
    logger.info('Connecting to PostgreSQL database...');

    client = await pool.connect();

    // Verify database connection
    await client.query('SELECT NOW()');

    logger.info('PostgreSQL connection established successfully.');

    // --------------------------------------------------------
    // Create Tables
    // --------------------------------------------------------

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      -- 1. Users Table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. Audio Files Table
      CREATE TABLE IF NOT EXISTS audio_files (
        id VARCHAR(100) PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        original_name VARCHAR(255) NOT NULL,
        format VARCHAR(50) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size_bytes BIGINT NOT NULL,
        size_human VARCHAR(50) NOT NULL,
        saved_path TEXT NOT NULL,
        saved_filename VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Predictions Table
      CREATE TABLE IF NOT EXISTS predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id VARCHAR(100)
          REFERENCES audio_files(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        is_deepfake BOOLEAN NOT NULL,
        label VARCHAR(50) NOT NULL,
        confidence DOUBLE PRECISION NOT NULL,
        fake_probability DOUBLE PRECISION NOT NULL,
        real_probability DOUBLE PRECISION NOT NULL,
        model_name VARCHAR(100) NOT NULL,
        model_version VARCHAR(50) NOT NULL,
        model_type VARCHAR(50) NOT NULL,
        features_used JSONB,
        features_summary JSONB,
        visualizations JSONB,
        processing_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Reports Table
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id VARCHAR(100)
          REFERENCES audio_files(id) ON DELETE CASCADE,
        prediction_id UUID
          REFERENCES predictions(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        report_title VARCHAR(255) NOT NULL,
        report_data JSONB NOT NULL,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Audit Logs Table
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        ip_address VARCHAR(50),
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Dataset Files Table
      CREATE TABLE IF NOT EXISTS dataset_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename VARCHAR(255) NOT NULL,
        relative_path TEXT NOT NULL UNIQUE,
        file_path TEXT NOT NULL,
        label VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL,
        file_size BIGINT NOT NULL,
        duration_seconds DOUBLE PRECISION,
        sample_rate INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // --------------------------------------------------------
    // Create Indexes
    // --------------------------------------------------------

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audio_files_user_id
        ON audio_files(user_id);

      CREATE INDEX IF NOT EXISTS idx_audio_files_created_at
        ON audio_files(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_predictions_file_id
        ON predictions(file_id);

      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
        ON audit_logs(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_dataset_files_label
        ON dataset_files(label);

      CREATE INDEX IF NOT EXISTS idx_dataset_files_category
        ON dataset_files(category);
    `);

    // --------------------------------------------------------
    // Seed Demo User
    // --------------------------------------------------------

    const demoEmail = 'demo@aura.ai';

    const checkUser = await client.query(
      'SELECT id, role FROM users WHERE email = $1',
      [demoEmail]
    );

    if (checkUser.rows.length === 0) {
      const hashedPw = await bcrypt.hash('password123', 10);

      await client.query(
        `
          INSERT INTO users (name, email, password_hash, role)
          VALUES ('Demo Examiner', $1, $2, 'guest')
        `,
        [demoEmail, hashedPw]
      );

      logger.info(
        'Default demo user seeded: demo@aura.ai / password123'
      );

    } else if (checkUser.rows[0].role !== 'guest') {
      await client.query(
        `
          UPDATE users
          SET role = 'guest',
              updated_at = CURRENT_TIMESTAMP
          WHERE email = $1
        `,
        [demoEmail]
      );

      logger.info(
        'Default demo user role updated to guest.'
      );
    }

    logger.info(
      'PostgreSQL schema verified and tables ready.'
    );

  } catch (err) {
    logger.error('Failed to initialize PostgreSQL database', {
      error: err.message,
    });

    throw err;

  } finally {
    if (client) {
      client.release();
    }
  }
}

// ============================================================
// Module Exports
// ============================================================

module.exports = {
  pool,

  query: (text, params) => pool.query(text, params),

  initDatabase,
};