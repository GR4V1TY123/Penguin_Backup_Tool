import select, { Separator } from '@inquirer/select';
import { search } from '@inquirer/prompts';
import inquirer from 'inquirer';
import path from "node:path";
import { logger } from "../../utils/logger.js";
import fs from "fs";
import zlib from "zlib";
import { MongoClient } from 'mongodb';
import ora from 'ora';
import { run_process } from '../../utils/run_process.js';

// 1. Create temp db and restore backup to temp db
// 2. Compare temp db with original db and show differences to user
// 3. Ask user if they want to proceed with restore or rollback to old db
// 4. If user wants to proceed, restore backup to original db and drop temp db
// 5. If user wants to rollback, drop temp db and keep original db as is

const compare_databases = async (config, temp_db_name, client) => {
    try {
        const old_db_collections = await client.db(config.database).listCollections().toArray();
        const temp_db_collections = await client.db(temp_db_name).listCollections().toArray();

        console.log('Old db collections:', old_db_collections.map(col => col.name));
        console.log('Temp db collections:', temp_db_collections.map(col => col.name));

        const old_collections = old_db_collections.map(col => col.name);
        const temp_collections = temp_db_collections.map(col => col.name);

        const differences = {
            old_collections: old_collections,
            temp_collections: temp_collections,
            common_collections: old_collections.filter(col => temp_collections.includes(col)),
            collection_differences: []
        }

        await Promise.all(differences.common_collections.map(async (col) => {
            const temp_rows = await client.db(temp_db_name).collection(col).countDocuments();
            const old_rows = await client.db(config.database).collection(col).countDocuments();
            if (Number(temp_rows) !== Number(old_rows)) {
                differences.collection_differences.push({
                    collection: col,
                    old_count: Number(old_rows),
                    temp_count: Number(temp_rows)
                });
            }
        })
        );


        if (differences.collection_differences.length > 0 || differences.old_collections.length !== differences.temp_collections.length) {
            console.log(`Collection document count differences: ${differences.collection_differences.map(diff => `${diff.collection} | OLD count: ${diff.old_count} | NEW count: ${diff.temp_count}`).join(', ') || 'None'}`.yellow);
            logger.info('Database comparison results', {
                operation: 'compare_databases for mongodb',
                status: 'success',
                message: `Collection document count differences: ${differences.collection_differences.map(diff => `${diff.collection} | OLD count: ${diff.old_count} | NEW count: ${diff.temp_count}`).join(', ') || 'None'}`
            });
        } else {
            console.log('No differences found between old and temp databases');
            logger.info('Database comparison results', {
                operation: 'compare_databases for mongodb',
                status: 'success',
                message: 'No differences found between old and temp databases document counts'
            });
        }
    } catch (err) {
        logger.error('Failed to compare databases', {
            status: 'failure',
            operation: 'compare_databases for mongodb',
            error: err.message,
        });
        throw err;
    }
};


const delete_db = async (config, client) => {
    try {
        await client.db(config.database).dropDatabase();
    } catch (err) {
        logger.error(`Failed to delete ${config.database} database`, {
            status: 'failure',
            operation: 'delete_old_db',
            error: err.message,
        });
        throw err;
    }
};

const restore_to_original_db = async (config, temp_db_name) => {
    try {
        return await run_process('mongorestore', [
            "--host", config.host,
            "--port", config.port,
            "--db", config.database,
            "--archive=" + config.file,
        ]);

    } catch (err) {
        logger.error(`Failed to restore to original database ${config.database}`, {
            status: 'failure',
            operation: 'restore_to_original_db',
            error: err.message,
        });
        throw err;
    }
};

const create_and_restore_to_temp_db = async (config, temp_db_name) => {
    try {
        return await run_process('mongorestore', [
            "--host", config.host,
            "--port", config.port,
            "--archive=" + config.file,
            `--nsFrom=${config.database}.*`,
            `--nsTo=${temp_db_name}.*`,
        ]);
    } catch (err) {
        logger.error('Failed to create and restore to temp database', {
            status: 'failure',
            operation: 'create_and_restore_to_temp_db for mongodb',
            error: err.message,
        });
        throw err;
    }
}

export const restore_cmd = async (config) => {
    const restore_spinner = ora('Restoring Backup to ' + config.database + ' via Safe Restore...').start();
    const backup_file = config.file;
    const temp_db_name = `${config.database}_temp_${Date.now()}`;
    const original_db_name = config.database;

    const client = new MongoClient(`mongodb://${config.host}:${config.port}`);
    await client.connect();

    await create_and_restore_to_temp_db(config, temp_db_name);
    await compare_databases(config, temp_db_name, client);
    const option = await select({
        message: 'What would you like to do?',
        choices: [
            { name: 'Proceed with restore', value: 'proceed' },
            { name: 'Rollback to old database', value: 'rollback' },
        ]
    });

    if (option === 'proceed') {
        await delete_db(config, client);
        await restore_to_original_db(config, temp_db_name);
        restore_spinner.info('Restored backup to ' + config.database + ' successfully');
        config.database = temp_db_name;
        await delete_db(config, client);
    } else {
        config.database = temp_db_name;
        await delete_db(config, client);
        restore_spinner.info('Rolled back to old database successfully');
    }
    await client.close();
}
