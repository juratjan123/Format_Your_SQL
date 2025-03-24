type SQLClause = 'SELECT' | 'FROM' | 'WHERE' | 'GROUP BY' | 'HAVING' | 'ORDER BY';

export class IndentationValidator {
    private static readonly EXPECTED_INDENTS: Record<SQLClause, number> = {
        'SELECT': 0,
        'FROM': 0,
        'WHERE': 0,
        'GROUP BY': 0,
        'HAVING': 0,
        'ORDER BY': 0
    };

    private static readonly CONTENT_INDENTS: Record<SQLClause, number> = {
        'SELECT': 4,
        'FROM': 2,
        'WHERE': 2,
        'GROUP BY': 2,
        'HAVING': 2,
        'ORDER BY': 2
    };

    private static readonly JOIN_INDENT = 2;

    validate(sql: string, indentSize: number = 2): boolean {
        const lines = sql.split('\n');
        let currentClause = '';
        let isJoinClause = false;
        
        for (const line of lines) {
            const trimmedLine = line.trimLeft();
            const indent = line.length - trimmedLine.length;
            
            // 检查是否是JOIN语句
            if (trimmedLine.match(/^(INNER\s+)?JOIN\b/i)) {
                isJoinClause = true;
                // JOIN语句使用2级缩进
                const expectedIndent = IndentationValidator.JOIN_INDENT * indentSize;
                if (indent !== expectedIndent) {
                    console.warn(`Invalid JOIN indent: expected ${expectedIndent}, got ${indent}`);
                    return false;
                }
                continue;
            }
            
            // 检查是否是主要子句
            const clauseMatch = trimmedLine.match(/^(SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY)/i);
            if (clauseMatch) {
                const clause = clauseMatch[1].toUpperCase() as SQLClause;
                const expectedIndent = IndentationValidator.EXPECTED_INDENTS[clause] * indentSize;
                if (indent !== expectedIndent) {
                    console.warn(`Invalid indent for clause ${clause}: expected ${expectedIndent}, got ${indent}`);
                    return false;
                }
                currentClause = clause;
                isJoinClause = false;
                continue;
            }

            // 检查子句内容的缩进
            if (currentClause && trimmedLine.length > 0 && !isJoinClause) {
                const clause = currentClause as SQLClause;
                const expectedContentIndent = 
                    (IndentationValidator.EXPECTED_INDENTS[clause] + 
                     IndentationValidator.CONTENT_INDENTS[clause]) * 
                    indentSize;
                if (indent !== expectedContentIndent) {
                    console.warn(
                        `Invalid content indent in ${currentClause}: expected ${expectedContentIndent}, got ${indent}`
                    );
                    return false;
                }
            }
        }
        return true;
    }

    validateClause(clause: string, indent: number, indentSize: number = 2): boolean {
        const sqlClause = clause.toUpperCase() as SQLClause;
        const expectedIndent = IndentationValidator.EXPECTED_INDENTS[sqlClause] * indentSize;
        return indent === expectedIndent;
    }

    validateContent(clause: string, indent: number, indentSize: number = 2): boolean {
        const sqlClause = clause.toUpperCase() as SQLClause;
        const expectedIndent = 
            (IndentationValidator.EXPECTED_INDENTS[sqlClause] + 
             IndentationValidator.CONTENT_INDENTS[sqlClause]) * 
            indentSize;
        return indent === expectedIndent;
    }
} 