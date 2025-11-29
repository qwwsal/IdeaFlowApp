const { Pool } = require('pg');

// Создаем пул подключений к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Функция для инициализации таблиц
async function initializeDatabase() {
  try {
    console.log('Подключение к PostgreSQL...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    // Создаем таблицу Users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        photo TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица Users создана или уже существует');

    // Создаем таблицу Cases
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Cases (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        theme TEXT,
        description TEXT,
        cover TEXT,
        files TEXT,
        status TEXT DEFAULT 'open',
        executorId INTEGER,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('Таблица Cases создана или уже существует');

    // Создаем таблицу ProcessedCases
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ProcessedCases (
        id SERIAL PRIMARY KEY,
        caseId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        theme TEXT,
        description TEXT,
        cover TEXT,
        files TEXT,
        status TEXT DEFAULT 'in_process',
        executorEmail TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(caseId) REFERENCES Cases(id) ON DELETE CASCADE,
        FOREIGN KEY(userId) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('Таблица ProcessedCases создана или уже существует');

    // Создаем таблицу Projects
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Projects (
        id SERIAL PRIMARY KEY,
        caseId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        theme TEXT,
        description TEXT,
        cover TEXT,
        files TEXT,
        status TEXT DEFAULT 'closed',
        executorEmail TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY(caseId) REFERENCES Cases(id) ON DELETE CASCADE
      )
    `);
    console.log('Таблица Projects создана или уже существует');

    // Создаем таблицу Reviews
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Reviews (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        reviewerId INTEGER NOT NULL,
        reviewerName TEXT,
        reviewerPhoto TEXT,
        text TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY(reviewerId) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('Таблица Reviews создана или уже существует');

    console.log('Все таблицы успешно инициализированы');

  } catch (err) {
    console.error('Ошибка при инициализации базы данных:', err);
    throw err;
  }
}

// Тестовое подключение
async function testConnection() {
  try {
    console.log('Testing connection to:', process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] : 'No DATABASE_URL');
    const result = await pool.query('SELECT version()');
    console.log('PostgreSQL подключен успешно:', result.rows[0].version);
    return true;
  } catch (err) {
    console.error('Ошибка подключения к PostgreSQL:', err.message);
    return false;
  }
}

// Универсальная функция для запросов
async function query(text, params) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('Ошибка выполнения запроса:', err);
    throw err;
  }
}

module.exports = {
  query,
  pool,
  initializeDatabase,
  testConnection
};