import { ExpressionContext, ExpressionFormatOptions } from '../types/expression-context';

export interface OperatorHandler {
    canHandle(operator: string): boolean;
    getFormatOptions(context: ExpressionContext): ExpressionFormatOptions;
}

export class LogicalOperatorHandler implements OperatorHandler {
    private logicalOperators = new Set(['AND', 'OR']);
    
    canHandle(operator: string): boolean {
        return this.logicalOperators.has(operator.toUpperCase());
    }
    
    getFormatOptions(context: ExpressionContext): ExpressionFormatOptions {
        return {
            shouldIndent: true,
            shouldLineBreak: true,
            operatorPosition: 'newline'
        };
    }
}

export class ComparisonOperatorHandler implements OperatorHandler {
    private comparisonOperators = new Set(['=', '>', '<', '>=', '<=', '!=', 'IN']);
    
    canHandle(operator: string): boolean {
        return this.comparisonOperators.has(operator);
    }
    
    getFormatOptions(context: ExpressionContext): ExpressionFormatOptions {
        return {
            shouldIndent: false,
            shouldLineBreak: false,
            operatorPosition: 'inline'
        };
    }
}

export class DefaultOperatorHandler implements OperatorHandler {
    canHandle(operator: string): boolean {
        return true;
    }
    
    getFormatOptions(context: ExpressionContext): ExpressionFormatOptions {
        return {
            shouldIndent: false,
            shouldLineBreak: false,
            operatorPosition: 'inline'
        };
    }
} 