/**
 * SQL错误格式化工具
 * 将复杂的解析错误转换为用户友好的中文错误提示
 */
import * as vscode from 'vscode';

interface ErrorMapping {
  pattern: RegExp;
  message: string;
}

export class SQLErrorFormatter {
  // 常见错误模式映射
  private static readonly ERROR_MAPPINGS: ErrorMapping[] = [
    // 添加专门处理超长期望列表的规则
    {
      pattern: /Expected ((?:"[^"]+",\s*){4,})"([^"]+)" but "([^"]*)" found/i,
      message: 'SQL语法错误：期望合法的 SQL 元素（如关键字或符号），但发现了 "$3"'
    },
    // ======== 特定格式错误 ========
    // 针对"Expected X but A found"格式的更精确匹配
    {
      pattern: /Expected (.*?) but "?([^"]*?)"? found/i,
      message: '格式错误：期望 $1，但发现了 "$2"'
    },
    // 常见的 Expected...but...found 错误
    {
      pattern: /Expected "#", "\(", "--", "\/\*", "SELECT", "WITH", or \[ \\t\\n\\r\] but .* found/i,
      message: '格式错误：SQL语句格式不正确，可能缺少SELECT或WITH关键字，或存在未闭合的括号'
    },
    // ======== SQL语法错误 ========
    {
      pattern: /unexpected token: (.+)/i,
      message: '意外的标记：$1，请检查SQL语法'
    },
    {
      pattern: /invalid input syntax for/i,
      message: '输入语法无效，请检查SQL语句结构'
    },
    {
      pattern: /mismatched input '(.+?)' expecting/i,
      message: '输入不匹配：发现 "$1"，请检查语法错误'
    },
    {
      pattern: /missing (.+?) at '(.+?)'/i,
      message: '在 "$2" 处缺少 $1'
    },
    {
      pattern: /extraneous input '(.+?)' expecting/i,
      message: '多余的输入："$1"，请删除或修正'
    },
    {
      pattern: /no viable alternative at input '(.+?)'/i,
      message: '在输入 "$1" 处没有可行的解析选项'
    },
    {
      pattern: /no viable alternative/i,
      message: '语法错误：没有可行的解析选项，请检查SQL语句'
    },
    {
      pattern: /cannot recognize input/i,
      message: '无法识别的输入内容，请检查SQL语法'
    },
    {
      pattern: /expecting (.+?), found '(.+?)'/i,
      message: '期望 $1，但发现 "$2"'
    },
    // ======== 对象引用错误 ========
    {
      pattern: /symbol (.+?) not found/i,
      message: '符号 $1 未找到，请检查表名或字段名是否正确'
    },
    {
      pattern: /table or view does not exist/i,
      message: '表或视图不存在，请检查表名是否正确'
    },
    {
      pattern: /column (.+?) does not exist/i,
      message: '列 "$1" 不存在，请检查字段名'
    },
    {
      pattern: /relation (.+?) does not exist/i,
      message: '关系 "$1" 不存在，请检查表名或视图名'
    },
    // ======== 语法位置错误 ========
    {
      pattern: /syntax error at or near "(.+?)"/i,
      message: '在 "$1" 附近存在语法错误'
    },
    {
      pattern: /syntax error at position (\d+)/i,
      message: '在位置 $1 存在语法错误'
    },
    // ======== 闭合错误 ========
    {
      pattern: /end of input/i,
      message: '意外的输入结束，SQL语句可能不完整'
    },
    {
      pattern: /unclosed string literal/i,
      message: '字符串没有闭合，请检查引号配对'
    },
    {
      pattern: /unclosed comment/i,
      message: '注释没有闭合，请检查注释标记'
    },
    {
      pattern: /unclosed quoted identifier/i,
      message: '引用标识符未闭合，请检查引号配对'
    },
    {
      pattern: /unmatched (.*)/i,
      message: '不匹配的 $1，请检查括号或引号是否正确配对'
    },
    // ======== 特殊语法错误 ========
    {
      pattern: /trailing characters/i,
      message: '语句后有多余字符，请检查语句结束位置'
    },
    {
      pattern: /unterminated .+/i,
      message: '未终止的语法结构，请检查是否缺少分号或其他结束符'
    },
    // ======== 位置信息 ========
    {
      pattern: /line (\d+):(\d+)/i,
      message: '错误位置：第 $1 行，第 $2 列'
    }
  ];

  /**
   * 美化错误消息
   * @param errorMessage 原始错误消息
   * @returns 美化后的用户友好错误消息
   */
  public static beautifyError(errorMessage: string): string {
    // 首先尝试从原始消息中匹配行号和列号
    const positionMatch = errorMessage.match(/line (\d+):(\d+)/i);
    let positionInfo = '';
    
    if (positionMatch) {
      positionInfo = `【第 ${positionMatch[1]} 行，第 ${positionMatch[2]} 列】`;
    }

    // 清理原始消息中的多余空格和换行
    const cleanedErrorMessage = errorMessage.replace(/\s+/g, ' ').trim();
    
    // 简化超长的 "Expected X, Y, Z..." 错误
    const expectedMatch = cleanedErrorMessage.match(/Expected ((?:".+?",\s*)+)but/i);
    if (expectedMatch) {
      // 提取所有期望的标记
      const expectedTokens = expectedMatch[1].match(/"(.+?)"/g) || [];
      
      // 如果标记太多，简化显示
      if (expectedTokens.length > 5) {
        // 提取重要的SQL关键字
        const keywords = expectedTokens
          .map(t => t.replace(/"/g, ''))
          .filter(t => /^[A-Z]{2,}$/.test(t) || t === "SELECT" || t === "FROM" || t === "WHERE" || t === "INSERT" || t === "UPDATE" || t === "DELETE");
        
        // 提取符号
        const symbols = expectedTokens
          .map(t => t.replace(/"/g, ''))
          .filter(t => /^[^\w\s]$/.test(t));
        
        // 生成简化消息
        let simplifiedExpected = "";
        if (keywords.length > 0) {
          simplifiedExpected += `SQL关键字（如 ${keywords.slice(0, 3).join(", ")}${keywords.length > 3 ? " 等" : ""}）`;
        }
        
        if (symbols.length > 0) {
          if (simplifiedExpected) {
            simplifiedExpected += " 或 ";
          }
          simplifiedExpected += `符号（如 ${symbols.slice(0, 3).map(s => `"${s}"`).join(", ")}${symbols.length > 3 ? " 等" : ""}）`;
        }
        
        if (!simplifiedExpected) {
          simplifiedExpected = "合法的SQL语法元素";
        }
        
        // 提取错误中实际发现的内容
        const foundMatch = cleanedErrorMessage.match(/but\s+"?([^"]*?)"?\s+found/i);
        const foundPart = foundMatch ? `，但发现了 "${foundMatch[1]}"` : "";
        
        return `SQL语法错误：期望 ${simplifiedExpected}${foundPart}。${positionInfo}`;
      }
    }

    // 尝试匹配预定义的错误模式
    for (const mapping of this.ERROR_MAPPINGS) {
      const match = cleanedErrorMessage.match(mapping.pattern);
      if (match) {
        let message = mapping.message;
        
        // 替换捕获组
        for (let i = 1; i < match.length; i++) {
          message = message.replace(`$${i}`, match[i]);
        }

        // 确保消息格式化一致性 - 句末添加句号，如果不是问号或感叹号结尾
        if (!/[？！。]$/.test(message)) {
          message += '。';
        }
        
        return `${message}${positionInfo ? ' ' + positionInfo : ''}`;
      }
    }

    // 常见原始错误提示词的中文替换
    let messageSimplified = cleanedErrorMessage
      .replace(/Expected/gi, '期望')
      .replace(/\bbut\b/gi, '但')
      .replace(/\bfound\b/gi, '发现')
      .replace(/end of input/gi, '输入结束')
      .replace(/\bline\b/gi, '行')
      .replace(/\bcolumn\b/gi, '列')
      .replace(/mismatched input/gi, '输入不匹配')
      .replace(/\bexpecting\b/gi, '期望');
    
    // 修复可能出现的重复词语问题
    messageSimplified = messageSimplified
      .replace(/但\s+发现\s+发现/g, '但发现')
      .replace(/期望\s+(.+?)[,，]\s+但\s+发现\s+发现/g, '期望 $1，但发现')
      .replace(/(\S+)\s+发现[\.。]/, '$1。')
      .replace(/，发现[\.。]/g, '。');
    
    // 统一标点符号为中文格式
    messageSimplified = messageSimplified
      .replace(/\./g, '。')
      .replace(/,/g, '，')
      .replace(/:/g, '：')
      .replace(/;/g, '；')
      .replace(/\?/g, '？')
      .replace(/!/g, '！');
    
    // 美化格式，增加适当的标点符号间隔
    messageSimplified = messageSimplified
      .replace(/([，。；：！？])([^\s，。；：！？])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
    
    // 确保句末有标点
    if (!/[。！？；]$/.test(messageSimplified)) {
      messageSimplified += '。';
    }

    // 无法匹配预定义模式，返回简化后的原始消息
    return `SQL语法错误：${messageSimplified}`;
  }

  /**
   * 显示格式化错误通知
   * @param error 错误对象
   * @param showFullDetails 是否显示完整错误详情
   */
  public static showErrorNotification(error: unknown, showFullDetails: boolean = false): void {
    const originalMessage = error instanceof Error ? error.message : String(error);
    
    // 处理常见格式化错误的前缀
    const cleanMessage = originalMessage.replace(/^格式化错误: /i, '');
    
    // 美化错误消息
    const beautifiedMessage = this.beautifyError(cleanMessage);
    
    // 如果消息以"SQL语法错误："开头，避免在前缀中重复显示
    const displayMessage = beautifiedMessage.startsWith('SQL语法错误：') 
      ? beautifiedMessage 
      : `SQL格式化错误: ${beautifiedMessage}`;
    
    // 提取关键错误部分，如果消息过长则截断
    const shortMessage = displayMessage.length > 100 
      ? displayMessage.substring(0, 97) + '...' 
      : displayMessage;
    
    // 显示错误通知
    vscode.window.showErrorMessage(
      shortMessage,
      '查看详情'
    ).then(selection => {
      if (selection === '查看详情') {
        // 获取当前时间
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        const dateString = now.toLocaleDateString();
        
        // 准备错误详情内容 - 使用类似 Markdown 格式以获得更好的可读性
        const errorDetails = `# SQL格式化错误详情
> 时间: ${dateString} ${timeString}
> 错误类型: ${error instanceof Error ? error.constructor.name : '未知错误'}

## 错误描述

\`\`\`
${displayMessage}
\`\`\`

## 可能的解决方法

${this.getSuggestionForError(cleanMessage)}

## 原始错误信息

\`\`\`
${originalMessage}
\`\`\`

${error instanceof Error && error.stack ? `
## 错误堆栈

\`\`\`
${error.stack}
\`\`\`
` : ''}
`;
        
        // 创建临时文档查看错误详情
        const uniqueId = require('crypto').randomBytes(4).toString('hex');
        const scheme = `sql-error-${uniqueId}`;
        const uri = vscode.Uri.parse(`${scheme}:/errors/sql-error-details.md`); // 使用 .md 扩展名启用 Markdown 支持
        
        // 创建内容提供者
        const contentProvider = new class implements vscode.TextDocumentContentProvider {
          provideTextDocumentContent(): string {
            return errorDetails;
          }
        };
        
        // 注册内容提供者
        const disposable = vscode.workspace.registerTextDocumentContentProvider(scheme, contentProvider);
        
        // 打开错误详情查看器
        vscode.commands.executeCommand('vscode.open', uri, {
          preview: true,
          viewColumn: vscode.ViewColumn.Active,
          preserveFocus: false
        }).then(() => {
          // 5分钟后释放资源
          setTimeout(() => {
            disposable.dispose();
          }, 300000);
        });
      }
    });
  }

  /**
   * 根据错误消息提供可能的解决方案建议
   * @param errorMessage 错误消息
   * @returns 解决方案建议
   */
  private static getSuggestionForError(errorMessage: string): string {
    if (/unexpected token|but\s+"?([^"]*?)"?\s+found/i.test(errorMessage)) {
      return `1. 检查 SQL 语法，确保所有关键字拼写正确
2. 确保括号、引号等成对出现
3. 检查是否遗漏了逗号、分号等分隔符
4. 在关键字间确保有适当的空格`;
    }
    
    if (/unclosed|unmatched|not terminated/i.test(errorMessage)) {
      return `1. 检查括号 '()'、引号 '""' 是否成对
2. 确保多行字符串或注释已正确关闭
3. 确保所有 SQL 代码块（如 BEGIN/END）已正确闭合`;
    }
    
    if (/syntax error|parse error/i.test(errorMessage)) {
      return `1. 检查语句结构是否符合 SQL 语法
2. 确认关键字的顺序是否正确（如 SELECT-FROM-WHERE）
3. 检查是否使用了未支持的 SQL 方言特性`;
    }
    
    if (/does not exist/i.test(errorMessage)) {
      return `1. 确认表名、列名拼写正确
2. 检查对象是否需要带模式前缀（如 schema.table）
3. 确认引用的数据库对象确实存在`;
    }
    
    // 默认建议
    return `1. 仔细检查 SQL 语法
2. 尝试分段编写 SQL，确保每个部分正确后再组合
3. 参考正确的 SQL 示例或文档`;
  }

  /**
   * 高亮显示错误位置
   * @param editor 编辑器对象
   * @param errorMessage 错误消息
   */
  public static highlightErrorPosition(editor: vscode.TextEditor, errorMessage: string): void {
    // 读取用户配置
    const config = vscode.workspace.getConfiguration('formatYourSQL');
    const highlightErrors = config.get<boolean>('errors.highlightErrors', true);
    const highlightDuration = config.get<number>('errors.highlightDuration', 5000);
    
    // 如果用户禁用了错误高亮，则直接返回
    if (!highlightErrors) {
      return;
    }
    
    // 尝试从错误消息中提取行号和列号
    const match = errorMessage.match(/line (\d+):(\d+)/i);
    if (match && editor) {
      const line = parseInt(match[1], 10) - 1; // VSCode行号从0开始
      const column = parseInt(match[2], 10) - 1; // VSCode列号从0开始
      
      // 确保行号和列号有效
      if (line >= 0 && line < editor.document.lineCount && column >= 0) {
        // 创建错误位置
        const position = new vscode.Position(line, column);
        
        // 创建错误范围（从错误位置到行尾或者向后5个字符）
        const lineLength = editor.document.lineAt(line).text.length;
        const endColumn = Math.min(column + 5, lineLength);
        const range = new vscode.Range(position, new vscode.Position(line, endColumn));
        
        // 滚动到错误位置
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        
        // 选中错误范围
        editor.selection = new vscode.Selection(range.start, range.end);
        
        // 添加临时装饰器突出显示错误
        const decoration = vscode.window.createTextEditorDecorationType({
          backgroundColor: new vscode.ThemeColor('errorForeground'),
          border: '1px solid red',
          borderRadius: '2px',
          overviewRulerColor: new vscode.ThemeColor('errorForeground'),
          overviewRulerLane: vscode.OverviewRulerLane.Right
        });
        
        editor.setDecorations(decoration, [range]);
        
        // 几秒后清除装饰器
        setTimeout(() => {
          decoration.dispose();
        }, highlightDuration);
      }
    } else {
      // 如果无法从错误消息中提取位置信息，尝试在编辑器中查找错误的关键词
      this.highlightErrorKeywords(editor, errorMessage);
    }
  }

  /**
   * 通过关键词查找可能的错误位置并高亮
   * @param editor 编辑器对象
   * @param errorMessage 错误消息
   */
  private static highlightErrorKeywords(editor: vscode.TextEditor, errorMessage: string): void {
    // 提取可能的错误标记
    const tokenMatch = errorMessage.match(/(?:unexpected token:|found|expecting) ['"]?([^'".,\s]+)['"]?/i);
    if (tokenMatch && editor) {
      const errorToken = tokenMatch[1];
      const document = editor.document;
      const text = document.getText();
      
      // 查找错误标记在文档中的位置
      const index = text.indexOf(errorToken);
      if (index >= 0) {
        // 计算行号和列号
        const position = document.positionAt(index);
        const range = new vscode.Range(
          position,
          document.positionAt(index + errorToken.length)
        );
        
        // 滚动到位置并高亮
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        editor.selection = new vscode.Selection(range.start, range.end);
        
        // 添加临时装饰器
        const decoration = vscode.window.createTextEditorDecorationType({
          backgroundColor: new vscode.ThemeColor('errorForeground'),
          border: '1px solid red',
          borderRadius: '2px'
        });
        
        editor.setDecorations(decoration, [range]);
        
        // 读取用户配置的高亮持续时间
        const config = vscode.workspace.getConfiguration('formatYourSQL');
        const highlightDuration = config.get<number>('errors.highlightDuration', 5000);
        
        // 几秒后清除装饰器
        setTimeout(() => {
          decoration.dispose();
        }, highlightDuration);
      }
    }
  }
} 