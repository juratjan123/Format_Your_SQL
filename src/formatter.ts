/**
 * SQL格式化器模块
 * 该模块提供了SQL语句的解析和格式化功能
 * 使用 node-sql-parser 作为底层解析器
 */
import { Parser } from 'node-sql-parser';
import { ExpressionTypeChecker, SQLExpressionTypeChecker } from './types/expression-checker';
import { ExpressionHandler } from './handlers/expression-handler';
import { InClauseHandler } from './handlers/in-clause-handler';
import { ExpressionContext } from './types/expression-context';
import { BinaryExprHandler } from './handlers/binary-expr-handler';
import { FormatOptions } from './types/formatter-options';
import { WhereClauseHandler } from './handlers/where-clause-handler';
import { JoinHandler } from './handlers/join-handler';
import { SQLFormatterInterface } from './interfaces/sql-formatter';
import { SQLPreProcessor } from './preprocessors/sql-preprocessor';
import { SQLASTWalker } from './visitors/ast-visitor';
import { FormatterVisitor } from './visitors/formatter-visitor';
import { IndentationManager } from './indent/indentation-manager';
import { CaseWhenHandler } from './handlers/case-when-handler';
import { AggregateFuncHandler } from './handlers/aggregate-func-handler';
import { BetweenHandler } from './handlers/between-handler';
import { GroupByHandler } from './handlers/group-by-handler';
import { OrderByHandler } from './handlers/order-by-handler';
import { HavingHandler } from './handlers/having-handler';
import { WithClauseHandler } from './handlers/with-clause-handler';
import { CreateStatementHandler } from './handlers/create-statement-handler';
import { FormattingContext } from './context/formatting-context';
import { ExpressionContextTracker } from './context/expression-context-tracker';
import { DecoratorRegistry } from './decorators/expression-decorator';
import { IndentContextStack } from './indent/indent-context-stack';
import { ExpressionFormatter } from './interfaces/expression-formatter';
import { HandlerFactory } from './factories/handler-factory';
import { FunctionHandler } from './handlers/function-handler';
import { SubqueryHandler } from './handlers/subquery-handler';
import { UnionSubqueryHandler } from './handlers/union-subquery-handler';
import { ExpressionStateManager } from './context/expression-state-manager';
import { ExpressionValidator } from './validators/expression-validator';
import { IntervalHandler } from './handlers/interval-handler';
import { PrecedenceFactory } from './factories/precedence-factory';

export class SQLFormatter implements SQLFormatterInterface, ExpressionFormatter {
    private parser: Parser;
    private preProcessor: SQLPreProcessor;
    private expressionHandlers: ExpressionHandler[];
    private joinHandler: JoinHandler;
    private whereHandler: WhereClauseHandler;
    private orderByHandler: any;  // 保持原有类型
    private groupByHandler: GroupByHandler;
    private havingHandler: any;   // 保持原有类型
    private withClauseHandler: any; // 保持原有类型
    private createStatementHandler: any; // 保持原有类型
    private options: FormatOptions;
    private formattingContext: FormattingContext;
    private indentManager: IndentationManager;
    private typeChecker: ExpressionTypeChecker;
    private expressionTracker: ExpressionContextTracker;
    private decoratorRegistry: DecoratorRegistry;
    private indentContextStack: IndentContextStack;
    private handlerFactory: HandlerFactory;
    private stateManager: ExpressionStateManager;
    private validator: ExpressionValidator;
    private precedenceFactory: PrecedenceFactory;

