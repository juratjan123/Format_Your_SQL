/**
 * SQL语法保留器
 * 用于捕获原始SQL中的语法特性，并在格式化后恢复这些特性
 */
export class SQLSyntaxPreserver {
    // 存储原始JOIN语法
    private joinTypes: Map<string, string> = new Map();
    
    // 存储原始别名语法（是否使用AS关键字）
    private aliasFormats: Map<string, boolean> = new Map();

    // 存储所有原始列和别名的映射关系
    private columnAliasMap: Map<string, {column: string, alias: string, hasAs: boolean}> = new Map();
    
    // JOIN语法识别正则表达式
    private readonly JOIN_PATTERN = /\b((?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN)\b/gi;
    
    // 列别名识别正则表达式（带AS和不带AS的）
    private readonly COLUMN_ALIAS_WITH_AS = /\b([a-zA-Z0-9_.()"'`\[\]\-\+*\/]+)\s+AS\s+([a-zA-Z0-9_"'`]+)\b/gi;
    
    // 更复杂的列别名识别正则表达式（不带AS关键字的）
    private readonly COLUMN_ALIAS_WITHOUT_AS = /\b((?:(?:count|sum|avg|max|min|concat|concat_ws|cast|coalesce|date_format|if|ifnull|isnull|lower|upper|substr|substring|trim|round|floor|ceiling|rand|now|convert|format|date|time|year|month|day|hour|minute|second|timestampdiff|timestampadd|datediff|dateadd|adddate|addtime|extract|interval|last_day|makedate|maketime|quarter|week|weekday|weekofyear|yearweek|str_to_date|date_add|date_sub|date_format|from_unixtime|unix_timestamp|to_days|from_days|dayofweek|dayofmonth|dayofyear|last_insert_id|length|locate|instr|replace|strcmp|quote|reverse|insert|left|right|space|repeat|soundex|substring_index|elt|field|find_in_set|make_set|export_set|lcase|ucase|mid|position|oct|ord|pow|power|sign|sqrt|tan|truncate|abs|acos|asin|atan|atan2|cos|cot|degrees|exp|ln|log|log10|log2|pi|radians|sin|connection_id|current_user|database|schema|user|version|md5|sha1|sha|sha2|aes_encrypt|aes_decrypt|encode|decode|inet_aton|inet_ntoa|is_ipv4|is_ipv6|inet6_aton|inet6_ntoa|distinct)\s*\([^)]*\)|\[[^\]]+\]|[a-zA-Z0-9_.()"'`\[\]\-\+*\/]+))\s+([a-zA-Z0-9_"'`]+)(?!\s*\(|\s*\.|\s*=|\s*<|\s*>|\s*\[|\s*\!|\s*\-|\s*\+|\s*\/|\s*\*|\s*\%|\s*\&|\s*\||\s*\^|\s*\~|\s*(?:FROM|WHERE|GROUP|ORDER|HAVING|LIMIT|JOIN|ON|AND|OR|UNION|INTERSECT|EXCEPT))/gi;
    
    // 用于检测字符串字面量和它们的别名
    private readonly STRING_LITERAL_ALIAS = /(['"].*?['"])\s+([a-zA-Z0-9_]+)(?!\s*(?:FROM|WHERE|GROUP|ORDER|HAVING|LIMIT|JOIN|ON|AND|OR|UNION|INTERSECT|EXCEPT))/gi;
    
    /**
     * 重置所有状态
     */
    reset(): void {
        this.joinTypes.clear();
        this.aliasFormats.clear();
        this.columnAliasMap.clear();
    }
    
    /**
     * 分析SQL并捕获语法特征
     */
    analyze(sql: string): void {
        this.reset();
        this.captureJoinTypes(sql);
        this.captureAliasFormats(sql);
    }
    
    /**
     * 捕获所有JOIN类型的原始形式
     */
    private captureJoinTypes(sql: string): void {
        let match;
        this.JOIN_PATTERN.lastIndex = 0;
        while ((match = this.JOIN_PATTERN.exec(sql)) !== null) {
            const originalJoinSyntax = match[1];
            const normalizedJoinSyntax = originalJoinSyntax.toUpperCase().trim();
            
            // 创建用于后期替换的签名
            const signature = `__JOIN_${this.joinTypes.size}__`;
            
            // 保存原始JOIN语法和它的签名
            this.joinTypes.set(signature, originalJoinSyntax);
        }
    }
    
    /**
     * 捕获列别名的原始形式（带AS或不带AS）
     */
    private captureAliasFormats(sql: string): void {
        // 清除上次查询的缓存
        this.COLUMN_ALIAS_WITH_AS.lastIndex = 0;
        this.COLUMN_ALIAS_WITHOUT_AS.lastIndex = 0;
        this.STRING_LITERAL_ALIAS.lastIndex = 0;

        // 捕获所有带AS关键字的列别名
        let match;
        while ((match = this.COLUMN_ALIAS_WITH_AS.exec(sql)) !== null) {
            const column = match[1].trim();
            const alias = match[2].trim();
            
            // 生成唯一的标识
            const signature = `${column}__ALIAS__${alias}`;
            
            // 记录到别名格式映射和列别名映射
            this.aliasFormats.set(signature, true); // 使用AS
            this.columnAliasMap.set(signature, {
                column,
                alias,
                hasAs: true
            });
        }
        
        // 重置不带AS关键字的正则索引
        this.COLUMN_ALIAS_WITHOUT_AS.lastIndex = 0;
        
        // 捕获所有不带AS关键字的列别名
        while ((match = this.COLUMN_ALIAS_WITHOUT_AS.exec(sql)) !== null) {
            const column = match[1].trim();
            const alias = match[2].trim();
            
            // 检查是否是有效的列别名（不是关键字或运算符）
            if (this.isValidAlias(alias)) {
                // 生成唯一的标识
                const signature = `${column}__ALIAS__${alias}`;
                
                // 如果之前没有记录过这个列别名组合（避免与带AS的重复）
                if (!this.aliasFormats.has(signature)) {
                    this.aliasFormats.set(signature, false); // 不使用AS
                    this.columnAliasMap.set(signature, {
                        column,
                        alias,
                        hasAs: false
                    });
                }
            }
        }
        
        // 捕获字符串字面量别名
        this.STRING_LITERAL_ALIAS.lastIndex = 0;
        while ((match = this.STRING_LITERAL_ALIAS.exec(sql)) !== null) {
            const stringLiteral = match[1];
            const alias = match[2];
            
            // 生成唯一的标识
            const signature = `${stringLiteral}__ALIAS__${alias}`;
            
            // 记录不带AS的字符串字面量别名
            this.aliasFormats.set(signature, false);
            this.columnAliasMap.set(signature, {
                column: stringLiteral,
                alias,
                hasAs: false
            });
        }
        
        // 加入对函数别名的特殊处理
        this.captureFunctionAliases(sql);
    }
    
    /**
     * 特殊处理函数别名，如concat_ws和聚合函数
     */
    private captureFunctionAliases(sql: string): void {
        // 定义常见函数名
        const commonFunctions = [
            'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CONCAT', 'CONCAT_WS',
            'COALESCE', 'IFNULL', 'CAST', 'DATE_FORMAT', 'ROW_NUMBER', 'RANK',
            'DENSE_RANK', 'NTILE', 'LEAD', 'LAG', 'FIRST_VALUE', 'LAST_VALUE'
        ];
        
        // 对原始SQL进行标准化处理，以便更容易匹配函数
        let normalizedSql = sql.toUpperCase();
        
        // 首先识别和处理带有OVER子句的窗口函数
        this.captureWindowFunctionAliases(sql);
        
        // 查找函数调用
        for (const funcName of commonFunctions) {
            const funcPattern = new RegExp(`\\b${funcName}\\s*\\([^)]*\\)\\s+([a-zA-Z0-9_]+)\\b(?!\\s*AS)`, 'gi');
            let funcMatch;
            
            while ((funcMatch = funcPattern.exec(sql)) !== null) {
                try {
                    // 获取完整的函数表达式和别名
                    const startPos = funcMatch.index;
                    let endPos = sql.indexOf(' ', funcMatch.index + funcMatch[0].length);
                    if (endPos === -1) {endPos = sql.length;}
                    
                    // 提取函数表达式
                    let parenCount = 0;
                    let exprEndPos = startPos;
                    
                    for (let i = startPos; i < endPos; i++) {
                        if (sql[i] === '(') {parenCount++;}
                        if (sql[i] === ')') {parenCount--;}
                        
                        if (parenCount === 0 && sql[i] === ')') {
                            exprEndPos = i + 1;
                            break;
                        }
                    }
                    
                    // 函数表达式和别名
                    const funcExpr = sql.substring(startPos, exprEndPos).trim();
                    const aliasStart = sql.indexOf(funcMatch[1], exprEndPos);
                    if (aliasStart > 0) {
                        const alias = funcMatch[1];
                        
                        // 确保这是一个不带AS的别名
                        const beforeAlias = sql.substring(exprEndPos, aliasStart).trim();
                        if (beforeAlias === '' || beforeAlias.toUpperCase() !== 'AS') {
                            // 生成唯一的标识
                            const signature = `${funcExpr}__ALIAS__${alias}`;
                            
                            // 记录为不带AS的别名
                            if (!this.aliasFormats.has(signature)) {
                                this.aliasFormats.set(signature, false);
                                this.columnAliasMap.set(signature, {
                                    column: funcExpr,
                                    alias,
                                    hasAs: false
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error(`函数别名识别出错: ${error}`);
                }
            }
            
            // 同时查找带AS关键字的函数别名
            const funcWithAsPattern = new RegExp(`\\b${funcName}\\s*\\([^)]*\\)\\s+AS\\s+([a-zA-Z0-9_]+)\\b`, 'gi');
            while ((funcMatch = funcWithAsPattern.exec(sql)) !== null) {
                try {
                    // 获取完整的函数表达式和别名
                    const startPos = funcMatch.index;
                    const alias = funcMatch[1];
                    
                    // 提取函数表达式
                    let parenCount = 0;
                    let exprEndPos = startPos;
                    
                    for (let i = startPos; i < sql.length; i++) {
                        if (sql[i] === '(') {parenCount++;}
                        if (sql[i] === ')') {parenCount--;}
                        
                        if (parenCount === 0 && sql[i] === ')') {
                            exprEndPos = i + 1;
                            break;
                        }
                    }
                    
                    // 函数表达式
                    const funcExpr = sql.substring(startPos, exprEndPos).trim();
                    
                    // 生成唯一的标识
                    const signature = `${funcExpr}__ALIAS__${alias}`;
                    
                    // 记录为带AS的别名
                    this.aliasFormats.set(signature, true);
                    this.columnAliasMap.set(signature, {
                        column: funcExpr,
                        alias,
                        hasAs: true
                    });
                } catch (error) {
                    console.error(`带AS的函数别名识别出错: ${error}`);
                }
            }
        }
    }
    
    /**
     * 专门处理窗口函数别名
     */
    private captureWindowFunctionAliases(sql: string): void {
        // 窗口函数关键字
        const windowFunctions = ['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LEAD', 'LAG', 'FIRST_VALUE', 'LAST_VALUE'];
        
        // 遍历所有窗口函数
        for (const funcName of windowFunctions) {
            // 1. 匹配不带AS的窗口函数别名，格式如: row_number() OVER (...) alias
            // 注意：这个正则表达式需要处理嵌套括号
            try {
                const pattern = new RegExp(`\\b${funcName}\\s*\\([^)]*\\)\\s+OVER\\s*\\([^\\)]*\\)\\s+([a-zA-Z0-9_]+)\\b(?!\\s*AS|\\s*\\(|\\s*\\.|\\s*=)`, 'gi');
                
                let match;
                while ((match = pattern.exec(sql)) !== null) {
                    const startPos = match.index;
                    const alias = match[1];
                    
                    // 使用括号平衡算法提取整个窗口函数表达式
                    let parenCount = 0;
                    let overClauseStarted = false;
                    let exprEndPos = startPos;
                    
                    for (let i = startPos; i < sql.length; i++) {
                        if (sql.substring(i, i + 4).toUpperCase() === 'OVER') {
                            overClauseStarted = true;
                        }
                        
                        if (sql[i] === '(') {parenCount++;}
                        if (sql[i] === ')') {parenCount--;}
                        
                        // 对于窗口函数，需要处理完整的OVER子句
                        if (overClauseStarted && parenCount === 0 && sql[i] === ')') {
                            exprEndPos = i + 1;
                            break;
                        }
                    }
                    
                    // 函数表达式到OVER子句结束
                    const fullExpr = sql.substring(startPos, exprEndPos).trim();
                    
                    // 生成唯一的标识
                    const signature = `${fullExpr}__ALIAS__${alias}`;
                    
                    // 记录为不带AS的别名
                    if (!this.aliasFormats.has(signature)) {
                        this.aliasFormats.set(signature, false);
                        this.columnAliasMap.set(signature, {
                            column: fullExpr,
                            alias,
                            hasAs: false
                        });
                    }
                }
                
                // 2. 匹配带AS的窗口函数别名，格式如: row_number() OVER (...) AS alias
                const patternWithAs = new RegExp(`\\b${funcName}\\s*\\([^)]*\\)\\s+OVER\\s*\\([^\\)]*\\)\\s+AS\\s+([a-zA-Z0-9_]+)\\b`, 'gi');
                
                while ((match = patternWithAs.exec(sql)) !== null) {
                    const startPos = match.index;
                    const alias = match[1];
                    
                    // 使用括号平衡算法提取整个窗口函数表达式
                    let parenCount = 0;
                    let overClauseStarted = false;
                    let exprEndPos = startPos;
                    
                    for (let i = startPos; i < sql.length; i++) {
                        if (sql.substring(i, i + 4).toUpperCase() === 'OVER') {
                            overClauseStarted = true;
                        }
                        
                        if (sql[i] === '(') {parenCount++;}
                        if (sql[i] === ')') {parenCount--;}
                        
                        // 对于窗口函数，需要处理完整的OVER子句
                        if (overClauseStarted && parenCount === 0 && sql[i] === ')') {
                            exprEndPos = i + 1;
                            break;
                        }
                    }
                    
                    // 函数表达式到OVER子句结束
                    const fullExpr = sql.substring(startPos, exprEndPos).trim();
                    
                    // 生成唯一的标识
                    const signature = `${fullExpr}__ALIAS__${alias}`;
                    
                    // 记录为带AS的别名
                    this.aliasFormats.set(signature, true);
                    this.columnAliasMap.set(signature, {
                        column: fullExpr,
                        alias,
                        hasAs: true
                    });
                }
            } catch (error) {
                console.error(`窗口函数别名识别出错(${funcName}): ${error}`);
            }
        }
    }
    
    /**
     * 检查是否是有效的列别名（不是SQL关键字或保留字）
     */
    private isValidAlias(alias: string): boolean {
        const sqlKeywords = new Set([
            'SELECT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'BY', 'HAVING', 'LIMIT',
            'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AND', 'OR', 'NOT',
            'NULL', 'TRUE', 'FALSE', 'IS', 'IN', 'BETWEEN', 'LIKE', 'EXISTS',
            'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DISTINCT', 'ALL', 'ANY',
            'UNION', 'INTERSECT', 'EXCEPT', 'OFFSET'
        ]);
        
        return !sqlKeywords.has(alias.toUpperCase());
    }
    
    /**
     * 恢复JOIN语法
     */
    restoreJoinSyntax(sql: string): string {
        let result = sql;
        
        // 恢复JOIN语法
        for (const [key, value] of this.joinTypes.entries()) {
            // 对于普通JOIN，将"INNER JOIN"替换为"JOIN"
            if (value.toUpperCase().trim() === 'JOIN') {
                result = result.replace(/\bINNER JOIN\b/gi, 'JOIN');
            }
        }
        
        return result;
    }
    
    /**
     * 恢复别名语法（移除或保留AS关键字）
     */
    restoreAliasFormat(sql: string): string {
        let result = sql;
        
        // 查找并处理所有别名
        for (const [signature, info] of this.columnAliasMap.entries()) {
            try {
                // 需要处理函数表达式和复杂列名中的括号和特殊字符
                const escapedColumn = this.escapeRegExpWithParens(info.column);
                const escapedAlias = this.escapeRegExp(info.alias);
                
                // 特殊处理窗口函数
                if (this.isWindowFunction(info.column)) {
                    result = this.handleWindowFunctionAlias(result, info, escapedAlias);
                    continue; // 处理完窗口函数后继续下一个别名
                }
                
                if (!info.hasAs) {
                    // 如果原始SQL不使用AS关键字，移除它
                    // 使用分组捕获来确保正确替换
                    const withAsPattern = new RegExp(`(${escapedColumn})\\s+AS\\s+(${escapedAlias})\\b`, 'gi');
                    
                    // 进行替换，保留原始表达式的大小写
                    result = result.replace(withAsPattern, (match, p1, p2) => {
                        return `${p1} ${p2}`;
                    });
                    
                    // 针对特殊情况如格式化后的函数表达式可能与原始不完全相同
                    if (info.column.includes('(') && info.column.includes(')')) {
                        // 提取函数名
                        let funcName = '';
                        if (info.column.indexOf('(') > 0) {
                            funcName = info.column.substring(0, info.column.indexOf('(')).trim();
                        }
                        
                        if (funcName) {
                            // 尝试使用更宽松的匹配
                            const funcPattern = new RegExp(`(${this.escapeRegExp(funcName)}\\s*\\([^)]*\\))\\s+AS\\s+(${escapedAlias})\\b`, 'gi');
                            
                            result = result.replace(funcPattern, (match, p1, p2) => {
                                return `${p1} ${p2}`;
                            });
                        }
                    }
                } else if (info.hasAs) {
                    // 如果原始SQL使用AS关键字，添加它（如果不存在）
                    const withoutAsPattern = new RegExp(`(${escapedColumn})\\s+(${escapedAlias})\\b(?!\\s*AS)`, 'gi');
                    
                    // 检查是否存在不带AS的形式，如果存在则添加AS
                    if (result.match(withoutAsPattern)) {
                        result = result.replace(withoutAsPattern, (match, p1, p2) => {
                            return `${p1} AS ${p2}`;
                        });
                    }
                    
                    // 针对特殊情况如格式化后的函数表达式可能与原始不完全相同
                    if (info.column.includes('(') && info.column.includes(')')) {
                        // 提取函数名
                        let funcName = '';
                        if (info.column.indexOf('(') > 0) {
                            funcName = info.column.substring(0, info.column.indexOf('(')).trim();
                        }
                        
                        if (funcName) {
                            // 尝试使用更宽松的匹配
                            const funcPattern = new RegExp(`(${this.escapeRegExp(funcName)}\\s*\\([^)]*\\))\\s+(${escapedAlias})\\b(?!\\s*AS)`, 'gi');
                            
                            result = result.replace(funcPattern, (match, p1, p2) => {
                                return `${p1} AS ${p2}`;
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`恢复别名语法出错: ${error}, 签名: ${signature}`);
            }
        }
        
        return result;
    }
    
    /**
     * 检测是否是窗口函数
     */
    private isWindowFunction(expr: string): boolean {
        // 检查是否包含OVER关键字和括号
        return /\b(?:ROW_NUMBER|RANK|DENSE_RANK|NTILE|LEAD|LAG|FIRST_VALUE|LAST_VALUE)\s*\([^)]*\)\s+OVER\s*\(/i.test(expr);
    }
    
    /**
     * 特殊处理窗口函数别名
     */
    private handleWindowFunctionAlias(sql: string, info: {column: string, alias: string, hasAs: boolean}, escapedAlias: string): string {
        // 提取函数名
        const funcNameMatch = info.column.match(/\b(ROW_NUMBER|RANK|DENSE_RANK|NTILE|LEAD|LAG|FIRST_VALUE|LAST_VALUE)\b/i);
        if (!funcNameMatch) {return sql;}
        
        const funcName = funcNameMatch[1];
        const escapedFuncName = this.escapeRegExp(funcName);
        
        // 在格式化后的SQL中查找该窗口函数
        let result = sql;
        
        if (!info.hasAs) {
            // 1. 匹配：funcName(...) OVER (...) AS alias
            const windowFuncWithAsPattern = new RegExp(
                `(${escapedFuncName}\\s*\\([^)]*\\)\\s+OVER\\s*\\([^)]*\\))\\s+AS\\s+(${escapedAlias})\\b`, 
                'gi'
            );
            
            // 移除AS
            result = result.replace(windowFuncWithAsPattern, (match, p1, p2) => {
                return `${p1} ${p2}`;
            });
        } else {
            // 2. 匹配：funcName(...) OVER (...) alias (没有AS)
            const windowFuncWithoutAsPattern = new RegExp(
                `(${escapedFuncName}\\s*\\([^)]*\\)\\s+OVER\\s*\\([^)]*\\))\\s+(${escapedAlias})\\b(?!\\s*AS)`, 
                'gi'
            );
            
            // 添加AS
            if (result.match(windowFuncWithoutAsPattern)) {
                result = result.replace(windowFuncWithoutAsPattern, (match, p1, p2) => {
                    return `${p1} AS ${p2}`;
                });
            }
        }
        
        return result;
    }
    
    /**
     * 转义正则表达式中的特殊字符
     */
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * 转义正则表达式中的特殊字符，但保留括号的特殊含义
     */
    private escapeRegExpWithParens(string: string): string {
        // 先转义所有特殊字符
        let escaped = this.escapeRegExp(string);
        
        // 恢复括号的特殊含义，但需要确保它们是成对的
        let parenStack = [];
        let result = '';
        
        for (let i = 0; i < escaped.length; i++) {
            if (escaped[i] === '\\' && i + 1 < escaped.length) {
                if (escaped[i+1] === '(') {
                    result += '(';
                    parenStack.push('(');
                    i++; // 跳过下一个字符
                } else if (escaped[i+1] === ')' && parenStack.length > 0) {
                    result += ')';
                    parenStack.pop();
                    i++; // 跳过下一个字符
                } else {
                    result += escaped[i] + escaped[i+1];
                    i++; // 跳过下一个字符
                }
            } else {
                result += escaped[i];
            }
        }
        
        return result;
    }
} 