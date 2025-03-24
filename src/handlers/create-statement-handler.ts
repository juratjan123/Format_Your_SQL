import { SQLFormatter } from '../formatter';

export class CreateStatementHandler {
    handle(ast: any, formatter: SQLFormatter): string {
        if (ast.type !== 'create') {
            return '';
        }

        const tableName = ast.table[0].db ? 
            `${ast.table[0].db}.${ast.table[0].table}` : 
            ast.table[0].table;
        
        let result = `CREATE TABLE ${tableName}`;
        
        if (ast.as && ast.query_expr) {
            result += ' AS\n';
            result += formatter.formatQuery(ast.query_expr);
        }
        
        return result;
    }
} 