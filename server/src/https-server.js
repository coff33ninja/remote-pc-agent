import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createHttpsServer(app) {
  const enableHttps = process.env.ENABLE_HTTPS === 'true';
  
  if (!enableHttps) {
    return null;
  }

  const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, '../certs/server-key.pem');
  const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, '../certs/server-cert.pem');

  // Check if certificate files exist
  if (!fs.existsSync(keyPath)) {
    console.error(`✗ SSL key file not found: ${keyPath}`);
    console.error('  Run: node generate-certs.js');
    process.exit(1);
  }

  if (!fs.existsSync(certPath)) {
    console.error(`✗ SSL certificate file not found: ${certPath}`);
    console.error('  Run: node generate-certs.js');
    process.exit(1);
  }

  try {
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };

    const server = https.createServer(options, app);
    console.log('✓ HTTPS server configured');
    console.log(`  Key: ${keyPath}`);
    console.log(`  Cert: ${certPath}`);
    
    return server;
  } catch (error) {
    console.error('✗ Failed to create HTTPS server:', error.message);
    process.exit(1);
  }
}

export function getServerProtocol() {
  return process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
}

export function getWebSocketProtocol() {
  return process.env.ENABLE_HTTPS === 'true' ? 'wss' : 'ws';
}
