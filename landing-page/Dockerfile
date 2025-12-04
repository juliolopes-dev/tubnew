FROM nginx:alpine

# Copiar arquivos da landing page
COPY . /usr/share/nginx/html

# Criar pasta de downloads
RUN mkdir -p /usr/share/nginx/html/downloads

# Configuração do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
