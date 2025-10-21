import React, { useEffect, useState } from 'react';
import axiosAdmin from '../../axiosAdmin';
import styles from './AdminPage.module.css';
import { toast } from 'react-toastify';
import PushoverConfig from '../../components/admin/PushoverConfig';
import UserManagement from '../../components/admin/UserManagement';
import StatsDashboard from '../../components/admin/StatsDashboard';
import BestsellerManagement from '../../components/admin/BestsellerManagement';

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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingRequest, setDeletingRequest] = useState(null);
  const [editingDownloadLink, setEditingDownloadLink] = useState(null);
  const [downloadLink, setDownloadLink] = useState('');
  const [file, setFile] = useState(null);
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

  const handleSaveDownloadLink = async (id, link, fileToUpload) => {
    try {
      const formData = new FormData();
      
      if (fileToUpload) {
        setUploadingFile(true);
        setUploadProgress(0);
        formData.append('file', fileToUpload);
      } else if (link) {
        formData.append('downloadLink', link);
      } else {
        throw new Error('Un fichier ou un lien est requis');
      }
      
      await axiosAdmin.patch(`/api/requests/${id}/download-link`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (fileToUpload) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      });
      
      setFile(null);
      setDownloadLink('');
      setEditingDownloadLink(null);
      setUploadingFile(false);
      setUploadProgress(0);
      await fetchRequests();
      
      // Ajouter un petit délai pour s'assurer que tout est bien chargé
      setTimeout(() => {
        toast.success('Fichier téléversé avec succès !', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          className: styles.toastSuccess
        });
      }, 500);
    } catch (error) {
      console.error('Error saving download link:', error);
      setUploadingFile(false);
      setUploadProgress(0);
      toast.error(error.response?.data?.error || 'Erreur lors de la sauvegarde du téléchargement');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Vérifier la taille du fichier (max 500MB)
      if (selectedFile.size > 500 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 500MB)');
        return;
      }
      
      // Vérifier l'extension du fichier
      const validExtensions = [
        // Ebooks
        'pdf', 'epub', 'mobi', 'azw', 'azw3', 'kfx',
        // Archives pour BD/Comics
        'cbz', 'cbr', 'cb7', 'cbt', 'cba', 'djvu',
        // Documents
        'doc', 'docx', 'txt', 'rtf', 'odt',
        // Images pour BD/Comics
        'jpg', 'jpeg', 'png', 'webp', 'gif'
      ];
      
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      
      if (!validExtensions.includes(fileExt)) {
        toast.error(
          'Format de fichier non supporté. ' +
          'Formats acceptés: ' +
          'PDF, EPUB, MOBI, AZW, AZW3, KFX, ' +
          'CBZ, CBR, CB7, CBT, CBA, DJVU, ' +
          'DOC, DOCX, TXT, RTF, ODT, ' +
          'JPG, JPEG, PNG, WEBP, GIF'
        );
        return;
      }
      
      setFile(selectedFile);
      setDownloadLink('');
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'stats':
        return <StatsDashboard />;
      case 'pushover':
        return <PushoverConfig />;
      case 'users':
        return <UserManagement />;
      case 'bestsellers':
        return <BestsellerManagement />;
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
                className={`${styles.filterButton} ${filter === 'reported' ? styles.active : ''}`}
                onClick={() => setFilter('reported')}
              >
                Signalements
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

  const getFileType = (filename) => {
    if (!filename) return '';
    const ext = filename.split('.').pop().toLowerCase();
    return ext.toUpperCase();
  };

  const renderRequestsList = () => {
    const filteredRequests = requests.filter(request => {
      if (filter === 'all') return true;
      return request.status === filter;
    });
    
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
                        request.status === 'canceled' ? styles.canceled :
                        request.status === 'reported' ? styles.reported : ''
                      }`}
                    >
                      {
                        request.status === 'pending' ? 'En attente' :
                        request.status === 'completed' ? 'Complétée' :
                        request.status === 'reported' ? 'Signalée' :
                        request.cancelReason ? `Annulée : ${request.cancelReason}` : 'Annulée'
                      }
                    </div>
                    {request.status === 'reported' && request.reportReason && (
                      <div className={styles.reportSection}>
                        <div className={styles.reportLabel}>⚠️ Problème signalé :</div>
                        <div className={styles.reportReason}>{request.reportReason}</div>
                        <div className={styles.reportDate}>
                          Signalé le {new Date(request.reportedAt).toLocaleDateString()} à {new Date(request.reportedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={styles.cardFooter}>
                  <div className={styles.statusActions}>
                    {(request.downloadLink || request.filePath) && (
                      <div className={styles.downloadLinkSection}>
                        {request.filePath ? (
                          <a
                            href="#"
                            onClick={async (e) => {
                              e.preventDefault();
                              try {
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
                                const fileNameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^;\n"]*)['"]?;?/i) || 
                                                   contentDisposition.match(/filename=['"]([^'"]+)['"]/i);
                                
                                if (fileNameMatch && fileNameMatch[1]) {
                                  // Décoder le nom de fichier encodé en URI
                                  fileName = decodeURIComponent(fileNameMatch[1].trim());
                                } else {
                                  // Utiliser le nom du fichier depuis le chemin si disponible
                                  fileName = request.filePath ? request.filePath.split('/').pop() : 'livre.epub';
                                }
                                
                                link.setAttribute('download', fileName);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                window.URL.revokeObjectURL(url);
                              } catch (error) {
                                console.error('Erreur lors du téléchargement:', error);
                                toast.error('Erreur lors du téléchargement du fichier');
                              }
                            }}
                            className={styles.downloadLink}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Télécharger le fichier ({getFileType(request.filePath)})
                          </a>
                        ) : (
                          <a
                            href={request.downloadLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.downloadLink}
                          >
                            Lien de téléchargement
                          </a>
                        )}
                        
                        <div className={styles.downloadLinkActions}>
                          <button
                            className={`${styles.actionButton} ${styles.copyLinkButton}`}
                            onClick={() => {
                              const link = request.filePath 
                                ? `${window.location.origin}/api/requests/download/${request._id}`
                                : request.downloadLink;
                              navigator.clipboard.writeText(link);
                              toast.success('Lien copié dans le presse-papier');
                            }}
                            title="Copier le lien de téléchargement"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copier le lien</span>
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.editLinkButton}`}
                            onClick={() => {
                              setEditingDownloadLink(request._id);
                              setDownloadLink(request.downloadLink || '');
                              setFile(null);
                            }}
                            title="Modifier le téléchargement"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>Modifier</span>
                          </button>
                        </div>
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
                              setFile(null);
                            }}
                          >
                            Ajouter le fichier
                          </button>
                          <button
                            className={`${styles.button} ${styles.secondary}`}
                            onClick={() => setCancelingRequest(request._id)}
                            disabled={updatingStatus === request._id}
                          >
                            Annuler
                          </button>
                        </>
                      ) : request.status === 'reported' ? (
                        <>
                          <button
                            className={`${styles.button} ${styles.primary}`}
                            onClick={() => handleUpdateStatus(request._id, 'completed')}
                            disabled={updatingStatus === request._id}
                            title="Marquer comme résolu et remettre en statut complété"
                          >
                            {updatingStatus === request._id ? '...' : 'Résolu - Compléter'}
                          </button>
                          <button
                            className={`${styles.button} ${styles.warning}`}
                            onClick={() => handleUpdateStatus(request._id, 'pending')}
                            disabled={updatingStatus === request._id}
                            title="Remettre la demande en attente pour correction"
                          >
                            {updatingStatus === request._id ? '...' : 'Repasser en attente'}
                          </button>
                          <button
                            className={`${styles.button} ${styles.secondary}`}
                            onClick={() => {
                              setEditingDownloadLink(request._id);
                              setDownloadLink(request.downloadLink || '');
                              setFile(null);
                            }}
                            title="Modifier le fichier téléchargeable"
                          >
                            Modifier le fichier
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
                        <div className={styles.uploadSection}>
                          <label className={styles.fileInputLabel}>
                            <input
                              type="file"
                              onChange={handleFileChange}
                              accept=".pdf,.epub,.mobi,.azw,.azw3,.kfx,.cbz,.cbr,.cb7,.cbt,.cba,.djvu"
                              className={styles.fileInput}
                            />
                            <span className={styles.fileInputButton}>
                              {file ? file.name : 'Choisir un fichier'}
                            </span>
                          </label>
                          <div className={styles.fileInfo}>
                            {file && (
                              <span className={styles.fileType}>
                                {getFileType(file.name)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className={styles.orDivider}>
                          <span>OU</span>
                        </div>
                        
                        <input
                          type="text"
                          value={downloadLink}
                          placeholder="Ou entrez un lien de téléchargement"
                          onChange={(e) => {
                            setDownloadLink(e.target.value);
                            setFile(null);
                          }}
                          className={styles.downloadLinkInput}
                        />
                        
                        <div className={styles.downloadLinkButtons}>
                          <div className={styles.uploadContainer}>
                            <button 
                              className={`${styles.button} ${styles.primary}`}
                              onClick={() => handleSaveDownloadLink(request._id, downloadLink, file)}
                              disabled={(!downloadLink && !file) || uploadingFile}
                            >
                              {uploadingFile ? (
                                <>
                                  <span className={styles.spinner}></span>
                                  {uploadProgress}%
                                </>
                              ) : (
                                'Enregistrer'
                              )}
                            </button>
                            {uploadingFile && (
                              <div className={styles.progressBarContainer}>
                                <div 
                                  className={styles.progressBar}
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                          <button
                            className={`${styles.button} ${styles.secondaryButton}`}
                            onClick={() => {
                              setEditingDownloadLink(null);
                              setFile(null);
                              setDownloadLink('');
                            }}
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
          className={`${styles.tabButton} ${activeTab === 'bestsellers' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('bestsellers')}
        >
          Bestsellers
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