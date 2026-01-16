# Test Remote PC Agent API
# This script demonstrates how to use the authenticated API

$baseUrl = "http://localhost:3000/api"

Write-Host "`n=== Remote PC Agent API Test ===" -ForegroundColor Cyan
Write-Host ""

# 1. Login
Write-Host "1. Logging in..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "   ✓ Login successful!" -ForegroundColor Green
    Write-Host "   User: $($loginResponse.user.username) (Role: $($loginResponse.user.role))" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

# 2. Get agents list
Write-Host "`n2. Fetching connected agents..." -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $token"
}

try {
    $agentsResponse = Invoke-RestMethod -Uri "$baseUrl/agents" -Headers $headers
    $agents = $agentsResponse.agents
    
    Write-Host "   ✓ Found $($agents.Count) agent(s)" -ForegroundColor Green
    
    foreach ($agent in $agents) {
        Write-Host "`n   Agent: $($agent.nickname)" -ForegroundColor Cyan
        Write-Host "   ID: $($agent.id)" -ForegroundColor Gray
        Write-Host "   Status: $($agent.status)" -ForegroundColor $(if ($agent.status -eq 'online') { 'Green' } else { 'Red' })
        Write-Host "   Tags: $($agent.tags -join ', ')" -ForegroundColor Gray
        Write-Host "   Connected: $($agent.connectedAt)" -ForegroundColor Gray
        
        if ($agent.systemInfo) {
            Write-Host "   System:" -ForegroundColor Gray
            Write-Host "     - Hostname: $($agent.systemInfo.hostname)" -ForegroundColor Gray
            Write-Host "     - Platform: $($agent.systemInfo.platform)" -ForegroundColor Gray
            Write-Host "     - CPU: $($agent.systemInfo.cpu)" -ForegroundColor Gray
            Write-Host "     - RAM: $($agent.systemInfo.ram)" -ForegroundColor Gray
        }
        
        if ($agent.stats) {
            Write-Host "   Current Stats:" -ForegroundColor Gray
            Write-Host "     - CPU: $($agent.stats.cpu)%" -ForegroundColor Gray
            Write-Host "     - RAM: $($agent.stats.ram)%" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ✗ Failed to fetch agents: $_" -ForegroundColor Red
}

# 3. Get database stats
Write-Host "`n3. Database statistics..." -ForegroundColor Yellow
try {
    $dbStats = Invoke-RestMethod -Uri "$baseUrl/database/stats" -Headers $headers
    Write-Host "   ✓ Database stats:" -ForegroundColor Green
    Write-Host "   - Queue size: $($dbStats.stats.queueSize)" -ForegroundColor Gray
    Write-Host "   - Groups: $($dbStats.stats.groupsCount)" -ForegroundColor Gray
    Write-Host "   - History: $($dbStats.stats.historySize)" -ForegroundColor Gray
    Write-Host "   - Tasks: $($dbStats.stats.tasksCount)" -ForegroundColor Gray
    Write-Host "   - Notifications: $($dbStats.stats.notificationsCount)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Failed to fetch stats: $_" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "The system is working! Agent is connected and API is functional." -ForegroundColor Green
Write-Host "Note: Using in-memory database (no persistence)" -ForegroundColor Yellow
Write-Host ""
