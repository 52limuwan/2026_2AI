"""
配送路径可视化 - 对比展示
左右分屏同时展示优化前后的配送过程
"""
import pygame
import random
import math
from optimizer import DeliveryOptimizer, Order

class DeliveryVisualizer:
    def __init__(self):
        pygame.init()
        self.width = 1600
        self.height = 900
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption("🚁 配送路径优化对比 - 实时动画")
        
        # 加载中文字体
        import os
        font_paths = [
            r"C:\Windows\Fonts\msyh.ttc",
            r"C:\Windows\Fonts\simhei.ttf",
            r"C:\Windows\Fonts\simsun.ttc",
        ]
        
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    self.font_large = pygame.font.Font(font_path, 48)
                    self.font_medium = pygame.font.Font(font_path, 32)
                    self.font_small = pygame.font.Font(font_path, 24)
                    break
                except:
                    continue
        
        # 颜色
        self.BG_COLOR = (15, 20, 35)
        self.GRID_COLOR = (30, 40, 60)
        self.BUILDING_COLOR = (50, 60, 90)
        self.FLOOR_COLOR = (70, 80, 110)
        self.ORDER_COLOR = (255, 100, 100)
        self.AGENT_ORIGINAL = (255, 50, 50)
        self.AGENT_OPTIMIZED = (50, 255, 100)
        self.PATH_ORIGINAL = (255, 100, 100)
        self.PATH_OPTIMIZED = (50, 255, 100)
        self.TEXT_COLOR = (200, 220, 255)
        
        # 数据
        self.optimizer = DeliveryOptimizer()
        self.orders = []
        self.optimized_orders = []
        self.result = None
        
        # 动画
        self.animation_progress = 0
        self.is_animating = False
        self.animation_speed = 0.01  # 降低速度，看清楚电梯动画
        
        # 布局
        self.left_panel = pygame.Rect(0, 0, self.width // 2, self.height)
        self.right_panel = pygame.Rect(self.width // 2, 0, self.width // 2, self.height)
        
        # 楼栋配置
        self.building_width = 80
        self.building_spacing = 120
        self.floor_height = 20
        self.num_floors = 18
        self.num_buildings = 3
        
        self.clock = pygame.time.Clock()
        
        print("=" * 70)
        print("🚁 配送路径优化对比系统")
        print("=" * 70)
        print("功能说明:")
        print("  左侧 - 原始配送顺序（红色）")
        print("  右侧 - 优化后顺序（绿色）")
        print("  实时对比配送时间和路径")
        print()
        print("控制:")
        print("  空格键 - 生成新订单")
        print("  回车键 - 开始对比动画")
        print("  R键    - 重置")
        print("  ESC    - 退出")
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
        
        # 优化
        self.result = self.optimizer.optimize(self.orders)
        self.optimized_orders = self.result['optimized']['route']
        
        print(f"\n✅ 生成 {len(self.orders)} 个订单")
        print(f"📊 原始时间: {self.result['original']['time']:.1f}秒")
        print(f"⚡ 优化时间: {self.result['optimized']['time']:.1f}秒")
        print(f"🎯 效率提升: {self.result['improvement']:.1f}%")
        print(f"⏱️  节省时间: {self.result['original']['time'] - self.result['optimized']['time']:.1f}秒")
    
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
        x = bx + (20 if order.unit == 1 else -20)
        y = by - order.floor * self.floor_height
        return x, y
    
    def draw_panel(self, panel_rect, orders, title, color, progress=None):
        """绘制单个面板"""
        # 背景
        pygame.draw.rect(self.screen, self.BG_COLOR, panel_rect)
        
        # 标题
        title_surf = self.font_medium.render(title, True, color)
        title_rect = title_surf.get_rect(centerx=panel_rect.centerx, top=20)
        self.screen.blit(title_surf, title_rect)
        
        # 绘制楼栋
        for i in range(1, self.num_buildings + 1):
            self.draw_building(i, panel_rect)
        
        # 绘制订单
        for idx, order in enumerate(orders):
            x, y = self.get_order_position(order, panel_rect)
            
            # 订单编号
            pygame.draw.circle(self.screen, color, (int(x), int(y)), 12)
            pygame.draw.circle(self.screen, self.BG_COLOR, (int(x), int(y)), 10)
            
            num_surf = self.font_small.render(str(idx + 1), True, color)
            num_rect = num_surf.get_rect(center=(x, y))
            self.screen.blit(num_surf, num_rect)
        
        # 绘制路径线
        if len(orders) > 1:
            points = []
            for order in orders:
                x, y = self.get_order_position(order, panel_rect)
                points.append((x, y))
            
            if len(points) > 1:
                pygame.draw.lines(self.screen, color, False, points, 2)
        
        # 绘制配送员动画
        if progress is not None and len(orders) > 0:
            self.draw_delivery_agent(orders, panel_rect, color, progress)
    
    def draw_building(self, building_num, panel_rect):
        """绘制楼栋"""
        x, y = self.get_building_position(building_num, panel_rect)
        
        # 主体
        building_rect = pygame.Rect(
            x - self.building_width // 2,
            y - self.num_floors * self.floor_height,
            self.building_width,
            self.num_floors * self.floor_height
        )
        pygame.draw.rect(self.screen, self.BUILDING_COLOR, building_rect)
        pygame.draw.rect(self.screen, self.FLOOR_COLOR, building_rect, 2)
        
        # 楼层线
        for floor in range(1, self.num_floors + 1):
            floor_y = y - floor * self.floor_height
            pygame.draw.line(
                self.screen,
                self.FLOOR_COLOR,
                (building_rect.left, floor_y),
                (building_rect.right, floor_y),
                1
            )
        
        # 楼栋编号
        label = self.font_small.render(f"{building_num}号楼", True, self.TEXT_COLOR)
        label_rect = label.get_rect(centerx=x, top=y + 10)
        self.screen.blit(label, label_rect)
    
    def draw_delivery_agent(self, orders, panel_rect, color, progress):
        """绘制配送员 - 带电梯逻辑"""
        if progress >= len(orders):
            return
        
        idx = int(progress)
        t = progress - idx
        
        # 当前和下一个订单
        current = orders[idx]
        next_order = orders[min(idx + 1, len(orders) - 1)]
        
        x1, y1 = self.get_order_position(current, panel_rect)
        x2, y2 = self.get_order_position(next_order, panel_rect)
        
        # 判断是否需要换楼栋
        need_change_building = current.building != next_order.building
        
        if need_change_building:
            # 需要换楼栋：当前位置 -> 1楼 -> 另一栋1楼 -> 目标楼层
            bx1, by1 = self.get_building_position(current.building, panel_rect)
            bx2, by2 = self.get_building_position(next_order.building, panel_rect)
            
            # 分4段动画
            segment_length = 0.25
            
            if t < segment_length:
                # 第1段：当前楼层 -> 1楼（电梯下降）
                t_local = t / segment_length
                x = x1
                y = y1 + (by1 - y1) * t_local
                self.draw_agent_with_elevator(x, y, color, "下降")
                
            elif t < segment_length * 2:
                # 第2段：1楼横向移动到另一栋
                t_local = (t - segment_length) / segment_length
                x = bx1 + (bx2 - bx1) * t_local
                y = by1
                self.draw_agent_moving(x, y, color)
                
            elif t < segment_length * 3:
                # 第3段：另一栋1楼 -> 目标楼层（电梯上升）
                t_local = (t - segment_length * 2) / segment_length
                x = x2
                y = by2 + (y2 - by2) * t_local
                self.draw_agent_with_elevator(x, y, color, "上升")
                
            else:
                # 第4段：到达目标位置
                x = x2
                y = y2
                self.draw_agent_normal(x, y, color)
        
        elif current.floor != next_order.floor:
            # 同楼栋不同楼层：使用电梯
            x = x1 + (x2 - x1) * t
            y = y1 + (y2 - y1) * t
            direction = "上升" if next_order.floor > current.floor else "下降"
            self.draw_agent_with_elevator(x, y, color, direction)
        
        else:
            # 同楼层：直接移动
            x = x1 + (x2 - x1) * t
            y = y1 + (y2 - y1) * t
            self.draw_agent_normal(x, y, color)
    
    def draw_agent_normal(self, x, y, color):
        """绘制普通配送员"""
        size = 15
        points = [
            (x, y - size),
            (x - size * 0.7, y + size * 0.5),
            (x + size * 0.7, y + size * 0.5)
        ]
        pygame.draw.polygon(self.screen, color, points)
        pygame.draw.polygon(self.screen, (255, 255, 255), points, 2)
        
        # 拖尾
        for i in range(5):
            alpha = 1 - i * 0.2
            trail_color = (int(color[0] * alpha), int(color[1] * alpha), int(color[2] * alpha))
            pygame.draw.circle(self.screen, trail_color, (int(x), int(y + i * 3)), 3)
    
    def draw_agent_with_elevator(self, x, y, color, direction):
        """绘制在电梯中的配送员"""
        # 电梯框
        elevator_width = 30
        elevator_height = 40
        elevator_rect = pygame.Rect(
            x - elevator_width // 2,
            y - elevator_height // 2,
            elevator_width,
            elevator_height
        )
        
        # 电梯背景
        pygame.draw.rect(self.screen, (80, 80, 100), elevator_rect, border_radius=5)
        pygame.draw.rect(self.screen, color, elevator_rect, 2, border_radius=5)
        
        # 配送员（小一点）
        size = 10
        points = [
            (x, y - size),
            (x - size * 0.7, y + size * 0.5),
            (x + size * 0.7, y + size * 0.5)
        ]
        pygame.draw.polygon(self.screen, color, points)
        
        # 方向箭头
        arrow_y = elevator_rect.top - 10 if direction == "上升" else elevator_rect.bottom + 10
        arrow_size = 8
        if direction == "上升":
            arrow_points = [
                (x, arrow_y - arrow_size),
                (x - arrow_size, arrow_y + arrow_size),
                (x + arrow_size, arrow_y + arrow_size)
            ]
        else:
            arrow_points = [
                (x, arrow_y + arrow_size),
                (x - arrow_size, arrow_y - arrow_size),
                (x + arrow_size, arrow_y - arrow_size)
            ]
        pygame.draw.polygon(self.screen, (255, 255, 100), arrow_points)
        
        # 文字提示
        text = self.font_small.render(direction, True, (255, 255, 100))
        text_rect = text.get_rect(center=(x, elevator_rect.bottom + 25))
        self.screen.blit(text, text_rect)
    
    def draw_agent_moving(self, x, y, color):
        """绘制横向移动的配送员"""
        size = 15
        # 横向的三角形
        points = [
            (x + size, y),
            (x - size * 0.5, y - size * 0.7),
            (x - size * 0.5, y + size * 0.7)
        ]
        pygame.draw.polygon(self.screen, color, points)
        pygame.draw.polygon(self.screen, (255, 255, 255), points, 2)
        
        # 移动线条
        for i in range(5):
            alpha = 1 - i * 0.2
            trail_color = (int(color[0] * alpha), int(color[1] * alpha), int(color[2] * alpha))
            pygame.draw.circle(self.screen, trail_color, (int(x - i * 5), int(y)), 3)
    
    def draw_stats(self):
        """绘制统计信息"""
        if not self.result:
            return
        
        # 中间分隔线
        pygame.draw.line(
            self.screen,
            self.GRID_COLOR,
            (self.width // 2, 0),
            (self.width // 2, self.height),
            3
        )
        
        # 统计面板
        stats_y = self.height - 150
        stats_height = 140
        
        # 左侧统计
        left_stats = [
            f"订单数: {len(self.orders)}",
            f"配送时间: {self.result['original']['time']:.1f}秒",
            f"当前进度: {int(self.animation_progress)}/{len(self.orders)}" if self.is_animating else "等待开始"
        ]
        
        y = stats_y + 20
        for stat in left_stats:
            text = self.font_small.render(stat, True, self.AGENT_ORIGINAL)
            self.screen.blit(text, (30, y))
            y += 35
        
        # 右侧统计
        right_stats = [
            f"订单数: {len(self.optimized_orders)}",
            f"配送时间: {self.result['optimized']['time']:.1f}秒",
            f"当前进度: {int(self.animation_progress)}/{len(self.optimized_orders)}" if self.is_animating else "等待开始"
        ]
        
        y = stats_y + 20
        for stat in right_stats:
            text = self.font_small.render(stat, True, self.AGENT_OPTIMIZED)
            self.screen.blit(text, (self.width // 2 + 30, y))
            y += 35
        
        # 中间对比
        improvement = self.result['improvement']
        saved_time = self.result['original']['time'] - self.result['optimized']['time']
        
        compare_text = f"效率提升: {improvement:.1f}%  节省: {saved_time:.1f}秒"
        compare_surf = self.font_medium.render(compare_text, True, (255, 255, 100))
        compare_rect = compare_surf.get_rect(center=(self.width // 2, stats_y - 30))
        
        # 背景框
        bg_rect = compare_rect.inflate(40, 20)
        pygame.draw.rect(self.screen, (50, 50, 50), bg_rect, border_radius=10)
        pygame.draw.rect(self.screen, (255, 255, 100), bg_rect, 3, border_radius=10)
        
        self.screen.blit(compare_surf, compare_rect)
    
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
                        print("\n▶️  开始对比动画")
                elif event.key == pygame.K_r:
                    self.animation_progress = 0
                    self.is_animating = False
                    print("\n🔄 重置动画")
        
        return True
    
    def update(self):
        """更新逻辑"""
        if self.is_animating and self.orders:
            self.animation_progress += self.animation_speed
            
            max_orders = max(len(self.orders), len(self.optimized_orders))
            if self.animation_progress >= max_orders:
                self.animation_progress = max_orders
                self.is_animating = False
                print("\n✅ 动画完成")
    
    def render(self):
        """渲染"""
        self.screen.fill(self.BG_COLOR)
        
        if self.orders:
            # 左侧：原始顺序
            self.draw_panel(
                self.left_panel,
                self.orders,
                "原始配送顺序",
                self.AGENT_ORIGINAL,
                self.animation_progress if self.is_animating else None
            )
            
            # 右侧：优化顺序
            self.draw_panel(
                self.right_panel,
                self.optimized_orders,
                "优化后顺序",
                self.AGENT_OPTIMIZED,
                self.animation_progress if self.is_animating else None
            )
            
            # 统计信息
            self.draw_stats()
        else:
            # 提示信息
            hint = self.font_large.render("按空格键生成订单", True, self.TEXT_COLOR)
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
    app = DeliveryVisualizer()
    app.run()
