export interface ExpressionContext {
    level: number;
    isTopLevel?: boolean;
    clauseType?: string;
    isInFunction?: boolean;
    depth?: number;
    parentExpr?: any;
    isJoinCondition?: boolean;
    position?: 'left' | 'right';
    parentOperator?: string;
    isLogicalChain?: boolean;
    logicalChainOperator?: string;
    isFirst?: boolean;
    isSubquery?: boolean;
    expressionRole?: 'CONDITION' | 'RESULT' | 'GENERAL';
    parentClause?: 'CASE_WHEN' | 'WHERE' | 'HAVING' | 'GENERAL';
}

export interface ExpressionFormatOptions {
    shouldIndent: boolean;
    shouldLineBreak: boolean;
    operatorPosition: 'inline' | 'newline';
}

export interface ValueConversionContext {
    role: 'CONDITION' | 'RESULT' | 'GENERAL';
    parentClause: string;
    originalType: string;
} 