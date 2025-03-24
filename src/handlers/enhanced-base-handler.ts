import { BaseHandler } from './base-handler';
import { ExpressionContext } from '../types/expression-context';
import { SQLFormatter } from '../formatter';
import { ExpressionState } from '../types/expression-state';
import { DecoratorRegistry } from '../decorators/expression-decorator';

export abstract class EnhancedBaseHandler extends BaseHandler {
    handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        const state = this.createState(expr, context);
        return this.handleInternal(expr, formatter, state);
    }

    protected abstract handleInternal(
        expr: any,
        formatter: SQLFormatter,
        state: ExpressionState
    ): string;

    protected createState(expr: any, context: ExpressionContext): ExpressionState {
        return {
            path: [],
            context,
            decorators: DecoratorRegistry.getInstance().getDecorators()
        };
    }

    protected formatWithState(
        expr: any,
        formatter: SQLFormatter,
        state: ExpressionState
    ): string {
        const decorated = this.applyDecorators(expr, state);
        return formatter.formatExpression(decorated, state.context);
    }

    protected applyDecorators(expr: any, state: ExpressionState): any {
        return state.decorators.reduce(
            (decorated, decorator) => decorator.decorate(decorated, state.context),
            expr
        );
    }

    protected createChildState(
        state: ExpressionState,
        pathSegment: string
    ): ExpressionState {
        return {
            ...state,
            path: [...state.path, pathSegment]
        };
    }
} 