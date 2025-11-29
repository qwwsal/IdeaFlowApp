const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query, pool, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// 🔥 Обработка неперехваченных исключений
process.on('uncaughtException', (error) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

// Диагностика при запуске
console.log('🚀 Starting IdeaFlow Server...');
console.log('📁 Current directory:', __dirname);

// Проверяем существование build папки
const buildPath = path.join(__dirname, 'build');
if (fs.existsSync(buildPath)) {
  console.log('✅ Build folder exists');
  const buildContents = fs.readdirSync(buildPath);
  console.log('📁 Build contents:', buildContents);
} else {
  console.log('❌ Build folder NOT found - frontend not built');
}

// Логирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Создаем папку uploads, если нет
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ✅ Упрощенный CORS
app.use(cors({
  origin: true, // разрешить все origins
  credentials: true
}));

// Раздача статики из uploads
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// Обслуживание статических файлов React из корневой build папки
app.use(express.static(path.join(__dirname, 'build')));

// Настройка multer для файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Middleware для отключения кэширования API
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Парсинг JSON тела
app.use(express.json());

// ✅ Тестовые маршруты - должны работать всегда
app.get('/api/test', (req, res) => {
  console.log('✅ Test endpoint called');
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

app.post('/api/test-login', (req, res) => {
  console.log('✅ Test login called:', req.body);
  res.json({ message: 'Test login successful', user: { id: 1, email: 'test@test.com' } });
});

// ✅ Проверка подключения к БД
app.get('/api/debug/db', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as user_count FROM "Users"');
    res.json({ 
      status: 'OK',
      userCount: result.rows[0].user_count,
      database: 'Connected'
    });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ 
      error: 'Database error',
      message: err.message 
    });
  }
});

// Диагностика структуры таблицы Cases
app.get('/api/debug/cases-structure', async (req, res) => {
  try {
    // Получим структуру таблицы Cases
    const structure = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'Cases'
      ORDER BY ordinal_position
    `);
    
    // Получим несколько примеров записей
    const samples = await query('SELECT * FROM "Cases" LIMIT 3');
    
    res.json({
      tableStructure: structure.rows,
      sampleRecords: samples.rows.map(row => ({
        ...row,
        files: row.files ? JSON.parse(row.files) : []
      }))
    });
    
  } catch (err) {
    console.error('Error getting table structure:', err);
    res.status(500).json({ error: err.message });
  }
});

// Middleware для получения текущего пользователя
const getCurrentUser = async (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.query.currentUserId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Пользователь не авторизован' });
  }
  
  try {
    const result = await query('SELECT id, email, "firstName", "lastName", photo, description FROM "Users" WHERE id = $1', [userId]);
    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    req.currentUser = result.rows[0];
    next();
  } catch (err) {
    console.error('Ошибка при получении пользователя:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// API маршруты
app.get('/api', (req, res) => {
  res.json({ 
    message: 'IdeaFlow API is working!',
    database: process.env.DATABASE_PUBLIC_URL ? 'Configured' : 'Not configured'
  });
});

// Регистрация
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO "Users" (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email уже зарегистрирован' });
    }
    console.error('Ошибка регистрации:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('🔐 Login attempt for email:', email);
  
  try {
    const result = await query('SELECT * FROM "Users" WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(400).json({ error: 'Пользователь не найден' });
    }
    
    console.log('✅ User found:', user.id);
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log('❌ Password mismatch for user:', email);
      return res.status(400).json({ error: 'Неверный пароль' });
    }
    
    console.log('🎉 Login successful for user:', user.id);
    
    res.json({ 
      id: user.id, 
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      photo: user.photo
    });
  } catch (err) {
    console.error('💥 Ошибка входа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение данных текущего пользователя
app.get('/api/current-user', getCurrentUser, (req, res) => {
  res.json(req.currentUser);
});

// Профиль
app.get('/api/profile/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    const result = await query(
      'SELECT id, email, "firstName", "lastName", photo, description FROM "Users" WHERE id = $1',
      [id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка получения профиля:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.put('/api/profile/:id', async (req, res) => {
  const id = req.params.id;
  const { firstName, lastName, photo, description } = req.body;
  
  try {
    const result = await query(
      'UPDATE "Users" SET "firstName" = $1, "lastName" = $2, photo = $3, description = $4 WHERE id = $5 RETURNING *',
      [firstName, lastName, photo, description, id]
    );
    
    res.json({ message: 'Профиль успешно обновлён', user: result.rows[0] });
  } catch (err) {
    console.error('Ошибка обновления профиля:', err);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

// Создание кейса
const uploadCaseFiles = upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'files', maxCount: 15 }]);

app.post('/api/cases', uploadCaseFiles, async (req, res) => {
  try {
    const { userId, title, theme, description } = req.body;
    if (!userId || !title)
      return res.status(400).json({ error: 'userId и title обязательны' });

    let coverPath = null;
    if (req.files.cover && req.files.cover[0])
      coverPath = `/uploads/${req.files.cover[0].filename}`;

    let filesPaths = [];
    if (req.files.files)
      filesPaths = req.files.files.map(file => `/uploads/${file.filename}`);

    const result = await query(
      `INSERT INTO "Cases" ("userId", title, theme, description, cover, files, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, title, theme || '', description || '', coverPath, JSON.stringify(filesPaths), 'open']
    );

    res.json({ id: result.rows[0].id, message: 'Кейс успешно создан' });
  } catch (err) {
    console.error('Ошибка создания кейса:', err);
    res.status(500).json({ error: 'Ошибка при сохранении кейса' });
  }
});

