# Database backup

A separate private repo runs the daily database backup. It is not in this repo, so its run logs and its files stay private.

Each day, the job dumps the database, checks that the dump restores, and encrypts it with `age`. It keeps each encrypted file for 30 days.

The dump holds the database only. Storage files, such as photos and voice audio, are not in it. Vault rows stay as ciphertext.

The owner keeps the private key outside Habi. If the database is lost, the Vault is lost too, so the key must not live there. Without the private key, no backup can be read.

The private repo has the secrets and the restore steps.
