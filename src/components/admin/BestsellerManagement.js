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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Gestion des Bestsellers</h2>
        <button className={styles.addButton} onClick={startAdd}>
          + Ajouter un bestseller
        </button>
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
    </div>
  );
}

export default BestsellerManagement;