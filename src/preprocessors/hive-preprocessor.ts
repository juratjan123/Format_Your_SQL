/**
 * Hive SQL预处理器
 * 专门用于处理Hive SQL特有的语法特性
 */
export class HivePreProcessor {
    // 用于匹配Hive map访问语法的模式 - 例如: request_map['id']
    private readonly MAP_ACCESS_PATTERN = /(\w+(?:\.\w+)*)(?:\['([^']+)'\]|\["([^"]+)"\])/g;
    
    // 用于匹配Hive数组访问语法的模式 - 例如: array_column[0]
    private readonly ARRAY_ACCESS_PATTERN = /(\w+(?:\.\w+)*)\[(\d+)\]/g;
    
    // 存储原始表达式和替换后表达式的映射
    private expressionReplacements: Map<string, string> = new Map();
    
    /**
     * 预处理Hive SQL
     * 处理特殊的Hive语法结构，使其能够被标准SQL解析器正确解析
     */
    preProcess(sql: string): string {
        // 清空之前的替换映射
        this.expressionReplacements.clear();
        
        // 处理map访问语法
        let processedSql = this.processMapAccess(sql);
        
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