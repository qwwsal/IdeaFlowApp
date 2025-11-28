const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = 3001;

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

app.use(cors());

// Раздача статики из uploads
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));


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

// Middleware для получения текущего пользователя (упрощенная версия)
// В реальном приложении здесь должна быть проверка JWT токена или сессии
const getCurrentUser = (req, res, next) => {
  // Временное решение - предполагаем, что текущий пользователь передается в заголовках
  // В реальном приложении используйте аутентификацию через JWT
  const userId = req.headers['x-user-id'] || req.query.currentUserId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Пользователь не авторизован' });
  }
  
  db.get('SELECT id, email, firstName, lastName, photo, description FROM Users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    req.currentUser = user;
    next();
  });
};

// Регистрация
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO Users (email, password) VALUES (?, ?)', [email, hash], function (err) {
      if (err) return res.status(400).json({ error: 'Email уже зарегистрирован' });
      res.json({ id: this.lastID, email });
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM Users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
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
  });
});

// Получение данных текущего пользователя
app.get('/current-user', getCurrentUser, (req, res) => {
  res.json(req.currentUser);
});

// Профиль
app.get('/profile/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT id, email, firstName, lastName, photo, description FROM Users WHERE id = ?', [id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
  });
});

app.put('/profile/:id', (req, res) => {
  const id = req.params.id;
  const { firstName, lastName, photo, description } = req.body;
  db.run(
    'UPDATE Users SET firstName = ?, lastName = ?, photo = ?, description = ? WHERE id = ?',
    [firstName, lastName, photo, description, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Ошибка обновления профиля' });
      res.json({ message: 'Профиль успешно обновлён' });
    }
  );
});

// Создание кейса
const uploadCaseFiles = upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'files', maxCount: 15 }]);

app.post('/cases', (req, res, next) => {
  uploadCaseFiles(req, res, (err) => {
    if (err) {
      console.error('Ошибка Multer:', err);
      return res.status(500).json({ error: 'Ошибка загрузки файлов' });
    }
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);
    next();
  });
}, (req, res) => {
  const { userId, title, theme, description } = req.body;
  if (!userId || !title)
    return res.status(400).json({ error: 'userId и title обязательны' });

  let coverPath = null;
  if (req.files.cover && req.files.cover[0])
    coverPath = `/uploads/${req.files.cover[0].filename}`;

  let filesPaths = [];
  if (req.files.files)
    filesPaths = req.files.files.map(file => `/uploads/${file.filename}`);

  const stmt = db.prepare(
    `INSERT INTO Cases (userId, title, theme, description, cover, files, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(userId, title, theme || '', description || '', coverPath, JSON.stringify(filesPaths), 'open', function (err) {
    if (err) {
      console.error('Ошибка вставки в базу:', err);
      return res.status(500).json({ error: 'Ошибка при сохранении кейса' });
    }
    res.json({ id: this.lastID, message: 'Кейс успешно создан' });
  });
});


// Получение кейсов с фильтрацией
app.get('/cases', (req, res) => {
  const userId = req.query.userId;
  let sql = `SELECT Cases.*, Users.email as userEmail FROM Cases LEFT JOIN Users ON Cases.userId = Users.id`;
  const params = [];
  if (userId) {
    sql += ' WHERE Cases.userId = ?';
    params.push(userId);
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка при получении кейсов' });
    rows.forEach(row => { row.files = row.files ? JSON.parse(row.files) : []; });
    res.json(rows);
  });
});

// Детали кейса
app.get('/cases/:id', (req, res) => {
  const id = req.params.id;
  const sql = `SELECT Cases.*, Users.email as userEmail FROM Cases LEFT JOIN Users ON Cases.userId = Users.id WHERE Cases.id = ?`;
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Ошибка при получении кейса:', err);
      return res.status(500).json({ error: 'Ошибка при получении кейса' });
    }
    if (!row) return res.status(404).json({ error: 'Кейс не найден' });
    row.files = row.files ? JSON.parse(row.files) : [];
    res.json(row);
  });
});

// Принять кейс (перенос в ProcessedCases)
app.put('/cases/:id/accept', async (req, res) => {
  const caseId = Number(req.params.id);
  const { executorId } = req.body;
  if (!executorId || isNaN(caseId)) {
    return res.status(400).json({ error: 'Неверные параметры' });
  }
  try {
    const caseRow = await new Promise((resolve, reject) =>
      db.get('SELECT * FROM Cases WHERE id = ?', [caseId], (err, row) => err ? reject(err) : resolve(row))
    );
    if (!caseRow) return res.status(404).json({ error: 'Кейс не найден' });

    const userRow = await new Promise((resolve, reject) =>
      db.get('SELECT email FROM Users WHERE id = ?', [executorId], (err, row) => err ? reject(err) : resolve(row))
    );
    const executorEmail = userRow ? userRow.email : null;

    await new Promise((resolve, reject) => {
      db.run(`INSERT INTO ProcessedCases (caseId, userId, title, theme, description, cover, files, status, executorId, executorEmail)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [caseRow.id, caseRow.userId, caseRow.title, caseRow.theme, caseRow.description, caseRow.cover, caseRow.files, 'in_process', executorId, executorEmail],
        function (err) { if (err) reject(err); else resolve(); });
    });

    await new Promise((resolve, reject) =>
      db.run('UPDATE Cases SET status = ? WHERE id = ?', ['accepted', caseId], (err) => err ? reject(err) : resolve())
    );

    res.json({ message: 'Кейс принят', caseId });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ошибка сервера' });
  }
});

// Получение принятых кейсов
app.get('/processed-cases', (req, res) => {
  let sql = `SELECT ProcessedCases.*, Users.email AS userEmail FROM ProcessedCases LEFT JOIN Users ON ProcessedCases.userId = Users.id`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка при получении принятых кейсов' });
    rows.forEach(row => { row.files = row.files ? JSON.parse(row.files) : []; });
    res.json(rows);
  });
});

