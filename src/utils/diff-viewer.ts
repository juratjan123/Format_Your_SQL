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
  public static async showDiff(
    original: string, 
    formatted: string, 
    title: string = '原始 SQL ↔ 格式化 SQL',
    diffInfo?: { type: 'loss' | 'addition', details?: string[] }
  ): Promise<void> {
    try {
      // 生成唯一ID防止冲突
      const uniqueId = crypto.randomBytes(8).toString('hex');
      
      // 为原始和格式化SQL创建不同的scheme，避免内容提供者冲突
      const originalScheme = `sql-original-${uniqueId}`;
      const formattedScheme = `sql-formatted-${uniqueId}`;
      
      // 处理原始SQL，添加更清晰的注释和标记
      const enhancedOriginal = this.enhanceOriginalSql(original, diffInfo);
      
      // 处理格式化SQL，添加更清晰的注释和标记
      const enhancedFormatted = this.enhanceFormattedSql(formatted, diffInfo);
      
      // 创建虚拟文档URI
      const originalUri = vscode.Uri.parse(`${originalScheme}:/sql/original.sql`);
      const formattedUri = vscode.Uri.parse(`${formattedScheme}:/sql/formatted.sql`);
      
      // 为原始SQL创建内容提供者
      const originalProvider = new class implements vscode.TextDocumentContentProvider {
        provideTextDocumentContent(): string {
          return enhancedOriginal;
        }
      };
      
      // 为格式化SQL创建内容提供者
      const formattedProvider = new class implements vscode.TextDocumentContentProvider {
        provideTextDocumentContent(): string {
          return enhancedFormatted;
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
      
      // 确保文件作为SQL语言处理，以获得语法高亮
      await Promise.all([
        vscode.languages.setTextDocumentLanguage(
          await vscode.workspace.openTextDocument(originalUri), 
          'sql'
        ),
        vscode.languages.setTextDocumentLanguage(
          await vscode.workspace.openTextDocument(formattedUri), 
          'sql'
        )
      ]).catch(err => console.log('设置语言失败:', err));
      
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

  /**
   * 增强原始SQL显示，添加注释和标记
   * @param sql 原始SQL
   * @param diffInfo 差异信息
   * @returns 增强后的SQL
   */
  private static enhanceOriginalSql(sql: string, diffInfo?: { type: 'loss' | 'addition', details?: string[] }): string {
    // 提取原始SQL的前5行和后5行，用于确定是否要添加空行
    const lines = sql.split('\n');
    
    let header = '';

    // 添加一个简洁的标题注释
    if (diffInfo?.type === 'loss') {
      header += '-- ======================================================\n';
      header += '-- 【原始SQL】(格式化后有内容丢失)\n';
      header += '-- ======================================================\n';
      
      // 如果有详细信息，添加到注释中
      if (diffInfo.details && diffInfo.details.length > 0) {
        header += '--\n';
        header += '-- ⚠️ 以下内容在格式化后丢失：\n';
        diffInfo.details.slice(0, 5).forEach(item => {
          header += `--   • ${item}\n`;
        });
        if (diffInfo.details.length > 5) {
          header += `--   • (还有 ${diffInfo.details.length - 5} 项未显示)\n`;
        }
        header += '--\n';
      }
    } else if (diffInfo?.type === 'addition') {
      header += '-- ======================================================\n';
      header += '-- 【原始SQL】(格式化后有新增内容)\n';
      header += '-- ======================================================\n';
    } else {
      header += '-- ======================================================\n';
      header += '-- 【原始SQL】\n';
      header += '-- ======================================================\n';
    }
    
    header += '-- 提示：请对比右侧的格式化结果，查看具体差异\n';
    header += '-- ======================================================\n\n';
    
    return header + sql;
  }

  /**
   * 增强格式化后SQL显示，添加注释和标记
   * @param sql 格式化后的SQL
   * @param diffInfo 差异信息
   * @returns 增强后的SQL
   */
  private static enhanceFormattedSql(sql: string, diffInfo?: { type: 'loss' | 'addition', details?: string[] }): string {
    let header = '';

    // 添加一个简洁的标题注释
    if (diffInfo?.type === 'loss') {
      header += '-- ======================================================\n';
      header += '-- 【格式化后SQL】(有内容丢失)\n';
      header += '-- ======================================================\n';
    } else if (diffInfo?.type === 'addition') {
      header += '-- ======================================================\n';
      header += '-- 【格式化后SQL】(有新增内容)\n';
      header += '-- ======================================================\n';
      
      // 如果有详细信息，添加到注释中
      if (diffInfo.details && diffInfo.details.length > 0) {
        header += '--\n';
        header += '-- ⚠️ 以下内容在格式化后新增：\n';
        diffInfo.details.slice(0, 5).forEach(item => {
          header += `--   • ${item}\n`;
        });
        if (diffInfo.details.length > 5) {
          header += `--   • (还有 ${diffInfo.details.length - 5} 项未显示)\n`;
        }
        header += '--\n';
      }
    } else {
      header += '-- ======================================================\n';
      header += '-- 【格式化后SQL】\n';
      header += '-- ======================================================\n';
    }
    
    header += '-- 提示：请检查格式化结果，确认没有重要内容丢失\n';
    header += '-- ======================================================\n\n';
    
    return header + sql;
  }
} 