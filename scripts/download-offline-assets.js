import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

// Ensure directories exist
const dirsToCreate = [
  path.join(PUBLIC_DIR, 'js'),
  path.join(PUBLIC_DIR, 'tessdata'),
  path.join(PUBLIC_DIR, 'tesseract'),
];

dirsToCreate.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Creado directorio: ${dir}`);
  }
});

// Helper to validate if a file exists and has size > 0
const isFileValid = (filePath) => {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
};

// Helper to download a file, supporting redirects recursively
const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const handleRequest = (currentUrl, depth = 0) => {
      if (depth > 5) {
        reject(new Error('Demasiadas redirecciones (límite 5)'));
        return;
      }

      console.log(`Descargando ${currentUrl} -> ${dest}...`);
      
      https.get(currentUrl, (response) => {
        // Follow redirects: 301, 302, 307, 308
        if (
          response.statusCode === 301 || 
          response.statusCode === 302 || 
          response.statusCode === 307 || 
          response.statusCode === 308
        ) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            handleRequest(redirectUrl, depth + 1);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Fallo al descargar ${currentUrl}: Estado HTTP ${response.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(dest);
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`Completado: ${path.basename(dest)}`);
          resolve();
        });

        file.on('error', (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };

    handleRequest(url);
  });
};

// Main execution
const main = async () => {
  try {
    // 1. Download OpenCV.js (using the fast and stable 4.5.4 version or 4.10.0)
    const opencvUrl = 'https://docs.opencv.org/4.5.4/opencv.js';
    const opencvDest = path.join(PUBLIC_DIR, 'js', 'opencv.js');
    if (!isFileValid(opencvDest)) {
      await downloadFile(opencvUrl, opencvDest);
    } else {
      console.log('opencv.js ya existe y es válido en public/js.');
    }

    // 2. Download Spanish and English fast OCR models
    const spaUrl = 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/spa.traineddata';
    const spaDest = path.join(PUBLIC_DIR, 'tessdata', 'spa.traineddata');
    if (!isFileValid(spaDest)) {
      await downloadFile(spaUrl, spaDest);
    } else {
      console.log('spa.traineddata ya existe y es válido en public/tessdata.');
    }

    const engUrl = 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata';
    const engDest = path.join(PUBLIC_DIR, 'tessdata', 'eng.traineddata');
    if (!isFileValid(engDest)) {
      await downloadFile(engUrl, engDest);
    } else {
      console.log('eng.traineddata ya existe y es válido en public/tessdata.');
    }

    // 3. Copy files from node_modules after npm install has run
    console.log('\nCopiando recursos de node_modules (si existen)...');
    
    // Copy pdf.worker.min.mjs
    const pdfWorkerSrc = path.join(PROJECT_ROOT, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
    const pdfWorkerDest = path.join(PUBLIC_DIR, 'pdf.worker.min.mjs');
    if (fs.existsSync(pdfWorkerSrc)) {
      fs.copyFileSync(pdfWorkerSrc, pdfWorkerDest);
      console.log('Copiado pdf.worker.min.mjs a public/');
    } else {
      console.warn('ADVERTENCIA: No se encontró pdfjs-dist en node_modules. Ejecuta npm install primero.');
    }

    // Copy Tesseract Worker and Core files from node_modules
    const tesseractDist = path.join(PROJECT_ROOT, 'node_modules', 'tesseract.js', 'dist');
    const tesseractCoreDist = path.join(PROJECT_ROOT, 'node_modules', 'tesseract.js-core');

    if (fs.existsSync(tesseractDist)) {
      const workerSrc = path.join(tesseractDist, 'worker.min.js');
      const workerDest = path.join(PUBLIC_DIR, 'tesseract', 'worker.min.js');
      if (fs.existsSync(workerSrc)) {
        fs.copyFileSync(workerSrc, workerDest);
        console.log('Copiado Tesseract worker.min.js a public/tesseract/');
      }
    }

    if (fs.existsSync(tesseractCoreDist)) {
      const filesToCopy = [
        'tesseract-core.js', 'tesseract-core.wasm', 'tesseract-core.wasm.js',
        'tesseract-core-simd.js', 'tesseract-core-simd.wasm', 'tesseract-core-simd.wasm.js',
        'tesseract-core-lstm.js', 'tesseract-core-lstm.wasm', 'tesseract-core-lstm.wasm.js',
        'tesseract-core-simd-lstm.js', 'tesseract-core-simd-lstm.wasm', 'tesseract-core-simd-lstm.wasm.js'
      ];
      filesToCopy.forEach(fileName => {
        const src = path.join(tesseractCoreDist, fileName);
        const dest = path.join(PUBLIC_DIR, 'tesseract', fileName);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`Copiado Tesseract Core ${fileName} a public/tesseract/`);
        }
      });
    }

    console.log('\n¡Proceso de configuración offline completado exitosamente!');
  } catch (error) {
    console.error('Error configurando recursos offline:', error);
  }
};

main();