    constructor(options: Partial<FormatOptions> = {}) {
        this.options = {
            indentSize: options.indentSize || 4
        };
        
        this.formattingContext = FormattingContext.getInstance();
        // @ts-ignore
        this.parser = new Parser({ database: 'hive' });
        this.preProcessor = new SQLPreProcessor();
        this.indentManager = new IndentationManager();
        this.typeChecker = new SQLExpressionTypeChecker();
        this.expressionTracker = ExpressionContextTracker.getInstance();
        this.decoratorRegistry = DecoratorRegistry.getInstance();
        this.indentContextStack = IndentContextStack.getInstance();
        this.handlerFactory = HandlerFactory.getInstance();
        this.stateManager = ExpressionStateManager.getInstance();
        this.validator = ExpressionValidator.getInstance();
        this.precedenceFactory = PrecedenceFactory.getInstance();
        
        // 默认使用增强版优先级策略
        this.precedenceFactory.useEnhancedStrategy();
        
        // 初始化处理器
        this.expressionHandlers = [
            this.handlerFactory.createInClauseHandler(this.typeChecker),
            new BinaryExprHandler(),
            new AggregateFuncHandler(),
            new BetweenHandler(),  // 使用更新后的BetweenHandler
            new CaseWhenHandler(this.typeChecker),
            new FunctionHandler(),
            new SubqueryHandler(),
            new UnionSubqueryHandler(),
            new IntervalHandler()  // 添加INTERVAL处理器
        ];
        
        this.joinHandler = new JoinHandler(this);
        this.whereHandler = new WhereClauseHandler();
        this.orderByHandler = new OrderByHandler();
        this.groupByHandler = new GroupByHandler();
        this.havingHandler = new HavingHandler();
        this.withClauseHandler = new WithClauseHandler();
        this.createStatementHandler = new CreateStatementHandler();
    }

    public indent(level: number): string {
        return ' '.repeat(this.options.indentSize * level);
    }

    private formatColumns(columns: any[], level: number = 1): string {
        const context = this.indentManager.createContext(
            level,
            'SELECT',
            'EXPRESSION'
        );
        
        return columns.map((col: any) => {
            // 检查是否是聚合函数
            const isAggregateFunction = col.expr?.type === 'aggr_func';
            const expressionContext: ExpressionContext = {
                level: level,
                isTopLevel: true,
                clauseType: 'SELECT',
                isInFunction: isAggregateFunction
            };
            
            let result = this.formatExpression(col.expr, expressionContext);
            if (col.as) {
                result += ` as ${col.as}`;
            }
            return this.indent(level) + result;
        }).join(',\n');
    }

    private formatJoins(tables: any[]): string {
        if (!tables || tables.length <= 1) {return '';}
        
        return tables.slice(1).map(table => {
            const joinType = table.join;
            const tableName = table.table + (table.as ? ` ${table.as}` : '');
            const onClause = table.on ? ` ON ${this.formatExpression(table.on)}` : '';
            return `${joinType} ${tableName}${onClause}`;
        }).join('\n');
    }

