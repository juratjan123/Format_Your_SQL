/**
 * SQL预处理器
 * 用于处理SQL中的关键字别名问题
 */
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
    
    preProcess(sql: string): string {
        // 1. 先将SQL压缩成一行，去除多余空格
        let compressedSql = sql.replace(/\s+/g, ' ').trim();

        // 2. 处理 SELECT 子句之外的关键词
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
    
    private processKeywords(sql: string): string {
        return sql.replace(this.KEYWORD_PATTERN, '`$1`');
    }
} 