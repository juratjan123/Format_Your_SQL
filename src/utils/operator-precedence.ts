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
        ['<>', 4],  // 添加<>操作符，与!=同优先级
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
     * @deprecated 此方法逻辑有误，请使用 shouldAddParentheses 替代
     */
    static needsParentheses(parent: string, current: string): boolean {
        if (!parent || !current) {return false;}
        const parentPrec = this.precedenceMap.get(parent.toUpperCase()) || 0;
        const currentPrec = this.precedenceMap.get(current.toUpperCase()) || 0;
        return parentPrec > currentPrec;
    }

    /**
     * 按照SQL优先级规则正确判断是否需要添加括号
     * @param parent 父操作符
     * @param current 当前操作符
     * @returns 是否需要括号
     */
    static shouldAddParentheses(parent: string, current: string): boolean {
        if (!parent || !current) {return false;}
        const parentPrec = this.precedenceMap.get(parent.toUpperCase()) || 0;
        const currentPrec = this.precedenceMap.get(current.toUpperCase()) || 0;
        
        // 在SQL中，当父操作符优先级低于当前操作符时，不需要括号
        // 例如: a AND b = c   不需要括号，因为=的优先级高于AND
        // 而当父操作符优先级高于当前操作符时，需要括号
        // 例如: (a OR b) = c   需要括号，因为=的优先级高于OR
        return parentPrec < currentPrec;
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