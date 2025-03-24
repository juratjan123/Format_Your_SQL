import { IndentationContext } from './indentation-context';
import { FormatContextManager, FormatContext } from '../context/format-context-manager';
import { IndentationStrategy, BaseIndentationStrategy, SQLIndentationStrategy } from './indentation-strategy';

export class IndentationManager {
    private contexts: IndentationContext[] = [];
    private formatContextManager: FormatContextManager;
    private indentSize: number;
    private strategies: Map<string, IndentationStrategy>;

    constructor(indentSize: number = 2) {
        this.indentSize = indentSize;
        this.formatContextManager = new FormatContextManager(indentSize);
        this.strategies = new Map();
        this.strategies.set('base', new BaseIndentationStrategy());
        this.strategies.set('sql', new SQLIndentationStrategy());
    }

    private static readonly NODE_TYPE_WEIGHTS: Record<string, number> = {
        'WITH': 0,
        'CTE': 1,
        'SUBQUERY': 1,
        'SELECT': 1,
        'FROM': 0,
        'JOIN': 1,
        'WHERE': 1,
        'GROUP BY': 1,
        'HAVING': 1,
        'ORDER BY': 1
    };

    public createContext(
        baseLevel: number,
        statementType: IndentationContext['statementType'],
        clauseType: IndentationContext['clauseType'],
        parentContext?: IndentationContext,
        isWithClause?: boolean,
        parentLevel?: number,
        nodePath?: string[],
        nodeDepth?: number,
        parentType?: string,
        childIndex?: number
    ): IndentationContext {
        const parentChain = parentContext?.parentChain ? 
            [...parentContext.parentChain, parentContext.statementType] : 
            [];

        const context: IndentationContext = {
            baseLevel,
            statementType,
            clauseType,
            parentContext,
            isWithClause: isWithClause || false,
            parentLevel,
            nodePath,
            nodeDepth,
            parentType,
            childIndex,
            parentChain,
            indentStrategy: 'sql'
        };

        this.pushContext(context);
        return context;
    }

    public pushContext(context: IndentationContext): void {
        this.contexts.push(context);
        this.formatContextManager.pushContext(context.statementType, {
            level: context.baseLevel,
            isSubquery: context.clauseType === 'SUBQUERY',
            queryType: context.isWithClause ? 'WITH' : 'MAIN'
        });
    }

    public popContext(): void {
        this.contexts.pop();
        this.formatContextManager.popContext();
    }

    public getCurrentContext(): IndentationContext | undefined {
        return this.contexts[this.contexts.length - 1];
    }

    public getCurrentLevel(): number {
        const context = this.getCurrentContext();
        return context ? this.getEffectiveLevel(context) : 0;
    }

    public getEffectiveLevel(context: IndentationContext): number {
        const strategy = this.strategies.get(context.indentStrategy || 'sql');
        if (strategy) {
            return strategy.calculateIndent(context);
        }
        return this.calculateEffectiveLevel(context);
    }

    private calculateEffectiveLevel(context: IndentationContext): number {
        let level = context.baseLevel;
        const nodeTypeWeight = IndentationManager.NODE_TYPE_WEIGHTS[context.statementType] || 0;
        level += nodeTypeWeight;

        if (context.isWithClause) {
            if (context.clauseType === 'SUBQUERY') {
                level += 0;
            }
            if (context.clauseType === 'JOIN') {
                level -= 1;
            }
        }

        if (context.clauseType === 'SUBQUERY') {
            if (!context.nodePath?.includes('WITH')) {
                level += 1;
            }
        }

        if (context.clauseType === 'JOIN') {
            if (context.parentType === 'SUBQUERY') {
                level += 1;
            }
        }

        return level;
    }

    public indent(text: string): string {
        const level = this.getCurrentLevel();
        const indentStr = ' '.repeat(this.indentSize * level);
        return text.split('\n')
            .map(line => line.trim() ? indentStr + line.trim() : '')
            .join('\n');
    }

    public getIndentSize(): number {
        return this.indentSize;
    }
} 