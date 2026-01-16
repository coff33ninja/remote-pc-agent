# Deployment Guide

## Building the Agent

### Quick Build
Run the build script:
```bash
cd agent
build.bat
```

This creates `dist/agent.exe` with embedded default configuration.

### Manual Build (Advanced)
```bash
cd agent
pip install -r requirements.txt
pip install pyinstaller
python -m PyInstaller --onefile --console --name agent --add-data ".env.embedded;." src/main.py --clean -y
```

**Important:** The `--add-data ".env.embedded;."` flag embeds the default config file inside the executable.

## How Hybrid Configuration Works

The agent uses a **3-tier configuration priority system**:

### Priority Order (Highest to Lowest):
1. **External .env** - Place next to agent.exe (overrides everything)
2. **Embedded .env.embedded** - Built into the executable
3. **Hardcoded defaults** - Fallback if nothing else exists

### Configuration Loading Logic
```python
# 1. Check for external .env first
if os.path.exists('.env'):
    load_dotenv('.env')  # HIGHEST PRIORITY
    
# 2. Try embedded .env.embedded (if running as compiled exe)
elif getattr(sys, 'frozen', False):
    bundle_dir = sys._MEIPASS
    embedded_env = os.path.join(bundle_dir, '.env.embedded')
    if os.path.exists(embedded_env):
        load_dotenv(embedded_env)  # MEDIUM PRIORITY
        
# 3. Hardcoded defaults as last resort
else:
    # Use defaults in code
```

## Deployment Scenarios

### Scenario 1: Single File Deployment (Embedded Config)

**Deploy:** Just `agent.exe`

**Uses:** Embedded `.env.embedded` configuration
- Server: `ws://localhost:3000`
- Token: `test-token-12345`
- Nickname: `Windows PC`
- Tags: `windows`

**Good for:** 
- Quick testing on localhost
- Standardized deployments where all agents use same config
- When you control the embedded defaults

**Example:**
```bash
# Just copy the exe
copy agent\dist\agent.exe \\remote-pc\C:\Tools\
```

### Scenario 2: Custom Configuration (External .env)

**Deploy:** Both files
```
agent.exe
.env
```

**Create `.env` next to `agent.exe`:**
```env
SERVER_URL=ws://192.168.1.100:3000
AGENT_TOKEN=your-secure-token
AGENT_NICKNAME=Office Desktop
AGENT_TAGS=office,production,windows
```

**Good for:** 
- Production deployments
- Remote machines with different server URLs
- Per-machine customization
- When you need different nicknames/tags per agent

**Example:**
```bash
# Copy exe and custom config
copy agent\dist\agent.exe \\remote-pc\C:\Tools\
echo SERVER_URL=ws://192.168.1.100:3000 > \\remote-pc\C:\Tools\.env
echo AGENT_TOKEN=prod-token-xyz >> \\remote-pc\C:\Tools\.env
echo AGENT_NICKNAME=Office PC >> \\remote-pc\C:\Tools\.env
```

### Scenario 3: Mixed Deployment

**Office PCs:** Use external .env with custom nicknames
```
agent.exe + .env (AGENT_NICKNAME=Office-PC-1, AGENT_TAGS=office,critical)
```

**Test Machines:** Use embedded defaults
```
agent.exe (no .env, uses embedded config)
```

## Troubleshooting

### Issue: Agent Won't Connect

**Symptom:** Agent runs but doesn't appear in web UI

**Common Causes:**

1. **Token Mismatch**
   ```bash
   # Check agent token
   type .env | findstr AGENT_TOKEN
   
   # Check server token
   type server\.env | findstr AGENT_TOKEN
   ```
   **Fix:** Ensure tokens match exactly

2. **Wrong Server URL**
   ```bash
   # Check agent config
   type .env | findstr SERVER_URL
   ```
   **Fix:** Use correct IP:port (e.g., `ws://192.168.1.100:3000`)

3. **Firewall Blocking**
   ```bash
   # Test connectivity
   telnet 192.168.1.100 3000
   ```
   **Fix:** Open port 3000 on server firewall

4. **Server Not Running**
   ```bash
   # Check if server is running
   netstat -ano | findstr :3000
   ```
   **Fix:** Start server with `npm start`

### Issue: Agent Uses Wrong Config

**Symptom:** Agent shows wrong nickname or connects to wrong server

**Diagnosis:**
```bash
# Check which config file exists
dir agent.exe
dir .env
```

