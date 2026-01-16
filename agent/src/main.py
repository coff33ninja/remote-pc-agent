import asyncio
import websockets
import ssl
import json
import subprocess
import uuid
import os
import socket
import sys
import re
from dotenv import load_dotenv
from system_info import get_system_info, get_quick_stats

# Hybrid config loading: external .env overrides embedded default
if os.path.exists('.env'):
    print("✓ Loading external .env configuration...")
    load_dotenv('.env')
else:
    # Try to load embedded .env (if bundled with PyInstaller)
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        bundle_dir = sys._MEIPASS
        embedded_env = os.path.join(bundle_dir, '.env.embedded')
        if os.path.exists(embedded_env):
            print("✓ Loading embedded default configuration...")
            load_dotenv(embedded_env)
        else:
            print("⚠ No configuration found, using hardcoded defaults...")
    else:
        # Running as script
        print("✓ Loading .env from script directory...")
        load_dotenv()

def get_arp_table():
    """Get list of active IPs from ARP table"""
    try:
        result = subprocess.run(['arp', '-a'], capture_output=True, text=True)
        ips = []
        
        # Parse ARP table output
        for line in result.stdout.split('\n'):
            # Look for lines with IP addresses (format: 192.168.1.1)
            match = re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', line)
            if match:
                ip = match.group(1)
                # Skip multicast and broadcast addresses
                if not ip.startswith('224.') and not ip.endswith('.255'):
                    ips.append(ip)
        
        print(f"✓ Found {len(ips)} active hosts via ARP")
        return ips
    except Exception as e:
        print(f"⚠ Could not scan ARP table: {e}")
        return []

