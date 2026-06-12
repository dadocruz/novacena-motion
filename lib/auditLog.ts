import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './storage';

// Log de auditoria simples (JSONL em data/audit.log). NUNCA registra senha,
// token ou conteúdo sensível — só evento + identidade + ip. Nunca quebra o fluxo.
const AUDIT_FILE = path.join(DATA_DIR, 'audit.log');

export type AuditEvent =
  | 'login_success'
  | 'login_fail'
  | 'signup'
  | 'logout'
  | 'render'
  | 'plan_change'
  | 'credential_reveal';

export async function audit(event: AuditEvent, data: Record<string, string | number | null> = {}) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), event, ...data }) + '\n';
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(AUDIT_FILE, line, 'utf-8');
  } catch {
    /* logging nunca pode derrubar a requisição */
  }
}
