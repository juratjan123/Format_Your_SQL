/**
 * 操作符优先级处理工厂
 * 提供统一的接口来处理不同版本的操作符优先级判断逻辑
 */

import { OperatorPrecedence } from '../utils/operator-precedence';
import { SQLPrecedenceManager } from '../utils/sql-precedence-manager';

// 优先级处理策略接口
export interface PrecedenceStrategy {
    shouldAddParentheses(parentOp: string, currentOp: string): boolean;
    getPrecedence(operator: string): number;
}

// 旧版本优先级策略 (保持向后兼容)
export class LegacyPrecedenceStrategy implements PrecedenceStrategy {
    shouldAddParentheses(parentOp: string, currentOp: string): boolean {
        // 使用旧的逻辑，但调用正确的方法
        return OperatorPrecedence.shouldAddParentheses(parentOp, currentOp);
    }

    getPrecedence(operator: string): number {
        return OperatorPrecedence.getPrecedence(operator);
    }
}

// 增强版优先级策略 (使用新的SQLPrecedenceManager)
export class EnhancedPrecedenceStrategy implements PrecedenceStrategy {
    private manager: SQLPrecedenceManager;

    constructor() {
        this.manager = SQLPrecedenceManager.getInstance();
    }

    shouldAddParentheses(parentOp: string, currentOp: string): boolean {
        return this.manager.shouldAddParentheses(parentOp, currentOp);
    }

    getPrecedence(operator: string): number {
        return this.manager.getPrecedence(operator);
    }
}

// 优先级策略工厂
export class PrecedenceFactory {
    private static instance: PrecedenceFactory;
    private strategy: PrecedenceStrategy;

    private constructor() {
        // 默认使用增强版策略
        this.strategy = new EnhancedPrecedenceStrategy();
    }

    public static getInstance(): PrecedenceFactory {
        if (!PrecedenceFactory.instance) {
            PrecedenceFactory.instance = new PrecedenceFactory();
        }
        return PrecedenceFactory.instance;
    }

    /**
     * 设置优先级处理策略
     * @param strategy 优先级处理策略
     */
    public setStrategy(strategy: PrecedenceStrategy): void {
        this.strategy = strategy;
    }

    /**
     * 判断是否需要添加括号
     * @param parentOp 父操作符
     * @param currentOp 当前操作符 
     * @returns 是否需要添加括号
     */
    public shouldAddParentheses(parentOp: string, currentOp: string): boolean {
        return this.strategy.shouldAddParentheses(parentOp, currentOp);
    }

    /**
     * 获取操作符优先级
     * @param operator 操作符
     * @returns 优先级
     */
    public getPrecedence(operator: string): number {
        return this.strategy.getPrecedence(operator);
    }

    /**
     * 使用旧版本优先级策略
     */
    public useLegacyStrategy(): void {
        this.strategy = new LegacyPrecedenceStrategy();
    }

    /**
     * 使用增强版优先级策略
     */
    public useEnhancedStrategy(): void {
        this.strategy = new EnhancedPrecedenceStrategy();
    }
} 