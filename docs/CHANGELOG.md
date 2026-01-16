# Changelog

All notable changes to Remote PC Agent will be documented in this file.

## [v7.0.0] - 2026-01-16

### Added - Major Refactoring Complete
- **JWT Authentication**: Secure token-based authentication for all API endpoints
- **User Management**: Create, delete, list users with role-based access
- **Activity Feed**: Real-time tracking of all agent activities
- **AI System Analysis**: Gemini-powered performance optimization suggestions
- **Enhanced System Info**: Agent now collects running services and top processes
- **Database Persistence**: SQLite support for queue, history, tasks, notifications
- **Rate Limiting**: API, command, and auth rate limiting
- **Mutex System**: Prevents concurrent command execution conflicts
- **Error Handling**: Standardized error responses across all modules
- **Config Validation**: Startup validation for all required configuration
- **Backup System**: Configuration backup and restore functionality
- **Web UI Login**: Secure login screen with JWT token management
- **Activity Monitoring**: See what's happening on remote machines in real-time

### Enhanced
- **Command Queue**: Now persisted to database with better error handling
- **Notifications**: Database-backed with multiple channels
- **Task Scheduler**: Persistent storage and better reliability
- **Command History**: Full tracking with database storage
- **Agent Groups**: Improved management with persistence
- **Web UI**: Added authentication, activity feed, AI analysis button
- **System Info**: Now includes services, processes, and detailed metrics

### Security
- Password hashing with bcrypt
- JWT token expiration (24h)
- Rate limiting on all endpoints
- Protected API routes
- Secure session management

### Fixed
- Command queue execution order
- Concurrent command conflicts
- Database initialization issues
- WebSocket reconnection handling
- Memory leaks in long-running processes

### Documentation
- Complete API documentation (API.md)
- Consolidated docs in docs/ folder
- Updated README with quick start
- Feature list (FEATURES.md)
- This changelog

## [v6.0.0] - Previous Version

### Features
- Basic authentication with tokens
- Command templates (30+)
- Agent groups
- Task scheduler
- Notification system
- Command history
- Web UI
- Multi-agent support
- Gemini AI integration
- Command queue
- Real-time monitoring

## Migration Notes

### v6 to v7
1. **Authentication Required**: All API endpoints now require JWT authentication
   - Login at `/api/auth/login` to get token
   - Include token in `Authorization: Bearer <token>` header
   
2. **Default Credentials**: `admin` / `admin123`
   - **Change immediately** after first login
   
3. **Database**: Optional SQLite support
   - Falls back to in-memory if not available
   - Data persists across restarts with SQLite
   
4. **Agent Rebuild**: Rebuild agent.exe to get enhanced system info
   ```bash
   cd agent
   build.bat
   ```

5. **Environment Variables**: New optional variables
   - `JWT_SECRET`: Auto-generated if not set
   - `ENABLE_HTTPS`: Set to `true` for production
   - `DATABASE_PATH`: SQLite database location

6. **Web UI**: Now requires login
   - Old bookmarks will redirect to login
   - Token stored in localStorage
   - Auto-logout on token expiry

## Breaking Changes

### v7.0.0
- All API endpoints require authentication (except `/api/auth/login`)
- Web UI requires login before access
- Agent system info format changed (added services and processes)
- Database schema changes (automatic migration)

## Known Issues

### v7.0.0
- SQLite requires Windows SDK 10.0.19041.0 to compile
  - Falls back to in-memory storage if unavailable
  - Data not persisted across restarts without SQLite
- Activity feed limited to last 500 entries
- AI analysis requires Gemini API quota
- HTTPS requires manual certificate generation

## Upgrade Instructions

### From v6 to v7

1. **Backup Configuration**
   ```bash
   # Backup your .env files
   copy server\.env server\.env.backup
   copy agent\.env agent\.env.backup
   ```

2. **Update Server**
   ```bash
   cd server
   npm install
   # Server will auto-create default admin user
   npm start
   ```

3. **Update Agent**
   ```bash
   cd agent
   build.bat
   # Deploy new agent.exe to target machines
   ```

4. **First Login**
   - Open http://localhost:3000
   - Login with `admin` / `admin123`
   - Change password immediately

5. **Update API Clients**
   - Add authentication to all API calls
   - See API.md for examples

## Future Releases

See [IMPROVEMENTS.md](IMPROVEMENTS.md) for planned features.
