"""
高峰期
"""
import pygame
import random
import math
from optimizer import DeliveryOptimizer, Order

class ModernVisualizer:
    def __init__(self):
        pygame.init()
        self.width = 1600
        self.height = 900
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption("高峰期智能配送路径优化")
        
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
        
        # 现代配色 - 简洁优雅
        self.BG_COLOR = (250, 250, 252)  # 浅灰背景
        self.CARD_BG = (255, 255, 255)   # 白色卡片
        self.SHADOW = (0, 0, 0, 15)      # 轻微阴影
        self.DIVIDER = (230, 230, 235)   # 分隔线
        self.TEXT_PRIMARY = (30, 30, 35) # 主文字
        self.TEXT_SECONDARY = (140, 140, 150) # 次要文字
        
        # 品牌色
        self.COLOR_ORIGINAL = (255, 59, 48)    # 红色 - 传统
        self.COLOR_OPTIMIZED = (52, 199, 89)   # 绿色 - 优化
        self.COLOR_ACCENT = (0, 122, 255)      # 蓝色 - 强调
        
        self.BUILDING_COLOR = (245, 245, 247)
        self.BUILDING_STROKE = (200, 200, 210)
        
        # 数据
        self.optimizer = DeliveryOptimizer()
        self.orders = []
        self.optimized_orders = []
        self.result = None
        
        # 动画
        self.animation_progress = 0
        self.is_animating = False
        self.animation_speed = 0.01
        self.time = 0
        
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
        print("空格 - 生成订单 | 回车 - 开始对比 | R - 重置")
    
    def generate_orders(self):
        """生成订单 - 制造极度混乱的原始顺序"""
        count = 30  # 更多订单
        self.orders = []
        
        # 确保每个楼栋都有订单
        temp_orders = []
        orders_per_building = count // 3
        
        for building in range(1, 4):
            for i in range(orders_per_building):
                order = Order(
                    id=len(temp_orders) + 1,
                    building=building,
                    floor=random.randint(1, self.num_floors),
                    unit=random.randint(1, 2),
                    room=f"{random.randint(1, 4):02d}"
                )
                temp_orders.append(order)
        
        # 按楼栋分组
        buildings = [[], [], []]
        for order in temp_orders:
            buildings[order.building - 1].append(order)
        
        # 每个楼栋内制造最差顺序：高低楼层完全交替
        for building_orders in buildings:
            building_orders.sort(key=lambda x: x.floor)
            result = []
            left = 0
            right = len(building_orders) - 1
            while left <= right:
                if len(result) % 2 == 0:
                    result.append(building_orders[right])
                    right -= 1
                else:
                    result.append(building_orders[left])
                    left += 1
            building_orders.clear()
            building_orders.extend(result)
        
        # 交替取不同楼栋的订单，制造频繁跨楼栋
        self.orders = []
        for i in range(orders_per_building):
            for building_orders in buildings:
                if i < len(building_orders):
                    self.orders.append(building_orders[i])
        
        self.result = self.optimizer.optimize(self.orders)
        self.optimized_orders = self.result['optimized']['route']
        
        print(f"\n订单: {len(self.orders)} | 提升: {self.result['improvement']:.1f}%")
    
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
    
    def get_order_position(self, order, panel_rect):
        """获取订单位置"""
        bx, by = self.get_building_position(order.building, panel_rect)
        x = bx + (22 if order.unit == 1 else -22)
        y = by - order.floor * self.floor_height
        return x, y
    
    def draw_card(self, rect, title, color):
        """绘制卡片"""
        # 阴影
        self.draw_shadow(rect)
        
        # 卡片背景
        pygame.draw.rect(self.screen, self.CARD_BG, rect, border_radius=12)
        
        # 标题 - 使用颜色
        title_surf = self.font_medium.render(title, True, color)
        title_rect = title_surf.get_rect(x=rect.x + 24, y=rect.y + 20)
        self.screen.blit(title_surf, title_rect)
    
    def draw_panel(self, panel_rect, orders, title, color, progress=None):
        """绘制面板"""
        self.draw_card(panel_rect, title, color)
        
        # 绘制楼栋
        for i in range(1, self.num_buildings + 1):
            self.draw_building(i, panel_rect)
        
        # 绘制订单
        for idx, order in enumerate(orders):
            x, y = self.get_order_position(order, panel_rect)
            
            # 订单点 - 实心圆
            pygame.draw.circle(self.screen, color, (int(x), int(y)), 8)
        
        # 绘制机器人
        if progress is not None and len(orders) > 0:
            self.draw_robot(orders, panel_rect, color, progress)
    
    def draw_building(self, building_num, panel_rect):
        """绘制楼栋"""
        x, y = self.get_building_position(building_num, panel_rect)
        
        # 楼栋主体
        building_rect = pygame.Rect(
            x - self.building_width // 2,
            y - self.num_floors * self.floor_height,
            self.building_width,
            self.num_floors * self.floor_height
        )
        
        # 填充
        pygame.draw.rect(self.screen, self.BUILDING_COLOR, building_rect, border_radius=4)
        
        # 边框
        pygame.draw.rect(self.screen, self.BUILDING_STROKE, building_rect, 1, border_radius=4)
        
        # 楼层线
        for floor in range(1, self.num_floors):
            floor_y = y - floor * self.floor_height
            pygame.draw.line(self.screen, self.BUILDING_STROKE,
                           (building_rect.left + 2, floor_y),
                           (building_rect.right - 2, floor_y), 1)
        
        # 楼栋编号
        label = self.font_small.render(f"{building_num}号楼", True, self.TEXT_SECONDARY)
        label_rect = label.get_rect(centerx=x, top=y + 8)
        self.screen.blit(label, label_rect)
    
    def draw_robot(self, orders, panel_rect, color, progress):
        """绘制机器人"""
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
                status = "↓"
            elif t < segment * 2:
                t_local = (t - segment) / segment
                x, y = bx1 + (bx2 - bx1) * t_local, by1
                status = "→"
            elif t < segment * 3:
                t_local = (t - segment * 2) / segment
                x, y = x2, by2 + (y2 - by2) * t_local
                status = "↑"
            else:
                x, y = x2, y2
                status = "✓"
        else:
            x = x1 + (x2 - x1) * t
            y = y1 + (y2 - y1) * t
            if current.floor != next_order.floor:
                status = "↑" if next_order.floor > current.floor else "↓"
            else:
                status = "→"
        
        # 机器人圆形
        pygame.draw.circle(self.screen, color, (int(x), int(y)), 14)
        pygame.draw.circle(self.screen, self.CARD_BG, (int(x), int(y)), 12)
        
        # 状态图标
        icon_surf = self.font_medium.render(status, True, color)
        icon_rect = icon_surf.get_rect(center=(x, y))
        self.screen.blit(icon_surf, icon_rect)
    
    def draw_header(self):
        """绘制顶部"""
        # 标题
        title = self.font_title.render("智能配送路径优化", True, self.TEXT_PRIMARY)
        title_rect = title.get_rect(x=60, y=40)
        self.screen.blit(title, title_rect)
        
        # 副标题 - 只在有结果时显示
        if self.result:
            subtitle = f"效率提升 {self.result['improvement']:.1f}%  •  节省 {self.result['original']['time'] - self.result['optimized']['time']:.0f} 秒"
            subtitle_surf = self.font_medium.render(subtitle, True, self.TEXT_SECONDARY)
            subtitle_rect = subtitle_surf.get_rect(x=60, y=95)
            self.screen.blit(subtitle_surf, subtitle_rect)
    
    def draw_stats(self):
        """绘制统计"""
        if not self.result:
            return
        
        stats_y = self.height - 80
        
        # 左侧统计
        left_text = f"传统模式: {self.result['original']['time']:.0f}秒"
        left_surf = self.font_medium.render(left_text, True, self.COLOR_ORIGINAL)
        self.screen.blit(left_surf, (self.left_panel.x, stats_y))
        
        if self.is_animating:
            progress_text = f"{int(self.animation_progress)}/{len(self.orders)}"
            progress_surf = self.font_small.render(progress_text, True, self.TEXT_SECONDARY)
            self.screen.blit(progress_surf, (self.left_panel.x, stats_y + 35))
        
        # 右侧统计
        right_text = f"AI优化: {self.result['optimized']['time']:.0f}秒"
        right_surf = self.font_medium.render(right_text, True, self.COLOR_OPTIMIZED)
        right_rect = right_surf.get_rect(x=self.right_panel.x, y=stats_y)
        self.screen.blit(right_surf, right_rect)
        
        if self.is_animating:
            progress_text = f"{int(self.animation_progress)}/{len(self.optimized_orders)}"
            progress_surf = self.font_small.render(progress_text, True, self.TEXT_SECONDARY)
            self.screen.blit(progress_surf, (self.right_panel.x, stats_y + 35))
    
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
    
    def render(self):
        """渲染"""
        self.screen.fill(self.BG_COLOR)
        
        self.draw_header()
        
        # 始终显示面板，即使没有订单
        self.draw_panel(
            self.left_panel,
            self.orders,
            "传统配送",
            self.COLOR_ORIGINAL,
            self.animation_progress if self.is_animating else None
        )
        
        self.draw_panel(
            self.right_panel,
            self.optimized_orders,
            "AI优化",
            self.COLOR_OPTIMIZED,
            self.animation_progress if self.is_animating else None
        )
        
        if self.orders:
            self.draw_stats()
        
        pygame.display.flip()
    
    def run(self):
        """主循环"""
        # 不自动生成订单，等待用户按空格
        
        running = True
        while running:
            self.clock.tick(60)
            running = self.handle_events()
            self.update()
            self.render()
        
        pygame.quit()

if __name__ == "__main__":
    app = ModernVisualizer()
    app.run()
