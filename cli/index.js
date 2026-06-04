import { program } from "commander";
import colors from 'colors';
import config from "../config.json" with { type: "json" };
import { detect_db_type } from "../utils/detect_db.js";
import { get_adapter } from "../adapters/get_adapter.js";
import { restore_main } from './../utils/restore_main.js';
import dotenv from 'dotenv';
import path from 'node:path';
import cron from 'node-cron';
import { backup_main } from '../utils/backup_main.js';

dotenv.config({
    path: path.resolve("../.env"),
    quiet: true
});

colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    success: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    info: 'blue',
    error: 'red'
});

program
    .name("penguin")
    .description(
        "Cross-database backup & recovery CLI with safe restore support."
    )
    .version("1.0.0")
    .addHelpText(
        "beforeAll",
        `
${"🐧 Penguin Database Backup Utility".success}

${"Features".help}
  • Backup & Restore
  • PostgreSQL Support
  • MongoDB Support
  • Compression (.gz)
  • AWS S3 Uploads
  • Email Notifications
  • Scheduled Backups (Cron)
  • Safe Restore & Rollback

${"Examples".help}
  penguin backup
  penguin restore
  penguin backup -d world -u postgres -H localhost -P 5432
`
    );

program.command("backup")
    .description("Create a compressed backup of a PostgreSQL or MongoDB database")
    .version("1.0.0")
    .option("-d, --database <database>", "Name of the database to backup")
    .option("-u, --username <username>", "Username for the database")
    .option("-p, --password <password>", "Password for the database")
    .option("-H, --host <host>", "Host of the database")
    .option("-P, --port <port>", "Port of the database")
    .action(async (options) => {
        await backup_main(options);
    });

program.command("restore")
    .description("Restore a database from an existing backup")
    .version("1.0.0")
    .option("-d, --database <database>", "Name of the database to restore")
    .option("-u, --username <username>", "Username for the database")
    .option("-p, --password <password>", "Password for the database")
    .option("-H, --host <host>", "Host of the database")
    .option("-P, --port <port>", "Port of the database")
    .action(async (options) => {
        await restore_main(options);
    });

program.command("listdb")
    .description("List all available databases")
    .version("1.0.0")
    .action(() => {
        // logger.info("Listing all available databases...");
    });

program.parse();