const { Pool } = require('pg');

// Создаем пул подключений к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Функция для инициализации таблиц - ИСПРАВЛЕННАЯ ВЕРСИЯ
async function initializeDatabase() {
  try {
    console.log('Подключение к PostgreSQL...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    // Проверяем подключение
    await pool.query('SELECT NOW()');
    console.log('✅ Подключение к PostgreSQL успешно');

    // ЗАКОММЕНТИРОВАНО: НЕ создаем таблицы, используем существующие
    // Только проверяем какие таблицы есть в БД
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📊 Существующие таблицы в базе данных:');
    tablesResult.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    // Проверяем количество записей в основных таблицах
    try {
      const usersCount = await pool.query('SELECT COUNT(*) as count FROM Users');
      const casesCount = await pool.query('SELECT COUNT(*) as count FROM Cases');
      
      console.log(`👥 Пользователей в БД: ${usersCount.rows[0].count}`);
      console.log(`📁 Кейсов в БД: ${casesCount.rows[0].count}`);
      
      if (casesCount.rows[0].count > 0) {
        // Покажем несколько примеров кейсов
        const sampleCases = await pool.query('SELECT id, title, status FROM Cases LIMIT 3');
        console.log('📋 Примеры кейсов:');
        sampleCases.rows.forEach(caseItem => {
          console.log(`   - ID: ${caseItem.id}, Title: "${caseItem.title}", Status: ${caseItem.status}`);
        });
      }
    } catch (err) {
      console.log('⚠️  Не удалось проверить данные таблиц:', err.message);
    }

    console.log('✅ Используем существующие таблицы с данными');

  } catch (err) {
    console.error('❌ Ошибка при инициализации базы данных:', err);
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
    console.error('❌ Ошибка выполнения запроса:', err);
    console.error('📝 Запрос:', text);
    console.error('📝 Параметры:', params);
    throw err;
  }
}

module.exports = {
  query,
  pool,
  initializeDatabase,
  testConnection
};