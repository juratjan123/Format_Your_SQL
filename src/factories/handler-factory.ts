import { SQLValueFormatter } from '../types/sql-value';
import { SQLValueFormatStrategy } from '../strategies/value-format-strategy';
import { ExpressionTypeChecker } from '../types/expression-checker';
import { InClauseHandler } from '../handlers/in-clause-handler';

export class HandlerFactory {
    private static instance: HandlerFactory;
    private valueFormatter: SQLValueFormatter;

    private constructor() {
        this.valueFormatter = new SQLValueFormatStrategy();
    }

    static getInstance(): HandlerFactory {
        if (!HandlerFactory.instance) {
            HandlerFactory.instance = new HandlerFactory();
        }
        return HandlerFactory.instance;
    }

    createInClauseHandler(typeChecker: ExpressionTypeChecker): InClauseHandler {
        return new InClauseHandler(typeChecker, this.valueFormatter);
    }

    getValueFormatter(): SQLValueFormatter {
        return this.valueFormatter;
    }
} 