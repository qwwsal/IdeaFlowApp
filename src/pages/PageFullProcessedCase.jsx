import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from './PageFullProcessedCase.module.css';

export default function PageFullProcessedCase() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
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
    fetch(`${API_BASE_URL}/processed-cases/${id}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Ошибка загрузки кейса: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        setCaseData(data);
      })
      .catch(err => {
        console.error('Ошибка при загрузке кейса:', err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p>Загрузка проекта...</p>;
  if (error) return <p>Ошибка: {error}</p>;
  if (!caseData) return <p>Проект не найден</p>;

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

      <main className={styles.container}>
        <h1 className={styles.title}>{caseData.title}</h1>
        
        {caseData.cover && (
          <img 
            // Исправлено: убрал localhost из пути к изображению
            src={`${caseData.cover}`} 
            alt="Обложка" 
            className={styles.cover} 
          />
        )}
        
        <div className={styles.infoSection}>
          <p><b>Заказчик: </b> 
            {caseData.userId ? (
              <Link to={`/profileview/${caseData.userId}`}>
                {caseData.userEmail}
              </Link>
            ) : (
              caseData.userEmail
            )}
          </p>

          <p><b>Исполнитель: </b> 
            {caseData.executorId ? (
              <Link to={`/profileview/${caseData.executorId}`}>
                {caseData.executorEmail || 'Вы'}
              </Link>
            ) : (
              caseData.executorEmail || 'Не назначен'
            )}
          </p>

          <p><b>Тема:</b> {caseData.theme}</p>

          <p><b>Статус:</b> 
            <span className={`${styles.status} ${styles[caseData.status]}`}>
              {caseData.status === 'in_process' ? 'В процессе' : 
               caseData.status === 'closed' ? 'Завершен' : caseData.status}
            </span>
          </p>

          <p><b>Задача проекта:</b> {caseData.description}</p>

          <div className={styles.filesSection}>
            <b>Прикрепленные файлы:</b>
            <div className={styles.filesList}>
              {caseData.files && caseData.files.length > 0 ? (
                caseData.files.map((file, i) => (
                  <a 
                    key={i} 
                    // Исправлено: убрал localhost из пути к файлу
                    href={`${file}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className={styles.fileItem}
                  >
                    📎 {file.split('/').pop()}
                  </a>
                ))
              ) : (
                <p>Файлы отсутствуют</p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button 
            className={styles.backButton} 
            onClick={() => navigate(-1)}
          >
            ← Назад
          </button>
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