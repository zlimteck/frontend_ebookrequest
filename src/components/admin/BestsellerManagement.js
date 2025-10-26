import React, { useState, useEffect } from 'react';
import axiosAdmin from '../../axiosAdmin';
import { toast } from 'react-toastify';
import styles from './BestsellerManagement.module.css';

const categories = [
  { id: 'all', label: 'Tous', icon: '📚' },
  { id: 'thriller', label: 'Thriller & Policier', icon: '🔍' },
  { id: 'romance', label: 'Romance', icon: '💕' },
  { id: 'sf', label: 'Science-Fiction', icon: '🚀' },
  { id: 'bd', label: 'BD & Manga', icon: '📖' },
  { id: 'fantasy', label: 'Fantasy', icon: '🐉' },
  { id: 'literary', label: 'Littéraire', icon: '✍️' }
];

function BestsellerManagement() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [bestsellers, setBestsellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: 'all',
    order: 0
  });
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedBestsellers, setGeneratedBestsellers] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    fetchBestsellers();
  }, [selectedCategory]);

  const fetchBestsellers = async () => {
    try {
      setLoading(true);
      const response = await axiosAdmin.get(`/api/admin/bestsellers?category=${selectedCategory}`);
      setBestsellers(response.data.data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des bestsellers:', error);
      toast.error('Erreur lors du chargement des bestsellers');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.title || !formData.author) {
      toast.error('Le titre et l\'auteur sont requis');
      return;
    }

    try {
      await axiosAdmin.post('/api/admin/bestsellers', formData);
      toast.success('Bestseller ajouté avec succès');
      setAddingNew(false);
      setFormData({ title: '', author: '', category: 'all', order: 0 });
      fetchBestsellers();
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      toast.error('Erreur lors de l\'ajout du bestseller');
    }
  };

  const handleUpdate = async (id) => {
    if (!formData.title || !formData.author) {
      toast.error('Le titre et l\'auteur sont requis');
      return;
    }

    try {
      await axiosAdmin.put(`/api/admin/bestsellers/${id}`, formData);
      toast.success('Bestseller mis à jour avec succès');
      setEditingId(null);
      setFormData({ title: '', author: '', category: 'all', order: 0 });
      fetchBestsellers();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du bestseller');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce bestseller ?')) {
      return;
    }

    try {
      await axiosAdmin.delete(`/api/admin/bestsellers/${id}`);
      toast.success('Bestseller supprimé avec succès');
      fetchBestsellers();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression du bestseller');
    }
  };

  const startEdit = (bestseller) => {
    setEditingId(bestseller._id);
    setFormData({
      title: bestseller.title,
      author: bestseller.author,
      category: bestseller.category,
      order: bestseller.order
    });
    setAddingNew(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAddingNew(false);
    setFormData({ title: '', author: '', category: 'all', order: 0 });
  };

  const startAdd = () => {
    setAddingNew(true);
    setEditingId(null);
    setFormData({ title: '', author: '', category: selectedCategory, order: bestsellers.length });
  };

  const handleGenerateWithAI = async () => {
    if (selectedCategories.length === 0) {
      toast.error('Veuillez sélectionner au moins une catégorie');
      return;
    }

    try {
      setGenerating(true);
      const categoriesToGenerate = selectedCategories
        .filter(id => id !== 'all')
        .map(id => categories.find(c => c.id === id)?.label)
        .filter(Boolean);

      const response = await axiosAdmin.post('/api/admin/bestsellers/generate', {
        categories: categoriesToGenerate
      });

      if (response.data.success) {
        setGeneratedBestsellers(response.data.bestsellers);
        toast.success(`${response.data.message} pour ${response.data.month}`);
      } else {
        toast.error('Erreur lors de la génération');
      }
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la génération des bestsellers');
    } finally {
      setGenerating(false);
    }
  };

  const toggleCategorySelection = (categoryId) => {
    if (categoryId === 'all') return;

    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const openGenerateModal = () => {
    setShowGenerateModal(true);
    setSelectedCategories([]);
    setGeneratedBestsellers(null);
  };

  const closeGenerateModal = () => {
    setShowGenerateModal(false);
    setSelectedCategories([]);
    setGeneratedBestsellers(null);
  };

  const handleSaveGeneratedBestsellers = async () => {
    if (!generatedBestsellers) return;

    try {
      setGenerating(true);
      let successCount = 0;
      let errorCount = 0;

      // Parcourir chaque catégorie et ses livres
      for (const [categoryName, books] of Object.entries(generatedBestsellers)) {
        const categoryId = categories.find(c => c.label === categoryName)?.id;
        if (!categoryId) continue;

        // Ajouter chaque livre
        for (const book of books) {
          try {
            await axiosAdmin.post('/api/admin/bestsellers', {
              title: book.title,
              author: book.author,
              category: categoryId,
              order: book.order
            });
            successCount++;
          } catch (error) {
            console.error(`Erreur lors de l'ajout de "${book.title}":`, error);
            errorCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} bestseller(s) ajouté(s) avec succès`);
        closeGenerateModal();
        fetchBestsellers(); // Rafraîchir la liste
      }

      if (errorCount > 0) {
        toast.warning(`${errorCount} erreur(s) lors de l'ajout`);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde des bestsellers');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Gestion des Bestsellers</h2>
        <div className={styles.headerButtons}>
          <button className={styles.aiButton} onClick={openGenerateModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Générer avec l'IA
          </button>
          <button className={styles.addButton} onClick={startAdd}>
            + Ajouter un bestseller
          </button>
        </div>
      </div>

      <div className={styles.categoryTabs}>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`${styles.categoryTab} ${selectedCategory === cat.id ? styles.active : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className={styles.categoryIcon}>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {addingNew && (
        <div className={styles.formCard}>
          <h3>Nouveau bestseller</h3>
          <div className={styles.form}>
            <input
              type="text"
              placeholder="Titre"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={styles.input}
            />
            <input
              type="text"
              placeholder="Auteur"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className={styles.input}
            />
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={styles.select}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Ordre"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
              className={styles.input}
            />
            <div className={styles.formButtons}>
              <button className={styles.saveButton} onClick={handleAdd}>
                Enregistrer
              </button>
              <button className={styles.cancelButton} onClick={cancelEdit}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.bestsellersList}>
        {loading ? (
          <div className={styles.loading}>Chargement...</div>
        ) : bestsellers.length === 0 ? (
          <div className={styles.empty}>
            Aucun bestseller dans cette catégorie
          </div>
        ) : (
          bestsellers.map((bestseller, index) => (
            <div key={bestseller._id} className={styles.bestsellerCard}>
              {editingId === bestseller._id ? (
                <div className={styles.form}>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={styles.input}
                  />
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className={styles.input}
                  />
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={styles.select}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className={styles.input}
                  />
                  <div className={styles.formButtons}>
                    <button className={styles.saveButton} onClick={() => handleUpdate(bestseller._id)}>
                      Enregistrer
                    </button>
                    <button className={styles.cancelButton} onClick={cancelEdit}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.bestsellerInfo}>
                    <div className={styles.rank}>#{index + 1}</div>
                    <div className={styles.bookDetails}>
                      <div className={styles.title}>{bestseller.title}</div>
                      <div className={styles.author}>{bestseller.author}</div>
                      <div className={styles.meta}>
                        <span className={styles.category}>
                          {categories.find(c => c.id === bestseller.category)?.label || bestseller.category}
                        </span>
                        <span className={styles.order}>Ordre: {bestseller.order}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.editButton} onClick={() => startEdit(bestseller)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Modifier
                    </button>
                    <button className={styles.deleteButton} onClick={() => handleDelete(bestseller._id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {showGenerateModal && (
        <div className={styles.modalOverlay} onClick={closeGenerateModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Générer les bestsellers avec l'IA</h3>
              <button className={styles.closeButton} onClick={closeGenerateModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className={styles.modalContent}>
              <p className={styles.modalDescription}>
                Sélectionnez les catégories pour lesquelles vous souhaitez générer le top 5 des bestsellers du mois :
              </p>

              <div className={styles.categorySelection}>
                {categories
                  .filter(cat => cat.id !== 'all')
                  .map(cat => (
                    <button
                      key={cat.id}
                      className={`${styles.categorySelectButton} ${
                        selectedCategories.includes(cat.id) ? styles.selected : ''
                      }`}
                      onClick={() => toggleCategorySelection(cat.id)}
                    >
                      <span className={styles.categoryIcon}>{cat.icon}</span>
                      <span>{cat.label}</span>
                      {selectedCategories.includes(cat.id) && (
                        <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </button>
                  ))}
              </div>

              {!generatedBestsellers && (
                <div className={styles.modalActions}>
                  <button
                    className={styles.generateButton}
                    onClick={handleGenerateWithAI}
                    disabled={generating || selectedCategories.length === 0}
                  >
                    {generating ? (
                      <>
                        <div className={styles.spinner}></div>
                        L'IA joue au devin littéraire...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Générer les bestsellers
                      </>
                    )}
                  </button>
                  <button className={styles.cancelModalButton} onClick={closeGenerateModal}>
                    Annuler
                  </button>
                </div>
              )}

              {generatedBestsellers && (
                <div className={styles.previewSection}>
                  <h4 className={styles.previewTitle}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Aperçu des bestsellers générés
                  </h4>

                  <div className={styles.generatedResults}>
                    {Object.entries(generatedBestsellers).map(([category, books]) => (
                      <div key={category} className={styles.categoryResult}>
                        <h5 className={styles.categoryResultTitle}>
                          {categories.find(c => c.label === category)?.icon} {category}
                        </h5>
                        <div className={styles.booksList}>
                          {books.map((book, index) => (
                            <div key={index} className={styles.bookPreviewCard}>
                              {book.thumbnail && (
                                <img
                                  src={book.thumbnail}
                                  alt={book.title}
                                  className={styles.bookThumbnail}
                                />
                              )}
                              <div className={styles.bookPreviewInfo}>
                                <div className={styles.bookPreviewRank}>#{book.order}</div>
                                <div className={styles.bookPreviewTitle}>{book.title}</div>
                                <div className={styles.bookPreviewAuthor}>{book.author}</div>
                                <div className={styles.bookPreviewReason}>{book.reason}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.previewActions}>
                    <button className={styles.regenerateButton} onClick={handleGenerateWithAI} disabled={generating}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                      </svg>
                      Régénérer
                    </button>
                    <button className={styles.saveGeneratedButton} onClick={handleSaveGeneratedBestsellers} disabled={generating}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                      {generating ? 'Enregistrement...' : 'Valider et enregistrer'}
                    </button>
                    <button className={styles.cancelModalButton} onClick={closeGenerateModal}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BestsellerManagement;