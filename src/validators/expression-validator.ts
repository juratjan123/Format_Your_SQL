import { ExpressionContext } from '../types/expression-context';

export interface ValidationResult {
    isValid: boolean;
    missingClosings: string[];
    errors?: string[];
}

export class ExpressionValidator {
    private static instance: ExpressionValidator;

    private constructor() {}

    static getInstance(): ExpressionValidator {
        if (!ExpressionValidator.instance) {
            ExpressionValidator.instance = new ExpressionValidator();
        }
        return ExpressionValidator.instance;
    }

    validate(expr: any, context: ExpressionContext): ValidationResult {
        if (!expr) {
            return { isValid: true, missingClosings: [] };
        }

        const requiredClosings = this.getRequiredClosings(expr);
        const hasAllClosings = this.checkClosings(expr);
        const errors = this.validateExpression(expr);

        return {
            isValid: hasAllClosings && errors.length === 0,
            missingClosings: hasAllClosings ? [] : requiredClosings,
            errors: errors
        };
    }

    private getRequiredClosings(expr: any): string[] {
        const closings: string[] = [];
        
        switch (expr.type) {
            case 'case':
                closings.push('END');
                break;
            case 'subquery':
                closings.push(')');
                break;
        }

        return closings;
    }

    private checkClosings(expr: any): boolean {
        if (!expr) {return true;}

        switch (expr.type) {
            case 'case':
                // 检查CASE语句是否完整
                return this.validateCaseExpression(expr);
            case 'subquery':
                // 检查子查询是否有正确的括号
                return this.validateSubquery(expr);
            default:
                return true;
        }
    }

    private validateCaseExpression(expr: any): boolean {
        if (!expr.args || !Array.isArray(expr.args)) {
            return false;
        }

        // 检查是否有至少一个WHEN分支
        const hasWhen = expr.args.some((arg: any) => arg.type === 'when');
        if (!hasWhen) {
            return false;
        }

        return true;
    }

    private validateSubquery(expr: any): boolean {
        // 子查询验证逻辑
        return true;
    }

    private validateExpression(expr: any): string[] {
        const errors: string[] = [];

        if (!expr) {
            return errors;
        }

        // 基本验证
        if (expr.type === 'case') {
            if (!expr.args || !Array.isArray(expr.args)) {
                errors.push('CASE语句缺少分支');
            } else {
                // 验证WHEN-THEN对
                let hasWhen = false;
                let hasElse = false;

                for (const arg of expr.args) {
                    if (arg.type === 'when') {
                        hasWhen = true;
                        if (!arg.cond || !arg.result) {
                            errors.push('WHEN子句缺少条件或结果');
                        }
                    } else if (arg.type === 'else') {
                        if (hasElse) {
                            errors.push('CASE语句不能有多个ELSE子句');
                        }
                        hasElse = true;
                        if (!arg.result) {
                            errors.push('ELSE子句缺少结果');
                        }
                    }
                }

                if (!hasWhen) {
                    errors.push('CASE语句至少需要一个WHEN子句');
                }
            }
        }

        return errors;
    }
} 