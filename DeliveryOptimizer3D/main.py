"""
小区送餐路径优化系统 - 3D可视化
使用 Pygame + PyOpenGL 实现
"""
import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *
import numpy as np
import random
from optimizer import DeliveryOptimizer, Order
from renderer import Renderer
from camera import Camera

class DeliveryVisualization:
    def __init__(self):
        pygame.init()
        self.width = 1400
        self.height = 900
        self.screen = pygame.display.set_mode((self.width, self.height), DOUBLEBUF | OPENGL | RESIZABLE)
        pygame.display.set_caption("小区送餐路径优化系统 - 3D可视化")
        
        # 初始化OpenGL
        glEnable(GL_DEPTH_TEST)
        glEnable(GL_BLEND)
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
        glEnable(GL_LINE_SMOOTH)
        glHint(GL_LINE_SMOOTH_HINT, GL_NICEST)
        
        # 设置透视
        glMatrixMode(GL_PROJECTION)
        gluPerspective(60, (self.width / self.height), 0.1, 500.0)
        glMatrixMode(GL_MODELVIEW)
        
        # 初始化组件
        self.camera = Camera()
        self.renderer = Renderer()
        self.optimizer = DeliveryOptimizer()
        
        # 数据
        self.orders = []
        self.optimized_orders = []
        self.optimization_result = None
        self.animation_progress = 0
        self.is_animating = False
        
        # 时间
        self.clock = pygame.time.Clock()
        self.time = 0
        
        # 字体 - 使用Windows系统字体路径
        import os
        font_paths = [
            r"C:\Windows\Fonts\msyh.ttc",      # 微软雅黑
            r"C:\Windows\Fonts\simhei.ttf",    # 黑体
            r"C:\Windows\Fonts\simsun.ttc",    # 宋体
        ]
        
        font_loaded = False
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    self.font = pygame.font.Font(font_path, 36)
                    self.small_font = pygame.font.Font(font_path, 24)
                    font_loaded = True
                    print(f"[字体] 加载成功: {font_path}")
                    break
                except Exception as e:
                    print(f"[字体] 加载失败: {font_path} - {e}")
                    continue
        
        if not font_loaded:
            print("[字体] 警告: 无法加载中文字体，使用默认字体")
            self.font = pygame.font.Font(None, 36)
            self.small_font = pygame.font.Font(None, 24)
        
        print("=" * 60)
        print("🚁 小区送餐路径优化系统 3D")
        print("=" * 60)
        print("控制说明:")
        print("  空格键    - 生成订单")
        print("  回车键    - 优化路径")
        print("  P键       - 播放/暂停动画")
        print("  R键       - 重置场景")
        print("  WASD      - 移动相机")
        print("  鼠标拖拽  - 旋转视角")
        print("  滚轮      - 缩放")
        print("  ESC       - 退出")
        print("=" * 60)
        
    def generate_orders(self):
        """生成随机订单"""
        count = 15
        self.orders = []
        for i in range(count):
            order = Order(
                id=i + 1,
                building=random.randint(1, 3),
                floor=random.randint(1, 18),
                unit=random.randint(1, 2),
                room=f"{random.randint(1, 4):02d}"
            )
            self.orders.append(order)
        
        print(f"\n✅ 生成了 {len(self.orders)} 个订单")
        self.optimized_orders = []
        self.optimization_result = None
        self.animation_progress = 0
        
    def optimize_route(self):
        """优化配送路径"""
        if not self.orders:
            print("⚠️  请先生成订单！")
            return
        
        self.optimization_result = self.optimizer.optimize(self.orders)
        self.optimized_orders = self.optimization_result['optimized']['route']
        
        print(f"\n⚡ 优化完成！")
        print(f"  原始时间: {self.optimization_result['original']['time']:.1f} 秒")
        print(f"  优化时间: {self.optimization_result['optimized']['time']:.1f} 秒")
        print(f"  效率提升: {self.optimization_result['improvement']:.1f}%")
        print(f"  节省时间: {self.optimization_result['original']['time'] - self.optimization_result['optimized']['time']:.1f} 秒")
        
    def handle_events(self):
        """处理事件"""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            
            if event.type == KEYDOWN:
                if event.key == K_ESCAPE:
                    return False
                elif event.key == K_SPACE:
                    self.generate_orders()
                elif event.key == K_RETURN:
                    self.optimize_route()
                elif event.key == K_p:
                    self.is_animating = not self.is_animating
                    print(f"{'▶️  播放' if self.is_animating else '⏸️  暂停'} 动画")
                elif event.key == K_r:
                    self.reset()
            
            # 相机控制
            self.camera.handle_event(event)
        
        # 键盘移动
        keys = pygame.key.get_pressed()
        self.camera.handle_keyboard(keys)
        
        return True
    
    def update(self, dt):
        """更新逻辑"""
        self.time += dt
        self.camera.update(dt)
        
        # 动画更新
        if self.is_animating and self.optimized_orders:
            self.animation_progress += dt * 0.5
            if self.animation_progress >= len(self.optimized_orders):
                self.animation_progress = 0
    
    def render(self):
        """渲染场景"""
        # 设置背景色为深蓝色
        glClearColor(0.05, 0.05, 0.15, 1.0)
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        glLoadIdentity()
        
        # 应用相机变换
        self.camera.apply()
        
        # 设置光照
        glEnable(GL_LIGHTING)
        glEnable(GL_LIGHT0)
        glLightfv(GL_LIGHT0, GL_POSITION, [50, 100, 50, 1])
        glLightfv(GL_LIGHT0, GL_AMBIENT, [0.5, 0.5, 0.5, 1])
        glLightfv(GL_LIGHT0, GL_DIFFUSE, [1.0, 1.0, 1.0, 1])
        
        # 渲染地面
        self.renderer.draw_ground()
        
        # 渲染网格
        self.renderer.draw_grid()
        
        # 渲染楼栋
        self.renderer.draw_buildings()
        
        # 渲染点云
        self.renderer.draw_point_cloud(self.time)
        
        # 渲染雷达
        self.renderer.draw_radar(self.time)
        
        # 渲染订单
        if self.optimized_orders:
            self.renderer.draw_orders(self.optimized_orders, optimized=True)
            self.renderer.draw_path(self.optimized_orders)
            
            # 渲染配送员
            if self.is_animating:
                self.renderer.draw_delivery_agent(self.optimized_orders, self.animation_progress)
        elif self.orders:
            self.renderer.draw_orders(self.orders, optimized=False)
        
        glDisable(GL_LIGHTING)
        
        # 渲染UI
        self.render_ui()
        
        pygame.display.flip()
    
    def render_ui(self):
        """渲染UI"""
        # 创建2D表面
        ui_surface = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
        
        # 标题
        title = self.font.render("🚁 小区送餐路径优化系统", True, (0, 255, 255))
        ui_surface.blit(title, (self.width // 2 - title.get_width() // 2, 20))
        
        # 统计信息
        y = 80
        stats = [
            f"订单数量: {len(self.orders)}",
            f"原始时间: {self.optimization_result['original']['time']:.1f}秒" if self.optimization_result else "原始时间: --",
            f"优化时间: {self.optimization_result['optimized']['time']:.1f}秒" if self.optimization_result else "优化时间: --",
            f"效率提升: {self.optimization_result['improvement']:.1f}%" if self.optimization_result else "效率提升: --",
        ]
        
        for stat in stats:
            text = self.small_font.render(stat, True, (255, 255, 255))
            ui_surface.blit(text, (20, y))
            y += 30
        
        # 控制提示
        y = self.height - 150
        controls = [
            "空格-生成订单  回车-优化路径  P-播放动画",
            "WASD-移动  鼠标-旋转  滚轮-缩放  R-重置"
        ]
        for control in controls:
            text = self.small_font.render(control, True, (150, 150, 150))
            ui_surface.blit(text, (20, y))
            y += 30
        
        # 转换为OpenGL纹理并绘制
        texture_data = pygame.image.tostring(ui_surface, "RGBA", True)
        glWindowPos2d(0, 0)
        glDrawPixels(self.width, self.height, GL_RGBA, GL_UNSIGNED_BYTE, texture_data)
    
    def reset(self):
        """重置场景"""
        self.orders = []
        self.optimized_orders = []
        self.optimization_result = None
        self.animation_progress = 0
        self.is_animating = False
        self.camera.reset()
        print("\n🔄 场景已重置")
    
    def run(self):
        """主循环"""
        self.generate_orders()
        
        running = True
        while running:
            dt = self.clock.tick(60) / 1000.0
            
            running = self.handle_events()
            self.update(dt)
            self.render()
        
        pygame.quit()

if __name__ == "__main__":
    app = DeliveryVisualization()
    app.run()
