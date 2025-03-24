import { SQLFormatter } from '../formatter';

/**
 * 表示一个SET操作节点的接口
 */
export interface SetOperationNode {
    type: string;
    set_op?: string;
    _next?: SetOperationNode;
    columns?: any[];
    from?: any[];
    where?: any;
    groupby?: any;
    having?: any;
    orderby?: any;
    limit?: any;
}

/**
 * SET操作处理器
 * 用于处理SQL中的集合操作（UNION, UNION ALL等）
 */
export class SetOperationsHandler {
    private formatter: SQLFormatter;
    
    constructor(formatter: SQLFormatter) {
        this.formatter = formatter;
    }
    
    /**
     * 检查节点是否是SET操作
     */
    canHandle(node: any): boolean {
        return node && node.set_op && node._next;
    }
    
    /**
     * 处理SET操作节点
     * @param node SET操作节点
     * @param level 缩进级别
     * @returns 格式化后的SQL字符串
     */
    handle(node: SetOperationNode, level: number = 0): string {
        if (!node) {return '';}
        
        let result = this.formatter.formatMainQuery(node, level);
        let currentNode: SetOperationNode | undefined = node;
        
        // 处理所有后续的SET操作
        while (currentNode._next && currentNode.set_op) {
            result += '\n\n' + this.formatter.indent(level) + 
                     currentNode.set_op.toUpperCase() + '\n\n';
            currentNode = currentNode._next;
            result += this.formatter.formatMainQuery(currentNode, level);
        }
        
        return result;
    }
} 