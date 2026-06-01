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

const make_backup = async (config, backup_location, backup_spinner, backup_path, file_name) => {
    try {
        const start_time = Date.now();
        await run_process('mongodump', [
            "--host", config.host,
            "--port", config.port,
            "--db", config.database,
            "--archive=" + backup_location,
            "--gzip"
        ]);
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

export const backup_cmd = async (config) => {
    const backup_spinner = ora('Creating backup...').start();
    const backup_path = path.resolve(`../backups/${config.type}/${config.database}`);

    await make_backup_directory(config, backup_path);
    const file_name = `${config.database}_${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '')}${'.archive.gz'}`;
    const backup_location = path.join(backup_path, file_name);
    await make_backup(config, backup_location, backup_spinner, backup_path, file_name);
    backup_spinner.succeed('Backup Created Successfully!');
}