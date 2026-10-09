// Password hashing and database writes need more time than identity/CSRF reads.
export const AUTH_READ_TIMEOUT_MS = 5000;
export const AUTH_WRITE_TIMEOUT_MS = 15000;
export const AUTH_CLIENT_READ_TIMEOUT_MS = 10000;
export const AUTH_CLIENT_WRITE_TIMEOUT_MS = 20000;
