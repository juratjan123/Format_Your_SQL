/**
 * 子查询缩进策略
 * 处理子查询的缩进计算逻辑
 */

import { IndentContext, IndentContextStack } from './indent-context-stack';

export interface IndentationStrategy {
    calculateIndent(context: IndentContext): number;
}

export class SubqueryIndentStrategy implements IndentationStrategy {
    calculateIndent(context: IndentContext): number {
        const stack = IndentContextStack.getInstance();
        const baseLevel = stack.getEffectiveLevel();
        
        // 子查询特殊处理
        if (context.type === 'SUBQUERY') {
            return baseLevel + 1;
        }
        
        return baseLevel;
    }
} 