def check_port_open(ip, port=3000, timeout=1):
    """Check if a port is open on given IP"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except:
        return False

def get_default_gateway():
    """Get the default gateway IP address"""
    try:
        result = subprocess.run(['ipconfig'], capture_output=True, text=True)
        # Look for "Default Gateway" line
        for line in result.stdout.split('\n'):
            if 'Default Gateway' in line or 'Passerelle par défaut' in line:
                # Extract IP address
                match = re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', line)
                if match:
                    return match.group(1)
    except Exception as e:
        print(f"⚠ Could not detect gateway: {e}")
    return None

def get_local_ip_and_subnet():
    """Get local IP address and calculate subnet range"""
    try:
        # Get local IP by connecting to external address (doesn't actually send data)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        
        # Calculate subnet (assumes /24)
        parts = local_ip.split('.')
        subnet_base = f"{parts[0]}.{parts[1]}.{parts[2]}"
        
        return local_ip, subnet_base
    except Exception as e:
        print(f"⚠ Could not detect local IP: {e}")
        return None, None

def scan_subnet_for_port(subnet_base, port=3000, timeout=0.3):
    """Scan subnet for hosts with specific port open"""
    print(f"→ Scanning subnet {subnet_base}.0/24 for port {port}...")
    found_hosts = []
    
    # Scan common host IPs (1, 2, 10-20, 50, 100-110, 200, 254)
    scan_range = list(range(1, 21)) + [50, 100, 101, 102, 103, 104, 105, 200, 254]
    
    for i in scan_range:
        ip = f"{subnet_base}.{i}"
        if check_port_open(ip, port, timeout):
            print(f"  ✓ Port {port} open on {ip}")
            found_hosts.append(ip)
    
    return found_hosts

def discover_server_urls():
    """Generate list of server URLs to try, in priority order"""
    urls = []
    
    # 1. Configured URL (highest priority)
    configured_url = os.getenv('SERVER_URL')
    if configured_url and configured_url != 'auto':
        urls.append(configured_url)
        return urls  # If explicitly configured, only try that
    
    print("\n🔍 Starting server discovery...")
    
    # 2. Localhost (same machine)
    print("→ Checking localhost...")
    urls.append('ws://localhost:3000')
    urls.append('ws://127.0.0.1:3000')
    
    # 3. Default gateway (router/server on network)
    gateway = get_default_gateway()
    if gateway and gateway not in ['0.0.0.0', '']:
        print(f"→ Detected gateway: {gateway}")
        urls.append(f'ws://{gateway}:3000')
    
    # 4. ARP scan - find active hosts on network
    print("→ Scanning network for active hosts (ARP)...")
    arp_ips = get_arp_table()
    
    # Check port 3000 on discovered hosts
    arp_found_servers = False
    if arp_ips:
        print(f"→ Checking port 3000 on {len(arp_ips)} hosts...")
        for ip in arp_ips:
            # Skip already added IPs
            url = f'ws://{ip}:3000'
            if url not in urls:
                # Quick port check before adding
                if check_port_open(ip, 3000, timeout=0.5):
                    print(f"  ✓ Port 3000 open on {ip}")
                    urls.append(url)
                    arp_found_servers = True
    
    # 5. If ARP didn't find servers, try subnet scan
    if not arp_found_servers:
        print("→ ARP scan found no servers, trying subnet scan...")
        local_ip, subnet_base = get_local_ip_and_subnet()
        if subnet_base:
            print(f"→ Local IP: {local_ip}")
            subnet_hosts = scan_subnet_for_port(subnet_base, 3000, timeout=0.3)
            for ip in subnet_hosts:
                url = f'ws://{ip}:3000'
                if url not in urls:
                    urls.append(url)
                    arp_found_servers = True
    
    # 6. Common server names (DNS)
    print("→ Trying common DNS names...")
    urls.append('ws://server.local:3000')
    urls.append('ws://remote-agent-server:3000')
    urls.append('ws://remote-agent:3000')
    
    # 7. Fallback to common gateway IPs (ONLY if nothing else worked)
    if not arp_found_servers:
        print("→ No servers found, trying fallback IPs...")
        fallback_ips = ['192.168.1.1', '192.168.0.1', '10.0.0.1', '172.16.0.1']
        for ip in fallback_ips:
            url = f'ws://{ip}:3000'
            if url not in urls:
                urls.append(url)
    else:
        print(f"→ Skipping fallback IPs (found {len([u for u in urls if 'ws://' in u and u not in ['ws://localhost:3000', 'ws://127.0.0.1:3000']])} servers via ARP)")
    
    print(f"\n✓ Discovery complete: {len(urls)} potential servers found\n")
    return urls

SERVER_URLS = []  # Will be populated during discovery
AGENT_TOKEN = os.getenv('AGENT_TOKEN', 'your_secure_token_here')
AGENT_ID = os.getenv('AGENT_ID', str(uuid.uuid4()))
AGENT_NICKNAME = os.getenv('AGENT_NICKNAME', socket.gethostname())
AGENT_TAGS = os.getenv('AGENT_TAGS', '').split(',') if os.getenv('AGENT_TAGS') else []

class RemoteAgent:
    def __init__(self):
        self.ws = None
        self.running = True
        self.heartbeat_interval = 10  # seconds
        self.current_server_url = None
        self.connection_attempts = {}
        self.server_urls = []  # Will be populated during discovery

    async def discover_and_connect(self):
        """Discover servers and try to connect"""
        # Run discovery if not already done
        if not self.server_urls:
            self.server_urls = discover_server_urls()
        
        for url in self.server_urls:
            # Track attempts per URL
            if url not in self.connection_attempts:
                self.connection_attempts[url] = 0
            
            self.connection_attempts[url] += 1
            
            # Skip URLs that have failed too many times
            if self.connection_attempts[url] > 3:
                continue
            
            try:
                print(f"→ Trying to connect to {url}...")
                headers = {
                    'X-Agent-Id': AGENT_ID,
                    'X-Agent-Token': AGENT_TOKEN,
                    'X-Agent-Nickname': AGENT_NICKNAME,
                    'X-Agent-Tags': ','.join(AGENT_TAGS)
                }
                
                # Create SSL context for wss:// connections
                ssl_context = None
                if url.startswith('wss://'):
                    ssl_context = ssl.create_default_context()
                    # For self-signed certificates in development, disable verification
                    # In production, use proper certificates and remove this
                    verify_ssl = os.getenv('VERIFY_SSL', 'true').lower() == 'true'
                    if not verify_ssl:
                        ssl_context.check_hostname = False
                        ssl_context.verify_mode = ssl.CERT_NONE
                        print("  ⚠ SSL verification disabled (development mode)")
                
                self.ws = await asyncio.wait_for(
                    websockets.connect(url, extra_headers=headers, ssl=ssl_context),
                    timeout=5.0
                )
                
                self.current_server_url = url
                protocol = "WSS (secure)" if url.startswith('wss://') else "WS (insecure)"
                print(f"✓ Connected to server at {url} ({protocol})")
                print(f"  Agent ID: {AGENT_ID}")
                print(f"  Nickname: {AGENT_NICKNAME}")
                print(f"  Tags: {', '.join(AGENT_TAGS) if AGENT_TAGS else 'None'}")
                
                # Reset attempt counter on successful connection
                self.connection_attempts[url] = 0
                return True
                
            except asyncio.TimeoutError:
                print(f"✗ Timeout connecting to {url}")
            except Exception as e:
                print(f"✗ Failed to connect to {url}: {e}")
        
        print(f"✗ Could not connect to any server")
        print(f"  Tried: {len(self.server_urls)} URLs")
        return False

    def execute_command(self, command):
        """Execute Windows command and return output"""
        try:
            # Use cmd.exe for Windows commands
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=int(os.getenv('COMMAND_TIMEOUT_MS', 30000)) / 1000
            )
            
            output = result.stdout if result.stdout else result.stderr
            return {
                'success': result.returncode == 0,
                'output': output,
                'returncode': result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': 'Command timed out',
                'returncode': -1
            }
        except Exception as e:
            return {
                'success': False,
                'output': str(e),
                'returncode': -1
            }

    async def handle_message(self, message):
        """Handle incoming messages from server"""
        data = json.loads(message)
        
        if data['type'] == 'execute':
            command = data['command']
            command_id = data.get('commandId')  # Get commandId if present
            require_confirmation = data.get('requireConfirmation', False)
            
            print(f"\n→ Command: {command}")
            if command_id:
                print(f"  Command ID: {command_id}")
            
            if require_confirmation:
                confirm = input("Execute? (y/n): ")
                if confirm.lower() != 'y':
                    print("✗ Command cancelled")
                    return
            
            print("⚙ Executing...")
            result = self.execute_command(command)
            
            if result['success']:
                print(f"✓ Success:\n{result['output']}")
            else:
                print(f"✗ Failed:\n{result['output']}")
            
            # Send result back to server with commandId
            result_message = {
                'type': 'result',
                'command': command,
                'output': result['output'],
                'success': result['success']
            }
            
            # Include commandId if it was provided
            if command_id:
                result_message['commandId'] = command_id
            
            await self.ws.send(json.dumps(result_message))
        
        elif data['type'] == 'get_system_info':
            print("\n→ Collecting system information...")
            system_info = get_system_info()
            
            await self.ws.send(json.dumps({
                'type': 'system_info',
                'data': system_info
            }))
            print("✓ System info sent")
        
        elif data['type'] == 'get_quick_stats':
            stats = get_quick_stats()
            
            await self.ws.send(json.dumps({
                'type': 'quick_stats',
                'data': stats
            }))

    async def send_heartbeat(self):
        """Send periodic heartbeat with quick stats"""
        while self.running and self.ws:
            try:
                stats = get_quick_stats()
                await self.ws.send(json.dumps({
                    'type': 'heartbeat',
                    'data': stats
                }))
                await asyncio.sleep(self.heartbeat_interval)
            except Exception as e:
                print(f"Heartbeat error: {e}")
                break

    async def run(self):
        """Main agent loop"""
        while self.running:
            if not await self.discover_and_connect():
                print("Retrying in 5 seconds...")
                await asyncio.sleep(5)
                continue
            
            try:
                # Send initial system info on connect
                system_info = get_system_info()
                await self.ws.send(json.dumps({
                    'type': 'agent_info',
                    'data': system_info
                }))
                
                # Start heartbeat task
                heartbeat_task = asyncio.create_task(self.send_heartbeat())
                
                async for message in self.ws:
                    await self.handle_message(message)
                    
                # Cancel heartbeat when connection closes
                heartbeat_task.cancel()
            except websockets.exceptions.ConnectionClosed:
                print("✗ Connection lost, reconnecting...")
                await asyncio.sleep(5)
            except Exception as e:
                print(f"✗ Error: {e}")
                await asyncio.sleep(5)

def main():
    print("=" * 60)
    print("Remote PC Agent - Smart Network Discovery")
    print("=" * 60)
    print(f"Agent ID: {AGENT_ID}")
    print(f"Nickname: {AGENT_NICKNAME}")
    print(f"Tags: {', '.join(AGENT_TAGS) if AGENT_TAGS else 'None'}")
    
    configured_url = os.getenv('SERVER_URL', 'auto')
    if configured_url == 'auto':
        print(f"Discovery: Enabled (ARP scan + port check)")
    else:
        print(f"Discovery: Disabled (using {configured_url})")
    
    print("=" * 60)
    
    agent = RemoteAgent()
    
    try:
        asyncio.run(agent.run())
    except KeyboardInterrupt:
        print("\n✓ Agent stopped")

if __name__ == '__main__':
    main()
