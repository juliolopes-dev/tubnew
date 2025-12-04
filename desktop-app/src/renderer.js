// Estado da aplicação
let currentVideoUrl = '';
let downloadPath = '';

// Elementos DOM
const urlInput = document.getElementById('url-input');
const btnPaste = document.getElementById('btn-paste');
const btnSearch = document.getElementById('btn-search');
const previewSection = document.getElementById('preview-section');
const optionsSection = document.getElementById('options-section');
const progressSection = document.getElementById('progress-section');
const successSection = document.getElementById('success-section');
const qualityGroup = document.getElementById('quality-group');
const folderPath = document.getElementById('folder-path');
const btnFolder = document.getElementById('btn-folder');
const btnDownload = document.getElementById('btn-download');
const btnOpenFolder = document.getElementById('btn-open-folder');
const progressFill = document.getElementById('progress-fill');
const progressPercent = document.getElementById('progress-percent');
const progressText = document.getElementById('progress-text');

// Controles da janela
document.getElementById('btn-minimize').addEventListener('click', () => {
  window.electronAPI.minimizeWindow();
});

document.getElementById('btn-maximize').addEventListener('click', () => {
  window.electronAPI.maximizeWindow();
});

document.getElementById('btn-close').addEventListener('click', () => {
  window.electronAPI.closeWindow();
});

// Inicialização
async function init() {
  downloadPath = await window.electronAPI.getDefaultDownloadPath();
  folderPath.value = downloadPath;
}

init();

// Colar URL
btnPaste.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    urlInput.value = text;
    urlInput.focus();
  } catch (err) {
    showToast('Não foi possível acessar a área de transferência', 'error');
  }
});

// Buscar vídeo
btnSearch.addEventListener('click', searchVideo);
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchVideo();
});

async function searchVideo() {
  const url = urlInput.value.trim();
  
  if (!url) {
    showToast('Por favor, insira uma URL válida', 'error');
    return;
  }

  if (!isValidUrl(url)) {
    showToast('URL inválida. Use links do YouTube ou Instagram', 'error');
    return;
  }

  currentVideoUrl = url;
  
  // Mostrar loading
  btnSearch.disabled = true;
  btnSearch.innerHTML = '<div class="spinner"></div><span>Buscando...</span>';
  
  // Esconder seções
  previewSection.style.display = 'none';
  optionsSection.style.display = 'none';
  successSection.style.display = 'none';

  try {
    const result = await window.electronAPI.getVideoInfo(url);
    
    if (result.success) {
      displayVideoInfo(result.data);
    }
  } catch (error) {
    showToast(error.error || 'Erro ao buscar informações do vídeo', 'error');
  } finally {
    btnSearch.disabled = false;
    btnSearch.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
        <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>Buscar Vídeo</span>
    `;
  }
}

function displayVideoInfo(data) {
  document.getElementById('video-thumbnail').src = data.thumbnail;
  document.getElementById('video-title').textContent = data.title;
  document.getElementById('video-channel').textContent = data.uploader || 'Canal desconhecido';
  document.getElementById('video-views').textContent = formatViews(data.view_count);
  document.getElementById('video-duration').textContent = formatDuration(data.duration);
  
  previewSection.style.display = 'block';
  optionsSection.style.display = 'block';
}

// Formato de vídeo/áudio
document.querySelectorAll('input[name="format"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    qualityGroup.style.display = e.target.value === 'mp3' ? 'none' : 'block';
  });
});

// Selecionar pasta
btnFolder.addEventListener('click', async () => {
  const path = await window.electronAPI.selectFolder();
  if (path) {
    downloadPath = path;
    folderPath.value = path;
  }
});

// Download
btnDownload.addEventListener('click', startDownload);

async function startDownload() {
  if (!currentVideoUrl) {
    showToast('Nenhum vídeo selecionado', 'error');
    return;
  }

  const format = document.querySelector('input[name="format"]:checked').value;
  const quality = document.getElementById('quality-select').value;

  // Mostrar progresso
  optionsSection.style.display = 'none';
  progressSection.style.display = 'block';
  successSection.style.display = 'none';
  progressFill.style.width = '0%';
  progressPercent.textContent = '0%';
  progressText.textContent = 'Iniciando download...';

  // Listener de progresso
  window.electronAPI.onDownloadProgress((data) => {
    const progress = Math.round(data.progress);
    progressFill.style.width = `${progress}%`;
    progressPercent.textContent = `${progress}%`;
    progressText.textContent = progress < 100 ? 'Baixando...' : 'Finalizando...';
  });

  try {
    const result = await window.electronAPI.downloadVideo({
      url: currentVideoUrl,
      outputPath: downloadPath,
      format,
      quality
    });

    if (result.success) {
      progressSection.style.display = 'none';
      successSection.style.display = 'block';
    }
  } catch (error) {
    showToast(error.error || 'Erro durante o download', 'error');
    progressSection.style.display = 'none';
    optionsSection.style.display = 'block';
  }
}

// Abrir pasta
btnOpenFolder.addEventListener('click', () => {
  window.electronAPI.openFolder(downloadPath);
});

// Utilitários
function isValidUrl(url) {
  const patterns = [
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
    /^(https?:\/\/)?(www\.)?instagram\.com\/.+/
  ];
  return patterns.some(pattern => pattern.test(url));
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatViews(count) {
  if (!count) return '';
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M visualizações`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K visualizações`;
  }
  return `${count} visualizações`;
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  toast.className = 'toast';
  toast.classList.add(type);
  toastMessage.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
