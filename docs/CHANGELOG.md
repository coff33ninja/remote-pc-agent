# Changelog

All notable changes to Remote PC Agent will be documented in this file.

## [v1.0.0] - 2026-01-16

### Initial Release

**Core Features:**
- **JWT Authentication**: Secure token-based authentication for all API endpoints
- **User Management**: Create, delete, list users with role-based access
- **Activity Feed**: Real-time tracking of all agent activities
- **AI System Analysis**: Gemini-powered performance optimization suggestions
- **Enhanced System Info**: Agent collects running services and top processes
- **Multi-Agent Support**: Manage multiple Windows PCs with nicknames and tags
- **Command Queue**: Sequential command execution with persistence
- **Agent Groups**: Execute commands on multiple agents at once
- **Command Templates**: 30+ pre-defined commands
- **Task Scheduler**: Schedule recurring commands
- **Command History**: Full tracking with database storage
- **Real-time Monitoring**: CPU, RAM, disk usage with live updates
- **Web UI**: Responsive interface with login, activity feed, and AI analysis
- **Database Persistence**: SQLite support (optional, falls back to in-memory)
- **Rate Limiting**: API, command, and auth rate limiting
- **Notifications**: Event-based notification system
- **HTTPS/WSS Support**: Optional secure connections

**Security:**
- Password hashing with bcrypt
- JWT token expiration (24h)
- Rate limiting on all endpoints
- Protected API routes
- Command validation and guardrails

**Documentation:**
- Complete API documentation
- Setup and deployment guides
- Feature list and changelog
- Contributing guidelines

## Known Issues

- SQLite requires Windows SDK 10.0.19041.0 to compile
  - Falls back to in-memory storage if unavailable
- Activity feed limited to last 500 entries
- AI analysis requires Gemini API quota

## Upgrade Instructions

This is the initial release. For future upgrades, see documentation.
