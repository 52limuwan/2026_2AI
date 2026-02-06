"""
主程序入口
"""

import sys
import signal
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt
from ui.main_window import MainWindow


def signal_handler(sig, frame):
    """处理 Ctrl+C 信号"""
    print("\n[退出] 正在关闭程序...")
    QApplication.quit()


def main():
    """主函数"""
    # 注册 Ctrl+C 信号处理
    signal.signal(signal.SIGINT, signal_handler)
    
    # 创建应用
    app = QApplication(sys.argv)
    
    # 设置应用信息
    app.setApplicationName("YDLIDAR T-mini Plus Mapper")
    app.setOrganizationName("LiDAR SLAM Lab")
    app.setApplicationVersion("1.3.0-MINIMAL-UI")
    
    # 设置高 DPI 支持（PySide6 中这些已经默认启用，不需要手动设置）
    # app.setAttribute(Qt.AA_EnableHighDpiScaling)  # 已弃用
    # app.setAttribute(Qt.AA_UseHighDpiPixmaps)     # 已弃用
    
    # 创建主窗口
    window = MainWindow()
    window.show()
    
    # 创建定时器让 Python 能处理信号（每100ms检查一次）
    from PySide6.QtCore import QTimer
    timer = QTimer()
    timer.timeout.connect(lambda: None)  # 空操作，只是让事件循环运行
    timer.start(100)
    
    # 运行应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
