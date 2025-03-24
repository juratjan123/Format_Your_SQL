/**
 * 字符串处理工具类
 */
export class StringUtils {
    /**
     * 将中文字符范围转换为Unicode转义序列
     * @param str 输入字符串
     * @returns 转换后的字符串
     */
    static convertChineseRangeToUnicode(str: string): string {
        // 特殊处理中文字符范围的正则表达式
        const chineseRangeRegex = /\[([^\]]*)(一-龥)([^\]]*)\]/g;
        
        return str.replace(chineseRangeRegex, (match, prefix, range, suffix) => {
            // 只转换中文字符范围，保持其他部分不变
            return `[${prefix}\\u4e00-\\u9fa5${suffix}]`;
        });
    }

    /**
     * 检查字符串是否包含中文字符范围
     * @param str 输入字符串
     * @returns 是否包含中文字符范围
     */
    static hasChineseRange(str: string): boolean {
        const chineseRangeRegex = /一-龥/;
        return chineseRangeRegex.test(str);
    }
} 