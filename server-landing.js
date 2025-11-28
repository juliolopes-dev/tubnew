import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Servir arquivos estáticos
app.use(express.static('public'));

// Rota principal - landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Rota de download do desktop
app.get('/download/tubnew-desktop.zip', (req, res) => {
    const file = path.join(__dirname, 'desktop-dist', 'tubnew-desktop.zip');
    res.download(file, 'tubnew-desktop.zip', (err) => {
        if (err) {
            console.error('Erro ao fazer download:', err);
            res.status(404).send('Arquivo não encontrado. Por favor, aguarde a preparação do pacote.');
        }
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Landing page rodando em http://localhost:${PORT}`);
});