// Детали принятого кейса
app.get('/processed-cases/:id', (req, res) => {
  const id = req.params.id;
  const sql = `SELECT ProcessedCases.*, Users.email AS userEmail FROM ProcessedCases LEFT JOIN Users ON ProcessedCases.userId = Users.id WHERE ProcessedCases.id = ?`;
  db.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Ошибка при получении принятого кейса' });
    if (!row) return res.status(404).json({ error: 'Кейс не найден' });
    row.files = row.files ? JSON.parse(row.files) : [];
    res.json(row);
  });
});

// Загрузка фото профиля
app.post('/upload-photo', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не выбран' });
  res.json({ photoPath: `/uploads/${req.file.filename}` });
});

// Загрузка файлов для принятых кейсов
const uploadExtraFiles = upload.array('extraFiles', 15);
app.post('/processed-cases/:id/upload-files', uploadExtraFiles, (req, res) => {
  const id = req.params.id;
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Файлы не выбраны' });

  db.get('SELECT files FROM ProcessedCases WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
    if (!row) return res.status(404).json({ error: 'Кейс не найден' });
    let existingFiles = row.files ? JSON.parse(row.files) : [];
    const newFiles = req.files.map(file => `/uploads/${file.filename}`);
    const updatedFiles = existingFiles.concat(newFiles);

    db.run('UPDATE ProcessedCases SET files = ? WHERE id = ?', [JSON.stringify(updatedFiles), id], err => {
      if (err) return res.status(500).json({ error: 'Ошибка сохранения файлов' });
      res.json({ message: 'Файлы добавлены', files: updatedFiles });
    });
  });
});

// Завершение принятого кейса, создание проекта и удаление из ProcessedCases
app.put('/processed-cases/:id/complete', (req, res) => {
  const processedCaseId = Number(req.params.id);
  const { userId, title, theme, description, cover, files } = req.body;

  db.get('SELECT * FROM ProcessedCases WHERE id = ? AND executorId = ?', [processedCaseId, userId], (err, pCase) => {
    if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
    if (!pCase) return res.status(404).json({ error: 'Кейс не найден или не назначен вам' });

    db.get('SELECT email FROM Users WHERE id = ?', [userId], (err, userRow) => {
      if (err) return res.status(500).json({ error: 'Ошибка базы данных' });

      const executorEmail = userRow ? userRow.email : null;

      const stmt = db.prepare(`INSERT INTO Projects (caseId, userId, title, theme, description, cover, files, status, executorEmail)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      stmt.run(
        pCase.caseId,
        pCase.userId,
        title || pCase.title,
        theme || pCase.theme,
        description || pCase.description,
        cover || pCase.cover,
        files ? JSON.stringify(files) : pCase.files,
        'closed',
        executorEmail,
        function (err) {
          if (err) return res.status(500).json({ error: 'Ошибка создания проекта' });

          db.run('DELETE FROM ProcessedCases WHERE id = ?', [processedCaseId], (err) => {
            if (err) return res.status(500).json({ error: 'Ошибка удаления завершённого кейса' });

            res.json({ message: 'Проект успешно создан', projectId: this.lastID });
          });
        }
      );
    });
  });
});

// Получение проектов
app.get('/projects', (req, res) => {
  const userId = req.query.userId;
  const userEmail = req.query.userEmail;
  
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

  if (userId) {
    sql += ' WHERE Projects.userId = ?';
    params.push(userId);
  } else if (userEmail) {
    sql += ' WHERE Projects.executorEmail = ? AND Projects.status = "closed"';
    params.push(userEmail);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Ошибка при получении проектов' });
    }
    rows.forEach(row => {
      row.files = row.files ? JSON.parse(row.files) : [];
    });
    res.json(rows);
  });
});

// Получение деталей проекта
app.get('/projects/:id', (req, res) => {
  const id = req.params.id;
  const sql = `SELECT Projects.*, Users.email as userEmail FROM Projects LEFT JOIN Users ON Projects.userId = Users.id WHERE Projects.id = ?`;
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Ошибка при получении проекта' });
    }
    if (!row) return res.status(404).json({ error: 'Проект не найден' });
    row.files = row.files ? JSON.parse(row.files) : [];
    res.json(row);
  });
});

// Получить отзывы пользователя
app.get('/reviews', (req, res) => {
  const userId = req.query.userId;
  let sql = 'SELECT * FROM Reviews';
  const params = [];
  if (userId) {
    sql += ' WHERE userId = ?';
    params.push(userId);
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка при получении отзывов' });
    res.json(rows);
  });
});

// Добавить новый отзыв (обновленная версия с reviewerId)
app.post('/reviews', (req, res) => {
  const { userId, reviewerId, reviewerName, reviewerPhoto, text, rating } = req.body;
  if (!userId || !text || !rating || !reviewerId)
    return res.status(400).json({ error: 'Не все обязательные поля заполнены' });

  const sql = 'INSERT INTO Reviews (userId, reviewerId, reviewerName, reviewerPhoto, text, rating) VALUES (?, ?, ?, ?, ?, ?)';
  db.run(sql, [userId, reviewerId, reviewerName, reviewerPhoto, text, rating], function (err) {
    if (err) return res.status(500).json({ error: 'Ошибка при добавлении отзыва' });

    db.all('SELECT * FROM Reviews WHERE userId = ?', [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Ошибка при обновлении отзывов' });
      res.json(rows);
    });
  });
});

app.get('/', (req, res) => {
  res.send('Welcome to the API');
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Глобальная ошибка сервера:', err.stack);
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});