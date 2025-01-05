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
    // deleteAsync(`${path.output}/**/*.*`)
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

// npm run o-video
const optimize_video = async () => {
    // try {
        const source = await fs.readdir(root.src);
        const files = source.filter(file => ['.mp4', '.mov'].includes(path.extname(file).toLowerCase()));

        for (const file of files) {

            var stream = fs_native.createWriteStream(root.output + '/' + path.basename(file, path.extname(file)) + '.mp4');

            // const outputFileName = path.basename(file, path.extname(file)) + '.mp4';
            ffmpeg()
                .input(path.join(root.src, file))

                .videoCodec('libx264')
                // .videoBitrate() // https://github.com/fluent-ffmpeg/node-fluent-ffmpeg?tab=readme-ov-file#videobitratebitrate-constantfalse-set-video-bitrate
                // .fps(30)
                // .videoSize('640x480') // 640x? (Ширина 640, а висота авто)
                // .aspect('4:3')

                .audioCodec('acc')
                .audioBitrate('128k')
                .audioChannels(2)
                .audioFrequency(44100) // 22050, 44100, 48000.

                // .output(root.output + '/' + outputFileName)
                .output(stream)
                .on('end', function() {
                    console.log('Finished processing');
                })
            

        }
    // } catch {
        // console.log('Error: optimize_video')
    // }
    // let fileTypesArr = [];

    // fileTypes.forEach(type => {
    //     fileTypesArr.push(`${root.src}/**/*.${type}`); 
    //     fileTypesArr.push(`${root.src}/**/*.${type.toUpperCase()}`); 
    // })

    // console.log(fileTypesArr)

    // return gulp.src(fileTypesArr)
    // .pipe(function (stream) {
    //     console.log(stream)
    // })
    // .pipe(ffmpeg('mp4', function (cmd) {
    //     console.log(cmd)
    //     return cmd
    //         // https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
    //         // Video
    //         .videoCodec('libx264')
    //         // .size('640x?')
    //         // .aspect('4:3')
    //         // Audio
    //         // .audioCodec('acc') // libmp3lame
    //         // .audioBitrate('128k')
    //         // .audioChannels(2)
    // }))

    // .pipe(ffmpeg({
    //     // codec: 'libx264',
    //     // format: 'mp4',
    //     outputOptions: [
    //         '-preset slow', // Впливає на швидкість і якість конвертації - ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
    //         '-crf 22', // якість відео (зазвичай для кодека libx264) Діапазон: 0 (максимальна якість, без втрат) до 51 (мінімальна якість). Рекомендоване значення: 18-28.
    //         '-c:v libx264', //  Відеокодек - Приклади: libx264, libx265, vp9.
    //         '-c:a aac', // Аудіокодек - Приклади: aac, mp3, libopus.
    //         // '-b:a 128k', // Аудіобітрейт - Приклад: -b:a 128k (128 кбіт/с)
    //         // '-ar 44100', // Частота дискретизації аудіо. Приклади: 44100, 48000.
    //         // '-s <size>', // Встановлення розміру відео (ширинаxвисота) Приклад: -s 1920x1080 (Full HD).
    //         // '-aspect <ratio>', // Співвідношення сторін - Приклад: -aspect 16:9.
    //         // '-r <rate>', // Частота кадрів: Приклад: -r 30 (30 кадрів/сек).
    //         // '-vf <filter>', // Застосування відеофільтрів - Приклад: -vf "scale=1280:720" (масштабування до 720p).
    //         // '-af <filter>', // Аудіофільтри - Приклад: -af "volume=2.0" (подвоєння гучності).
    //         // '-f mp4', // Формат вихідного файлу - Приклади: mp4, mkv, avi
    //     ]
    // }))
    // .pipe(gulp.dest(root.output))
}

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