# SQL Formatter / SQL 格式化工具

一个简易的 HiveSQL 格式化工具，支持简易 HiveSQL 语句的格式化，提供清晰、一致的代码风格。
A lightweight HiveSQL formatting tool that supports basic HiveSQL statement formatting, providing clear and consistent code style.

> **注意：个人风格，仅供参考，暂不支持格式化样式自定义选择。**
> Note: Personal style preferences, for reference only. Currently does not support custom formatting options.

## 🔍 关于项目 / About the Project

本格式化工具基于 Node.js 构建，基于 SQL-Parser 进行 SQL 语义解析，通过抽象语法树实现代码格式化。该工具作为 VS Code 扩展提供。

This formatting tool is built on Node.js and uses SQL-Parser for SQL syntax parsing, implementing code formatting through abstract syntax tree (AST). The tool is provided as a VS Code extension.

## ⚠️ Important Notes / 使用前的注意事项

- 当前版本为测试版，部分格式化功能仍在完善中
- 建议在格式化前及时保存代码，以便需要时可以撤销（Ctrl + Z）; QaQ
- 暂不支持格式化样式自定义
- 暂不支持注释

- Current version is in beta, some formatting features are still being improved
- Recommend saving code before formatting (Ctrl + Z to undo if needed); QaQ
- Custom formatting styles not supported yet
- Comments not supported yet


## ✨ Features / 主要特性
- 智能格式化：自动缩进、换行和对齐
- 关键字标准化：自动将 SQL 关键字转换为大写
- 代码安全：格式化前后代码长度变化超过阈值时进行提示
- 基本支持：
  - 子查询 & CTE
  - 各类运算符（AND、OR、IN、BETWEEN 等）
  - JOIN 语句布局优化
  - 聚合函数和 CASE WHEN 语句
  - GROUP BY、HAVING、ORDER BY 子句


- Smart Formatting: Automatic indentation, line breaks and alignment
- Keyword Standardization: Automatically converts SQL keywords to uppercase
- Code Safety: Warning prompts when formatted code length changes exceed threshold
- Basic Support:
  - Subqueries & CTE
  - Various operators (AND, OR, IN, BETWEEN, etc.)
  - JOIN statement layout optimization
  - Aggregate functions and CASE WHEN statements
  - GROUP BY, HAVING, ORDER BY clauses



## 🚀 Quick Start / 快速开始
1. 在 VS Code 中安装扩展
2. 选择需要格式化的 SQL 代码
3. 使用右键菜单进行格式化（**目前仅支持此方式，暂不支持快捷键**）

1. Install the extension in VS Code
2. Select the SQL code you want to format
3. Use the right-click menu to format (Currently only supports this method, keyboard shortcuts not available yet)



## 📝 Usage Examples / 使用示例

### Before Formatting / 格式化前
```sql
SELECT id, name, age, gender FROM users WHERE age > 18 AND gender = 'male'
```

### After Formatting / 格式化后
```sql
SELECT
    id,
    name,
    age,
    gender
FROM
    users
WHERE
    age > 18
    AND gender = 'male'
```



## 🗓️ Development Plan / 开发计划

- **Comment Processing / 注释处理支持**
  - [ ] comment formatting support / 注释的格式化支持

- **Feature Enhancement / 功能增强**
  - [ ] Various formatting styles / 多样化的预设格式化样式
  - [ ] Custom formatting rules / 自定义格式化规则
  - [x] ~~Better error prompts / 完善的错误提示~~

- **Code Security / 代码安全保障**
  - [x] ~~Code loss warning mechanism / 代码丢失预警机制~~

- **Performance Optimization / 性能优化**
  - [x] ~~Reduce memory usage & package size / 减少内存占用 & 减少包体大小~~

- **Documentation / Readme文档完善**
  - [x] ~~完善Readme文档~~
  - [x] ~~添加英文支持~~

## 🙏 致谢 / Acknowledgements

本项目的开发得益于以下开源项目的支持：

This project was made possible with the support of the following open-source projects:

- **[node-sql-parser](https://www.npmjs.com/package/node-sql-parser)** - 强大的SQL解析器，为本项目提供了核心的SQL语法分析能力，使格式化工作成为可能，表示非常感谢！/A powerful SQL parser that provides the core SQL syntax analysis capability for this project, making the formatting work possible. Special thanks to the outstanding work!

## 💡 贡献 / Contributing

欢迎对本项目提出改进建议或直接贡献代码！请通过Issue或Pull Request参与项目。

Suggestions for improvement or direct code contributions are welcome! Please participate through Issues or Pull Requests.

## 📄 License / 开源协议

本项目采用 GNU 通用公共许可证 (GPL) 第3版。

This project is licensed under the GNU General Public License (GPL) Version 3.

详细信息请参阅 LICENSE 文件。

For more details, please see the LICENSE file.