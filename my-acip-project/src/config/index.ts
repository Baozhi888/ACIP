// 应用配置
export const appConfig: Record<string, any> = {
  name: 'ACIP Example App',
  version: '0.1.0',
  description: 'An example application using ACIP SDK',
  port: process.env.APP_PORT || 3000,
  environment: process.env.NODE_ENV || 'development'
};

// AI模型配置
export const modelConfig: Record<string, any> = {
  defaultModelId: process.env.DEFAULT_MODEL_ID || 'gpt-4',
  fallbackModelId: 'gpt-3.5-turbo',
  maxTokens: 8192,
  temperature: 0.7,
  topP: 1,
  cacheEnabled: true,
  cacheTTL: 3600 // 1小时
};

// 安全配置
export const securityConfig: Record<string, any> = {
  contentModerationEnabled: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100 // 每个IP限制请求数
  }
};
