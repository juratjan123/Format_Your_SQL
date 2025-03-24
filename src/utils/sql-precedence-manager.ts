/**
 * SQL操作符优先级管理器
 * 提供更完整和可扩展的SQL操作符优先级处理机制
 */

type Operator = {
    name: string;
    precedence: number;
    associativity: 'left' | 'right' | 'none';
};

export class SQLPrecedenceManager {
    private static instance: SQLPrecedenceManager;
    private operators: Map<string, Operator>;

    private constructor() {
        this.operators = new Map();
        this.initializeOperators();
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): SQLPrecedenceManager {
        if (!SQLPrecedenceManager.instance) {
            SQLPrecedenceManager.instance = new SQLPrecedenceManager();
        }
        return SQLPrecedenceManager.instance;
    }

    /**
     * 初始化操作符优先级表
     */
    private initializeOperators(): void {
        // 逻辑操作符
        this.registerOperator('OR', 1, 'left');
        this.registerOperator('XOR', 1, 'left');
        this.registerOperator('AND', 2, 'left');
        this.registerOperator('NOT', 3, 'right');
        
        // 比较操作符
        this.registerOperator('=', 4, 'none');
        this.registerOperator('==', 4, 'none');
        this.registerOperator('>', 4, 'none');
        this.registerOperator('<', 4, 'none');
        this.registerOperator('>=', 4, 'none');
        this.registerOperator('<=', 4, 'none');
        this.registerOperator('!=', 4, 'none');
        this.registerOperator('<>', 4, 'none');
        this.registerOperator('IN', 4, 'none');
        this.registerOperator('NOT IN', 4, 'none');
        this.registerOperator('BETWEEN', 4, 'none');
        this.registerOperator('LIKE', 4, 'none');
        this.registerOperator('RLIKE', 4, 'none');
        this.registerOperator('IS', 4, 'none');
        this.registerOperator('IS NOT', 4, 'none');
        
        // 算术操作符
        this.registerOperator('+', 5, 'left');
        this.registerOperator('-', 5, 'left');
        this.registerOperator('*', 6, 'left');
        this.registerOperator('/', 6, 'left');
        this.registerOperator('%', 6, 'left');
        this.registerOperator('^', 7, 'right');
    }

    /**
     * 注册新操作符或更新现有操作符
     * @param name 操作符名称
     * @param precedence 优先级 (值越大优先级越高)
     * @param associativity 结合性
     */
    public registerOperator(name: string, precedence: number, associativity: 'left' | 'right' | 'none'): void {
        this.operators.set(name.toUpperCase(), {
            name: name.toUpperCase(),
            precedence,
            associativity
        });
    }

    /**
     * 获取操作符优先级
     * @param operator 操作符
     * @returns 优先级值，未找到返回0
     */
    public getPrecedence(operator: string): number {
        return this.operators.get(operator.toUpperCase())?.precedence || 0;
    }

    /**
     * 获取操作符结合性
     * @param operator 操作符
     * @returns 结合性
     */
    public getAssociativity(operator: string): 'left' | 'right' | 'none' {
        return this.operators.get(operator.toUpperCase())?.associativity || 'none';
    }

    /**
     * 判断是否需要括号
     * @param parentOp 父操作符
     * @param currentOp 当前操作符
     * @returns 是否需要括号
     */
    public needsParentheses(parentOp: string, currentOp: string): boolean {
        if (!parentOp || !currentOp) {
            return false;
        }

        const parent = this.operators.get(parentOp.toUpperCase());
        const current = this.operators.get(currentOp.toUpperCase());

        if (!parent || !current) {
            return false;
        }

        // 1. 如果父操作符优先级高于当前操作符，需要括号
        if (parent.precedence > current.precedence) {
            return true;
        }

        // 2. 如果优先级相同但结合性不同，根据结合性决定
        if (parent.precedence === current.precedence) {
            // 处理结合性规则
            if (parent.associativity === 'left' && current.associativity === 'right') {
                return true;
            }
            if (parent.associativity === 'right' && current.associativity === 'left') {
                return true;
            }
            if (parent.associativity === 'none' || current.associativity === 'none') {
                return true;
            }
        }

        return false;
    }

    /**
     * 判断表达式是否应该添加括号 (SQL优先级规则)
     * @param parentOp 父操作符
     * @param currentOp 当前操作符
     * @returns 是否需要括号
     */
    public shouldAddParentheses(parentOp: string, currentOp: string): boolean {
        if (!parentOp || !currentOp) {
            return false;
        }

        const parentPrec = this.getPrecedence(parentOp);
        const currentPrec = this.getPrecedence(currentOp);

        // SQL中低优先级操作符包含高优先级操作符时不需要括号
        // 例如: a AND b = c 不需要括号，因为=的优先级高于AND
        if (parentPrec < currentPrec) {
            return false;
        }

        // 相同优先级操作符根据结合性决定
        if (parentPrec === currentPrec) {
            const parentAssoc = this.getAssociativity(parentOp);
            
            // 不结合的操作符需要括号
            if (parentAssoc === 'none') {
                return true;
            }
            
            // 相同优先级且结合方向相同的操作符不需要括号
            // 例如: a AND b AND c 不需要括号
            if (parentOp.toUpperCase() === currentOp.toUpperCase()) {
                return false;
            }
            
            // 其他情况需要括号
            return true;
        }

        // 父操作符优先级高于当前操作符，需要括号
        // 例如: (a OR b) = c 需要括号，因为=的优先级高于OR
        return true;
    }
} 