# Change Log / 更新日志

This document records all significant updates to the Format-Your-SQL extension.
本文档记录了 Format-Your-SQL 扩展的所有重要更新。

This file is organized based on recommendations from [Keep a Changelog](http://keepachangelog.com/).
参考 [Keep a Changelog](http://keepachangelog.com/) 的建议来组织此文件。

## [0.1.2] - 2024-03-24
### Improvements / 改进
- 改进“查看差异”界面 / Improved 'View Diff' interface.
- 去除自动添加 inner、as 等关键字的功能，并尽量保持代码前后一致性 / Remove the feature of automatically adding keywords such as inner, as, etc., to maintain consistency throughout the code

## [0.1.2] - 2024-03-24
### Improvements / 改进
- 修改无法打开“查看差异”界面的Bug / Modify the bug that prevents opening the 'View Diff' interface.

## [0.1.1] - 2024-03-24
### Improvements / 改进
- 修改 Readme 文档 / Update Readme File

## [0.1.0] - 2024-03-24
### Bug Fixes / 修复
- 修复操作符优先级逻辑，优化格式化逻辑 / Fixed operator precedence logic and optimized formatting logic
### Improvements / 改进
- 添加对Hive Map的语句的支持，通过预处理和后处理机制实现对 map_column['key']、array_column[0] 等Hive特有语法的格式化支持 / Added support for Hive-specific syntax (map_column['key'], array_column[0], etc.) via pre/post processing mechanism
- 增加代码丢失报警机制,当格式化后代码长度变化超过阈值时会提示用户 / Added code loss warning mechanism that alerts users when formatted code length changes exceed threshold
- 优化错误提示,添加更多常见SQL错误的中文友好提示 / Enhanced error messages with more user-friendly Chinese prompts for common SQL errors

## [0.0.15] - 2024-03-24
### Improvements / 改进
- 添加 INTERVAL 表达式处理器 / Added INTERVAL expression handler

## [0.0.14] - 2024-02-05
### Bug Fixes / 修复
- 修复 CASE WHEN 语句格式化时引号丢失问题 / Fixed quote loss issues in CASE WHEN statement formatting

## [0.0.13] - 2024-01-25
### Bug Fixes / 修复
- 修复 BETWEEN 语句格式化异常问题 / Fixed BETWEEN statement formatting issues

## [0.0.12] - 2024-01-24
### Bug Fixes / 修复
- 修复子查询格式化异常问题 / Fixed subquery formatting issues
- 修复 CASE WHEN 语句格式化问题 / Fixed CASE WHEN statement formatting issues
- 修复多层嵌套查询缩进异常问题 / Fixed indentation issues with nested queries

## [0.0.11] - 2024-01-22
### Bug Fixes / 修复
- 修复插件无法启动的问题 / Fixed extension startup failure issue
- 修复子查询格式化异常问题 / Fixed subquery formatting issues

## [0.0.10] - 2024-01-22
### Bug Fixes / 修复
- 修复 UNION ALL 前后语句丢失问题 / Fixed missing statements before and after UNION ALL
- 修复部分情况下 DISTINCT 关键词丢失问题 / Fixed missing DISTINCT keyword in certain cases
- 修复部分缩进显示异常问题 / Fixed abnormal indentation display in some cases

## [0.0.9] - 2024-01-18
### Improvements / 改进
- Optimized bundle size and reduced package weight / 优化包体积并减小体积

## [0.0.8] - 2024-01-18
### Improvements / 改进
- Optimized HiveSQL formatting functionality / 优化 HiveSQL 格式化功能

## [0.0.7] - 2024-01-16
### Improvements / 改进
- Removed development debugging features / 移除开发调试功能

## [0.0.6] - 2024-01-16
### Bug Fixes / 修复
- Fixed various bugs / 修复部分bug

## [0.0.5] - 2024-01-16
### Bug Fixes / 修复
- Fixed various bugs / 修复部分bug

## [0.0.4] - 2024-01-16
### Improvements / 改进
- Fixed Some indentation issues / 修复部分缩进问题

## [0.0.3] - 2024-01-15

### Improvements / 改进
- Enhanced English and Chinese documentation / 完善英文和中文文档
- Optimized project structure description / 优化项目结构说明
- Added detailed usage examples / 添加详细的使用示例
- Updated development roadmap / 更新开发计划路线图

## [0.0.2] - 2024-01-14

### Bug Fixes / 修复
- Fixed formatting issues with Chinese characters / 修复中文字符处理时的格式化问题
- Optimized alignment of Chinese comments in functions / 优化函数内中文注释的对齐方式

### Improvements / 改进
- Reduced extension package size / 减小扩展包体积
- Optimized memory usage / 优化内存占用

## [0.0.1] - 2024-01-14

### New Features / 新功能
- Basic SQL formatting functionality / 基础SQL格式化功能
- Right-click menu formatting support / 右键菜单格式化支持
- SQL keyword capitalization / SQL关键字大写转换

## [Unreleased / 未发布]

### Planned Features / 计划功能
- Support for diverse formatting styles / 多样化的格式化样式支持
- Custom formatting rules / 自定义格式化规则
- Keyboard shortcut support / 快捷键支持
- Enhanced error notification system / 更完善的错误提示机制