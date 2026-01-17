import asyncio
import websockets
import json
import os
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
        
        # 创建用户文件夹
        self.user_folder = self.get_user_folder_path()
        
        # 生成文件名
        self.filename = self.generate_filename()

    def get_user_folder_path(self):
        """获取用户文件夹路径"""
        user_uid = self.user_info.get('uid')
        if not user_uid:
            raise ValueError("User UID is required")
        
        user_folder = os.path.join(self.base_path, user_uid)
        if not os.path.exists(user_folder):
            os.makedirs(user_folder)
            logger.info(f"Created user folder: {user_folder}")
        return user_folder

    def generate_filename(self):
        """生成文件名"""
        today = datetime.now().strftime("%Y%m%d")
        display_name = self.user_info.get('displayName', 'Unknown')
        
        # 获取今天的文件计数
        existing_files = [f for f in os.listdir(self.user_folder) 
                         if f.startswith(f"{display_name}_{today}")]
        
        # 计算下一个序号
        next_number = len(existing_files) + 1
        return f"{display_name}_{today}_{next_number:02d}.json"

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
            # 准备要保存的数据
            data_to_save = {
                "session_id": self.session_id,
                "user": self.user_info,
                "session_start_time": self.start_time.isoformat(),
                "session_end_time": end_time.isoformat(),
                "session_duration_ms": session_duration,
                "total_data_points": len(self.training_data),
                "training_data": self.training_data
            }
            
            # 写入文件
            file_path = os.path.join(self.user_folder, self.filename)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data_to_save, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Successfully saved training session to: {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Error saving training session: {e}")
            return None

class TrainingDataRecorder:
    """训练数据记录器主类"""
    def __init__(self, base_path="traindata"):
        self.base_path = base_path
        self.active_sessions = {}  # session_id -> TrainingSession
        
        # 确保基础目录存在
        if not os.path.exists(base_path):
            os.makedirs(base_path)
            logger.info(f"Created base directory: {base_path}")

    def start_session(self, user_info):
        """开始新的训练会话"""
        session_id = str(uuid.uuid4())
        session = TrainingSession(session_id, user_info, self.base_path)
        self.active_sessions[session_id] = session
        logger.info(f"Started new training session: {session_id} for user: {user_info.get('displayName')}")
        return session_id

    def add_data_to_session(self, session_id, data):
        """向指定会话添加数据"""
        if session_id in self.active_sessions:
            self.active_sessions[session_id].add_data(data)
            return True
        return False

    def end_session(self, session_id):
        """结束指定会话并保存数据"""
        if session_id in self.active_sessions:
            session = self.active_sessions[session_id]
            file_path = session.end_session()
            del self.active_sessions[session_id]
            return file_path
        return None

    def cleanup_inactive_sessions(self):
        """清理非活动会话"""
        inactive_sessions = [sid for sid, session in self.active_sessions.items() if not session.is_active]
        for session_id in inactive_sessions:
            del self.active_sessions[session_id]

async def handle_websocket(websocket):
    """处理WebSocket连接"""
    recorder = TrainingDataRecorder()
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                message_type = data.get('type')
                
                if message_type == 'connection':
                    # 连接确认
                    logger.info(f"Client connected: {data.get('status')}")
                    await websocket.send(json.dumps({
                        "type": "acknowledge",
                        "message": "Connection established"
                    }))
                    
                elif message_type == 'start_session':
                    # 开始新的训练会话
                    user_info = data.get('user')
                    if not user_info:
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": "User information required to start session"
                        }))
                        continue
                    
                    session_id = recorder.start_session(user_info)
                    await websocket.send(json.dumps({
                        "type": "session_started",
                        "session_id": session_id
                    }))
                    
                elif message_type == 'training_data':
                    # 训练数据
                    session_id = data.get('session_id')
                    training_data = data.get('data', [])
                    
                    if not session_id:
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": "Session ID required"
                        }))
                        continue
                    
                    success = recorder.add_data_to_session(session_id, training_data)
                    if success:
                        await websocket.send(json.dumps({
                            "type": "data_received",
                            "session_id": session_id,
                            "data_points": len(training_data)
                        }))
                    else:
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": "Invalid session ID"
                        }))
                        
                elif message_type == 'end_session':
                    # 结束训练会话
                    session_id = data.get('session_id')
                    if not session_id:
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": "Session ID required"
                        }))
                        continue
                    
                    file_path = recorder.end_session(session_id)
                    if file_path:
                        await websocket.send(json.dumps({
                            "type": "session_ended",
                            "session_id": session_id,
                            "filename": file_path
                        }))
                    else:
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": "Failed to end session"
                        }))
                        
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}")
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
                
    except websockets.exceptions.ConnectionClosed:
        logger.info("WebSocket connection closed")
        # 清理所有活动会话
        recorder.cleanup_inactive_sessions()

async def main():
    """启动WebSocket服务器"""
    # 使用新的API，不需要path参数
    async with websockets.serve(handle_websocket, "localhost", 8765):
        logger.info("Training data recorder server started on ws://localhost:8765")
        await asyncio.Future()  # 保持服务器运行

if __name__ == "__main__":
    # 安装依赖检查
    try:
        import websockets
    except ImportError:
        print("请安装websockets库: pip install websockets")
        exit(1)
    
    asyncio.run(main())