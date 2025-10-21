import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosAdmin from '../../axiosAdmin';
import { toast } from 'react-toastify';
import styles from './UserDashboard.module.css';

const DiscoverPage = () => {
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();

  // Définition des catégories
  const categories = [
    { id: 'all', label: 'Tous', icon: '📚' },
    { id: 'thriller', label: 'Thriller & Policier', icon: '🔍' },
    { id: 'romance', label: 'Romance', icon: '💕' },
    { id: 'sf', label: 'Science-Fiction', icon: '🚀' },
    { id: 'bd', label: 'BD & Manga', icon: '📖' },
    { id: 'fantasy', label: 'Fantasy', icon: '🐉' },
    { id: 'literary', label: 'Littéraire', icon: '✍️' }
  ];

  useEffect(() => {
    fetchTrendingBooks(selectedCategory);
  }, [selectedCategory]);

  const fetchTrendingBooks = async (category) => {
    setLoading(true);
    try {
      const response = await axiosAdmin.get(`/api/trending/monthly?category=${category}`);
      if (response.data.success) {
        setTrendingBooks(response.data.data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des livres tendance:', error);
      toast.error('Erreur lors du chargement des livres tendance');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBook = (book) => {
    // Rediriger vers la page de nouvelle demande avec les données pré-remplies
    navigate('/', {
      state: {
        prefillData: {
          title: book.title,
          author: book.author,
          link: book.link,
          thumbnail: book.thumbnail,
          description: book.description,
          pageCount: book.pageCount
        }
      }
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Chargement des livres tendance...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <h1>Découvrir</h1>

      {/* Onglets de filtres par catégorie */}
      <div className={styles.filterTabs} style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`${styles.filterTab} ${selectedCategory === category.id ? styles.activeTab : ''}`}
            style={{
              padding: '0.75rem 1.5rem',
              border: selectedCategory === category.id ? '2px solid #6366f1' : '2px solid var(--color-border)',
              background: selectedCategory === category.id ? '#6366f1' : 'var(--color-card-bg)',
              color: selectedCategory === category.id ? '#fff' : 'var(--color-text)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: selectedCategory === category.id ? '600' : '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.requestsGrid}>
        {trendingBooks.map((book, index) => (
          <div key={book.id} className={styles.requestCard}>
            <div className={styles.bookCover}>
              {book.thumbnail ? (
                <img
                  src={book.thumbnail}
                  alt={book.title}
                  className={styles.coverImage}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.classList.add(styles.noCover);
                    e.target.parentElement.innerHTML = `
                      <div class="${styles.noCoverContent}">
                        <svg class="${styles.noCoverIcon}" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                        <span>Pas de couverture</span>
                        <small>${book.title}</small>
                      </div>
                    `;
                  }}
                />
              ) : (
                <div className={styles.noCoverContent}>
                  <svg className={styles.noCoverIcon} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  <span>Pas de couverture</span>
                  <small>{book.title}</small>
                </div>
              )}
            </div>

            <div className={styles.requestContent}>
              <div className={styles.requestHeader}>
                <h3 className={styles.requestTitle}>{book.title}</h3>
                <span className={`${styles.statusBadge} ${styles.pendingBadge}`}>
                  #{index + 1}
                </span>
              </div>

              <p className={styles.requestAuthor}>
                <strong>Par:</strong> {book.author}
              </p>

              {book.pageCount > 0 && (
                <div className={styles.bookMeta}>
                  <div className={styles.metaItem}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                    <span>{book.pageCount} pages</span>
                  </div>
                </div>
              )}

              {book.description && (
                <p className={styles.bookDescription}>
                  {book.description.length > 200
                    ? `${book.description.substring(0, 200)}...`
                    : book.description}
                </p>
              )}

              <div className={styles.actionButtons}>
                <button
                  className={styles.primaryButton}
                  onClick={() => handleRequestBook(book)}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Demander ce livre
                </button>
                {book.link && (
                  <a
                    href={book.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.secondaryButton}
                  >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                    Voir le livre
                  </a>
                )}
              </div>

              <div className={styles.requestFooter}>
                <div className={styles.requestDate}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                  </svg>
                  <span>Tendance du mois</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {trendingBooks.length === 0 && (
        <div className={styles.emptyState}>
          <p>Aucun livre tendance disponible pour le moment.</p>
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;