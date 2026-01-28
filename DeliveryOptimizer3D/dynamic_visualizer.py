"""
动态配送路径优化可视化
展示实时订单插入和路径重规划
"""
import pygame
import random
import math
from dynamic_optimizer import DynamicOptimizer, Order

class DynamicVisualizer:
    def __init__(self):
        pygame.init()
        self.width = 1600
        self.height = 900
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption("AI动态配送路径优化")
        
        # 加载字体
        import os
        font_paths = [
            r"C:\Windows\Fonts\msyh.ttc",
            r"C:\Windows\Fonts\simhei.ttf",
        ]
        
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    self.font_title = pygame.font.Font(font_path, 48)
                    self.font_large = pygame.font.Font(font_path, 32)
                    self.font_medium = pygame.font.Font(font_path, 24)
                    self.font_small = pygame.font.Font(font_path, 18)
                    break
                except:
                    continue
        
        # 配色
        self.BG_COLOR = (250, 250, 252)
        self.CARD_BG = (255, 255, 255)
        self.SHADOW = (0, 0, 0, 15)
        self.TEXT_PRIMARY = (30, 30, 35)
        self.TEXT_SECONDARY = (140, 140, 150)
        
        self.COLOR_TRADITIONAL = (255, 59, 48)    # 红色 - 传统
        self.COLOR_AI = (52, 199, 89)             # 绿色 - AI
        self.COLOR_NEW_ORDER = (255, 149, 0)      # 橙色 - 新订单
        
        self.BUILDING_COLOR = (245, 245, 247)
        self.BUILDING_STROKE = (200, 200, 210)
        
        # 优化器
        self.optimizer = DynamicOptimizer()
        
        # 数据
        self.initial_orders = []
        self.traditional_orders = []  # 传统模式：固定顺序
        self.ai_orders = []            # AI模式：动态调整
        
        self.traditional_completed = []
        self.ai_completed = []
        
        self.traditional_current_idx = 0
        self.ai_current_idx = 0
        
        self.traditional_time = 0
        self.ai_time = 0
        
        # 动画
        self.is_animating = False
        self.animation_speed = 0.008  # 降低速度，更平滑
        self.time = 0
        
        # 机器人位置（用于平滑移动）
        self.traditional_robot_pos = None
        self.ai_robot_pos = None
        
        # 新订单生成
        self.next_order_id = 1
        self.new_order_timer = 0
        self.new_order_interval = 2.5  # 每2.5秒生成新订单（更频繁）
        
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
        
        print("AI动态配送路径优化系统")
        print("空格 - 开始配送 | R - 重置")
    
    def generate_initial_orders(self):
        """生成初始订单"""
        count = 12  # 增加初始订单数量
        orders = []
        
        for i in range(count):
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
    
    def generate_new_order(self):
        """生成新订单"""
        order = Order(
            id=self.next_order_id,
            building=random.randint(1, self.num_buildings),
            floor=random.randint(1, self.num_floors),
            unit=random.randint(1, 2),
            room=f"{random.randint(1, 4):02d}",
            timestamp=self.time
        )
        self.next_order_id += 1
        return order
    
    def start_delivery(self):
        """开始配送"""
        self.initial_orders = self.generate_initial_orders()
        
        # 传统模式：一次取所有订单，按生成顺序配送（不优化）
        # 模拟传统外卖员：接单后按时间顺序送，不考虑路线优化
        self.traditional_orders = self.initial_orders.copy()
        
        # AI模式：智能分批+动态优化
        # 模拟美团/饿了么：智能路线规划，就近配送
        self.ai_orders = self.optimizer.optimize_greedy(self.initial_orders.copy())
        
        self.traditional_completed = []
        self.ai_completed = []
        self.traditional_current_idx = 0
        self.ai_current_idx = 0
        self.traditional_time = 0
        self.ai_time = 0
        
        # 初始化机器人位置（食堂）
        self.traditional_robot_pos = None
        self.ai_robot_pos = None
        
        self.is_animating = True
        self.new_order_timer = 0
        
        print(f"\n开始配送 - 初始订单: {len(self.initial_orders)}")
        print("传统模式：按接单顺序配送")
        print("AI模式：智能路线规划")
    
    def update_delivery(self, dt):
        """更新配送状态"""
        if not self.is_animating:
            return
        
        # 生成新订单
        self.new_order_timer += dt
        if self.new_order_timer >= self.new_order_interval:
            self.new_order_timer = 0
            new_order = self.generate_new_order()
            
            # 传统模式：直接加到队列末尾（不优化）
            self.traditional_orders.append(new_order)
            
            # AI模式：智能插入到最优位置
            if self.ai_current_idx < len(self.ai_orders):
                current_idx_int = int(self.ai_current_idx)
                if current_idx_int < len(self.ai_orders):
                    current = self.ai_orders[current_idx_int]
                    remaining = self.ai_orders[current_idx_int + 1:]
                    new_route = self.optimizer.replan_route(
                        self.ai_completed, current, remaining, [new_order]
                    )
                    self.ai_orders = self.ai_completed + [current] + new_route
                else:
                    self.ai_orders.append(new_order)
            else:
                self.ai_orders.append(new_order)
            
            print(f"新订单 #{new_order.id}: {new_order.building}号楼 {new_order.floor}层")
        
        # 更新传统模式（匀速配送）
        if self.traditional_current_idx < len(self.traditional_orders):
            self.traditional_current_idx += self.animation_speed
            completed_count = int(self.traditional_current_idx)
            if completed_count > len(self.traditional_completed) and completed_count <= len(self.traditional_orders):
                for i in range(len(self.traditional_completed), completed_count):
                    if i < len(self.traditional_orders):
                        self.traditional_completed.append(self.traditional_orders[i])
        
        # 更新AI模式（匀速配送）
        if self.ai_current_idx < len(self.ai_orders):
            self.ai_current_idx += self.animation_speed
            completed_count = int(self.ai_current_idx)
            if completed_count > len(self.ai_completed) and completed_count <= len(self.ai_orders):
                for i in range(len(self.ai_completed), completed_count):
                    if i < len(self.ai_orders):
                        self.ai_completed.append(self.ai_orders[i])
        
        # 计算时间
        if self.traditional_completed:
            self.traditional_time = self.optimizer.calculate_total_time(self.traditional_completed)
        if self.ai_completed:
            self.ai_time = self.optimizer.calculate_total_time(self.ai_completed)
        
        # 检查是否完成
        if (self.traditional_current_idx >= len(self.traditional_orders) and 
            self.ai_current_idx >= len(self.ai_orders)):
            self.is_animating = False
            improvement = ((self.traditional_time - self.ai_time) / self.traditional_time * 100) if self.traditional_time > 0 else 0
            print(f"\n配送完成!")
            print(f"传统模式: {self.traditional_time:.0f}秒 ({len(self.traditional_orders)}单)")
            print(f"AI模式: {self.ai_time:.0f}秒 ({len(self.ai_orders)}单)")
            print(f"效率提升: {improvement:.1f}%")
    
    def draw_shadow(self, rect, offset=4):
        """绘制阴影"""
        shadow_rect = rect.move(offset, offset)
        shadow_surf = pygame.Surface((shadow_rect.width, shadow_rect.height), pygame.SRCALPHA)
        pygame.draw.rect(shadow_surf, self.SHADOW, shadow_surf.get_rect(), border_radius=12)
        self.screen.blit(shadow_surf, shadow_rect)
    
    def get_building_position(self, building, panel_rect):
        """获取楼栋位置"""
        center_x = panel_rect.centerx
        start_x = center_x - (self.num_buildings - 1) * self.building_spacing // 2
        x = start_x + (building - 1) * self.building_spacing
        y = panel_rect.bottom - 40
        return x, y
    
    def get_canteen_position(self, panel_rect):
        """获取食堂位置（在最左侧楼栋左边）"""
        first_building_x, first_building_y = self.get_building_position(1, panel_rect)
        canteen_x = first_building_x - self.building_spacing - 20
        canteen_y = first_building_y
        return canteen_x, canteen_y
    
    def get_order_position(self, order, panel_rect):
        """获取订单位置"""
        bx, by = self.get_building_position(order.building, panel_rect)
        x = bx + (22 if order.unit == 1 else -22)
        y = by - order.floor * self.floor_height
        return x, y
    
    def draw_panel(self, panel_rect, orders, completed, current_idx, title, color):
        """绘制面板"""
        # 阴影和背景
        self.draw_shadow(panel_rect)
        pygame.draw.rect(self.screen, self.CARD_BG, panel_rect, border_radius=12)
        
        # 标题
        title_surf = self.font_medium.render(title, True, color)
        title_rect = title_surf.get_rect(x=panel_rect.x + 24, y=panel_rect.y + 20)
        self.screen.blit(title_surf, title_rect)
        
        # 绘制食堂
        self.draw_canteen(panel_rect, color)
        
        # 绘制楼栋
        for i in range(1, self.num_buildings + 1):
            self.draw_building(i, panel_rect)
        
        # 绘制订单
        for order in orders:
            x, y = self.get_order_position(order, panel_rect)
            
            # 判断订单状态
            is_completed = order in completed
            is_new = order.timestamp > 0.5  # 新订单
            
            if is_completed:
                # 已完成 - 灰色
                pygame.draw.circle(self.screen, (180, 180, 180), (int(x), int(y)), 6)
            elif is_new and not is_completed:
                # 新订单 - 橙色闪烁
                alpha = (math.sin(self.time * 5) + 1) / 2
                size = 8 + alpha * 2
                pygame.draw.circle(self.screen, self.COLOR_NEW_ORDER, (int(x), int(y)), int(size))
            else:
                # 待配送
                pygame.draw.circle(self.screen, color, (int(x), int(y)), 8)
        
        # 绘制机器人
        if current_idx < len(orders):
            self.draw_robot(orders, panel_rect, color, current_idx)
    
    def draw_canteen(self, panel_rect, color):
        """绘制食堂"""
        x, y = self.get_canteen_position(panel_rect)
        
        # 食堂建筑（较小的矩形）
        canteen_width = 70
        canteen_height = 60
        canteen_rect = pygame.Rect(
            x - canteen_width // 2,
            y - canteen_height,
            canteen_width,
            canteen_height
        )
        
        # 绘制食堂建筑
        pygame.draw.rect(self.screen, (255, 248, 240), canteen_rect, border_radius=4)
        pygame.draw.rect(self.screen, self.BUILDING_STROKE, canteen_rect, 2, border_radius=4)
        
        # 绘制食堂图标 🍱
        icon_surf = self.font_large.render("🍱", True, self.TEXT_PRIMARY)
        icon_rect = icon_surf.get_rect(center=(x, y - canteen_height // 2 + 5))
        self.screen.blit(icon_surf, icon_rect)
        
        # 绘制"取餐点"标签
        label = self.font_small.render("取餐点", True, self.TEXT_SECONDARY)
        label_rect = label.get_rect(centerx=x, top=y + 8)
        self.screen.blit(label, label_rect)
        
        # 绘制取餐位置标记（小圆点）
        pygame.draw.circle(self.screen, color, (int(x), int(y)), 6)
    
    def draw_building(self, building_num, panel_rect):
        """绘制楼栋"""
        x, y = self.get_building_position(building_num, panel_rect)
        
        building_rect = pygame.Rect(
            x - self.building_width // 2,
            y - self.num_floors * self.floor_height,
            self.building_width,
            self.num_floors * self.floor_height
        )
        
        pygame.draw.rect(self.screen, self.BUILDING_COLOR, building_rect, border_radius=4)
        pygame.draw.rect(self.screen, self.BUILDING_STROKE, building_rect, 1, border_radius=4)
        
        for floor in range(1, self.num_floors):
            floor_y = y - floor * self.floor_height
            pygame.draw.line(self.screen, self.BUILDING_STROKE,
                           (building_rect.left + 2, floor_y),
                           (building_rect.right - 2, floor_y), 1)
        
        label = self.font_small.render(f"{building_num}号楼", True, self.TEXT_SECONDARY)
        label_rect = label.get_rect(centerx=x, top=y + 8)
        self.screen.blit(label, label_rect)
    
    def draw_robot(self, orders, panel_rect, color, progress):
        """绘制机器人 - 平滑连贯的移动"""
        if progress >= len(orders):
            return
        
        idx = int(progress)
        t = progress - idx  # 0-1之间的插值
        
        if idx >= len(orders):
            return
        
        current = orders[idx]
        
        # 计算当前位置
        if idx == 0:
            # 第一个订单：从食堂出发
            canteen_x, canteen_y = self.get_canteen_position(panel_rect)
            target_x, target_y = self.get_order_position(current, panel_rect)
            
            # 平滑插值
            x = canteen_x + (target_x - canteen_x) * self.smooth_step(t)
            y = canteen_y + (target_y - canteen_y) * self.smooth_step(t)
            
            # 判断方向
            if abs(target_x - canteen_x) > abs(target_y - canteen_y):
                status = "→"
            else:
                status = "↑" if target_y < canteen_y else "↓"
        else:
            # 后续订单
            prev = orders[idx - 1]
            prev_x, prev_y = self.get_order_position(prev, panel_rect)
            curr_x, curr_y = self.get_order_position(current, panel_rect)
            
            need_canteen = prev.building != current.building
            
            if need_canteen:
                # 需要回食堂取餐
                canteen_x, canteen_y = self.get_canteen_position(panel_rect)
                
                # 分3段：prev -> canteen -> current
                if t < 0.4:
                    # 去食堂
                    t_local = t / 0.4
                    x = prev_x + (canteen_x - prev_x) * self.smooth_step(t_local)
                    y = prev_y + (canteen_y - prev_y) * self.smooth_step(t_local)
                    status = "→"
                elif t < 0.5:
                    # 在食堂取餐
                    x, y = canteen_x, canteen_y
                    status = "🍱"
                else:
                    # 去新订单
                    t_local = (t - 0.5) / 0.5
                    x = canteen_x + (curr_x - canteen_x) * self.smooth_step(t_local)
                    y = canteen_y + (curr_y - canteen_y) * self.smooth_step(t_local)
                    if abs(curr_x - canteen_x) > abs(curr_y - canteen_y):
                        status = "→"
                    else:
                        status = "↑" if curr_y < canteen_y else "↓"
            else:
                # 同楼栋内移动
                x = prev_x + (curr_x - prev_x) * self.smooth_step(t)
                y = prev_y + (curr_y - prev_y) * self.smooth_step(t)
                
                # 判断方向
                if abs(curr_x - prev_x) > abs(curr_y - prev_y):
                    status = "→"
                elif curr_y < prev_y:
                    status = "↑"
                elif curr_y > prev_y:
                    status = "↓"
                else:
                    status = "→"
        
        # 绘制机器人（带阴影效果）
        # 阴影
        pygame.draw.circle(self.screen, (0, 0, 0, 30), (int(x) + 2, int(y) + 2), 14)
        # 外圈
        pygame.draw.circle(self.screen, color, (int(x), int(y)), 14)
        # 内圈
        pygame.draw.circle(self.screen, self.CARD_BG, (int(x), int(y)), 12)
        
        # 状态图标
        icon_surf = self.font_medium.render(status, True, color)
        icon_rect = icon_surf.get_rect(center=(x, y))
        self.screen.blit(icon_surf, icon_rect)
    
    def smooth_step(self, t):
        """平滑插值函数 - 缓入缓出"""
        return t * t * (3 - 2 * t)
    
    def draw_header(self):
        """绘制顶部"""
        title = self.font_title.render("AI动态配送路径优化", True, self.TEXT_PRIMARY)
        title_rect = title.get_rect(x=60, y=40)
        self.screen.blit(title, title_rect)
        
        subtitle = "实时订单插入 • 智能路径重规划"
        subtitle_surf = self.font_medium.render(subtitle, True, self.TEXT_SECONDARY)
        subtitle_rect = subtitle_surf.get_rect(x=60, y=95)
        self.screen.blit(subtitle_surf, subtitle_rect)
    
    def draw_stats(self):
        """绘制统计"""
        stats_y = self.height - 80
        
        # 左侧
        left_text = f"传统模式: {self.traditional_time:.0f}秒 | 订单: {len(self.traditional_orders)}"
        left_surf = self.font_medium.render(left_text, True, self.COLOR_TRADITIONAL)
        self.screen.blit(left_surf, (self.left_panel.x, stats_y))
        
        # 右侧
        right_text = f"AI优化: {self.ai_time:.0f}秒 | 订单: {len(self.ai_orders)}"
        right_surf = self.font_medium.render(right_text, True, self.COLOR_AI)
        self.screen.blit(right_surf, (self.right_panel.x, stats_y))
    
    def handle_events(self):
        """处理事件"""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    return False
                elif event.key == pygame.K_SPACE:
                    self.start_delivery()
                elif event.key == pygame.K_r:
                    self.is_animating = False
                    self.traditional_orders = []
                    self.ai_orders = []
        
        return True
    
    def update(self):
        """更新"""
        dt = self.clock.tick(60) / 1000.0
        self.time += dt
        
        if self.is_animating:
            self.update_delivery(dt)
    
    def render(self):
        """渲染"""
        self.screen.fill(self.BG_COLOR)
        self.draw_header()
        
        if self.traditional_orders or self.ai_orders:
            self.draw_panel(
                self.left_panel,
                self.traditional_orders,
                self.traditional_completed,
                self.traditional_current_idx,
                "传统配送（按顺序）",
                self.COLOR_TRADITIONAL
            )
            
            self.draw_panel(
                self.right_panel,
                self.ai_orders,
                self.ai_completed,
                self.ai_current_idx,
                "AI智能配送（动态优化）",
                self.COLOR_AI
            )
            
            self.draw_stats()
        
        pygame.display.flip()
    
    def run(self):
        """主循环"""
        running = True
        while running:
            running = self.handle_events()
            self.update()
            self.render()
        
        pygame.quit()

if __name__ == "__main__":
    app = DynamicVisualizer()
    app.run()
