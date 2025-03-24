import { ConditionFlattener, FlattenedCondition } from '../processors/condition-flattener';
import { SQLFormatter } from '../formatter';
import { ExpressionContext } from '../types/expression-context';

export class WhereClauseHandler {
    handle(where: any, formatter: SQLFormatter, level: number): string {
        if (!where) {return '';}
        
        const context: ExpressionContext = {
            level: level,
            isTopLevel: true,
            clauseType: 'WHERE'
        };

        return formatter.indent(level) + formatter.formatExpression(where, context);
    }
} 