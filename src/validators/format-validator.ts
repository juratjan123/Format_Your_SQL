/**
 * SQL格式化验证器
 * 用于检测格式化前后的SQL代码变化，防止代码丢失或意外添加
 */
import { SQLToken, SQLTokenizer } from '../utils/tokenizer';

export interface ValidationResult {
  isValid: boolean;
  warningType?: 'code_loss' | 'code_addition' | 'no_change';
  details?: string;
  changePercentage?: number;
  diffDetails?: Array<{
    type: string;
    value: string;
    change: 'added' | 'removed';
  }>;
}

export class FormatValidator {
  // 默认变化阈值，超过这个阈值将触发警告
  private static SIGNIFICANT_LENGTH_CHANGE_THRESHOLD = 0.1; // 10%变化阈值
  // 可接受的最小变化阈值，低于这个阈值将被视为无变化
  private static ACCEPTABLE_CHANGE_THRESHOLD = 0.01; // 1%变化阈值

  /**
   * 验证格式化前后的SQL代码
   * @param original 原始SQL
   * @param formatted 格式化后的SQL
   * @returns 验证结果
   */
  public validate(original: string, formatted: string): ValidationResult {
    // 如果原始字符串是空的，返回有效
    if (!original || original.trim().length === 0) {
      return { isValid: true };
    }

    // 如果格式化后字符串是空的但原始不是，返回无效
    if (!formatted || formatted.trim().length === 0) {
      return {
        isValid: false,
        warningType: 'code_loss',
        details: '格式化后的SQL代码为空',
        changePercentage: 100
      };
    }

    // 1. 基本的长度验证
    const lengthValidation = this.validateLength(original, formatted);
    if (!lengthValidation.isValid) {
      return lengthValidation;
    }

    // 2. 标记化对比
    const tokenValidation = this.validateTokens(original, formatted);
    if (!tokenValidation.isValid) {
      return tokenValidation;
    }

    return { isValid: true };
  }

  /**
   * 验证格式化前后的长度变化是否在合理范围内
   */
  private validateLength(original: string, formatted: string): ValidationResult {
    // 移除所有空白字符后比较
    const cleanOriginal = original.replace(/\s+/g, '');
    const cleanFormatted = formatted.replace(/\s+/g, '');
    
    // 如果完全相同，则通过验证
    if (cleanOriginal === cleanFormatted) {
      return { isValid: true };
    }

    // 计算长度变化百分比
    const originalLength = cleanOriginal.length;
    const formattedLength = cleanFormatted.length;
    const lengthDiff = Math.abs(originalLength - formattedLength);
    const changePercentage = lengthDiff / originalLength;
    
    // 如果变化超过显著阈值，触发警告
    if (changePercentage > FormatValidator.SIGNIFICANT_LENGTH_CHANGE_THRESHOLD) {
      const warningType = formattedLength < originalLength ? 'code_loss' : 'code_addition';
      return {
        isValid: false,
        warningType,
        details: `格式化导致代码${warningType === 'code_loss' ? '丢失' : '增加'}约${Math.round(changePercentage * 100)}%`,
        changePercentage: changePercentage * 100
      };
    }

    return { isValid: true };
  }

  /**
   * 验证格式化前后的标记是否保持一致
   */
  private validateTokens(original: string, formatted: string): ValidationResult {
    // 使用SQL标记化器转换为标记序列
    const originalTokens = SQLTokenizer.tokenize(original);
    const formattedTokens = SQLTokenizer.tokenize(formatted);

    // 过滤掉注释和空白
    const filteredOriginalTokens = originalTokens.filter(token => 
      token.type !== 'comment' && token.type !== 'delimiter'
    );
    const filteredFormattedTokens = formattedTokens.filter(token => 
      token.type !== 'comment' && token.type !== 'delimiter'
    );

    // 计算关键字的变化
    const keywordDiff = this.compareTokensByType(filteredOriginalTokens, filteredFormattedTokens, 'keyword');
    if (keywordDiff.hasDifference) {
      return {
        isValid: false,
        warningType: keywordDiff.addition ? 'code_addition' : 'code_loss',
        details: keywordDiff.details,
        diffDetails: keywordDiff.diffDetails
      };
    }

    // 计算标识符的变化
    const identifierDiff = this.compareTokensByType(filteredOriginalTokens, filteredFormattedTokens, 'identifier');
    if (identifierDiff.hasDifference) {
      return {
        isValid: false,
        warningType: identifierDiff.addition ? 'code_addition' : 'code_loss',
        details: identifierDiff.details,
        diffDetails: identifierDiff.diffDetails
      };
    }

    // 计算操作符的变化
    const operatorDiff = this.compareTokensByType(filteredOriginalTokens, filteredFormattedTokens, 'operator');
    if (operatorDiff.hasDifference) {
      return {
        isValid: false,
        warningType: operatorDiff.addition ? 'code_addition' : 'code_loss',
        details: operatorDiff.details,
        diffDetails: operatorDiff.diffDetails
      };
    }

    // 计算字面量的变化
    const literalDiff = this.compareTokensByType(filteredOriginalTokens, filteredFormattedTokens, 'literal');
    if (literalDiff.hasDifference) {
      return {
        isValid: false,
        warningType: literalDiff.addition ? 'code_addition' : 'code_loss',
        details: literalDiff.details,
        diffDetails: literalDiff.diffDetails
      };
    }

    return { isValid: true };
  }

