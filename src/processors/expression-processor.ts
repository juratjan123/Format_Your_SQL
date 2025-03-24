export interface ExpressionPath {
    path: string[];
    type: string;
    value?: any;
}

export interface ExpressionProcessor {
    process(expr: any): ExpressionPath[];
}

export class SQLExpressionProcessor implements ExpressionProcessor {
    process(expr: any): ExpressionPath[] {
        const paths: ExpressionPath[] = [];
        this.processNode(expr, [], paths);
        return paths;
    }

    private processNode(node: any, currentPath: string[], paths: ExpressionPath[]): void {
        if (!node || typeof node !== 'object') {
            return;
        }

        paths.push({
            path: [...currentPath],
            type: node.type || 'unknown',
            value: node.value
        });

        Object.entries(node).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    this.processNode(item, [...currentPath, `${key}[${index}]`], paths);
                });
            } else if (typeof value === 'object' && value !== null) {
                this.processNode(value, [...currentPath, key], paths);
            }
        });
    }
} 