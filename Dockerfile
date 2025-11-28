FROM node:18-alpine

# Instalar dependências do sistema necessárias para yt-dlp e python
RUN apk add --no-cache python3 py3-pip ffmpeg

# Criar link simbólico para python
RUN ln -sf python3 /usr/bin/python

# Instalar yt-dlp
RUN pip3 install yt-dlp --break-system-packages

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências do Node.js
RUN npm install --production

# Copiar código fonte
COPY . .

# Criar diretório de downloads
RUN mkdir -p downloads && chmod 777 downloads

# Expor porta
EXPOSE 5000

# Comando inicial
CMD ["node", "server-landing.js"]
