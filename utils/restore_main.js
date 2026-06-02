import select, { Separator } from '@inquirer/select';
import { search } from '@inquirer/prompts';
import inquirer from 'inquirer';
import path from "node:path";
import fs from "fs";
import zlib from "zlib";
import { logger } from './logger.js';

export const restore_main = async (config, adapter) => {
    const start_time = Date.now();

    const selected_backup_file = await search({
        message: 'Select backup file to restore from: (Search by name)',
        source: async (input) => {

            const file_path = path.resolve("../backups/" + config.type + "/" + config.database);
            const backup_files = await fs.readdirSync(file_path);

            if(backup_files.length === 0) {
                logger.error(`No backup files found for database ${config.database}`, {
                    operation: "restore - select backup file",
                    status: "failure",
                    suggestion: "Please create a backup before attempting to restore."
                });
                process.exit(1);
            }

            if (!input) {
                return backup_files.toSorted().reverse().map(file => ({
                    name: file,
                    value: path.resolve(file_path + "/" + file)
                }));
            }

            const filtered_files = backup_files.filter(file => {
                return file.toLowerCase().includes(input.toLowerCase());
            });
            return filtered_files.toSorted().reverse().map(file => ({
                name: file,
                value: path.resolve(file_path + "/" + file)
            }));
        },
    });

    if (selected_backup_file.endsWith('.gz')) {
        // if file is compressed
        const gunzip = zlib.createGunzip();
        const newFile = selected_backup_file.replace('.gz', '');
        const input = fs.createReadStream(selected_backup_file);
        const output = fs.createWriteStream(newFile);
        input.pipe(gunzip).pipe(output);
        config.file = newFile;
    } else {
        // if file is not compressed
        config.file = selected_backup_file;
    }
    await adapter.restore(config);
    await fs.rmSync(config.file);
}