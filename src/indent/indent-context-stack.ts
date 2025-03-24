/**
 * 缩进上下文栈
 * 用于管理SQL格式化过程中的缩进上下文
 */

export interface IndentContext {
    level: number;
    type: 'ROOT' | 'SUBQUERY' | 'EXPRESSION' | 'CLAUSE';
    parent?: IndentContext;
}

export class IndentContextStack {
    private static instance: IndentContextStack;
    private stack: IndentContext[] = [];

    private constructor() {}

    static getInstance(): IndentContextStack {
        if (!IndentContextStack.instance) {
            IndentContextStack.instance = new IndentContextStack();
        }
        return IndentContextStack.instance;
    }

    push(context: IndentContext) {
        if (this.stack.length > 0) {
            context.parent = this.stack[this.stack.length - 1];
        }
        this.stack.push(context);
    }

    pop(): IndentContext | undefined {
        return this.stack.pop();
    }

    peek(): IndentContext | undefined {
        return this.stack[this.stack.length - 1];
    }

    getEffectiveLevel(): number {
        return this.stack.reduce((total, ctx) => total + ctx.level, 0);
    }

    clear() {
        this.stack = [];
    }

    // 用于调试
    getStackTrace(): string {
        return this.stack.map(ctx => `${ctx.type}(${ctx.level})`).join(' -> ');
    }
} 