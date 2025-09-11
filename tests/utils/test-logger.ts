/**
 * Test Logger utility for BizBox testing infrastructure
 * Captures and manages log output during testing
 */
export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: any;
  tenantId?: string;
}

export class TestLogger {
  private logs: LogEntry[] = [];
  private isEnabled: boolean = true;

  /**
   * Log a debug message
   */
  debug(message: string, context?: any, tenantId?: string): void {
    this.log('debug', message, context, tenantId);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: any, tenantId?: string): void {
    this.log('info', message, context, tenantId);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: any, tenantId?: string): void {
    this.log('warn', message, context, tenantId);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: any, tenantId?: string): void {
    this.log('error', message, context, tenantId);
  }

  /**
   * Internal log method
   */
  private log(level: LogEntry['level'], message: string, context?: any, tenantId?: string): void {
    if (!this.isEnabled) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      tenantId
    };

    this.logs.push(entry);

    // Also output to console in development
    if (process.env.NODE_ENV !== 'test' || process.env.DEBUG_TESTS === 'true') {
      const tenantInfo = tenantId ? ` [${tenantId}]` : '';
      const contextInfo = context ? ` ${JSON.stringify(context)}` : '';
      console.log(`[${level.toUpperCase()}]${tenantInfo} ${message}${contextInfo}`);
    }
  }

  /**
   * Get all log entries
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs by tenant ID
   */
  getLogsByTenant(tenantId: string): LogEntry[] {
    return this.logs.filter(log => log.tenantId === tenantId);
  }

  /**
   * Get logs containing specific message
   */
  getLogsContaining(searchTerm: string): LogEntry[] {
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /**
   * Get recent logs (within last N milliseconds)
   */
  getRecentLogs(withinMs: number = 5000): LogEntry[] {
    const cutoff = new Date(Date.now() - withinMs);
    return this.logs.filter(log => log.timestamp >= cutoff);
  }

  /**
   * Check if any error logs exist
   */
  hasErrors(): boolean {
    return this.logs.some(log => log.level === 'error');
  }

  /**
   * Check if any warning logs exist
   */
  hasWarnings(): boolean {
    return this.logs.some(log => log.level === 'warn');
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.logs.filter(log => log.level === 'error').length;
  }

  /**
   * Get warning count
   */
  getWarningCount(): number {
    return this.logs.filter(log => log.level === 'warn').length;
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get log summary
   */
  getSummary(): {
    total: number;
    debug: number;
    info: number;
    warn: number;
    error: number;
    tenants: string[];
  } {
    const summary = {
      total: this.logs.length,
      debug: this.getLogsByLevel('debug').length,
      info: this.getLogsByLevel('info').length,
      warn: this.getLogsByLevel('warn').length,
      error: this.getLogsByLevel('error').length,
      tenants: [...new Set(this.logs.map(log => log.tenantId).filter(Boolean))] as string[]
    };

    return summary;
  }

  /**
   * Format logs as string for debugging
   */
  toString(): string {
    return this.logs
      .map(log => {
        const timestamp = log.timestamp.toISOString();
        const level = log.level.toUpperCase().padEnd(5);
        const tenant = log.tenantId ? ` [${log.tenantId}]` : '';
        const context = log.context ? ` ${JSON.stringify(log.context)}` : '';
        return `${timestamp} ${level}${tenant} ${log.message}${context}`;
      })
      .join('\n');
  }

  /**
   * Export logs as JSON
   */
  toJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Assert no errors were logged
   */
  assertNoErrors(): void {
    const errors = this.getLogsByLevel('error');
    if (errors.length > 0) {
      throw new Error(`Expected no errors, but found ${errors.length} error(s):\n${
        errors.map(e => `- ${e.message}`).join('\n')
      }`);
    }
  }

  /**
   * Assert no warnings were logged
   */
  assertNoWarnings(): void {
    const warnings = this.getLogsByLevel('warn');
    if (warnings.length > 0) {
      throw new Error(`Expected no warnings, but found ${warnings.length} warning(s):\n${
        warnings.map(w => `- ${w.message}`).join('\n')
      }`);
    }
  }

  /**
   * Assert specific message was logged
   */
  assertMessageLogged(message: string, level?: LogEntry['level']): void {
    const matchingLogs = this.logs.filter(log => {
      const messageMatch = log.message.includes(message);
      const levelMatch = !level || log.level === level;
      return messageMatch && levelMatch;
    });

    if (matchingLogs.length === 0) {
      const levelFilter = level ? ` at level '${level}'` : '';
      throw new Error(`Expected message '${message}' to be logged${levelFilter}, but it was not found`);
    }
  }
}