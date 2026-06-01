import ora from 'ora';
import pg from 'pg'
import { logger } from './logger.js';
import { MongoClient } from 'mongodb';

const { Client } = pg

const check_postgres_connection = async (config) => {
    let error_message;
    const postgres_client = new Client({
        user: config.username,
        host: config.host,
        database: config.database,
        password: config.password,
        port: config.port,
    });
    try {
        await postgres_client.connect();
        await postgres_client.query('SELECT 1');
    } catch (error) {
        error_message = error.message;
    } finally {
        if(postgres_client) {
            await postgres_client.end().catch(err => {
                logger.error('Failed to close PostgreSQL connection', {
                    operation: 'close_postgres_connection',
                    status: 'failure',
                    error: err.message,
                });
            });
        }
    }
    if (error_message) {
        return {
            success: false,
            error: error_message
        };
    }
    return {
        success: true,
        type: "postgres"
    };
}

const check_mongo_connection = async (config) => {
    let error_message;
    const mongo_client = new MongoClient(`mongodb://${config.host}:${config.port}`);
    try {
        await mongo_client.connect();
        await mongo_client.db().command({ ping: 1 });
    } catch (error) {
        error_message = error.message;
    } finally {
        if(mongo_client) await mongo_client.close().catch(err => {
            logger.error('Failed to close MongoDB connection', {
                operation: 'close_mongo_connection',
                status: 'failure',
                error: err.message,
            });
        });
    }
    if (error_message) {
        return {
            success: false,
            error: error_message
        };
    }
    return {
        success: true,
        type: "mongodb"
    };
}

export const detect_db_type = async (config) => {
    const validate_spinner = ora('Checking Database...').start();
    let error_message;
    const postgres_check = await check_postgres_connection(config);
    if (postgres_check.success) {
        validate_spinner.succeed('PostgreSQL Connection Verified!');
        return "postgres";
    }
    const mongo_check = await check_mongo_connection(config);
    if (mongo_check.success) {
        validate_spinner.succeed('MongoDB Connection Verified!');
        return "mongodb";
    }
    error_message = `${postgres_check.error} | ${mongo_check.error}`;
    logger.error('Unable to connect to the database with the provided credentials', {
        operation: "check_db",
        status: "failure",
        error: error_message,
        suggestion: "Please check your connection details and try again."
    });
    validate_spinner.fail('No database connection could be established!');
    return null;
}