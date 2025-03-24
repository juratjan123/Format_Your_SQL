import { FormatContextManager, FormatContext } from '../context/format-context-manager';

/**
 * 格式化规则引擎
 * 负责管理和应用所有格式化规则
 */
export class FormatRuleEngine {
    constructor(private contextManager: FormatContextManager) {}

    /**
     * 处理子查询格式化
     */
    formatSubquery(query: string, context: FormatContext): string {
        const isSimple = this.isSimpleSubquery(query);
        
        if (isSimple) {
            return this.formatSimpleSubquery(query);
        } else {
            return this.formatComplexSubquery(query, context);
        }
    }

    /**
     * 判断是否为简单子查询
     */
    private isSimpleSubquery(query: string): boolean {
        // 简单子查询的判断规则：
        // 1. 不包含WHERE/GROUP BY/HAVING/ORDER BY等子句
        // 2. 不包含子查询
        // 3. 不包含复杂函数
        const complexPatterns = [
            /\bWHERE\b/i,
            /\bGROUP\s+BY\b/i,
            /\bHAVING\b/i,
            /\bORDER\s+BY\b/i,
            /\bLIMIT\b/i,
            /\bIN\s*\(/i,
            /\bEXISTS\s*\(/i
        ];

        return !complexPatterns.some(pattern => pattern.test(query));
    }

    /**
     * 格式化简单子查询
     */
    private formatSimpleSubquery(query: string): string {
        // 移除多余的空白和换行
        return query.replace(/\s+/g, ' ').trim();
    }

    /**
     * 格式化复杂子查询
     */
    private formatComplexSubquery(query: string, context: FormatContext): string {
        const newContext = this.contextManager.pushContext('subquery', {
            isSubquery: true
        });

        try {
            const lines = query.split('\n');
            const formattedLines = lines.map(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return '';
                return this.contextManager.getCurrentIndent() + trimmedLine;
            }).filter(line => line);

            return [
                this.contextManager.handleBracket('open', '('),
                ...formattedLines,
                this.contextManager.getCurrentIndent() + this.contextManager.handleBracket('close', '(')
            ].join('\n');
        } finally {
            this.contextManager.popContext();
        }
    }

    /**
     * 格式化IN子句
     */
    formatInClause(left: string, right: string, context: FormatContext): string {
        const newContext = this.contextManager.pushContext('in_clause');
        
        try {
            const formattedRight = this.formatSubquery(right, newContext);
            return `${left} IN ${formattedRight}`;
        } finally {
            this.contextManager.popContext();
        }
    }

    /**
     * 格式化WHERE子句
     */
    formatWhereClause(conditions: string[], context: FormatContext): string {
        const newContext = this.contextManager.pushContext('where');
        
        try {
            return conditions
                .map(cond => this.contextManager.getCurrentIndent() + cond)
                .join('\n');
        } finally {
            this.contextManager.popContext();
        }
    }
} 