import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Diretório para downloads temporários
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

// Criar diretório de downloads se não existir
async function ensureDownloadsDir() {
    try {
        await fs.access(DOWNLOADS_DIR);
    } catch {
        await fs.mkdir(DOWNLOADS_DIR, { recursive: true });
    }
}

// Verificar se yt-dlp está instalado
async function checkYtDlp() {
    try {
        await execAsync('yt-dlp --version');
        return true;
    } catch {
        return false;
    }
}

// Obter informações do vídeo
app.post('/api/video-info', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL é obrigatória' });
        }

        const hasYtDlp = await checkYtDlp();
        if (!hasYtDlp) {
            return res.status(500).json({
                error: 'yt-dlp não está instalado. Por favor, instale usando: pip install yt-dlp'
            });
        }

        console.log(`Buscando informações para: ${url}`);

        // Obter informações do vídeo usando cliente Android para evitar bloqueios
        const { stdout } = await execAsync(
            `yt-dlp --dump-json --no-playlist --extractor-args "youtube:player_client=ios" "${url}"`
        );

        const videoInfo = JSON.parse(stdout);

        // Extrair formatos disponíveis
        const formats = videoInfo.formats
            .filter(f => f.ext === 'mp4' && f.vcodec !== 'none')
            .map(f => ({
                formatId: f.format_id,
                quality: f.format_note || f.resolution || 'unknown',
                filesize: f.filesize,
                ext: f.ext,
                resolution: f.resolution
            }))
            .sort((a, b) => {
                const resA = parseInt(a.resolution) || 0;
                const resB = parseInt(b.resolution) || 0;
                return resB - resA;
            });

        res.json({
            title: videoInfo.title,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.duration,
            uploader: videoInfo.uploader,
            formats: formats.slice(0, 10) // Top 10 formatos
        });

    } catch (error) {
        console.error('❌ Erro detalhado ao obter informações:', error);

        // Tentar extrair mensagem de erro útil do stderr
        const errorMessage = error.stderr || error.message;

        res.status(500).json({
            error: 'Erro ao processar vídeo. Verifique se a URL é válida e pública.',
            details: errorMessage
        });
    }
});

// Download de vídeo
app.post('/api/download', async (req, res) => {
    try {
        const { url, format } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL é obrigatória' });
        }

        await ensureDownloadsDir();

        const hasYtDlp = await checkYtDlp();
        if (!hasYtDlp) {
            return res.status(500).json({
                error: 'yt-dlp não está instalado. Por favor, instale usando: pip install yt-dlp'
            });
        }

        // Template para nome do arquivo
        const outputTemplate = path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s');

        // Comando base com cliente Android e restrição de caracteres no nome do arquivo
        let command = `yt-dlp --no-playlist --restrict-filenames --extractor-args "youtube:player_client=ios" -o "${outputTemplate}"`;

        // Adicionar formato específico se fornecido
        if (format && format !== 'best') {
            command += ` -f ${format}`;
        } else {
            // Melhor qualidade: vídeo + áudio
            command += ` -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"`;
        }

        command += ` "${url}"`;

        console.log('Executando comando de download:', command);

        // Executar download
        const { stdout } = await execAsync(command, {
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });

        console.log('Output do download:', stdout);

        // Extrair nome do arquivo baixado
        let filename = null;
        const match = stdout.match(/\[download\] Destination: (.+)/);
        if (match) {
            filename = path.basename(match[1]);
        }

        // Se não achou "Destination", tenta achar "has already been downloaded"
        if (!filename) {
            const matchExisting = stdout.match(/\[download\] (.+) has already been downloaded/);
            if (matchExisting) {
                filename = path.basename(matchExisting[1]);
            }
        }

        // Fallback: Se o regex falhar, listar arquivos na pasta e pegar o mais recente
        if (!filename) {
            console.warn('Regex falhou. Tentando encontrar arquivo mais recente...');
            try {
                const files = await fs.readdir(DOWNLOADS_DIR);
                // Filtrar apenas arquivos de vídeo/áudio e ordenar por data de modificação
                const recentFiles = await Promise.all(files.map(async file => {
                    const stat = await fs.stat(path.join(DOWNLOADS_DIR, file));
                    return { file, mtime: stat.mtime };
                }));

                recentFiles.sort((a, b) => b.mtime - a.mtime);

                if (recentFiles.length > 0) {
                    // Pegar o arquivo se foi modificado nos últimos 30 segundos
                    const now = new Date();
                    const diff = now - recentFiles[0].mtime;
                    if (diff < 30000) {
                        filename = recentFiles[0].file;
                        console.log('Arquivo encontrado por fallback:', filename);
                    }
                }
            } catch (e) {
                console.error('Erro no fallback:', e);
            }
        }

        if (!filename) {
            throw new Error('Não foi possível determinar o arquivo baixado. Verifique os logs.');
        }

        const filepath = path.join(DOWNLOADS_DIR, filename);

        // Verificar se o arquivo existe
        await fs.access(filepath);

        res.json({
            success: true,
            filename: filename,
            downloadUrl: `/api/file/${encodeURIComponent(filename)}`
        });

    } catch (error) {
        console.error('❌ Erro ao fazer download:', error);
        res.status(500).json({
            error: 'Erro ao fazer download do vídeo.',
            details: error.stderr || error.message
        });
    }
});

// Servir arquivo para download
app.get('/api/file/:filename', async (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);
        const filepath = path.join(DOWNLOADS_DIR, filename);

        // Verificar se o arquivo existe
        await fs.access(filepath);

        // Enviar arquivo
        res.download(filepath, filename, async (err) => {
            if (err) {
                console.error('Erro ao enviar arquivo:', err);
            }

            // Deletar arquivo após o download (ou após 1 minuto para garantir)
            setTimeout(async () => {
                try {
                    await fs.unlink(filepath);
                    console.log('Arquivo temporário deletado:', filename);
                } catch (e) {
                    // Ignorar erro se arquivo já foi deletado
                }
            }, 60000);
        });

    } catch (error) {
        console.error('Erro ao servir arquivo:', error);
        res.status(404).json({ error: 'Arquivo não encontrado ou expirado.' });
    }
});

// Iniciar servidor
app.listen(PORT, async () => {
    await ensureDownloadsDir();
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);

    const hasYtDlp = await checkYtDlp();
    if (!hasYtDlp) {
        console.warn('⚠️  yt-dlp não está instalado!');
        console.warn('   Instale com: pip install yt-dlp');
    } else {
        console.log('✅ yt-dlp está instalado e pronto!');

        // Log da versão
        try {
            const { stdout } = await execAsync('yt-dlp --version');
            console.log(`   Versão do yt-dlp: ${stdout.trim()}`);
        } catch (e) { }
    }
});
