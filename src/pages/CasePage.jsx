import React, { useState, useEffect } from 'react';
import styles from './ProjectsPage.module.css';
import { Link, useNavigate } from 'react-router-dom';

export default function CasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  // Добавлено: API базовый URL
  const API_BASE_URL = '/api';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Исправлено: заменил URL на API_BASE_URL
    fetch(`${API_BASE_URL}/cases?status=open`)
      .then(res => res.json())
      .then(data => {
        setCases(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const topics = [
    'Разработка логотипа',
    'Разработка сайта',
    'Верстка сайта',
    'Разработка дизайна сайта',
    'Разработка полиграфической продукции',
    'Веб-разработка',
    'Разработка мобильного приложения',
    'Дизайн упаковки',
    'Иллюстрация (цифровая, векторная, персонажи)',
    'Дизайн презентаций (PowerPoint, Google Slides, Keynote)',
    'Дизайн инфографики',
    'Дизайн для социальных сетей (обложки, посты, сторис)',
    '3D-моделирование и визуализация',
    'Графический дизайн для мерча (одежда, сувениры)'
  ];

  const toggleTopic = (topic) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const filteredCases = cases.filter(caseItem => {
    const lowerSearch = searchTerm.toLowerCase();

    const matchesSearch =
      (caseItem.title?.toLowerCase() || '').includes(lowerSearch) ||
      (caseItem.theme?.toLowerCase() || '').includes(lowerSearch) ||
      (caseItem.description?.toLowerCase() || '').includes(lowerSearch) ||
      (caseItem.status?.toLowerCase() || '').includes(lowerSearch) ||
      (caseItem.userEmail?.toLowerCase() || '').includes(lowerSearch) ||
      (caseItem.executorEmail?.toLowerCase() || '').includes(lowerSearch);

    const matchesTopic = selectedTopics.length === 0 || 
                        (caseItem.theme && selectedTopics.includes(caseItem.theme));

    const matchesStatus = caseItem.status === 'open';

    return matchesSearch && matchesTopic && matchesStatus;
  });

  const handleProfileClick = (e, userId) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/profileview/${userId}`);
  };

  if (loading) return <p className={styles.loadingText}>Загрузка кейсов...</p>;

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
          <Link to="/myprofile">
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

      <main className={styles.projectsMain} style={{ position: 'relative' }}>
        <h1 className={styles.projectsTitle}>Открытые проекты</h1>
        <div className={styles.projectsControls}>
          <button className={styles.projectsFilter} onClick={() => setFilterOpen(true)}>
            Фильтр
            <img src="/images/filter-icon.svg" alt="Фильтр" className={styles.filterIcon} />
          </button>
          <div className={styles.projectsSearchWrapper}>
            <input
              className={styles.projectsSearch}
              type="text"
              placeholder="Поиск по названию, теме, описанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className={styles.projectsSearchBtn}>
              <img src="/images/search-icon.svg" alt="Поиск" className={styles.searchIcon} />
            </button>
          </div>
        </div>

        {filterOpen && (
          <div className={styles.modalOverlay} onClick={() => setFilterOpen(false)}>
            <div className={styles.filterSidebar} onClick={e => e.stopPropagation()}>
              <button className={styles.closeFilter} onClick={() => setFilterOpen(false)}>
                ×
              </button>
              <h3 className={styles.filterTitle}>Фильтр по теме</h3>
              <ul className={styles.filterList}>
                {topics.map(topic => (
                  <li key={topic} className={styles.filterItem}>
                    <label className={styles.filterLabel}>
                      <input
                        type="checkbox"
                        name="topicFilter"
                        value={topic}
                        checked={selectedTopics.includes(topic)}
                        onChange={() => toggleTopic(topic)}
                        className={styles.filterCheckbox}
                      />
                      {topic}
                    </label>
                  </li>
                ))}
                <li className={styles.filterItem}>
                  <button
                    onClick={() => {
                      setSelectedTopics([]);
                      setFilterOpen(false);
                    }}
                    className={styles.resetButton}
                  >
                    Сбросить
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}

        <p className={styles.projectsRecommendation}>Рекомендации для вас</p>
        <div className={styles.projectsGrid}>
          {filteredCases.map(caseItem => (
            <Link to={`/cases/${caseItem.id}`} key={caseItem.id} className={styles.projectCardLink}>
              <div className={styles.projectCard}>
                <img
                  className={styles.projectImage}
                  // Исправлено: заменил URL на относительный путь
                  src={`${caseItem.cover || ''}`}
                  alt="Обложка кейса"
                />
                <div className={styles.projectInfo}>
                  <div className={styles.projectPerformer}>
                    Заказчик:{' '}
                    {caseItem.userId ? (
                      <span 
                        className={styles.profileLink}
                        onClick={(e) => handleProfileClick(e, caseItem.userId)}
                        style={{color: '#FBBB13', cursor: 'pointer', textDecoration: 'none'}}
                      >
                        {caseItem.userEmail || 'Не указан'}
                      </span>
                    ) : (
                      caseItem.userEmail || 'Не указан'
                    )}
                  </div>
                  <div className={styles.projectTitle}>{caseItem.title}</div>
                  <div className={styles.projectTopic}>Тема: {caseItem.theme || 'Не указана'}</div>
                  {caseItem.executorId && (
                    <div className={styles.projectPerformer}>
                      Исполнитель:{' '}
                      {caseItem.executorId ? (
                        <span 
                          className={styles.profileLink}
                          onClick={(e) => handleProfileClick(e, caseItem.executorId)}
                          style={{color: '#FBBB13', cursor: 'pointer', textDecoration: 'underline'}}
                        >
                          {caseItem.executorEmail || 'Не указан'}
                        </span>
                      ) : (
                        caseItem.executorEmail || 'Не указан'
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
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