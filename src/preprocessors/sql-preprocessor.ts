/**
 * SQL预处理器
 * 用于处理SQL中的关键字别名问题和Hive特有语法
 */
import { HivePreProcessor } from './hive-preprocessor';

export class SQLPreProcessor {
    private readonly SQL_KEYWORDS = new Set([
        'RANK',
        'ROW_NUMBER',
        'DENSE_RANK',
        'LAG',
        'LEAD',
        'FIRST_VALUE',
        'LAST_VALUE'
    ]);

    // 用于匹配 SELECT 子句的模式
    private readonly SELECT_CLAUSE_PATTERN = /\bSELECT\b(.*?)(?=\b(FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT)\b|$)/gis;
    
    // 用于匹配关键词的模式（不在函数调用中）
    private readonly KEYWORD_PATTERN = /\b(RANK|ROW_NUMBER|DENSE_RANK|LAG|LEAD|FIRST_VALUE|LAST_VALUE)\b(?!\s*\()/gi;
    
    // 用于匹配Hive map访问语法的模式 - 例如: request_map['id']
    private readonly MAP_ACCESS_PATTERN = /(\w+(?:\.\w+)*)(?:\['([^']+)'\]|\["([^"]+)"\])/g;
    
    // 存储原始map访问表达式和替换后的表达式的映射
    private mapAccessReplacements: Map<string, string> = new Map();
    
    // Hive SQL预处理器
    private hivePreProcessor: HivePreProcessor;
    
    constructor() {
        this.hivePreProcessor = new HivePreProcessor();
    }
    
    preProcess(sql: string): string {
        // 清空之前的替换映射
        this.mapAccessReplacements.clear();
        
        // 1. 先将SQL压缩成一行，去除多余空格
        let compressedSql = sql.replace(/\s+/g, ' ').trim();
        
        // 2. 先使用Hive预处理器处理Hive特有语法
        compressedSql = this.hivePreProcessor.preProcess(compressedSql);
        
        // 3. 处理Hive map访问语法 (保留历史兼容性)
        compressedSql = this.processMapAccess(compressedSql);

        // 4. 处理 SELECT 子句之外的关键词
        let lastIndex = 0;
        let result = '';
        
        for (const match of compressedSql.matchAll(this.SELECT_CLAUSE_PATTERN)) {
            const selectStart = match.index!;
            const selectEnd = selectStart + match[0].length;
            
            // 添加 SELECT 子句之前的部分（需要处理关键词）
            const beforeSelect = compressedSql.slice(lastIndex, selectStart);
            result += this.processKeywords(beforeSelect);
            
            // 添加 SELECT 子句（不处理关键词）
            result += match[0];
            
            lastIndex = selectEnd;
        }
        
        // 处理最后一个 SELECT 子句之后的部分
        if (lastIndex < compressedSql.length) {
            result += this.processKeywords(compressedSql.slice(lastIndex));
        }
        
        return result || compressedSql;
    }
    
    /**
     * 获取原始SQL
     * 用于在格式化后恢复原始的map访问语法
     */
    postProcess(sql: string): string {
        // 1. 先使用旧的处理方法（保持向后兼容）
        let processed = sql;
        
        // 将所有替换过的map访问语法恢复为原始形式
        for (const [placeholder, original] of this.mapAccessReplacements.entries()) {
            processed = processed.replace(new RegExp(placeholder, 'g'), original);
        }
        
        // 2. 然后使用Hive预处理器的后处理方法
        processed = this.hivePreProcessor.postProcess(processed);
        
        return processed;
    }
    
    /**
     * 处理Hive map访问语法
     * 将map['key']替换为map_key_MAPACCESS_XXXX形式的占位符
     */
    private processMapAccess(sql: string): string {
        return sql.replace(this.MAP_ACCESS_PATTERN, (match, mapName, key1, key2) => {
            const key = key1 || key2;
            // 生成唯一的占位符
            const placeholder = `${mapName}_${key}_MAPACCESS_${this.mapAccessReplacements.size}`;
            
            // 保存原始表达式和占位符的映射关系
            this.mapAccessReplacements.set(placeholder, match);
            
            return placeholder;
        });
    }
    
    private processKeywords(sql: string): string {
        return sql.replace(this.KEYWORD_PATTERN, '`$1`');
    }
} 