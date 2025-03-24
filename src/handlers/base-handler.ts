import { ExpressionContext } from '../types/expression-context';
import { SQLFormatter } from '../formatter';
import { DecoratorRegistry } from '../decorators/expression-decorator';

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
} 