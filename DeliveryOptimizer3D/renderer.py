"""
3D渲染器
"""
from OpenGL.GL import *
from OpenGL.GLU import *
import numpy as np
import math

class Renderer:
    """OpenGL渲染器"""
    
    def __init__(self):
        self.building_positions = [(-20, 0), (0, 0), (20, 0)]
        self.floor_height = 3.0
        self.num_floors = 18
        
        # 粒子系统
        self.particles = self._init_particles(2000)
    
    def _init_particles(self, count):
        """初始化粒子"""
        particles = []
        for _ in range(count):
            x = np.random.uniform(-50, 50)
            y = np.random.uniform(0, 60)
            z = np.random.uniform(-50, 50)
            particles.append([x, y, z])
        return np.array(particles)
    
    def draw_ground(self):
        """绘制地面"""
        glDisable(GL_LIGHTING)
        glColor4f(0.2, 0.2, 0.3, 1.0)
        glBegin(GL_QUADS)
        glVertex3f(-100, -0.1, -100)
        glVertex3f(100, -0.1, -100)
        glVertex3f(100, -0.1, 100)
        glVertex3f(-100, -0.1, 100)
        glEnd()
    
    def draw_grid(self):
        """绘制网格"""
        glDisable(GL_LIGHTING)
        glColor4f(0, 1, 1, 0.5)
        glLineWidth(1)
        glBegin(GL_LINES)
        for i in range(-50, 51, 5):
            glVertex3f(i, 0, -50)
            glVertex3f(i, 0, 50)
            glVertex3f(-50, 0, i)
            glVertex3f(50, 0, i)
        glEnd()
    
    def draw_buildings(self):
        """绘制楼栋"""
        glEnable(GL_LIGHTING)
        for i, (x, z) in enumerate(self.building_positions):
            self._draw_building(x, z, i + 1)
    
    def _draw_building(self, x, z, number):
        """绘制单个楼栋"""
        height = self.num_floors * self.floor_height
        
        # 主体 - 更亮的颜色
        glColor4f(0.3, 0.3, 0.5, 1.0)
        glPushMatrix()
        glTranslatef(x, height / 2, z)
        self._draw_cube(10, height, 10)
        glPopMatrix()
        
        # 楼层标记 - 更明显
        glDisable(GL_LIGHTING)
        for floor in range(1, self.num_floors + 1):
            y = floor * self.floor_height
            glColor4f(0, 1, 1, 0.3)
            glLineWidth(2)
            glBegin(GL_LINE_LOOP)
            glVertex3f(x - 5, y, z - 5)
            glVertex3f(x + 5, y, z - 5)
            glVertex3f(x + 5, y, z + 5)
            glVertex3f(x - 5, y, z + 5)
            glEnd()
        glEnable(GL_LIGHTING)
    
    def draw_point_cloud(self, time):
        """绘制点云"""
        glDisable(GL_LIGHTING)
        glPointSize(2)
        glBegin(GL_POINTS)
        
        for i, (x, y, z) in enumerate(self.particles):
            # 动画
            offset = math.sin(time + i * 0.1) * 0.5
            y_animated = y + offset
            
            # 颜色渐变
            t = (math.sin(time + i * 0.1) + 1) / 2
            r = 0
            g = 0.5 + t * 0.5
            b = 0.5 + t * 0.5
            
            glColor4f(r, g, b, 0.6)
            glVertex3f(x, y_animated, z)
        
        glEnd()
        glPointSize(1)
    
    def draw_radar(self, time):
        """绘制雷达"""
        glDisable(GL_LIGHTING)
        
        # 雷达圆盘
        glColor4f(0, 1, 1, 0.1)
        glPushMatrix()
        glTranslatef(0, 0.1, 0)
        glRotatef(90, 1, 0, 0)
        self._draw_circle(50, 50)
        glPopMatrix()
        
        # 扫描线
        angle = (time * 60) % 360
        glColor4f(0, 1, 1, 0.8)
        glLineWidth(3)
        glBegin(GL_LINES)
        glVertex3f(0, 0.2, 0)
        rad = math.radians(angle)
        glVertex3f(math.sin(rad) * 50, 0.2, math.cos(rad) * 50)
        glEnd()
        glLineWidth(1)
    
    def draw_orders(self, orders, optimized=False):
        """绘制订单标记"""
        glDisable(GL_LIGHTING)
        color = (0, 1, 0) if optimized else (1, 0, 0)
        
        for order in orders:
            x, z = self.building_positions[order.building - 1]
            x += -3 if order.unit == 1 else 3
            y = order.floor * self.floor_height
            
            # 发光球体
            glColor4f(*color, 1.0)
            glPushMatrix()
            glTranslatef(x, y, z)
            self._draw_sphere(0.8, 16, 16)
            glPopMatrix()
            
            # 外层光晕
            glColor4f(*color, 0.3)
            glPushMatrix()
            glTranslatef(x, y, z)
            self._draw_sphere(1.2, 16, 16)
            glPopMatrix()
    
    def draw_path(self, orders):
        """绘制路径"""
        if len(orders) < 2:
            return
        
        glDisable(GL_LIGHTING)
        glColor4f(0, 1, 1, 0.6)
        glLineWidth(2)
        glBegin(GL_LINE_STRIP)
        
        for order in orders:
            x, z = self.building_positions[order.building - 1]
            x += -3 if order.unit == 1 else 3
            y = order.floor * self.floor_height
            glVertex3f(x, y, z)
        
        glEnd()
        glLineWidth(1)
    
    def draw_delivery_agent(self, orders, progress):
        """绘制配送员"""
        if not orders or progress >= len(orders):
            return
        
        idx = int(progress)
        t = progress - idx
        
        # 当前和下一个订单
        current = orders[idx]
        next_order = orders[min(idx + 1, len(orders) - 1)]
        
        # 插值位置
        x1, z1 = self.building_positions[current.building - 1]
        x1 += -3 if current.unit == 1 else 3
        y1 = current.floor * self.floor_height
        
        x2, z2 = self.building_positions[next_order.building - 1]
        x2 += -3 if next_order.unit == 1 else 3
        y2 = next_order.floor * self.floor_height
        
        x = x1 + (x2 - x1) * t
        y = y1 + (y2 - y1) * t
        z = z1 + (z2 - z1) * t
        
        # 绘制配送员
        glDisable(GL_LIGHTING)
        glColor4f(1, 1, 0, 1)
        glPushMatrix()
        glTranslatef(x, y, z)
        self._draw_cone(0.5, 1.5, 10)
        glPopMatrix()
    
    def _draw_cube(self, w, h, d):
        """绘制立方体"""
        glBegin(GL_QUADS)
        # 前后左右上下6个面
        vertices = [
            [w/2, h/2, d/2], [w/2, -h/2, d/2], [-w/2, -h/2, d/2], [-w/2, h/2, d/2],
            [w/2, h/2, -d/2], [w/2, -h/2, -d/2], [-w/2, -h/2, -d/2], [-w/2, h/2, -d/2]
        ]
        faces = [[0,1,2,3], [4,5,6,7], [0,1,5,4], [2,3,7,6], [0,3,7,4], [1,2,6,5]]
        for face in faces:
            for v in face:
                glVertex3fv(vertices[v])
        glEnd()
    
    def _draw_plane(self, w, d):
        """绘制平面"""
        glBegin(GL_QUADS)
        glVertex3f(-w/2, 0, -d/2)
        glVertex3f(w/2, 0, -d/2)
        glVertex3f(w/2, 0, d/2)
        glVertex3f(-w/2, 0, d/2)
        glEnd()
    
    def _draw_sphere(self, radius, slices, stacks):
        """绘制球体"""
        quad = gluNewQuadric()
        gluSphere(quad, radius, slices, stacks)
    
    def _draw_cone(self, base, height, slices):
        """绘制圆锥"""
        quad = gluNewQuadric()
        gluCylinder(quad, base, 0, height, slices, 1)
    
    def _draw_circle(self, radius, segments):
        """绘制圆"""
        glBegin(GL_LINE_LOOP)
        for i in range(segments):
            angle = 2 * math.pi * i / segments
            glVertex3f(math.cos(angle) * radius, 0, math.sin(angle) * radius)
        glEnd()
