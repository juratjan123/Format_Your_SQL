import { BaseHandler } from './base-handler';
import { ExpressionContext, ValueConversionContext } from '../types/expression-context';
import { SQLFormatter } from '../formatter';
import { ExpressionTypeChecker } from '../types/expression-checker';
import { IndentationContext } from '../indent/indentation-context';
import { ExpressionIndentStrategy } from '../indent/expression-indent-strategy';
import { ExpressionValidator } from '../validators/expression-validator';
import { SQLValueSystem } from '../strategies/value-system';
import { ExpressionStateManager } from '../context/expression-state-manager';

export class CaseWhenHandler extends BaseHandler {
    private stateManager: ExpressionStateManager;
    private validator: ExpressionValidator;
    private valueSystem: SQLValueSystem;

    constructor(private typeChecker: ExpressionTypeChecker) {
        super();
        this.stateManager = ExpressionStateManager.getInstance();
        this.validator = ExpressionValidator.getInstance();
        this.valueSystem = new SQLValueSystem();
    }

    canHandle(expr: any): boolean {
        return expr?.type === 'case' || 
               (expr?.type === 'function' && expr?.args?.value?.[0]?.type === 'case') ||
               (expr?.type === 'aggr_func' && expr?.args?.expr?.type === 'case');
    }

    private getIndentContext(expr: any, context: ExpressionContext): IndentationContext {
        return {
            baseLevel: context.level,
            statementType: 'SELECT',
            clauseType: 'EXPRESSION',
            expressionType: 'case',
            expressionDepth: context.depth || 0,
            parentExpression: context.parentExpr,
            alignmentMode: 'content'
        };
    }
    
    handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        try {
            // 验证表达式
            const validationResult = this.validator.validate(expr, context);
            if (!validationResult.isValid) {
                console.warn('CASE expression validation failed:', validationResult.errors);
            }

            // 处理聚合函数
            if (expr.type === 'aggr_func') {
                const decoratedExpr = this.decorateExpression(expr, context);
                const funcName = expr.name;
                const distinct = this.getDecoratedProperty(decoratedExpr, 'distinct') ? 'DISTINCT ' : '';
                const caseExpr = expr.args.expr;
                const formattedCase = this.formatCaseExpression(caseExpr, formatter, {
                    ...context,
                    isInFunction: true
                });
                return `${funcName}(${distinct}${formattedCase})`;
            }
            
            // 处理普通函数
            if (expr.type === 'function') {
                const funcName = expr.name.value;
                const formattedCase = this.formatCaseExpression(expr.args.value[0], formatter, {
                    ...context,
                    isInFunction: true
                });
                return `${funcName}(${formattedCase})`;
            }
            
            return this.formatCaseExpression(expr, formatter, context);
        } catch (error) {
            console.error('Error in CaseWhenHandler:', error);
            return expr.value || '';
        }
    }

    private formatCaseExpression(caseExpr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        if (!caseExpr || !caseExpr.args) {
            return '';
        }

        // 推入新的状态
        this.stateManager.pushState({
            type: 'case',
            depth: context.depth || 0,
            parentType: context.parentExpr ? (context.parentExpr as any).type || 'root' : 'root',
            isComplete: false,
            requiredClosings: ['END']
        });

        try {
            const indentContext = this.getIndentContext(caseExpr, context);
            const rule = ExpressionIndentStrategy.getRule('case');
            
            const cases = caseExpr.args;
            let result = '';
            
            // 根据上下文决定是否需要换行和缩进
            result = 'CASE';
            
            // CASE 表达式有两种形式：简单CASE和搜索CASE
            if (caseExpr.expr) {
                // 简单CASE: CASE column WHEN...
                result += ' ' + formatter.formatExpression(caseExpr.expr, context);
            }
            
            // 处理 WHEN-THEN 对和 ELSE 子句
            for (let i = 0; i < cases.length; i++) {
                const item = cases[i];
                if (item.type === 'when') {
                    // 处理 WHEN 条件
                    const whenContext: ExpressionContext = {
                        ...context,
                        isInFunction: true,  // 强制 when 条件在同一行
                        expressionRole: 'CONDITION',
                        parentClause: 'CASE_WHEN'
                    };
                    const when = formatter.formatExpression(item.cond, whenContext);
                    
                    // 处理 THEN 结果
                    const thenContext: ExpressionContext = {
                        ...context,
                        expressionRole: 'RESULT',
                        parentClause: 'CASE_WHEN'
                    };
                    
                    // 使用值系统处理THEN的结果
                    let then;
                    try {
                        const conversionContext: ValueConversionContext = {
                            role: 'RESULT',
                            parentClause: 'CASE_WHEN',
                            originalType: item.result?.type || 'unknown'
                        };
                        
                        const convertedValue = this.valueSystem.convert(item.result, conversionContext);
                        if (convertedValue.type === 'expression') {
                            then = formatter.formatExpression(convertedValue.value, thenContext);
                        } else {
                            then = this.valueSystem.format(convertedValue);
                        }
                    } catch (error) {
                        // 如果值系统处理失败，回退到原始格式化方法
                        then = formatter.formatExpression(item.result, thenContext);
                    }

                    if (context.isInFunction) {
                        // 在函数内部时，保持在同一行
                        result += ` WHEN ${when} THEN ${then}`;
                    } else {
                        // 在外部时，每个 WHEN-THEN 对单独一行，并保持正确的缩进
                        const whenIndent = formatter.indent(indentContext.baseLevel + rule.childrenIndent);
                        result += `\n${whenIndent}WHEN ${when} THEN ${then}`;
                    }
                } else if (item.type === 'else') {
                    // 优化ELSE子句处理
                    let elseResult;
                    try {
                        const conversionContext: ValueConversionContext = {
                            role: 'RESULT',
                            parentClause: 'CASE_WHEN',
                            originalType: item.result?.type || 'unknown'
                        };
                        
                        const convertedValue = this.valueSystem.convert(item.result, conversionContext);
                        if (convertedValue.type === 'expression') {
                            elseResult = formatter.formatExpression(convertedValue.value, {
                                ...context,
                                isInFunction: false,  // 确保复杂表达式可以正确换行
                                expressionRole: 'RESULT',
                                parentClause: 'CASE_WHEN'
                            });
                        } else {
                            elseResult = this.valueSystem.format(convertedValue);
                        }
                    } catch (error) {
                        // 如果值系统处理失败，回退到原始格式化方法
                        console.warn('Error in ELSE clause value conversion:', error);
                        elseResult = formatter.formatExpression(item.result, {
                            ...context,
                            isInFunction: false,
                            expressionRole: 'RESULT',
                            parentClause: 'CASE_WHEN'
                        });
                    }

                    if (context.isInFunction) {
                        result += ` ELSE ${elseResult}`;
                    } else {
                        const elseIndent = formatter.indent(indentContext.baseLevel + rule.childrenIndent);
                        result += `\n${elseIndent}ELSE ${elseResult}`;
                    }
                }
            }
            
            // 添加END关键字
            if (context.isInFunction) {
                result += ' END';
            } else {
                result += '\n' + formatter.indent(indentContext.baseLevel) + 'END';
            }

            return result;
        } finally {
            this.stateManager.popState();
        }
    }
} 