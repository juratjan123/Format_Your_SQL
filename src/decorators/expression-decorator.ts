import { ExpressionContext } from '../types/expression-context';

/**
 * 表达式装饰器接口
 * 用于在表达式处理过程中添加额外的元数据
 */
export interface ExpressionDecorator {
    decorate(expr: any, context: ExpressionContext): any;
}

/**
 * DISTINCT 装饰器
 * 用于保存和传递 DISTINCT 关键字信息
 */
export class DistinctDecorator implements ExpressionDecorator {
    decorate(expr: any, context: ExpressionContext): any {
        // 只处理聚合函数
        if (expr?.type === 'aggr_func' && expr?.args?.distinct) {
            return {
                ...expr,
                _decorators: {
                    ...(expr._decorators || {}),
                    distinct: true
                }
            };
        }
        return expr;
    }
}

/**
 * 装饰器注册表
 * 用于管理和访问所有可用的装饰器
 */
export class DecoratorRegistry {
    private static instance: DecoratorRegistry;
    private decorators: ExpressionDecorator[] = [];

    private constructor() {
        // 注册默认装饰器
        this.registerDecorator(new DistinctDecorator());
    }

    static getInstance(): DecoratorRegistry {
        if (!DecoratorRegistry.instance) {
            DecoratorRegistry.instance = new DecoratorRegistry();
        }
        return DecoratorRegistry.instance;
    }

    registerDecorator(decorator: ExpressionDecorator) {
        this.decorators.push(decorator);
    }

    getDecorators(): ExpressionDecorator[] {
        return this.decorators;
    }
} 