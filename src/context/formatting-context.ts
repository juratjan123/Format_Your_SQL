/**
 * 格式化上下文信息接口
 */
export interface ContextInfo {
    type: string;
    level: number;
    parentType?: string;
    isSubquery?: boolean;
}

/**
 * 格式化上下文管理器
 * 用于在格式化过程中共享上下文信息
 */
export class FormattingContext {
    private static instance: FormattingContext;
    private contextStack: ContextInfo[] = [];
    
    private constructor() {}
    
    public static getInstance(): FormattingContext {
        if (!FormattingContext.instance) {
            FormattingContext.instance = new FormattingContext();
        }
        return FormattingContext.instance;
    }
    
    public pushContext(info: ContextInfo) {
        this.contextStack.push(info);
    }
    
    public getCurrentContext(): ContextInfo | undefined {
        return this.contextStack.length > 0 ? 
            this.contextStack[this.contextStack.length - 1] : 
            undefined;
    }
    
    public popContext() {
        return this.contextStack.pop();
    }
    
    public getParentContext(): ContextInfo | undefined {
        return this.contextStack.length > 1 ? 
            this.contextStack[this.contextStack.length - 2] : 
            undefined;
    }
    
    public clear() {
        this.contextStack = [];
    }
} 