// Pre-defined command templates for common operations
export const commandTemplates = {
  // System Information
  systemInfo: 'systeminfo',
  osVersion: 'ver',
  computerName: 'hostname',
  uptime: 'systeminfo | findstr /C:"System Boot Time"',
  
  // Network
  ipConfig: 'ipconfig /all',
  networkAdapters: 'wmic nic get name,netconnectionid,speed',
  activeConnections: 'netstat -ano',
  pingTest: (host) => `ping ${host} -n 4`,
  dnsLookup: (domain) => `nslookup ${domain}`,
  
  // Disk & Storage
  diskSpace: 'wmic logicaldisk get name,size,freespace',
  diskHealth: 'wmic diskdrive get status,model,size',
  
  // Processes & Services
  processList: 'tasklist',
  topProcesses: 'powershell "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name,CPU,WorkingSet"',
  serviceList: 'sc query state= all',
  specificProcess: (name) => `tasklist /FI "IMAGENAME eq ${name}"`,
  
  // Updates & Patches
  windowsUpdates: 'powershell "Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 10"',
  
  // Security
  firewallStatus: 'netsh advfirewall show allprofiles',
  antivirusStatus: 'powershell "Get-MpComputerStatus"',
  
  // Performance
  cpuUsage: 'wmic cpu get loadpercentage',
  memoryUsage: 'systeminfo | findstr /C:"Available Physical Memory" /C:"Total Physical Memory"',
  
  // Software
  installedPrograms: 'wmic product get name,version',
  
  // File Operations (read-only)
  listDirectory: (path) => `dir "${path}"`,
  findFiles: (pattern) => `dir /s /b ${pattern}`,
  fileInfo: (path) => `dir "${path}" /q`,
  
  // Logs
  eventLogErrors: 'powershell "Get-EventLog -LogName System -EntryType Error -Newest 10"',
  applicationErrors: 'powershell "Get-EventLog -LogName Application -EntryType Error -Newest 10"'
};

// Command categories for UI organization
export const commandCategories = {
  system: ['systemInfo', 'osVersion', 'computerName', 'uptime'],
  network: ['ipConfig', 'networkAdapters', 'activeConnections', 'pingTest', 'dnsLookup'],
  disk: ['diskSpace', 'diskHealth'],
  processes: ['processList', 'topProcesses', 'serviceList', 'specificProcess'],
  security: ['firewallStatus', 'antivirusStatus', 'windowsUpdates'],
  performance: ['cpuUsage', 'memoryUsage'],
  software: ['installedPrograms'],
  files: ['listDirectory', 'findFiles', 'fileInfo'],
  logs: ['eventLogErrors', 'applicationErrors']
};

// Quick actions with descriptions
export const quickActions = [
  { id: 'health-check', name: 'System Health Check', commands: ['systemInfo', 'diskSpace', 'memoryUsage', 'cpuUsage'] },
  { id: 'network-diag', name: 'Network Diagnostics', commands: ['ipConfig', 'activeConnections', 'networkAdapters'] },
  { id: 'security-audit', name: 'Security Audit', commands: ['firewallStatus', 'antivirusStatus', 'windowsUpdates'] },
  { id: 'performance-check', name: 'Performance Check', commands: ['topProcesses', 'cpuUsage', 'memoryUsage', 'diskSpace'] }
];


// Export function to get all templates as array
export function getTemplates() {
  return [
    { id: 'systemInfo', name: 'System Information', command: 'systeminfo', category: 'System' },
    { id: 'osVersion', name: 'OS Version', command: 'ver', category: 'System' },
    { id: 'computerName', name: 'Computer Name', command: 'hostname', category: 'System' },
    { id: 'uptime', name: 'System Uptime', command: 'systeminfo | findstr /C:"System Boot Time"', category: 'System' },
    
    { id: 'ipConfig', name: 'IP Configuration', command: 'ipconfig /all', category: 'Network' },
    { id: 'networkAdapters', name: 'Network Adapters', command: 'wmic nic get name,netconnectionid,speed', category: 'Network' },
    { id: 'activeConnections', name: 'Active Connections', command: 'netstat -ano', category: 'Network' },
    { id: 'pingTest', name: 'Ping Test', command: 'ping {host} -n 4', category: 'Network', params: ['host'] },
    { id: 'dnsLookup', name: 'DNS Lookup', command: 'nslookup {domain}', category: 'Network', params: ['domain'] },
    
    { id: 'diskSpace', name: 'Disk Space', command: 'wmic logicaldisk get name,size,freespace', category: 'Storage' },
    { id: 'diskHealth', name: 'Disk Health', command: 'wmic diskdrive get status,model,size', category: 'Storage' },
    
    { id: 'processList', name: 'Process List', command: 'tasklist', category: 'Processes' },
    { id: 'topProcesses', name: 'Top Processes', command: 'powershell "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name,CPU,WorkingSet"', category: 'Processes' },
    { id: 'serviceList', name: 'Service List', command: 'sc query state= all', category: 'Services' },
    
    { id: 'windowsUpdates', name: 'Windows Updates', command: 'powershell "Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 10"', category: 'Updates' },
    
    { id: 'firewallStatus', name: 'Firewall Status', command: 'netsh advfirewall show allprofiles', category: 'Security' },
    { id: 'antivirusStatus', name: 'Antivirus Status', command: 'powershell "Get-MpComputerStatus"', category: 'Security' },
    
    { id: 'cpuUsage', name: 'CPU Usage', command: 'wmic cpu get loadpercentage', category: 'Performance' },
    { id: 'memoryUsage', name: 'Memory Usage', command: 'systeminfo | findstr /C:"Available Physical Memory" /C:"Total Physical Memory"', category: 'Performance' },
    
    { id: 'installedPrograms', name: 'Installed Programs', command: 'wmic product get name,version', category: 'Software' },
    
    { id: 'eventLogErrors', name: 'System Event Errors', command: 'powershell "Get-EventLog -LogName System -EntryType Error -Newest 10"', category: 'Logs' },
    { id: 'applicationErrors', name: 'Application Errors', command: 'powershell "Get-EventLog -LogName Application -EntryType Error -Newest 10"', category: 'Logs' }
  ];
}
