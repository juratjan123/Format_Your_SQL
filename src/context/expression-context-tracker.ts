import { ExpressionContext } from '../types/expression-context';

/**
 * 表达式上下文追踪器
 * 用于在表达式处理过程中追踪和管理上下文信息
 */
export class ExpressionContextTracker {
    private static instance: ExpressionContextTracker;
    private contextStack: ExpressionContext[] = [];

    private constructor() {}

    static getInstance(): ExpressionContextTracker {
        if (!ExpressionContextTracker.instance) {
            ExpressionContextTracker.instance = new ExpressionContextTracker();
        }
        return ExpressionContextTracker.instance;
    }

    pushContext(context: ExpressionContext) {
        this.contextStack.push({...context});
    }

    popContext(): ExpressionContext | undefined {
        return this.contextStack.pop();
    }

    getCurrentContext(): ExpressionContext | undefined {
        return this.contextStack[this.contextStack.length - 1];
    }

    hasAncestorContext(predicate: (context: ExpressionContext) => boolean): boolean {
        return this.contextStack.some(predicate);
    }

    clear() {
        this.contextStack = [];
    }
} 