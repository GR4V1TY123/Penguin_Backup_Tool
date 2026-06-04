import cron from 'node-cron';
import config from "../config.json" with { type: "json" };
import { logger } from "../utils/logger.js";
import dotenv from 'dotenv';
import path from 'node:path';
import { backup_main } from './../utils/backup_main.js';
dotenv.config({
    path: path.resolve("../.env")
});

const schedule_backup = async () => {
    const temp_path = path.resolve("../backups");
    console.log(temp_path);
    const options = config.user.options.cron;
    console.log(options);
    if(!options.enabled) return;
    cron.schedule(options.schedule, async () => {
        logger.info(`Scheduled backup started`, {
            operation: "scheduled_backup",
            status: "started",
        });
        try {
            await backup_main(options);
            logger.info(`Scheduled backup completed successfully`, {
                operation: "scheduled_backup",
                status: "success",
            });
        } catch (error) {
            logger.error(`Scheduled backup failed`, {
                operation: "scheduled_backup",
                error: error.message,
                status: "failure",
                suggestion: "Please check the backup configuration and try again."
            });
        }
    });
}

schedule_backup();