import colors from 'colors';
import { get_adapter } from './../adapters/get_adapter.js';
import { detect_db_type } from './../utils/detect_db.js';

export const backup_task = async (options) => {
    const inputs = {
        database: options.database,
        username: options.username,
        password: options.password,
        host: options.host || 'localhost',
        port: options.port || 5432
    };
    const db_type = await detect_db_type(inputs);

    if (db_type === null) {
        console.log(colors.error('Unable to connect to the database with the provided credentials. Please check your connection details and try again.'));
        process.exit(1);
    }
    inputs.type = db_type;
    const adapter = await get_adapter(db_type);
    adapter.backup(inputs);
}
