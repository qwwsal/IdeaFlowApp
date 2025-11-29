const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query, pool, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

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

// CORS настройка для Railway
app.use(cors({
  origin: [
    'https://ideaflowapp-production.up.railway.app',
    'http://localhost:3000'
  ],
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

// Парсинг JSON тела
app.use(express.json());

// Middleware для получения текущего пользователя
const getCurrentUser = async (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.query.currentUserId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Пользователь не авторизован' });
  }
  
  try {
    const result = await query('SELECT id, email, firstName, lastName, photo, description FROM Users WHERE id = $1', [userId]);
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
      'INSERT INTO Users (email, password) VALUES ($1, $2) RETURNING id, email',
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
  
  try {
    const result = await query('SELECT * FROM Users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) return res.status(400).json({ error: 'Пользователь не найден' });
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Неверный пароль' });
    
    res.json({ 
      id: user.id, 
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      photo: user.photo
    });
  } catch (err) {
    console.error('Ошибка входа:', err);
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
      'SELECT id, email, firstName, lastName, photo, description FROM Users WHERE id = $1',
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
      'UPDATE Users SET firstName = $1, lastName = $2, photo = $3, description = $4 WHERE id = $5 RETURNING *',
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
      `INSERT INTO Cases (userId, title, theme, description, cover, files, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, title, theme || '', description || '', coverPath, JSON.stringify(filesPaths), 'open']
    );

    res.json({ id: result.rows[0].id, message: 'Кейс успешно создан' });
  } catch (err) {
    console.error('Ошибка создания кейса:', err);
    res.status(500).json({ error: 'Ошибка при сохранении кейса' });
  }
});

// Получение кейсов с фильтрацией
app.get('/api/cases', async (req, res) => {
  const userId = req.query.userId;
  
  try {
    let sql = `SELECT Cases.*, Users.email as userEmail FROM Cases LEFT JOIN Users ON Cases.userId = Users.id`;
    const params = [];
    
    if (userId) {
      sql += ' WHERE Cases.userId = $1';
      params.push(userId);
    }
    
    const result = await query(sql, params);
    const rows = result.rows.map(row => ({
      ...row,
      files: row.files ? JSON.parse(row.files) : []
    }));
    
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения кейсов:', err);
    res.status(500).json({ error: 'Ошибка при получении кейсов' });
  }
});

// Детали кейса
app.get('/api/cases/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    const result = await query(
      `SELECT Cases.*, Users.email as userEmail FROM Cases LEFT JOIN Users ON Cases.userId = Users.id WHERE Cases.id = $1`,
      [id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }
    
    const row = result.rows[0];
    row.files = row.files ? JSON.parse(row.files) : [];
    res.json(row);
  } catch (err) {
    console.error('Ошибка получения кейса:', err);
    res.status(500).json({ error: 'Ошибка при получении кейса' });
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
      
      const caseResult = await client.query('SELECT * FROM Cases WHERE id = $1', [caseId]);
      if (!caseResult.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Кейс не найден' });
      }
      
      const caseRow = caseResult.rows[0];
      
      const userResult = await client.query('SELECT email FROM Users WHERE id = $1', [executorId]);
      const executorEmail = userResult.rows[0] ? userResult.rows[0].email : null;
      
      await client.query(
        `INSERT INTO ProcessedCases (caseId, userId, title, theme, description, cover, files, status, executorId, executorEmail)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [caseRow.id, caseRow.userId, caseRow.title, caseRow.theme, caseRow.description, caseRow.cover, 
         caseRow.files, 'in_process', executorId, executorEmail]
      );
      
      await client.query('UPDATE Cases SET status = $1 WHERE id = $2', ['accepted', caseId]);
      
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

// Получение принятых кейсов
app.get('/api/processed-cases', async (req, res) => {
  try {
    const result = await query(
      `SELECT ProcessedCases.*, Users.email AS userEmail FROM ProcessedCases LEFT JOIN Users ON ProcessedCases.userId = Users.id`
    );
    
    const rows = result.rows.map(row => ({
      ...row,
      files: row.files ? JSON.parse(row.files) : []
    }));
    
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения принятых кейсов:', err);
    res.status(500).json({ error: 'Ошибка при получении принятых кейсов' });
  }
});

// Детали принятого кейса
app.get('/api/processed-cases/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    const result = await query(
      `SELECT ProcessedCases.*, Users.email AS userEmail FROM ProcessedCases LEFT JOIN Users ON ProcessedCases.userId = Users.id WHERE ProcessedCases.id = $1`,
      [id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }
    
    const row = result.rows[0];
    row.files = row.files ? JSON.parse(row.files) : [];
    res.json(row);
  } catch (err) {
    console.error('Ошибка получения принятого кейса:', err);
    res.status(500).json({ error: 'Ошибка при получении принятого кейса' });
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
    const result = await query('SELECT files FROM ProcessedCases WHERE id = $1', [id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }
    
    let existingFiles = result.rows[0].files ? JSON.parse(result.rows[0].files) : [];
    const newFiles = req.files.map(file => `/uploads/${file.filename}`);
    const updatedFiles = existingFiles.concat(newFiles);
    
    await query('UPDATE ProcessedCases SET files = $1 WHERE id = $2', [JSON.stringify(updatedFiles), id]);
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
        'SELECT * FROM ProcessedCases WHERE id = $1 AND executorId = $2',
        [processedCaseId, userId]
      );
      
      if (!pCaseResult.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Кейс не найден или не назначен вам' });
      }
      
      const pCase = pCaseResult.rows[0];
      
      const userResult = await client.query('SELECT email FROM Users WHERE id = $1', [userId]);
      const executorEmail = userResult.rows[0] ? userResult.rows[0].email : null;
      
      const projectResult = await client.query(
        `INSERT INTO Projects (caseId, userId, title, theme, description, cover, files, status, executorEmail)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [pCase.caseId, pCase.userId, title || pCase.title, theme || pCase.theme, 
         description || pCase.description, cover || pCase.cover, 
         files ? JSON.stringify(files) : pCase.files, 'closed', executorEmail]
      );
      
      await client.query('DELETE FROM ProcessedCases WHERE id = $1', [processedCaseId]);
      
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

// Получение проектов
app.get('/api/projects', async (req, res) => {
  const userId = req.query.userId;
  const userEmail = req.query.userEmail;
  
  try {
    let sql = `
      SELECT 
        Projects.*, 
        Users.email as userEmail,
        Executors.id as executorId,
        Executors.email as executorUserEmail
      FROM Projects 
      LEFT JOIN Users ON Projects.userId = Users.id 
      LEFT JOIN Users as Executors ON Projects.executorEmail = Executors.email
    `;
    const params = [];
    let paramCount = 0;
    
    if (userId) {
      sql += ` WHERE Projects.userId = $${++paramCount}`;
      params.push(userId);
    } else if (userEmail) {
      sql += ` WHERE Projects.executorEmail = $${++paramCount} AND Projects.status = 'closed'`;
      params.push(userEmail);
    }
    
    const result = await query(sql, params);
    const rows = result.rows.map(row => ({
      ...row,
      files: row.files ? JSON.parse(row.files) : []
    }));
    
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения проектов:', err);
    res.status(500).json({ error: 'Ошибка при получении проектов' });
  }
});

// Получение деталей проекта
app.get('/api/projects/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    const result = await query(
      `SELECT Projects.*, Users.email as userEmail FROM Projects LEFT JOIN Users ON Projects.userId = Users.id WHERE Projects.id = $1`,
      [id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    
    const row = result.rows[0];
    row.files = row.files ? JSON.parse(row.files) : [];
    res.json(row);
  } catch (err) {
    console.error('Ошибка получения проекта:', err);
    res.status(500).json({ error: 'Ошибка при получении проекта' });
  }
});

// Получить отзывы пользователя
app.get('/api/reviews', async (req, res) => {
  const userId = req.query.userId;
  
  try {
    let sql = 'SELECT * FROM Reviews';
    const params = [];
    
    if (userId) {
      sql += ' WHERE userId = $1';
      params.push(userId);
    }
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения отзывов:', err);
    res.status(500).json({ error: 'Ошибка при получении отзывов' });
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
      'INSERT INTO Reviews (userId, reviewerId, reviewerName, reviewerPhoto, text, rating) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, reviewerId, reviewerName, reviewerPhoto, text, rating]
    );
    
    const reviewsResult = await query('SELECT * FROM Reviews WHERE userId = $1', [userId]);
    res.json(reviewsResult.rows);
    
  } catch (err) {
    console.error('Ошибка добавления отзыва:', err);
    res.status(500).json({ error: 'Ошибка при добавлении отзыва' });
  }
});

// Catch-all handler для React Router
app.get('*', (req, res) => {
  // Пропускаем API запросы и статические файлы
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  
  // Для всех остальных запросов отдаем React приложение
  const indexPath = path.join(__dirname, 'build', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).json({ 
      error: 'Frontend not built',
      message: 'React build folder not found. Run: npm run build',
      currentDir: __dirname,
      buildPath: buildPath
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