"""
相机控制器
"""
import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *
import numpy as np

class Camera:
    """3D相机控制"""
    
    def __init__(self):
        # 相机在小区前方，正对楼栋
        self.position = np.array([0.0, 30.0, 80.0])
        self.target = np.array([0.0, 25.0, 0.0])
        self.up = np.array([0.0, 1.0, 0.0])
        
        self.yaw = 0.0
        self.pitch = -5.0
        
        self.move_speed = 30.0
        self.rotate_speed = 0.2
        self.zoom_speed = 5.0
        
        self.mouse_pressed = False
        self.last_mouse_pos = None
        
        self.initial_position = self.position.copy()
        self.initial_yaw = self.yaw
        self.initial_pitch = self.pitch
    
    def handle_event(self, event):
        """处理事件"""
        if event.type == MOUSEBUTTONDOWN:
            if event.button == 1:  # 左键
                self.mouse_pressed = True
                self.last_mouse_pos = pygame.mouse.get_pos()
            elif event.button == 4:  # 滚轮向上
                self.zoom(-self.zoom_speed)
            elif event.button == 5:  # 滚轮向下
                self.zoom(self.zoom_speed)
        
        elif event.type == MOUSEBUTTONUP:
            if event.button == 1:
                self.mouse_pressed = False
                self.last_mouse_pos = None
        
        elif event.type == MOUSEMOTION:
            if self.mouse_pressed and self.last_mouse_pos:
                dx = event.pos[0] - self.last_mouse_pos[0]
                dy = event.pos[1] - self.last_mouse_pos[1]
                
                self.yaw += dx * self.rotate_speed
                self.pitch -= dy * self.rotate_speed
                
                # 限制俯仰角
                self.pitch = np.clip(self.pitch, -89, 89)
                
                self.last_mouse_pos = event.pos
    
    def handle_keyboard(self, keys):
        """处理键盘输入"""
        # 计算前向和右向向量
        forward = self.target - self.position
        forward[1] = 0  # 忽略Y轴
        forward = forward / (np.linalg.norm(forward) + 1e-6)
        
        right = np.cross(forward, self.up)
        right = right / (np.linalg.norm(right) + 1e-6)
        
        move_speed = self.move_speed * 0.016  # 假设60fps
        
        if keys[K_w]:
            self.position += forward * move_speed
            self.target += forward * move_speed
        if keys[K_s]:
            self.position -= forward * move_speed
            self.target -= forward * move_speed
        if keys[K_a]:
            self.position -= right * move_speed
            self.target -= right * move_speed
        if keys[K_d]:
            self.position += right * move_speed
            self.target += right * move_speed
        if keys[K_q]:
            self.position[1] -= move_speed
            self.target[1] -= move_speed
        if keys[K_e]:
            self.position[1] += move_speed
            self.target[1] += move_speed
    
    def zoom(self, amount):
        """缩放"""
        direction = self.target - self.position
        direction = direction / (np.linalg.norm(direction) + 1e-6)
        self.position += direction * amount
    
    def update(self, dt):
        """更新相机"""
        # 根据yaw和pitch计算朝向
        yaw_rad = np.radians(self.yaw)
        pitch_rad = np.radians(self.pitch)
        
        # 计算前向向量
        forward = np.array([
            np.cos(pitch_rad) * np.sin(yaw_rad),
            np.sin(pitch_rad),
            -np.cos(pitch_rad) * np.cos(yaw_rad)
        ])
        
        # 更新目标点
        self.target = self.position + forward * 10
    
    def apply(self):
        """应用相机变换"""
        gluLookAt(
            self.position[0], self.position[1], self.position[2],
            self.target[0], self.target[1], self.target[2],
            self.up[0], self.up[1], self.up[2]
        )
    
    def reset(self):
        """重置相机"""
        self.position = self.initial_position.copy()
        self.yaw = self.initial_yaw
        self.pitch = self.initial_pitch
        self.update(0)
