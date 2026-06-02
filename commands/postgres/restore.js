import ora from "ora";
import path from "node:path";
import { spawn } from "node:child_process";
import { logger } from "../../utils/logger.js";
import fs from "fs";
import select, { Separator } from '@inquirer/select';
import pg from 'pg'
import { run_process } from '../../utils/run_process.js';

const { Pool, Client } = pg

// steps:
// 1. Create temp db
// 2. Restore backup to temp db
// 3. rename temp db to old db name and compare the differences, and confirm with user if they want to keep the changes or rollback to old db by dropping temp db and keeping old db as is

const compare_databases = async (config, temp_db_name) => {
    const client = new Client({
        user: config.username,
        host: config.host,
        database: config.database,
        password: config.password,
        port: config.port,
    });
    await client.connect();

    const temp_client = new Client({
        user: config.username,
        host: config.host,
        database: temp_db_name,
        password: config.password,
        port: config.port,
    });
    await temp_client.connect();
    try {

        const old_db_tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        `);

        const temp_db_tables = await temp_client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        `);

        console.log('Old db tables:', old_db_tables.rows.map(row => row.table_name));
        console.log('Temp db tables:', temp_db_tables.rows.map(row => row.table_name));

        const old_tables = old_db_tables.rows.map(row => row.table_name);
        const temp_tables = temp_db_tables.rows.map(row => row.table_name);

        const differences = {
            old_tables: old_tables,
            temp_tables: temp_tables,
            common_tables: old_tables.filter(table => temp_tables.includes(table)),
            table_differences: []
        }

        await Promise.all(differences.common_tables.map(async (table) => {
            const temp_rows = await temp_client.query(`
                SELECT COUNT(*) AS count FROM "${table}";
            `);
            const old_rows = await client.query(`
                SELECT COUNT(*) AS count FROM "${table}";
            `);
            if (Number(temp_rows.rows[0].count) !== Number(old_rows.rows[0].count)) {
                differences.table_differences.push({
                    table,
                    old_count: Number(old_rows.rows[0].count),
                    temp_count: Number(temp_rows.rows[0].count)
                });
            }
        })
        );


        if (differences.table_differences.length > 0 || differences.old_tables.length !== differences.temp_tables.length) {
            console.log(`Table row count differences: ${differences.table_differences.map(diff => `${diff.table} | OLD count: ${diff.old_count} | NEW count: ${diff.temp_count}`).join(', ') || 'None'}`.yellow);
            logger.info('Database comparison results', {
                operation: 'compare_databases',
                status: 'success',
                message: `Table row count differences: ${differences.table_differences.map(diff => `${diff.table} | OLD count: ${diff.old_count} | NEW count: ${diff.temp_count}`).join(', ') || 'None'}`
            });
        } else {
            console.log('No differences found between old and temp databases');
            logger.info('Database comparison results', {
                operation: 'compare_databases',
                status: 'success',
                message: 'No differences found between old and temp databases row counts'
            });
        }
    } catch (err) {
        logger.error('Failed to compare databases', {
            status: 'failure',
            operation: 'compare_databases',
            error: err.message,
        });
        throw err;
    } finally {
        await client.end();
        await temp_client.end();
    }
};

const delete_db = async (config) => {
    try {
        return await run_process('dropdb', [
            config.database,
            "-U", config.username,
            "-h", config.host,
            "-p", config.port,
            "-f"
        ], {
            env: {
                ...process.env,
                PGPASSWORD: config.password
            }
        });
    } catch (err) {
        logger.error(`Failed to delete ${config.database} database`, {
            status: 'failure',
            operation: 'delete_old_db',
            error: err.message,
        });
        throw err;
    }
};

const create_temp_db = async (config, temp_db_name) => {
    try {
        return await run_process('createdb', [
            temp_db_name,
            "-U", config.username,
            "-h", config.host,
            "-p", config.port
        ], {
            env: {
                ...process.env,
                PGPASSWORD: config.password
            }
        });
    } catch (err) {
        logger.error('Failed to create temp database', {
            status: 'failure',
            operation: 'create_temp_db',
            error: err.message,
        });
        throw err;
    }
};

const restore_to_temp_db = async (config, temp_db_name, cmd, spinner) => {
    const file_type = path.extname(config.file);
    const start_time = Date.now();
    const psql_args = ["-U", config.username, "-h", config.host, "-p", config.port, "-d", temp_db_name, "-f", config.file];
    const pg_restore_args = ["-U", config.username, "-h", config.host, "-p", config.port, "-d", temp_db_name, config.file];
    await run_process(cmd, [
        ...cmd === "psql" ? psql_args : pg_restore_args
    ], {
        env: {
            ...process.env,
            PGPASSWORD: config.password
        }
    }).catch(err => {
        logger.error('Failed to restore backup to temp database', {
            status: 'failure',
            operation: 'restore_to_temp_db',
            duration: `${((Date.now() - start_time) / 1000).toFixed(3)} s`,
            error: err.message,
        });
        spinner.fail('Failed to restore backup to temp database');
        throw err;
    }).then(() => {
        spinner.succeed('Backup restored to temp database successfully in ' + ((Date.now() - start_time) / 1000).toFixed(3) + ' seconds!');
    });
    logger.info('Backup restored to temp database successfully', {
        status: 'success',
        operation: 'restore_to_temp_db',
        duration: `${((Date.now() - start_time) / 1000).toFixed(3)} s`
    });
};

const rename_temp_db = async (config, temp_db_name) => {
    try {
        return await run_process('psql', [
            "-U", config.username,
            "-h", config.host,
            "-p", config.port,
            "-d", "postgres",
            "-c", `ALTER DATABASE "${temp_db_name}" RENAME TO "${config.database}";`
        ], {
            env: {
                ...process.env,
                PGPASSWORD: config.password
            }
        });
    } catch (err) {
        logger.error('Failed to rename temp database to old database name', {
            status: 'failure',
            operation: 'rename_temp_db',
            error: err.message,
        });
        throw err;
    }
};

export const restore_cmd = async (config) => {
    const restore_spinner = ora('Restoring Backup to ' + config.database + ' via Safe Restore...').start();

    const file_type = path.extname(config.file);
    let cmd;
    if (file_type === '.sql') {
        cmd = "psql"
    } else if (file_type === '.dump') {
        cmd = "pg_restore";
    }
    const temp_db_name = config.database + '_temp_' + Date.now();
    await create_temp_db(config, temp_db_name);
    await restore_to_temp_db(config, temp_db_name, cmd, restore_spinner);
    await compare_databases(config, temp_db_name);
    const option = await select({
        message: 'What would you like to do?',
        choices: [
            { name: 'Proceed with restore', value: 'proceed' },
            { name: 'Rollback to old database', value: 'rollback' },
        ]
    });

    if (option === 'proceed') {
        await delete_db(config);
        await rename_temp_db(config, temp_db_name);
        restore_spinner.info('Switched to new database successfully');
    } else {
        config.database = temp_db_name;
        await delete_db(config);
        restore_spinner.info('Rolled back to old database successfully');
    }
}