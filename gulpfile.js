// import fs from 'fs';
import * as fs from 'node:fs/promises'
import gulp from "gulp";
import path from "path";
import {deleteAsync} from 'del';
import newer from 'gulp-newer';
import image from 'gulp-image';
import convert from'heic-convert';
import webpConverter from 'gulp-webp';


const folder = {
    src: './src',
    output: './output',
    heic2jpg: './heic2jpg',
    webp: './webp'
}


async function heic2jpg_converter() {
    const inputFolder = folder.src;
  
    try {
      // Чтение файлов входной папки
      const files = await fs.readdir(inputFolder);
  
      // Фильтрация файлов с расширением .heic
      const heicFiles = files.filter(file => path.extname(file).toLowerCase() === '.heic');
  
      // Перебор HEIC файлов и их конвертация
      for (const heicFile of heicFiles) {
        const inputPath = path.join(inputFolder, heicFile);
        const outputFileName = path.basename(heicFile, path.extname(heicFile)) + '.jpg';
        const outputPath = path.join(folder.heic2jpg, outputFileName);
  
        // Чтение HEIC файла
        const inputBuffer = await fs.readFile(inputPath);
  
        // Конвертация в формат JPEG
        const outputBuffer = await convert({
          buffer: inputBuffer,
          format: 'JPEG',
          quality: 1
        });
  
        // Запись результата
        await fs.writeFile(outputPath, outputBuffer);
        console.log(`Конвертирован файл: ${inputPath} -> ${outputPath}`);
      }
  
      console.log('Конвертация завершена.');
    } catch (error) {
      console.error('Ошибка при конвертации:', error);
    }
}
  

const optimization = () => {
    // deleteAsync(`${path.output}/**/*.*`)
    return gulp.src(`${folder.src}/**/*.*` )
    .pipe(newer(folder.output))
    .pipe(image())
    .pipe(gulp.dest(folder.output))
}


const webp_converter = () => {
    // deleteAsync(`${path.webp}/**/*.*`)
    return gulp.src(`${folder.src}/**/*.*` )
    .pipe(newer(folder.webp))
    .pipe(webpConverter({ // Параметры: https://github.com/imagemin/imagemin-webp#imageminwebpoptions
        quality: 90,
        method: 4
    }))
    .pipe(gulp.dest(folder.webp))
}

// const clearSRC = async () => {
//     deleteAsync(`${path.src}/**/*.*`)
//     return null;
// } 


export const start = gulp.series(optimization);
export const heic2jpg = gulp.series(heic2jpg_converter);
export const webp = gulp.series(webp_converter);