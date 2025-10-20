import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axiosAdmin from '../axiosAdmin';
import styles from './UserSettings.module.css';

const UserSettings = () => {
  const [user, setUser] = useState({
    email: '',
    username: '',
    notificationPreferences: {
      email: { enabled: false },
      push: { enabled: true }
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // États pour le changement de mot de passe
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [previousPasswords, setPreviousPasswords] = useState([]);

  // Charger les données de l'utilisateur
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axiosAdmin.get('/api/users/me');
        if (response.data.success) {
          setUser(prev => ({
            ...prev,
            ...response.data.user,
            notificationPreferences: {
              email: {
                enabled: response.data.user.notificationPreferences?.email?.enabled || false
              },
              push: {
                enabled: response.data.user.notificationPreferences?.push?.enabled !== false
              }
            }
          }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        toast.error('Erreur lors du chargement de votre profil');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.match(/[a-z]+/)) strength += 1;
    if (password.match(/[A-Z]+/)) strength += 1;
    if (password.match(/[0-9]+/)) strength += 1;
    if (password.match(/[!@#$%^&*(),.?":{}|<>]+/)) strength += 1;
    return strength;
  };
  
  const isPasswordUsedBefore = (password) => {
    return false;
  };

  // Gestion des changements du formulaire de mot de passe
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    
    // Mettre à jour l'état avec la nouvelle valeur
    setPasswordData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      if (name === 'newPassword') {
        const strength = checkPasswordStrength(value);
        setPasswordStrength(strength);
        
        if (value && isPasswordUsedBefore(value)) {
          setPasswordErrors(prev => ({
            ...prev,
            newPassword: 'Ce mot de passe a déjà été utilisé. Veuillez en choisir un autre.'
          }));
        } else {
          setPasswordErrors(prev => ({
            ...prev,
            newPassword: ''
          }));
        }
      }
      
      // Vérifier la correspondance des mots de passe
      if ((name === 'newPassword' || name === 'confirmPassword') && newData.newPassword && newData.confirmPassword) {
        if (newData.newPassword !== newData.confirmPassword) {
          setPasswordErrors(prev => ({
            ...prev,
            confirmPassword: 'Les mots de passe ne correspondent pas.'
          }));
        } else {
          setPasswordErrors(prev => ({
            ...prev,
            confirmPassword: ''
          }));
        }
      }
      
      return newData;
    });
  };

  // Soumettre le changement de mot de passe
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    const errors = {};
    if (!passwordData.currentPassword) errors.currentPassword = 'Le mot de passe actuel est requis';
    if (!passwordData.newPassword) {
      errors.newPassword = 'Le nouveau mot de passe est requis';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères';
    } else if (passwordStrength < 3) {
      errors.newPassword = 'Le mot de passe est trop faible. Utilisez des majuscules, des chiffres et des caractères spéciaux.';
    } else if (isPasswordUsedBefore(passwordData.newPassword)) {
      errors.newPassword = 'Ce mot de passe a déjà été utilisé. Veuillez en choisir un autre.';
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    
    try {
      setIsSaving(true);
      const response = await axiosAdmin.put('/api/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.data.success) {
        toast.success('Mot de passe mis à jour avec succès');
        setShowChangePassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setPasswordErrors({});
        
        // Réinitialiser l'état du formulaire
        setPreviousPasswords([]);
      }
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      const errorMessage = error.response?.data?.error || 'Une erreur est survenue lors du changement de mot de passe';
      toast.error(errorMessage);
      
      if (error.response?.data?.field) {
        setPasswordErrors(prev => ({
          ...prev,
          [error.response.data.field]: error.response.data.error
        }));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Gestion des changements des inputs
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('notificationPreferences.')) {
      const [prefType, prefKey, subKey] = name.split('.');
      setUser(prev => ({
        ...prev,
        [prefType]: {
          ...prev[prefType],
          [prefKey]: {
            ...prev[prefType]?.[prefKey],
            [subKey]: type === 'checkbox' ? checked : value
          }
        }
      }));
    } else {
      setUser(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };
  // Gestion de la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const response = await axiosAdmin.put('/api/users/profile', {
        email: user.email,
        notificationPreferences: user.notificationPreferences
      });
      
      if (response.data.success) {
        toast.success('Paramètres mis à jour avec succès');
        if (response.data.user.email !== user.email) {
          toast.info('Un email de vérification a été envoyé à votre nouvelle adresse email');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors de la mise à jour des paramètres';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Chargement de vos paramètres...</p>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      <h1>Paramètres du compte</h1>
      
      <form onSubmit={handleSubmit} className={styles.settingsForm}>
        <div className={styles.formGroup}>
          <label htmlFor="username">Nom d'utilisateur</label>
          <input
            type="text"
            id="username"
            name="username"
            value={user.username}
            disabled
            className={styles.formControl}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="email">Adresse email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={user.email || ''}
            onChange={handleInputChange}
            className={styles.formControl}
            placeholder="Votre adresse email"
          />
          {user.email && !user.emailVerified && (
            <p className={styles.verificationStatus}>
              <span className={styles.warningIcon}>⚠️</span> Email non vérifié. Vérifiez votre boîte mail.
            </p>
          )}
          {user.email && user.emailVerified && (
            <p className={`${styles.verificationStatus} ${styles.verified}`}>
              <span className={styles.successIcon}>✓</span> Email vérifié
            </p>
          )}
        </div>
        
        <div className={styles.preferencesSection}>
          <h2>Préférences de notification</h2>
          
          <div className={styles.preferenceGroup}>
            <h3>Notifications par email</h3>
            <div className={styles.checkboxGroup}>
              <div className={styles.switchContainer}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    name="notificationPreferences.email.enabled"
                    checked={user.notificationPreferences.email.enabled}
                    onChange={handleInputChange}
                  />
                  <span className={styles.slider}></span>
                </label>
                <span className={styles.switchLabel}>
                  Recevoir une notification quand un livre est prêt
                </span>
              </div>
            </div>
          </div>
          
          <div className={styles.preferenceGroup}>
            <h3>Notifications sur le site</h3>
            <div className={styles.checkboxGroup}>
              <div className={styles.switchContainer}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    name="notificationPreferences.push.enabled"
                    checked={user.notificationPreferences.push.enabled}
                    onChange={handleInputChange}
                  />
                  <span className={styles.slider}></span>
                </label>
                <span className={styles.switchLabel}>
                  {user.notificationPreferences.push.enabled ? 'Activé' : 'Désactivé'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.formActions}>
          <button 
            type="submit" 
            className={styles.saveButton}
            disabled={isSaving}
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
          
          <button 
            type="button" 
            className={styles.secondaryButton}
            onClick={() => setShowChangePassword(!showChangePassword)}
          >
            {showChangePassword ? 'Annuler' : 'Changer de mot de passe'}
          </button>
        </div>
        
        {showChangePassword && (
          <div className={styles.passwordChangeForm}>
            <h3>Changer de mot de passe</h3>
            <p className={styles.formHint}>
              Pour des raisons de sécurité, utilisez un mot de passe fort et unique que vous n'utilisez pas pour d'autres comptes.
            </p>
            
            <div className={styles.formGroup}>
              <label htmlFor="currentPassword">Mot de passe actuel</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className={`${styles.formControl} ${passwordErrors.currentPassword ? styles.inputError : ''}`}
                placeholder="Entrez votre mot de passe actuel"
              />
              {passwordErrors.currentPassword && (
                <p className={styles.errorText}>{passwordErrors.currentPassword}</p>
              )}
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="newPassword">Nouveau mot de passe</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className={`${styles.formControl} ${passwordErrors.newPassword ? styles.inputError : ''}`}
                placeholder="Créez un nouveau mot de passe"
              />
              {passwordData.newPassword && (
                <div className={styles.passwordStrength}>
                  <div 
                    className={`${styles.strengthBar} ${
                      passwordStrength < 2 ? styles.weak : 
                      passwordStrength < 4 ? styles.medium : 
                      styles.strong
                    }`} 
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  />
                  <span className={styles.strengthText}>
                    {passwordStrength < 2 ? 'Faible' : 
                     passwordStrength < 4 ? 'Moyen' : 'Fort'}
                  </span>
                </div>
              )}
              {passwordErrors.newPassword && (
                <p className={styles.errorText}>{passwordErrors.newPassword}</p>
              )}
              <p className={styles.hintText}>
                Le mot de passe doit contenir au moins 8 caractères, dont des majuscules, des chiffres et des caractères spéciaux.
              </p>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className={`${styles.formControl} ${passwordErrors.confirmPassword ? styles.inputError : ''}`}
                placeholder="Confirmez votre nouveau mot de passe"
              />
              {passwordErrors.confirmPassword && (
                <p className={styles.errorText}>{passwordErrors.confirmPassword}</p>
              )}
            </div>
            
            <div className={styles.formActions}>
              <button 
                type="button" 
                className={styles.saveButton}
                onClick={handlePasswordSubmit}
                disabled={isSaving}
              >
                {isSaving ? 'Enregistrement...' : 'Mettre à jour le mot de passe'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default UserSettings;