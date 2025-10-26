import React, { useState, useEffect } from 'react';
import axiosAdmin from '../axiosAdmin';
import { toast } from 'react-toastify';
import styles from './BookRecommendations.module.css';

const BookRecommendations = ({ onSelectBook }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(true);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosAdmin.get('/api/recommendations?limit=5');

      if (response.data.success) {
        setRecommendations(response.data.recommendations || []);
        setMessage(response.data.message || '');
      } else {
        setError(response.data.message || 'Erreur lors du chargement des recommandations');
      }
    } catch (err) {
      console.error('Erreur lors du chargement des recommandations:', err);
      setError(err.response?.data?.message || 'Impossible de charger les recommandations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleSelectBook = (rec) => {
    if (onSelectBook) {
      // Créer un objet compatible avec le format Google Books
      const bookData = {
        volumeInfo: {
          title: rec.title,
          authors: [rec.author],
          imageLinks: rec.thumbnail ? { thumbnail: rec.thumbnail } : null,
          description: rec.description || rec.reason,
          infoLink: rec.link || ''
        }
      };
      onSelectBook(bookData);
      toast.success(`"${rec.title}" ajouté au formulaire`);
    }
  };

  if (loading && recommendations.length === 0) {
    return (
      <div className={styles.recommendationsSection}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Recommandations pour vous
          </h2>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>L'IA joue au devin littéraire...</p>
        </div>
      </div>
    );
  }

  if (error && recommendations.length === 0) {
    return (
      <div className={styles.recommendationsSection}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Recommandations pour vous
          </h2>
        </div>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
          <button className={styles.retryButton} onClick={fetchRecommendations}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null; // Ne rien afficher si pas de recommandations
  }

  return (
    <div className={styles.recommendationsSection}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Recommandations IA
        </h2>
        <button
          className={styles.toggleButton}
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Réduire" : "Développer"}
        >
          <svg
            className={`${styles.chevron} ${expanded ? styles.expanded : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>

      {message && (
        <p className={styles.subtitle}>{message}</p>
      )}

      {expanded && (
        <>
          <div className={styles.recommendationsGrid}>
            {recommendations.map((rec, index) => (
              <div key={rec.id || index} className={styles.recommendationCard}>
                <div className={styles.bookCover}>
                  {rec.thumbnail ? (
                    <img
                      src={rec.thumbnail}
                      alt={`Couverture de ${rec.title}`}
                      className={styles.coverImage}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentNode.classList.add(styles.noCover);
                      }}
                    />
                  ) : (
                    <div className={styles.noCoverContent}>
                      <svg className={styles.noCoverIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                      <span>Pas de couverture</span>
                    </div>
                  )}
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.bookTitle}>{rec.title}</h3>
                    {rec.genre && rec.genre !== 'Non spécifié' && (
                      <span className={styles.genreBadge}>{rec.genre}</span>
                    )}
                  </div>

                  <p className={styles.bookAuthor}>Par {rec.author}</p>

                  <div className={styles.reasonContainer}>
                    <svg className={styles.reasonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <p className={styles.reason}>{rec.reason}</p>
                  </div>

                  <button
                    className={styles.selectButton}
                    onClick={() => handleSelectBook(rec)}
                  >
                    <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Sélectionner ce livre
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            <button className={styles.refreshButton} onClick={fetchRecommendations} disabled={loading}>
              <svg className={styles.refreshIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              {loading ? 'Chargement...' : 'Nouvelles recommandations'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BookRecommendations;