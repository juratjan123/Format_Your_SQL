export interface ExpressionIndentRule {
    type: string;
    baseIndent: number;
    childrenIndent: number;
    alignment: 'start' | 'content';
}

export class ExpressionIndentStrategy {
    private static rules: Map<string, ExpressionIndentRule> = new Map([
        ['case', {
            type: 'case',
            baseIndent: 0,
            childrenIndent: 1,
            alignment: 'content'
        }]
    ]);

    static getRule(type: string): ExpressionIndentRule {
        return this.rules.get(type) || {
            type,
            baseIndent: 0,
            childrenIndent: 1,
            alignment: 'start'
        };
    }
} 