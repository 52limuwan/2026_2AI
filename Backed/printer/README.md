# 外卖单打印功能

## 功能说明

点餐成功后自动打印外卖单到标签打印机（Gprinter GP-1324D）。

## 配置

在 `Backed/.env` 文件中配置：

```env
# 打印机配置
PRINTER_ENABLED=true                    # 是否启用打印功能
PRINTER_NAME=Gprinter GP-1324D          # 打印机名称
PYTHON_PATH=python                      # Python路径
```

## 依赖

1. Python 3.x
2. PIL/Pillow库：`pip install Pillow`
3. pywin32库：`pip install pywin32`
4. TSCLIB.DLL（已包含在此目录）

## 文件说明

- `print_order.py` - 打印订单脚本
- `test_printer.py` - 测试打印机连接
- `TSCLIB.dll` - 打印机驱动库

## API接口

### 1. 获取打印机配置
```
GET /api/printer/config
需要权限: merchant, admin
```

### 2. 测试打印机
```
POST /api/printer/test
需要权限: merchant, admin
```

### 3. 手动打印订单
```
POST /api/printer/print-order/:orderId
需要权限: merchant, admin
```

## 测试

### 测试打印机连接
```bash
cd Backed/printer
python test_printer.py
```

### 测试打印订单
```bash
cd Backed/printer
python print_order.py '{"order_number":"TEST001","client_name":"测试顾客","total_amount":50.00,"items":[{"dish_name":"宫保鸡丁","quantity":1,"price":25.00}],"created_at":"2026-02-26 12:00:00"}'
```

## 自动打印

订单创建成功后会自动调用打印功能，打印失败不影响订单创建。

## 打印内容

外卖单包含：
- 订单号
- 顾客姓名
- 社区/窗口位置
- 菜品明细（名称、数量、价格）
- 总金额
- 备注
- 下单时间

## 故障排除

1. 打印机连接失败
   - 检查打印机是否开机
   - 检查打印机名称是否正确
   - 检查打印机驱动是否安装

2. Python脚本执行失败
   - 检查Python路径是否正确
   - 检查依赖库是否安装
   - 查看错误日志

3. 打印内容不正确
   - 检查订单数据是否完整
   - 调整标签尺寸（在print_order.py中修改）
