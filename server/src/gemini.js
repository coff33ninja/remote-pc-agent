import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function processPrompt(userPrompt) {
  const model = genAI.getGenerativeModel({ 
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.1, // Low temperature for consistent command generation
      maxOutputTokens: 200
    }
  });

  const systemPrompt = `You are a Windows command-line assistant. Convert user requests into safe Windows CMD or PowerShell commands.

CRITICAL: You are running on Windows. Commands MUST be Windows-compatible.

Rules:
- Return ONLY the command, no explanations, no markdown, no backticks
- Use Windows CMD syntax (NOT Linux/bash)
- For opening programs: use "start programname" (e.g., "start control" for Control Panel)
- For PowerShell: use "powershell -Command 'Your-Command'" 
- For system info: use systeminfo, wmic, tasklist, netstat
- For network: use ipconfig, ping, nslookup
- For files: use dir, type, findstr (NOT ls, cat, grep)
- Never use Linux commands (ls, cat, grep, rm, etc.)
- Never suggest destructive commands without explicit user intent
- Prefer safe, read-only commands when possible

Examples:
- "open control panel" → start control
- "list files" → dir
- "show IP address" → ipconfig
- "list processes" → tasklist
- "get system info" → systeminfo

User request: ${userPrompt}

Command:`;

  const result = await model.generateContent(systemPrompt);
  const response = result.response.text().trim();
  
  // Clean up response (remove markdown, quotes, backticks, etc)
  return response
    .replace(/```[\w]*\n?/g, '')  // Remove code blocks
    .replace(/^["'`]|["'`]$/g, '') // Remove quotes/backticks at start/end
    .replace(/`/g, '')              // Remove all backticks
    .trim();
}
