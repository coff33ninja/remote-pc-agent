// Configuration management and validation
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Configuration schema with validation rules
const configSchema = {
  // Server
  PORT: {
    type: 'number',
    default: 3000,
    required: false,
    description: 'Server port number'
  },
  
  // Agent Authentication
  AGENT_TOKEN: {
    type: 'string',
    required: true,
    description: 'Token for agent authentication'
  },
  
  // JWT Authentication
  JWT_SECRET: {
    type: 'string',
    required: true,
    minLength: 32,
    description: 'Secret key for JWT token generation (min 32 characters)'
  },
  JWT_EXPIRES_IN: {
    type: 'string',
    default: '24h',
    required: false,
    description: 'JWT token expiration time'
  },
  
  // Gemini AI
  GEMINI_API_KEY: {
    type: 'string',
    required: true,
    description: 'Google Gemini API key'
  },
  GEMINI_MODEL: {
    type: 'string',
    default: 'gemini-2.0-flash-exp',
    required: false,
    description: 'Gemini model to use'
  },
  
  // HTTPS/WSS
  ENABLE_HTTPS: {
    type: 'boolean',
    default: false,
    required: false,
    description: 'Enable HTTPS and WSS'
  },
  SSL_KEY_PATH: {
    type: 'string',
    required: false,
    requiredIf: 'ENABLE_HTTPS',
    description: 'Path to SSL private key file'
  },
  SSL_CERT_PATH: {
    type: 'string',
    required: false,
    requiredIf: 'ENABLE_HTTPS',
    description: 'Path to SSL certificate file'
  },
  
  // Command Execution
  REQUIRE_CONFIRMATION: {
    type: 'boolean',
    default: false,
    required: false,
    description: 'Require confirmation before executing commands'
  },
  COMMAND_TIMEOUT: {
    type: 'number',
    default: 30000,
    required: false,
    description: 'Command execution timeout in milliseconds'
  }
};

// Validate configuration
export function validateConfig() {
  const errors = [];
  const warnings = [];
  const config = {};

  for (const [key, schema] of Object.entries(configSchema)) {
    const value = process.env[key];
    
    // Check required fields
    if (schema.required && !value) {
      errors.push(`Missing required configuration: ${key} - ${schema.description}`);
      continue;
    }
    
    // Check conditional requirements
    if (schema.requiredIf && process.env[schema.requiredIf] === 'true' && !value) {
      errors.push(`${key} is required when ${schema.requiredIf} is enabled - ${schema.description}`);
      continue;
    }
    
    // Use default if not provided
    if (!value && schema.default !== undefined) {
      config[key] = schema.default;
      continue;
    }
    
    // Type validation
    if (value) {
      switch (schema.type) {
        case 'number':
          const num = parseInt(value);
          if (isNaN(num)) {
            errors.push(`${key} must be a number`);
          } else {
            config[key] = num;
          }
          break;
          
        case 'boolean':
          config[key] = value === 'true';
          break;
          
        case 'string':
          config[key] = value;
          
          // Check minimum length
          if (schema.minLength && value.length < schema.minLength) {
            errors.push(`${key} must be at least ${schema.minLength} characters`);
          }
          break;
      }
    }
  }
  
  // Additional validations
  
  // Check SSL files exist if HTTPS enabled
  if (config.ENABLE_HTTPS) {
    if (config.SSL_KEY_PATH && !fs.existsSync(config.SSL_KEY_PATH)) {
      errors.push(`SSL key file not found: ${config.SSL_KEY_PATH}`);
    }
    if (config.SSL_CERT_PATH && !fs.existsSync(config.SSL_CERT_PATH)) {
      errors.push(`SSL certificate file not found: ${config.SSL_CERT_PATH}`);
    }
  }
  
  // Check JWT secret strength
  if (config.JWT_SECRET && config.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters for better security');
  }
  
  // Check if using default agent token
  if (config.AGENT_TOKEN === 'your_secure_token_here') {
    warnings.push('Using default AGENT_TOKEN - change this in production!');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

// Get configuration with defaults
export function getConfig() {
  const result = validateConfig();
  
  if (!result.valid) {
    console.error('Configuration errors:');
    result.errors.forEach(err => console.error(`  ❌ ${err}`));
    throw new Error('Invalid configuration');
  }
  
  if (result.warnings.length > 0) {
    console.warn('Configuration warnings:');
    result.warnings.forEach(warn => console.warn(`  ⚠ ${warn}`));
  }
  
  return result.config;
}

// Get configuration documentation
export function getConfigDocs() {
  const docs = {};
  
  for (const [key, schema] of Object.entries(configSchema)) {
    docs[key] = {
      type: schema.type,
      required: schema.required || false,
      default: schema.default,
      description: schema.description
    };
  }
  
  return docs;
}

// Print configuration status
export function printConfigStatus() {
  const result = validateConfig();
  
  console.log('\n=== Configuration Status ===\n');
  
  if (result.valid) {
    console.log('✓ Configuration is valid\n');
  } else {
    console.log('✗ Configuration has errors\n');
  }
  
  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach(err => console.log(`  ❌ ${err}`));
    console.log();
  }
  
  if (result.warnings.length > 0) {
    console.log('Warnings:');
    result.warnings.forEach(warn => console.log(`  ⚠ ${warn}`));
    console.log();
  }
  
  console.log('Current Configuration:');
  for (const [key, value] of Object.entries(result.config)) {
    const masked = ['JWT_SECRET', 'GEMINI_API_KEY', 'AGENT_TOKEN'].includes(key);
    const displayValue = masked ? '***' : value;
    console.log(`  ${key}: ${displayValue}`);
  }
  console.log('\n============================\n');
}
