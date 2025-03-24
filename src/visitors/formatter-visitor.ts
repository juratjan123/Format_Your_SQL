import { ASTVisitor } from './ast-visitor';
import { SQLFormatter } from '../formatter';
import { IndentManager } from '../indent/indent-manager';
import { IndentationContext } from '../indent/indentation-context';
import { SetOperationsHandler } from '../handlers/set-operations-handler';

/**
 * SQL格式化访问者
 * 实现了ASTVisitor接口，用于格式化SQL
 */
export class FormatterVisitor implements ASTVisitor {
    private formatter: SQLFormatter;
    private result: string[] = [];
    private indentManager: IndentManager;
    private withClauseStack: number[] = [];
    private queryPath: string[] = [];
    private nodePath: string[] = [];
    private nodeDepth: number = 0;
    private setOperationsHandler: SetOperationsHandler;
    
    constructor(formatter: SQLFormatter) {
        this.formatter = formatter;
        this.indentManager = new IndentManager(formatter.getIndentSize());
        this.setOperationsHandler = new SetOperationsHandler(formatter);
    }
    
    private pushNode(type: string, index: number = 0) {
        this.nodePath.push(type);
        this.nodeDepth++;
        return {
            nodePath: [...this.nodePath],
            nodeDepth: this.nodeDepth,
            parentType: this.nodePath[this.nodePath.length - 2],
            childIndex: index
        };
    }
    
    private popNode() {
        this.nodePath.pop();
        this.nodeDepth--;
    }
    
    visitSelect(node: any) {
        const nodeInfo = this.pushNode('SELECT');
        this.queryPath.push('SELECT');
        
        const context: IndentationContext = {
            baseLevel: this.indentManager.getCurrentLevel(),
            statementType: 'SELECT',
            clauseType: 'EXPRESSION',
            isWithClause: this.withClauseStack.length > 0,
            queryPath: [...this.queryPath],
            joinLevel: this.withClauseStack.length,
            ...nodeInfo
        };
        
        this.indentManager.pushContext(context);
        
        // 检查是否是顶层查询且包含SET操作
        if (this.nodeDepth === 1 && this.setOperationsHandler.canHandle(node)) {
            const result = this.setOperationsHandler.handle(node, this.indentManager.getCurrentLevel());
            if (result) {
                this.result.push(this.indentManager.indent(result));
            }
        } else {
            const query = this.formatter.formatMainQuery(node, this.indentManager.getCurrentLevel());
            if (query) {
                this.result.push(this.indentManager.indent(query));
            }
        }
        
        this.indentManager.popContext();
        this.queryPath.pop();
        this.popNode();
    }
    
    visitWith(node: any) {
        if (!node.with || node.with.length === 0) {return;}
        
        const nodeInfo = this.pushNode('WITH');
        this.withClauseStack.push(0);
        this.queryPath.push('WITH');
        
        const context: IndentationContext = {
            baseLevel: 0,
            statementType: 'WITH',
            clauseType: 'CTE',
            isWithClause: true,
            queryPath: [...this.queryPath],
            joinLevel: this.withClauseStack.length,
            ...nodeInfo
        };
        
        this.indentManager.pushContext(context);
        
        const withClauses = node.with.map((clause: any, index: number) => {
            const clauseNodeInfo = this.pushNode('CTE', index);
            const name = clause.name.value;
            const result = this.getClauseResult(clause);
            this.popNode();
            return `${name} AS (\n${result}\n)`;
        });
        
        this.indentManager.popContext();
        this.withClauseStack.pop();
        this.queryPath.pop();
        this.popNode();

        this.result = ['WITH ' + withClauses.join(',\n')];
    }
    
    private getClauseResult(clause: any): string {
        if (!clause.stmt || !clause.stmt.ast) {return '';}
        
        const nodeInfo = this.pushNode('SUBQUERY');
        this.queryPath.push('CTE');
        
        const context: IndentationContext = {
            baseLevel: 1,
            statementType: 'SELECT',
            clauseType: 'SUBQUERY',
            isWithClause: true,
            queryPath: [...this.queryPath],
            joinLevel: this.withClauseStack.length,
            ...nodeInfo
        };
        
        this.indentManager.pushContext(context);
        
        let result = '';
        const ast = clause.stmt.ast;
        
        // 检查是否包含SET操作
        if (this.setOperationsHandler.canHandle(ast)) {
            result = this.setOperationsHandler.handle(ast, 1);
        } else {
            result = this.formatter.formatMainQuery(ast, 1);
        }
        
        this.indentManager.popContext();
        this.queryPath.pop();
        this.popNode();
        return result;
    }
    
    visitUnion(node: any) {
        // Union已经在getClauseResult中处理
    }
    
    visitBinaryExpr(node: any) {
        // 二元表达式的访问逻辑
    }
    
    visitColumnRef(node: any) {
        // 列引用的访问逻辑
    }
    
    visitFunction(node: any) {
        // 函数的访问逻辑
    }
    
    visitCreate(node: any) {
        if (!node || !node.table || !node.table[0]) {return;}

        const tableName = node.table[0].db ? 
            `${node.table[0].db}.${node.table[0].table}` : 
            node.table[0].table;
        
        let result = `CREATE TABLE ${tableName}`;
        
        if (node.as && node.query_expr) {
            result += ' AS\n';
            const query = this.formatter.formatMainQuery(node.query_expr, this.indentManager.getCurrentLevel());
            if (query) {
                result += query;
            }
        }
        
        this.result = [result];
    }
    
    getResult(): string {
        return this.result.join('\n');
    }
} 