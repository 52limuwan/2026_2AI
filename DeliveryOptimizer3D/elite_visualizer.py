"""
精英可视化器 - 展示电梯调度和高级统计
"""
import pygame
import random
import math
import time
from advanced_optimizer import AdvancedOptimizer, Order
from elevator_system import Direction, ElevatorStatus

class EliteVisualizer:
    def __init__(self):
        pygame.init()
        self.width = 1600
        self.height = 900
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption("智能配送系统 - 电梯调度优化")
        
        # 字体
        import os
        font_path = r"C:\Windows\Fonts\msyh.ttc"
        if os.path.exists(font_path):
            self.font_title = pygame.font.Font(font_path, 48)
            self.font_large = pygame.font.Font(font_path, 32)
            self.font_medium = pygame.font.Font(font_path, 24)
            self.font_small = pygame.font.Font(font_path, 18)
            self.font_tiny = pygame.font.Font(font_path, 14)
        
        # 配色
        self.BG = (250, 250, 252)
        self.CARD_BG = (255, 255, 255)
        self.TEXT_PRIMARY = (30, 30, 35)
        self.TEXT_SECONDARY = (140, 140, 150)
        self.COLOR_TRADITIONAL = (255, 59, 48)
        self.COLOR_AI = (52, 199, 89)
        self.COLOR_NEW = (255, 149, 0)
        self.COLOR_URGENT = (255, 45, 85)
        self.BUILDING_COLOR = (245, 245, 247)
        self.BUILDING_STROKE = (200, 200, 210)
        
        # 电梯颜色
        self.ELEVATOR_IDLE = (76, 217, 100)      # 绿色-空闲
        self.ELEVATOR_MOVING = (255, 204, 0)     # 黄色-运行
        self.ELEVATOR_FULL = (255, 59, 48)       # 红色-满载
        
        # 优化器
        self.optimizer = AdvancedOptimizer()
        
        # 数据
        self.traditional_orders = []
        self.ai_orders = []
        self.traditional_completed = 0
        self.ai_completed = 0
        self.traditional_progress = 0.0
        self.ai_progress = 0.0
        
        # 统计
        self.traditional_elevator_waits = 0
        self.ai_elevator_waits = 0
        self.traditional_elevator_uses = 0
        self.ai_elevator_uses = 0
        
        # 动画
        self.is_running = False
        self.speed = 0.25
        self.new_order_timer = 0
        self.new_order_interval = 6.0
        self.next_order_id = 1
        self.time = 0
        
        # 布局
        padding = 40
        panel_width = (self.width - padding * 3) // 2
        self.left_panel = pygame.Rect(padding, 200, panel_width, self.height - 350)
        self.right_panel = pygame.Rect(padding * 2 + panel_width, 200, panel_width, self.height - 350)
        
        # 楼栋配置
        self.building_width = 90
        self.building_spacing = 140
        self.floor_height = 22
        self.num_floors = 18
        self.num_buildings = 3
        
        self.clock = pygame.time.Clock()
        
        print("=" * 50)
        print("智能配送系统 - 电梯调度优化")
        print("=" * 50)
        print("空格 - 开始配送")
        print("R - 重置系统")
        print("ESC - 退出")
        print("=" * 50)
    
    def generate_orders(self, count):
        """生成订单"""
        orders = []
        for _ in range(count):
            # 随机优先级（10%紧急订单）
            priority = 5 if random.random() < 0.1 else random.randint(2, 4)
            
            order = Order(
                id=self.next_order_id,
                building=random.randint(1, self.num_buildings),
                floor=random.randint(1, self.num_floors),
                unit=random.randint(1, 2),
                room=f"{random.randint(1, 4):02d}",
                priority=priority,
                timestamp=self.time,
                deadline=self.time + random.uniform(300, 600)
            )
            orders.append(order)
            self.next_order_id += 1
        return orders
    
    def start(self):
        """开始配送"""
        initial = self.generate_orders(15)
        
        self.traditional_orders = self.optimizer.optimize_traditional(initial)
        self.ai_orders = self.optimizer.optimize_smart(initial)
        
        self.traditional_completed = 0
        self.ai_completed = 0
        self.traditional_progress = 0.0
        self.ai_progress = 0.0
        self.traditional_elevator_waits = 0
        self.ai_elevator_waits = 0
        self.traditional_elevator_uses = 0
        self.ai_elevator_uses = 0
        
        self.is_running = True
        self.new_order_timer = 0
        
        t_time = self.optimizer.calculate_total_time_traditional(self.traditional_orders)
        a_time = self.optimizer.calculate_total_time_smart(self.ai_orders)
        improvement = (t_time - a_time) / t_time * 100 if t_time > 0 else 0
        
        print(f"\n{'='*50}")
        print(f"开始配送 - 初始{len(initial)}单")
        print(f"{'='*50}")
        print(f"传统模式: 每单回食堂 + 随机电梯")
        print(f"  预估时间: {t_time:.0f}秒")
        print(f"AI模式: 批量配送 + 智能电梯调度")
        print(f"  预估时间: {a_time:.0f}秒")
        print(f"预期效率提升: {improvement:.1f}%")
        print(f"{'='*50}")
    
    def update(self, dt):
        """更新"""
        if not self.is_running:
            return
        
        self.time += dt
        
        # 更新电梯状态
        self.optimizer.elevator_scheduler.update_elevators(dt)
        
        # 生成新订单
        self.new_order_timer += dt
        if self.new_order_timer >= self.new_order_interval:
            self.new_order_timer = 0
            new_order = self.generate_orders(1)[0]
            
            self.traditional_orders.append(new_order)
            self.ai_orders = self.optimizer.insert_new_order_smart(
                self.ai_orders, 
                self.ai_completed,
                new_order
            )
            
            priority_text = "🔴紧急" if new_order.priority >= 5 else "普通"
            print(f"新订单 #{new_order.id}: {new_order.building}号楼{new_order.floor}层 [{priority_text}]")
        
        # 更新传统配送
        if self.traditional_completed < len(self.traditional_orders):
            self.traditional_progress += dt * self.speed
            if self.traditional_progress >= 1.0:
                self.traditional_progress = 0.0
                self.traditional_completed += 1
                self.traditional_elevator_uses += 1
        
        # 更新AI配送
        if self.ai_completed < len(self.ai_orders):
            self.ai_progress += dt * self.speed
            if self.ai_progress >= 1.0:
                self.ai_progress = 0.0
                self.ai_completed += 1
                # AI模式：同楼栋不增加电梯使用次数
                if self.ai_completed == 1 or self.ai_orders[self.ai_completed-1].building != self.ai_orders[self.ai_completed-2].building:
                    self.ai_elevator_uses += 1
        
        # 检查完成
        if (self.traditional_completed >= len(self.traditional_orders) and 
            self.ai_completed >= len(self.ai_orders)):
            self.is_running = False
            self.print_final_stats()
    
    def print_final_stats(self):
        """打印最终统计"""
        t_time = self.optimizer.calculate_total_time_traditional(self.traditional_orders)
        a_time = self.optimizer.calculate_total_time_smart(self.ai_orders)
        improvement = (t_time - a_time) / t_time * 100 if t_time > 0 else 0
        
        print(f"\n{'='*50}")
        print(f"配送完成！")
        print(f"{'='*50}")
        print(f"传统模式:")
        print(f"  总时间: {t_time:.0f}秒")
        print(f"  订单数: {len(self.traditional_orders)}单")
        print(f"  电梯使用: {self.traditional_elevator_uses}次")
        print(f"\nAI模式:")
        print(f"  总时间: {a_time:.0f}秒")
        print(f"  订单数: {len(self.ai_orders)}单")
        print(f"  电梯使用: {self.ai_elevator_uses}次")
        print(f"\n效率提升: {improvement:.1f}%")
        print(f"节省时间: {t_time - a_time:.0f}秒")
        print(f"电梯使用减少: {self.traditional_elevator_uses - self.ai_elevator_uses}次")
        print(f"{'='*50}")
    
    def get_canteen_pos(self, panel):
        """食堂位置"""
        first_x, first_y = self.get_building_pos(1, panel)
        return first_x - self.building_spacing - 20, first_y
    
    def get_building_pos(self, building, panel):
        """楼栋位置"""
        center_x = panel.centerx
        start_x = center_x - (self.num_buildings - 1) * self.building_spacing // 2
        x = start_x + (building - 1) * self.building_spacing
        y = panel.bottom - 40
        return x, y
    
    def get_order_pos(self, order, panel):
        """订单位置"""
        bx, by = self.get_building_pos(order.building, panel)
        x = bx + (22 if order.unit == 1 else -22)
        y = by - order.floor * self.floor_height
        return x, y
    
    def smooth(self, t):
        """缓动函数"""
        if t < 0.5:
            return 4 * t * t * t
        else:
            return 1 - pow(-2 * t + 2, 3) / 2
    
    def get_robot_pos(self, orders, completed, progress, panel, is_traditional=False):
        """计算机器人位置"""
        if completed >= len(orders):
            return None
        
        t = self.smooth(progress)
        current = orders[completed]
        
        if completed == 0:
            cx, cy = self.get_canteen_pos(panel)
            tx, ty = self.get_order_pos(current, panel)
            return cx + (tx - cx) * t, cy + (ty - cy) * t
        else:
            prev = orders[completed - 1]
            px, py = self.get_order_pos(prev, panel)
            curr_x, curr_y = self.get_order_pos(current, panel)
            
            need_canteen = is_traditional or (prev.building != current.building)
            
            if need_canteen:
                canteen_x, canteen_y = self.get_canteen_pos(panel)
                if t < 0.35:
                    t1 = self.smooth(t / 0.35)
                    return px + (canteen_x - px) * t1, py + (canteen_y - py) * t1
                elif t < 0.45:
                    return canteen_x, canteen_y
                else:
                    t2 = self.smooth((t - 0.45) / 0.55)
                    return canteen_x + (curr_x - canteen_x) * t2, canteen_y + (curr_y - canteen_y) * t2
            else:
                return px + (curr_x - px) * t, py + (curr_y - py) * t
    
    def draw_elevator(self, building, elevator_id, panel, x_offset=0):
        """绘制电梯"""
        elevators = self.optimizer.elevator_scheduler.get_all_elevators(building)
        if elevator_id >= len(elevators):
            return
        
        elevator = elevators[elevator_id]
        bx, by = self.get_building_pos(building, panel)
        
        # 电梯位置（楼栋左右两侧）
        ex = bx + x_offset
        ey = by - elevator.current_floor * self.floor_height
        
        # 电梯颜色
        if elevator.is_full():
            color = self.ELEVATOR_FULL
        elif elevator.status == ElevatorStatus.MOVING:
            color = self.ELEVATOR_MOVING
        else:
            color = self.ELEVATOR_IDLE
        
        # 绘制电梯
        pygame.draw.rect(self.screen, color, (ex - 8, ey - 8, 16, 16), border_radius=2)
        
        # 方向箭头
        if elevator.direction == Direction.UP:
            arrow = "↑"
        elif elevator.direction == Direction.DOWN:
            arrow = "↓"
        else:
            arrow = "●"
        
        arrow_surf = self.font_tiny.render(arrow, True, (255, 255, 255))
        self.screen.blit(arrow_surf, (ex - 4, ey - 6))
    
    def draw_panel(self, panel, orders, completed, progress, title, color, is_traditional=False):
        """绘制面板"""
        pygame.draw.rect(self.screen, self.CARD_BG, panel, border_radius=12)
        
        # 标题
        title_surf = self.font_medium.render(title, True, color)
        self.screen.blit(title_surf, (panel.x + 24, panel.y + 20))
        
        # 食堂
        cx, cy = self.get_canteen_pos(panel)
        canteen_rect = pygame.Rect(cx - 35, cy - 60, 70, 60)
        pygame.draw.rect(self.screen, (255, 248, 240), canteen_rect, border_radius=4)
        pygame.draw.rect(self.screen, self.BUILDING_STROKE, canteen_rect, 2, border_radius=4)
        icon = self.font_large.render("🍱", True, self.TEXT_PRIMARY)
        self.screen.blit(icon, (cx - 16, cy - 45))
        label = self.font_small.render("食堂", True, self.TEXT_SECONDARY)
        self.screen.blit(label, (cx - 16, cy + 8))
        
        # 楼栋
        for i in range(1, self.num_buildings + 1):
            self.draw_building(i, panel)
            # 绘制电梯
            self.draw_elevator(i, 0, panel, -50)
            self.draw_elevator(i, 1, panel, 50)
        
        # 订单
        for i, order in enumerate(orders):
            x, y = self.get_order_pos(order, panel)
            
            if i < completed:
                pygame.draw.circle(self.screen, (180, 180, 180), (int(x), int(y)), 6)
            elif order.priority >= 5:
                # 紧急订单
                alpha = (math.sin(self.time * 8) + 1) / 2
                size = 9 + alpha * 2
                pygame.draw.circle(self.screen, self.COLOR_URGENT, (int(x), int(y)), int(size))
            elif order.timestamp > 0.5:
                # 新订单
                alpha = (math.sin(self.time * 5) + 1) / 2
                size = 8 + alpha * 2
                pygame.draw.circle(self.screen, self.COLOR_NEW, (int(x), int(y)), int(size))
            else:
                pygame.draw.circle(self.screen, color, (int(x), int(y)), 8)
        
        # 机器人
        robot_pos = self.get_robot_pos(orders, completed, progress, panel, is_traditional)
        if robot_pos:
            rx, ry = robot_pos
            pygame.draw.circle(self.screen, color, (int(rx), int(ry)), 14)
            pygame.draw.circle(self.screen, self.CARD_BG, (int(rx), int(ry)), 12)
            arrow_surf = self.font_medium.render("🤖", True, color)
            self.screen.blit(arrow_surf, (int(rx) - 10, int(ry) - 10))
        
        # 统计
        stats = f"{completed}/{len(orders)}单"
        stats_surf = self.font_medium.render(stats, True, color)
        self.screen.blit(stats_surf, (panel.x + 24, panel.bottom - 40))
    
    def draw_building(self, building_num, panel):
        """绘制楼栋"""
        x, y = self.get_building_pos(building_num, panel)
        rect = pygame.Rect(
            x - self.building_width // 2,
            y - self.num_floors * self.floor_height,
            self.building_width,
            self.num_floors * self.floor_height
        )
        pygame.draw.rect(self.screen, self.BUILDING_COLOR, rect, border_radius=4)
        pygame.draw.rect(self.screen, self.BUILDING_STROKE, rect, 1, border_radius=4)
        
        for floor in range(1, self.num_floors):
            floor_y = y - floor * self.floor_height
            pygame.draw.line(self.screen, self.BUILDING_STROKE,
                           (rect.left + 2, floor_y), (rect.right - 2, floor_y), 1)
        
        label = self.font_small.render(f"{building_num}号楼", True, self.TEXT_SECONDARY)
        self.screen.blit(label, (x - 24, y + 8))
    
    def draw_header(self):
        """绘制标题"""
        title = self.font_title.render("智能配送系统 - 电梯调度优化", True, self.TEXT_PRIMARY)
        self.screen.blit(title, (40, 40))
        
        subtitle = "传统随机电梯 vs AI智能调度 • 批量配送 • 优先级队列"
        subtitle_surf = self.font_medium.render(subtitle, True, self.TEXT_SECONDARY)
        self.screen.blit(subtitle_surf, (40, 100))
        
        # 图例
        legend_y = 150
        # 电梯状态
        pygame.draw.rect(self.screen, self.ELEVATOR_IDLE, (40, legend_y, 20, 20), border_radius=2)
        legend_surf = self.font_small.render("空闲电梯", True, self.TEXT_SECONDARY)
        self.screen.blit(legend_surf, (70, legend_y + 2))
        
        pygame.draw.rect(self.screen, self.ELEVATOR_MOVING, (180, legend_y, 20, 20), border_radius=2)
        legend_surf = self.font_small.render("运行中", True, self.TEXT_SECONDARY)
        self.screen.blit(legend_surf, (210, legend_y + 2))
        
        pygame.draw.rect(self.screen, self.ELEVATOR_FULL, (320, legend_y, 20, 20), border_radius=2)
        legend_surf = self.font_small.render("满载", True, self.TEXT_SECONDARY)
        self.screen.blit(legend_surf, (350, legend_y + 2))
        
        # 订单状态
        pygame.draw.circle(self.screen, self.COLOR_URGENT, (480, legend_y + 10), 8)
        legend_surf = self.font_small.render("紧急订单", True, self.TEXT_SECONDARY)
        self.screen.blit(legend_surf, (500, legend_y + 2))
        
        pygame.draw.circle(self.screen, self.COLOR_NEW, (620, legend_y + 10), 8)
        legend_surf = self.font_small.render("新订单", True, self.TEXT_SECONDARY)
        self.screen.blit(legend_surf, (640, legend_y + 2))
    
    def draw_stats(self):
        """绘制统计"""
        y = self.height - 120
        
        t_time = self.optimizer.calculate_total_time_traditional(
            self.traditional_orders[:self.traditional_completed]
        )
        a_time = self.optimizer.calculate_total_time_smart(
            self.ai_orders[:self.ai_completed]
        )
        
        # 传统模式统计
        left_text = f"传统: {t_time:.0f}秒 | 电梯: {self.traditional_elevator_uses}次"
        left_surf = self.font_medium.render(left_text, True, self.COLOR_TRADITIONAL)
        self.screen.blit(left_surf, (self.left_panel.x, y))
        
        # AI模式统计
        right_text = f"AI: {a_time:.0f}秒 | 电梯: {self.ai_elevator_uses}次"
        right_surf = self.font_medium.render(right_text, True, self.COLOR_AI)
        self.screen.blit(right_surf, (self.right_panel.x, y))
        
        # 效率提升
        if t_time > 0:
            improvement = (t_time - a_time) / t_time * 100
            imp_text = f"效率提升: {improvement:.1f}%"
            imp_surf = self.font_large.render(imp_text, True, self.COLOR_AI)
            self.screen.blit(imp_surf, (self.width // 2 - 100, y - 10))
    
    def render(self):
        """渲染"""
        self.screen.fill(self.BG)
        self.draw_header()
        
        if self.traditional_orders or self.ai_orders:
            self.draw_panel(
                self.left_panel, self.traditional_orders,
                self.traditional_completed, self.traditional_progress,
                "传统配送（随机电梯）", self.COLOR_TRADITIONAL, True
            )
            self.draw_panel(
                self.right_panel, self.ai_orders,
                self.ai_completed, self.ai_progress,
                "AI智能配送（智能调度）", self.COLOR_AI, False
            )
            self.draw_stats()
        
        pygame.display.flip()
    
    def handle_events(self):
        """事件处理"""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    return False
                elif event.key == pygame.K_SPACE:
                    self.start()
                elif event.key == pygame.K_r:
                    self.is_running = False
                    self.traditional_orders = []
                    self.ai_orders = []
        return True
    
    def run(self):
        """主循环"""
        running = True
        while running:
            dt = self.clock.tick(60) / 1000.0
            running = self.handle_events()
            self.update(dt)
            self.render()
        pygame.quit()

if __name__ == "__main__":
    app = EliteVisualizer()
    app.run()
