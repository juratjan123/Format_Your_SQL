import { SQLFormatter } from '../formatter';
import * as fs from 'fs';
import * as path from 'path';
import { Parser } from 'node-sql-parser';

const formatter = new SQLFormatter();
// @ts-ignore
const parser = new Parser({ database: 'hive' });

// 读取测试SQL文件
const sqlFile = path.join(__dirname, 'test.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// 解析并格式化SQL
try {
    console.log('原始SQL:\n');
    console.log(sql);
    
    // 解析AST并打印
    // const ast = parser.astify(sql);
    // console.log('\nAST结构:\n');
    // console.log(JSON.stringify(ast, null, 2));
    
    // 格式化SQL
    console.log('\n格式化后的SQL:\n');
    const formatted = formatter.format(sql);
    console.log(formatted);
} catch (error) {
    console.error('格式化错误:', error);
}