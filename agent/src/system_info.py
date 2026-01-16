"""
System information collection module
Provides structured data about the agent's system
"""
import platform
import socket
import psutil
import subprocess

def get_system_info():
    """Collect comprehensive system information"""
    try:
        info = {
            'hostname': socket.gethostname(),
            'platform': platform.system(),
            'platform_release': platform.release(),
            'platform_version': platform.version(),
            'architecture': platform.machine(),
            'processor': platform.processor(),
            'cpu_count': psutil.cpu_count(),
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory': {
                'total': psutil.virtual_memory().total,
                'available': psutil.virtual_memory().available,
                'percent': psutil.virtual_memory().percent
            },
            'disk': [{
                'device': partition.device,
                'mountpoint': partition.mountpoint,
                'total': psutil.disk_usage(partition.mountpoint).total,
                'used': psutil.disk_usage(partition.mountpoint).used,
                'free': psutil.disk_usage(partition.mountpoint).free,
                'percent': psutil.disk_usage(partition.mountpoint).percent
            } for partition in psutil.disk_partitions()],
            'network': {
                'hostname': socket.gethostname(),
                'ip': socket.gethostbyname(socket.gethostname())
            }
        }
        
        # Add running services (Windows only)
        if platform.system() == 'Windows':
            info['services'] = get_windows_services()
        
        # Add top processes by CPU/Memory
        info['top_processes'] = get_top_processes()
        
        return info
    except Exception as e:
        return {'error': str(e)}

def get_windows_services():
    """Get list of Windows services with their status"""
    try:
        result = subprocess.run(
            ['sc', 'query', 'type=', 'service', 'state=', 'all'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        services = []
        current_service = {}
        
        for line in result.stdout.split('\n'):
            line = line.strip()
            if line.startswith('SERVICE_NAME:'):
                if current_service:
                    services.append(current_service)
                current_service = {'name': line.split(':', 1)[1].strip()}
            elif line.startswith('DISPLAY_NAME:'):
                current_service['display_name'] = line.split(':', 1)[1].strip()
            elif line.startswith('STATE'):
                state_parts = line.split()
                if len(state_parts) >= 4:
                    current_service['state'] = state_parts[3]
        
        if current_service:
            services.append(current_service)
        
        return services[:100]  # Limit to first 100 services
    except Exception as e:
        return [{'error': str(e)}]

def get_top_processes(limit=10):
    """Get top processes by CPU and memory usage"""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                processes.append({
                    'pid': proc.info['pid'],
                    'name': proc.info['name'],
                    'cpu': proc.info['cpu_percent'] or 0,
                    'memory': proc.info['memory_percent'] or 0
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort by CPU usage
        processes.sort(key=lambda x: x['cpu'], reverse=True)
        top_cpu = processes[:limit]
        
        # Sort by memory usage
        processes.sort(key=lambda x: x['memory'], reverse=True)
        top_memory = processes[:limit]
        
        return {
            'by_cpu': top_cpu,
            'by_memory': top_memory
        }
    except Exception as e:
        return {'error': str(e)}

def get_quick_stats():
    """Get quick performance stats"""
    return {
        'cpu_percent': psutil.cpu_percent(interval=1),
        'memory_percent': psutil.virtual_memory().percent,
        'disk_percent': psutil.disk_usage('/').percent if platform.system() != 'Windows' else psutil.disk_usage('C:\\').percent
    }
