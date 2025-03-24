export interface IndentationContext {
    baseLevel: number;
    statementType: 'SELECT' | 'FROM' | 'WHERE' | 'GROUP BY' | 'HAVING' | 'ORDER BY' | 'WITH';
    clauseType: 'EXPRESSION' | 'SINGLE_TABLE' | 'JOIN' | 'SUBQUERY' | 'CTE';
    parentContext?: IndentationContext;
    isWithClause?: boolean;
    parentLevel?: number;
    queryPath?: string[];
    joinLevel?: number;
    nodePath?: string[];
    nodeDepth?: number;
    parentType?: string;
    childIndex?: number;
    parentChain?: string[];
    indentStrategy?: 'base' | 'sql';
    expressionType?: string;
    expressionDepth?: number;
    parentExpression?: string;
    alignmentMode?: 'start' | 'content';
} 