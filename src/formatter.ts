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
import { FormatValidator, ValidationResult } from './validators/format-validator';
import { WindowFunctionHandler } from './handlers/window-function-handler';
import { CastHandler } from './handlers/cast-handler';
import { ILogger, LoggerFactory } from './utils/logger-interface';

// 格式化超时时间（毫秒）
const FORMAT_TIMEOUT_MS = 10000; // 10秒超时

// 扩展格式化选项，增加enableLogging选项
export interface ExtendedFormatOptions extends FormatOptions {
    enableLogging?: boolean;
}

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
    private formatValidator: FormatValidator;
    private lastValidationResult: ValidationResult | null = null;
    private logger: ILogger;
    private formatInProgress: boolean = false;
    private formatTimeout: NodeJS.Timeout | null = null;

    constructor(options: Partial<ExtendedFormatOptions> = {}) {
        this.options = {
            indentSize: options.indentSize || 4
        };
        
        // 使用LoggerFactory创建适当的日志实例
        this.logger = LoggerFactory.createLogger(options.enableLogging || false);
        
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
        this.formatValidator = new FormatValidator();
        
        // 默认使用增强版优先级策略
        this.precedenceFactory.useEnhancedStrategy();
        
        // 初始化处理器
        this.expressionHandlers = [
            new WindowFunctionHandler(), // 首先处理窗口函数
            this.handlerFactory.createInClauseHandler(this.typeChecker),
            new BinaryExprHandler(),
            new AggregateFuncHandler(),
            new BetweenHandler(),
            new CaseWhenHandler(this.typeChecker),
            new FunctionHandler(),
            new SubqueryHandler(),
            new UnionSubqueryHandler(),
            new IntervalHandler(),
            new CastHandler()
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
                    
                    // 移除重复的窗口函数处理，因为已经由WindowFunctionHandler处理
                    return `${funcName}(${args})`;
                case 'cast':
                    // 处理 CAST 函数，这是一个回退方案，正常应该由 CastHandler 处理
                    if (decoratedExpr.expr && decoratedExpr.target && decoratedExpr.target.length) {
                        const sourceExpr = this.formatExpression(decoratedExpr.expr, {
                            ...context,
                            isInFunction: true
                        });
                        const targetType = decoratedExpr.target[0].dataType;
                        return `CAST(${sourceExpr} AS ${targetType})`;
                    }
                    return decoratedExpr.value || '';
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
            // 直接使用单行格式输出LIMIT
            parts.push(this.indent(level) + 'LIMIT ' + this.formatLimit(ast.limit, level, true));
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

    private formatLimit(limit: any, level: number, inlineFomat: boolean = false): string {
        if (!limit) {return '';}
        
        // 提取限制值
        let limitValue = '0'; // 默认值
        
        // 处理limit.value是数组的情况
        if (Array.isArray(limit.value) && limit.value.length > 0) {
            const limitItem = limit.value[0];
            // 检查并提取实际的限制值
            if (typeof limitItem === 'object' && limitItem.type === 'number' && 'value' in limitItem) {
                limitValue = limitItem.value.toString();
            } else if (typeof limitItem === 'number') {
                limitValue = limitItem.toString();
            } else if (typeof limitItem === 'string') {
                limitValue = limitItem;
            }
        }
        // 处理limit.value是单个值的情况
        else if (limit.value !== undefined && limit.value !== null) {
            if (typeof limit.value === 'object' && 'value' in limit.value) {
                limitValue = limit.value.value.toString();
            } else {
                limitValue = limit.value.toString();
            }
        }
        
        // 根据格式化模式返回结果
        return inlineFomat ? limitValue : this.indent(level + 1) + limitValue;
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

    /**
     * 检查SQL是否包含已知会导致解析器问题的模式
     * @param sql SQL字符串
     * @returns 是否包含问题模式
     */
    private containsProblematicPatterns(sql: string): boolean {
        // 转换为大写进行不区分大小写的检查
        const upperSql = sql.toUpperCase();
        
        // 检查组合模式: NOT FIND_IN_SET() > 0 
        // 这种组合已知会导致node-sql-parser卡死
        const findInSetNotPattern = /NOT\s+FIND_IN_SET\s*\([^)]+\)\s*>\s*0/i;
        
        // 检查CASE语句中有过多的AND条件
        // 首先检查是否有CASE语句
        if (upperSql.includes('CASE') && upperSql.includes('END')) {
            // 计算CASE语句中AND的数量
            const caseContent = sql.substring(
                upperSql.indexOf('CASE'),
                upperSql.lastIndexOf('END') + 3
            );
            
            // 计算AND出现的次数
            const andCount = (caseContent.toUpperCase().match(/\bAND\b/g) || []).length;
            
            // 如果AND超过10个，可能会导致解析器问题
            if (andCount > 10) {
                this.logger.warn('检测到CASE语句中有大量AND条件', { andCount });
                return true;
            }
        }
        
        // 检查是否匹配 NOT FIND_IN_SET 模式
        if (findInSetNotPattern.test(sql)) {
            this.logger.warn('检测到NOT FIND_IN_SET > 0模式', { 
                matches: sql.match(findInSetNotPattern)?.length || 0 
            });
            return true;
        }
        
        // 如果SQL长度超过3000字符且包含复杂函数调用，也可能导致问题
        if (sql.length > 3000 && upperSql.includes('FIND_IN_SET')) {
            return true;
        }
        
        return false;
    }

    /**
     * 清理格式化器的状态和上下文
     * 在格式化完成或出错时调用
     */
    private cleanup(): void {
        this.logger.debug('清理格式化器状态');
        this.formattingContext.clear();
        this.indentContextStack.clear();
        this.stateManager.clear();
    }

    /**
     * 获取最近的验证结果
     * @returns 验证结果，如果没有则返回null
     */
    public getLastValidationResult(): ValidationResult | null {
        return this.lastValidationResult;
    }

    /**
     * 设置格式化验证器的阈值
     * @param threshold 变化阈值（0-1之间的小数）
     */
    public setValidationThreshold(threshold: number): void {
        if (this.formatValidator) {
            this.formatValidator.significantChangeThreshold = threshold;
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

    /**
     * 格式化SQL查询
     * @param sql 原始SQL查询
     * @returns 格式化后的SQL查询
     */
    public format(sql: string): string {
        // 检查是否已经有格式化进行中，防止重入
        if (this.formatInProgress) {
            this.logger.warn('检测到重复格式化调用，上一次格式化尚未完成');
            return sql;
        }

        this.formatInProgress = true;
        this.logger.info('开始格式化SQL', { length: sql.length });
        const overallTimer = this.logger.startTimer('格式化完成');
        
        // 捕获特殊SQL模式，这些模式已知会导致解析器卡死
        if (this.containsProblematicPatterns(sql)) {
            this.logger.warn('检测到可能导致解析器卡死的SQL模式', { 
                patterns: ['NOT FIND_IN_SET', '复杂CASE语句'] 
            });
            
            // 直接抛出错误，不尝试简化格式化
            this.formatInProgress = false;
            overallTimer();
            throw new Error('格式化错误: 检测到可能导致解析器卡死的SQL模式，如FIND_IN_SET与NOT组合或过于复杂的CASE语句。请简化SQL后重试。');
        }
        
        try {
            // 设置超时保护
            let hasTimedOut = false;
            this.formatTimeout = setTimeout(() => {
                hasTimedOut = true;
                this.logger.error('格式化超时', { timeoutMs: FORMAT_TIMEOUT_MS });
                // 清理资源
                this.cleanup();
                // 通过异常中断处理
                throw new Error(`格式化超时：操作耗时超过${FORMAT_TIMEOUT_MS / 1000}秒，可能存在无限循环或解析错误`);
            }, FORMAT_TIMEOUT_MS);
            
            // 保存原始SQL用于验证
            const originalSQL = sql;
            this.logger.logState('初始SQL', { length: sql.length, firstChars: sql.substring(0, 50) });
            
            // 1. 预处理
            this.logger.debug('开始预处理');
            const preProcessTimer = this.logger.startTimer('预处理');
            const preprocessedSQL = this.preProcessor.preProcess(sql);
            preProcessTimer();
            this.logger.logState('预处理完成', { length: preprocessedSQL.length });
            
            // 解析前确认准备状态
            this.logger.info('准备解析SQL为AST', { 
                sqlLength: preprocessedSQL.length,
                containsCase: preprocessedSQL.toUpperCase().includes('CASE'),
                containsFind: preprocessedSQL.toUpperCase().includes('FIND_IN_SET')
            });
            
            // 2. 解析为 AST - 使用短超时保护这个关键阶段
            this.logger.debug('开始解析SQL为AST');
            const parseTimer = this.logger.startTimer('AST解析');
            
            // 为解析阶段单独设置超时保护
            const parseTimeout = setTimeout(() => {
                this.logger.error('AST解析阶段超时', { timeoutMs: 5000 });
                if (this.formatTimeout) {
                    clearTimeout(this.formatTimeout); // 清除全局超时
                    this.formatTimeout = null;
                }
                this.cleanup();
                
                // 直接抛出错误，不尝试简化格式化
                this.formatInProgress = false;
                throw new Error('格式化错误: AST解析阶段超时，可能是复杂SQL导致解析器陷入问题。请简化SQL后重试。');
            }, 5000); // 5秒解析超时，比全局超时更短

            let ast;
            try {
                ast = this.parser.astify(preprocessedSQL);
                clearTimeout(parseTimeout); // 正常解析完成，清除超时
            } catch (parseError: any) {
                clearTimeout(parseTimeout);
                if (this.formatTimeout) {
                    clearTimeout(this.formatTimeout);
                    this.formatTimeout = null;
                }
                this.logger.error('AST解析失败', parseError);
                
                // 直接抛出错误，不尝试简化格式化
                this.cleanup();
                this.formatInProgress = false;
                overallTimer();
                throw new Error(`格式化错误: SQL解析失败: ${parseError.message}`);
            }
            
            parseTimer();
            this.logger.logState('AST解析完成', { 
                isArray: Array.isArray(ast),
                statements: Array.isArray(ast) ? ast.length : 1
            });
            
            // 3. 使用访问者模式格式化
            this.logger.debug('开始使用访问者模式格式化');
            const formatTimer = this.logger.startTimer('访问者格式化');
            const visitor = new FormatterVisitor(this);
            const walker = new SQLASTWalker(visitor);
            
            if (Array.isArray(ast)) {
                this.logger.debug(`处理${ast.length}条SQL语句`);
                ast.forEach((stmt, index) => {
                    this.logger.logState(`处理语句 #${index + 1}`, { type: stmt.type });
                    walker.walk(stmt);
                });
            } else {
                this.logger.debug('处理单条SQL语句');
                this.logger.logState('语句信息', { type: ast.type });
                walker.walk(ast);
            }
            
            let result = visitor.getResult();
            formatTimer();
            this.logger.logState('格式化完成', { resultLength: result.length });
            
            // 4. 后处理 - 恢复原始的map访问语法
            this.logger.debug('开始后处理');
            const postProcessTimer = this.logger.startTimer('后处理');
            result = this.preProcessor.postProcess(result);
            postProcessTimer();
            this.logger.logState('后处理完成', { finalLength: result.length });
            
            // 检查是否有未完成的状态
            if (this.stateManager.hasIncompleteStates()) {
                this.logger.warn('检测到未完成的状态', this.stateManager.getStates());
            }
            
            // 5. 验证格式化结果
            this.logger.debug('开始验证格式化结果');
            const validateTimer = this.logger.startTimer('结果验证');
            this.lastValidationResult = this.formatValidator.validate(originalSQL, result);
            validateTimer();
            this.logger.logState('验证结果', this.lastValidationResult);
            
            // 清理超时计时器
            if (this.formatTimeout) {
                clearTimeout(this.formatTimeout);
                this.formatTimeout = null;
            }
            
            // 清理上下文和状态
            this.cleanup();
            
            overallTimer();
            this.formatInProgress = false;
            return result;
        } catch (error: any) {
            // 确保在发生错误时也清理计时器
            if (this.formatTimeout) {
                clearTimeout(this.formatTimeout);
                this.formatTimeout = null;
            }
            
            // 记录详细错误信息
            this.logger.error('格式化过程出错', error);
            
            // 确保在发生错误时也清理上下文和状态
            this.cleanup();
            
            overallTimer();
            this.formatInProgress = false;
            throw new Error(`格式化错误: ${error.message}`);
        }
    }
}
