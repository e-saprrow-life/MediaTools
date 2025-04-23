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
import renderSvg from "lottie-to-svg";
var command = ffmpeg();


const root = {
    src: './src',
    output: './output',
}


const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-GB', { hour12: false });
};


async function heic_to_jpg() { 
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
    //   deleteAsync(`${path.src}/**/*.*`)
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



const to_webp = () => {
    return gulp.src(`${root.src}/**/*.*` )
    .pipe(newer(root.output))
    .pipe(webpConverter({ // Параметры: https://github.com/imagemin/imagemin-webp#imageminwebpoptions
        quality: 85,
        method: 4
    }))
    .pipe(gulp.dest(root.output))
}



const to_mp4 = async () => {
    const source = await fs.readdir(root.src);
    const files = source.filter(file => ['.mp4', '.mov'].includes(path.extname(file).toLowerCase()));

    const processFile = async (file) => {
        const inputPath = path.join(root.src, file);
        const basename = path.basename(file, path.extname(file));
        const outputPath = path.join(root.output, basename + '.mp4');
        const initialSize = await getFileSize(inputPath);

        return new Promise((resolve, reject) => {
            ffmpeg(path.join(root.src, file))
                .outputOptions([
                    // https://gist.github.com/tayvano/6e2d456a9897f55025e25035478a3a50
                    '-preset medium', // Впливає на швидкість і якість конвертації - ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
                    '-crf 28', // якість відео (зазвичай для кодека libx264) Діапазон: 0 (максимальна якість, без втрат) до 51 (мінімальна якість). Рекомендоване значення: 18-28.
                    '-c:v libx264', //  Відеокодек - Приклади: libx264, libx265, vp9.
                    // '-c:v libvpx', //  Кодек для WebM
                    '-c:a aac', // Аудіокодек - Приклади: aac, mp3, libopus.
                    // '-c:a libvorbis', // Аудіокодек для WebM
                    '-b:a 96k', // Аудіобітрейт - Приклад: -b:a 128k (128 кбіт/с)
                    '-ar 44100', // Частота дискретизації аудіо. Приклади: 44100, 48000.
                    // '-s <size>', // Встановлення розміру відео (ширинаxвисота) Приклад: -s 1920x1080 (Full HD).
                    // '-aspect <ratio>', // Співвідношення сторін - Приклад: -aspect 16:9.
                    // '-r <rate>', // Частота кадрів: Приклад: -r 30 (30 кадрів/сек).
                    // '-vf <filter>', // Застосування відеофільтрів - Приклад: -vf "scale=1280:720" (масштабування до 720p).
                    // '-af <filter>', // Аудіофільтри - Приклад: -af "volume=2.0" (подвоєння гучності).
                    // '-f mp4', // Формат вихідного файлу - Приклади: mp4, mkv, avi
                ])
                .output(outputPath)
                .on('start', () => {
                    // console.log('===========================')
                    console.log(`[${getCurrentTime()}] \x1b[32m=> Starting: ${file}\x1b[0m`);
                })
                .on('end', async  () => {
                    const finalSize = await getFileSize(outputPath);
                    const diff = finalSize - initialSize; 
                    if (diff > 0) {
                        console.log(`[${getCurrentTime()}] Converted: \x1b[31m+` + Math.floor(diff / 1024 / 1024) + 'Mb\x1b[0m')
                    } else {
                        console.log(`[${getCurrentTime()}] Converted: \x1b[32m` + Math.floor(diff / 1024 / 1024) + 'Mb\x1b[0m')
                    }
                    console.log(`[${getCurrentTime()}] Initial size: ` + Math.floor(initialSize / 1024 / 1024) + 'Mb')
                    console.log(`[${getCurrentTime()}] Final size: ` + Math.floor(finalSize / 1024 / 1024) + 'Mb')
                    
                    // console.log('===========================')
                    resolve(); // Завершення обіцянки
                })
                .on('error', (err) => {
                    console.error(`[${getCurrentTime()}] Error processing ${file}: ${err.message}`);
                    reject(err); // Відхилення обіцянки при помилці
                })
                .run(); // Запуск ffmpeg
        });
    };

    for (const file of files) {
        await processFile(file); // Чекаємо завершення попередньої операції
    }
}


const lottie_to_svg = async () => {
    const animationData = JSON.parse(fs_native.readFileSync(root.src + '/anim.json', "utf8"));

    renderSvg(animationData).then(svg => {
        fs_native.writeFileSync(root.output + `/anim.svg`, svg, "utf8");
    });
    // const source = fs_native.readdir(root.src);
    // const files = source.filter(file => ['.json'].includes(path.extname(file).toLowerCase()));

    // const processFile = async (fileName) => {
    //     // let path = path.join(root.src, file);
    //     let path = root.src + '/' + fileName;
    //     let animationData = JSON.parse(fs.readFileSync(path, "utf8"));

    //     renderSvg(animationData).then(svg => {
    //       fs.writeFileSync(fileName + `.svg`, svg, "utf8");
    //     });        
    // }

    // for (const file of files) {
    //     processFile(file);
    // }
}


const to_webm = async () => {
    const source = await fs.readdir(root.src);
    const files = source.filter(file => ['.mp4', '.mov'].includes(path.extname(file).toLowerCase()));

    const processFile = async (file) => {
        const inputPath = path.join(root.src, file);
        const basename = path.basename(file, path.extname(file));
        const outputPath = path.join(root.output, basename + '.webm');
        const initialSize = await getFileSize(inputPath);

        return new Promise((resolve, reject) => {
            ffmpeg(path.join(root.src, file))
                // .outputOptions([
                //     // https://gist.github.com/tayvano/6e2d456a9897f55025e25035478a3a50
                //     '-preset medium', // Впливає на швидкість і якість конвертації - ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
                //     '-crf 30', // якість відео (зазвичай для кодека libx264) Діапазон: 0 (максимальна якість, без втрат) до 51 (мінімальна якість). Рекомендоване значення: 18-28.
                //     // '-c:v libvpx', //  Кодек для WebM
                //     '-c:v libvpx-vp9', //  Кодек для WebM
                //     '-c:a libvorbis', // Аудіокодек для WebM
                //     '-b:v 1M',
                //     '-deadline good', // -deadline best - Контролює компроміс між швидкістю та якістю.
                //     '-b:a 96k', // Аудіобітрейт - Приклад: -b:a 128k (128 кбіт/с)
                //     '-ar 44100', // Частота дискретизації аудіо. Приклади: 44100, 48000.
                //     // '-s <size>', // Встановлення розміру відео (ширинаxвисота) Приклад: -s 1920x1080 (Full HD).
                //     // '-aspect <ratio>', // Співвідношення сторін - Приклад: -aspect 16:9.
                //     // '-r <rate>', // Частота кадрів: Приклад: -r 30 (30 кадрів/сек).
                //     // '-vf <filter>', // Застосування відеофільтрів - Приклад: -vf "scale=1280:720" (масштабування до 720p).
                //     // '-af <filter>', // Аудіофільтри - Приклад: -af "volume=2.0" (подвоєння гучності).
                //     '-f webm', // Формат вихідного файлу - Приклади: mp4, mkv, avi, webm
                // ])
                
                .outputOptions([
                    '-preset medium',   // Баланс між швидкістю і якістю [ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow]
                    '-c:v libvpx-vp9',  // Кодек VP9 для WebM [libvpx, libvpx-vp9]
                    // '-c:v libvpx',  // Кодек VP9 для WebM [libvpx, libvpx-vp9]
                    '-crf 10',          // Оптимальна якість, регулюється 0-63 (менше = краща якість)
                    '-b:v 1M',          // Бітрейт відео 1Мбіт/с
                    '-c:a libvorbis',     // Кращий аудіокодек Opus
                    // '-c:a libopus',     // Кращий аудіокодек Opus
                    '-b:a 96k',         // Бітрейт аудіо
                    '-ar 44100',        // Частота дискретизації аудіо
                    '-deadline good',   // Баланс швидкість/якість [best, good]
                    '-f webm',          // Формат WebM
                ])
                .output(outputPath)
                .on('start', () => {
                    console.log(`[${getCurrentTime()}] \x1b[32m=> Starting: ${file}\x1b[0m`);
                })
                .on('end', async  () => {
                    const finalSize = await getFileSize(outputPath);
                    const diff = finalSize - initialSize; 
                    if (diff > 0) {
                        console.log(`[${getCurrentTime()}] Converted: \x1b[31m+` + Math.floor(diff / 1024 / 1024) + 'Mb\x1b[0m')
                    } else {
                        console.log(`[${getCurrentTime()}] Converted: \x1b[32m` + Math.floor(diff / 1024 / 1024) + 'Mb\x1b[0m')
                    }
                    console.log(`[${getCurrentTime()}] Initial size: ` + Math.floor(initialSize / 1024 / 1024) + 'Mb')
                    console.log(`[${getCurrentTime()}] Final size: ` + Math.floor(finalSize / 1024 / 1024) + 'Mb')
                    resolve(); // Завершення обіцянки
                })
                .on('error', (err) => {
                    console.error(`[${getCurrentTime()}] Error processing ${file}: ${err.message}`);
                    reject(err); // Відхилення обіцянки при помилці
                })
                .run(); // Запуск ffmpeg
        });
    };

    for (const file of files) {
        await processFile(file); // Чекаємо завершення попередньої операції
    }
}


const getFileSize = async (filePath) => {
    try {
        const stats = await fs.stat(filePath);
        return stats.size; // Повертає розмір файлу в байтах
    } catch (err) {
        console.error(`Error getting file size for ${filePath}: ${err.message}`);
        return 0; // Якщо файл не існує або виникла помилка
    }
};

export const min_images = gulp.series(optimize_images);
export const convert_to_mp4 = gulp.series(to_mp4);
export const convert_heic_to_jpg = gulp.series(heic_to_jpg);
export const convert_to_webp = gulp.series(to_webp);
export const convert_to_webm = gulp.series(to_webm);
export const convert_lottie_to_svg = gulp.series(lottie_to_svg);