    public formatExpression(expr: any, context: ExpressionContext = { level: 1, isTopLevel: true }): string {
        if (!expr) {return '';}
        
        this.expressionTracker.pushContext(context);
        try {
            // 应用装饰器
            const decoratedExpr = this.applyDecorators(expr, context);
            
            // 查找合适的处理器
            for (const handler of this.expressionHandlers) {
                if (handler.canHandle(decoratedExpr)) {
                    return handler.handle(decoratedExpr, this, context);
                }
            }
            
            // 基础类型处理
            switch (decoratedExpr.type) {
                case 'function':
                    const funcName = decoratedExpr.name?.name?.[0]?.value || decoratedExpr.name?.value || '';
                    const args = decoratedExpr.args.value.map((arg: any) => 
                        this.formatExpression(arg, { ...context, isInFunction: true })
                    ).join(', ');
                    
                    // 处理窗口函数的OVER子句
                    if (decoratedExpr.over) {
                        const partitionBy = decoratedExpr.over.as_window_specification?.window_specification?.partitionby;
                        const orderBy = decoratedExpr.over.as_window_specification?.window_specification?.orderby;
                        
                        let overClause = ' OVER (';
                        
                        if (partitionBy) {
                            const partitionExpr = partitionBy.map((p: any) => 
                                this.formatExpression(p.expr, { ...context, isInFunction: true })
                            ).join(', ');
                            overClause += `PARTITION BY ${partitionExpr}`;
                        }
                        
                        if (orderBy) {
                            if (partitionBy) {
                                overClause += ' ';
                            }
                            const orderExpr = orderBy.map((o: any) => {
                                const expr = this.formatExpression(o.expr, { ...context, isInFunction: true });
                                return `${expr} ${o.type}`;
                            }).join(', ');
                            overClause += `ORDER BY ${orderExpr}`;
                        }
                        
                        overClause += ')';
                        return `${funcName}(${args})${overClause}`;
                    }

                    return `${funcName}(${args})`;
                case 'column_ref':
                    return decoratedExpr.table ? 
                        `${decoratedExpr.table}.${decoratedExpr.column}` : 
                        decoratedExpr.column;
                case 'number':
                    return decoratedExpr.value.toString();
                case 'single_quote_string':
                    return `'${decoratedExpr.value}'`;
                case 'double_quote_string':
                    return `"${decoratedExpr.value}"`;
                case 'binary_expr':
                    const left = this.formatExpression(decoratedExpr.left, context);
                    const right = this.formatExpression(decoratedExpr.right, context);
                    if (context.isInFunction) {
                        return `${left} ${decoratedExpr.operator} ${right}`;
                    }
                    return `${left}\n${this.indent(context.level)}${decoratedExpr.operator} ${right}`;
                case 'expr_list':
                    if (Array.isArray(decoratedExpr.value)) {
                        const values = decoratedExpr.value.map((val: any) => 
                            this.formatExpression(val, context)
                        );
                        
                        // 如果是BETWEEN的操作数，使用AND分隔
                        if (context.parentOperator === 'BETWEEN') {
                            return values.join(' AND ');
                        }
                        
                        // 其他情况使用逗号分隔
                        return values.join(', ');
                    }
                    return decoratedExpr.value?.toString() || '';
                case 'interval':
                    // 作为后备处理机制，确保即使IntervalHandler不工作也能处理interval类型
                    const intervalValue = this.formatExpression(decoratedExpr.expr, { ...context, isInFunction: true });
                    const unit = decoratedExpr.unit ? decoratedExpr.unit.toUpperCase() : '';
                    return `INTERVAL ${intervalValue} ${unit}`.trim();
                default:
                    return decoratedExpr.value || '';
            }
        } finally {
            this.expressionTracker.popContext();
        }
    }

    private applyDecorators(expr: any, context: ExpressionContext): any {
        return this.decoratorRegistry.getDecorators().reduce(
            (decorated, decorator) => decorator.decorate(decorated, context),
            expr
        );
    }

    public formatMainQuery(ast: any, level: number = 0): string {
        const parts: string[] = [];
        
        if (ast.columns) {
            parts.push(this.indent(level) + 'SELECT');
            if (ast.distinct) {
                parts[parts.length - 1] += ' DISTINCT';
            }
            parts.push(this.formatColumns(ast.columns, level + 1));
        }
        
        if (ast.from) {
            parts.push(this.indent(level) + 'FROM');
            const fromPart = this.formatFrom(ast.from, level);
            parts.push(fromPart);
        }
        
        if (ast.where) {
            parts.push(this.indent(level) + 'WHERE');
            parts.push(this.formatWhere(ast.where, level + 1));
        }
        
        if (ast.groupby) {
            parts.push(this.indent(level) + 'GROUP BY');
            parts.push(this.formatGroupBy(ast.groupby, level + 1));
        }
        
        if (ast.having) {
            parts.push(this.indent(level) + 'HAVING');
            parts.push(this.formatHaving(ast.having, level + 1));
        }
        
        if (ast.orderby) {
            parts.push(this.indent(level) + 'ORDER BY');
            parts.push(this.formatOrderBy(ast.orderby, level + 1));
        }
        
        if (ast.limit) {
            parts.push(this.indent(level) + 'LIMIT');
            parts.push(this.formatLimit(ast.limit, level + 1));
        }
        
        return parts.join('\n');
    }

