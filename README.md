# Frontend for EbookRequest

[![Docker Image Size](https://badgen.net/docker/size/zlimteck/ebookrequest-frontend?icon=docker&label=image%20size)](https://hub.docker.com/r/zlimteck/ebookrequest-frontend/)
[![Docker Pulls](https://badgen.net/docker/pulls/zlimteck/ebookrequest-frontend?icon=docker&label=pulls)](https://hub.docker.com/r/zlimteck/ebookrequest-frontend/)
[![Docker Stars](https://badgen.net/docker/stars/zlimteck/ebookrequest-frontend?icon=docker&label=stars)](https://hub.docker.com/r/zlimteck/ebookrequest-frontend/)
[![Docker Build & Push](https://github.com/zlimteck/frontend_ebookrequest/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/zlimteck/frontend_ebookrequest/actions/workflows/docker-publish.yml)

![EbookRequest Logo](https://zupimages.net/up/25/20/wdmb.png)

A modern and responsive frontend for managing book requests, built with **React**.  
Easily connects to your backend API for a seamless user experience.

---

## Features

- ✅ **Responsive layout** for all screen sizes  
- ✅ **Clean and intuitive user interface**  
- ✅ **Easy integration** with EbookRequest backend  
- ✅ **Docker-ready** for hassle-free deployment

## Technologies

- **React**
- **Tailwind CSS**
- **Docker**

---

## How to Run

### Using Docker Compose:

Here’s a minimal Docker Compose setup to get started quickly:

```yaml
services:
  frontend:
    image: zlimteck/ebookrequest-frontend:latest
    ports:
      - "3034:80"
    restart: always
    environment:
      - REACT_APP_API_URL=YOUR_API_URL_OR_IP:PORT_BACKEND
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Replace the following:

YOUR_API_URL_OR_IP:PORT_BACKEND ➡️ The address of your backend server (e.g., http://localhost:5000 or your server IP).

---