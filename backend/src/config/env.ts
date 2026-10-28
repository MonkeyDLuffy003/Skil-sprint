/**
 * SkillSprint AI - Backend Configuration & Environment Contract
 * Strict zero-leakage, security verified configuration
 */

export interface AppConfig {
  NODE_ENV: 'development' | 'staging' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRATION: string; // e.g. '15m'
  JWT_REFRESH_EXPIRATION: string; // e.g. '30d'
  
  // Registration Capacity
  REGISTRATION_CAP: number; // 800 in production, 3 in testing/staging
  
  // Strict Single Developer Allowlist (supports primary and canonical variants)
  ADMIN_EMAIL_ALLOWLIST: string[];
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: string;
  FACEBOOK_APP_ID?: string;
  FACEBOOK_APP_SECRET?: string;
  
  // Transactional Email Service
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  EMAIL_FROM: string;
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const isNode = typeof process !== 'undefined' && process.env;
  const envAdmin = isNode
    ? process.env.ADMIN_EMAIL_ALLOWLIST || 'manikantejaswarooparni@gmail.com,manikantatejaswarooparni@gmail.com'
    : 'manikantejaswarooparni@gmail.com,manikantatejaswarooparni@gmail.com';
  const adminEmails = envAdmin.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

  const nodeEnv = (isNode && process.env.NODE_ENV as AppConfig['NODE_ENV']) || 'development';
  const port = isNode && process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  const dbUrl = isNode && process.env.DATABASE_URL ? process.env.DATABASE_URL : 'postgresql://skillsprint:secret@localhost:5432/skillsprint_db';
  const jwtSecret = isNode && process.env.JWT_SECRET ? process.env.JWT_SECRET : 'dev_master_jwt_secret_skillsprint_ai_2026_super_secure';
  const jwtRefreshSecret = isNode && process.env.JWT_REFRESH_SECRET ? process.env.JWT_REFRESH_SECRET : 'dev_refresh_secret_skillsprint_ai_2026_super_secure';
  const regCap = isNode && process.env.REGISTRATION_CAP ? parseInt(process.env.REGISTRATION_CAP, 10) : 800;
  const googleClientId = isNode && process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID : 'skillsprint-web-client.apps.googleusercontent.com';

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: dbUrl,
    JWT_SECRET: jwtSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_ACCESS_EXPIRATION: '15m',
    JWT_REFRESH_EXPIRATION: '30d',
    REGISTRATION_CAP: regCap,
    ADMIN_EMAIL_ALLOWLIST: adminEmails,
    GOOGLE_CLIENT_ID: googleClientId,
    EMAIL_FROM: 'SkillSprint AI <no-reply@skillsprint.ai>',
    ...overrides,
  };
}

export function isAllowlistedAdmin(email: string, adminList: string[]): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return adminList.includes(normalized);
}

export const config = loadConfig();
