import { program } from "commander";
import colors from 'colors';
import config from "../config.json" with { type: "json" };
import { detect_db_type } from "../utils/detect_db.js";
import { get_adapter } from "../adapters/get_adapter.js";
import { restore_main } from './../utils/restore_main.js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({
    path: path.resolve("../.env")
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
    .description("A CLI tool for managing your projects")
    .version("1.0.0");

program.command("backup")
    .description("Create a backup of your database")
    .version("1.0.0")
    .option("-d, --database <database>", "Name of the database to backup")
    .option("-u, --username <username>", "Username for the database")
    .option("-p, --password <password>", "Password for the database")
    .option("-H, --host <host>", "Host of the database")
    .option("-P, --port <port>", "Port of the database")
    .action(async (options) => {
        const inputs = config.user || {
            database: options.database,
            username: options.username,
            password: options.password,
            host: options.host || 'localhost',
            port: options.port || 5432
        };
        const db_type = await detect_db_type(inputs);
        console.log(colors.success(`Database type detected: ${db_type}`));

        if (db_type === null) {
            console.log(colors.error('Unable to connect to the database with the provided credentials. Please check your connection details and try again.'));
            process.exit(1);
        }
        inputs.type = db_type;
        const adapter = await get_adapter(db_type);
        adapter.backup(inputs);
    });

program.command("restore")
    .description("Restore your database from a backup")
    .version("1.0.0")
    .option("-d, --database <database>", "Name of the database to restore")
    .option("-u, --username <username>", "Username for the database")
    .option("-p, --password <password>", "Password for the database")
    .option("-H, --host <host>", "Host of the database")
    .option("-P, --port <port>", "Port of the database")
    // .option("-f, --file <file>", "Path to the backup file to restore from")
    .action(async (options) => {
        const inputs = config.user || {
            database: options.database,
            username: options.username,
            password: options.password,
            host: options.host || 'localhost',
            port: options.port || 5432,
            // file: options.file
        };
        const db_type = await detect_db_type(inputs);
        if (db_type === null) {
            console.log(colors.error('Unable to connect to the database with the provided credentials. Please check your connection details and try again.'));
            process.exit(1);
        }
        inputs.type = db_type;
        const adapter = await get_adapter(db_type);
        await restore_main(inputs, adapter);
    });

program.command("listdb")
    .description("List all available databases")
    .version("1.0.0")
    .action(() => {
        // logger.info("Listing all available databases...");
    });

program.parse();