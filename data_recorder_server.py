import asyncio
import websockets
import json
import os
import re
from datetime import datetime
import logging
import uuid

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TrainingSession:
    """单个训练会话管理类"""
    def __init__(self, session_id, user_info, base_path="traindata"):
        self.session_id = session_id
        self.user_info = user_info
        self.base_path = base_path
        self.training_data = []
        self.start_time = datetime.now()
        self.is_active = True
        
        # 修改点：统一保存路径为 base_path
        self.save_directory = self.get_save_directory()
        
        # 生成文件名：training_data_序号.json (基于全局目录计数)
        self.filename = self.generate_filename()

    def get_save_directory(self):
        """
        修改点：不再根据用户UID创建子文件夹
        直接返回基础路径，实现所有文件全局按序号排序
        """
        return self.base_path

    def generate_filename(self):
        """
        核心逻辑：扫描 base_path 目录下已有的 training_data_序号.json
        自动计算下一个全局序号
        """
        prefix = "training_data_"
        ext = ".json"
        
        # 1. 确保目录存在
        if not os.path.exists(self.save_directory):
            os.makedirs(self.save_directory)
            return f"{prefix}001{ext}"
            
        existing_files = os.listdir(self.save_directory)
        
        # 2. 正则匹配文件名中的数字部分
        pattern = re.compile(rf"^{prefix}(\d+){ext}$")
        
        max_idx = 0
        for f in existing_files:
            match = pattern.match(f)
            if match:
                idx = int(match.group(1))
                if idx > max_idx:
                    max_idx = idx
        
        # 3. 序号递增
        next_idx = max_idx + 1
        
        # 4. 返回文件名（如 training_data_001.json）
        return f"{prefix}{next_idx:03d}{ext}"

    def add_data(self, data):
        """添加训练数据"""
        if self.is_active:
            self.training_data.extend(data)

    def end_session(self):
        """结束会话并保存数据"""
        if not self.is_active:
            return None
            
        self.is_active = False
        end_time = datetime.now()
        session_duration = (end_time - self.start_time).total_seconds() * 1000
        
        try:
            data_to_save = {
                "session_id": self.session_id,
                "user": self.user_info,
                "session_start_time": self.start_time.isoformat(),
                "session_end_time": end_time.isoformat(),
                "session_duration_ms": session_duration,
                "total_data_points": len(self.training_data),
                "training_data": self.training_data
            }
            
            # 拼接最终完整路径
            file_path = os.path.join(self.save_directory, self.filename)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data_to_save, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Global sequential file saved: {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Error saving training session: {e}")
            return None

class TrainingDataRecorder:
    """训练数据记录器主类"""
    def __init__(self, base_path="traindata"):
        self.base_path = base_path
        self.active_sessions = {}
        
        # 启动时确保根目录存在
        if not os.path.exists(base_path):
            os.makedirs(base_path)
            logger.info(f"Initialized global storage at: {base_path}")

    def start_session(self, user_info):
        session_id = str(uuid.uuid4())
        session = TrainingSession(session_id, user_info, self.base_path)
        self.active_sessions[session_id] = session
        return session_id

    def add_data_to_session(self, session_id, data):
        if session_id in self.active_sessions:
            self.active_sessions[session_id].add_data(data)
            return True
        return False

    def end_session(self, session_id):
        if session_id in self.active_sessions:
            session = self.active_sessions[session_id]
            file_path = session.end_session()
            del self.active_sessions[session_id]
            return file_path
        return None

async def handle_websocket(websocket):
    """处理WebSocket连接逻辑"""
    recorder = TrainingDataRecorder()
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get('type')
                
                if msg_type == 'start_session':
                    user_info = data.get('user', {"uid": "unknown"})
                    session_id = recorder.start_session(user_info)
                    await websocket.send(json.dumps({"type": "session_started", "session_id": session_id}))
                    
                elif msg_type == 'training_data':
                    session_id = data.get('session_id')
                    t_data = data.get('data', [])
                    if recorder.add_data_to_session(session_id, t_data):
                        await websocket.send(json.dumps({"type": "data_received", "session_id": session_id}))
                    else:
                        await websocket.send(json.dumps({"type": "error", "message": "Session not found"}))
                        
                elif msg_type == 'end_session':
                    session_id = data.get('session_id')
                    file_path = recorder.end_session(session_id)
                    if file_path:
                        await websocket.send(json.dumps({
                            "type": "session_ended", 
                            "session_id": session_id,
                            "file": file_path
                        }))
                    else:
                        await websocket.send(json.dumps({"type": "error", "message": "Save failed"}))
                        
            except Exception as e:
                logger.error(f"Message process error: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        logger.info("WebSocket connection closed")

async def main():
    # 启动服务器在 8765 端口
    async with websockets.serve(handle_websocket, "localhost", 8765):
        logger.info("Global numbering server started on ws://localhost:8765")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())