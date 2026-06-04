# Penguin Database Backup Utility

A cross-database backup and recovery CLI built with Node.js for PostgreSQL and MongoDB.

Penguin provides a unified workflow for creating backups, restoring databases, compressing backup files, uploading backups to AWS S3, scheduling automated backups, and sending email notifications.

---

## Features

### Backup & Restore

- Create PostgreSQL backups
- Create MongoDB backups
- Restore databases from backup files
- Automatic timestamp-based backup naming
- Support for compressed backup files

### Safe Restore Workflow

- Restore backups into a temporary database
- Compare restored data with the existing database
- Review differences before applying changes
- Rollback support through temporary database validation

### Compression

- Compress backup files using Gzip
- Optional removal of raw backup files after compression
- Reduced storage requirements

### AWS S3 Integration

- Upload backups directly to an AWS S3 bucket
- Preserve backup directory structure in cloud storage
- Optional upload configuration

### Email Notifications

- Send email notifications after backup operations
- Success and failure status reporting

### Scheduled Backups

- Automated backup execution using cron schedules
- Configurable backup intervals through configuration files

### Logging

- Structured logging using Winston
- Operation status tracking
- Error logging
- Backup and restore duration tracking

### Multi-Database Support

- PostgreSQL
- MongoDB
- Adapter-based architecture for future database support

---

## Supported Databases

| Database   | Backup | Restore |
| ---------- | ------ | ------- |
| PostgreSQL | ✅ | ✅ |
| MongoDB    | ✅ | ✅ |

---

## Installation

### Clone the repository

```bash
git clone https://github.com/GR4V1TY123/Penguin_Backup_Tool.git

cd penguin
```

### Install dependencies

```bash
npm install
```

### Install required database tools

#### PostgreSQL

Install PostgreSQL and ensure the following commands are available in your system PATH:

```bash
pg_dump
pg_restore
psql
```

#### MongoDB

Install MongoDB Database Tools and ensure the following commands are available in your system PATH:

```bash
mongodump
mongorestore
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY

EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

---

## Configuration

Example configuration:

```json
{
  "user": {
    "username": "postgres",
    "password": "password",
    "host": "localhost",
    "port": 5432,
    "database": "Office",

    "aws": {
      "allow_upload": true,
      "bucket_name": "penguin-backups"
    },

    "options": {
      "notification": {
        "enabled": true,
        "email": "example@gmail.com"
      },

      "delete_raw_file": true,

      "cron": {
        "enabled": true,
        "schedule": "0 0 * * *"
      }
    }
  }
}
```

---

## Usage

### Create a Backup

```bash
node index.js backup
```

Or provide connection details:

```bash
node index.js backup \
-u postgres \
-p password \
-H localhost \
-P 5432 \
-d Office
```

---

### Restore a Backup

```bash
node index.js restore
```

Or provide connection details:

```bash
node index.js restore \
-u postgres \
-p password \
-H localhost \
-P 5432 \
-d Office
```

---

## Backup Structure

### PostgreSQL

```text
backups/
└── postgres/
    └── Office/
        └── postgres_Office_20260604T142733.sql.gz
```

### MongoDB

```text
backups/
└── mongodb/
    └── world/
        └── world_20260604T142733.archive.gz
```

---

## Safe Restore Workflow

```text
Current Database
        │
        ▼
Create Temporary Database
        │
        ▼
Restore Backup
        │
        ▼
Compare Databases
        │
        ▼
User Confirmation
        │
 ┌──────┴──────┐
 ▼             ▼
Proceed     Rollback
 ▼             ▼
Apply       Delete Temp DB
Restore
```

---

## Technologies Used

- Node.js
- Commander
- PostgreSQL
- MongoDB
- Winston
- Inquirer
- Ora
- AWS SDK
- Nodemailer
- node-cron
- Child Process API
- Gzip Compression

---

## Future Improvements

- MySQL Support
- SQLite Support
- Backup Encryption
- Backup Integrity Verification
- Differential Backups

---

## License

MIT License
