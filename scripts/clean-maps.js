/**
 * 删除dist目录中的所有map文件的脚本
 */
const fs = require('fs');
const path = require('path');

// 定义dist目录路径
const distDir = path.join(__dirname, '..', 'dist');

try {
  // 检查dist目录是否存在
  if (!fs.existsSync(distDir)) {
    console.log('dist目录不存在，没有需要清理的map文件');
    process.exit(0);
  }

  // 读取dist目录中的所有文件
  const files = fs.readdirSync(distDir);
  
  // 过滤出所有.map文件
  const mapFiles = files.filter(file => file.endsWith('.map'));
  
  // 删除每个map文件
  let deletedCount = 0;
  for (const mapFile of mapFiles) {
    const mapFilePath = path.join(distDir, mapFile);
    fs.unlinkSync(mapFilePath);
    deletedCount++;
    console.log(`已删除: ${mapFilePath}`);
  }
  
  console.log(`成功删除了 ${deletedCount} 个map文件`);
} catch (error) {
  console.error('删除map文件时出错:', error);
  process.exit(1);
} 