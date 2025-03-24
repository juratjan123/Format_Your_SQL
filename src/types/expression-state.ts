import { ExpressionContext } from './expression-context';
import { ExpressionDecorator } from '../decorators/expression-decorator';

export interface ExpressionState {
    path: string[];
    context: ExpressionContext;
    decorators: ExpressionDecorator[];
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export interface ExpressionValidator {
    validate(expr: any, type: string): ValidationResult;
    getValidationErrors(): string[];
} 