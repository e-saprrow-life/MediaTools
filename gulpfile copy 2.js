import * as fs from 'node:fs/promises'
import fs_native from 'fs'
import gulp from "gulp";
import path from "path";
import {deleteAsync} from 'del';
import newer from 'gulp-newer';
import image from 'gulp-image';
import convert from'heic-convert';
import webpConverter from 'gulp-webp';
import ffmpeg from 'fluent-ffmpeg';
var command = ffmpeg();


const root = {
    src: './src',
    output: './output',
}


async function convert_heic_to_jpg() { 
    try {
      const files = await fs.readdir(root.src);
      // Фильтрация файлов с расширением .heic
      const heicFiles = files.filter(file => path.extname(file).toLowerCase() === '.heic');
  
      // Перебор HEIC файлов и их конвертация
      for (const heicFile of heicFiles) {
        const inputPath = path.join(root.src, heicFile);
        const outputFileName = path.basename(heicFile, path.extname(heicFile)) + '.jpg';
        const outputPath = path.join(root.output, outputFileName);
  
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
      deleteAsync(`${path.src}/**/*.*`)
    } catch (error) {
      console.error('Ошибка при конвертации:', error);
    }
}
  

const optimize_images = () => {
    return gulp.src(`${root.src}/**/*.*` )
    .pipe(newer(root.output))
    .pipe(image())
    .pipe(gulp.dest(root.output))
}


const convert_to_webp = () => {
    // deleteAsync(`${path.webp}/**/*.*`)
    return gulp.src(`${root.src}/**/*.*` )
    .pipe(newer(root.output))
    .pipe(webpConverter({ // Параметры: https://github.com/imagemin/imagemin-webp#imageminwebpoptions
        quality: 85,
        method: 4
    }))
    .pipe(gulp.dest(root.output))
}

const optimize_video = async () => {
    let fileTypesArr = [];

    ['mp4', 'mov'].forEach(type => {
        fileTypesArr.push(`${root.src}/**/*.${type}`); 
        fileTypesArr.push(`${root.src}/**/*.${type.toUpperCase()}`); 
    })

    return gulp.src(fileTypesArr)
    .on('data', (file) => {
        const basename = path.basename(file.path, path.extname(file.path));
  
        ffmpeg()
            .input(path.join(root.src, file.relative))
            .videoCodec('libx264') // Відеокодек
            .audioCodec('aac') // Аудіокодек
            .audioBitrate('128k') // Аудіобітрейт
            .audioChannels(2) // Кількість аудіоканалів
            .audioFrequency(44100) // Частота дискретизації аудіо
            .output(path.join(root.output, basename + '.mp4'))
            .on('end', () => {
                console.log(`Finished processing ${file.relative}`);
            })
            .on('error', (err) => {
                console.error(`Error processing ${file.relative}: ${err.message}`);
            })
            .run();
    })
    .pipe(gulp.dest(root.output))
}

// npm run o-video
// const optimize_video = async () => {
//     deleteAsync(`${path.output}/**/*.*`)
//     const source = await fs.readdir(root.src);
//     const files = source.filter(file => ['.mp4', '.mov'].includes(path.extname(file).toLowerCase()));

//     for (const file of files) {
//         const outputFilePath = path.join(root.output, path.basename(file, path.extname(file)) + '.mp4');
//         var stream = fs_native.createWriteStream(outputFilePath);
//         console.log(path.join(root.src, file))
//         await new Promise((resolve, reject) => {
//             ffmpeg('./src/Avis-Digital-Studio-Promo-o.mp4')
//                 // .input(path.join(root.src, file))
//                 // .videoCodec('libx264') // Відеокодек
//                 // .audioCodec('aac') // Аудіокодек
//                 // .audioBitrate('128k') // Аудіобітрейт
//                 // .audioChannels(2) // Кількість аудіоканалів
//                 // .audioFrequency(44100) // Частота дискретизації аудіо
//                 .output(stream)
//                 .on('end', () => {
//                     console.log(`Finished processing ${file}`);
//                     resolve();
//                 })
//                 .on('error', (err, stdout, stderr) => {
//                     console.error(`Error processing ${file}: ${err.message}`);
//                     console.error('FFmpeg stdout:', stdout);
//                     console.error('FFmpeg stderr:', stderr);
//                     reject(err);
//                 })
//                 .run();
//         });
//     }
// }

// const clearSRC = async () => {
//     deleteAsync(`${path.src}/**/*.*`)
//     return null;
// } 


function cb(arg) {
    console.log(arg)
}

export const optimize_images_task = gulp.series(optimize_images);
export const optimize_video_task = gulp.series(optimize_video);
export const heic_task = gulp.series(convert_heic_to_jpg);
export const webp_task = gulp.series(convert_to_webp);