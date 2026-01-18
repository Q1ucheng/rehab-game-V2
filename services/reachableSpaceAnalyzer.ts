/**
 * TypeScript版本的demo.py分析工具
 * 在浏览器中直接运行可达空间分析，无需服务器端调用
 */

interface TrainingDataPoint {
  timestamp: number;
  inputState: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  gameState: {
    score: number;
    fails: number;
    isGameOver: boolean;
  };
}

interface TrainingSessionData {
  session_id: string;
  user: {
    uid: string;
    displayName: string;
    email: string;
  };
  session_start_time: string;
  session_end_time: string;
  session_duration_ms: number;
  total_data_points: number;
  training_data: TrainingDataPoint[];
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface AnalysisResult {
  success: boolean;
  message: string;
  data?: {
    points: Point3D[];
    boundaryPoints: Point3D[];
    extendedBoundaryPoints: Point3D[];
    maxHeight: number;
    totalPoints: number;
  };
}

interface PlotlyTrace {
  x: number[];
  y: number[];
  z: number[];
  type: string;
  mode?: string;
  marker?: any;
  line?: any;
  name?: string;
  hovertemplate?: string;
  i?: number[];
  j?: number[];
  k?: number[];
  colorscale?: any[];
  intensity?: number[];
  intensitymode?: string;
  opacity?: number;
  lighting?: any;
  showlegend?: boolean;
  hoverinfo?: string;
}

class ReachableSpaceAnalyzer {
  /**
   * 加载训练数据
   */
  async loadTrainingData(filePath: string): Promise<TrainingSessionData | null> {
    try {
      const raw = filePath.trim();
      const isUrl = /^[a-z]+:\/\//i.test(raw) || raw.startsWith('blob:') || raw.startsWith('data:');
      const fileName = (raw.split('/').pop() || '').trim();

      const candidates = Array.from(new Set([
        raw,
        // 兼容旧目录结构：/traindata/<uid>/training_data_001.json -> /traindata/training_data_001.json
        raw.replace(/(\/traindata)\/[^/]+\/(training_data_\d{3}\.json)$/i, '$1/$2'),
        // 兼容部署子路径：/rehab-game 前缀有无
        raw.startsWith('/rehab-game/') ? raw.replace('/rehab-game', '') : raw,
        raw.startsWith('/traindata/') ? `/rehab-game${raw}` : raw,
        // 仅文件名或路径不完整时的兜底
        fileName ? `/rehab-game/traindata/${fileName}` : '',
        fileName ? `/traindata/${fileName}` : '',
      ]))
        .map(p => p.replace(/\/{2,}/g, '/'))
        .filter(Boolean);

      const triedPaths = isUrl ? [raw] : candidates;
      let lastError: unknown = null;

      for (const candidatePath of triedPaths) {
        try {
          const response = await fetch(candidatePath);
          if (!response.ok) continue;
          const data = await response.json();
          return data as TrainingSessionData;
        } catch (error) {
          lastError = error;
        }
      }

      throw new Error(
        `Failed to fetch training data. Tried: ${triedPaths.join(', ')}${
          lastError ? `; last error: ${String(lastError)}` : ''
        }`
      );
    } catch (error) {
      console.error(`Error loading training data from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 从训练数据中提取摇杆角度数据
   */
  extractJoystickData(trainingData: TrainingSessionData): { rolls: number[]; pitches: number[] } {
    const rolls: number[] = [];
    const pitches: number[] = [];

    for (const trainingPoint of trainingData.training_data) {
      const inputState = trainingPoint.inputState;
      rolls.push(inputState.roll);
      pitches.push(inputState.pitch);
    }

    return { rolls, pitches };
  }

  /**
   * 将摇杆角度转换为3D坐标
   */
  convertAnglesToCoordinates(rolls: number[], pitches: number[], length: number = 1.0): Point3D[] {
    const points: Point3D[] = [];

    for (let i = 0; i < rolls.length; i++) {
      const roll = rolls[i];
      const pitch = pitches[i];

      // 计算倾斜角度和方位角
      const tiltAngle = Math.sqrt(roll * roll + pitch * pitch);
      const azimuth = Math.atan2(pitch, roll);

      // 转换为笛卡尔坐标
      const x = length * Math.sin(tiltAngle) * Math.cos(azimuth);
      const y = length * Math.sin(tiltAngle) * Math.sin(azimuth);
      const z = length * Math.cos(tiltAngle);

      points.push({ x, y, z });
    }

    return points;
  }

  /**
   * 查找真实边界点
   */
  findTrueBoundaryPoints(points: Point3D[], nSectors: number = 180): Point3D[] {
    const boundaryPoints: Point3D[] = [];
    const sectorWidth = (2 * Math.PI) / nSectors;

    for (let i = 0; i < nSectors; i++) {
      const sectorCenter = i * sectorWidth;
      const sectorStart = sectorCenter - sectorWidth / 2;
      const sectorEnd = sectorCenter + sectorWidth / 2;

      // 查找此扇区中的点
      const sectorPoints: Point3D[] = [];
for (const point of points) {
        const azimuth = Math.atan2(point.y, point.x);
        const azimuthPositive = azimuth < 0 ? azimuth + 2 * Math.PI : azimuth;

        let inSector = false;
        if (sectorStart < 0) {
          const adjustedStart = sectorStart + 2 * Math.PI;
inSector = azimuthPositive >= adjustedStart || azimuthPositive < sectorEnd;
        } else if (sectorEnd > 2 * Math.PI) {
          const adjustedEnd = sectorEnd - 2 * Math.PI;
inSector = azimuthPositive >= sectorStart || azimuthPositive < adjustedEnd;
        } else {
          inSector = azimuthPositive >= sectorStart && azimuthPositive < sectorEnd;
        }

        if (inSector) {
          sectorPoints.push(point);
        }
      }

      // 如果扇区中有点，找到距离最远的点
      if (sectorPoints.length > 0) {
        let maxDistance = -1;
        let farthestPoint: Point3D | null = null;

        for (const point of sectorPoints) {
          const distance = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
          if (distance > maxDistance) {
            maxDistance = distance;
            farthestPoint = point;
}
        }

        if (farthestPoint) {
          boundaryPoints.push(farthestPoint);
        }
      }
    }

    // 按方位角排序边界点
    return boundaryPoints.sort((a, b) => {
      const azimuthA = Math.atan2(a.y, a.x);
      const azimuthB = Math.atan2(b.y, b.x);
      return azimuthA - azimuthB;
    });
  }

  /**
   * 将边界点扩展到边界最高平面
   */
  extendBoundaryToHighestPlane(boundaryPoints: Point3D[]): { extendedPoints: Point3D[]; maxHeight: number } {
    if (boundaryPoints.length === 0) {
      return { extendedPoints: [], maxHeight: 0 };
    }

    // 找到边界点中的最大Z值
    let maxHeight = -Infinity;
    for (const point of boundaryPoints) {
      if (point.z > maxHeight) {
        maxHeight = point.z;
      }
    }

    const extendedPoints: Point3D[] = [];

    for (const point of boundaryPoints) {
      // 如果点已经在最高平面，直接添加
      if (Math.abs(point.z - maxHeight) < 1e-10) {
        extendedPoints.push(point);
        continue;
      }

      // 使用相似三角形将点扩展到最高边界平面
      if (point.z > 0) {
        const scaleFactor = maxHeight / point.z;
        const xExt = point.x * scaleFactor;
        const yExt = point.y * scaleFactor;
        const zExt = maxHeight;
        extendedPoints.push({ x: xExt, y: yExt, z: zExt });
      } else {
        // 如果z为0或负数，保持原样
        extendedPoints.push(point);
      }
    }

    return { extendedPoints, maxHeight };
  }

  /**
   * 计算可达空间分析
   */
  async analyzeReachableSpace(filePath: string): Promise<AnalysisResult> {
    try {
      console.log("开始可达空间分析...");

      // 1. 加载训练数据
      const trainingData = await this.loadTrainingData(filePath);
      if (!trainingData) {
        return {
          success: false,
          message: "无法加载训练数据文件"
        };
      }

      // 2. 提取摇杆数据
      const { rolls, pitches } = this.extractJoystickData(trainingData);

      // 3. 转换为3D坐标
      const points = this.convertAnglesToCoordinates(rolls, pitches);

      // 4. 查找边界点
      const boundaryPoints = this.findTrueBoundaryPoints(points, 180);

      if (boundaryPoints.length < 3) {
        return {
          success: false,
          message: "边界点数量不足，无法形成锥形空间"
        };
      }

      // 5. 扩展到最高平面
      const { extendedPoints, maxHeight } = this.extendBoundaryToHighestPlane(boundaryPoints);

      // 6. 计算统计信息
      const xValues = points.map(p => p.x);
      const yValues = points.map(p => p.y);
      const zValues = points.map(p => p.z);

      const stats = {
        minX: Math.min(...xValues),
        maxX: Math.max(...xValues),
        minY: Math.min(...yValues),
        maxY: Math.max(...yValues),
        minZ: Math.min(...zValues),
        maxZ: Math.max(...zValues),
totalPoints: points.length
      };

      console.log("可达空间分析完成:", stats);

      return {
        success: true,
        message: "可达空间分析完成",
        data: {
          points,
          boundaryPoints,
          extendedBoundaryPoints: extendedPoints,
          maxHeight,
          totalPoints: points.length
        }
      };

    } catch (error) {
      console.error("可达空间分析错误:", error);
      return {
        success: false,
        message: `分析过程中发生错误: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 生成3D可视化HTML页面
   */
  generate3DVisualization(result: AnalysisResult, sessionName: string): string {
    if (!result.success || !result.data) {
      return `
      <html>
        <head><title>分析错误</title></head>
        <body>
          <h1>可达空间分析错误</h1>
          <p>${result.message}</p>
        </body>
      </html>`;
    }

    const { points, extendedBoundaryPoints, maxHeight, totalPoints } = result.data;

    // 创建顶点数组：原点 + 所有扩展边界点
    const vertices: number[][] = [[0, 0, 0]]; // 原点
    for (const point of extendedBoundaryPoints) {
      vertices.push([point.x, point.y, point.z]);
    }

    // 创建三角形面
    const triangles: number[][] = [];
    const nBoundary = extendedBoundaryPoints.length;
    
    for (let i = 0; i < nBoundary; i++) {
      const nextI = (i + 1) % nBoundary;
      triangles.push([0, i + 1, nextI + 1]);
    }

    // 获取所有顶点的高度
    const heights = vertices.map(v => v[2]);
    const heightMin = Math.min(...heights);
    const heightMax = Math.max(...heights);
    const heightRange = heightMax - heightMin;
    
    // 归一化高度到0-1范围
    const normalizedHeights = heightRange > 0 
      ? heights.map(h => (h - heightMin) / heightRange)
      : heights.map(() => 0.5);

    // 自定义颜色比例尺
    const customColorscale = [
      [0.0, 'rgb(128, 0, 128)'],    // 紫色
      [0.25, 'rgb(0, 0, 255)'],     // 蓝色
      [0.5, 'rgb(0, 128, 0)'],      // 绿色
      [0.75, 'rgb(255, 255, 0)'],   // 黄色
      [1.0, 'rgb(255, 0, 0)']       // 红色
    ];

    // 创建闭合的边界线
    const extendedBoundaryClosed = [...extendedBoundaryPoints, extendedBoundaryPoints[0]];

    // 生成Plotly.js的HTML页面
    return `
<!DOCTYPE html>
<html>
<head>
    <title>可达空间分析 - ${sessionName}</title>
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 20px;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 20px;
        }
        .stats {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .stat-item {
            text-align: center;
            padding: 10px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
        }
        .stat-label {
            font-size: 14px;
            color: #666;
        }
        #plot {
            width: 100%;
            height: 700px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>最大可达空间可视化</h1>
        
        <div class="stats">
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${totalPoints.toLocaleString()}</div>
                    <div class="stat-label">总数据点</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${extendedBoundaryPoints.length}</div>
                    <div class="stat-label">边界点数量</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${maxHeight.toFixed(3)}</div>
                    <div class="stat-label">最大高度 (mm)</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${sessionName}</div>
                    <div class="stat-label">训练会话</div>
                </div>
            </div>
        </div>

        <div id="plot"></div>
    </div>

    <script>
        // 数据点
        const points = ${JSON.stringify(points.map(p => [p.x, p.y, p.z]))};
        
        // 顶点和三角形
        const vertices = ${JSON.stringify(vertices)};
        const triangles = ${JSON.stringify(triangles)};
        
        // 闭合边界线
        const boundaryClosed = ${JSON.stringify(extendedBoundaryClosed.map(p => [p.x, p.y, p.z]))};
        
        // 归一化高度
        const normalizedHeights = ${JSON.stringify(normalizedHeights)};

        // 扩展边界点数据（修复未定义变量错误）
        const extendedBoundaryPoints = ${JSON.stringify(extendedBoundaryPoints.map(p => [p.x, p.y, p.z]))};

        // 最大高度数据（修复未定义变量错误）
        const maxHeight = ${maxHeight};

        // 创建轨迹
        const traces = [];
        
        // 1. 添加所有数据点
        traces.push({
            x: points.map(p => p[0]),
            y: points.map(p => p[1]),
            z: points.map(p => p[2]),
            type: 'scatter3d',
            mode: 'markers',
            marker: {
                size: 2,
                color: 'rgba(70, 130, 180, 0.3)',
                symbol: 'circle',
                line: { width: 0 }
            },
            name: '所有数据点 (' + points.length.toLocaleString() + ')',
            hovertemplate: 'X: %{x:.3f}<br>Y: %{y:.3f}<br>Z: %{z:.3f}<extra></extra>'
        });
        
        // 2. 添加扩展锥形表面（最大可达空间）
        traces.push({
            x: vertices.map(v => v[0]),
            y: vertices.map(v => v[1]),
            z: vertices.map(v => v[2]),
            i: triangles.map(t => t[0]),
            j: triangles.map(t => t[1]),
            k: triangles.map(t => t[2]),
            type: 'mesh3d',
            colorscale: ${JSON.stringify(customColorscale)},
            intensity: normalizedHeights,
            intensitymode: 'vertex',
            opacity: 0.7,
            name: '扩展最大可达空间',
            hovertemplate: '最大可达空间<br>X: %{x:.3f}<br>Y: %{y:.3f}<br>Z: %{z:.3f}<extra></extra>',
            lighting: {
                ambient: 0.7,
                diffuse: 0.9,
                specular: 0.5,
                roughness: 0.5
            }
        });
        
        // 3. 添加扩展边界线（实线）
        traces.push({
            x: boundaryClosed.map(p => p[0]),
            y: boundaryClosed.map(p => p[1]),
            z: boundaryClosed.map(p => p[2]),
            type: 'scatter3d',
            mode: 'lines',
            line: {
                color: 'blue',
                width: 2
            },
            name: '最大可达空间边界',
            hoverinfo: 'skip'
        });
        
        // 4. 添加从原点到边界点的线
        const nLines = Math.min(30, extendedBoundaryPoints.length);
        const indices = Array.from({length: nLines}, (_, i) => 
            Math.floor(i * (extendedBoundaryPoints.length - 1) / (nLines - 1))
        );
        
        indices.forEach(idx => {
            const point = vertices[idx + 1];
            traces.push({
                x: [0, point[0]],
                y: [0, point[1]],
                z: [0, point[2]],
                type: 'scatter3d',
                mode: 'lines',
                line: {
                    color: 'rgba(50, 150, 50, 0.4)',
                    width: 1
                },
                showlegend: false,
                hoverinfo: 'skip'
            });
        });
        
        // 布局配置
        const layout = {
            title: {
                text: '最大可达空间可视化<br>数据点: ' + points.length.toLocaleString() + ' | 边界最大高度: ' + maxHeight.toFixed(3),
                font: { size: 16, color: 'black' },
                x: 0.5,
                y: 0.95
            },
            scene: {
                xaxis: {
                    title: 'X/mm',
                    titlefont: { size: 12, color: 'black' },
                    range: [-1.5, 1.5],
                    backgroundcolor: "white",
                    gridcolor: "rgb(220, 220, 220)",
                    showbackground: true,
                    color: 'black'
                },
                yaxis: {
                    title: 'Y/mm',
                    titlefont: { size: 12, color: 'black' },
                    range: [-1.5, 1.5],
                    backgroundcolor: "white",
                    gridcolor: "rgb(220, 220, 220)",
                    showbackground: true,
                    color: 'black'
                },
                zaxis: {
                    title: 'Z/mm',
                    titlefont: { size: 12, color: 'black' },
                    range: [-0.2, 1.2],
                    backgroundcolor: "white",
                    gridcolor: "rgb(220, 220, 220)",
                    showbackground: true,
                    color: 'black'
                },
                camera: {
                    eye: { x: 1.8, y: 1.8, z: 0.8 }
                },
                aspectmode: 'cube'
            },
            width: 1000,
            height: 700,
            showlegend: true,
            legend: {
                yanchor: "top",
                y: 0.99,
                xanchor: "left",
                x: 0.01,
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                font: { size: 11, color: 'black' }
            },
            paper_bgcolor: 'white',
            plot_bgcolor: 'white'
        };
        
        // 渲染图表
        Plotly.newPlot('plot', traces, layout);
    </script>
</body>
</html>`;
  }

  /**
   * 生成分析报告
   */
  generateAnalysisReport(result: AnalysisResult): string {
    if (!result.success || !result.data) {
      return `分析失败: ${result.message}`;
    }

    const { points, boundaryPoints, extendedBoundaryPoints, maxHeight, totalPoints } = result.data;

    return `
可达空间分析报告
================

数据统计:
- 总数据点: ${totalPoints.toLocaleString()}
- 边界点数量: ${boundaryPoints.length}
- 最大高度: ${maxHeight.toFixed(3)} mm

坐标范围:
- X: [${Math.min(...points.map(p => p.x)).toFixed(3)}, ${Math.max(...points.map(p => p.x)).toFixed(3)}]
- Y: [${Math.min(...points.map(p => p.y)).toFixed(3)}, ${Math.max(...points.map(p => p.y)).toFixed(3)}]
- Z: [${Math.min(...points.map(p => p.z)).toFixed(3)}, ${Math.max(...points.map(p => p.z)).toFixed(3)}]

分析结果:
- 成功计算了最大可达空间边界
- 边界点已扩展到最高平面 (${maxHeight.toFixed(3)} mm)
- 3D可视化已在新标签页中打开

注意: 此分析在浏览器中直接运行，无需服务器端调用。
    `.trim();
  }

  /**
   * 生成简单的可视化数据
   */
  generateSimpleVisualizationData(result: AnalysisResult): any {
    if (!result.success || !result.data) {
      return null;
    }

    const { points, boundaryPoints, extendedBoundaryPoints, maxHeight, totalPoints } = result.data;

    // 创建简单的可视化数据结构
    return {
      points: points.map(p => ({ x: p.x, y: p.y, z: p.z })),
      boundaryPoints: boundaryPoints.map(p => ({ x: p.x, y: p.y, z: p.z })),
      extendedBoundaryPoints: extendedBoundaryPoints.map(p => ({ x: p.x, y: p.y, z: p.z })),
      maxHeight,
      totalPoints,
      stats: {
        minX: Math.min(...points.map(p => p.x)),
        maxX: Math.max(...points.map(p => p.x)),
        minY: Math.min(...points.map(p => p.y)),
        maxY: Math.max(...points.map(p => p.y)),
        minZ: Math.min(...points.map(p => p.z)),
        maxZ: Math.max(...points.map(p => p.z))
      }
    };
  }

  /**
   * 在新标签页中打开3D可视化
   */
  open3DVisualizationInNewTab(result: AnalysisResult, sessionName: string): void {
    if (!result.success || !result.data) {
      console.error('无法生成3D可视化：分析结果无效');
      return;
    }

    // 生成完整的HTML页面
    const htmlContent = this.generate3DVisualization(result, sessionName);
    
    // 创建Blob对象
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // 在新标签页中打开
    const newWindow = window.open(url, '_blank');
    
    if (newWindow) {
      // 设置窗口标题 - 需要在页面加载完成后设置
      setTimeout(() => {
        try {
          newWindow.document.title = `可达空间分析 - ${sessionName}`;
        } catch (error) {
          console.log('设置窗口标题失败，页面可能还未完全加载');
        }
      }, 1000);
    } else {
      console.error('无法打开新窗口，请检查浏览器弹窗设置');
    }
  }
}

// 创建单例实例
export const reachableSpaceAnalyzer = new ReachableSpaceAnalyzer();
export type { AnalysisResult, Point3D };
