# TubNew - Baixador de Vídeos

Aplicação desktop para baixar vídeos do YouTube e Reels do Instagram.

## 📁 Estrutura do Projeto

```
TubNew/
├── desktop-app/          # Aplicação Electron
│   ├── src/
│   │   ├── index.html    # Interface
│   │   ├── styles.css    # Estilos
│   │   ├── renderer.js   # Lógica frontend
│   │   ├── main.js       # Processo principal
│   │   └── preload.js    # Bridge de segurança
│   ├── bin/              # yt-dlp e ffmpeg
│   ├── dist/             # Executável gerado
│   └── package.json
│
├── landing-page/         # Site para download
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   ├── downloads/        # Pasta com o .exe
│   ├── Dockerfile
│   └── nginx.conf
│
└── docker-compose.yml    # Deploy EasyPanel
```

## 🚀 Configuração do Desktop App

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### 1. Instalar dependências

```bash
cd desktop-app
npm install
```

### 2. Baixar yt-dlp e ffmpeg

Baixe os executáveis e coloque na pasta `bin/`:

- **yt-dlp.exe**: https://github.com/yt-dlp/yt-dlp/releases
- **ffmpeg.exe** e **ffprobe.exe**: https://github.com/BtbN/FFmpeg-Builds/releases

```
desktop-app/
└── bin/
    ├── yt-dlp.exe
    ├── ffmpeg.exe
    └── ffprobe.exe
```

### 3. Executar em desenvolvimento

```bash
npm start
```

### 4. Gerar executável (.exe)

```bash
npm run build
```

O instalador será gerado em `desktop-app/dist/`

## 🌐 Deploy da Landing Page (EasyPanel)

### Opção 1: Docker Compose

```bash
docker-compose up -d
```

### Opção 2: EasyPanel

1. Acesse seu EasyPanel
2. Crie um novo serviço
3. Selecione "Docker" ou "Git"
4. Configure:
   - **Build Path**: `./landing-page`
   - **Port**: `80`
5. Faça upload do `.exe` para `landing-page/downloads/TubNew-Setup.exe`

### Configurar domínio

No EasyPanel, configure o domínio desejado e habilite HTTPS.

## 📦 Arquivos de Download

Após gerar o `.exe`, copie para:

```
landing-page/downloads/TubNew-Setup.exe
```

O botão de download na landing page apontará para este arquivo.

## 🔧 Personalização

### Ícone do aplicativo

Substitua o arquivo em `desktop-app/src/assets/icon.ico` (256x256 pixels).

### Cores e estilos

Edite as variáveis CSS em:
- `desktop-app/src/styles.css`
- `landing-page/styles.css`

```css
:root {
  --accent-primary: #e94560;
  --accent-secondary: #ff6b6b;
}
```

## 📝 Licença

MIT License
