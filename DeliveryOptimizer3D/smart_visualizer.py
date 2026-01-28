"""
智能配送可视化 - 美团/饿了么风格
"""
import pygame
import random
import math
from smart_optimizer import SmartOptimizer, Order

class SmartVisualizer:
    def __init__(self):
        pygame.init()
        self.width = 1600
        self.height = 900
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption("智能配送路径优化系统")
        
        # 字体
        import os
        font_path = r"C:\Windows\Fonts\msyh.ttc"
        if os.path.exists(font_path):
            self.font_title = pygame.font.Font(font_path, 48)
            self.font_large = pygame.font.Font(font_path, 32)
            self.font_medium = pygame.font.Font(font_path, 24)
            self.font_small = pygame.font.Font(font_path, 18)
        
        # 配色
        self.BG = (250, 250, 252)
        self.CARD_BG = (255, 255, 255)
        self.TEXT_PRIMARY = (30, 30, 35)
        self.TEXT_SECONDARY = (140, 140, 150)
        self.COLOR_TRADITIONAL = (255, 59, 48)
        self.COLOR_AI = (52, 199, 89)
        self.COLOR_NEW = (255, 149, 0)
        self.BUILDING_COLOR = (245, 245, 247)
        self.BUILDING_STROKE = (200, 200, 210)
        
        # 优化器
        self.optimizer = SmartOptimizer()
        
        # 数据
        self.traditional_orders = []
        self.ai_orders = []
        self.traditional_completed = 0
        self.ai_completed = 0
        self.traditional_progress = 0.0
        self.ai_progress = 0.0
        
        # 动画
        self.is_running = False
        self.speed = 0.3  # 降低速度，更平滑
        self.new_order_timer = 0
        self.new_order_interval = 6.0  # 增加间隔
        self.next_order_id = 1
        self.time = 0
        
        # 机器人实际位置（用于平滑过渡）
        self.traditional_robot_x = None
        self.traditional_robot_y = None
        self.ai_robot_x = None
        self.ai_robot_y = None
        
        # 布局
        padding = 60
        panel_width = (self.width - padding * 3) // 2
        self.left_panel = pygame.Rect(padding, 180, panel_width, self.height - 280)
        self.right_panel = pygame.Rect(padding * 2 + panel_width, 180, panel_width, self.height - 280)
        
        # 楼栋配置
        self.building_width = 90
        self.building_spacing = 130
        self.floor_height = 22
        self.num_floors = 18
        self.num_buildings = 3
        
        self.clock = pygame.time.Clock()
        
        print("智能配送路径优化系统")
        print("空格 - 开始 | R - 重置 | ESC - 退出")
    
    def generate_orders(self, count):
        """生成订单 - 让订单分布更分散，增加传统模式的楼栋切换"""
        orders = []
        for _ in range(count):
            # 随机分布，让传统模式更容易跨楼栋
            order = Order(
                id=self.next_order_id,
                building=random.randint(1, self.num_buildings),
                floor=random.randint(1, self.num_floors),
                unit=random.randint(1, 2),
                room=f"{random.randint(1, 4):02d}",
                timestamp=self.time
            )
            orders.append(order)
            self.next_order_id += 1
        return orders
    
    def start(self):
        """开始配送"""
        initial = self.generate_orders(15)  # 更多初始订单
        
        # 传统：按顺序（不优化）
        self.traditional_orders = self.optimizer.optimize_traditional(initial)
        
        # AI：智能优化（按楼栋分组）
        self.ai_orders = self.optimizer.optimize_smart(initial)
        
        self.traditional_completed = 0
        self.ai_completed = 0
        self.traditional_progress = 0.0
        self.ai_progress = 0.0
        self.is_running = True
        self.new_order_timer = 0
        
        # 计算预估时间
        t_time = self.optimizer.calculate_total_time_traditional(self.traditional_orders)
        a_time = self.optimizer.calculate_total_time_smart(self.ai_orders)
        improvement = (t_time - a_time) / t_time * 100 if t_time > 0 else 0
        
        print(f"\n========== 开始配送 ==========")
        print(f"初始订单: {len(initial)}单")
        print(f"传统模式: 每单回食堂拿餐（低效）")
        print(f"  路线: {[f'{o.building}-{o.floor}' for o in self.traditional_orders]}")
        print(f"AI模式: 按楼栋批量配送（高效）")
        print(f"  路线: {[f'{o.building}-{o.floor}' for o in self.ai_orders]}")
        print(f"预估 - 传统: {t_time:.0f}秒, AI: {a_time:.0f}秒, 提升: {improvement:.1f}%")
        print("="*40)
    
    def update(self, dt):
        """更新"""
        if not self.is_running:
            return
        
        self.time += dt
        
        # 生成新订单
        self.new_order_timer += dt
        if self.new_order_timer >= self.new_order_interval:
            self.new_order_timer = 0
            new_order = self.generate_orders(1)[0]
            
            # 传统：加到末尾
            self.traditional_orders.append(new_order)
            
            # AI：智能插入并重新优化
            self.ai_orders = self.optimizer.insert_new_order_smart(
                self.ai_orders, 
                self.ai_completed,
                new_order
            )
            
            print(f"新订单 #{new_order.id}: {new_order.building}号楼{new_order.floor}层")
            print(f"  传统加到末尾，AI智能插入到最优位置")
        
        # 更新传统配送（平滑增长）
        if self.traditional_completed < len(self.traditional_orders):
            self.traditional_progress += dt * self.speed
            if self.traditional_progress >= 1.0:
                self.traditional_progress = 0.0
                self.traditional_completed += 1
                print(f"传统完成: {self.traditional_completed}/{len(self.traditional_orders)}")
        
        # 更新AI配送（平滑增长）
        if self.ai_completed < len(self.ai_orders):
            self.ai_progress += dt * self.speed
            if self.ai_progress >= 1.0:
                self.ai_progress = 0.0
                self.ai_completed += 1
                print(f"AI完成: {self.ai_completed}/{len(self.ai_orders)}")
        
        # 检查完成
        if (self.traditional_completed >= len(self.traditional_orders) and 
            self.ai_completed >= len(self.ai_orders)):
            self.is_running = False
            t_time = self.optimizer.calculate_total_time_traditional(self.traditional_orders)
            a_time = self.optimizer.calculate_total_time_smart(self.ai_orders)
            improvement = (t_time - a_time) / t_time * 100 if t_time > 0 else 0
            
            print(f"\n========== 配送完成 ==========")
            print(f"传统模式: {t_time:.0f}秒 ({len(self.traditional_orders)}单) - 每单回食堂")
            print(f"AI模式: {a_time:.0f}秒 ({len(self.ai_orders)}单) - 批量配送")
            print(f"效率提升: {improvement:.1f}%")
            print(f"节省时间: {t_time - a_time:.0f}秒")
            print("="*40)
    
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
        """缓动函数 - 三次贝塞尔曲线，避免闪现"""
        # 使用ease-in-out效果
        if t < 0.5:
            return 4 * t * t * t
        else:
            return 1 - pow(-2 * t + 2, 3) / 2
    
    def get_robot_pos(self, orders, completed, progress, panel, is_traditional=False):
        """
        计算机器人位置 - 使用缓动函数避免闪现
        """
        if completed >= len(orders):
            return None
        
        # 使用平滑插值
        t = self.smooth(progress)
        current = orders[completed]
        
        if completed == 0:
            # 第一单：从食堂出发
            cx, cy = self.get_canteen_pos(panel)
            tx, ty = self.get_order_pos(current, panel)
            x = cx + (tx - cx) * t
            y = cy + (ty - cy) * t
            return x, y
        else:
            # 后续订单
            prev = orders[completed - 1]
            px, py = self.get_order_pos(prev, panel)
            curr_x, curr_y = self.get_order_pos(current, panel)
            
            # 传统模式：每单都回食堂
            # AI模式：只有换楼栋才回食堂
            need_canteen = is_traditional or (prev.building != current.building)
            
            if need_canteen:
                # 经过食堂的三段式移动
                canteen_x, canteen_y = self.get_canteen_pos(panel)
                
                if t < 0.35:
                    # 第一段：去食堂
                    t1 = t / 0.35
                    t1 = self.smooth(t1)  # 再次平滑
                    x = px + (canteen_x - px) * t1
                    y = py + (canteen_y - py) * t1
                elif t < 0.45:
                    # 第二段：在食堂（停留）
                    x, y = canteen_x, canteen_y
                else:
                    # 第三段：从食堂到目标
                    t2 = (t - 0.45) / 0.55
                    t2 = self.smooth(t2)  # 再次平滑
                    x = canteen_x + (curr_x - canteen_x) * t2
                    y = canteen_y + (curr_y - canteen_y) * t2
                
                return x, y
            else:
                # AI模式：同楼栋内直接移动
                x = px + (curr_x - px) * t
                y = py + (curr_y - py) * t
                return x, y
            
            # 传统模式：每单都回食堂
            # AI模式：只有换楼栋才回食堂
            need_canteen = is_traditional or (prev.building != current.building)
            
            if need_canteen:
                # 必须经过食堂：prev -> 食堂 -> current
                canteen_x, canteen_y = self.get_canteen_pos(panel)
                
                if t < 0.4:
                    # 去食堂
                    t2 = t / 0.4
                    return px + (canteen_x - px) * t2, py + (canteen_y - py) * t2
                elif t < 0.5:
                    # 在食堂取餐
                    return canteen_x, canteen_y
                else:
                    # 从食堂到新订单
                    t2 = (t - 0.5) / 0.5
                    return canteen_x + (cx - canteen_x) * t2, canteen_y + (cy - canteen_y) * t2
            else:
                # AI模式：同楼栋内直接移动（不回食堂）
                return px + (cx - px) * t, py + (cy - py) * t
    
    def draw_panel(self, panel, orders, completed, progress, title, color):
        """绘制面板"""
        # 背景
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
        
        # 订单
        for i, order in enumerate(orders):
            x, y = self.get_order_pos(order, panel)
            
            if i < completed:
                # 已完成
                pygame.draw.circle(self.screen, (180, 180, 180), (int(x), int(y)), 6)
            elif order.timestamp > 0.5:
                # 新订单闪烁
                alpha = (math.sin(self.time * 5) + 1) / 2
                size = 8 + alpha * 2
                pygame.draw.circle(self.screen, self.COLOR_NEW, (int(x), int(y)), int(size))
            else:
                # 待配送
                pygame.draw.circle(self.screen, color, (int(x), int(y)), 8)
        
        # 机器人
        robot_pos = self.get_robot_pos(orders, completed, progress, panel, 
                                       is_traditional=(title == "传统配送"))
        if robot_pos:
            rx, ry = robot_pos
            
            # 绘制机器人阴影
            shadow_surf = pygame.Surface((32, 32), pygame.SRCALPHA)
            pygame.draw.circle(shadow_surf, (0, 0, 0, 40), (16, 16), 14)
            self.screen.blit(shadow_surf, (int(rx) - 16 + 2, int(ry) - 16 + 2))
            
            # 绘制机器人主体
            pygame.draw.circle(self.screen, color, (int(rx), int(ry)), 14)
            pygame.draw.circle(self.screen, self.CARD_BG, (int(rx), int(ry)), 12)
            
            # 绘制方向箭头
            if completed < len(orders):
                current = orders[completed]
                if completed == 0:
                    cx, cy = self.get_canteen_pos(panel)
                    tx, ty = self.get_order_pos(current, panel)
                else:
                    prev = orders[completed - 1]
                    cx, cy = self.get_order_pos(prev, panel)
                    tx, ty = self.get_order_pos(current, panel)
                
                # 判断方向
                dx, dy = tx - cx, ty - cy
                if abs(dx) > abs(dy):
                    arrow = "→" if dx > 0 else "←"
                else:
                    arrow = "↑" if dy < 0 else "↓"
                
                arrow_surf = self.font_medium.render(arrow, True, color)
                arrow_rect = arrow_surf.get_rect(center=(rx, ry))
                self.screen.blit(arrow_surf, arrow_rect)
        
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
        title = self.font_title.render("智能配送路径优化", True, self.TEXT_PRIMARY)
        self.screen.blit(title, (60, 40))
        
        subtitle = "传统按序配送 vs AI智能规划"
        subtitle_surf = self.font_medium.render(subtitle, True, self.TEXT_SECONDARY)
        self.screen.blit(subtitle_surf, (60, 95))
    
    def draw_stats(self):
        """绘制统计"""
        y = self.height - 80
        
        t_time = self.optimizer.calculate_total_time_traditional(
            self.traditional_orders[:self.traditional_completed]
        )
        a_time = self.optimizer.calculate_total_time_smart(
            self.ai_orders[:self.ai_completed]
        )
        
        left_text = f"传统: {t_time:.0f}秒 (每单回食堂)"
        left_surf = self.font_medium.render(left_text, True, self.COLOR_TRADITIONAL)
        self.screen.blit(left_surf, (self.left_panel.x, y))
        
        right_text = f"AI: {a_time:.0f}秒 (批量配送)"
        right_surf = self.font_medium.render(right_text, True, self.COLOR_AI)
        self.screen.blit(right_surf, (self.right_panel.x, y))
        
        if t_time > 0:
            improvement = (t_time - a_time) / t_time * 100
            imp_text = f"效率提升: {improvement:.1f}%"
            imp_surf = self.font_medium.render(imp_text, True, self.COLOR_AI)
            self.screen.blit(imp_surf, (self.width // 2 - 80, y))
    
    def render(self):
        """渲染"""
        self.screen.fill(self.BG)
        self.draw_header()
        
        if self.traditional_orders or self.ai_orders:
            self.draw_panel(
                self.left_panel, self.traditional_orders,
                self.traditional_completed, self.traditional_progress,
                "传统配送", self.COLOR_TRADITIONAL
            )
            self.draw_panel(
                self.right_panel, self.ai_orders,
                self.ai_completed, self.ai_progress,
                "AI智能配送", self.COLOR_AI
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
    app = SmartVisualizer()
    app.run()
