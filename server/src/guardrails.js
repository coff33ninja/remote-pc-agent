import dotenv from 'dotenv';

dotenv.config();

export function validateCommand(command) {
  const maxLength = parseInt(process.env.MAX_COMMAND_LENGTH) || 500;
  const blockedKeywords = process.env.BLOCKED_KEYWORDS?.split(',') || [];
  const allowedCommands = process.env.ALLOWED_COMMANDS?.split(',') || [];

  // Length check
  if (command.length > maxLength) {
    return { allowed: false, reason: 'Command exceeds maximum length' };
  }

  // Blocked keywords check
  const lowerCommand = command.toLowerCase();
  for (const keyword of blockedKeywords) {
    if (lowerCommand.includes(keyword.trim().toLowerCase())) {
      return { allowed: false, reason: `Blocked keyword detected: ${keyword}` };
    }
  }

  // Allowed commands check (if whitelist is configured)
  if (allowedCommands.length > 0) {
    const commandStart = command.split(' ')[0].toLowerCase();
    const isAllowed = allowedCommands.some(cmd => 
      commandStart.includes(cmd.trim().toLowerCase())
    );
    
    if (!isAllowed) {
      return { allowed: false, reason: 'Command not in whitelist' };
    }
  }

  // Additional safety checks
  const dangerousPatterns = [
    /rm\s+-rf/i,
    /del\s+\/[fs]/i,
    /format\s+[a-z]:/i,
    /shutdown/i,
    /restart/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return { allowed: false, reason: 'Potentially dangerous command detected' };
    }
  }

  return { allowed: true };
}
