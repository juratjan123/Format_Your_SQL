/**
 * 表达式状态管理器
 * 负责管理表达式的状态和上下文
 */

export interface ExpressionState {
    type: string;
    depth: number;
    parentType: string;
    isComplete: boolean;
    requiredClosings: string[];
}

export class ExpressionStateManager {
    private static instance: ExpressionStateManager;
    private stateStack: ExpressionState[] = [];

    private constructor() {}

    static getInstance(): ExpressionStateManager {
        if (!ExpressionStateManager.instance) {
            ExpressionStateManager.instance = new ExpressionStateManager();
        }
        return ExpressionStateManager.instance;
    }

    pushState(state: ExpressionState) {
        this.stateStack.push(state);
    }

    getCurrentState(): ExpressionState | undefined {
        return this.stateStack[this.stateStack.length - 1];
    }

    popState(): ExpressionState | undefined {
        return this.stateStack.pop();
    }

    clear() {
        this.stateStack = [];
    }

    getDepth(): number {
        return this.stateStack.length;
    }

    hasIncompleteStates(): boolean {
        return this.stateStack.some(state => !state.isComplete);
    }

    markCurrentComplete() {
        const currentState = this.getCurrentState();
        if (currentState) {
            currentState.isComplete = true;
        }
    }
    
    /**
     * 获取当前状态栈的副本
     * @returns 当前所有状态的数组
     */
    getStates(): ExpressionState[] {
        return [...this.stateStack];
    }
} 