import React, { useState, useEffect } from 'react';
import axiosAdmin from '../../axiosAdmin';
import styles from '../user/UserForm.module.css';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { REACT_APP_API_URL } from '../../config';

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const verifyToken = searchParams.get('verify');
  
  // Si un token de vérification est présent dans l'URL, on le sauvegarde
  useEffect(() => {
    if (verifyToken && verifyToken !== 'undefined') {
      localStorage.setItem('pendingEmailVerification', verifyToken);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      toast.info('Veuillez vous connecter pour finaliser la vérification de votre email');
    }
  }, [verifyToken]);

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const { isAuthenticated, user } = await checkAuth();
        if (isAuthenticated && user) {
          const urlParams = new URLSearchParams(window.location.search);
          const verifyToken = urlParams.get('verify');
          if (verifyToken) {
            localStorage.setItem('pendingEmailVerification', verifyToken);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          const pendingVerification = localStorage.getItem('pendingEmailVerification');
          if (pendingVerification) {  
            const redirectUrl = `/verify-email/${pendingVerification}`;
            localStorage.removeItem('pendingEmailVerification');
            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 100);
            return;
          }
          const redirectPath = user.role === 'admin' ? '/admin' : '/dashboard';
          navigate(redirectPath);
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          const verifyToken = urlParams.get('verify');
          if (verifyToken) {
            localStorage.setItem('pendingEmailVerification', verifyToken);
            window.history.replaceState({}, document.title, window.location.pathname);
            toast.info('Veuillez vous connecter pour finaliser la vérification de votre email');
          }
        }
      } catch (error) {
        // Erreur silencieuse
      } finally {
        setIsLoading(false);
      }
    };
    
    // Délai pour s'assurer que le composant est bien monté
    const timer = setTimeout(() => {
      verifyAuth().catch(err => {
        console.error('Erreur non gérée dans verifyAuth:', err);
      });
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [navigate]);

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    try {
const res = await axiosAdmin.post('/api/auth/login', 
        form,
        { validateStatus: status => status < 500 }
      );
      
      if (res.data.token) {
        // Sauvegarder le token et les infos utilisateur
        const userToken = res.data.token;
        const userData = res.data.user || {};
        localStorage.setItem('token', userToken);
        if (userData.role) localStorage.setItem('role', userData.role);
        if (userData.username) localStorage.setItem('username', userData.username);
        const pendingVerification = localStorage.getItem('pendingEmailVerification');
        if (pendingVerification) {
          const verifyUrl = `/verify-email/${pendingVerification}`;
          localStorage.removeItem('pendingEmailVerification');
          setTimeout(() => {
            window.location.href = verifyUrl;
          }, 100);
          return;
        } else {
          const redirectPath = userData.role === 'admin' ? '/admin' : '/dashboard';
          setTimeout(() => {
            window.location.href = redirectPath;
          }, 50);
        }
      } else {
        const errorMsg = res.data.message || 'Aucun token reçu du serveur';
        throw new Error(errorMsg);
      }
    } catch (error) {
      
      let errorMessage = 'Échec de la connexion';
      if (error.response) {
        // Erreur avec réponse du serveur
        if (error.response.status === 401) {
          errorMessage = 'Identifiants incorrects. Veuillez réessayer.';
        } else if (error.response.status === 403) {
          errorMessage = 'Accès refusé. Votre compte peut être désactivé.';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = `Erreur serveur (${error.response.status})`;
        }
      } else if (error.request) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
      } else {

        errorMessage = 'Erreur de configuration de la connexion';
      }
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className={`${styles.formContainer} ${styles.loginFormContainer}`}>
      <div className={styles.logoContainer}>
        <img 
          src="/img/logo.png" 
          alt="Logo" 
          className={styles.logo}
        />
      </div>
      <h2 className={styles.title}>Connexion</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input className={styles.input} name="username" placeholder="Nom d'utilisateur" value={form.username} onChange={handleChange} required />
        <input className={styles.input} name="password" type="password" placeholder="Mot de passe" value={form.password} onChange={handleChange} required />
        <button className={styles.button} type="submit">Se connecter</button>
      </form>
      {message && <div className={styles.message}>{message}</div>}
    </div>
  );
}

export default Login;