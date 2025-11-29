import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from './PageFullCase.module.css';

export default function PageFullCase() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const userId = localStorage.getItem('currentUserId');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`http://localhost:3001/cases/${id}`)
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

  const acceptCase = () => {
    if (!userId) {
      alert('Вы должны войти в систему чтобы принять кейс');
      navigate('/signin');
      return;
    }
    fetch(`http://localhost:3001/cases/${id}/accept`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executorId: parseInt(userId, 10) }),
    })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          console.error('Ошибка ответа сервера при принятии кейса:', text);
          throw new Error(text || 'Ошибка обновления статуса');
        }
        return res.json();
      })
      .then(data => {
        alert('Кейс принят');
        setCaseData(prev => ({
          ...prev,
          status: 'in_process',
          executorId: parseInt(userId, 10),
          executorEmail: prev.executorEmail || 'Вы',
        }));
        console.log('Ответ сервера accept:', data);
      })
      .catch(err => {
        console.error('Ошибка при принятии кейса:', err);
        alert('Ошибка обновления статуса: ' + err.message);
      });
  };

  if (loading) return <p>Загрузка кейса...</p>;
  if (error) return <p>Ошибка: {error}</p>;
  if (!caseData) return <p>Кейс не найден</p>;

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
        <h1 className={styles.title}>{caseData.title}</h1>
        {caseData.cover && <img src={`http://localhost:3001${caseData.cover}`} alt="Обложка" className={styles.cover} />}
        
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
          <p><b>Тема:</b> {caseData.theme}</p>
          <p><b>Задача проекта:</b> {caseData.description}</p>

          <div className={styles.filesSection}>
            <b>Прикрепленные файлы:</b>
            <div className={styles.filesList}>
              {caseData.files && caseData.files.length > 0 ? (
                caseData.files.map((file, i) => (
                  <a key={i} href={`http://localhost:3001${file}`} target="_blank" rel="noreferrer" className={styles.fileItem}>
                    {file.split('/').pop()}
                  </a>
                ))
              ) : (
                <p>Файлы отсутствуют</p>
              )}
            </div>
          </div>

          {caseData.status === 'open' && (
            <button className={styles.acceptButton} onClick={acceptCase}>Принять кейс</button>
          )}

          <p><b>Статус:</b> {caseData.status}</p>
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