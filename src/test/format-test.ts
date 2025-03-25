import { Parser } from 'node-sql-parser';
import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore
const parser = new Parser({ database: 'hive' });

// 读取测试SQL文件
const sqlFile = path.join(__dirname, 'cast-test.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// 解析并格式化SQL
try {
    console.log('原始SQL:\n');
    console.log(sql);
    
    // 解析AST并打印
    const ast = parser.astify(sql);
    console.log('\nAST结构:\n');
    console.log(JSON.stringify(ast, null, 2));
    
    // 不使用formatter，仅查看AST
    console.log('\n仅作解析测试，暂不格式化\n');
} catch (error) {
    console.error('解析错误:', error);
}