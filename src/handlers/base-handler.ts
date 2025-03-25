import { ExpressionContext } from '../types/expression-context';
import { SQLFormatter } from '../formatter';
import { DecoratorRegistry } from '../decorators/expression-decorator';
import { ExpressionFormatter } from "../interfaces/expression-formatter";

export interface ExpressionTypeHandler {
    canHandle(expr: any): boolean;
    handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string;
}

export abstract class BaseHandler implements ExpressionTypeHandler {
    private decoratorRegistry = DecoratorRegistry.getInstance();

    abstract canHandle(expr: any): boolean;
    abstract handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string;
    
    protected isSubquery(expr: any): boolean {
        return expr && expr.ast !== undefined && expr.tableList !== undefined;
    }
    
    protected isSimpleValue(expr: any): boolean {
        return expr && (typeof expr.value !== 'undefined');
    }

    protected decorateExpression(expr: any, context: ExpressionContext): any {
        return this.decoratorRegistry.getDecorators().reduce(
            (decorated, decorator) => decorator.decorate(decorated, context),
            expr
        );
    }

    protected getDecoratedProperty(expr: any, key: string): any {
        return expr?._decorators?.[key];
    }

    /**
     * 获取表达式的类型
     */
    protected getExpressionType(expr: any): string {
        return expr?.type || 'unknown';
    }

    /**
     * 获取表达式的值
     */
    protected getExpressionValue(expr: any): any {
        return expr?.value;
    }
    
    /**
     * 检查表达式是否为窗口函数
     */
    protected isWindowFunction(expr: any): boolean {
        return (expr?.type === 'function' || expr?.type === 'aggr_func') && 
               !!expr?.over;
    }
    
    /**
     * 检查是否是特定的窗口函数
     */
    protected isSpecificWindowFunction(expr: any, functionName: string): boolean {
        if (!this.isWindowFunction(expr)) {return false;}
        
        const name = expr.type === 'function' 
            ? (expr.name?.name?.[0]?.value || expr.name?.value || '').toUpperCase()
            : (expr.name || '').toUpperCase();
            
        return name === functionName.toUpperCase();
    }
    
    /**
     * 提取窗口函数的名称
     */
    protected getWindowFunctionName(expr: any): string {
        if (!this.isWindowFunction(expr)) {return '';}
        
        return expr.type === 'function'
            ? (expr.name?.name?.[0]?.value || expr.name?.value || '')
            : (expr.name || '');
    }
} 