"""
智能配送路径优化系统 - 科技感可视化
雷达扫描 + 点云 + 数据流 + 全息投影效果
"""
import pygame
import random
import math
from optimizer import DeliveryOptimizer, Order

class Particle:
    """粒子类"""
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.vx = random.uniform(-0.5, 0.5)
        self.vy = random.uniform(-0.5, 0.5)
        self.life = random.uniform(0.5, 1.0)
        self.size = random.uniform(1, 3)
    
    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.life -= 0.01
        return self.life > 0

class TechVisualizer:
    def __init__(self):
        pygame.init()
        self.width = 1920
        self.height = 1080
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption("AI智能配送路径优化系统")
        
        # 加载字体
        import os
        font_paths = [
            r"C:\Windows\Fonts\msyh.ttc",
            r"C:\Windows\Fonts\simhei.ttf",
        ]
        
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    self.font_large = pygame.font.Font(font_path, 56)
                    self.font_medium = pygame.font.Font(font_path, 36)
                    self.font_small = pygame.font.Font(font_path, 24)
                    break
                except:
                    continue
        
        # 颜色方案 - 赛博朋克风格
        self.BG_COLOR = (5, 10, 20)
        self.GRID_COLOR = (0, 255, 255, 30)
        self.BUILDING_COLOR = (20, 30, 50)
        self.BUILDING_EDGE = (0, 255, 255, 100)
        self.SCAN_COLOR = (0, 255, 255)
        self.AGENT_ORIGINAL = (255, 50, 100)
        self.AGENT_OPTIMIZED = (50, 255, 150)
        self.PARTICLE_COLOR = (0, 200, 255)
        self.DATA_FLOW_COLOR = (100, 200, 255)
        
        # 数据
        self.optimizer = DeliveryOptimizer()
        self.orders = []
        self.optimized_orders = []
        self.result = None
        
        # 动画
        self.animation_progress = 0
        self.is_animating = False
        self.animation_speed = 0.008
        
        # 特效
        self.particles = []
        self.scan_angle = 0
        self.scan_radius = 0
        self.data_streams = []
        self.time = 0
        
        # 布局
        self.left_panel = pygame.Rect(50, 150, self.width // 2 - 100, self.height - 300)
        self.right_panel = pygame.Rect(self.width // 2 + 50, 150, self.width // 2 - 100, self.height - 300)
        
        # 楼栋配置
        self.building_width = 100
        self.building_spacing = 150
        self.floor_height = 25
        self.num_floors = 18
        self.num_buildings = 3
        
        self.clock = pygame.time.Clock()
        
        print("=" * 70)
        print("AI智能配送路径优化系统")
        print("=" * 70)
        print("控制:")
        print("  空格键 - 生成订单")
        print("  回车键 - 开始AI优化对比")
        print("  R键    - 重置")
        print("=" * 70)
    
    def generate_orders(self):
        """生成订单"""
        count = 12
        self.orders = []
        for i in range(count):
            order = Order(
                id=i + 1,
                building=random.randint(1, self.num_buildings),
                floor=random.randint(1, self.num_floors),
                unit=random.randint(1, 2),
                room=f"{random.randint(1, 4):02d}"
            )
            self.orders.append(order)
        
        self.result = self.optimizer.optimize(self.orders)
        self.optimized_orders = self.result['optimized']['route']
        
        # 生成扫描特效
        self.scan_radius = 0
        self.create_particles(self.width // 2, self.height // 2, 50)
        
        print(f"\n生成 {len(self.orders)} 个订单")
        print(f"原始时间: {self.result['original']['time']:.1f}秒")
        print(f"优化时间: {self.result['optimized']['time']:.1f}秒")
        print(f"效率提升: {self.result['improvement']:.1f}%")
    
    def create_particles(self, x, y, count):
        """创建粒子"""
        for _ in range(count):
            self.particles.append(Particle(x, y))
    
    def get_building_position(self, building, panel_rect):
        """获取楼栋位置"""
        center_x = panel_rect.centerx
        start_x = center_x - (self.num_buildings - 1) * self.building_spacing // 2
        x = start_x + (building - 1) * self.building_spacing
        y = panel_rect.bottom - 50
        return x, y
    
    def get_order_position(self, order, panel_rect):
        """获取订单位置"""
        bx, by = self.get_building_position(order.building, panel_rect)
        x = bx + (25 if order.unit == 1 else -25)
        y = by - order.floor * self.floor_height
        return x, y
    
    def draw_tech_background(self):
        """绘制科技背景"""
        self.screen.fill(self.BG_COLOR)
        
        # 网格线
        for i in range(0, self.width, 50):
            alpha = 20 if i % 100 == 0 else 10
            color = (0, 255, 255, alpha)
            pygame.draw.line(self.screen, color, (i, 0), (i, self.height), 1)
        
        for i in range(0, self.height, 50):
            alpha = 20 if i % 100 == 0 else 10
            color = (0, 255, 255, alpha)
            pygame.draw.line(self.screen, color, (0, i), (self.width, i), 1)
        
        # 扫描圆环
        if self.scan_radius < 500:
            self.scan_radius += 5
        else:
            self.scan_radius = 0
        
        for r in range(0, int(self.scan_radius), 100):
            alpha = int(255 * (1 - r / self.scan_radius))
            color = (0, 255, 255, max(alpha, 0))
            pygame.draw.circle(self.screen, color, (self.width // 2, self.height // 2), r, 1)
        
        # 雷达扫描线
        self.scan_angle += 2
        if self.scan_angle >= 360:
            self.scan_angle = 0
        
        angle_rad = math.radians(self.scan_angle)
        end_x = self.width // 2 + math.cos(angle_rad) * 400
        end_y = self.height // 2 + math.sin(angle_rad) * 400
        
        # 扫描扇形
        points = [(self.width // 2, self.height // 2)]
        for a in range(int(self.scan_angle) - 30, int(self.scan_angle) + 1):
            rad = math.radians(a)
            px = self.width // 2 + math.cos(rad) * 400
            py = self.height // 2 + math.sin(rad) * 400
            points.append((px, py))
        
        if len(points) > 2:
            surf = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
            pygame.draw.polygon(surf, (0, 255, 255, 20), points)
            self.screen.blit(surf, (0, 0))
        
        pygame.draw.line(self.screen, (0, 255, 255, 150), 
                        (self.width // 2, self.height // 2), (end_x, end_y), 2)
        
        # 粒子系统
        self.particles = [p for p in self.particles if p.update()]
        for p in self.particles:
            alpha = int(p.life * 255)
            color = (*self.PARTICLE_COLOR, alpha)
            pygame.draw.circle(self.screen, color, (int(p.x), int(p.y)), int(p.size))
        
        # 随机生成新粒子
        if random.random() < 0.3:
            x = random.randint(0, self.width)
            y = random.randint(0, self.height)
            self.particles.append(Particle(x, y))
    
    def draw_hologram_panel(self, panel_rect, orders, title, color, progress=None):
        """绘制全息投影面板"""
        # 面板边框 - 发光效果
        for i in range(3):
            alpha = 100 - i * 30
            border_color = (*color[:3], alpha)
            border_rect = panel_rect.inflate(i * 4, i * 4)
            pygame.draw.rect(self.screen, border_color, border_rect, 2, border_radius=10)
        
        # 标题
        title_surf = self.font_medium.render(title, True, color)
        title_rect = title_surf.get_rect(centerx=panel_rect.centerx, top=panel_rect.top - 50)
        
        # 标题发光
        for i in range(3):
            glow_surf = self.font_medium.render(title, True, (*color[:3], 50))
            glow_rect = glow_surf.get_rect(center=(title_rect.centerx + i, title_rect.centery + i))
            self.screen.blit(glow_surf, glow_rect)
        
        self.screen.blit(title_surf, title_rect)
        
        # 绘制楼栋
        for i in range(1, self.num_buildings + 1):
            self.draw_hologram_building(i, panel_rect, color)
        
        # 绘制订单点
        for idx, order in enumerate(orders):
            x, y = self.get_order_position(order, panel_rect)
            
            # 脉冲圆环
            pulse = (math.sin(self.time * 5 + idx) + 1) / 2
            radius = 8 + pulse * 4
            
            for r in range(3):
                alpha = int((1 - r / 3) * 150)
                pygame.draw.circle(self.screen, (*color[:3], alpha), 
                                 (int(x), int(y)), int(radius + r * 2), 1)
            
            # 中心点
            pygame.draw.circle(self.screen, color, (int(x), int(y)), 5)
            
            # 订单编号
            num_surf = self.font_small.render(str(idx + 1), True, (255, 255, 255))
            num_rect = num_surf.get_rect(center=(x, y))
            self.screen.blit(num_surf, num_rect)
            
            # 数据流效果
            if random.random() < 0.05:
                self.create_data_stream(x, y, color)
        
        # 绘制配送机器人
        if progress is not None and len(orders) > 0:
            self.draw_robot(orders, panel_rect, color, progress)
    
    def draw_hologram_building(self, building_num, panel_rect, color):
        """绘制全息楼栋"""
        x, y = self.get_building_position(building_num, panel_rect)
        
        # 楼栋主体 - 线框风格
        building_rect = pygame.Rect(
            x - self.building_width // 2,
            y - self.num_floors * self.floor_height,
            self.building_width,
            self.num_floors * self.floor_height
        )
        
        # 填充
        surf = pygame.Surface((building_rect.width, building_rect.height), pygame.SRCALPHA)
        pygame.draw.rect(surf, (*self.BUILDING_COLOR, 100), surf.get_rect())
        self.screen.blit(surf, building_rect.topleft)
        
        # 边框
        pygame.draw.rect(self.screen, color, building_rect, 2)
        
        # 楼层线 - 扫描线效果
        for floor in range(1, self.num_floors + 1):
            floor_y = y - floor * self.floor_height
            alpha = int(100 + 50 * math.sin(self.time * 2 + floor))
            pygame.draw.line(self.screen, (*color[:3], alpha),
                           (building_rect.left, floor_y),
                           (building_rect.right, floor_y), 1)
        
        # 楼栋编号
        label = self.font_small.render(f"{building_num}号楼", True, color)
        label_rect = label.get_rect(centerx=x, top=y + 10)
        self.screen.blit(label, label_rect)
        
        # 顶部光束
        beam_height = 30
        beam_surf = pygame.Surface((self.building_width, beam_height), pygame.SRCALPHA)
        for i in range(beam_height):
            alpha = int((1 - i / beam_height) * 100)
            pygame.draw.line(beam_surf, (*color[:3], alpha),
                           (0, i), (self.building_width, i))
        self.screen.blit(beam_surf, (building_rect.left, building_rect.top - beam_height))
    
    def create_data_stream(self, x, y, color):
        """创建数据流"""
        self.data_streams.append({
            'x': x,
            'y': y,
            'target_y': y - 50,
            'color': color,
            'life': 1.0
        })
    
    def draw_data_streams(self):
        """绘制数据流"""
        for stream in self.data_streams[:]:
            stream['y'] -= 2
            stream['life'] -= 0.02
            
            if stream['life'] <= 0:
                self.data_streams.remove(stream)
                continue
            
            alpha = int(stream['life'] * 255)
            color = (*stream['color'][:3], alpha)
            
            # 数据点
            for i in range(5):
                offset_y = i * 5
                pygame.draw.circle(self.screen, color,
                                 (int(stream['x']), int(stream['y'] + offset_y)), 2)
    
    def draw_robot(self, orders, panel_rect, color, progress):
        """绘制配送机器人"""
        if progress >= len(orders):
            return
        
        idx = int(progress)
        t = progress - idx
        
        current = orders[idx]
        next_order = orders[min(idx + 1, len(orders) - 1)]
        
        x1, y1 = self.get_order_position(current, panel_rect)
        x2, y2 = self.get_order_position(next_order, panel_rect)
        
        need_change_building = current.building != next_order.building
        
        if need_change_building:
            bx1, by1 = self.get_building_position(current.building, panel_rect)
            bx2, by2 = self.get_building_position(next_order.building, panel_rect)
            
            segment = 0.25
            if t < segment:
                t_local = t / segment
                x, y = x1, y1 + (by1 - y1) * t_local
                self.draw_robot_with_effect(x, y, color, "电梯下降")
            elif t < segment * 2:
                t_local = (t - segment) / segment
                x, y = bx1 + (bx2 - bx1) * t_local, by1
                self.draw_robot_with_effect(x, y, color, "移动中")
            elif t < segment * 3:
                t_local = (t - segment * 2) / segment
                x, y = x2, by2 + (y2 - by2) * t_local
                self.draw_robot_with_effect(x, y, color, "电梯上升")
            else:
                x, y = x2, y2
                self.draw_robot_with_effect(x, y, color, "配送中")
        else:
            x = x1 + (x2 - x1) * t
            y = y1 + (y2 - y1) * t
            status = "电梯" if current.floor != next_order.floor else "配送中"
            self.draw_robot_with_effect(x, y, color, status)
    
    def draw_robot_with_effect(self, x, y, color, status):
        """绘制机器人特效"""
        # 机器人本体 - 六边形
        size = 18
        points = []
        for i in range(6):
            angle = math.radians(60 * i)
            px = x + math.cos(angle) * size
            py = y + math.sin(angle) * size
            points.append((px, py))
        
        # 发光效果
        for i in range(3):
            glow_points = []
            for px, py in points:
                glow_points.append((px + i, py + i))
            pygame.draw.polygon(self.screen, (*color[:3], 30), glow_points)
        
        pygame.draw.polygon(self.screen, color, points)
        pygame.draw.polygon(self.screen, (255, 255, 255), points, 2)
        
        # 扫描圈
        for r in range(3):
            alpha = int((1 - r / 3) * 100)
            radius = size + r * 8 + (math.sin(self.time * 10) + 1) * 3
            pygame.draw.circle(self.screen, (*color[:3], alpha), (int(x), int(y)), int(radius), 1)
        
        # 状态文字
        status_surf = self.font_small.render(status, True, color)
        status_rect = status_surf.get_rect(center=(x, y - 35))
        
        # 文字背景
        bg_rect = status_rect.inflate(10, 5)
        surf = pygame.Surface((bg_rect.width, bg_rect.height), pygame.SRCALPHA)
        pygame.draw.rect(surf, (0, 0, 0, 150), surf.get_rect(), border_radius=5)
        self.screen.blit(surf, bg_rect.topleft)
        
        self.screen.blit(status_surf, status_rect)
        
        # 粒子尾迹
        if random.random() < 0.5:
            self.create_particles(x, y, 2)
    
    def draw_stats_hud(self):
        """绘制HUD统计"""
        if not self.result:
            return
        
        # 顶部HUD
        hud_height = 120
        hud_surf = pygame.Surface((self.width, hud_height), pygame.SRCALPHA)
        pygame.draw.rect(hud_surf, (0, 0, 0, 180), hud_surf.get_rect())
        pygame.draw.line(hud_surf, (0, 255, 255), (0, hud_height - 2), (self.width, hud_height - 2), 2)
        self.screen.blit(hud_surf, (0, 0))
        
        # 标题
        title = self.font_large.render("AI智能配送路径优化系统", True, (0, 255, 255))
        title_rect = title.get_rect(center=(self.width // 2, 40))
        
        # 标题发光
        for i in range(3):
            glow = self.font_large.render("AI智能配送路径优化系统", True, (0, 255, 255, 50))
            self.screen.blit(glow, (title_rect.x + i, title_rect.y + i))
        
        self.screen.blit(title, title_rect)
        
        # 中间对比数据
        improvement = self.result['improvement']
        saved_time = self.result['original']['time'] - self.result['optimized']['time']
        
        stats_y = hud_height + 20
        compare_text = f"效率提升: {improvement:.1f}%  |  节省时间: {saved_time:.1f}秒"
        compare_surf = self.font_medium.render(compare_text, True, (255, 255, 100))
        compare_rect = compare_surf.get_rect(center=(self.width // 2, stats_y))
        
        # 数据框
        data_rect = compare_rect.inflate(40, 20)
        for i in range(3):
            border_rect = data_rect.inflate(i * 4, i * 4)
            alpha = 100 - i * 30
            pygame.draw.rect(self.screen, (255, 255, 100, alpha), border_rect, 2, border_radius=10)
        
        self.screen.blit(compare_surf, compare_rect)
        
        # 底部统计
        bottom_y = self.height - 100
        
        # 左侧
        left_stats = [
            f"传统模式: {self.result['original']['time']:.1f}秒",
            f"进度: {int(self.animation_progress)}/{len(self.orders)}" if self.is_animating else "待命"
        ]
        
        y = bottom_y
        for stat in left_stats:
            text = self.font_small.render(stat, True, self.AGENT_ORIGINAL)
            self.screen.blit(text, (100, y))
            y += 30
        
        # 右侧
        right_stats = [
            f"AI优化: {self.result['optimized']['time']:.1f}秒",
            f"进度: {int(self.animation_progress)}/{len(self.optimized_orders)}" if self.is_animating else "待命"
        ]
        
        y = bottom_y
        for stat in right_stats:
            text = self.font_small.render(stat, True, self.AGENT_OPTIMIZED)
            text_rect = text.get_rect(right=self.width - 100, top=y)
            self.screen.blit(text, text_rect)
            y += 30
    
    def handle_events(self):
        """处理事件"""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    return False
                elif event.key == pygame.K_SPACE:
                    self.generate_orders()
                    self.animation_progress = 0
                    self.is_animating = False
                elif event.key == pygame.K_RETURN:
                    if self.orders:
                        self.is_animating = True
                        self.animation_progress = 0
                        print("\n开始AI优化对比")
                elif event.key == pygame.K_r:
                    self.animation_progress = 0
                    self.is_animating = False
        
        return True
    
    def update(self):
        """更新"""
        self.time += 0.016
        
        if self.is_animating and self.orders:
            self.animation_progress += self.animation_speed
            
            max_orders = max(len(self.orders), len(self.optimized_orders))
            if self.animation_progress >= max_orders:
                self.animation_progress = max_orders
                self.is_animating = False
                print("\n优化完成")
    
    def render(self):
        """渲染"""
        self.draw_tech_background()
        self.draw_data_streams()
        
        if self.orders:
            self.draw_hologram_panel(
                self.left_panel,
                self.orders,
                "传统配送模式",
                self.AGENT_ORIGINAL,
                self.animation_progress if self.is_animating else None
            )
            
            self.draw_hologram_panel(
                self.right_panel,
                self.optimized_orders,
                "AI智能优化",
                self.AGENT_OPTIMIZED,
                self.animation_progress if self.is_animating else None
            )
            
            self.draw_stats_hud()
        else:
            hint = self.font_large.render("按空格键开始", True, (0, 255, 255))
            hint_rect = hint.get_rect(center=(self.width // 2, self.height // 2))
            self.screen.blit(hint, hint_rect)
        
        pygame.display.flip()
    
    def run(self):
        """主循环"""
        self.generate_orders()
        
        running = True
        while running:
            self.clock.tick(60)
            running = self.handle_events()
            self.update()
            self.render()
        
        pygame.quit()

if __name__ == "__main__":
    app = TechVisualizer()
    app.run()
