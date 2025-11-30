import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './AddCasePage.module.css';

export default function AddCasePage() {
  const [projectName, setProjectName] = useState('');
  const [theme, setTheme] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [cover, setCover] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigate = useNavigate();
  
  // Добавлено: API базовый URL
  const API_BASE_URL = '/api';

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 15) {
      alert('Можно выбрать не более 15 файлов');
      e.target.value = ''; // сброс выбора в input
      return;
    }
    setFiles(selectedFiles);
  };

  const handleCoverChange = (e) => {
    if (e.target.files.length > 0) {
      setCover(e.target.files[0]);
    } else {
      setCover(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem('currentUserId');
    if (!userId) {
      alert('Вы не авторизованы');
      navigate('/signin');
      return;
    }

    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('title', projectName);
    formData.append('theme', theme);
    formData.append('description', description);
    if (cover) {
      formData.append('cover', cover);
    }
    files.forEach((file) => formData.append('files', file));

    try {
      // Исправлено: заменил URL на API_BASE_URL
      const response = await fetch(`${API_BASE_URL}/cases`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Ошибка создания кейса');
      }
      alert('Кейс успешно создан!');
      navigate('/cases');
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <header className={styles.header}>
        <Link to="/">
          <img src="/images/logosmall.svg" alt="IdeaFlow logo" style={{ height: 80 }} />
        </Link>
        
        {/* Бургер меню */}
        <div className={styles.burgerMenu} onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <nav className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksActive : ''}`}>
          <Link to={userId ? "/myprofile" : "/signin"}>Профиль</Link>
          <Link to="/cases">Кейсы</Link>
          <Link to="/projects">Проекты</Link>
          <Link to={userId ? "/myprofile" : "/signin"}>
            <button className={styles.buttonYellow}>Разместить проект</button>
          </Link>
          <Link to="/cases">
            <button className={styles.buttonYellow}>Приступить к проекту</button>
          </Link>
          
          {/* Элементы из футера в мобильном меню */}
          <div className={styles.mobileFooterMenu}>
            <div className={styles.footerContacts}>
              Связаться с нами <br />
              <a href="mailto:support@ideaflow.com">support@ideaflow.com</a>
              <br />
              <p>+7 (123) 456-78-90</p>
            </div>
            <div className={styles.footerSocials}>
              <a href="#">
                <img src="/images/facebook.svg" alt="Facebook" />
              </a>
              <a href="#">
                <img src="/images/twitterx.svg" alt="Twitter" />
              </a>
              <a href="#">
                <img src="/images/instagram.svg" alt="Instagram" />
              </a>
            </div>
          </div>
        </nav>

        {/* Оверлей для закрытия меню */}
        {isMenuOpen && <div className={styles.overlay} onClick={toggleMenu}></div>}
      </header>

      <div className={styles.innerContainer}>
        <h2>Описание проекта</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Укажите название проекта
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              className={styles.textInput}
            />
          </label>
          <label className={styles.label}>
    Выберите тему
    <input
        list="theme-options"
        type="text"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        placeholder="Выберите из списка или введите свой вариант"
        required
        className={styles.textInput}
    />
    <datalist id="theme-options">
        <option value="Разработка логотипа" />
        <option value="Разработка сайта" />
        <option value="Верстка сайта" />
        <option value="Разработка дизайна сайта" />
        <option value="Разработка полиграфической продукции" />
        <option value="Веб-разработка" />
        <option value="Разработка мобильного приложения" />
        <option value="Дизайн упаковки" />
        <option value="Иллюстрация (цифровая, векторная, персонажи)" />
        <option value="Дизайн презентаций (PowerPoint, Google Slides, Keynote)" />
        <option value="Дизайн инфографики" />
        <option value="Дизайн для социальных сетей (обложки, посты, сторис)" />
        <option value="3D-моделирование и визуализация" />
        <option value="Графический дизайн для мерча (одежда, сувениры)" />
    </datalist>
</label>
          <label className={styles.label}>
            Опишите детально задачу и суть проекта
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className={styles.textareaInput}
            />
          </label>

          <div className={styles.fileButtonsContainer}>
            {/* Кнопка для выбора файлов */}
            <label htmlFor="attachFiles" className={styles.labelFileButton}>
              Прикрепить файлы (до 15)
            </label>
            <input
              type="file"
              id="attachFiles"
              multiple
              onChange={handleFileChange}
              className={styles.fileInputHidden}
            />
            
            {/* Кнопка для выбора обложки */}
            <label htmlFor="selectCover" className={styles.labelFileButton}>
              Выбрать обложку
            </label>
            <input
              type="file"
              id="selectCover"
              onChange={handleCoverChange}
              className={styles.fileInputHidden}
            />
          </div>

          {files.length > 0 && (
            <p className={styles.fileInfo}>Выбрано файлов: {files.length}</p>
          )}
          {cover && (
            <p className={styles.fileInfo}>Выбрана обложка: {cover.name}</p>
          )}

          <button type="submit" className={styles.submitButton}>
            Разместить проект
          </button>
        </form>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerLogo}>
            <img src="/images/logobig.svg" alt="Big Logo" />
          </div>
          <div className={styles.footerContacts}>
            Связаться с нами <br />
            <a href="mailto:support@ideaflow.com">support@ideaflow.com</a>
            <br />
            <p>+7 (123) 456-78-90</p>
          </div>
          <div className={styles.footerSocials}>
            <a href="#">
              <img src="/images/facebook.svg" alt="Facebook" />
            </a>
            <a href="#">
              <img src="/images/twitterx.svg" alt="Twitter" />
            </a>
            <a href="#">
              <img src="/images/instagram.svg" alt="Instagram" />
            </a>
          </div>
        </div>
        <p style={{ fontSize: 20, textAlign: 'center', marginTop: 10 }}>
          Место, где идеи превращаются в успешные проекты благодаря сотрудничеству заказчиков и фрилансеров.
        </p>
      </footer>
    </>
  );
}