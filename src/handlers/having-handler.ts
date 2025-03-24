import { SQLFormatter } from '../formatter';
import { ExpressionContext } from '../types/expression-context';

export class HavingHandler {
    handle(having: any, formatter: SQLFormatter, level: number): string {
        if (!having) {
            return '';
        }

        const context: ExpressionContext = {
            level: level,
            isTopLevel: true,
            clauseType: 'HAVING',
            isLogicalChain: true
        };

        const formattedExpr = formatter.formatExpression(having, context);
        const lines = formattedExpr.split('\n');
        
        if (lines.length === 1) {
            return formatter.indent(level) + formattedExpr;
        }
        
        return lines.map((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) {return '';}
            return formatter.indent(level) + trimmedLine;
        }).filter(line => line).join('\n');
    }
} 