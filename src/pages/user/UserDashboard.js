import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosAdmin from '../../axiosAdmin';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './UserDashboard.module.css';
import { REACT_APP_API_URL } from '../../config';

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const UserDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const prevRequestsRef = useRef([]);
  const isFirstRender = useRef(true);
  const [seenNotifications, setSeenNotifications] = useState(new Set());
  const [downloadingFile, setDownloadingFile] = useState(null); // Pour suivre quel fichier est en cours de téléchargement

  // Récupère les demandes de l'utilisateur connecté
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axiosAdmin.get(`/api/requests/my-requests?status=${filter === 'all' ? '' : filter}`);
      
      // Tri des demandes pour afficher : Terminées, En attente, puis Annulées
      const sortedRequests = [...response.data].sort((a, b) => {
        const statusPriority = {
          'completed': 1,
          'pending': 2,
          'canceled': 3
        };
        
        const aPriority = statusPriority[a.status] || 3;
        const bPriority = statusPriority[b.status] || 3;
        
        if (aPriority < bPriority) return -1;
        if (aPriority > bPriority) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setRequests(sortedRequests);
    } catch (error) {
      console.error('Erreur lors de la récupération des demandes:', error);
      toast.error('Erreur lors du chargement de vos demandes');
    } finally {
      setLoading(false);
    }
  };
  
  // Marquer une notification comme vue côté serveur
  const markNotificationAsSeen = async (requestId, type = 'completed') => {
    try {
      // Envoyer la requête au serveur pour marquer la notification comme vue
      await axiosAdmin.post(`/api/notifications/${requestId}/seen`, { 
        type: type 
      });
      
      // Mettre à jour l'état local des notifications vues
      setSeenNotifications(prev => {
        const updated = new Set(prev);
        updated.add(requestId);
        return updated;
      });
      
      return true;
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme vue:', error);
      return false;
    }
  };

  // Marquer une demande comme téléchargée
  const markAsDownloaded = async (requestId) => {
    try {
      const response = await axiosAdmin.put(`/api/requests/${requestId}/mark-downloaded`);
      if (response.data.success) {
        // Mettre à jour l'état local
        setRequests(prevRequests => {
          const updatedRequests = prevRequests.map(req => 
            req._id === requestId 
              ? { ...req, downloadedAt: response.data.downloadedAt }
              : req
          );
          
          // Trouver la demande mise à jour
          const updatedRequest = updatedRequests.find(req => req._id === requestId);
          if (updatedRequest && updatedRequest.status === 'completed') {
            if (!toastIdsRef.current.has(`completed-${requestId}`)) {
              toastIdsRef.current.add(`completed-${requestId}`);
              // Marquer la notification comme vue côté serveur
              (async () => {
                try {
                  await markNotificationAsSeen(requestId, 'completed');
                  setSeenNotifications(prev => new Set([...prev, `completed-${requestId}`]));
                } catch (error) {
                  console.error('Erreur lors du marquage de la notification comme vue:', error);
                }
              })();
            }
          } 
          return updatedRequests;
        });
        
        return true;
      }
    } catch (error) {
      console.error('Erreur lors du marquage comme téléchargé:', error);
      toast.error('Erreur lors de l\'enregistrement du téléchargement');
    }
    return false;
  };

  // Télécharger un fichier ou ouvrir un lien
  const downloadFile = async (request) => {
    if (downloadingFile === request._id) return;
    
    setDownloadingFile(request._id);

    try {
      // Marquer la demande comme téléchargée
      const marked = await markAsDownloaded(request._id);
      if (!marked) return;

      // Si c'est un lien de téléchargement externe
      if (request.downloadLink) {
        // Ouvrir le lien dans un nouvel onglet
        window.open(request.downloadLink, '_blank', 'noopener,noreferrer');
        return;
      }

      // Si c'est un fichier à télécharger via l'API
      if (request.filePath) {
        const response = await axiosAdmin.get(
          `/api/requests/download/${request._id}`,
          { responseType: 'blob' }
        );

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // Extraire le nom du fichier depuis le header Content-Disposition
        const contentDisposition = response.headers['content-disposition'] || '';
        let fileName = '';
        
        // Essayer d'extraire le nom du fichier depuis le Content-Disposition
        const fileNameMatch = contentDisposition.match(/filename\*?=['"](?:UTF-8'')?([^;\n"]*)['"]?;?/i) || 
                           contentDisposition.match(/filename=['"]([^;\n"]*)['"]?;?/i);
        
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1].trim();
          // Nettoyer le nom de fichier si nécessaire
          fileName = fileName.replace(/[^\w\d\.\-]/g, '_');
        } else {
          // Utiliser un nom de fichier par défaut si non trouvé dans le header
          fileName = `ebook_${request._id}.${request.filePath ? request.filePath.split('.').pop() : 'pdf'}`;
        }
        
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        
        // Nettoyage
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement du fichier:', error);
      toast.error('Erreur lors du téléchargement du fichier');
    } finally {
      setDownloadingFile(null);
    }
  };
  
  // Charger les notifications non vues au montage du composant
  useEffect(() => {
    const loadUnseenNotifications = async () => {
      try {
        const response = await axiosAdmin.get('/api/notifications/unseen');
        if (response.data.success && response.data.notifications) {
          const unseenIds = new Set(response.data.notifications.map(n => n._id));
          setSeenNotifications(prev => {
            const merged = new Set(prev);
            return merged;
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des notifications non vues:', error);
      }
    };
    
    loadUnseenNotifications();
  }, []);
  
  const toastIdsRef = useRef(new Set());

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevRequestsRef.current = [...requests];
      return;
    }

    // Vérifier les nouvelles demandes terminées
    if (requests && requests.length > 0) {
      const currentRequestIds = new Set(requests.map(req => req._id));
      requests.forEach(request => {
        if (!request || !request._id) return;
        const prevRequest = prevRequestsRef.current.find(r => r && r._id === request._id);
        // Gestion des notifications pour les demandes terminées
        if (request.status === 'completed' && 
            (request.downloadLink || request.filePath) && 
            !toastIdsRef.current.has(`completed-${request._id}`) &&
            !seenNotifications.has(`completed-${request._id}`) &&
            (!request.notifications?.completed?.seen)) {
          
          toastIdsRef.current.add(`completed-${request._id}`);
          const toastId = `completed-${request._id}`;
          
          (async () => {
            try {
              await markNotificationAsSeen(request._id, 'completed');
              setSeenNotifications(prev => new Set([...prev, `completed-${request._id}`]));
            } catch (error) {
              console.error('Erreur lors du marquage de la notification comme vue:', error);
            }
          })();
          
          toast.success(
            <div>
              <div>Votre demande est terminée !</div>
              <div>
                <a 
                  href={request.downloadLink || '#'} 
                  target={request.downloadLink ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className={styles.downloadLink}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (request.filePath) {
                      await downloadFile(request);
                    } else if (request.downloadLink) {
                      if (!request.downloadedAt) {
                        await markAsDownloaded(request._id);
                      }
                      window.open(request.downloadLink, '_blank');
                    }
                  }}
                >
                  {request.downloadedAt 
                    ? `Téléchargé le ${new Date(request.downloadedAt).toLocaleDateString()}` 
                    : 'Télécharger'}
                </a>
              </div>
            </div>,
            {
              toastId: toastId,
              autoClose: 10000,
              closeOnClick: true,
              closeButton: true
            }
          );
        }
        
        // Gestion des notifications pour les demandes annulées
        if (request.status === 'canceled' && 
            request.cancelReason && 
            !toastIdsRef.current.has(`canceled-${request._id}`) &&
            !seenNotifications.has(`canceled-${request._id}`) &&
            (!request.notifications?.canceled?.seen)) {
          
          toastIdsRef.current.add(`canceled-${request._id}`);
          const toastId = `canceled-${request._id}`;
          
          (async () => {
            try {
              await markNotificationAsSeen(request._id, 'canceled');
              setSeenNotifications(prev => new Set([...prev, `canceled-${request._id}`]));
            } catch (error) {
              console.error('Erreur lors du marquage de la notification comme vue:', error);
            }
          })();
          
          toast.error(
            <div>
              <div>Votre demande a été annulée</div>
              <div className={styles.cancelReason}>
                <strong>Raison :</strong> {request.cancelReason}
              </div>
            </div>,
            {
              toastId: toastId,
              autoClose: 10000,
              closeOnClick: true,
              closeButton: true
            }
          );
        }
      });
      
      // Nettoyer les IDs des demandes qui n'existent plus
      toastIdsRef.current.forEach(id => {
        if (!currentRequestIds.has(id)) {
          toastIdsRef.current.delete(id);
        }
      });
    }
    prevRequestsRef.current = JSON.parse(JSON.stringify(requests));
  }, [requests]);

  // Vérifier les mises à jour toutes les 60 secondes
  useEffect(() => {
    const intervalId = setInterval(fetchRequests, 60000);
    return () => clearInterval(intervalId);
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Chargement de vos demandes...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <h1>Mes demandes</h1>
      
      <div className={styles.filterButtons}>
        <button
          className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          Toutes
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'pending' ? styles.active : ''}`}
          onClick={() => setFilter('pending')}
        >
          En attente
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'canceled' ? styles.active : ''}`}
          onClick={() => setFilter('canceled')}
        >
          Annulées
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'completed' ? styles.active : ''}`}
          onClick={() => setFilter('completed')}
        >
          Terminées
        </button>
      </div>

      {requests.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Vous n'avez aucune demande {filter !== 'all' ? filter : ''}.</p>
        </div>
      ) : (
        <div className={styles.requestsGrid}>
          {requests.map((request) => (
            <div key={request._id} className={`${styles.requestCard} ${
              request.status === 'completed' ? styles.completed :
              request.status === 'canceled' ? styles.canceled :
              ''
            }`}>
              <div className={styles.bookCover}>
                {request.thumbnail ? (
                  <img 
                    src={request.thumbnail} 
                    alt={`Couverture de ${request.title}`} 
                    className={styles.coverImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentNode.classList.add(styles.noCover);
                      e.target.parentNode.innerHTML = `
                        <div class="${styles.noCoverContent}">
                          <svg class="${styles.noCoverIcon}" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="9" y1="21" x2="9" y2="9"></line>
                          </svg>
                          <span>Pas de couverture</span>
                          <small>${request.title}</small>
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
                    <small>{request.title}</small>
                  </div>
                )}
              </div>
              <div className={styles.requestContent}>
                <div className={styles.requestHeader}>
                  <h3 className={styles.requestTitle}>{request.title}</h3>
                  <span className={`${styles.statusBadge} ${
                    request.status === 'completed' ? styles.completedBadge : 
                    request.status === 'canceled' ? styles.canceledBadge : 
                    styles.pendingBadge
                  }`}>
                    {
                      request.status === 'completed' ? 'Terminée' :
                      request.status === 'canceled' ? 'Annulée' :
                      'En attente'
                    }
                  </span>
                </div>
                <p className={styles.requestAuthor}>Par {request.author}</p>
                
                {request.pageCount > 0 && (
                  <p className={styles.bookMeta}>
                    <span className={styles.metaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      {request.pageCount} pages
                    </span>
                  </p>
                )}
                
                {request.description && (
                  <div className={styles.bookDescription}>
                    <p>{request.description.length > 150 ? `${request.description.substring(0, 150)}...` : request.description}</p>
                  </div>
                )}
                
                <div className={styles.actionButtons}>
                  {request.link && (
                    <a 
                      href={request.link} 
                      className={styles.secondaryButton}
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Voir plus d'informations
                    </a>
                  )}

                  {request.status === 'canceled' && request.cancelReason && (
                    <div className={styles.cancelReason}>
                      <span className={styles.cancelReasonLabel}>Motif :</span>
                      <p>{request.cancelReason}</p>
                    </div>
                  )}
                  
                  {request.status === 'completed' && (request.downloadLink || request.filePath) && (
                    <button 
                      className={`${styles.primaryButton} ${downloadingFile === request._id ? styles.downloading : ''}`}
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          await downloadFile(request);
                        } catch (error) {
                          console.error('Erreur lors du téléchargement:', error);
                          toast.error('Une erreur est survenue lors du téléchargement');
                        }
                      }}
                      disabled={downloadingFile === request._id}
                    >
                      {downloadingFile === request._id ? (
                        <>
                          <span className={styles.spinner}></span>
                          Téléchargement...
                        </>
                      ) : (
                        request.downloadedAt 
                          ? `Téléchargé le ${new Date(request.downloadedAt).toLocaleDateString('fr-FR')}`
                          : 'Télécharger le livre'
                      )}
                    </button>
                  )}
                </div>
                <div className={styles.requestFooter}>
                  <span className={styles.requestDate}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    {new Date(request.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                    {request.downloadedAt && (
                      <span style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        {new Date(request.downloadedAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;