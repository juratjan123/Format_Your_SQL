// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { SQLFormatter } from './formatter';
import { FormatValidator } from './validators/format-validator';
import { SQLDiffViewer } from './utils/diff-viewer';
import { SQLErrorFormatter } from './utils/error-formatter';

export function activate(context: vscode.ExtensionContext) {
	// 定义函数获取最新配置，以便稍后可以重用
	function getFormatConfig() {
		const config = vscode.workspace.getConfiguration('formatYourSQL');
		return {
			validationEnabled: config.get<boolean>('validation.enabled', true),
			validationThreshold: config.get<number>('validation.threshold', 0.1),
			indentSize: config.get<number>('indentSize', 4),
			showDetailedErrors: config.get<boolean>('errors.showDetails', true),
			highlightErrors: config.get<boolean>('errors.highlightErrors', true),
			highlightDuration: config.get<number>('errors.highlightDuration', 5000)
		};
	}
	
	// 获取初始配置
	let formatConfig = getFormatConfig();

	// 创建格式化器和验证器
	const formatter = new SQLFormatter({ indentSize: formatConfig.indentSize });
	formatter.setValidationThreshold(formatConfig.validationThreshold);
	const validator = new FormatValidator();
	validator.significantChangeThreshold = formatConfig.validationThreshold;

	// 监听配置变化
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('formatYourSQL')) {
				// 更新配置对象
				formatConfig = getFormatConfig();
				
				// 更新格式化器配置
				formatter.setValidationThreshold(formatConfig.validationThreshold);
				validator.significantChangeThreshold = formatConfig.validationThreshold;
				
				// 更新内部格式化选项
				(formatter as any).options = { indentSize: formatConfig.indentSize };
			}
		})
	);

	// 注册选中文本格式化命令
	let formatSelectionCommand = vscode.commands.registerCommand('format-your-sql.formatSelection', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const selection = editor.selection;
		if (selection.isEmpty) {
			vscode.window.showInformationMessage('请选择要格式化的SQL代码');
			return;
		}

		const original = editor.document.getText(selection);

		try {
			const formatted = formatter.format(original);
			
			// 应用格式化结果
			await editor.edit(editBuilder => {
				editBuilder.replace(selection, formatted);
			});
			
			// 获取验证结果并处理
			if (formatConfig.validationEnabled) {
				const validationResult = formatter.getLastValidationResult();
				if (validationResult && !validationResult.isValid) {
					// 显示警告通知
					showWarningNotification(validationResult, original, formatted);
				}
			}
		} catch (error: unknown) {
			// 使用错误格式化器显示友好错误消息
			SQLErrorFormatter.showErrorNotification(error, formatConfig.showDetailedErrors);
			
			// 如果有编辑器和错误消息，尝试高亮错误位置
			if (editor && error instanceof Error) {
				SQLErrorFormatter.highlightErrorPosition(editor, error.message);
			}
		}
	});

	// 注册格式化命令
	let formatCommand = vscode.commands.registerCommand('format-your-sql.format', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		if (editor.document.languageId !== 'sql') {
			vscode.window.showInformationMessage('此命令仅适用于SQL文件');
			return;
		}

		const selection = editor.selection;
		const original = selection.isEmpty 
			? editor.document.getText() 
			: editor.document.getText(selection);
		const range = selection.isEmpty
			? new vscode.Range(
				editor.document.lineAt(0).range.start,
				editor.document.lineAt(editor.document.lineCount - 1).range.end
			)
			: selection;

		try {
			const formatted = formatter.format(original);
			
			// 应用格式化结果
			await editor.edit(editBuilder => {
				editBuilder.replace(range, formatted);
			});
			
			// 获取验证结果并处理
			if (formatConfig.validationEnabled) {
				const validationResult = formatter.getLastValidationResult();
				if (validationResult && !validationResult.isValid) {
					// 显示警告通知
					showWarningNotification(validationResult, original, formatted);
				}
			}
		} catch (error: unknown) {
			// 使用错误格式化器显示友好错误消息
			SQLErrorFormatter.showErrorNotification(error, formatConfig.showDetailedErrors);
			
			// 如果有编辑器和错误消息，尝试高亮错误位置
			if (editor && error instanceof Error) {
				SQLErrorFormatter.highlightErrorPosition(editor, error.message);
			}
		}
	});

	// 注册文档格式化提供程序
	let formattingProvider = vscode.languages.registerDocumentFormattingEditProvider('sql', {
		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
			try {
				const original = document.getText();
				const formatted = formatter.format(original);
				
				const firstLine = document.lineAt(0);
				const lastLine = document.lineAt(document.lineCount - 1);
				const range = new vscode.Range(
					firstLine.range.start,
					lastLine.range.end
				);
				
				// 获取验证结果并处理
				if (formatConfig.validationEnabled) {
					const validationResult = formatter.getLastValidationResult();
					if (validationResult && !validationResult.isValid) {
						// 显示警告通知
						showWarningNotification(validationResult, original, formatted);
					}
				}
				
				return [vscode.TextEdit.replace(range, formatted)];
			} catch (error: unknown) {
				// 使用错误格式化器显示友好错误消息
				SQLErrorFormatter.showErrorNotification(error, formatConfig.showDetailedErrors);
				
				// 尝试找到活动编辑器并高亮错误
				if (error instanceof Error && vscode.window.activeTextEditor) {
					// 只有当活动编辑器是当前文档时才高亮
					if (vscode.window.activeTextEditor.document === document) {
						SQLErrorFormatter.highlightErrorPosition(vscode.window.activeTextEditor, error.message);
					}
				}
				
				return [];
			}
		}
	});

	// 显示格式化警告通知
	function showWarningNotification(
		validationResult: any, 
		originalSql: string, 
		formattedSql: string
	) {
		// 确认验证功能已启用
		if (!formatConfig.validationEnabled) {
			return;
		}
		
		// 简化警告消息
		const warningType = validationResult.warningType === 'code_loss' ? '丢失' : '增加';
		const warningIcon = warningType === '丢失' ? '⚠️' : '📝';
		
		let details = validationResult.details || `格式化前后代码${warningType}`;
		// 如果详情消息过长，进行截断
		if (details.length > 80) {
			details = details.substring(0, 77) + '...';
		}
		
		const message = `${warningIcon} SQL格式化提示: 代码可能${warningType}`;
		
		// 显示警告通知，按钮更加直观
		vscode.window.showWarningMessage(
			`${message}: ${details}`, 
			{ modal: false },
			{ title: '👁️ 查看差异', isCloseAffordance: false },
			{ title: '✓ 忽略', isCloseAffordance: true }
		).then(selection => {
			if (selection && selection.title === '👁️ 查看差异') {
				// 生成差异标题，包含时间戳
				const timestamp = new Date().toLocaleTimeString();
				const title = `SQL格式化差异对比 (${warningType === '丢失' ? '可能删除了内容' : '可能添加了内容'} - ${timestamp})`;
				
				// 添加更详细的说明注释
				let originalWithComment = `-- 【原始SQL代码】\n`;
				
				if (validationResult.diffDetails && validationResult.diffDetails.length > 0) {
					// 如果有详细的差异信息，在注释中提供更多细节
					originalWithComment += `-- 警告类型: 代码${warningType}\n`;
					originalWithComment += `-- ${details}\n`;
					originalWithComment += `-- 修改详情:\n`;
					
					const removedItems = validationResult.diffDetails
						.filter((d: any) => d.change === 'removed')
						.map((d: any) => `--   - 移除: ${d.type} "${d.value}"`);
						
					const addedItems = validationResult.diffDetails
						.filter((d: any) => d.change === 'added')
						.map((d: any) => `--   - 添加: ${d.type} "${d.value}"`);
					
					if (removedItems.length > 0) {
						originalWithComment += removedItems.slice(0, 5).join('\n') + 
							(removedItems.length > 5 ? '\n--   - ... 等' : '') + '\n';
					}
					
					if (addedItems.length > 0) {
						originalWithComment += addedItems.slice(0, 5).join('\n') + 
							(addedItems.length > 5 ? '\n--   - ... 等' : '') + '\n';
					}
				} else {
					originalWithComment += `-- 警告: 格式化可能导致代码${warningType}\n`;
				}
				
				originalWithComment += `\n${originalSql}`;
				
				// 格式化后的代码注释
				const formattedWithComment = 
					`-- 【格式化后SQL代码】\n-- 请仔细比较差异，确保没有意外${warningType}重要内容\n\n${formattedSql}`;
				
				// 显示差异对比
				SQLDiffViewer.showDiff(
					originalWithComment, 
					formattedWithComment, 
					title
				);
			}
		});
	}

	context.subscriptions.push(formatSelectionCommand, formatCommand, formattingProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
