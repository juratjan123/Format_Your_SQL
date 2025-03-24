import { BaseHandler } from './base-handler';
import { ExpressionContext } from '../types/expression-context';
import { ExpressionFormatter } from '../interfaces/expression-formatter';
import { ExpressionTypeChecker } from '../types/expression-checker';
import { FormatRuleEngine } from '../rules/format-rule-engine';
import { FormatContextManager } from '../context/format-context-manager';
import { IndentContextStack } from '../indent/indent-context-stack';
import { withIndentContext } from '../decorators/indent-decorator';
import { SubqueryIndentStrategy } from '../indent/subquery-indent-strategy';
import { SQLValueFormatter } from '../types/sql-value';

export class InClauseHandler extends BaseHandler {
    private ruleEngine: FormatRuleEngine;
    private contextManager: FormatContextManager;
    private indentStrategy: SubqueryIndentStrategy;

    constructor(
        private typeChecker: ExpressionTypeChecker,
        private valueFormatter: SQLValueFormatter
    ) {
        super();
        this.contextManager = new FormatContextManager();
        this.ruleEngine = new FormatRuleEngine(this.contextManager);
        this.indentStrategy = new SubqueryIndentStrategy();
    }

    canHandle(expr: any): boolean {
        return expr.type === 'binary_expr' && (expr.operator === 'IN' || expr.operator === 'NOT IN');
    }
    
    @withIndentContext('SUBQUERY', 1)
    handle(expr: any, formatter: ExpressionFormatter, context: ExpressionContext): string {
        // 重置上下文，确保每次处理都是全新的状态
        this.contextManager.reset();
        
        const left = formatter.formatExpression(expr.left);
        
        // 处理子查询
        if (expr.right?.value?.[0]?.ast) {
            const subquery = expr.right.value[0];
            const stack = IndentContextStack.getInstance();
            const effectiveLevel = this.indentStrategy.calculateIndent({
                type: 'SUBQUERY',
                level: context.level
            });
            
            const formattedQuery = formatter.formatQuery(subquery.ast, effectiveLevel);
            
            // 检查子查询是否简单
            if (this.isSimpleSubquery(subquery.ast)) {
                // 简单子查询：单行格式
                return `${left} ${expr.operator} (${formattedQuery.replace(/\n\s*/g, ' ').trim()})`;
            } else {
                // 复杂子查询：多行格式，使用新的缩进机制
                const baseIndent = ' '.repeat(context.level * formatter.getIndentSize());
                const subqueryIndent = ' '.repeat((context.level + 1) * formatter.getIndentSize());
                
                // 处理每一行，保持与主查询一致的缩进风格
                const lines = formattedQuery.split('\n').map(line => {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) {return '';}
                    
                    // 关键字（SELECT, FROM, WHERE等）使用一级缩进
                    if (/^(SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT)\b/i.test(trimmedLine)) {
                        return subqueryIndent + trimmedLine;
                    }
                    // 其他行使用二级缩进
                    return subqueryIndent + ' '.repeat(formatter.getIndentSize()) + trimmedLine;
                }).filter(line => line);
                
                return `${left} ${expr.operator} (\n${lines.join('\n')}\n${baseIndent})`;
            }
        }
        
        // 处理普通IN列表
        try {
            const values = expr.right.value.map((val: any) => {
                return this.valueFormatter.formatValue(val);
            });
            
            const valuesStr = values.join(', ');
            // 当值列表总长度超过阈值时进行换行处理
            if (valuesStr.length > 50) {
                const baseIndent = formatter.indent(context.level);
                const valueIndent = formatter.indent(context.level + 1);
                return `${left} ${expr.operator} (\n${valueIndent}${valuesStr}\n${baseIndent})`;
            }
            
            return `${left} ${expr.operator} (${valuesStr})`;
        } catch (error) {
            console.error('Error formatting IN clause values:', error);
            // 出错时尝试使用原始格式化方法
            const values = expr.right.value.map((val: any) => {
                if (val.type === 'number') {
                    return val.value.toString();
                }
                if (val.type === 'single_quote_string') {
                    return `'${val.value}'`;
                }
                return formatter.formatExpression(val);
            });
            
            const valuesStr = values.join(', ');
            return `${left} ${expr.operator} (${valuesStr})`;
        }
    }

    private isSimpleSubquery(ast: any): boolean {
        // 检查是否只有SELECT和FROM
        if (ast.where || ast.groupby || ast.having || 
            ast.orderby || ast.limit || ast.with) {
            return false;
        }
        
        // 检查FROM子句
        if (!ast.from || ast.from.length !== 1 || ast.from[0].join) {
            return false;
        }
        
        // 检查SELECT列表
        return ast.columns.every((col: any) => {
            if (!col.expr) {return false;}
            return col.expr.type === 'column_ref' || 
                   col.expr.type === 'string' || 
                   col.expr.type === 'number';
        });
    }
} 