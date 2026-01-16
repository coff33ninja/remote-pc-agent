// Generate self-signed certificates for development/testing
// For production, use proper certificates from Let's Encrypt or a CA

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certsDir = path.join(__dirname, 'certs');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const keyPath = path.join(certsDir, 'server-key.pem');
const certPath = path.join(certsDir, 'server-cert.pem');

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✓ Certificates already exist');
  console.log(`  Key: ${keyPath}`);
  console.log(`  Cert: ${certPath}`);
  process.exit(0);
}

console.log('Generating self-signed certificates...');
console.log('');

try {
  // Generate private key and certificate
  const command = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`;
  
  execSync(command, { stdio: 'inherit' });
  
  console.log('');
  console.log('✓ Certificates generated successfully!');
  console.log(`  Key: ${keyPath}`);
  console.log(`  Cert: ${certPath}`);
  console.log('');
  console.log('⚠ WARNING: These are self-signed certificates for development only!');
  console.log('  For production, use proper certificates from Let\'s Encrypt or a CA.');
  console.log('');
  console.log('To use HTTPS/WSS, set in your .env:');
  console.log('  ENABLE_HTTPS=true');
  console.log('  SSL_KEY_PATH=./certs/server-key.pem');
  console.log('  SSL_CERT_PATH=./certs/server-cert.pem');
  
} catch (error) {
  console.error('');
  console.error('✗ Failed to generate certificates');
  console.error('');
  console.error('Make sure OpenSSL is installed:');
  console.error('  Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
  console.error('  Linux: sudo apt-get install openssl');
  console.error('  macOS: brew install openssl');
  console.error('');
  console.error('Or manually create certificates using:');
  console.error(`  openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes`);
  process.exit(1);
}
