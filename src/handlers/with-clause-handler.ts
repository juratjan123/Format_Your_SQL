import { SQLFormatter } from '../formatter';

export class WithClauseHandler {
    handle(withClauses: any[], formatter: SQLFormatter): string {
        if (!withClauses || withClauses.length === 0) {
            return '';
        }

        const clauses = withClauses.map((clause) => {
            const name = clause.name.value;
            const innerSql = formatter.formatQuery(clause.stmt.ast, 1);
            const formattedStmt = innerSql.endsWith(';') ? 
                innerSql.slice(0, -1) : innerSql;
            
            const lines = formattedStmt.split('\n');
            const formattedLines = lines.map((line, index) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) {return '';}
                if (index === 0) {
                    return `${name} AS (${trimmedLine}`;
                }
                return formatter.indent(1) + trimmedLine;
            }).filter(line => line);

            return formattedLines.join('\n') + '\n' + formatter.indent(1) + ')';
        });

        return 'WITH ' + clauses.join(',\n\n');
    }
} 