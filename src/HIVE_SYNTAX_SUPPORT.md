# Hive语法支持说明

## 背景
在格式化Hive SQL时，一些Hive特有的语法结构（如map类型的访问语法）会导致SQL解析器报错。这是因为标准SQL解析器不支持这些特定于Hive的语法特性。

## 解决方案
我们实现了以下组件来解决这个问题：

1. **HivePreProcessor** - 专门处理Hive特有语法的预处理器
   - 处理map访问语法：`map_column['key']`
   - 处理数组访问语法：`array_column[0]`

2. **HiveSyntaxHelper** - Hive语法辅助工具类
   - 提供检测和转换Hive特有语法的工具方法

3. **SQLPreProcessor增强** - 集成了HivePreProcessor
   - 在解析SQL前预处理Hive特有语法
   - 在格式化后恢复原始语法形式

## 工作原理
解决方案的核心思想是"暂时替换"：

1. **预处理阶段**：
   - 识别Hive特有语法结构（如`request_map['id']`）
   - 将其替换为解析器可以处理的占位符（如`request_map__MAP_ACCESS_id_0`）
   - 保存原始表达式和占位符的映射关系

2. **解析和格式化阶段**：
   - 使用标准SQL解析器解析预处理后的SQL
   - 正常进行格式化操作

3. **后处理阶段**：
   - 使用保存的映射关系，将占位符替换回原始的Hive语法形式
   - 确保最终输出的SQL保留原始的Hive语法特性

## 支持的Hive特性
目前支持以下Hive特有语法：

1. **Map类型访问**：
   - 单引号形式：`map_column['key']`
   - 双引号形式：`map_column["key"]`
   - 带表名或别名的形式：`table.map_column['key']`和`alias.map_column['key']`

2. **数组类型访问**：
   - 数字索引形式：`array_column[0]`
   - 带表名或别名的形式：`table.array_column[0]`和`alias.array_column[0]`

## 注意事项
1. 该解决方案是为了兼容现有的SQL解析器，不影响解析器的核心功能。
2. 预处理和后处理过程对用户完全透明，用户仍然可以按照Hive SQL的语法编写查询。
3. 如果将来node-sql-parser支持这些Hive特有语法，可以考虑移除或简化这一层处理。

## 对已有功能的影响
该解决方案设计为与现有功能完全兼容：
1. 不影响对标准SQL语法的解析和格式化
2. 不改变格式化的输出风格
3. 保持与之前版本的向后兼容性 