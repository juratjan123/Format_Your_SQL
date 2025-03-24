import { TableReferenceProcessor, TableReference } from '../processors/table-reference-processor';
import { ExpressionContext } from '../types/expression-context';
import { SQLFormatterInterface } from '../interfaces/sql-formatter';
import { IndentationManager } from '../indent/indentation-manager';
import { IndentationContext } from '../indent/indentation-context';
import { FormattingContext } from '../context/formatting-context';
import { SubqueryStrategyFactory } from '../strategies/subquery-strategy';

export class JoinHandler {
    private tableProcessor: TableReferenceProcessor;
    private indentManager: IndentationManager;
    private formattingContext: FormattingContext;
    private subqueryStrategyFactory: SubqueryStrategyFactory;

    constructor(private formatter: SQLFormatterInterface) {
        this.tableProcessor = new TableReferenceProcessor(formatter);
        this.indentManager = new IndentationManager();
        this.formattingContext = FormattingContext.getInstance();
        this.subqueryStrategyFactory = SubqueryStrategyFactory.getInstance();
    }

    handle(joins: any[], level: number): string {
        if (!joins || joins.length === 0) {return '';}

        try {
            this.formattingContext.pushContext({
                type: 'JOIN',
                level: level,
                parentType: this.formattingContext.getCurrentContext()?.type
            });

            // 单表查询的特殊处理
            if (joins.length === 1 && !joins[0].join) {
                const tableRef = this.tableProcessor.process(joins[0], level);
                const result = this.formatter.indent(level) + this.formatTableReference(tableRef);
                this.formattingContext.popContext();
                return result;
            }

            // 多表JOIN的处理
            const firstTable = joins[0];
            let firstTableRef;
            
            if (firstTable.expr) {
                // 处理子查询
                firstTableRef = this.tableProcessor.process(firstTable, level);
                const subQuery = this.formatSubqueryReference(firstTableRef, level);
                let result = this.formatter.indent(level) + subQuery;

                // 处理JOIN部分
                if (joins.length > 1) {
                    const joinParts = joins.slice(1).map((join) => {
                        try {
                            const tableRef = this.tableProcessor.process(join, level);
                            const joinType = join.join ? join.join.toUpperCase() : '';
                            const onClause = join.on ? this.formatOnClause(join.on, level) : '';

                            if (tableRef.type === 'subquery') {
                                const subQuery = this.formatSubqueryReference(tableRef, level);
                                return this.formatter.indent(level) + `${joinType} ${subQuery}${onClause ? ' ' + onClause : ''}`;
                            } else {
                                const tableName = tableRef.database ? 
                                    `${tableRef.database}.${tableRef.tableName}` : 
                                    tableRef.tableName;
                                const alias = tableRef.alias ? ` ${tableRef.alias}` : '';
                                return this.formatter.indent(level) + `${joinType} ${tableName}${alias}${onClause ? ' ' + onClause : ''}`;
                            }
                        } catch (innerError) {
                            console.error('Error processing table reference:', innerError);
                            const tableName = join.table || 'unknown';
                            const alias = join.as ? ` ${join.as}` : '';
                            const joinType = join.join ? join.join.toUpperCase() : '';
                            const onClause = join.on ? this.formatOnClause(join.on, level) : '';
                            return this.formatter.indent(level) + `${joinType} ${tableName}${alias}${onClause ? ' ' + onClause : ''}`;
                        }
                    });
                    
                    result += '\n' + joinParts.join('\n');
                }

                this.formattingContext.popContext();
                return result;
            } else {
                // 处理普通表
                firstTableRef = this.tableProcessor.process(firstTable, level);
                const tableName = firstTableRef.database ? 
                    `${firstTableRef.database}.${firstTableRef.tableName}` : 
                    firstTableRef.tableName;
                const alias = firstTableRef.alias ? ` ${firstTableRef.alias}` : '';
                let result = this.formatter.indent(level) + tableName + alias;

                // 处理JOIN部分
                if (joins.length > 1) {
                    const joinParts = joins.slice(1).map((join) => {
                        try {
                            const tableRef = this.tableProcessor.process(join, level);
                            const joinType = join.join ? join.join.toUpperCase() : '';
                            const onClause = join.on ? this.formatOnClause(join.on, level) : '';

                            if (tableRef.type === 'subquery') {
                                const subQuery = this.formatSubqueryReference(tableRef, level);
                                return this.formatter.indent(level) + `${joinType} ${subQuery}${onClause ? ' ' + onClause : ''}`;
                            } else {
                                const tableName = tableRef.database ? 
                                    `${tableRef.database}.${tableRef.tableName}` : 
                                    tableRef.tableName;
                                const alias = tableRef.alias ? ` ${tableRef.alias}` : '';
                                return this.formatter.indent(level) + `${joinType} ${tableName}${alias}${onClause ? ' ' + onClause : ''}`;
                            }
                        } catch (innerError) {
                            console.error('Error processing table reference:', innerError);
                            const tableName = join.table || 'unknown';
                            const alias = join.as ? ` ${join.as}` : '';
                            const joinType = join.join ? join.join.toUpperCase() : '';
                            const onClause = join.on ? this.formatOnClause(join.on, level) : '';
                            return this.formatter.indent(level) + `${joinType} ${tableName}${alias}${onClause ? ' ' + onClause : ''}`;
                        }
                    });
                    
                    result += '\n' + joinParts.join('\n');
                }

                this.formattingContext.popContext();
                return result;
            }
        } catch (error) {
            console.error('Error in JoinHandler:', error);
            this.formattingContext.popContext();
            // 出错时返回原始的 JOIN 格式，保持向后兼容
            return joins.map((join, index) => {
                const tableName = join.table || (join.expr ? '(...)' : 'unknown');
                const alias = join.as ? ` ${join.as}` : '';
                const joinType = join.join ? join.join.toUpperCase() : '';
                return index === 0 ? 
                    this.formatter.indent(level) + tableName + alias : 
                    this.formatter.indent(level) + `${joinType} ${tableName}${alias}`;
            }).join('\n');
        }
    }

    private formatTableReference(tableRef: TableReference): string {
        if (tableRef.type === 'subquery') {
            return this.formatSubqueryReference(tableRef, 1);
        }

        let ref = '';
        if (tableRef.database) {
            ref += tableRef.database + '.';
        }
        ref += tableRef.tableName;
        if (tableRef.alias) {
            ref += ' ' + tableRef.alias;
        }
        return ref;
    }

    private formatSubqueryReference(tableRef: TableReference, level: number): string {
        if (!tableRef.subqueryContext) {
            // 向后兼容的处理
            if (tableRef.subquery?.ast) {
                const formattedQuery = this.formatter.formatQuery(tableRef.subquery.ast, level + 1);
                return `(\n${formattedQuery}\n${this.formatter.indent(level)})${tableRef.alias ? ` ${tableRef.alias}` : ''}`;
            }
            return '(...)' + (tableRef.alias ? ` ${tableRef.alias}` : '');
        }

        try {
            const strategy = this.subqueryStrategyFactory.getStrategy(tableRef.subqueryContext.type);
            return strategy.format(tableRef.subqueryContext, this.formatter);
        } catch (error) {
            console.error('Error in formatSubqueryReference:', error);
            return '(...)' + (tableRef.alias ? ` ${tableRef.alias}` : '');
        }
    }

    private formatOnClause(on: any, level: number): string {
        const context: ExpressionContext = {
            level: level,
            isTopLevel: false,
            isJoinCondition: true,
            clauseType: 'JOIN',
            isInFunction: false
        };

        return 'ON ' + this.formatter.formatExpression(on, context);
    }
} 