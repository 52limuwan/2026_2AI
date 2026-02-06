"""
主窗口 - YDLIDAR T-mini Plus 上位机

功能:
- 串口连接管理
- 实时点云显示
- SLAM 建图
- 参数配置
- 地图保存
"""

import sys
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QComboBox, QLabel, QGroupBox,
    QCheckBox, QSpinBox, QDoubleSpinBox, QTabWidget,
    QFileDialog, QMessageBox, QStatusBar
)
from PySide6.QtCore import QTimer, Qt, Signal, Slot
from PySide6.QtGui import QFont
import numpy as np

# 导入核心模块
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.serial_transport import SerialTransport
from core.protocol_parser import ProtocolParser
from core.scan_assembler import ScanAssembler
from core.filters import ScanFilter
from slam.pose2d import Pose2D
from slam.scan_matching_icp import ICPScanMatcher  # 使用 ICP 替代 CSM
from slam.grid_map import OccupancyGridMap
from ui.lidar_view import LidarView
# from ui.map_view import MapView  # 已隐藏SLAM地图


class MainWindow(QMainWindow):
    """主窗口"""
    
    def __init__(self):
        super().__init__()
        
        # 核心组件
        self.serial = SerialTransport(auto_reconnect=True)
        self.parser = ProtocolParser()
        self.assembler = ScanAssembler()
        self.filter = ScanFilter()
        
        # SLAM 组件
        self.slam_enabled = False
        self.current_pose = Pose2D()
        self.scan_matcher = ICPScanMatcher(
            max_iterations=20,
            tolerance=1e-4,
            max_correspondence_dist=0.3,  # 30cm 对应距离
            min_points=20
        )
        # 28m雷达，地图60x60m，原点在中心，分辨率0.1m（提高性能）
        self.grid_map = OccupancyGridMap(
            resolution=0.1,  # 0.1m分辨率，提高性能
            width=600,       # 60m / 0.1m = 600格
            height=600,
            origin_x=-30.0,  # 原点在地图中心
            origin_y=-30.0
        )
        self.trajectory = []  # 轨迹记录
        self.map_points = np.array([]).reshape(0, 2)  # 地图点云（用于ICP匹配）
        
        # 状态
        self.is_scanning = False
        self.scan_count = 0
        self.last_scan = None
        
        # 初始化 UI
        self.init_ui()
        
        # 定时器（数据处理 + UI 刷新）
        self.data_timer = QTimer()
        self.data_timer.timeout.connect(self.process_data)
        self.data_timer.start(10)  # 100Hz 数据处理（提高频率）
        
        self.ui_timer = QTimer()
        self.ui_timer.timeout.connect(self.update_ui)
        self.ui_timer.start(33)  # 30Hz UI 刷新（提高频率）
        
        # 串口回调
        self.serial.on_disconnect_callback = self.on_serial_disconnect
        
        # 自动连接和扫描
        QTimer.singleShot(500, self.auto_connect_and_scan)  # 延迟500ms后自动连接
    
    def auto_connect_and_scan(self):
        """自动连接并开始扫描"""
        # 自动查找COM口
        self.refresh_com_ports()
        
        if self.com_combo.count() > 0:
            # 自动连接第一个COM口
            com_port = self.com_combo.currentText()
            
            if self.serial.connect(com_port):
                self.connect_btn.setText("断开")
                self.scan_btn.setEnabled(True)
                # self.statusBar.showMessage(f"已连接: {com_port}")
                
                # 自动开始扫描
                QTimer.singleShot(500, self.auto_start_scan)
            # else:
            #     self.statusBar.showMessage("自动连接失败，请手动连接")
        # else:
        #     self.statusBar.showMessage("未找到COM口，请检查连接")
    
    def auto_start_scan(self):
        """自动开始扫描"""
        if self.serial.is_connected and not self.is_scanning:
            self.serial.start_scan()
            self.is_scanning = True
            self.scan_btn.setText("停止扫描")
            # self.statusBar.showMessage("正在扫描...")
    
    def toggle_control_panel(self):
        """切换控制面板显示/隐藏"""
        self.control_panel.setVisible(not self.control_panel.isVisible())
        # if self.control_panel.isVisible():
        #     self.statusBar.showMessage("控制面板已显示 (按 Ctrl+P 隐藏)")
        # else:
        #     self.statusBar.showMessage("控制面板已隐藏 (按 Ctrl+P 显示)")
    
    def clear_and_rescan(self):
        """清空点云并重新扫描 (Ctrl+O)"""
        # 清空累积点云
        self.lidar_view.clear_accumulated()
        
        # 重置扫描计数
        self.scan_count = 0
        
        # 如果正在扫描，先停止再重新开始
        if self.is_scanning:
            self.serial.stop_scan()
            # 短暂延迟后重新开始
            QTimer.singleShot(100, lambda: self.serial.start_scan())
            # self.statusBar.showMessage("已清空点云并重新扫描")
        # else:
        #     self.statusBar.showMessage("已清空点云")
    
    def init_ui(self):
        """初始化 UI"""
        self.setWindowTitle("test1")
        self.setGeometry(100, 100, 1200, 900)
        
        # 中心部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)  # 无边距
        
        # 左侧：控制面板（默认隐藏）
        self.control_panel = self.create_control_panel()
        self.control_panel.setVisible(False)  # 默认隐藏
        main_layout.addWidget(self.control_panel, stretch=1)
        
        # 右侧：只显示实时点云
        self.lidar_view = LidarView()
        main_layout.addWidget(self.lidar_view, stretch=4)
        
        # 状态栏（隐藏）
        # self.statusBar = QStatusBar()
        # self.setStatusBar(self.statusBar)
        # self.statusBar.showMessage("Ctrl+P: 控制面板 | Ctrl+O: 清空 | ESC/Ctrl+C: 退出")
        
        # 快捷键：Ctrl+P 切换控制面板
        from PySide6.QtGui import QShortcut, QKeySequence
        self.toggle_panel_shortcut = QShortcut(QKeySequence("Ctrl+P"), self)
        self.toggle_panel_shortcut.activated.connect(self.toggle_control_panel)
        
        # 快捷键：Ctrl+O 清空点云并重新扫描
        self.clear_rescan_shortcut = QShortcut(QKeySequence("Ctrl+O"), self)
        self.clear_rescan_shortcut.activated.connect(self.clear_and_rescan)
        
        # 快捷键：Ctrl+C 退出程序
        self.exit_shortcut_ctrl_c = QShortcut(QKeySequence("Ctrl+C"), self)
        self.exit_shortcut_ctrl_c.activated.connect(self.close)
        
        # 快捷键：ESC 退出程序
        self.exit_shortcut_esc = QShortcut(QKeySequence("Esc"), self)
        self.exit_shortcut_esc.activated.connect(self.close)
    
    def create_control_panel(self) -> QWidget:
        """创建控制面板"""
        panel = QWidget()
        layout = QVBoxLayout(panel)
        
        # 串口设置
        serial_group = QGroupBox("串口设置")
        serial_layout = QVBoxLayout()
        
        # COM 口选择
        com_layout = QHBoxLayout()
        com_layout.addWidget(QLabel("COM 口:"))
        self.com_combo = QComboBox()
        self.refresh_com_ports()
        com_layout.addWidget(self.com_combo)
        self.refresh_btn = QPushButton("刷新")
        self.refresh_btn.clicked.connect(self.refresh_com_ports)
        com_layout.addWidget(self.refresh_btn)
        serial_layout.addLayout(com_layout)
        
        # 波特率（固定）
        baud_layout = QHBoxLayout()
        baud_layout.addWidget(QLabel("波特率:"))
        baud_label = QLabel("230400")
        baud_label.setStyleSheet("font-weight: bold;")
        baud_layout.addWidget(baud_label)
        serial_layout.addLayout(baud_layout)
        
        # 连接按钮
        self.connect_btn = QPushButton("连接")
        self.connect_btn.clicked.connect(self.toggle_connection)
        serial_layout.addWidget(self.connect_btn)
        
        # 扫描按钮
        self.scan_btn = QPushButton("开始扫描")
        self.scan_btn.setEnabled(False)
        self.scan_btn.clicked.connect(self.toggle_scan)
        serial_layout.addWidget(self.scan_btn)
        
        serial_group.setLayout(serial_layout)
        layout.addWidget(serial_group)
        
        # SLAM 设置
        slam_group = QGroupBox("SLAM 设置")
        slam_layout = QVBoxLayout()
        
        self.slam_btn = QPushButton("启动建图")
        self.slam_btn.setEnabled(False)
        self.slam_btn.clicked.connect(self.toggle_slam)
        slam_layout.addWidget(self.slam_btn)
        
        # 地图分辨率
        res_layout = QHBoxLayout()
        res_layout.addWidget(QLabel("分辨率(m):"))
        self.resolution_spin = QDoubleSpinBox()
        self.resolution_spin.setRange(0.05, 0.5)  # 调整范围
        self.resolution_spin.setValue(0.1)  # 默认0.1m，提高性能
        self.resolution_spin.setSingleStep(0.05)  # 步长0.05
        res_layout.addWidget(self.resolution_spin)
        slam_layout.addLayout(res_layout)
        
        # 清空地图
        self.clear_map_btn = QPushButton("清空地图")
        self.clear_map_btn.clicked.connect(self.clear_map)
        slam_layout.addWidget(self.clear_map_btn)
        
        # 保存地图
        self.save_map_btn = QPushButton("保存地图")
        self.save_map_btn.clicked.connect(self.save_map)
        slam_layout.addWidget(self.save_map_btn)
        
        slam_group.setLayout(slam_layout)
        layout.addWidget(slam_group)
        
        # 过滤设置
        filter_group = QGroupBox("过滤设置")
        filter_layout = QVBoxLayout()
        
        self.filter_flag_check = QCheckBox("过滤 Flag 标记点")
        self.filter_flag_check.setChecked(True)
        filter_layout.addWidget(self.filter_flag_check)
        
        self.filter_zero_check = QCheckBox("过滤零距离点")
        self.filter_zero_check.setChecked(True)
        filter_layout.addWidget(self.filter_zero_check)
        
        # 距离范围（自动设置为 0.40-1.00）
        dist_layout = QHBoxLayout()
        dist_layout.addWidget(QLabel("距离范围(m):"))
        self.min_dist_spin = QDoubleSpinBox()
        self.min_dist_spin.setRange(0.0, 12.0)
        self.min_dist_spin.setValue(0.40)  # 设置为0.40
        self.min_dist_spin.setSingleStep(0.1)
        dist_layout.addWidget(self.min_dist_spin)
        dist_layout.addWidget(QLabel("-"))
        self.max_dist_spin = QDoubleSpinBox()
        self.max_dist_spin.setRange(0.0, 12.0)
        self.max_dist_spin.setValue(1.00)  # 设置为1.00
        self.max_dist_spin.setSingleStep(0.1)
        dist_layout.addWidget(self.max_dist_spin)
        filter_layout.addLayout(dist_layout)
        
        # 点云累积控制
        self.accumulate_btn = QPushButton("累积模式: 开")
        self.accumulate_btn.setCheckable(True)
        self.accumulate_btn.setChecked(True)
        self.accumulate_btn.clicked.connect(self.toggle_accumulate)
        filter_layout.addWidget(self.accumulate_btn)
        
        self.clear_points_btn = QPushButton("清空点云")
        self.clear_points_btn.clicked.connect(self.clear_accumulated_points)
        filter_layout.addWidget(self.clear_points_btn)
        
        # 角度翻转（如果扫描方向不对）
        self.flip_angle_check = QCheckBox("翻转角度（镜像）")
        self.flip_angle_check.setChecked(False)
        filter_layout.addWidget(self.flip_angle_check)
        
        filter_group.setLayout(filter_layout)
        layout.addWidget(filter_group)
        
        # 统计信息
        stats_group = QGroupBox("统计信息")
        stats_layout = QVBoxLayout()
        
        self.scan_count_label = QLabel("扫描圈数: 0")
        stats_layout.addWidget(self.scan_count_label)
        
        self.point_count_label = QLabel("点数: 0")
        stats_layout.addWidget(self.point_count_label)
        
        self.freq_label = QLabel("频率: 0.0 Hz")
        stats_layout.addWidget(self.freq_label)
        
        self.pose_label = QLabel("位姿: (0.0, 0.0, 0.0°)")
        stats_layout.addWidget(self.pose_label)
        
        stats_group.setLayout(stats_layout)
        layout.addWidget(stats_group)
        
        layout.addStretch()
        
        return panel
    
    # ========== 串口操作 ==========
    
    def refresh_com_ports(self):
        """刷新 COM 口列表"""
        self.com_combo.clear()
        ports = SerialTransport.list_ports()
        self.com_combo.addItems(ports)
    
    def toggle_connection(self):
        """切换连接状态"""
        if not self.serial.is_connected:
            # 连接
            port = self.com_combo.currentText()
            if not port:
                QMessageBox.warning(self, "错误", "请选择 COM 口")
                return
            
            if self.serial.connect(port):
                self.connect_btn.setText("断开")
                self.scan_btn.setEnabled(True)
                # self.statusBar.showMessage(f"已连接到 {port}")
            else:
                QMessageBox.critical(self, "错误", f"无法连接到 {port}")
        else:
            # 断开
            if self.is_scanning:
                self.toggle_scan()
            self.serial.disconnect()
            self.connect_btn.setText("连接")
            self.scan_btn.setEnabled(False)
            # self.statusBar.showMessage("已断开连接")
    
    def on_serial_disconnect(self):
        """串口断开回调"""
        # self.statusBar.showMessage("串口断开，尝试重连...")
        pass
    
    def toggle_scan(self):
        """切换扫描状态"""
        if not self.is_scanning:
            # 开始扫描
            if self.serial.start_scan():
                self.is_scanning = True
                self.scan_btn.setText("停止扫描")
                self.slam_btn.setEnabled(True)
                # self.statusBar.showMessage("扫描中...")
        else:
            # 停止扫描
            self.serial.stop_scan()
            self.is_scanning = False
            self.scan_btn.setText("开始扫描")
            if self.slam_enabled:
                self.toggle_slam()
            # self.statusBar.showMessage("已停止扫描")
    
    # ========== SLAM 操作 ==========
    
    def toggle_slam(self):
        """切换 SLAM 状态"""
        if not self.slam_enabled:
            # 启动 SLAM
            self.slam_enabled = True
            self.slam_btn.setText("停止建图")
            self.current_pose = Pose2D()
            self.trajectory = [self.current_pose]
            self.map_points = np.array([]).reshape(0, 2)
            
            # 重新创建地图
            resolution = self.resolution_spin.value()
            self.grid_map = OccupancyGridMap(
                resolution=resolution,
                width=int(60.0 / resolution),  # 60m地图
                height=int(60.0 / resolution),
                origin_x=-30.0,  # 原点在中心
                origin_y=-30.0
            )
            
            # self.statusBar.showMessage("SLAM 建图中...")
        else:
            # 停止 SLAM
            self.slam_enabled = False
            self.slam_btn.setText("启动建图")
            # self.statusBar.showMessage("已停止建图")
    
    def clear_map(self):
        """清空地图"""
        self.grid_map.clear()
        self.current_pose = Pose2D()
        self.trajectory = [self.current_pose]
        self.map_points = np.array([]).reshape(0, 2)
        # self.statusBar.showMessage("地图已清空")
    
    def save_map(self):
        """保存地图"""
        filename, _ = QFileDialog.getSaveFileName(
            self,
            "保存地图",
            "",
            "PNG 图像 (*.png)"
        )
        
        if filename:
            # 移除扩展名
            if filename.endswith('.png'):
                filename = filename[:-4]
            
            # 保存
            metadata = {
                'scan_count': self.scan_count,
                'trajectory_length': len(self.trajectory)
            }
            self.grid_map.save_map(filename, metadata)
            
            QMessageBox.information(self, "成功", f"地图已保存到:\n{filename}.png\n{filename}.yaml")
    
    # ========== 点云控制 ==========
    
    def toggle_accumulate(self):
        """切换累积模式"""
        self.lidar_view.toggle_accumulate()
        if self.lidar_view.accumulate_mode:
            self.accumulate_btn.setText("累积模式: 开")
        else:
            self.accumulate_btn.setText("累积模式: 关")
    
    def clear_accumulated_points(self):
        """清空累积点云"""
        self.lidar_view.clear_accumulated()
        # self.statusBar.showMessage("点云已清空")
    
    # ========== 数据处理 ==========
    
    def process_data(self):
        """处理串口数据（高频）"""
        if not self.serial.is_connected:
            return
        
        # 读取串口数据
        data = self.serial.read_data(timeout=0.001)
        if not data:
            return
        
        # 解析协议
        packages = self.parser.feed_data(data)
        
        for package in packages:
            # 拼帧
            full_scan = self.assembler.feed_package(package)
            
            if full_scan:
                # 过滤
                self.filter.update_params(
                    filter_flag=self.filter_flag_check.isChecked(),
                    filter_zero_distance=self.filter_zero_check.isChecked(),
                    min_distance=self.min_dist_spin.value(),
                    max_distance=self.max_dist_spin.value()
                )
                filtered_scan = self.filter.filter_scan(full_scan)
                
                # 保存
                self.last_scan = filtered_scan
                self.scan_count += 1
                
                # 输出点云日志
                print(f"[扫描 #{self.scan_count:04d}] 点数: {filtered_scan.point_count:3d} | 角度: {filtered_scan.start_angle:6.1f}° - {filtered_scan.end_angle:6.1f}°  范围: {self.min_dist_spin.value():.2f}-{self.max_dist_spin.value():.2f}m")
                
                # SLAM 处理（重新启用，使用 ICP）
                if self.slam_enabled and len(filtered_scan.points) > 20:
                    self.process_slam(filtered_scan)
    
    def process_slam(self, scan):
        """SLAM 处理（简化版 - 先不做匹配，只建图）"""
        # 转换为 numpy
        angles, ranges, intensities, flags = scan.to_numpy()
        
        # 转换为笛卡尔坐标（局部坐标系）
        scan_points = np.column_stack([
            ranges * np.cos(angles),
            ranges * np.sin(angles)
        ])
        
        # 简化：暂时不做 ICP 匹配，直接累积地图
        # 假设机器人不动（位姿为原点）
        # 这样至少能看到地图
        
        # 更新地图
        global_points = self.current_pose.transform_point(scan_points)
        self.grid_map.update_scan(
            self.current_pose.x,
            self.current_pose.y,
            global_points
        )
        
        # 记录轨迹
        self.trajectory.append(Pose2D(
            x=self.current_pose.x,
            y=self.current_pose.y,
            theta=self.current_pose.theta
        ))
    
    def _extract_map_points(self) -> np.ndarray:
        """从栅格地图提取占据点云（用于 ICP 匹配）"""
        # 将 log-odds 转换为概率
        prob_map = 1.0 / (1.0 + np.exp(-self.grid_map.data))
        
        # 获取占据格子的索引 (概率 > 0.7)
        occupied_mask = prob_map > 0.7
        occupied_indices = np.argwhere(occupied_mask)
        
        if len(occupied_indices) == 0:
            return np.array([]).reshape(0, 2)
        
        # 转换为世界坐标
        points = []
        for idx in occupied_indices:
            x = self.grid_map.origin_x + idx[1] * self.grid_map.resolution
            y = self.grid_map.origin_y + idx[0] * self.grid_map.resolution
            points.append([x, y])
        
        points = np.array(points)
        
        # 降采样（最多保留5000个点，提高性能）
        if len(points) > 5000:
            indices = np.random.choice(len(points), 5000, replace=False)
            points = points[indices]
        
        return points
    
    # ========== UI 更新 ==========
    
    def update_ui(self):
        """更新 UI（低频）"""
        # 更新统计信息
        self.scan_count_label.setText(f"扫描圈数: {self.scan_count}")
        
        if self.last_scan:
            self.point_count_label.setText(f"点数: {self.last_scan.point_count}")
            self.freq_label.setText(f"频率: {self.last_scan.scan_freq:.1f} Hz")
        
        if self.slam_enabled:
            self.pose_label.setText(
                f"位姿: ({self.current_pose.x:.2f}, {self.current_pose.y:.2f}, "
                f"{np.rad2deg(self.current_pose.theta):.1f}°)"
            )
        
        # 更新视图
        if self.last_scan:
            # 实时点云（传递翻转选项）
            flip_angle = self.flip_angle_check.isChecked()
            self.lidar_view.update_scan(self.last_scan, flip_angle)
            
            # SLAM 地图已隐藏
            # if self.slam_enabled:
            #     self.map_view.update_map(
            #         self.grid_map,
            #         self.current_pose,
            #         self.trajectory
            #     )
    
    def closeEvent(self, event):
        """关闭事件"""
        if self.is_scanning:
            self.toggle_scan()
        if self.serial.is_connected:
            self.serial.disconnect()
        event.accept()
