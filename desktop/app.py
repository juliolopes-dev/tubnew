import os
import sys
import subprocess
import json
import re
from pathlib import Path
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='../public', static_url_path='')
CORS(app)

# Diretório de downloads
DOWNLOADS_DIR = Path.home() / 'Downloads' / 'TubNew'
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

def check_yt_dlp():
    """Verifica se yt-dlp está instalado"""
    try:
        subprocess.run(['yt-dlp', '--version'], capture_output=True, check=True)
        return True
    except:
        return False

def install_yt_dlp():
    """Instala yt-dlp automaticamente"""
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'yt-dlp'], check=True)
        return True
    except:
        return False

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/video-info', methods=['POST'])
def video_info():
    try:
        data = request.json
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL é obrigatória'}), 400
        
        if not check_yt_dlp():
            if not install_yt_dlp():
                return jsonify({'error': 'Não foi possível instalar yt-dlp. Instale manualmente: pip install yt-dlp'}), 500
        
        # Obter informações do vídeo
        result = subprocess.run(
            ['yt-dlp', '--dump-json', '--no-playlist', url],
            capture_output=True,
            text=True,
            check=True
        )
        
        video_info = json.loads(result.stdout)
        
        # Extrair formatos
        formats = []
        for f in video_info.get('formats', []):
            if f.get('ext') == 'mp4' and f.get('vcodec') != 'none':
                formats.append({
                    'formatId': f.get('format_id'),
                    'quality': f.get('format_note') or f.get('resolution') or 'unknown',
                    'filesize': f.get('filesize'),
                    'ext': f.get('ext'),
                    'resolution': f.get('resolution')
                })
        
        # Ordenar por resolução
        formats.sort(key=lambda x: int(x.get('resolution', '0').split('x')[0]) if x.get('resolution') else 0, reverse=True)
        
        return jsonify({
            'title': video_info.get('title'),
            'thumbnail': video_info.get('thumbnail'),
            'duration': video_info.get('duration'),
            'uploader': video_info.get('uploader'),
            'formats': formats[:10]
        })
        
    except subprocess.CalledProcessError as e:
        return jsonify({'error': 'Erro ao processar vídeo', 'details': e.stderr}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download', methods=['POST'])
def download():
    try:
        data = request.json
        url = data.get('url')
        format_id = data.get('format', 'best')
        
        if not url:
            return jsonify({'error': 'URL é obrigatória'}), 400
        
        # Template de saída
        output_template = str(DOWNLOADS_DIR / '%(title)s.%(ext)s')
        
        # Comando de download
        cmd = ['yt-dlp', '--no-playlist', '--restrict-filenames', '-o', output_template]
        
        # Detectar se é Short
        is_short = '/shorts/' in url
        
        if format_id != 'best':
            cmd.extend(['-f', format_id])
        else:
            if is_short:
                cmd.extend(['-f', 'best'])
            else:
                cmd.extend(['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'])
        
        cmd.append(url)
        
        # Executar download
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Encontrar arquivo baixado
        filename = None
        for line in result.stdout.split('\n'):
            if 'Destination:' in line:
                filename = Path(line.split('Destination:')[1].strip()).name
                break
            elif 'has already been downloaded' in line:
                filename = Path(line.split('[download]')[1].split('has already')[0].strip()).name
                break
        
        if not filename:
            # Pegar arquivo mais recente
            files = list(DOWNLOADS_DIR.glob('*'))
            if files:
                filename = max(files, key=lambda x: x.stat().st_mtime).name
        
        if not filename:
            return jsonify({'error': 'Não foi possível determinar o arquivo baixado'}), 500
        
        return jsonify({
            'success': True,
            'filename': filename,
            'filepath': str(DOWNLOADS_DIR / filename),
            'downloadUrl': f'/api/file/{filename}'
        })
        
    except subprocess.CalledProcessError as e:
        return jsonify({'error': 'Erro ao fazer download', 'details': e.stderr}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/file/<path:filename>')
def serve_file(filename):
    return send_file(DOWNLOADS_DIR / filename, as_attachment=True)

if __name__ == '__main__':
    print('═' * 60)
    print('🎬 TubNew Desktop - YouTube Downloader')
    print('═' * 60)
    print(f'📁 Downloads salvos em: {DOWNLOADS_DIR}')
    print('🌐 Abrindo navegador em: http://localhost:5000')
    print('═' * 60)
    print('\n⚠️  Para fechar, pressione Ctrl+C nesta janela\n')
    
    # Verificar yt-dlp
    if not check_yt_dlp():
        print('📥 Instalando yt-dlp...')
        if install_yt_dlp():
            print('✅ yt-dlp instalado com sucesso!')
        else:
            print('❌ Erro ao instalar yt-dlp. Instale manualmente: pip install yt-dlp')
    
    # Abrir navegador automaticamente
    import webbrowser
    webbrowser.open('http://localhost:5000')
    
    # Iniciar servidor
    app.run(host='127.0.0.1', port=5000, debug=False)
