/**
 * 子查询上下文管理
 * 用于追踪和管理SQL中的子查询结构
 */

export interface SubqueryContext {
    parentContext?: SubqueryContext;
    level: number;
    type: 'UNION' | 'SIMPLE' | 'NESTED' | 'WITH';
    ast: any;
    parentheses: boolean;
    alias?: string;
}

export class SubqueryContextManager {
    private static instance: SubqueryContextManager;
    private contextStack: SubqueryContext[] = [];

    private constructor() {}

    static getInstance(): SubqueryContextManager {
        if (!SubqueryContextManager.instance) {
            SubqueryContextManager.instance = new SubqueryContextManager();
        }
        return SubqueryContextManager.instance;
    }

    pushContext(context: SubqueryContext): void {
        if (this.contextStack.length > 0) {
            context.parentContext = this.contextStack[this.contextStack.length - 1];
        }
        this.contextStack.push(context);
    }

    popContext(): SubqueryContext | undefined {
        return this.contextStack.pop();
    }

    getCurrentContext(): SubqueryContext | undefined {
        return this.contextStack[this.contextStack.length - 1];
    }

    clear(): void {
        this.contextStack = [];
    }
} 