import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import path from "path";
import { logger } from "./logger.js";
import config from "../config.json" with { type: "json" };

export const uploadToS3 = async (backupFilePath) => {
    return new Promise(async (resolve, reject) => {
        if (!config.user.aws.allow_upload) {
            logger.info('S3 upload is disabled in the configuration. Skipping upload.', {
                operation: 'uploadToS3',
                suggestion: 'Enable S3 upload in the configuration to allow uploading backups to S3',
                status: 'skipped'
            });
            resolve();
        }
        const start_time = Date.now();
        const region = process.env.AWS_REGION;
        const s3Client = new S3Client({
            region: region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        const relativePath = path.relative(
            path.resolve("../backups"),
            backupFilePath
        );

        const s3Key = relativePath.replaceAll("\\", "/");
        try {
            await s3Client.send(
                new PutObjectCommand({
                    Bucket: config.user.aws.bucket_name,
                    Key: s3Key,
                    Body: fs.createReadStream(backupFilePath)
                })
            )
            logger.info('Backup uploaded to S3 successfully', {
                operation: 'uploadToS3',
                status: 'success',
                duration: Date.now() - start_time,
                suggestion: 'You can access the backup in your S3 bucket: ' + config.user.aws.bucket_name + '/' + s3Key
            });
            resolve();
        } catch (err) {
            logger.error(`Error uploading to S3`, {
                error: err,
                operation: 'uploadToS3',
                suggestion: 'Check the S3 configuration and permissions',
                status: 'failure'
            });
            reject(err);
        }
    });
}