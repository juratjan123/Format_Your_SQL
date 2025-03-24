/**
 * SQL差异查看器
 * 用于显示格式化前后的SQL差异
 */
import * as vscode from 'vscode';
import * as crypto from 'crypto';

export class SQLDiffViewer {
  /**
   * 显示格式化前后的SQL差异
   * @param original 原始SQL
   * @param formatted 格式化后的SQL
   * @param title 差异视图的标题
   */
  public static async showDiff(original: string, formatted: string, title: string = '原始 SQL ↔ 格式化 SQL'): Promise<void> {
    try {
      // 生成唯一ID防止冲突
      const uniqueId = crypto.randomBytes(8).toString('hex');
      
      // 为原始和格式化SQL创建不同的scheme，避免内容提供者冲突
      const originalScheme = `sql-original-${uniqueId}`;
      const formattedScheme = `sql-formatted-${uniqueId}`;
      
      // 创建虚拟文档URI
      const originalUri = vscode.Uri.parse(`${originalScheme}:/sql/original.sql`);
      const formattedUri = vscode.Uri.parse(`${formattedScheme}:/sql/formatted.sql`);
      
      // 为原始SQL创建内容提供者
      const originalProvider = new class implements vscode.TextDocumentContentProvider {
        provideTextDocumentContent(): string {
          return original;
        }
      };
      
      // 为格式化SQL创建内容提供者
      const formattedProvider = new class implements vscode.TextDocumentContentProvider {
        provideTextDocumentContent(): string {
          return formatted;
        }
      };
      
      // 注册内容提供者
      const originalDisposable = vscode.workspace.registerTextDocumentContentProvider(originalScheme, originalProvider);
      const formattedDisposable = vscode.workspace.registerTextDocumentContentProvider(formattedScheme, formattedProvider);
      
      // 使用VS Code的内置diff命令显示差异
      await vscode.commands.executeCommand(
        'vscode.diff',
        originalUri,
        formattedUri,
        title,
        { 
          preview: true,
          viewColumn: vscode.ViewColumn.Active,
          preserveFocus: false
        }
      );
      
      // 设置一个延迟，在一段时间后自动清理资源
      // 因为差异编辑器关闭时不总是触发可见编辑器变化事件
      setTimeout(() => {
        originalDisposable.dispose();
        formattedDisposable.dispose();
      }, 300000); // 5分钟后自动清理
    } catch (error) {
      console.error('显示差异时出错:', error);
      vscode.window.showErrorMessage('无法显示SQL格式化差异');
    }
  }
} 