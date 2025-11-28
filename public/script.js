const API_URL = '/api';

const elements = {
    urlInput: document.getElementById('videoUrl'),
    checkBtn: document.getElementById('checkBtn'),
    videoInfo: document.getElementById('videoInfo'),
    thumbnail: document.getElementById('thumbnail'),
    videoPlaceholder: document.getElementById('videoPlaceholder'),
    videoPlayerContainer: document.getElementById('videoPlayerContainer'),
    videoTitle: document.getElementById('videoTitle'),
    channelName: document.getElementById('channelName'),
    qualitySelect: document.getElementById('qualitySelect'),
    downloadBtn: document.getElementById('downloadBtn'),
    statusMessage: document.getElementById('statusMessage'),
    statusText: document.getElementById('statusText'),
    progressContainer: document.getElementById('progressContainer'),
    progressBar: document.getElementById('progressBar'),
    progressStatus: document.getElementById('progressStatus'),
    progressPercent: document.getElementById('progressPercent'),
    loader: document.querySelector('.loader'),
    btnText: document.querySelector('.btn-text'),
    btnIcon: document.querySelector('.fa-arrow-right')
};

let currentVideoId = null;

// Event Listeners
elements.checkBtn.addEventListener('click', handleCheckVideo);
elements.downloadBtn.addEventListener('click', handleDownload);
elements.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleCheckVideo();
});

// Ativar player ao clicar no placeholder
elements.videoPlaceholder.addEventListener('click', () => {
    if (currentVideoId) {
        loadVideoPlayer(currentVideoId);
    }
});

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function loadVideoPlayer(videoId) {
    elements.videoPlaceholder.classList.add('hidden');
    elements.videoPlayerContainer.classList.remove('hidden');
    elements.videoPlayerContainer.innerHTML = `
        <iframe 
            src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
            title="YouTube video player" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen>
        </iframe>
    `;
}

function resetPlayer() {
    elements.videoPlayerContainer.innerHTML = '';
    elements.videoPlayerContainer.classList.add('hidden');
    elements.videoPlaceholder.classList.remove('hidden');
}

async function handleCheckVideo() {
    const url = elements.urlInput.value.trim();

    if (!url) {
        showStatus('Por favor, insira uma URL válida.', 'error');
        return;
    }

    setLoading(true);
    hideVideoInfo();
    hideStatus();
    resetPlayer();
    hideProgress();

    try {
        const response = await fetch(`${API_URL}/video-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao buscar informações do vídeo');
        }

        // Tentar extrair ID do vídeo para o player
        currentVideoId = extractVideoId(url);

        displayVideoInfo(data);

    } catch (error) {
        showStatus(error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function displayVideoInfo(data) {
    elements.thumbnail.src = data.thumbnail;
    elements.videoTitle.textContent = data.title;
    elements.channelName.textContent = data.uploader;

    // Limpar e popular select de qualidade
    elements.qualitySelect.innerHTML = '<option value="best">Melhor Qualidade (MP4)</option>';

    if (data.formats && data.formats.length > 0) {
        data.formats.forEach(format => {
            const option = document.createElement('option');
            option.value = format.formatId;
            const size = format.filesize ? ` - ${(format.filesize / 1024 / 1024).toFixed(1)}MB` : '';
            option.textContent = `${format.quality} (${format.ext})${size}`;
            elements.qualitySelect.appendChild(option);
        });
    }

    elements.videoInfo.classList.remove('hidden');
}

async function handleDownload() {
    const url = elements.urlInput.value.trim();
    const format = elements.qualitySelect.value;

    if (!url) return;

    setDownloadLoading(true);
    showProgress();
    hideStatus();

    // Simular progresso enquanto aguarda o servidor
    let progress = 0;
    const progressInterval = setInterval(() => {
        if (progress < 90) {
            progress += Math.random() * 5;
            if (progress > 90) progress = 90;
            updateProgress(Math.round(progress), 'Baixando e convertendo...');
        }
    }, 800);

    try {
        const response = await fetch(`${API_URL}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, format })
        });

        const data = await response.json();

        clearInterval(progressInterval);

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao realizar download');
        }

        if (data.success && data.downloadUrl) {
            updateProgress(100, 'Download concluído!');

            // Criar link temporário para download
            const link = document.createElement('a');
            link.href = data.downloadUrl;
            link.setAttribute('download', data.filename);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => {
                setDownloadLoading(false);
                // Manter a barra de progresso visível por um tempo
            }, 1000);
        }

    } catch (error) {
        clearInterval(progressInterval);
        hideProgress();
        showStatus(error.message, 'error');
        setDownloadLoading(false);
    }
}

// UI Helpers
function setLoading(isLoading) {
    if (isLoading) {
        elements.loader.classList.remove('hidden');
        elements.btnText.classList.add('hidden');
        elements.btnIcon.classList.add('hidden');
        elements.checkBtn.disabled = true;
    } else {
        elements.loader.classList.add('hidden');
        elements.btnText.classList.remove('hidden');
        elements.btnIcon.classList.remove('hidden');
        elements.checkBtn.disabled = false;
    }
}

function setDownloadLoading(isLoading) {
    if (isLoading) {
        elements.downloadBtn.disabled = true;
        elements.downloadBtn.innerHTML = '<div class="loader"></div> Processando...';
    } else {
        elements.downloadBtn.disabled = false;
        elements.downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i> Baixar Agora';
    }
}

function showStatus(message, type = 'normal') {
    elements.statusMessage.className = 'status-message'; // Reset classes
    if (type !== 'normal') elements.statusMessage.classList.add(type);

    elements.statusText.textContent = message;
    elements.statusMessage.classList.remove('hidden');
}

function hideStatus() {
    elements.statusMessage.classList.add('hidden');
}

function hideVideoInfo() {
    elements.videoInfo.classList.add('hidden');
}

function showProgress() {
    elements.progressContainer.classList.remove('hidden');
    updateProgress(0, 'Iniciando...');
}

function hideProgress() {
    elements.progressContainer.classList.add('hidden');
}

function updateProgress(percent, status) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressPercent.textContent = `${percent}%`;
    if (status) elements.progressStatus.textContent = status;
}