**Priority Check:**
- If `.env` exists → Uses external config (HIGHEST PRIORITY)
- If no `.env` → Uses embedded config
- Agent prints which config it loaded on startup

**Fix:**
- Delete `.env` to use embedded config
- Create `.env` to override embedded config

### Issue: Embedded Config Not Working

**Symptom:** Agent fails to start or uses wrong defaults

**Cause:** `.env.embedded` wasn't bundled during build

**Diagnosis:**
```bash
# Check if .env.embedded exists before building
dir agent\.env.embedded
```

**Fix:** Rebuild with correct command:
```bash
python -m PyInstaller --onefile --console --name agent --add-data ".env.embedded;." src/main.py --clean -y
```

**Verify:** The `--add-data ".env.embedded;."` flag is critical!

### Issue: Token Authentication Failed

**Symptom:** Server logs show "Invalid token" or agent disconnects immediately

**Root Cause:** During development, we had mismatched tokens:
- Agent `.env.embedded`: `AGENT_TOKEN=your_secure_token_here`
- Server `.env`: `AGENT_TOKEN=test-token-12345`

**Fix Applied:**
1. Updated `agent/.env.embedded` to match server token
2. Rebuilt agent with `--clean -y` flags to ensure fresh build
3. Deleted old `.env` files in dist folder
4. Tested with embedded config only

**Verification:**
```bash
# Agent should connect and server logs should show:
# info: Agent connected: Windows PC (auto_generated) [windows]
```

## Build Troubleshooting

### Issue: PyInstaller Not Found

**Error:** `pyinstaller: The term 'pyinstaller' is not recognized`

**Fix:**
```bash
python -m PyInstaller ...
# Instead of just: pyinstaller ...
```

### Issue: Module Not Found During Build

**Error:** `ModuleNotFoundError: No module named 'websockets'`

**Fix:**
```bash
pip install -r requirements.txt
```

### Issue: Old Build Cached

**Symptom:** Changes to code/config don't appear in built exe

**Fix:** Use `--clean -y` flags:
```bash
python -m PyInstaller --onefile --console --name agent --add-data ".env.embedded;." src/main.py --clean -y
```

## Production Deployment Checklist

- [ ] Change `AGENT_TOKEN` from default
- [ ] Update `SERVER_URL` to production server IP
- [ ] Set meaningful `AGENT_NICKNAME` per machine
- [ ] Add appropriate `AGENT_TAGS` for organization
- [ ] Test connection before deploying to all machines
- [ ] Document which machines use external vs embedded config
- [ ] Set up server with HTTPS/WSS (not implemented yet)
- [ ] Configure firewall rules
- [ ] Set up monitoring/logging
- [ ] Create backup of working agent.exe

## Remote Deployment Example

**Server Machine (192.168.1.100):**
```bash
cd server
npm start
# Server running on port 3000
```

**Target PC #1 (Office Desktop):**
```
C:\Tools\
├── agent.exe
└── .env  (SERVER_URL=ws://192.168.1.100:3000, AGENT_NICKNAME=Office Desktop)
```

**Target PC #2 (Home Laptop):**
```
C:\Tools\
├── agent.exe
└── .env  (SERVER_URL=ws://192.168.1.100:3000, AGENT_NICKNAME=Home Laptop)
```

**Target PC #3 (Test Machine):**
```
C:\Tools\
└── agent.exe  (no .env - uses embedded defaults)
```

## Security Notes

- Change `AGENT_TOKEN` from default value
- Use HTTPS/WSS in production (requires additional setup)
- Restrict `ALLOWED_COMMANDS` on server
- Review logs regularly
- Don't commit `.env` files with real tokens to version control
- Use different tokens for dev/staging/production

## What We Learned During Development

### Token Mismatch Issue
**Problem:** Agent built with default token `your_secure_token_here` but server expected `test-token-12345`

**Solution:** 
1. Updated `.env.embedded` with correct token
2. Rebuilt agent with `--clean` flag
3. Verified tokens match before deployment

**Lesson:** Always verify embedded config matches server config before building

### External .env Priority
**Problem:** External `.env` file in dist folder was overriding embedded config during testing

**Solution:** Deleted external `.env` to test embedded config properly

**Lesson:** Remember the priority order - external always wins

### PyInstaller Data Bundling
**Problem:** First builds didn't include `.env.embedded` file

**Solution:** Added `--add-data ".env.embedded;."` flag to PyInstaller command

**Lesson:** Data files must be explicitly bundled with `--add-data` flag
