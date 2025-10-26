import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosAdmin from '../../axiosAdmin';
import GoogleBooksSearch from '../../components/GoogleBooksSearch';
import BookRecommendations from '../../components/BookRecommendations';
import { compressImage, isImage } from '../../utils/imageCompressor';
import styles from './UserForm.module.css';

// Composant pour afficher les informations du livre sélectionné
const SelectedBookInfo = ({ book, onRemove }) => {
  if (!book || !book.volumeInfo) return null; 
  const { 
    title = 'Titre inconnu', 
    authors, 
    publishedDate, 
    pageCount,
    imageLinks 
  } = book.volumeInfo || {};
  
  const thumbnailUrl = imageLinks?.thumbnail?.replace('http://', 'https://');
  const authorText = authors?.length ? authors.join(', ') : 'Auteur inconnu';
  const year = publishedDate ? new Date(publishedDate).getFullYear() : null;
  
  return (
    <div className={styles.selectedBook}>
      <h3>Livre sélectionné</h3>
      <div className={styles.bookPreview}>
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={`Couverture de ${title}`}
            className={styles.bookThumbnail}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'block';
            }}
          />
        ) : null}
        <div className={styles.thumbnailPlaceholder} style={{ display: thumbnailUrl ? 'none' : 'flex' }}>
          <span>Pas de couverture</span>
        </div>
        
        <div className={styles.bookDetails}>
          <h4>{title}</h4>
          <p><strong>Auteur(s):</strong> {authorText}</p>
          {year && <p><strong>Année:</strong> {year}</p>}
          {pageCount && <p><strong>Pages:</strong> {pageCount}</p>}
          <button 
            type="button" 
            onClick={onRemove}
            className={styles.removeButton}
            aria-label="Changer de livre"
          >
            Changer de livre
          </button>
        </div>
      </div>
    </div>
  );
};

function UserForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ 
    author: '', 
    title: '', 
    genre: '',
    year: '',
    description: '',
    coverImage: null,
    coverImagePreview: '',
    file: null
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchMode, setSearchMode] = useState('google');
  const [selectedBook, setSelectedBook] = useState(null);
  const [existingRequests, setExistingRequests] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Fonction pour vérifier la disponibilité du livre
  const checkAvailability = useCallback(async (title, author) => {
    if (!title || !author) return;

    setCheckingAvailability(true);
    setAvailability(null);

    try {
      const response = await axiosAdmin.post('/api/availability/check', {
        title,
        author
      });

      if (response.data.success) {
        setAvailability(response.data);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de disponibilité:', error);
      setAvailability({
        available: false,
        confidence: 'unknown',
        message: 'Impossible de vérifier la disponibilité pour le moment'
      });
    } finally {
      setCheckingAvailability(false);
    }
  }, []);

  // Vérifier si l'utilisateur est connecté et charger les demandes existantes
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (isMounted) {
          navigate('/login', { state: { from: '/' } });
        }
      } else {
        if (isMounted) {
          setIsAuthenticated(true);
          await fetchExistingRequests();

          // Vérifier s'il y a des données pré-remplies depuis la page Découvrir
          if (location.state?.prefillData) {
            const prefill = location.state.prefillData;
            setForm(prev => ({
              ...prev,
              title: prefill.title || '',
              author: prefill.author || '',
              link: prefill.link || '',
              description: prefill.description || '',
              coverImagePreview: prefill.thumbnail || '',
              pages: prefill.pageCount || ''
            }));
            setSearchMode('manual');

            // Vérifier la disponibilité si on a un titre et un auteur
            if (prefill.title && prefill.author) {
              checkAvailability(prefill.title, prefill.author);
            }
          }
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      setMessage({ text: '', type: '' });
    };
  }, [navigate, location.state, checkAvailability]);
  
  // Fonction pour charger les demandes existantes de l'utilisateur
  const fetchExistingRequests = async () => {
    try {
      const response = await axiosAdmin.get('/api/requests/my-requests');
      if (response.data) {
        setExistingRequests(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des demandes existantes:', error);
    }
  };

  const handleChange = async (e) => {
    const { name, value, files } = e.target;
    if (name === 'coverImage' && files && files[0]) {
      const file = files[0];
      if (isImage(file) && file.size > 1 * 1024 * 1024) { // > 1MB
        try {
          setMessage({ text: 'Compression de l\'image en cours...', type: 'info' });
          const compressedFile = await compressImage(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1200
          });
          
          const reader = new FileReader();
          reader.onloadend = () => {
            setForm(prev => ({
              ...prev,
              coverImage: compressedFile,
              coverImagePreview: reader.result
            }));
            setMessage({ text: 'Image compressée avec succès', type: 'success' });
          };
          reader.readAsDataURL(compressedFile);
          
          // Affiche un message sur la réduction de taille
          const originalSize = (file.size / 1024 / 1024).toFixed(2);
          const newSize = (compressedFile.size / 1024 / 1024).toFixed(2);
          console.log(`Taille réduite de ${originalSize} Mo à ${newSize} Mo`);
          
        } catch (error) {
          console.error('Erreur lors de la compression de l\'image:', error);
          setMessage({ 
            text: 'Erreur lors de la compression de l\'image. Utilisation de l\'image originale.', 
            type: 'warning' 
          });
          // En cas d'erreur, utiliser l'image originale
          const reader = new FileReader();
          reader.onloadend = () => {
            setForm(prev => ({
              ...prev,
              coverImage: file,
              coverImagePreview: reader.result
            }));
          };
          reader.readAsDataURL(file);
        }
      } else {
        // Si l'image est déjà assez petite, l'utiliser directement
        const reader = new FileReader();
        reader.onloadend = () => {
          setForm(prev => ({
            ...prev,
            coverImage: file,
            coverImagePreview: reader.result
          }));
        };
        reader.readAsDataURL(file);
      }
    } else if (name === 'file' && files && files[0]) {
      const file = files[0];
      
      // Vérifie si c'est un fichier volumineux (plus de 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ 
          text: 'Le fichier est trop volumineux (max 5 Mo). Veuillez choisir un fichier plus petit.', 
          type: 'error' 
        });
        e.target.value = '';
        return;
      }
      
      setForm(prev => ({
        ...prev,
        file: file
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleBookSelect = useCallback((book) => {
    if (!book) return false;

    // Vérifie si ce livre a déjà été demandé
    if (book.id) {
      const currentRequests = [...existingRequests];

      const isDuplicate = currentRequests.some(req => {
        return req.googleBooksId === book.id ||
              (req.title === book.volumeInfo?.title &&
               req.author === book.volumeInfo?.authors?.[0]);
      });

      if (isDuplicate) {
        setMessage({
          text: 'Vous avez déjà demandé ce livre. Vérifiez vos demandes en attente.',
          type: 'error'
        });
        return false;
      }
    }

    // Si on arrive ici, c'est qu'il n'y a pas de doublon
    setSelectedBook(book);

    // Mettre à jour le formulaire avec les informations du livre
    if (book.volumeInfo) {
      // Construire l'URL Google Books si elle n'est pas fournie
      const googleBooksLink = book.volumeInfo.infoLink || `https://books.google.fr/books?id=${book.id}`;

      const title = book.volumeInfo.title || '';
      const author = book.volumeInfo.authors?.[0] || '';

      setForm(prev => ({
        ...prev,
        title: title,
        author: book.volumeInfo.authors?.join(', ') || '',
        year: book.volumeInfo.publishedDate ? new Date(book.volumeInfo.publishedDate).getFullYear() : '',
        description: book.volumeInfo.description || '',
        link: googleBooksLink,
        coverImage: null,
        coverImagePreview: book.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') || '',
        pages: book.volumeInfo.pageCount || ''
      }));

      // Vérifier la disponibilité
      checkAvailability(title, author);

      // Basculer sur le formulaire manuel pour permettre les modifications
      setSearchMode('manual');
    }

    return true;
  }, [existingRequests, checkAvailability]); // Dépendances nécessaires pour le callback

  const handleRemoveBook = () => {
    setSelectedBook(null);
    setAvailability(null);
    setForm(prev => ({
      ...prev,
      title: '',
      author: '',
      year: '',
      genre: '',
      description: '',
      coverImage: null,
      coverImagePreview: '',
      file: null
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation des champs requis
    if (!form.title || !form.author) {
      setMessage({ 
        text: 'Veuillez remplir tous les champs obligatoires', 
        type: 'error' 
      });
      return;
    }
    
    setIsSubmitting(true);
    setMessage({ text: '', type: '' });
    
    // Créer un objet avec les données du formulaire
    const requestData = {
      title: form.title,
      author: form.author,
      description: form.description || '',
      link: form.link || '',
      thumbnail: form.coverImagePreview || '',
      pageCount: 0,
      ...(selectedBook?.id && { googleBooksId: selectedBook.id })
    };
    
    // Validation du lien
    if (!form.link) {
      setMessage({ 
        text: 'Veuillez fournir un lien vers le livre (Amazon, Fnac, etc.)', 
        type: 'error' 
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Valider que c'est une URL valide
      new URL(form.link);
    } catch (e) {
      setMessage({ 
        text: 'Veuillez fournir une URL valide (commençant par http:// ou https://)', 
        type: 'error' 
      });
      setIsSubmitting(false);
      return;
    }
    
    // Si on a une image de couverture depuis Google Books
    if (form.coverImagePreview && !form.coverImage) {
      requestData.thumbnail = form.coverImagePreview;
    }
    try {
      await axiosAdmin.post('/api/requests', requestData);
      setMessage({ 
        text: 'Votre demande a été soumise avec succès !', 
        type: 'success' 
      });
      
      // Réinitialiser le formulaire
      setForm({
        title: '',
        author: '',
        year: '',
        genre: '',
        description: '',
        coverImage: null,
        coverImagePreview: '',
        file: null
      });
      
      setSelectedBook(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Rediriger vers le tableau de bord après 2 secondes
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (err) {
      console.error('Erreur lors de la soumission de la demande:', err);
      setMessage({ 
        text: err.response?.data?.message || 'Une erreur est survenue lors de la soumission de la demande', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Vérification de l'authentification...</p>
      </div>
    );
  }

  return (
    <div className={`${styles.formContainer} ${styles.requestForm}`}>

      <div className={styles.logoContainer}>
        <img src="/img/logo.png" alt="Logo" className={styles.logo} />
      </div>

      <h1 className={styles.formTitle}>Demander un livre</h1>
      
      {message.text && (
        <div className={`${styles.message} ${message.type === 'error' ? styles.error : styles.success}`}>
          {message.text}
        </div>
      )}
      
      <div className={styles.toggleSearch}>
        <button 
          type="button" 
          className={`${styles.toggleButton} ${searchMode === 'google' ? styles.active : ''}`}
          onClick={() => setSearchMode('google')}
          disabled={!!selectedBook}
          aria-pressed={searchMode === 'google'}
        >
          Rechercher un livre
        </button>
        <button 
          type="button" 
          className={`${styles.toggleButton} ${searchMode === 'manual' ? styles.active : ''}`}
          onClick={() => setSearchMode('manual')}
          aria-pressed={searchMode === 'manual'}
        >
          Saisie manuelle
        </button>
      </div>
      
      {searchMode === 'google' ? (
        <div className={styles.googleSearchContainer}>
          {selectedBook ? (
            <SelectedBookInfo
              book={selectedBook}
              onRemove={handleRemoveBook}
            />
          ) : (
            <GoogleBooksSearch onSelectBook={handleBookSelect} />
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          {selectedBook && (
            <SelectedBookInfo
              book={selectedBook}
              onRemove={handleRemoveBook}
            />
          )}

          {/* Affichage de la disponibilité */}
          {checkingAvailability && (
            <div className={styles.availabilityCheck}>
              <div className={styles.availabilitySpinner}></div>
              <p>Vérification de la disponibilité...</p>
            </div>
          )}

          {availability && !checkingAvailability && (
            <div className={`${styles.availabilityStatus} ${
              availability.confidence === 'high' ? styles.availabilityHigh :
              availability.confidence === 'medium' ? styles.availabilityMedium :
              availability.confidence === 'low' ? styles.availabilityLow :
              styles.availabilityUnknown
            }`}>
              <div className={styles.availabilityIcon}>
                {availability.confidence === 'high' && '✓'}
                {availability.confidence === 'medium' && '⚡'}
                {availability.confidence === 'low' && '⏱'}
                {availability.confidence === 'unknown' && '?'}
              </div>
              <div className={styles.availabilityContent}>
                <h4 className={styles.availabilityTitle}>
                  {availability.confidence === 'high' && 'Disponibilité rapide'}
                  {availability.confidence === 'medium' && 'Disponibilité probable'}
                  {availability.confidence === 'low' && 'Traitement standard'}
                  {availability.confidence === 'unknown' && 'Disponibilité inconnue'}
                </h4>
                <p className={styles.availabilityMessage}>{availability.message}</p>
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              Titre du livre <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              className={styles.input}
              placeholder="Titre du livre"
              required
              aria-required="true"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="author" className={styles.label}>
              Auteur(s) <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="author"
              name="author"
              value={form.author}
              onChange={handleChange}
              className={styles.input}
              placeholder="Nom de l'auteur"
              required
              aria-required="true"
            />
          </div>
          
          <div className={styles.formRow}>
            <div className={`${styles.formGroup} ${styles.halfWidth}`}>
              <label htmlFor="year" className={styles.label}>
                Année de publication
              </label>
              <input
                type="number"
                id="year"
                name="year"
                value={form.year || ''}
                onChange={handleChange}
                className={styles.input}
                placeholder="2023"
                min="1000"
                max={new Date().getFullYear() + 1}
              />
            </div>
            
            <div className={`${styles.formGroup} ${styles.halfWidth}`}>
              <label htmlFor="genre" className={styles.label}>
                Genre
              </label>
              <input
                type="text"
                id="genre"
                name="genre"
                value={form.genre || ''}
                onChange={handleChange}
                className={styles.input}
                placeholder="Roman, BD, Science-fiction..."
              />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description || ''}
              onChange={handleChange}
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Description du livre..."
              rows="4"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="link" className={styles.label}>
              Lien vers le livre (Amazon, Fnac, etc.) <span className={styles.required}>*</span>
            </label>
            <input
              type="url"
              id="link"
              name="link"
              value={form.link || ''}
              onChange={handleChange}
              className={styles.input}
              placeholder="https://www.amazon.fr/..."
              required
              aria-required="true"
            />
            <p className={styles.helpText}>
              Merci de fournir un lien vers le livre (Amazon, Fnac, etc.) pour faciliter la vérification.
            </p>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="coverImage" className={styles.label}>
              Image de couverture (optionnel)
            </label>
            <input
              type="file"
              id="coverImage"
              name="coverImage"
              accept="image/*"
              onChange={handleChange}
              className={styles.fileInput}
              ref={fileInputRef}
              aria-label="Télécharger une image de couverture"
            />
            {form.coverImagePreview && (
              <div className={styles.thumbnailPreview}>
                <img 
                  src={form.coverImagePreview} 
                  alt="Aperçu de la couverture" 
                  className={styles.thumbnailImage}
                />
              </div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Soumission en cours...' : 'Soumettre la demande'}
            </button>
          </div>
        </form>
      )}
      {message.text && (
        <div className={`${styles.message} ${message.type === 'success' ? styles.success : styles.error}`}>
          {message.text}
        </div>
      )}

      <BookRecommendations onSelectBook={handleBookSelect} />
    </div>
  );
}

export default UserForm;