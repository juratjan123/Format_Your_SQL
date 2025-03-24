import { SQLFormatter } from '../formatter';

export class OrderByHandler {
    handle(orderby: any[], formatter: SQLFormatter, level: number): string {
        if (!orderby || orderby.length === 0) {
            return '';
        }

        const orderByItems = orderby.map((item: any) => {
            let result = formatter.formatExpression(item.expr);
            if (item.type === 'DESC') {
                result += ' DESC';
            }
            return result;
        });

        return formatter.indent(level) + orderByItems.join(',\n' + formatter.indent(level));
    }
} 