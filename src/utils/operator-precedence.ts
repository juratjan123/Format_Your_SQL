/**
 * 操作符优先级系统
 * 用于处理SQL表达式中的操作符优先级
 */
export class OperatorPrecedence {
    private static precedenceMap = new Map([
        ['OR', 1],
        ['AND', 2],
        ['NOT', 3],
        ['=', 4],
        ['>', 4],
        ['<', 4],
        ['>=', 4],
        ['<=', 4],
        ['!=', 4],
        ['IN', 4],
        ['NOT IN', 4],
        ['BETWEEN', 4],
        ['LIKE', 4],
        ['RLIKE', 4],
        ['IS', 4],
        ['IS NOT', 4]
    ]);

    /**
     * 检查是否需要括号
     * @param parent 父操作符
     * @param current 当前操作符
     * @returns 是否需要括号
     */
    static needsParentheses(parent: string, current: string): boolean {
        if (!parent || !current) {return false;}
        const parentPrec = this.precedenceMap.get(parent.toUpperCase()) || 0;
        const currentPrec = this.precedenceMap.get(current.toUpperCase()) || 0;
        return parentPrec > currentPrec;
    }

    /**
     * 获取操作符优先级
     * @param operator 操作符
     * @returns 优先级值
     */
    static getPrecedence(operator: string): number {
        return this.precedenceMap.get(operator.toUpperCase()) || 0;
    }
} 