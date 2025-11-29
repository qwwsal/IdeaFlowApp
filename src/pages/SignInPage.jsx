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
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }
      
      // Детальная диагностика ответа
      console.log('✅ Login response:', data);
      
      // Сохраняем ВСЕ данные пользователя
      localStorage.setItem('currentUserId', data.user?.id || data.id);
      localStorage.setItem('userEmail', data.user?.email || data.email);
      localStorage.setItem('userFirstName', data.user?.firstName || data.firstName || '');
      localStorage.setItem('userLastName', data.user?.lastName || data.lastName || '');
      localStorage.setItem('userPhoto', data.user?.photo || data.photo || '');
      localStorage.setItem('userDescription', data.user?.description || data.description || '');
      
      // Сохраняем полный объект пользователя
      localStorage.setItem('userData', JSON.stringify(data.user || data));
      
      console.log('📝 Saved to localStorage:', {
        userId: localStorage.getItem('currentUserId'),
        email: localStorage.getItem('userEmail'),
        firstName: localStorage.getItem('userFirstName')
      });
      
      // ИСПРАВЛЕНИЕ: ПЕРЕХОДИМ НА СВОЙ ПРОФИЛЬ (БЕЗ ID)
      console.log('🔄 Redirecting to own profile page: /profile');
      navigate('/profile'); // Важно: без ID, чтобы открылся ProfilePage
      
    } catch (err) {
      console.error('💥 Login error:', err);
      setError(err.message);
    }
  };

  // Добавим кнопку для диагностики localStorage
  const debugLocalStorage = () => {
    console.log('🔍 localStorage contents:', {
      currentUserId: localStorage.getItem('currentUserId'),
      userEmail: localStorage.getItem('userEmail'),
      userFirstName: localStorage.getItem('userFirstName'),
      userLastName: localStorage.getItem('userLastName'),
      userData: localStorage.getItem('userData')
    });
  };

  return (
    <>
      <header className={styles.header}>
        <Link to="/">
          <img src="/images/logosmall.svg" alt="IdeaFlow logo" style={{ height: 80 }} />
        </Link>
        
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

        {isMenuOpen && <div className={styles.overlay} onClick={toggleMenu}></div>}
      </header>

      <form onSubmit={handleLogin} className={styles.form}>
        <h2>Вход</h2>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="Пароль" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
        />
        <button type="submit">Войти</button>
        
        {error && (
          <div style={{color: 'red', marginTop: '10px'}}>
            <strong>Ошибка:</strong> {error}
          </div>
        )}
        
        <div className={styles.transition}>
          <span 
            className={styles.switchLink} 
            onClick={() => navigate('/register')}
            style={{cursor: 'pointer'}}
          >
            Нет аккаунта? Зарегистрироваться
          </span>
        </div>

        {/* Кнопка для диагностики (можно удалить после исправления) */}
        <button 
          type="button" 
          onClick={debugLocalStorage}
          style={{
            marginTop: '10px',
            background: '#6c757d',
            fontSize: '12px',
            padding: '5px 10px'
          }}
        >
          Debug localStorage
        </button>
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