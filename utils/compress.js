import fs from 'fs';
import zlib from 'zlib';
import ora from "ora";
import { logger } from './logger.js';
import select, { Separator } from '@inquirer/select';
import { filesize, partial } from "filesize";


const delete_raw_backup = async (backup_file) => {
    try {
        await fs.promises.unlink(backup_file);
        logger.info(`Raw backup deleted successfully: ${backup_file}`, {
            operation: "delete_raw_backup",
            status: "success"
        });
    } catch (error) {
        logger.error(`Failed to delete raw backup`, {
            operation: "delete_raw_backup",
            error: error.message,
            status: "failure",
            suggestion: "Please check the file permissions and try again."
        });
    }
};

export const compress_backup = async (backup_file) => {
    return new Promise((resolve, reject) => {
        const spinner = ora('Compressing backup...').start();
        const gzip = zlib.createGzip();
        const raw = fs.createReadStream(backup_file);
        const rawSize = filesize(fs.statSync(backup_file).size);
        const compressed = fs.createWriteStream(backup_file + '.gz');
        const start_time = Date.now();

        raw.pipe(gzip).pipe(compressed).on('finish', async () => {
            const compressedSize = filesize(fs.statSync(backup_file + '.gz').size);
            const end_time = Date.now();
            const duration = (end_time - start_time) / 1000;
            logger.info(`Backup compressed successfully`, {
                operation: "compress_backup",
                status: "success",
                file_size: `${compressedSize} (Original: ${rawSize})`,
                suggestion: "You can find the compressed backup at the same location with a .gz extension.",
                duration: `${duration.toFixed(3)} s`
            });

            const delete_raw_option = await select({
                message: 'Would you like to delete the raw backup file?',
                choices: [
                    { name: 'Yes', value: 'yes' },
                    { name: 'No', value: 'no' },
                ]
            });

            if (delete_raw_option === 'yes') {
                await delete_raw_backup(backup_file);
            }

            spinner.succeed('Backup Compressed Successfully! \nSaved at ' + backup_file + '.gz');
            resolve();
        }).on('error', (err) => {
            logger.error(`Failed to compress backup`, {
                operation: "compress_backup",
                error: err.message,
                status: "failure",
                suggestion: "Please check the file permissions and try again.",
                duration: `${((Date.now() - start_time) / 1000).toFixed(3)} s`
            });
            spinner.fail('Backup Compression Failed!');
            reject(err);
        });
    });
}