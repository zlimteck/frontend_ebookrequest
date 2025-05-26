import React, { useState, useEffect } from 'react';
import axiosAdmin from '../../axiosAdmin';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import styles from './UserManagement.module.css';

const RoleBadge = ({ role }) => (
  <span className={`${styles.roleBadge} ${role === 'admin' ? styles.adminBadge : styles.userBadge}`}>
    {role === 'admin' ? 'Admin' : 'Utilisateur'}
  </span>
);

const EmailStatus = ({ verified }) => (
  <span className={`${styles.statusBadge} ${verified ? styles.verified : styles.pending}`}>
    {verified ? 'Vérifié' : 'En attente'}
  </span>
);

const SortIcon = ({ column, sortConfig }) => {
  if (sortConfig.key !== column) return <span>↕️</span>;
  return sortConfig.direction === 'asc' ? <span>⬆️</span> : <span>⬇️</span>;
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    _id: '',
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [errors, setErrors] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  
  // États pour la pagination et le tri
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtrer et trier les utilisateurs
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const username = user.username || '';
    const email = user.email || '';
    const role = user.role || '';
    
    return (
      username.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      role.toLowerCase().includes(searchLower)
    );
  });
  
  // Trier les utilisateurs
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
  
  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  
  // Formatage de la date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'PPpp', { locale: fr });
  };

  // Gestion du tri
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Gestion de la recherche
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Réinitialiser à la première page lors d'une nouvelle recherche
  };

  // Charger les utilisateurs
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosAdmin.get('/api/admin/users');
      const formattedUsers = response.data.map(user => ({
        ...user,
        isEmailVerified: user.emailVerified || false
      }));
      setUsers(formattedUsers);
    } catch (err) {
      console.error('Erreur lors de la récupération des utilisateurs:', err);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) newErrors.username = 'Le nom est requis';
    if (!formData.email) newErrors.email = 'L\'email est requis';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email invalide';
    
    // Validation du mot de passe uniquement pour la création ou si un nouveau mot de passe est fourni
    if (!formData._id || formData.password) {
      if (!formData.password) {
        newErrors.password = 'Le mot de passe est requis';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
      }
    }
    
    if (!formData.role) newErrors.role = 'Le rôle est requis';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      const userData = { ...formData };
      if (!userData.password) delete userData.password;
      
      if (userData._id) {
        await axiosAdmin.put(`/api/admin/users/${userData._id}`, userData);
        toast.success('Utilisateur mis à jour avec succès');
      } else {
        await axiosAdmin.post('/api/admin/users', userData);
        toast.success('Utilisateur créé avec succès');
      }
      
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire:', error);
      const errorMessage = error.response?.data?.error || 'Une erreur est survenue';
      toast.error(`Erreur: ${errorMessage}`);
    }
  };

  const resetForm = () => {
    setFormData({
      _id: '',
      username: '',
      email: '',
      password: '',
      role: 'user'
    });
    setErrors({});
    setShowModal(false);
  };

  const handleEdit = (user) => {
    setFormData({
      _id: user._id,
      username: user.username,
      email: user.email,
      password: '',
      role: user.role
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    
    try {
      setDeletingId(id);
      await axiosAdmin.delete(`/api/admin/users/${id}`);
      toast.success('Utilisateur supprimé avec succès');
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors de la suppression';
      toast.error(`Erreur: ${errorMessage}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Gestion des utilisateurs</h1>
        <div className={styles.headerActions}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={handleSearch}
              className={styles.searchInput}
            />
            <span className={styles.searchIcon}>🔍</span>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className={styles.loading}>Chargement des utilisateurs...</div>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.usersTable}>
              <thead>
                <tr>
                  <th onClick={() => requestSort('username')}>
                    <div className={styles.tableHeader}>
                      Nom d'utilisateur <SortIcon column="username" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th onClick={() => requestSort('email')}>
                    <div className={styles.tableHeader}>
                      Email <SortIcon column="email" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th onClick={() => requestSort('role')}>
                    <div className={styles.tableHeader}>
                      Rôle <SortIcon column="role" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th>Email vérifié</th>
                  <th onClick={() => requestSort('createdAt')}>
                    <div className={styles.tableHeader}>
                      Date d'inscription <SortIcon column="createdAt" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th onClick={() => requestSort('lastLogin')}>
                    <div className={styles.tableHeader}>
                      Dernière connexion <SortIcon column="lastLogin" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th onClick={() => requestSort('lastActivity')}>
                    <div className={styles.tableHeader}>
                      Dernière activité <SortIcon column="lastActivity" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.length > 0 ? (
                  currentUsers.map(user => (
                    <tr key={user._id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.userAvatar}>
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          {user.username}
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td><RoleBadge role={user.role} /></td>
                      <td><EmailStatus verified={user.isEmailVerified} /></td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>{user.lastLogin ? formatDate(user.lastLogin) : 'Jamais'}</td>
                      <td>{user.lastActivity ? formatDate(user.lastActivity) : 'Inconnue'}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button 
                            className={`${styles.actionButton} ${styles.editButton}`}
                            onClick={() => handleEdit(user)}
                            title="Modifier"
                          >
                            <i className="fas fa-edit" style={{ color: 'white' }} />
                          </button>
                          <button 
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            onClick={() => handleDelete(user._id)}
                            disabled={deletingId === user._id}
                            title="Supprimer"
                          >
                            {deletingId === user._id ? <i className="fas fa-spinner fa-spin" style={{ color: 'white' }} /> : <i className="fas fa-trash" style={{ color: 'white' }} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className={styles.noResults}>
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={styles.pageButton}
              >
                Précédent
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return pageNum > 0 && pageNum <= totalPages ? (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`${styles.pageButton} ${currentPage === pageNum ? styles.activePage : ''}`}
                  >
                    {pageNum}
                  </button>
                ) : null;
              })}
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={styles.pageButton}
              >
                Suivant
              </button>
              
              <div className={styles.pageInfo}>
                Page {currentPage} sur {totalPages} • {users.length} utilisateur{users.length > 1 ? 's' : ''} au total
              </div>
            </div>
          )}
        </>
      )}
      
      <div className={styles.addButtonContainer}>
        <button 
          className={styles.addButton}
          onClick={() => setShowModal(true)}
        >
          <span>+</span> Ajouter un utilisateur
        </button>
      </div>
      
      {/* Modal d'édition/création */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {formData._id ? 'Modifier un utilisateur' : 'Ajouter un utilisateur'}
              </h3>
              <button 
                type="button"
                className={styles.closeButton}
                onClick={resetForm}
                aria-label="Fermer"
              >
                &times;
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <form onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="username">Nom d'utilisateur *</label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className={`${styles.formInput} ${errors.username ? styles.error : ''}`}
                      placeholder="Nom d'utilisateur"
                    />
                    {errors.username && <span className={styles.errorText}>{errors.username}</span>}
                  </div>
                
                  <div className={styles.formGroup}>
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`${styles.formInput} ${errors.email ? styles.error : ''}`}
                      placeholder="email@exemple.com"
                    />
                    {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="password">
                      Mot de passe {formData._id ? '(laissez vide pour ne pas modifier)' : '*'}
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`${styles.formInput} ${errors.password ? styles.error : ''}`}
                      placeholder="••••••••"
                    />
                    {errors.password && <span className={styles.errorText}>{errors.password}</span>}
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="role">Rôle *</label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className={`${styles.formSelect} ${errors.role ? styles.error : ''}`}
                    >
                      <option value="user">Utilisateur</option>
                      <option value="admin">Administrateur</option>
                    </select>
                    {errors.role && <span className={styles.errorText}>{errors.role}</span>}
                  </div>
                </div>
                
                <div className={styles.formFooter}>
                  <p className={styles.formNote}>
                    * Champs obligatoires. Un email de vérification sera envoyé à l'utilisateur.
                  </p>
                  
                  <div className={styles.formActions}>
                    <button 
                      type="button" 
                      className={styles.cancelButton}
                      onClick={resetForm}
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      className={styles.saveButton}
                      disabled={loading}
                    >
                      {loading ? <i className="fas fa-spinner fa-spin" style={{ color: 'white' }}></i> : formData._id ? 'Mettre à jour' : 'Créer l\'utilisateur'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;