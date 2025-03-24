export interface ASTNode {
    type: string;
    [key: string]: any;
}

export interface SubQueryNode extends ASTNode {
    tableList: string[];
    columnList: string[];
    ast: ASTNode;
}

export interface ExprListNode extends ASTNode {
    type: 'expr_list';
    value: (SubQueryNode | ASTNode)[];
}

export interface BinaryExprNode extends ASTNode {
    type: 'binary_expr';
    operator: string;
    left: ASTNode;
    right: ExprListNode | ASTNode;
}

export interface IntervalNode extends ASTNode {
    type: 'interval';
    expr: ASTNode;
    unit: string;
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}