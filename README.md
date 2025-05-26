# img_frontend_ebookrequest_docker

[![Docker Image Size](https://badgen.net/docker/size/zlimteck/ebookrequest-frontend?icon=docker&label=image%20size)](https://hub.docker.com/r/zlimteck/ebookrequest-frontend/)
[![Docker Pulls](https://badgen.net/docker/pulls/zlimteck/ebookrequest-frontend?icon=docker&label=pulls)](https://hub.docker.com/r/zlimteck/ebookrequest-frontend/)
[![Docker Stars](https://badgen.net/docker/stars/zlimteck/ebookrequest-frontend?icon=docker&label=stars)](https://hub.docker.com/r/zlimteck/ebookrequest-frontend/)

![image](https://zupimages.net/up/25/20/wdmb.png)

Frontend for EbookRequest web app

## 🐳 Docker Compose:
```bash
services:
  frontend:
    image: zlimteck/ebookrequest-backend:latest
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
