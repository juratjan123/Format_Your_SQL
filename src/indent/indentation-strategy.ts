import { IndentationContext } from './indentation-context';
import { FormattingContext } from '../context/formatting-context';

/**
 * 缩进策略接口
 * 定义了如何计算缩进的标准接口
 */
export interface IndentationStrategy {
    calculateIndent(context: IndentationContext): number;
}

/**
 * 基础缩进策略
 * 提供最基本的缩进计算逻辑
 */
export class BaseIndentationStrategy implements IndentationStrategy {
    calculateIndent(context: IndentationContext): number {
        return context.baseLevel;
    }
}

/**
 * SQL特定缩进策略
 * 处理SQL语句特定的缩进规则
 */
export class SQLIndentationStrategy implements IndentationStrategy {
    private formattingContext: FormattingContext;

    constructor() {
        this.formattingContext = FormattingContext.getInstance();
    }

    calculateIndent(context: IndentationContext): number {
        let level = context.baseLevel;

        // 获取当前格式化上下文
        const currentFormatContext = this.formattingContext.getCurrentContext();
        const parentFormatContext = this.formattingContext.getParentContext();

        // JOIN 处理
        if (context.clauseType === 'JOIN' || currentFormatContext?.type === 'JOIN') {
            // JOIN 语句应该与 SELECT 和 FROM 保持同级
            level = context.baseLevel;

            // 如果是子查询中的 JOIN
            if (context.parentType === 'SUBQUERY' || 
                currentFormatContext?.parentType === 'SUBQUERY' ||
                parentFormatContext?.type === 'SUBQUERY') {
                // 子查询中的JOIN要保持与子查询内的其他语句同级
                if (!context.isWithClause) {
                    level = context.baseLevel;
                }
            }
        }

        // WITH 子句处理
        if (context.isWithClause) {
            if (context.clauseType === 'SUBQUERY') {
                // WITH 子句中的子查询保持合适的缩进
                level = context.baseLevel + 1;
            }
        }

        // 节点深度影响
        if (context.nodeDepth && context.nodeDepth > 1 && 
            context.clauseType === 'SUBQUERY' && 
            !context.nodePath?.includes('UNION')) {
            const depthIndent = Math.min(Math.floor(Math.log2(context.nodeDepth)), 1);
            level += depthIndent;
        }

        return level;
    }
} 