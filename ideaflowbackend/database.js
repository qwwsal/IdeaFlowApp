const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./mydatabase.db', (err) => {
  if (err) {
    console.error('Ошибка при открытии базы данных:', err.message);
  } else {
    console.log('База данных успешно открыта');

    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS Users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          firstName TEXT,
          lastName TEXT,
          photo TEXT,
          description TEXT
        )
      `, (err) => {
        if (err) console.error('Ошибка создания таблицы Users:', err.message);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS Cases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          title TEXT NOT NULL,
          theme TEXT,
          description TEXT,
          cover TEXT,
          files TEXT,
          status TEXT DEFAULT 'open',
          executorId INTEGER,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(userId) REFERENCES Users(id)
        )
      `, (err) => {
        if (err) console.error('Ошибка создания таблицы Cases:', err.message);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS ProcessedCases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
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
          FOREIGN KEY(caseId) REFERENCES Cases(id),
          FOREIGN KEY(userId) REFERENCES Users(id)
        )
      `, (err) => {
        if (err) console.error('Ошибка создания таблицы ProcessedCases:', err.message);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS Projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
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
          FOREIGN KEY(userId) REFERENCES Users(id),
          FOREIGN KEY(caseId) REFERENCES Cases(id)
        )
      `, (err) => {
        if (err) console.error('Ошибка создания таблицы Projects:', err.message);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS Reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          reviewerId INTEGER NOT NULL,
          reviewerName TEXT,
          reviewerPhoto TEXT,
          text TEXT NOT NULL,
          rating INTEGER NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(userId) REFERENCES Users(id),
          FOREIGN KEY(reviewerId) REFERENCES Users(id)
        )
      `, (err) => {
        if (err) console.error('Ошибка создания таблицы Reviews:', err.message);
        else console.log('Таблица Reviews успешно создана или уже существует');
      });

      // Добавляем столбец reviewerId если таблица уже существовала
      db.all("PRAGMA table_info(Reviews)", (err, rows) => {
  if (err) {
    console.error('Ошибка при проверке структуры таблицы Reviews:', err.message);
    return;
  }
  
  const hasReviewerId = rows.some(row => row.name === 'reviewerId');
  if (!hasReviewerId) {
    db.run("ALTER TABLE Reviews ADD COLUMN reviewerId INTEGER", (err) => {
      if (err) {
        console.error('Ошибка при добавлении столбца reviewerId:', err.message);
      } else {
        console.log('Столбец reviewerId успешно добавлен в таблицу Reviews');
      }
    });
  }
});
    });
  }
});

module.exports = db;