const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'src', 'assets', 'icon.svg');
const pngPath = path.join(__dirname, '..', 'src', 'assets', 'icon.png');
const icoPath = path.join(__dirname, '..', 'src', 'assets', 'icon.ico');

async function generateIcon() {
  try {
    console.log('Convertendo SVG para PNG...');
    
    // Converter SVG para PNG 256x256
    await sharp(svgPath)
      .resize(256, 256)
      .png()
      .toFile(pngPath);
    
    console.log('PNG criado!');
    
    // Converter PNG para ICO
    console.log('Convertendo PNG para ICO...');
    const icoBuffer = await pngToIco(pngPath);
    fs.writeFileSync(icoPath, icoBuffer);
    
    console.log('Ícone gerado com sucesso:', icoPath);
  } catch (error) {
    console.error('Erro ao gerar ícone:', error);
  }
}

generateIcon();
