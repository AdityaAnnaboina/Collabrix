type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  debug(message: string, context?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: any) {
    console.info(this.formatMessage('INFO', message, context));
  }

  warn(message: string, context?: any) {
    console.warn(this.formatMessage('WARN', message, context));
  }

  error(message: string, error?: any, context?: any) {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack } 
      : error;
    
    console.error(
      this.formatMessage('ERROR', message, {
        ...(context || {}),
        error: errorDetails,
      })
    );
  }
}

export const logger = new Logger();
