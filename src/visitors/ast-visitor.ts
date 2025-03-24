/**
 * SQL AST访问者接口
 * 定义了访问AST各种节点的方法
 */
export interface ASTVisitor {
    visitSelect(node: any): void;
    visitWith(node: any): void;
    visitUnion(node: any): void;
    visitBinaryExpr(node: any): void;
    visitColumnRef(node: any): void;
    visitFunction(node: any): void;
    visitCreate(node: any): void;
}

/**
 * SQL AST遍历器
 * 负责遍历AST树的各个节点
 */
export class SQLASTWalker {
    private visitor: ASTVisitor;
    private visited: Set<any> = new Set();
    
    constructor(visitor: ASTVisitor) {
        this.visitor = visitor;
    }

    walk(ast: any) {
        if (!ast || this.visited.has(ast)) {return;}
        this.visited.add(ast);
        
        // 处理 WITH 子句
        if (ast.with) {
            this.visitor.visitWith?.(ast);
        }

        // 处理 CREATE
        if (ast.type === 'create') {
            this.visitor.visitCreate?.(ast);
            return;  // CREATE 语句不需要继续处理子节点
        }

        // 处理 SELECT
        if (ast.type === 'select') {
            this.visitor.visitSelect?.(ast);
        }
        
        // 处理表达式
        if (ast.type === 'binary_expr') {
            this.visitor.visitBinaryExpr?.(ast);
        }

        if (ast.type === 'column_ref') {
            this.visitor.visitColumnRef?.(ast);
        }

        if (ast.type === 'function') {
            this.visitor.visitFunction?.(ast);
        }
    }
} 