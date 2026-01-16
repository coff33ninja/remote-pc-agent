import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

export function createLogger() {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.simple()
      }),
      new winston.transports.File({ 
        filename: process.env.LOG_FILE || './logs/agent.log' 
      })
    ]
  });
}