// Получение кейсов с фильтрацией - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ
app.get('/api/cases', async (req, res) => {
  console.log('🔍 /api/cases called with query:', req.query);
  
  const userId = req.query.userId;
  
  try {
    let sql = `
      SELECT 
        c.*, 
        u.email as "userEmail" 
      FROM "Cases" c 
      LEFT JOIN "Users" u ON c."userId" = u.id
    `;
    const params = [];
    
    if (userId) {
      sql += ' WHERE c."userId" = $1';
      params.push(userId);
      console.log(`🔍 Filtering by userId: ${userId}`);
    }
    
    sql += ' ORDER BY c."createdAt" DESC';
    
    console.log('📝 Final SQL query:', sql);
    console.log('📝 SQL params:', params);
    
    const result = await query(sql, params);
    console.log('📊 Database returned rows:', result.rows.length);
    
    // Обработка данных для фронтенда
    const processedRows = result.rows.map(row => {
      // Обработка поля files
      let files = [];
      if (row.files) {
        if (typeof row.files === 'string') {
          try {
            files = JSON.parse(row.files);
          } catch (e) {
            console.warn(`⚠️ Could not parse files for case ${row.id}:`, row.files);
            files = [];
          }
        } else if (Array.isArray(row.files)) {
          files = row.files;
        }
      }
      
      // Создаем гарантированно правильный объект
      return {
        id: row.id,
        title: row.title || '',
        description: row.description || '',
        theme: row.theme || '',
        status: row.status || 'open',
        userId: row.userId,
        userEmail: row.userEmail,
        cover: row.cover,
        files: files,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
    });
    
    console.log('✅ Successfully processed cases:', processedRows.length);
    res.json(processedRows);
    
  } catch (err) {
    console.error('❌ Ошибка получения кейсов:', err);
    console.error('❌ Error details:', err.message);
    
    // Fallback - попробуем получить базовые данные
    try {
      console.log('🔄 Fallback: trying basic query...');
      let fallbackSql = 'SELECT id, title, status, cover FROM "Cases"';
      const fallbackParams = [];
      
      if (userId) {
        fallbackSql += ' WHERE "userId" = $1';
        fallbackParams.push(userId);
      }
      
      fallbackSql += ' ORDER BY id DESC';
      
      const fallbackResult = await query(fallbackSql, fallbackParams);
      const fallbackRows = fallbackResult.rows.map(row => ({
        id: row.id,
        title: row.title || '',
        status: row.status || 'open',
        userId: row.userId,
        userEmail: null,
        files: [],
        cover: row.cover,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      console.log('✅ Fallback successful, sending basic data');
      res.json(fallbackRows);
    } catch (fallbackErr) {
      console.error('❌ Fallback also failed:', fallbackErr);
      res.status(500).json({ 
        error: 'Ошибка при получении кейсов',
        details: err.message
      });
    }
  }
});

// Детали кейса - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ
app.get('/api/cases/:id', async (req, res) => {
  const id = req.params.id;
  console.log('🔍 Getting case details for id:', id);
  
  try {
    const result = await query(
      `SELECT 
        c.*, 
        u.email as "userEmail" 
      FROM "Cases" c 
      LEFT JOIN "Users" u ON c."userId" = u.id 
      WHERE c.id = $1`,
      [id]
    );
    
    if (!result.rows[0]) {
      console.log('❌ Case not found:', id);
      return res.status(404).json({ error: 'Кейс не найден' });
    }
    
    const row = result.rows[0];
    console.log('📄 Raw case data:', row);
    
    // Обработка files
    let files = [];
    if (row.files) {
      if (typeof row.files === 'string') {
        try {
          files = JSON.parse(row.files);
        } catch (e) {
          console.warn('⚠️ Could not parse files for case', row.id);
        }
      } else if (Array.isArray(row.files)) {
        files = row.files;
      }
    }
    
    const caseData = {
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      theme: row.theme || '',
      status: row.status || 'open',
      userId: row.userId,
      userEmail: row.userEmail,
      cover: row.cover,
      files: files,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
    
    console.log('✅ Sending case data for id:', id, caseData);
    res.json(caseData);
    
  } catch (err) {
    console.error('❌ Ошибка получения кейса:', err);
    console.error('❌ Error details:', err.message);
    res.status(500).json({ 
      error: 'Ошибка при получении кейса',
      details: err.message
    });
  }
});

// Принять кейс (перенос в ProcessedCases)
app.put('/api/cases/:id/accept', async (req, res) => {
  const caseId = Number(req.params.id);
  const { executorId } = req.body;
  
  if (!executorId || isNaN(caseId)) {
    return res.status(400).json({ error: 'Неверные параметры' });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const caseResult = await client.query('SELECT * FROM "Cases" WHERE id = $1', [caseId]);
      if (!caseResult.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Кейс не найден' });
      }
      
      const caseRow = caseResult.rows[0];
      
      const userResult = await client.query('SELECT email FROM "Users" WHERE id = $1', [executorId]);
      const executorEmail = userResult.rows[0] ? userResult.rows[0].email : null;
      
      await client.query(
        `INSERT INTO "ProcessedCases" ("caseId", "userId", title, theme, description, cover, files, status, "executorId", "executorEmail")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [caseRow.id, caseRow.userId, caseRow.title, caseRow.theme, caseRow.description, caseRow.cover, 
         caseRow.files, 'in_process', executorId, executorEmail]
      );
      
      await client.query('UPDATE "Cases" SET status = $1 WHERE id = $2', ['accepted', caseId]);
      
      await client.query('COMMIT');
      res.json({ message: 'Кейс принят', caseId });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Ошибка принятия кейса:', err);
    res.status(500).json({ error: err.message || 'Ошибка сервера' });
  }
});

// Получение принятых кейсов - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.get('/api/processed-cases', async (req, res) => {
  console.log('🔍 /api/processed-cases called');
  
  try {
    const result = await query(
      `SELECT 
        pc.*, 
        u.email as "userEmail" 
      FROM "ProcessedCases" pc 
      LEFT JOIN "Users" u ON pc."userId" = u.id`
    );
    
    console.log('📊 Processed cases found:', result.rows.length);
    
    const rows = result.rows.map(row => {
      let files = [];
      if (row.files) {
        if (typeof row.files === 'string') {
          try {
            files = JSON.parse(row.files);
          } catch (e) {
            console.warn('⚠️ Could not parse files for processed case', row.id);
          }
        } else if (Array.isArray(row.files)) {
          files = row.files;
        }
      }
      
      return {
        ...row,
        files: files
      };
    });
    
    res.json(rows);
  } catch (err) {
    console.error('❌ Ошибка получения принятых кейсов:', err);
    console.error('❌ Error details:', err.message);
    res.status(500).json({ 
      error: 'Ошибка при получении принятых кейсов',
      details: err.message
    });
  }
});

// Детали принятого кейса - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.get('/api/processed-cases/:id', async (req, res) => {
  const id = req.params.id;
  console.log('🔍 Getting processed case details for id:', id);
  
  try {
    const result = await query(
      `SELECT 
        pc.*, 
        u.email as "userEmail" 
      FROM "ProcessedCases" pc 
      LEFT JOIN "Users" u ON pc."userId" = u.id 
      WHERE pc.id = $1`,
      [id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }
    
    const row = result.rows[0];
    
    let files = [];
    if (row.files) {
      if (typeof row.files === 'string') {
        try {
          files = JSON.parse(row.files);
        } catch (e) {
          console.warn('⚠️ Could not parse files for processed case', row.id);
        }
      } else if (Array.isArray(row.files)) {
        files = row.files;
      }
    }
    
    const processedCaseData = {
      ...row,
      files: files
    };
    
    console.log('✅ Sending processed case data for id:', id);
    res.json(processedCaseData);
  } catch (err) {
    console.error('Ошибка получения принятого кейса:', err);
    console.error('❌ Error details:', err.message);
    res.status(500).json({ 
      error: 'Ошибка при получении принятого кейса',
      details: err.message
    });
  }
});

// Загрузка фото профиля
app.post('/api/upload-photo', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не выбран' });
  res.json({ photoPath: `/uploads/${req.file.filename}` });
});

// Загрузка файлов для принятых кейсов
const uploadExtraFiles = upload.array('extraFiles', 15);
app.post('/api/processed-cases/:id/upload-files', uploadExtraFiles, async (req, res) => {
  const id = req.params.id;
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Файлы не выбраны' });
  }
  
  try {
    const result = await query('SELECT files FROM "ProcessedCases" WHERE id = $1', [id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }
    
    let existingFiles = result.rows[0].files ? JSON.parse(result.rows[0].files) : [];
    const newFiles = req.files.map(file => `/uploads/${file.filename}`);
    const updatedFiles = existingFiles.concat(newFiles);
    
    await query('UPDATE "ProcessedCases" SET files = $1 WHERE id = $2', [JSON.stringify(updatedFiles), id]);
    res.json({ message: 'Файлы добавлены', files: updatedFiles });
    
  } catch (err) {
    console.error('Ошибка загрузки файлов:', err);
    res.status(500).json({ error: 'Ошибка сохранения файлов' });
  }
});

// Завершение принятого кейса, создание проекта и удаление из ProcessedCases
app.put('/api/processed-cases/:id/complete', async (req, res) => {
  const processedCaseId = Number(req.params.id);
  const { userId, title, theme, description, cover, files } = req.body;
  
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const pCaseResult = await client.query(
        'SELECT * FROM "ProcessedCases" WHERE id = $1 AND "executorId" = $2',
        [processedCaseId, userId]
      );
      
      if (!pCaseResult.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Кейс не найден или не назначен вам' });
      }
      
      const pCase = pCaseResult.rows[0];
      
      const userResult = await client.query('SELECT email FROM "Users" WHERE id = $1', [userId]);
      const executorEmail = userResult.rows[0] ? userResult.rows[0].email : null;
      
      const projectResult = await client.query(
        `INSERT INTO "Projects" ("caseId", "userId", title, theme, description, cover, files, status, "executorEmail")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [pCase.caseId, pCase.userId, title || pCase.title, theme || pCase.theme, 
         description || pCase.description, cover || pCase.cover, 
         files ? JSON.stringify(files) : pCase.files, 'closed', executorEmail]
      );
      
      await client.query('DELETE FROM "ProcessedCases" WHERE id = $1', [processedCaseId]);
      
      await client.query('COMMIT');
      res.json({ message: 'Проект успешно создан', projectId: projectResult.rows[0].id });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Ошибка завершения кейса:', err);
    res.status(500).json({ error: 'Ошибка создания проекта' });
  }
});

// Получение проектов - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ
app.get('/api/projects', async (req, res) => {
  console.log('🔍 /api/projects called with query:', req.query);
  const userId = req.query.userId;
  const userEmail = req.query.userEmail;
  
  try {
    let sql = `
      SELECT 
        p.*,
        u.email as "userEmail"
      FROM "Projects" p
      LEFT JOIN "Users" u ON p."userId" = u.id
    `;
    const params = [];
    let paramCount = 0;
    
    if (userId) {
      sql += ` WHERE p."userId" = $${++paramCount}`;
      params.push(userId);
      console.log(`🔍 Filtering by userId: ${userId}`);
    } else if (userEmail) {
      sql += ` WHERE p."executorEmail" = $${++paramCount} AND p.status = 'closed'`;
      params.push(userEmail);
      console.log(`🔍 Filtering by executorEmail: ${userEmail}`);
    }
    
    console.log('📝 Projects SQL:', sql);
    console.log('📝 Projects params:', params);
    
    const result = await query(sql, params);
    console.log('📊 Projects found:', result.rows.length);
    
    // Обработка данных
    const projects = result.rows.map(row => {
      let files = [];
      if (row.files) {
        if (typeof row.files === 'string') {
          try {
            files = JSON.parse(row.files);
          } catch (e) {
            console.warn('⚠️ Could not parse files for project', row.id);
          }
        } else if (Array.isArray(row.files)) {
          files = row.files;
        }
      }
      
      return {
        id: row.id,
        caseId: row.caseId,
        userId: row.userId,
        title: row.title || '',
        theme: row.theme || '',
        description: row.description || '',
        cover: row.cover,
        files: files,
        status: row.status || 'closed',
        executorEmail: row.executorEmail,
        userEmail: row.userEmail,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
    });
    
    console.log('✅ Sending projects:', projects.length);
    res.json(projects);
    
  } catch (err) {
    console.error('❌ Ошибка получения проектов:', err);
    console.error('❌ Error details:', err.message);
    
    // Fallback - простой запрос
    try {
      console.log('🔄 Fallback: trying simple projects query...');
      const fallback = await query('SELECT id, title, status FROM "Projects"');
      const simpleProjects = fallback.rows.map(row => ({
        id: row.id,
        title: row.title || '',
        status: row.status || 'closed',
        files: []
      }));
      
      console.log('✅ Fallback successful, sending basic projects data');
      res.json(simpleProjects);
    } catch (fallbackErr) {
      console.error('❌ Fallback also failed:', fallbackErr);
      res.status(500).json({ 
        error: 'Ошибка при получении проектов',
        details: err.message
      });
    }
  }
});

// Получение деталей проекта - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ
app.get('/api/projects/:id', async (req, res) => {
  const id = req.params.id;
  console.log('🔍 Getting project details for id:', id);
  
  try {
    const result = await query(
      `SELECT 
        p.*,
        u.email as "userEmail" 
      FROM "Projects" p 
      LEFT JOIN "Users" u ON p."userId" = u.id 
      WHERE p.id = $1`,
      [id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    
    const row = result.rows[0];
    
    // Обработка files
    let files = [];
    if (row.files) {
      if (typeof row.files === 'string') {
        try {
          files = JSON.parse(row.files);
        } catch (e) {
          console.warn('⚠️ Could not parse files for project', row.id);
        }
      } else if (Array.isArray(row.files)) {
        files = row.files;
      }
    }
    
    const projectData = {
      id: row.id,
      caseId: row.caseId,
      userId: row.userId,
      title: row.title || '',
      theme: row.theme || '',
      description: row.description || '',
      cover: row.cover,
      files: files,
      status: row.status || 'closed',
      executorEmail: row.executorEmail,
      userEmail: row.userEmail,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
    
    console.log('✅ Sending project data for id:', id);
    res.json(projectData);
  } catch (err) {
    console.error('Ошибка получения проекта:', err);
    console.error('❌ Error details:', err.message);
    res.status(500).json({ 
      error: 'Ошибка при получении проекта',
      details: err.message
    });
  }
});

// Получить отзывы пользователя - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.get('/api/reviews', async (req, res) => {
  const userId = req.query.userId;
  console.log('🔍 /api/reviews called with userId:', userId);
  
  try {
    let sql = 'SELECT * FROM "Reviews"';
    const params = [];
    
    if (userId) {
      sql += ' WHERE "userId" = $1';
      params.push(userId);
    }
    
    console.log('📝 Reviews SQL:', sql);
    console.log('📝 Reviews params:', params);
    
    const result = await query(sql, params);
    console.log('📊 Reviews found:', result.rows.length);
    
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Ошибка получения отзывов:', err);
    console.error('❌ Error details:', err.message);
    res.status(500).json({ 
      error: 'Ошибка при получении отзывов',
      details: err.message
    });
  }
});

// Добавить новый отзыв
app.post('/api/reviews', async (req, res) => {
  const { userId, reviewerId, reviewerName, reviewerPhoto, text, rating } = req.body;
  
  if (!userId || !text || !rating || !reviewerId) {
    return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
  }
  
  try {
    const result = await query(
      'INSERT INTO "Reviews" ("userId", "reviewerId", "reviewerName", "reviewerPhoto", text, rating) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, reviewerId, reviewerName, reviewerPhoto, text, rating]
    );
    
    const reviewsResult = await query('SELECT * FROM "Reviews" WHERE "userId" = $1', [userId]);
    res.json(reviewsResult.rows);
    
  } catch (err) {
    console.error('Ошибка добавления отзыва:', err);
    res.status(500).json({ error: 'Ошибка при добавлении отзыва' });
  }
});

// Проверка всех таблиц и данных в БД
app.get('/api/debug/tables', async (req, res) => {
  try {
    // Получить все таблицы в базе данных
    const tablesResult = await query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    // Для каждой таблицы получить количество записей и примеры данных
    const tablesInfo = [];
    
    for (let table of tablesResult.rows) {
      const countResult = await query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
      let sampleData = [];
      
      if (countResult.rows[0].count > 0) {
        const sampleResult = await query(`SELECT * FROM "${table.table_name}" LIMIT 2`);
        sampleData = sampleResult.rows;
      }
      
      tablesInfo.push({
        tableName: table.table_name,
        tableType: table.table_type,
        rowCount: countResult.rows[0].count,
        sampleData: sampleData
      });
    }

    res.json({
      database: (await query('SELECT current_database() as name')).rows[0].name,
      tables: tablesInfo
    });

  } catch (err) {
    console.error('Error checking tables:', err);
    res.status(500).json({ error: err.message });
  }
});

// Диагностика подключения к БД
app.get('/api/debug/connection', async (req, res) => {
  try {
    // Получим информацию о подключении
    const dbInfo = await query(`
      SELECT 
        current_database() as database,
        current_user as user,
        inet_server_addr() as host,
        inet_server_port() as port,
        version() as version
    `);
    
    // Проверим все таблицы
    const tables = await query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    // Количество записей в каждой таблице
    const tableCounts = {};
    for (let table of tables.rows) {
      const countResult = await query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
      tableCounts[table.table_name] = countResult.rows[0].count;
    }
    
    res.json({
      connection: dbInfo.rows[0],
      tables: tables.rows,
      tableCounts: tableCounts
    });
    
  } catch (err) {
    console.error('Connection debug error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Диагностика таблицы Projects
app.get('/api/debug/projects-structure', async (req, res) => {
  try {
    const structure = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Projects' 
      ORDER BY ordinal_position
    `);
    
    const samples = await query('SELECT * FROM "Projects" LIMIT 3');
    
    res.json({
      tableStructure: structure.rows,
      sampleRecords: samples.rows
    });
    
  } catch (err) {
    console.error('Error getting projects structure:', err);
    res.status(500).json({ error: err.message });
  }
});

// Полная диагностика всех таблиц
app.get('/api/debug/all-tables', async (req, res) => {
  try {
    const tables = ['Users', 'Cases', 'ProcessedCases', 'Projects', 'Reviews'];
    const results = {};
    
    for (const table of tables) {
      try {
        const structure = await query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [table]);
        
        const sample = await query(`SELECT * FROM "${table}" LIMIT 2`);
        
        results[table] = {
          structure: structure.rows,
          sample: sample.rows
        };
      } catch (err) {
        results[table] = { error: err.message };
      }
    }
    
    res.json(results);
  } catch (err) {
    console.error('Full diagnostics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Catch-all handler для React Router
app.get('*', (req, res) => {
  console.log(`🎯 Catch-all handler: ${req.method} ${req.path}`);
  
  // Пропускаем API запросы и статические файлы
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    console.log(`❌ API route not found: ${req.path}`);
    return res.status(404).json({ 
      error: 'API route not found', 
      path: req.path,
      message: 'Check server logs for available routes'
    });
  }
  
  // Для всех остальных запросов отдаем React приложение
  const indexPath = path.join(__dirname, 'build', 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`✅ Serving React app for: ${req.path}`);
    res.sendFile(indexPath);
  } else {
    console.log(`❌ Build folder not found for: ${req.path}`);
    res.status(500).json({ 
      error: 'Frontend not built',
      message: 'React build folder not found'
    });
  }
});

// Детальная диагностика таблицы Cases
app.get('/api/debug/cases-detailed', async (req, res) => {
  try {
    console.log('🔍 Detailed Cases diagnostics...');
    
    // 1. Проверим структуру таблицы Cases
    const structure = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Cases' 
      ORDER BY ordinal_position
    `);
    console.log('📋 Cases table structure:', structure.rows);

    // 2. Проверим есть ли данные
    const countResult = await query('SELECT COUNT(*) as count FROM "Cases"');
    console.log('📊 Cases count:', countResult.rows[0].count);

    // 3. Попробуем получить данные разными способами
    let casesData;
    try {
      // Способ 1: Простой SELECT
      casesData = await query('SELECT * FROM "Cases" LIMIT 3');
      console.log('✅ Simple SELECT worked');
    } catch (err1) {
      console.error('❌ Simple SELECT failed:', err1.message);
      
      try {
        // Способ 2: SELECT с конкретными полями
        casesData = await query('SELECT id, title, status FROM "Cases" LIMIT 3');
        console.log('✅ SELECT with specific fields worked');
      } catch (err2) {
        console.error('❌ SELECT with specific fields failed:', err2.message);
        
        // Способ 3: Проверим какие поля вообще есть
        const sample = await query('SELECT * FROM "Cases" LIMIT 1');
        console.log('📋 Sample row:', sample.rows[0]);
        casesData = sample;
      }
    }

    // 4. Проверим JOIN с Users
    let joinResult;
    try {
      joinResult = await query(`
        SELECT "Cases".*, "Users".email 
        FROM "Cases" 
        LEFT JOIN "Users" ON "Cases"."userId" = "Users".id 
        LIMIT 2
      `);
      console.log('✅ JOIN with Users worked');
    } catch (err) {
      console.error('❌ JOIN with Users failed:', err.message);
      joinResult = { error: err.message };
    }

    res.json({
      tableStructure: structure.rows,
      rowCount: countResult.rows[0].count,
      sampleData: casesData?.rows || [],
      joinTest: joinResult?.rows || joinResult,
      allTables: (await query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`)).rows
    });

  } catch (err) {
    console.error('❌ Detailed diagnostics failed:', err);
    res.status(500).json({ 
      error: 'Diagnostics failed',
      details: err.message,
      stack: err.stack
    });
  }
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Глобальная ошибка сервера:', err.stack);
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

// Инициализация базы данных и запуск сервера
async function startServer() {
  try {
    await initializeDatabase();
    console.log('База данных инициализирована');
    
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
      console.log(`Frontend available at: https://ideaflowapp-production.up.railway.app`);
    });
  } catch (err) {
    console.error('Ошибка запуска сервера:', err);
    process.exit(1);
  }
}

startServer();