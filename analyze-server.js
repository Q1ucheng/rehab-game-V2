const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 分析训练数据的API端点
app.post('/api/analyze-training-data', (req, res) => {
  const { filePath, sessionId } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }

  // 构建完整的文件路径
  const fullPath = path.join(__dirname, 'public', filePath.replace('/rehab-game/', ''));
  
  // 检查文件是否存在
  const fs = require('fs');
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Training data file not found' });
  }

  // 运行Python分析脚本
  const pythonProcess = spawn('python', ['demo.py', fullPath]);

  let output = '';
  let errorOutput = '';

  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
    console.log('Python output:', data.toString());
  });

  pythonProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.error('Python error:', data.toString());
  });

  pythonProcess.on('close', (code) => {
    if (code === 0) {
      // 分析成功，返回结果文件路径
      const baseName = path.basename(fullPath, '.json');
      const outputFile = `maximum_reachable_space_${baseName}.html`;
      
      res.json({
        success: true,
        outputFile: outputFile,
        message: 'Analysis completed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Analysis failed with code ${code}`,
        details: errorOutput
      });
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Analysis server running on http://localhost:${PORT}`);
});