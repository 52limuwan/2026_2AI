#ifndef __LIBTSC_H__
#define __LIBTSC_H__

/*
 * libtspl : TSPL打印指令API接口
 */

#ifdef __cplusplus
extern "C" {
#endif

/**
 * openport 连接USB或者串口打印机
 * @param   printername "USB"/"ttyS0"/"ttyS1"
 * @return  1: 成功, 0: 失败
 */
int openport(const char * printername);

/**
 * openethernet 连接以太网打印机
 * @param  ipaddress  打印机IP地址
 * @param  portnumber 打印机端口, 一般为9100
 * @return 1: 成功, 0: 失败
 */
int openethernet(const char * ipaddress, int portnumber);

/**
 * loseport 关闭打印机连接
 * @return 1: 成功, 0: 失败
 */
int closeport(void);

/**
 * sendcommand 发送指令(字符串)
 * @param  printercommand 指令数据
 * @return 1: 成功, 0: 失败
 */
int sendcommand(const char * printercommand);

/**
 * setup 设置标签规格
 * @param  width    标签宽度, 单位毫米
 * @param  height   标签高度, 单位毫米
 * @param  speed    打印速度(参考打印机手册)
 * @param  density  打印浓度(参考打印机手册)
 * @param  sensor   传感器类型, "1"为黑标, 其他为普通类型. 可设为NULL.
 * @param  vertical 传感器参数, 黑标高度或间隙宽度, 如间隙纸为"2", 连续纸为"0"
 * @param  offset   传感器参数, 偏移量, 一般设为"0"
 * @return 1: 成功, 0: 失败
 */
int setup(const char *width, const char *height, const char *speed, const char *density, const char *sensor, const char *vertical, const char *offset);

/**
 * clearbuffer 清空标签内容
 * @return 1: 成功, 0: 失败
 */
int clearbuffer(void);

/**
 * barcode 绘制条码
 * @param  x        X坐标, 单位像素点
 * @param  y        Y坐标, 单位像素点
 * @param  type     条码类型(参考打印机手册), 如"128", "EAN13"等
 * @param  height   条码高度, 单位像素点
 * @param  readable 是否输出可读字符串, "1"可识, "0"不可
 * @param  rotation 旋转, "0"不旋转, "90"顺时针旋转90度, "180", "270"
 * @param  narrow   窄bar宽度, 单位像素点, 如"1", "2"
 * @param  wide     宽bar宽度, 单位像素点, 如"2", "4"
 * @param  code     条码内容
 * @return 1: 成功, 0: 失败
 */
int barcode(const char *x, const char *y, const char *type, const char *height, const char *readable, const char *rotation, const char *narrow, const char *wide, const char *code);

/**
 * printerfont 用打印机自带字体打印文字
 * @param  x        X坐标, 单位像素点
 * @param  y        Y坐标, 单位像素点
 * @param  fonttype 字体类型, "1", "2", ... "TSS24.BF2" 等 (参考打印机手册)
 * @param  rotation 旋转, "0"不旋转, "90"顺时针旋转90度, "180", "270"
 * @param  xmul     X方向放大倍数, 如"1", "2"等
 * @param  ymul     Y方向放大倍数, 如"1", "2"等
 * @param  text     要打印的文字内容
 * @return 1: 成功, 0: 失败
 */
int printerfont(const char *x, const char *y, const char *fonttype, const char *rotation, const char *xmul, const char *ymul, const char *text);

/**
 * printlabel 打印标签
 * @param  set  打印份数, 一般为"1"
 * @param  copy 每份重复打印次数, 一般为"1"
 * @return 1: 成功, 0: 失败
 */
int printlabel(const char *set, const char *copy);

/**
 * downloadpcx 保存文件至打印机
 * @param  filename   本地文件名
 * @param  image_name 打印内存储文件名
 * @return 1: 成功, 0: 失败
 */
int downloadpcx(const char *filename, const char *image_name);

/**
 * formfeed 控制打印机进一张纸
 * @return 1: 成功, 0: 失败
 */
int formfeed(void);

/**
 * nobackfeed 禁止走纸到撕纸处
 * @return 1: 成功, 0: 失败
 */
int nobackfeed(void);

/**
 * windowsfont 使用主机TTF(truetype)字体绘制文字
 * @param  x          X坐标, 单位像素点
 * @param  y          Y坐标, 单位像素点
 * @param  fontheight 文字高度, TTF字体高度
 * @param  rotation   旋转(暂不支持)
 * @param  fontpath   TTF文件路径
 * @param  content    需要绘制的文字内容
 * @return 1: 成功, 0: 失败
 */
int windowsfont(int x, int y, int fontheight, int rotation, const char *fontpath, const char *content);

/**
 * about 关于
 * @return 本库版本信息
 */
const char* about(void);

/**
 * sendBinaryData 发送二进制数据到打印机, 用于特殊指令发送
 * @param  binaryData 数据指针
 * @param  dataLength 数据长度
 * @return 1: 成功, 0: 失败
 */
int sendBinaryData(const void* binaryData, int dataLength);

/**
 * printerstatus 获取打印机状态
 * @return 大于等于0: 打印机状态。小于0: 获取状态失败
 */
int printerstatus(void);

/**
 * printername 获取打印机型号信息
 * @return 非0: 打印机型号字符串. 0: 获取失败
 */
const char* printername(void);

#ifdef __cplusplus
}
#endif

#endif
