export const JWT_STRATEGY_NAME = 'jwt';
export const JWT_EXPIRES_IN_SECONDS = Number(
  process.env.JWT_EXPIRES_IN_SECONDS ?? 3600,
);
export const JWT_SECRET =
  process.env.JWT_SECRET ?? 'issueflow-development-jwt-secret';
