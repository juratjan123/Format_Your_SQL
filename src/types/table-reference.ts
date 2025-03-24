/**
 * 表引用接口定义
 * 用于处理 SQL 中的表引用，包括普通表和子查询
 */
export interface TableReference {
    /** 引用类型：普通表或子查询 */
    type: 'table' | 'subquery';
    /** 数据库名称（可选） */
    database?: string;
    /** 表名（type 为 table 时必须） */
    tableName?: string;
    /** 表别名（可选） */
    alias?: string;
    /** 子查询信息（type 为 subquery 时必须） */
    subquery?: {
        /** 子查询的 AST */
        ast: any;
        /** 是否是 UNION 查询 */
        isUnion: boolean;
    };
} 