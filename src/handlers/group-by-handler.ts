import { SQLFormatter } from '../formatter';
import { ExpressionHandler } from './expression-handler';

export class GroupByHandler {
    handle(groupby: any, formatter: SQLFormatter, level: number): string {
        if (!groupby || !groupby.columns) {
            return '';
        }

        const groupByItems = groupby.columns.map((item: any) => {
            if (item.type === 'function') {
                return formatter.formatExpression(item);
            } else if (item.type === 'column_ref') {
                return item.table ? 
                    `${item.table}.${item.column}` : 
                    item.column;
            }
            return formatter.formatExpression(item);
        });

        return formatter.indent(level) + groupByItems.join(',\n' + formatter.indent(level));
    }
} 