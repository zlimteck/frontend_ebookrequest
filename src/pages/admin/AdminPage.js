import React, { useEffect, useState } from 'react';
import axiosAdmin from '../../axiosAdmin';
import styles from './AdminPage.module.css';
import { toast } from 'react-toastify';
import PushoverConfig from '../../components/admin/PushoverConfig';
import UserManagement from '../../components/admin/UserManagement';
import StatsDashboard from '../../components/admin/StatsDashboard';

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

function AdminPage() {
  const [activeTab, setActiveTab] = useState('requests');
  const [showPushoverConfig, setShowPushoverConfig] = useState(false);
  const [pushoverConfig, setPushoverConfig] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [deletingRequest, setDeletingRequest] = useState(null);
  const [editingDownloadLink, setEditingDownloadLink] = useState(null);
  const [downloadLink, setDownloadLink] = useState('');
  const [cancelingRequest, setCancelingRequest] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axiosAdmin.get(`/api/requests/all?status=${filter}`);
      setRequests(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des demandes:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [filter, activeTab]);

  const handleUpdateStatus = async (id, status, reason = '') => {
    try {
      setUpdatingStatus(id);
      await axiosAdmin.patch(`/api/requests/${id}/status`, { status, reason });
      await fetchRequests();
      const statusMessages = {
        'completed': 'complétée',
        'canceled': 'annulée',
        'pending': 'en attente'
      };
      toast.success(`Demande marquée comme ${statusMessages[status] || status}`);
      setCancelingRequest(null);
      setCancelReason('');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleCancelRequest = (id) => {
    if (cancelReason.trim() === '') {
      toast.error('Veuillez indiquer une raison d\'annulation');
      return;
    }
    handleUpdateStatus(id, 'canceled', cancelReason);
  };

  const handleDeleteRequest = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) {
      try {
        setDeletingRequest(id);
        await axiosAdmin.delete(`/api/requests/${id}`);
        await fetchRequests();
        toast.success('Demande supprimée avec succès');
      } catch (error) {
        console.error('Erreur lors de la suppression de la demande:', error);
        toast.error('Erreur lors de la suppression de la demande');
      } finally {
        setDeletingRequest(null);
      }
    }
  };

  const handleSaveDownloadLink = async (id, link) => {
    try {
      // Mettre à jour le lien de téléchargement
      await axiosAdmin.patch(`/api/requests/${id}/download-link`, { downloadLink: link });
      // Mettre à jour le statut à 'completed' après l'ajout du lien
      await handleUpdateStatus(id, 'completed');
      setEditingDownloadLink(null);
      await fetchRequests();
      toast.success('Lien de téléchargement enregistré et demande marquée comme complétée');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du lien:', error);
      toast.error('Erreur lors de la sauvegarde du lien');
    }
  };

  // Gérer le changement d'onglet
  const renderTabContent = () => {
    switch (activeTab) {
      case 'stats':
        return <StatsDashboard />;
      case 'pushover':
        return <PushoverConfig />;
      case 'users':
        return <UserManagement />;
      case 'requests':
      default:
        return (
          <>
            <div className={styles.filters}>
              <button 
                className={`${styles.filterButton} ${filter === 'pending' ? styles.active : ''}`}
                onClick={() => setFilter('pending')}
              >
                En attente
              </button>
              <button 
                className={`${styles.filterButton} ${filter === 'completed' ? styles.active : ''}`}
                onClick={() => setFilter('completed')}
              >
                Complétées
              </button>
              <button 
                className={`${styles.filterButton} ${filter === 'canceled' ? styles.active : ''}`}
                onClick={() => setFilter('canceled')}
              >
                Annulées
              </button>
              <button 
                className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
                onClick={() => setFilter('all')}
              >
                Toutes
              </button>
              <button 
                className={styles.refreshButton}
                onClick={fetchRequests}
                disabled={loading}
              >
                <RefreshIcon /> Actualiser
              </button>
            </div>
            {renderRequestsList()}
          </>
        );
    }
  };

  // Rendu de la liste des demandes
  const renderRequestsList = () => {
    return (
      <div className={styles.requestsList}>
        {loading ? (
          <div className={styles.loading}>Chargement des demandes...</div>
        ) : requests.length === 0 ? (
          <div className={styles.noResults}>Aucune demande trouvée</div>
        ) : (
          <div className={styles.requestsGrid}>
            {requests.map(request => (
            <div key={request._id} className={styles.requestCard}>
              <div className={styles.cardHeader}>
                <div className={styles.bookInfo}>
                  <div className={styles.thumbnailContainer}>
                    {request.thumbnail ? (
                      <img 
                        src={request.thumbnail} 
                        alt={`Couverture de ${request.title}`} 
                        className={styles.bookThumbnail}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentNode.innerHTML = `
                            <div class="${styles.noCoverContent}">
                              <svg class="${styles.noCoverIcon}" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="3" y1="9" x2="21" y2="9"></line>
                                <line x1="9" y1="21" x2="9" y2="9"></line>
                              </svg>
                              <span>Pas de couverture</span>
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className={styles.noCoverContent}>
                        <svg className={styles.noCoverIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="3" y1="9" x2="21" y2="9"></line>
                          <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                        <span>Pas de couverture</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className={styles.bookTitle}>{request.title}</div>
                    <div className={styles.bookAuthor}>{request.author}</div>
                  </div>
                </div>
                <div className={styles.requestMeta}>
                    <div className={styles.requestUser}>
                      <span className={styles.metaLabel}>Utilisateur :</span>
                      <span>{request.username}</span>
                    </div>
                  <div className={styles.requestDate}>
                    <span className={styles.metaLabel}>Date :</span>
                    <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                  </div>
                    <div className={styles.requestDownloaded}>
                      <span className={styles.metaLabel}>Téléchargé :</span>
                      <span>{request.downloadedAt 
                        ? new Date(request.downloadedAt).toLocaleDateString() 
                        : 'Non'}
                      </span>
                    </div>
                    {request.link && (
                    <div className={styles.requestLink}>
                    <span className={styles.metaLabel}>Lien :</span>
                      <a 
                        href={request.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.link}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Voir le livre
                      </a>
                    </div>
                  )}
                  <div 
                    className={`${styles.status} ${
                      request.status === 'completed' ? styles.completed : 
                      request.status === 'canceled' ? styles.canceled : ''
                    }`}
                  >
                    {
                      request.status === 'pending' ? 'En attente' :
                      request.status === 'completed' ? 'Complétée' :
                      request.cancelReason ? `Annulée : ${request.cancelReason}` : 'Annulée'
                    }
                  </div>
                </div>
              </div>
              
              <div className={styles.cardFooter}>
                <div className={styles.statusActions}>
                  {request.downloadLink && (
                    <div className={styles.downloadLinkSection}>
                      <a 
                        href={request.downloadLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.downloadLink}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!request.downloadedAt) {
                            try {
                              await axiosAdmin.put(`/api/requests/${request._id}/mark-downloaded`);
                              // Mettre à jour l'état local
                              setRequests(prev => 
                                prev.map(req => 
                                  req._id === request._id 
                                    ? { ...req, downloadedAt: new Date().toISOString() }
                                    : req
                                )
                              );
                            } catch (error) {
                              console.error('Erreur lors du marquage comme téléchargé:', error);
                            }
                          }
                        }}
                      >
                        Télécharger le livre
                      </a>
                    </div>
                  )}
                  
                  <div className={styles.statusButtons}>
                    {request.status === 'pending' ? (
                      <>
                        <button 
                          className={`${styles.button} ${styles.primary}`}
                          onClick={() => {
                            setEditingDownloadLink(request._id);
                            setDownloadLink(request.downloadLink || '');
                          }}
                        >
                          Ajouter un lien
                        </button>
                        <button 
                          className={`${styles.button} ${styles.secondary}`}
                          onClick={() => setCancelingRequest(request._id)}
                          disabled={updatingStatus === request._id}
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className={`${styles.button} ${styles.warning}`}
                          onClick={() => handleUpdateStatus(request._id, 'pending')}
                          disabled={updatingStatus === request._id}
                        >
                          {updatingStatus === request._id ? '...' : 'En attente'}
                        </button>
                        {request.status === 'completed' && (
                          <button 
                            className={`${styles.button} ${styles.secondary}`}
                            onClick={() => {
                              setCancelingRequest(request._id);
                              setCancelReason('');
                            }}
                            disabled={updatingStatus === request._id}
                          >
                            {updatingStatus === request._id ? '...' : 'Annuler'}
                          </button>
                        )}
                        {request.status === 'canceled' && (
                          <button 
                            className={`${styles.button} ${styles.primary}`}
                            onClick={() => handleUpdateStatus(request._id, 'pending')}
                            disabled={updatingStatus === request._id}
                          >
                            {updatingStatus === request._id ? '...' : 'Réactiver'}
                          </button>
                        )}
                      </>
                    )}
                    <button 
                      className={`${styles.button} ${styles.danger}`}
                      onClick={() => handleDeleteRequest(request._id)}
                      disabled={deletingRequest === request._id}
                    >
                      {deletingRequest === request._id ? '...' : 'Supprimer'}
                    </button>
                  </div>
                  
                  {cancelingRequest === request._id && (
                    <div className={styles.cancelForm}>
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Raison de l'annulation"
                        className={styles.cancelInput}
                        autoFocus
                      />
                      <div className={styles.cancelButtons}>
                        <button 
                          className={`${styles.button} ${styles.primary}`}
                          onClick={() => handleCancelRequest(request._id)}
                          disabled={updatingStatus === request._id}
                        >
                          {updatingStatus === request._id ? '...' : 'Confirmer'}
                        </button>
                        <button 
                          className={styles.button}
                          onClick={() => {
                            setCancelingRequest(null);
                            setCancelReason('');
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {editingDownloadLink === request._id && (
                    <div className={styles.downloadLinkForm}>
                      <input
                        value={downloadLink}
                        onChange={(e) => setDownloadLink(e.target.value)}
                        placeholder="Lien de téléchargement"
                        className={styles.downloadLinkInput}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className={styles.downloadLinkButtons}>
                        <button 
                          className={`${styles.button} ${styles.primary}`}
                          onClick={() => handleSaveDownloadLink(request._id, downloadLink)}
                        >
                          Enregistrer
                        </button>
                        <button 
                          className={styles.button}
                          onClick={() => setEditingDownloadLink(null)}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.adminContainer}>
      <div className={styles.pageHeader}>
        <h1>Panneau d'administration</h1>
      </div>
      <div className={styles.tabs}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'requests' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Demandes
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'users' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Utilisateurs
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'stats' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistiques
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'pushover' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('pushover')}
        >
          Configuration Pushover
        </button>
      </div>
      <div className={styles.tabContent}>
        {renderTabContent()}
      </div>
    </div>
  );
}

export default AdminPage;