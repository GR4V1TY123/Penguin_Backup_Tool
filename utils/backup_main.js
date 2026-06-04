import colors from 'colors';
import { get_adapter } from '../adapters/get_adapter.js';
import { detect_db_type } from './detect_db.js';
import config from "../config.json" with { type: "json" };
import { send_email } from './mailer.js';

export const backup_main = async (options) => {
    const inputs = config.user ||{
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
    await adapter.backup(inputs);
    await send_email({
        to: inputs.options.notification.email,
        subject: `Backup Created for ${inputs.database}`,
        text: `A backup of your database ${inputs.database} has been created successfully.`
    });
}
