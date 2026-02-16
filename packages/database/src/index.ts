// Auth DB
export { default as authDb } from './auth-db';
import * as usersQueries from './auth-db/queries/users.queries';
import * as refreshTokensQueries from './auth-db/queries/refresh-tokens.queries';
export { usersQueries, refreshTokensQueries };


// Messages DB
export { default as messagesDb } from './messages-db';
export * from './messages-db/queries';
