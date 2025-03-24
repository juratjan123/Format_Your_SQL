import { ASTNode, SubQueryNode, ValidationResult } from '../types/ast-types';

export class ASTValidator {
    validate(node: ASTNode): ValidationResult {
        if (!node || !node.type) {
            return { isValid: false, error: 'Invalid node structure' };
        }

        if (this.isSubQuery(node)) {
            return this.validateSubQuery(node as SubQueryNode);
        }

        if (node.type === 'expr_list') {
            return this.validateExprList(node);
        }

        return { isValid: true };
    }

    private isSubQuery(node: any): boolean {
        return node && node.ast && node.tableList && node.columnList;
    }

    private validateSubQuery(node: SubQueryNode): ValidationResult {
        if (!node.ast || !Array.isArray(node.tableList) || !Array.isArray(node.columnList)) {
            return { isValid: false, error: 'Invalid subquery structure' };
        }
        return { isValid: true };
    }

    private validateExprList(node: any): ValidationResult {
        if (!Array.isArray(node.value)) {
            return { isValid: false, error: 'Invalid expression list' };
        }
        return { isValid: true };
    }
} 