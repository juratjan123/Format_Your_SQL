import { TableReference } from '../types/table-reference';

export class TableProcessor {
    process(table: any, level: number): TableReference {
        if (!table) {
            return {
                type: 'table',
                tableName: 'unknown'
            };
        }

        // 处理子查询
        if (table.expr) {
            return {
                type: 'subquery',
                subquery: {
                    ast: table.expr,
                    isUnion: table.expr._next && table.expr.set_op
                },
                alias: table.as
            };
        }

        // 处理普通表
        return {
            type: 'table',
            database: table.db,
            tableName: table.table,
            alias: table.as
        };
    }
} 