import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './SignInPage.module.css';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка входа');
      
      localStorage.setItem('currentUserId', data.id);
      localStorage.setItem('userEmail', data.email);
      localStorage.setItem('userFirstName', data.firstName || '');
      localStorage.setItem('userLastName', data.lastName || '');
      
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    }
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

      <form onSubmit={handleLogin} className={styles.form}>
        <h2>Вход</h2>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Войти</button>
        {error && <p style={{color: 'red'}}>{error}</p>}
        <div className={styles.transition}>
          <span className={styles.switchLink} onClick={() => navigate('/register')}>Нет аккаунта? Зарегистрироваться</span>
        </div>
      </form>

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerLogo}>
            <img src="images/logobig.svg" alt="Big Logo" />
          </div>
          <div className={styles.footerContacts}>
            Связаться с нами <br />
            <a href="mailto:support@ideaflow.com">support@ideaflow.com</a><br />
            <p>+7 (123) 456-78-90</p>
          </div>
          <div className={styles.footerSocials}>
            <a href="#"><img src="images/facebook.svg" alt="Facebook" /></a>
            <a href="#"><img src="images/twitterx.svg" alt="Twitter" /></a>
            <a href="#"><img src="images/instagram.svg" alt="Instagram" /></a>
          </div>
        </div>
        <p style={{ fontSize: 20, textAlign: 'center', marginTop: 10 }}>
          Место, где идеи превращаются в успешные проекты благодаря сотрудничеству заказчиков и фрилансеров.
        </p>
      </footer>
    </>
  );
}