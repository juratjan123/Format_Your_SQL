/**
 * 子查询处理策略
 * 用于处理不同类型的子查询格式化
 */

import { SubqueryContext } from '../context/subquery-context';
import { SQLFormatterInterface } from '../interfaces/sql-formatter';

export interface SubqueryStrategy {
    format(context: SubqueryContext, formatter: SQLFormatterInterface): string;
}

export class UnionSubqueryStrategy implements SubqueryStrategy {
    format(context: SubqueryContext, formatter: SQLFormatterInterface): string {
        const { ast, level, alias } = context;
        if (!ast) {return '(...)';}

        try {
            // 处理 UNION 子查询
            const firstQuery = formatter.formatQuery(ast, level + 1);
            const nextQuery = ast._next ? formatter.formatQuery(ast._next, level + 1) : '';
            const setOp = ast.set_op ? ast.set_op.toUpperCase() : '';

            const formattedQuery = firstQuery + 
                (nextQuery ? '\n\n' + formatter.indent(level + 1) + setOp + '\n\n' + nextQuery : '');

            return `(\n${formattedQuery}\n${formatter.indent(level)})${alias ? ` ${alias}` : ''}`;
        } catch (error) {
            console.error('Error in UnionSubqueryStrategy:', error);
            return '(...)' + (alias ? ` ${alias}` : '');
        }
    }
}

export class NestedSubqueryStrategy implements SubqueryStrategy {
    format(context: SubqueryContext, formatter: SQLFormatterInterface): string {
        const { ast, level, alias } = context;
        if (!ast) {return '(...)';}

        try {
            const formattedQuery = formatter.formatQuery(ast, level + 1);
            return `(\n${formattedQuery}\n${formatter.indent(level)})${alias ? ` ${alias}` : ''}`;
        } catch (error) {
            console.error('Error in NestedSubqueryStrategy:', error);
            return '(...)' + (alias ? ` ${alias}` : '');
        }
    }
}

export class SimpleSubqueryStrategy implements SubqueryStrategy {
    format(context: SubqueryContext, formatter: SQLFormatterInterface): string {
        const { ast, level, alias } = context;
        if (!ast) {return '(...)';}

        try {
            const formattedQuery = formatter.formatQuery(ast, level + 1);
            return `(\n${formattedQuery}\n${formatter.indent(level)})${alias ? ` ${alias}` : ''}`;
        } catch (error) {
            console.error('Error in SimpleSubqueryStrategy:', error);
            return '(...)' + (alias ? ` ${alias}` : '');
        }
    }
}

export class SubqueryStrategyFactory {
    private static instance: SubqueryStrategyFactory;
    private strategies: Map<SubqueryContext['type'], SubqueryStrategy>;

    private constructor() {
        this.strategies = new Map();
        this.strategies.set('UNION', new UnionSubqueryStrategy());
        this.strategies.set('NESTED', new NestedSubqueryStrategy());
        this.strategies.set('SIMPLE', new SimpleSubqueryStrategy());
        // WITH 类型可以使用 SimpleSubqueryStrategy
        this.strategies.set('WITH', new SimpleSubqueryStrategy());
    }

    static getInstance(): SubqueryStrategyFactory {
        if (!SubqueryStrategyFactory.instance) {
            SubqueryStrategyFactory.instance = new SubqueryStrategyFactory();
        }
        return SubqueryStrategyFactory.instance;
    }

    getStrategy(type: SubqueryContext['type']): SubqueryStrategy {
        const strategy = this.strategies.get(type);
        if (!strategy) {
            throw new Error(`No strategy found for subquery type: ${type}`);
        }
        return strategy;
    }
} 