  /**
   * 比较两组标记中指定类型的差异
   */
  private compareTokensByType(
    originalTokens: SQLToken[], 
    formattedTokens: SQLToken[], 
    type: string
  ): { 
    hasDifference: boolean; 
    addition?: boolean; 
    details?: string;
    diffDetails?: Array<{type: string; value: string; change: 'added' | 'removed'}>;
  } {
    // 获取指定类型的标记
    const originalTypeTokens = originalTokens.filter(token => token.type === type);
    const formattedTypeTokens = formattedTokens.filter(token => token.type === type);

    // 创建标记值的频率统计
    const originalFrequency = new Map<string, number>();
    const formattedFrequency = new Map<string, number>();

    // 统计原始标记频率
    originalTypeTokens.forEach(token => {
      const current = originalFrequency.get(token.value) || 0;
      originalFrequency.set(token.value, current + 1);
    });

    // 统计格式化后标记频率
    formattedTypeTokens.forEach(token => {
      const current = formattedFrequency.get(token.value) || 0;
      formattedFrequency.set(token.value, current + 1);
    });

    // 查找添加和删除的标记
    const addedTokens: Array<{type: string; value: string; change: 'added' | 'removed'}> = [];
    const removedTokens: Array<{type: string; value: string; change: 'added' | 'removed'}> = [];

    // 查找添加或频率增加的标记
    formattedFrequency.forEach((count, value) => {
      const originalCount = originalFrequency.get(value) || 0;
      if (count > originalCount) {
        const diff = count - originalCount;
        for (let i = 0; i < diff; i++) {
          addedTokens.push({type, value, change: 'added'});
        }
      }
    });

    // 查找删除或频率减少的标记
    originalFrequency.forEach((count, value) => {
      const formattedCount = formattedFrequency.get(value) || 0;
      if (count > formattedCount) {
        const diff = count - formattedCount;
        for (let i = 0; i < diff; i++) {
          removedTokens.push({type, value, change: 'removed'});
        }
      }
    });

    // 计算是否有差异
    const hasDifference = addedTokens.length > 0 || removedTokens.length > 0;
    
    // 没有差异，返回没有差异
    if (!hasDifference) {
      return { hasDifference: false };
    }

    // 有差异，准备差异描述
    const typeDisplayName = this.getTypeDisplayName(type);
    let details = '';
    
    if (removedTokens.length > 0) {
      details += `移除了 ${removedTokens.length} 个${typeDisplayName}`;
      if (removedTokens.length <= 5) {
        details += `：${removedTokens.map(t => t.value).join(', ')}`;
      }
    }
    
    if (addedTokens.length > 0) {
      if (details) {details += '；';}
      details += `添加了 ${addedTokens.length} 个${typeDisplayName}`;
      if (addedTokens.length <= 5) {
        details += `：${addedTokens.map(t => t.value).join(', ')}`;
      }
    }
    
    return {
      hasDifference,
      addition: addedTokens.length > removedTokens.length,
      details,
      diffDetails: [...addedTokens, ...removedTokens]
    };
  }

  /**
   * 获取标记类型的显示名称
   */
  private getTypeDisplayName(type: string): string {
    switch (type) {
      case 'keyword': return '关键字';
      case 'identifier': return '标识符';
      case 'operator': return '操作符';
      case 'literal': return '字面量';
      case 'comment': return '注释';
      case 'delimiter': return '分隔符';
      default: return '标记';
    }
  }

  // 获取当前配置的阈值
  public get significantChangeThreshold(): number {
    return FormatValidator.SIGNIFICANT_LENGTH_CHANGE_THRESHOLD;
  }

  // 设置新的阈值
  public set significantChangeThreshold(value: number) {
    if (value >= 0 && value <= 1) {
      FormatValidator.SIGNIFICANT_LENGTH_CHANGE_THRESHOLD = value;
    }
  }
} 