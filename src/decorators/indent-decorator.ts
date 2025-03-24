/**
 * 缩进装饰器
 * 用于自动管理方法执行过程中的缩进上下文
 */

import { IndentContext, IndentContextStack } from '../indent/indent-context-stack';
import { SQLFormatter } from '../formatter';
import { ExpressionContext } from '../types/expression-context';

export function withIndentContext(type: IndentContext['type'], extraLevel: number = 0): MethodDecorator {
    return function (
        target: Object,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor
    ): PropertyDescriptor {
        const originalMethod = descriptor.value;
        
        descriptor.value = function (this: any, ...args: any[]): string {
            const stack = IndentContextStack.getInstance();
            stack.push({ type, level: extraLevel });
            
            try {
                return originalMethod.apply(this, args);
            } finally {
                stack.pop();
            }
        };
        
        return descriptor;
    };
} 