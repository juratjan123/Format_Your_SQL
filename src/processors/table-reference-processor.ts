import { SQLFormatterInterface } from '../interfaces/sql-formatter';
import { FormatContext } from '../context/format-context-manager';
import { SubqueryContext, SubqueryContextManager } from '../context/subquery-context';

export interface TableReference {
    type: 'table' | 'subquery';
    alias?: string;
    tableName?: string;
    subquery?: {
        ast: any;
        level: number;
        isUnion?: boolean;
        unionTables?: string[];
        context?: FormatContext;
    };
    database?: string;
    subqueryContext?: SubqueryContext;
    originalAst?: any;
}

export class TableReferenceProcessor {
    private subqueryContextManager: SubqueryContextManager;

    constructor(private formatter: SQLFormatterInterface) {
        this.subqueryContextManager = SubqueryContextManager.getInstance();
    }

    process(node: any, level: number, context?: FormatContext): TableReference {
        if (!node) {
            return {
                type: 'table',
                tableName: 'unknown'
            };
        }

        try {
            // 处理子查询
            if (node.expr) {
                const subqueryContext: SubqueryContext = {
                    level,
                    type: this.determineSubqueryType(node.expr),
                    ast: node.expr.ast,
                    parentheses: node.expr.parentheses || false,
                    alias: node.as
                };

                this.subqueryContextManager.pushContext(subqueryContext);

                const result: TableReference = {
                    type: 'subquery',
                    alias: node.as,
                    subqueryContext,
                    originalAst: node.expr,
                    subquery: {
                        ast: node.expr.ast,
                        level,
                        isUnion: subqueryContext.type === 'UNION',
                        context
                    }
                };

                // 如果是 UNION 查询，收集表信息
                if (subqueryContext.type === 'UNION' && node.expr.ast?._next) {
                    const firstTable = node.expr.ast.from?.[0];
                    const secondTable = node.expr.ast._next.from?.[0];

                    if (firstTable && secondTable) {
                        result.subquery!.unionTables = [
                            firstTable.db ? `${firstTable.db}.${firstTable.table}` : firstTable.table,
                            secondTable.db ? `${secondTable.db}.${secondTable.table}` : secondTable.table
                        ];
                    }
                }

                return result;
            }

            // 处理普通表
            return {
                type: 'table',
                alias: node.as,
                tableName: node.table,
                database: node.db
            };
        } catch (error) {
            console.error('Error in TableReferenceProcessor:', error);
            this.subqueryContextManager.popContext(); // 确保错误时也清理上下文
            return {
                type: 'table',
                tableName: node.table || 'unknown'
            };
        }
    }

    private determineSubqueryType(expr: any): SubqueryContext['type'] {
        if (!expr || !expr.ast) {return 'SIMPLE';}

        if (expr.ast._next && expr.ast.set_op) {
            return 'UNION';
        }

        if (expr.parentheses) {
            return 'NESTED';
        }

        // 检查是否是 WITH 子句中的子查询
        const currentContext = this.subqueryContextManager.getCurrentContext();
        if (currentContext?.type === 'WITH') {
            return 'WITH';
        }

        return 'SIMPLE';
    }
} 