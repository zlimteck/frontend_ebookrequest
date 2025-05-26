#!/bin/sh

# Remplacer la variable dans env.js
sed -i "s|DEFAULT_API_URL|${REACT_APP_API_URL:-http://localhost:5001}|g" /usr/share/nginx/html/env.js

# Démarrer nginx
exec nginx -g 'daemon off;'