    private formatFrom(from: any[], level: number): string {
        if (!from || from.length === 0) {return '';}
        
        return this.joinHandler.handle(from, level + 1);
    }

    private formatWhere(where: any, level: number): string {
        if (!where) {return '';}
        return this.whereHandler.handle(where, this, level);
    }

    private formatOrderBy(orderby: any, level: number): string {
        if (!orderby) {return '';}
        return this.orderByHandler.handle(orderby, this, level);
    }

    private formatLimit(limit: any, level: number): string {
        return this.indent(level + 1) + limit.value;
    }

    private formatGroupBy(groupby: any, level: number): string {
        if (!groupby) {return '';}
        return this.groupByHandler.handle(groupby, this, level);
    }

    private formatHaving(having: any, level: number): string {
        if (!having) {return '';}
        return this.havingHandler.handle(having, this, level);
    }

    private formatWith(withClauses: any[]): string {
        if (!withClauses || withClauses.length === 0) {return '';}
        return this.withClauseHandler.handle(withClauses, this);
    }

    private formatStatement(ast: any): string {
        let result = '';
        
        if (ast.type === 'create') {
            return this.createStatementHandler.handle(ast, this);
        }
        
        if (ast.with) {
            result = this.formatWith(ast.with) + '\n';
        }

        result += this.formatMainQuery(ast);
        
        if (ast._next && ast.set_op) {
            const nextQuery = this.formatMainQuery(ast._next);
            const indentedQuery = nextQuery
                .split('\n')
                .map(line => this.indent(1) + line)
                .join('\n');
            result += '\n\n' + this.indent(1) + ast.set_op.toUpperCase() + '\n\n' + indentedQuery;
        }
        
        return result;
    }

    format(sql: string): string {
        try {
            // 清理之前可能存在的上下文和状态
            this.formattingContext.clear();
            this.indentContextStack.clear();
            this.stateManager.clear();
            
            // 设置根上下文
            this.formattingContext.pushContext({
                type: 'ROOT',
                level: 0
            });
            
            this.indentContextStack.push({
                type: 'ROOT',
                level: 0
            });
            
            // 1. 预处理 SQL
            const preprocessedSQL = this.preProcessor.preProcess(sql);
            
            // 2. 解析为 AST
            const ast = this.parser.astify(preprocessedSQL);
            
            // 3. 使用访问者模式格式化
            const visitor = new FormatterVisitor(this);
            const walker = new SQLASTWalker(visitor);
            
            if (Array.isArray(ast)) {
                ast.forEach(stmt => walker.walk(stmt));
            } else {
                walker.walk(ast);
            }
            
            const result = visitor.getResult();
            
            // 检查是否有未完成的状态
            if (this.stateManager.hasIncompleteStates()) {
                console.warn('Warning: Some expressions may be incomplete');
            }
            
            // 清理上下文和状态
            this.formattingContext.clear();
            this.indentContextStack.clear();
            this.stateManager.clear();
            
            return result;
        } catch (error: any) {
            // 确保在发生错误时也清理上下文和状态
            this.formattingContext.clear();
            this.indentContextStack.clear();
            this.stateManager.clear();
            throw new Error(`格式化错误: ${error.message}`);
        }
    }

    public formatQuery(ast: any, level: number = 0): string {
        return this.formatMainQuery(ast, level);
    }

    public getIndentSize(): number {
        return this.options.indentSize;
    }

    public formatBinaryExpr(expr: any): string {
        // 使用 BinaryExprHandler 来处理二元表达式
        const handler = this.expressionHandlers.find(h => h instanceof BinaryExprHandler);
        if (handler && handler.canHandle(expr)) {
            return handler.handle(expr, this, { level: 1, isTopLevel: true });
        }
        // 如果没有找到处理器，返回简单格式化
        const left = this.formatExpression(expr.left);
        const right = this.formatExpression(expr.right);
        return `${left} ${expr.operator} ${right}`;
    }
}
