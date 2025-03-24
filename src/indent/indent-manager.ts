import { IndentationContext } from './indentation-context';
import { ExpressionIndentStrategy } from './expression-indent-strategy';

/**
 * 缩进管理器
 * 负责管理SQL格式化过程中的缩进状态
 */
export class IndentManager {
    private contexts: IndentationContext[] = [];
    private expressionStack: string[] = [];
    private baseIndentSize: number;
    
    constructor(baseIndentSize: number = 2) {
        this.baseIndentSize = baseIndentSize;
    }
    
    pushContext(context: IndentationContext) {
        this.contexts.push(context);
        if (context.expressionType) {
            this.pushExpression(context.expressionType);
        }
    }
    
    popContext() {
        const context = this.contexts.pop();
        if (context?.expressionType) {
            this.popExpression();
        }
        return context;
    }
    
    pushExpression(type: string) {
        this.expressionStack.push(type);
    }
    
    popExpression() {
        return this.expressionStack.pop();
    }
    
    getCurrentExpression() {
        return this.expressionStack[this.expressionStack.length - 1];
    }
    
    getCurrentLevel(): number {
        const currentContext = this.getCurrentContext();
        if (!currentContext) {return 0;}

        let level = 0;
        
        // 处理WITH子句
        const hasWithClause = this.contexts.some(ctx => ctx.statementType === 'WITH' || ctx.isWithClause);
        if (hasWithClause) {
            level = 1;
        }
        
        // 处理表达式缩进
        const currentExpr = this.getCurrentExpression();
        if (currentExpr) {
            const rule = ExpressionIndentStrategy.getRule(currentExpr);
            level += (currentContext.expressionDepth || 0) * rule.childrenIndent;
        }
        
        return level;
    }
    
    getCurrentContext(): IndentationContext | undefined {
        return this.contexts[this.contexts.length - 1];
    }
    
    indent(content: string): string {
        const level = this.getCurrentLevel();
        const indentStr = ' '.repeat(level * this.baseIndentSize);
        return content.split('\n')
            .map(line => line.trim() ? indentStr + line : line)
            .join('\n');
    }
    
    shouldIndentWithClause(): boolean {
        return this.contexts.some(ctx => ctx.statementType === 'WITH' || ctx.isWithClause);
    }
    
    reset() {
        this.contexts = [];
        this.expressionStack = [];
    }
} 