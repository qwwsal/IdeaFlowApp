import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('done');
  const [doneProjects, setDoneProjects] = useState([]);
  const [openProjects, setOpenProjects] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  const userId = localStorage.getItem('currentUserId');

  useEffect(() => {
    // Загрузить завершенные проекты
    fetch('http://localhost:3001/projects')
      .then(res => res.json())
      .then(data => {
        const closedProjects = data.filter(p => p.status === 'closed');
        setDoneProjects(closedProjects.slice(-3));
      })
      .catch(() => setDoneProjects([]));

    // Загрузить открытые кейсы
    fetch('http://localhost:3001/cases')
      .then(res => res.json())
      .then(data => {
        const openCases = data.filter(c => c.status === 'open');
        setOpenProjects(openCases.slice(-3));
      })
      .catch(() => setOpenProjects([]));
  }, []);

  const projectList = activeTab === 'done' ? doneProjects : openProjects;

  const handleShowMoreClick = () => {
    if (activeTab === 'done') {
      navigate('/projects');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeTab === 'open') {
      navigate('/cases');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <Link to={userId ? "/profile" : "/signin"}>Профиль</Link>
          <Link to="/cases">Кейсы</Link>
          <Link to="/projects">Проекты</Link>
          <Link to={userId ? "/profile" : "/signin"}>
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

      <section className={styles.sectionIntro}>
        <img src="/images/hand.svg" alt="Lightbulb in hand" />
        <div className={styles.textContainer}>
          <h1>IdeaFlow</h1>
          <p>— где идеи встречают исполнение</p>
        </div>
      </section>

      <main className={styles.mainContent}>
        <div
          className={styles.projectsContainer}
          style={{
            width: '100%',
            transition: 'background-color 0.3s ease',
          }}
        >
          <div className={styles.tabs} style={{ width: '100%' }}>
            <button
              className={`${styles.tabButton} ${activeTab === 'done' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('done')}
            >
              Реализованные идеи
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'open' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('open')}
            >
              Открытые проекты
            </button>
          </div>

          <p style={{ color: '#0E900E', textAlign: 'center', margin: 20 }}>
            Рекомендации для вас
          </p>

          <div className={styles.projectsGrid}>
            {projectList.map(({ id, userEmail, executorEmail, theme, cover, title }) => (
              activeTab === 'done' ? (
                <Link key={id} to={`/projects/${id}`} className={styles.projectCardLink}>
                  <div className={styles.projectCard}>
                    {cover && <img src={`http://localhost:3001${cover}`} alt={`Фото исполнителя ${executorEmail}`} />}
                    <div style={{ padding: '8px' }}>
                      <span>{executorEmail}</span><br />
                      <span>{theme || title}</span>
                    </div>
                  </div>
                </Link>
              ) : (
                <Link key={id} to={`/cases/${id}`} className={styles.projectCardLink}>
                  <div className={styles.projectCard}>
                    {cover && <img src={`http://localhost:3001${cover}`} alt={`Фото заказчика ${userEmail}`} />}
                    <div style={{ padding: '8px' }}>
                      <span>{userEmail}</span><br />
                      <span>{theme || title}</span>
                    </div>
                  </div>
                </Link>
              )
            ))}
          </div>

          <button
            className={styles.showMoreButton}
            style={{ color: '#0E900E' }}
            onClick={handleShowMoreClick}
          >
            Показать еще
          </button>
        </div>

        <section className={styles.sectionHelp}>
          <p>
            IdeaFlow помогает быстро находить исполнителей для любых творческих и технических проектов, облегчая процесс поиска и сотрудничества.
          </p>
          <img src="/images/womenwhithlamp.svg" alt="Woman holding lightbulbs" />
        </section>

        <section className={styles.sectionPartnership}>
          <p>
            Здесь встречаются идеи и профессиональное выполнение, создавая пространство для эффективной работы и взаимовыгодного партнерства.
          </p>
        </section>
      </main>

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