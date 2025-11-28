import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import styles from './ProfileView.module.css';

export default function ProfileView() {
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams();

  const [userId, setUserId] = useState(paramUserId);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('projects');
  const [formData, setFormData] = useState({
    photo: '',
    firstName: '',
    lastName: '',
    username: '',
    about: '',
  });
  const [currentUserData, setCurrentUserData] = useState({
    firstName: '',
    lastName: '',
    photo: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectsAsCustomer, setProjectsAsCustomer] = useState([]);
  const [completedExecutorProjects, setCompletedExecutorProjects] = useState([]);
  const [inProcessExecutorCases, setInProcessExecutorCases] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [validationErrors, setValidationErrors] = useState({
    text: '',
    rating: ''
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const checkAuth = () => {
      const storedUserId = localStorage.getItem('currentUserId');
      if (!storedUserId) {
        navigate('/signin');
        return;
      }
      setCurrentUserId(storedUserId);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const storedUserId = localStorage.getItem('currentUserId');
        if (storedUserId) {
          const res = await fetch(`http://localhost:3001/profile/${storedUserId}`);
          if (res.ok) {
            const userData = await res.json();
            setCurrentUserId(userData.id);
            setCurrentUserData({
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              photo: userData.photo || '',
            });
          }
        }
      } catch (err) {
        console.error('Ошибка получения данных текущего пользователя:', err);
      }
    };

    if (currentUserId) {
      fetchCurrentUser();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!userId) {
      navigate('/signin');
      return;
    }
    setUserId(userId);
  }, [navigate, userId]);

  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3001/profile/${userId}`);
        if (!res.ok) throw new Error('Ошибка загрузки данных пользователя');
        const data = await res.json();
        setFormData({
          photo: data.photo || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          username: data.email || '',
          about: data.description || '',
        });
        setUserEmail(data.email || '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchProjectsAsCustomer = async () => {
      try {
        const resProjects = await fetch(`http://localhost:3001/projects?userId=${userId}`);
        if (!resProjects.ok) throw new Error('Ошибка загрузки проектов как заказчика');
        const projectsDataRaw = await resProjects.json();
        const projectsData = projectsDataRaw.filter(p => p.status === 'closed');

        const resCases = await fetch(`http://localhost:3001/cases?userId=${userId}`);
        if (!resCases.ok) throw new Error('Ошибка загрузки кейсов заказчика');
        const casesDataRaw = await resCases.json();
        const casesData = casesDataRaw.filter(c => c.status === 'open');

        const combined = [...casesData, ...projectsData];
        combined.sort((a, b) => {
          if (a.status === 'open' && b.status !== 'open') return -1;
          if (a.status !== 'open' && b.status === 'open') return 1;
          return 0;
        });

        setProjectsAsCustomer(combined);
      } catch (error) {
        console.error('Ошибка при загрузке проектов и кейсов:', error);
        setProjectsAsCustomer([]);
      }
    };

    const fetchCompletedExecutorProjects = async () => {
      try {
        const res = await fetch(`http://localhost:3001/projects?executorEmail=${encodeURIComponent(userEmail)}`);
        if (!res.ok) throw new Error('Ошибка загрузки проектов исполнителя');
        const data = await res.json();
        const closedProjects = data.filter(p => p.status === 'closed');
        setCompletedExecutorProjects(closedProjects);
      } catch {
        setCompletedExecutorProjects([]);
      }
    };

    const fetchInProcessExecutorCases = async () => {
      try {
        const res = await fetch(`http://localhost:3001/processed-cases`);
        if (!res.ok) throw new Error('Ошибка загрузки принятых кейсов');
        const data = await res.json();
        const filtered = data.filter(
          c => c.executorId === Number(userId) && c.status === 'in_process'
        );
        setInProcessExecutorCases(filtered);
      } catch {
        setInProcessExecutorCases([]);
      }
    };

    const fetchReviews = async () => {
      try {
        const response = await fetch(`http://localhost:3001/reviews?userId=${userId}`);
        if (!response.ok) throw new Error('Ошибка загрузки отзывов');
        const data = await response.json();
        setReviews(data);
      } catch (err) {
        console.error('Ошибка загрузки отзывов:', err);
      }
    };

    fetchUserData().then(() => {
      fetchProjectsAsCustomer();
      fetchCompletedExecutorProjects();
      fetchInProcessExecutorCases();
      fetchReviews();
    });
  }, [userId, userEmail, navigate]);

  const renderStars = rating => (
    <>
      {[...Array(5)].map((_, idx) => {
        const starValue = idx + 1;
        return <FaStar key={idx} size={18} color={starValue <= rating ? '#ffbe5a' : '#ccc'} />;
      })}
    </>
  );

  const averageRating =
    reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 0;

  const validateReview = () => {
    const errors = {
      text: '',
      rating: ''
    };

    if (newReviewText.trim() === '') {
      errors.text = 'Пожалуйста, напишите текст отзыва';
    }

    if (newReviewRating === 0) {
      errors.rating = 'Пожалуйста, выберите оценку';
    }

    setValidationErrors(errors);
    return !errors.text && !errors.rating;
  };

  const handleAddReview = async () => {
    setValidationErrors({ text: '', rating: '' });

    if (!validateReview()) {
      return;
    }

    if (!currentUserId) {
      alert('Необходимо авторизоваться для оставления отзыва');
      return;
    }

    if (currentUserId === userId) {
      alert('Нельзя оставлять отзыв самому себе');
      return;
    }

    const newReview = {
      userId,
      reviewerId: currentUserId,
      reviewerName: `${currentUserData.firstName} ${currentUserData.lastName}`.trim() || 'Anonymous',
      reviewerPhoto: currentUserData.photo || '',
      text: newReviewText.trim(),
      rating: newReviewRating,
    };

    try {
      const res = await fetch('http://localhost:3001/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview),
      });
      if (!res.ok) throw new Error('Ошибка добавления отзыва');
      setNewReviewText('');
      setNewReviewRating(0);
      const updatedReviews = await res.json();
      setReviews(updatedReviews);
      setValidationErrors({ text: '', rating: '' });
    } catch (err) {
      console.error('Ошибка добавления отзыва:', err);
      alert(err.message);
    }
  };

  const formatReviewerPhoto = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    if (photoPath.startsWith('/')) return `http://localhost:3001${photoPath}`;
    return photoPath;
  };

  const isOwnProfile = () => {
    return currentUserId && userId && currentUserId.toString() === userId.toString();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'projects':
        return (
          <>
            <h3 className={styles.projectsTitle}>Проекты пользователя</h3>
            <div className={`${styles.tabContent} ${styles.projectsTab}`}>
              {projectsAsCustomer.map((p) => (
                <div key={p.id} className={styles.projectCard}>
                  {p.status === 'open' ? (
                    <Link to={`/cases/${p.id}`} className={styles.casesLink}>
                      <img
                        src={`http://localhost:3001${p.cover || ''}`}
                        alt={`Фото исполнителя ${p.executorEmail || 'Не указан'}`}
                        className={styles.projectImage}
                      />
                      <div className={styles.projectInfo}>
                        <div className={styles.projectTopic}>{p.theme || p.title}</div>
                        <div className={styles.projectTitle}>Название: {p.title}</div>
                        <div className={styles.projectStatus}>Статус: {p.status || 'неизвестен'}</div>
                      </div>
                    </Link>
                  ) : (
                    <Link to={`/projects/${p.id}`} className={styles.projectLink}>
                      <img
                        src={`http://localhost:3001${p.cover || ''}`}
                        alt={`Фото исполнителя ${p.executorEmail || 'Не указан'}`}
                        className={styles.projectImage}
                      />
                      <div className={styles.projectInfo}>
                        <div className={styles.projectPerformer}>
                          Исполнитель: {p.executorEmail || 'Не указан'}
                        </div>
                        <div className={styles.projectTopic}>{p.theme || p.title}</div>
                        <div className={styles.projectTitle}>Название: {p.title}</div>
                        <div className={styles.projectStatus}>Статус: {p.status || 'неизвестен'}</div>
                      </div>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </>
        );
      case 'cases':
    // Фильтруем проекты по executorEmail пользователя, чей профиль мы смотрим
    const userCompletedProjects = completedExecutorProjects.filter(proj => 
        proj.executorEmail === userEmail
    );
    
    return (
      <div className={`${styles.tabContent} ${styles.casesTab}`}>
        <h3>Завершённые проекты пользователя</h3>
        {userCompletedProjects.length === 0 ? (
          <p>Пока пусто</p>
        ) : (
          <div className={styles.casesGrid}>
            {userCompletedProjects.map(proj => (
              <div key={proj.id} className={styles.caseCard}>
                <Link to={`/projects/${proj.id}`} key={proj.id} className={styles.projCardLink}>
                  <div className={styles.projectCard}>
                    <img
                      className={styles.projectImage}
                      src={`http://localhost:3001${proj.cover || ''}`}
                      alt={`Фото исполнителя ${proj.executorEmail}`}
                    />
                    <div className={styles.projectInfo}>
                      <div className={styles.projectTopic}>{proj.theme || proj.title}</div>
                      <div className={styles.projectTitle}>Название: {proj.title}</div>
                      <div className={styles.projectStatus}>Статус: {proj.status || 'неизвестен'}</div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    );
      case 'reviews':
        return (
          <div className={styles.reviewContainer}>
            <h3>
              Отзывы пользователя{' '}
              <span style={{ fontFamily: 'Arial', fontWeight: 'normal', fontSize: '1rem', marginLeft: '10px' }}>
                ({averageRating} ★)
              </span>
            </h3>
            <div className={styles.reviewListCustom}>
              {reviews.length === 0 ? (
                <p>Пока нет отзывов</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className={styles.reviewItemCustom}>
                    <div className={styles.reviewPhotoCustom}>
                      {r.reviewerPhoto ? (
                        <img src={formatReviewerPhoto(r.reviewerPhoto)} alt={r.reviewerName} />
                      ) : (
                        <div className={styles.userPhotoPlaceholderCustom}></div>
                      )}
                    </div>
                    <div>
                      <b>{r.reviewerName}</b>
                      <p>{r.text}</p>
                      <div>{renderStars(r.rating)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {currentUserId && !isOwnProfile() && (
              <div className={styles.reviewFormCustom}>
                <h4>Оставить отзыв</h4>
                
                <textarea
                  placeholder="Оставьте отзыв..."
                  value={newReviewText}
                  onChange={(e) => {
                    setNewReviewText(e.target.value);
                    if (e.target.value.trim() !== '') {
                      setValidationErrors(prev => ({ ...prev, text: '' }));
                    }
                  }}
                  className={`${styles.reviewTextarea} ${validationErrors.text ? styles.error : ''}`}
                />
                {validationErrors.text && (
                  <div className={styles.errorMessage}>{validationErrors.text}</div>
                )}
                
                <div className={styles.ratingSection}>
                  <div className={styles.ratingStars}>
                    {[...Array(5)].map((_, index) => {
                      const starValue = index + 1;
                      return (
                        <FaStar
                          key={index}
                          size={24}
                          className={styles.star}
                          color={starValue <= (hoverRating || newReviewRating) ? '#ffbe5a' : '#ccc'}
                          onClick={() => {
                            setNewReviewRating(starValue);
                            if (starValue > 0) {
                              setValidationErrors(prev => ({ ...prev, rating: '' }));
                            }
                          }}
                          onMouseEnter={() => setHoverRating(starValue)}
                          onMouseLeave={() => setHoverRating(0)}
                        />
                      );
                    })}
                  </div>
                  {validationErrors.rating && (
                    <div className={styles.errorMessage}>{validationErrors.rating}</div>
                  )}
                </div>
                
                <button 
                  onClick={handleAddReview}
                  className={styles.addReviewButton}
                >
                  Добавить отзыв
                </button>
              </div>
            )}

            {isOwnProfile() && (
              <div className={styles.infoMessage} style={{background: '#fff3cd', border: '1px solid #ffeaa7', padding: '15px', borderRadius: '5px', marginTop: '20px'}}>
                <p style={{margin: '0 0 10px 0', color: '#856404', fontWeight: 'bold'}}> Вы просматриваете свой собственный профиль</p>
                <p style={{margin: '0', color: '#856404'}}>Вы не можете оставить отзыв самому себе.</p>
              </div>
            )}

            {!currentUserId && (
              <div className={styles.infoMessage} style={{background: '#d1ecf1', border: '1px solid #bee5eb', padding: '15px', borderRadius: '5px', marginTop: '20px'}}>
                <p style={{margin: '0', color: '#0c5460'}}>🔐 Чтобы оставить отзыв, необходимо <Link to="/signin" style={{color: '#007bff', textDecoration: 'underline'}}>войти в систему</Link>.</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) return <p>Загрузка данных пользователя...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

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

      <div className={styles.userInfo}>
        <div className={styles.photoWrapper}>
          {formData.photo ? (
            <img src={`http://localhost:3001${formData.photo}`} alt="User" className={styles.userPhoto} />
          ) : (
            <div className={styles.userPhotoPlaceholder}>Фото</div>
          )}
        </div>
        <div className={styles.infoDisplay}>
          <h1 className={styles.title}>
            {formData.firstName} {formData.lastName}
          </h1>
          <p>{formData.username}</p>
          <p>
            <b>О себе:</b> {formData.about || 'Нет информации'}
          </p>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabButton} ${activeTab === 'projects' ? styles.active : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Проекты
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'cases' ? styles.active : ''}`}
            onClick={() => setActiveTab('cases')}
          >
            Кейсы
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'reviews' ? styles.active : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Отзывы
          </button>
        </div>
        {renderTabContent()}
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