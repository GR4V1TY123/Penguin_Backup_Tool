import { backup_task } from "../cli/backup_task.js";
import cron from 'node-cron';
import config from "../config.json" with { type: "json" };
import { logger } from "../utils/logger.js";
import dotenv from 'dotenv';
import path from 'node:path';
dotenv.config({
    path: path.resolve("../.env")
});

const schedule_backup = async () => {
    const options = config.user.options.cron;
    console.log(options);
    if(!options.enabled) return;
    cron.schedule(options.schedule, async () => {
        console.log('Running scheduled backup...');
        try {
            await backup_task(options);
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