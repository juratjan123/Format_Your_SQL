import { BaseHandler } from './base-handler';
import { ExpressionContext } from '../types/expression-context';
import { ExpressionFormatter } from '../interfaces/expression-formatter';

export class FunctionHandler extends BaseHandler {
    canHandle(expr: any): boolean {
        return expr?.type === 'function';
    }

    handle(expr: any, formatter: ExpressionFormatter, context: ExpressionContext): string {
        try {
            const funcName = expr.name.name[0].value;
            const args = expr.args?.value || [];
            
            // 格式化参数
            const formattedArgs = args.map((arg: any) => 
                formatter.formatExpression(arg, { ...context, isInFunction: true })
            ).join(', ');

            return `${funcName}(${formattedArgs})`;
        } catch (error) {
            console.error('Error in FunctionHandler:', error);
            return expr.value || '';
        }
    }
} 