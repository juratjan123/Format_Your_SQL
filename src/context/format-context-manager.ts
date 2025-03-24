/**
 * 格式化上下文管理器
 * 负责管理整个格式化过程中的状态和上下文
 */
export interface FormatContext {
    level: number;
    parentType: string;
    isSubquery: boolean;
    indentSize: number;
    bracketLevel: number;
    queryType?: 'MAIN' | 'WITH' | 'SUBQUERY';  // 查询类型
    statementType?: 'SELECT' | 'FROM' | 'WHERE' | 'GROUP BY' | 'HAVING' | 'ORDER BY' | 'WITH' | 'JOIN';  // 语句类型
    tableContext?: {
        originalTables?: string[];
        currentTable?: string;
        isUnionQuery?: boolean;
    };
}

export class FormatContextManager {
    private indentStack: number[] = [];
    private bracketStack: string[] = [];
    private currentContext: FormatContext;

    constructor(private baseIndentSize: number = 2) {
        this.currentContext = this.createInitialContext();
    }

    private createInitialContext(): FormatContext {
        return {
            level: 0,
            parentType: 'root',
            isSubquery: false,
            indentSize: this.baseIndentSize,
            bracketLevel: 0,
            tableContext: {
                originalTables: [],
                isUnionQuery: false
            }
        };
    }

    /**
     * 进入新的格式化上下文
     */
    pushContext(type: string, options: Partial<FormatContext> = {}): FormatContext {
        this.indentStack.push(this.currentContext.level);
        const newContext = {
            ...this.currentContext,
            level: this.currentContext.level + 1,
            parentType: type,
            ...options
        };
        this.currentContext = newContext;
        return newContext;
    }

    /**
     * 退出当前格式化上下文
     */
    popContext(): FormatContext {
        if (this.indentStack.length === 0) {
            throw new Error('Context stack is empty');
        }
        const level = this.indentStack.pop()!;
        this.currentContext = {
            ...this.currentContext,
            level
        };
        return this.currentContext;
    }

    /**
     * 获取当前缩进字符串
     */
    getCurrentIndent(): string {
        return ' '.repeat(this.currentContext.level * this.baseIndentSize);
    }

    /**
     * 处理括号嵌套
     */
    handleBracket(type: 'open' | 'close', bracketType: '(' | '[' | '{'): string {
        if (type === 'open') {
            this.bracketStack.push(bracketType);
            return bracketType;
        } else {
            const lastBracket = this.bracketStack.pop();
            if (!lastBracket) {
                throw new Error('Bracket mismatch');
            }
            const closingBracket = this.getClosingBracket(lastBracket);
            return closingBracket;
        }
    }

    private getClosingBracket(openBracket: string): string {
        const bracketPairs: Record<string, string> = {
            '(': ')',
            '[': ']',
            '{': '}'
        };
        return bracketPairs[openBracket] || openBracket;
    }

    /**
     * 获取当前格式化上下文
     */
    getCurrentContext(): FormatContext {
        return { ...this.currentContext };
    }

    /**
     * 重置格式化上下文
     */
    reset(): void {
        this.indentStack = [];
        this.bracketStack = [];
        this.currentContext = this.createInitialContext();
    }
} 