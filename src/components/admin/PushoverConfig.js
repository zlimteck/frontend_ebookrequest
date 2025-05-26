import React, { useState, useEffect } from 'react';
import axiosAdmin from '../../axiosAdmin';
import styles from './PushoverConfig.module.css';

const PushoverConfig = () => {
  const [config, setConfig] = useState({
    enabled: false,
    userKey: '',
    apiToken: '',
    notifyOnNewRequest: true
  });
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Récupération de la configuration Pushover
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axiosAdmin.get('/api/pushover/config');
        setConfig(prev => ({
          ...prev,
          ...response.data,
          userKey: response.data?.userKey || '',
          apiToken: response.data?.apiToken || ''
        }));
      } catch (error) {
        console.error('Erreur lors du chargement de la configuration Pushover:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Gestion des changements dans le formulaire
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);

    try {
      await axiosAdmin.put('/api/pushover/config', config);
      setTestResult({ type: 'success', message: 'Configuration enregistrée avec succès !' });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration Pushover:', error);
      setTestResult({ 
        type: 'error', 
        message: error.response?.data?.message || 'Erreur lors de la sauvegarde de la configuration' 
      });
    } finally {
      setSaving(false);
    }
  };

  // Test de la configuration Pushover
  const handleTest = async () => {
    if (!config.enabled || !config.userKey || !config.apiToken) {
      setTestResult({ 
        type: 'error', 
        message: 'Veuillez activer et configurer Pushover avant de tester' 
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await axiosAdmin.post('/api/pushover/test');
      setTestResult({ 
        type: 'success', 
        message: response.data.message || 'Notification de test envoyée avec succès !' 
      });
    } catch (error) {
      console.error('Erreur lors du test de la notification Pushover:', error);
      setTestResult({ 
        type: 'error', 
        message: error.response?.data?.message || 'Erreur lors de l\'envoi de la notification de test' 
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div>Chargement de la configuration Pushover...</div>;
  }

  return (
    <div className={styles.pushoverConfig}>
      <h2>Configuration des notifications Pushover</h2>
      <p className={styles.description}>
        Configurez les notifications Pushover pour recevoir des alertes sur votre appareil mobile.
        Vous devez d'abord créer une application sur le site de Pushover et utiliser les identifiants fournis.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={`${styles.formGroup} ${styles.switchGroup}`}>
          <label htmlFor="enabled">Activer les notifications Pushover</label>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
            <label className={styles.switch}>
              <input
                type="checkbox"
                id="enabled"
                name="enabled"
                checked={config.enabled}
                onChange={handleChange}
              />
              <span className={styles.slider}></span>
            </label>
            <span style={{ marginLeft: '0.75rem', color: 'var(--color-text)' }}>
              {config.enabled ? 'Activé' : 'Désactivé'}
            </span>
          </div>
        </div>

        {config.enabled && (
          <>
            <div className={styles.formGroup}>
              <label htmlFor="userKey">Clé utilisateur Pushover</label>
              <input
                type="text"
                id="userKey"
                name="userKey"
                value={config.userKey}
                onChange={handleChange}
                className={styles.input}
                placeholder="Entrez votre clé utilisateur Pushover"
              />
              <p className={styles.helpText}>
                Vous pouvez trouver votre clé utilisateur sur la page de votre tableau de bord Pushover.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="apiToken">Jeton API de l'application</label>
              <input
                type="password"
                id="apiToken"
                name="apiToken"
                value={config.apiToken}
                onChange={handleChange}
                className={styles.input}
                placeholder="Entrez le jeton API de votre application Pushover"
              />
              <p className={styles.helpText}>
                Créez une application sur le site de Pushover et entrez le jeton API ici.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="notifyOnNewRequest">Notifier les nouvelles demandes</label>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    id="notifyOnNewRequest"
                    name="notifyOnNewRequest"
                    checked={config.notifyOnNewRequest}
                    onChange={handleChange}
                  />
                  <span className={styles.slider}></span>
                </label>
                <span style={{ marginLeft: '0.75rem', color: 'var(--color-text)' }}>
                  {config.notifyOnNewRequest ? 'Activé' : 'Désactivé'}
                </span>
              </div>
              <p className={styles.helpText}>
                Activez cette option pour recevoir une notification à chaque nouvelle demande de livre.
              </p>
            </div>
          </>
        )}

        <div className={styles.buttons}>
          <button
            type="submit"
            className={`${styles.button} ${styles.primaryButton}`}
            disabled={saving}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>

          {config.enabled && config.userKey && config.apiToken && (
            <button
              type="button"
              className={`${styles.button} ${styles.testButton}`}
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? 'Envoi en cours...' : 'Tester la notification'}
            </button>
          )}
        </div>

        {testResult && (
          <div className={`${styles.alert} ${testResult.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
            {testResult.message}
          </div>
        )}
      </form>
      {!config.enabled && (
        <div className={styles.infoBox}>
          <h3>Comment configurer Pushover ?</h3>
          <ol>
            <li>Téléchargez l'application Pushover sur votre appareil mobile ou ordinateur</li>
            <li>Créez un compte sur <a href="https://pushover.net/" target="_blank" rel="noopener noreferrer">pushover.net</a></li>
            <li>Créez une nouvelle application dans la section "Your Applications"</li>
            <li>Copiez votre clé utilisateur et le jeton API de votre application</li>
            <li>Activez les notifications ci-dessus et enregistrez vos identifiants</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default PushoverConfig;