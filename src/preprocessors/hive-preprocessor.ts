/**
 * Hive SQL预处理器
 * 专门用于处理Hive SQL特有的语法特性
 */
export class HivePreProcessor {
    // 用于匹配Hive map访问语法的模式 - 例如: request_map['id']
    private readonly MAP_ACCESS_PATTERN = /(\w+(?:\.\w+)*)(?:\['([^']+)'\]|\["([^"]+)"\])/g;
    
    // 用于匹配Hive数组访问语法的模式 - 例如: array_column[0]
    private readonly ARRAY_ACCESS_PATTERN = /(\w+(?:\.\w+)*)\[(\d+)\]/g;
    
    // 用于匹配CAST表达式 - 例如: CAST(expr AS type)
    private readonly CAST_PATTERN = /\bCAST\s*\(\s*([^()]+)\s+AS\s+([^()]+)\s*\)/gi;
    
    // Hive数据类型映射
    private readonly HIVE_TYPE_MAP: Record<string, string> = {
        'string': 'VARCHAR',
        'varchar': 'VARCHAR',
        'char': 'CHAR',
        'int': 'INTEGER',
        'integer': 'INTEGER',
        'bigint': 'BIGINT',
        'smallint': 'SMALLINT',
        'tinyint': 'TINYINT',
        'double': 'DOUBLE',
        'float': 'FLOAT',
        'decimal': 'DECIMAL',
        'boolean': 'BOOLEAN',
        'date': 'DATE',
        'timestamp': 'TIMESTAMP',
        'binary': 'BINARY'
    };
    
    // 存储原始表达式和替换后表达式的映射
    private expressionReplacements: Map<string, string> = new Map();
    
    /**
     * 预处理Hive SQL
     * 处理特殊的Hive语法结构，使其能够被标准SQL解析器正确解析
     */
    preProcess(sql: string): string {
        // 清空之前的替换映射
        this.expressionReplacements.clear();
        
        // 处理CAST表达式
        let processedSql = this.processCastExpressions(sql);
        
        // 处理map访问语法
        processedSql = this.processMapAccess(processedSql);
        
        // 处理数组访问语法
        processedSql = this.processArrayAccess(processedSql);
        
        return processedSql;
    }
    
    /**
     * 后处理格式化后的SQL
     * 将处理过的表达式恢复为原始形式
     */
    postProcess(sql: string): string {
        let processed = sql;
        
        // 替换所有占位符为原始表达式
        for (const [placeholder, original] of this.expressionReplacements.entries()) {
            processed = processed.replace(new RegExp(placeholder, 'g'), original);
        }
        
        return processed;
    }
    
    /**
     * 处理CAST表达式，标准化数据类型名称
     * 将非标准类型名称替换为SQL解析器兼容的类型名称
     */
    private processCastExpressions(sql: string): string {
        return sql.replace(this.CAST_PATTERN, (match, expr, type) => {
            const trimmedType = type.trim().toLowerCase();
            let normalizedType = type;
            
            // 检查是否需要替换类型名称
            if (this.HIVE_TYPE_MAP[trimmedType]) {
                normalizedType = this.HIVE_TYPE_MAP[trimmedType];
            }
            
            // 如果类型没有变化，则保持原样
            if (normalizedType === type) {
                return match;
            }
            
            // 创建新的CAST表达式
            const newExpr = `CAST(${expr} AS ${normalizedType})`;
            
            // 保存原始表达式以便后处理还原
            const placeholder = `__HIVE_CAST_${this.expressionReplacements.size}__`;
            this.expressionReplacements.set(placeholder, match);
            
            return placeholder;
        });
    }
    
    /**
     * 处理Hive map访问语法
     * 将map['key']替换为占位符
     */
    private processMapAccess(sql: string): string {
        return sql.replace(this.MAP_ACCESS_PATTERN, (match, mapName, key1, key2) => {
            const key = key1 || key2;
            // 创建唯一占位符
            const placeholder = `${mapName}__MAP_ACCESS_${key}_${this.expressionReplacements.size}`;
            
            // 保存映射关系
            this.expressionReplacements.set(placeholder, match);
            
            return placeholder;
        });
    }
    
    /**
     * 处理Hive数组访问语法
     * 将array[index]替换为占位符
     */
    private processArrayAccess(sql: string): string {
        return sql.replace(this.ARRAY_ACCESS_PATTERN, (match, arrayName, index) => {
            // 创建唯一占位符
            const placeholder = `${arrayName}__ARRAY_ACCESS_${index}_${this.expressionReplacements.size}`;
            
            // 保存映射关系
            this.expressionReplacements.set(placeholder, match);
            
            return placeholder;
        });
    }
} 