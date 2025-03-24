/**
 * Hive语法辅助工具
 * 用于处理Hive特有的语法特性
 */
export class HiveSyntaxHelper {
    /**
     * 检测SQL中是否包含Hive特有的map访问表达式
     * 例如: map_column['key']
     */
    static containsMapAccessExpression(sql: string): boolean {
        const mapAccessPattern = /(\w+(?:\.\w+)*)(?:\['([^']+)'\]|\["([^"]+)"\])/g;
        return mapAccessPattern.test(sql);
    }

    /**
     * 获取map访问表达式的键
     * 例如: 从 map_column['key'] 中提取 'key'
     */
    static getMapAccessKey(expression: string): string | null {
        const mapAccessPattern = /(?:\['([^']+)'\]|\["([^"]+)"\])/;
        const match = expression.match(mapAccessPattern);
        
        if (match) {
            return match[1] || match[2] || null;
        }
        
        return null;
    }

    /**
     * 获取map访问表达式的map名称
     * 例如: 从 table.map_column['key'] 中提取 table.map_column
     */
    static getMapName(expression: string): string | null {
        const mapNamePattern = /(\w+(?:\.\w+)*)(?:\[['"][^'"]+['"])\]/;
        const match = expression.match(mapNamePattern);
        
        return match ? match[1] : null;
    }

    /**
     * 将Hive map访问表达式转换为标准SQL表达式
     * 转换策略可以根据需要进行调整
     */
    static convertMapAccessToStandard(expression: string): string {
        return expression.replace(/(\w+(?:\.\w+)*)(?:\['([^']+)'\]|\["([^"]+)"\])/g, (match, mapName, key1, key2) => {
            const key = key1 || key2;
            // 转换为标准SQL函数调用格式
            // 这里可以根据需要选择合适的转换方式
            return `get_map_value(${mapName}, '${key}')`;
        });
    }
} 