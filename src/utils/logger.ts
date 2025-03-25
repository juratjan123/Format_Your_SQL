/**
 * 日志工具类
 * 用于在调试模式下记录扩展的运行状态和错误信息
 */
import * as vscode from 'vscode';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;
    private debugMode: boolean = false;
    private minLevel: LogLevel = LogLevel.INFO;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Format Your SQL 🧹');
    }

    /**
     * 获取日志工具实例（单例模式）
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * 设置调试模式
     * @param enabled 是否启用调试模式
     */
    public setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
        this.minLevel = enabled ? LogLevel.DEBUG : LogLevel.INFO;
        this.info(`调试模式 ${enabled ? '已启用' : '已禁用'}`);
    }

    /**
     * 记录调试级别日志
     * @param message 日志消息
     * @param data 可选的附加数据（会被JSON序列化）
     */
    public debug(message: string, data?: any): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    /**
     * 记录信息级别日志
     * @param message 日志消息
     * @param data 可选的附加数据（会被JSON序列化）
     */
    public info(message: string, data?: any): void {
        this.log(LogLevel.INFO, message, data);
    }

    /**
     * 记录警告级别日志
     * @param message 日志消息
     * @param data 可选的附加数据（会被JSON序列化）
     */
    public warn(message: string, data?: any): void {
        this.log(LogLevel.WARN, message, data);
    }

    /**
     * 记录错误级别日志
     * @param message 日志消息
     * @param error 错误对象或附加数据
     */
    public error(message: string, error?: any): void {
        this.log(LogLevel.ERROR, message, error);
        
        // 如果error是Error对象，记录堆栈信息
        if (error instanceof Error) {
            this.outputChannel.appendLine(`堆栈信息: ${error.stack || '无堆栈信息'}`);
        }
    }

    /**
     * 记录格式化过程中的状态
     * @param phase 当前阶段
     * @param data 状态数据
     */
    public logState(phase: string, data: any): void {
        if (!this.debugMode) {return;}
        
        try {
            const timestamp = new Date().toISOString();
            const dataStr = data ? this.safeStringify(data) : '无数据';
            this.outputChannel.appendLine(`[${timestamp}] [STATE] [${phase}] ${dataStr}`);
        } catch (e) {
            this.error('记录状态时出错', e);
        }
    }

    /**
     * 启动一个性能计时器，返回一个函数，调用该函数可以记录经过的时间
     * @param label 计时器标签
     * @returns 用于结束计时并记录经过时间的函数
     */
    public startTimer(label: string): () => void {
        if (!this.debugMode) {return () => {};}
        
        const start = performance.now();
        return () => {
            const duration = performance.now() - start;
            this.debug(`${label} 耗时: ${duration.toFixed(2)}ms`);
        };
    }

    /**
     * 显示输出通道
     */
    public show(): void {
        this.outputChannel.show();
    }

    /**
     * 记录日志的内部方法
     * @param level 日志级别
     * @param message 日志消息
     * @param data 附加数据
     */
    private log(level: LogLevel, message: string, data?: any): void {
        if (level < this.minLevel) {return;}
        
        try {
            const timestamp = new Date().toISOString();
            const levelString = LogLevel[level];
            let logMessage = `[${timestamp}] [${levelString}] ${message}`;
            
            if (data !== undefined) {
                let dataString = this.safeStringify(data);
                // 如果数据字符串过长，截断显示
                if (dataString.length > 500) {
                    dataString = dataString.substring(0, 500) + '... (已截断)';
                }
                logMessage += `\n${dataString}`;
            }
            
            this.outputChannel.appendLine(logMessage);
        } catch (e) {
            // 避免循环递归调用
            console.error('日志记录失败:', e);
            this.outputChannel.appendLine(`[ERROR] 日志记录失败: ${e}`);
        }
    }

    /**
     * 安全地将对象转换为字符串，处理循环引用和大对象
     * @param data 要序列化的数据
     * @returns 序列化后的字符串
     */
    private safeStringify(data: any): string {
        try {
            return JSON.stringify(data, this.circularReplacer(), 2);
        } catch (error: unknown) {
            return `[无法序列化的对象: ${error instanceof Error ? error.message : String(error)}]`;
        }
    }

    /**
     * 处理循环引用的JSON替换器
     */
    private circularReplacer() {
        const seen = new WeakSet();
        return (key: string, value: any) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[循环引用]';
                }
                seen.add(value);
            }
            return value;
        };
    }
} 