/**
 * 日志接口
 * 定义了日志记录的基本方法
 */
export interface ILogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: any): void;
  logState(phase: string, data: any): void;
  startTimer(label: string): () => void;
  show(): void;
}

/**
 * 空日志实现
 * 所有方法都不执行任何操作
 */
export class NoOpLogger implements ILogger {
  debug(message: string, data?: any): void {}
  info(message: string, data?: any): void {}
  warn(message: string, data?: any): void {}
  error(message: string, error?: any): void {}
  logState(phase: string, data: any): void {}
  startTimer(label: string): () => void {
    return () => {};
  }
  show(): void {}

  // 单例模式
  private static instance: NoOpLogger;
  static getInstance(): NoOpLogger {
    if (!NoOpLogger.instance) {
      NoOpLogger.instance = new NoOpLogger();
    }
    return NoOpLogger.instance;
  }
}

/**
 * 简单的控制台日志实现
 * 将日志输出到控制台
 */
export class ConsoleLogger implements ILogger {
  debug(message: string, data?: any): void {
    console.log(`[DEBUG] ${message}`, data);
  }
  
  info(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data);
  }
  
  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data);
  }
  
  error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error);
  }
  
  logState(phase: string, data: any): void {
    console.log(`[STATE] [${phase}]`, data);
  }
  
  startTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug(`${label} 耗时: ${duration.toFixed(2)}ms`);
    };
  }
  
  show(): void {
    // 控制台日志无需特殊显示
  }

  // 单例模式
  private static instance: ConsoleLogger;
  static getInstance(): ConsoleLogger {
    if (!ConsoleLogger.instance) {
      ConsoleLogger.instance = new ConsoleLogger();
    }
    return ConsoleLogger.instance;
  }
}

/**
 * 日志工厂
 * 根据配置创建适当的日志实例
 */
export class LoggerFactory {
  static createLogger(enableLogging: boolean): ILogger {
    return enableLogging ? ConsoleLogger.getInstance() : NoOpLogger.getInstance();
  }
} 