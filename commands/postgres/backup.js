import { spawn } from "node:child_process";
import ora from "ora";
import select, { Separator } from '@inquirer/select';
import inquirer from 'inquirer';
import { compress_backup } from "../../utils/compress.js";
import path from "node:path";
import { logger } from "../../utils/logger.js";
import fs from "fs";
import { run_process } from "../../utils/run_process.js";
import {filesize, partial} from "filesize";
import { uploadToS3 } from "../../utils/s3_upload.js";

const make_backup = async (config, backup_location, file_type, backup_spinner) => {
    try {
        const start_time = Date.now();
        return run_process('pg_dump', [
            "-U", config.username,
            "-h", config.host,
            "-p", config.port,
            "-F", file_type === '.sql' ? 'p' : 'c',
            "-f", backup_location,
            config.database
        ], {
            env: {
                ...process.env,
                PGPASSWORD: config.password
            }
        })
        const end_time = Date.now();
        const duration = (end_time - start_time) / 1000;
        logger.info('Backup created successfully', {
            operation: "backup",
            status: "success",
            file_size: `${filesize(fs.statSync(backup_location).size)}`,
            suggestion: "You can find the backup at " + backup_location,
            duration: `${duration.toFixed(3)} s`
        });
    } catch (err) {
        logger.error(`Failed to create backup`, {
            operation: "backup",
            error: err.message,
            status: "failure",
            suggestion: "Please check your database connection and try again."
        });
        backup_spinner.fail('Backup Failed!');
        throw err;
    }
}

const make_backup_directory = (config) => {
    try {
        return run_process('mkdir', ['-p', path.resolve(`../backups/${config.type}/${config.database}`)]);
    } catch (err) {
        logger.error(`Failed to create backup directory`, {
            operation: "backup - make backup directory",
            error: err.message,
            status: "failure",
            suggestion: "Please check your file system permissions and try again."
        });
        throw err;
    }
}
export const backup_cmd = async (config) => {

    const backup_spinner = ora('Creating Backup of ' + config.database + '...').start();
    const file_type = config.options.backup_file_type[config.type] || '.dump';

    const backup_path = path.resolve(`../backups/${config.type}/${config.database}`);

    await make_backup_directory(config);

    const backup_location = `${backup_path}\\${config.username}_${config.database}_${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '')}${file_type}`;
    await make_backup(config, backup_location, file_type, backup_spinner);
    backup_spinner.succeed('Backup Created Successfully!');
    await compress_backup(backup_location);
    await uploadToS3(backup_location + '.gz');
};