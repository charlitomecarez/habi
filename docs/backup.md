# Database backup

`.github/workflows/backup.yml` runs each day at about 3:10 AM in Manila. It dumps the database, restores the dump into an empty Postgres on the runner, compares the row count of each `public` table, encrypts the dump with `age`, and stores the file as a GitHub artifact for 30 days.

The dump holds the database only. Storage files, such as photos and voice audio, are not in it. Vault rows stay as ciphertext.

## Secrets

These two GitHub Actions secrets are the only backup secrets. Neither goes in `.env`.

| Secret                  | Value                                                 |
| ----------------------- | ----------------------------------------------------- |
| `BACKUP_DB_URL`         | The session pooler connection string, with a password |
| `BACKUP_AGE_PUBLIC_KEY` | The `age` public key                                  |

Charli keeps the private key outside Habi. If the database is lost, the Vault is lost too, so the key must not live there. Without the private key, no backup can be read.

## Restore

1. Download the artifact from the run in GitHub Actions.
2. Decrypt it: `age --decrypt --identity <key file> --output backup.dump <file>.dump.age`.
3. Restore it into the target database with `pg_restore --no-owner --no-privileges`.
