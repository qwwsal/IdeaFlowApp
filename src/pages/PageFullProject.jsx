import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from './PageFullCase.module.css';

export default function PageFullProject() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Добавлено: API базовый URL
  const API_BASE_URL = '/api';

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Исправлено: заменил URL на API_BASE_URL
    fetch(`${API_BASE_URL}/projects/${id}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Ошибка загрузки проекта: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        setProjectData(data);
      })
      .catch(err => {
        console.error('Ошибка при загрузке проекта:', err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p>Загрузка проекта...</p>;
  if (error) return <p>Ошибка: {error}</p>;
  if (!projectData) return <p>Проект не найден</p>;

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
          <Link to="/profile">Профиль</Link>
          <Link to="/cases">Кейсы</Link>
          <Link to="/projects">Проекты</Link>
          <Link to="/profile">
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

      <main className={styles.container}>
        <h1 className={styles.title}>{projectData.title}</h1>
        {projectData.cover && (
          <img
            // Исправлено: убрал localhost из пути к изображению
            src={`${projectData.cover}`}
            alt="Обложка проекта"
            className={styles.cover}
          />
        )}
        
        <div className={styles.infoSection}>
          <p><b>Заказчик: </b> 
            {projectData.userId ? (
              <Link to={`/profileview/${projectData.userId}`}>
                {projectData.userEmail}
              </Link>
            ) : (
              projectData.userEmail
            )}
          </p>
          <p><b>Исполнитель:</b> {projectData.executorEmail || 'Не назначен'}</p>
          <p><b>Тема:</b> {projectData.theme}</p>
          <p><b>Описание проекта:</b> {projectData.description}</p>

          <div className={styles.filesSection}>
            <b>Прикрепленные файлы:</b>
            <div className={styles.filesList}>
              {projectData.files && projectData.files.length > 0 ? (
                projectData.files.map((file, i) => (
                  <a
                    key={i}
                    // Исправлено: убрал localhost из пути к файлу
                    href={`${file}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.fileItem}
                  >
                    {file.split('/').pop()}
                  </a>
                ))
              ) : (
                <p>Файлы отсутствуют</p>
              )}
            </div>
          </div>

          <p><b>Статус:</b> {projectData.status}</p>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerLogo}>
            <img src="/images/logobig.svg" alt="Big Logo" />
          </div>
          <div className={styles.footerContacts}>
            Связаться с нами <br />
            <a href="mailto:support@ideaflow.com">support@ideaflow.com</a><br />
            <p>+7 (123) 456-78-90</p>
          </div>
          <div className={styles.footerSocials}>
            <a href="#"><img src="/images/facebook.svg" alt="Facebook" /></a>
            <a href="#"><img src="/images/twitterx.svg" alt="Twitter" /></a>
            <a href="#"><img src="/images/instagram.svg" alt="Instagram" /></a>
          </div>
        </div>
        <p style={{ fontSize: 20, textAlign: 'center', marginTop: 10 }}>
          Место, где идеи превращаются в успешные проекты благодаря сотрудничеству заказчиков и фрилансеров.
        </p>
      </footer>
    </>
  );
}