using System;
using System.Diagnostics;
using System.IO;
using System.IO.Ports;
using System.Management;
using Microsoft.VisualBasic;
using Microsoft.VisualBasic.CompilerServices;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;
using System.Threading;
using Microsoft.Win32;
using System.Threading.Tasks;
using System.Linq;
using System.Net;
using System.Net.Sockets;
//using GP80SettingTool;
//using LptPrint_test;


namespace GprinterDemo
{
    public partial class Form1 : Form
    {
        private libUsbContorl.UsbOperation NewUsb = new libUsbContorl.UsbOperation();
        public Form1()
        {
            InitializeComponent();
            System.Windows.Forms.Control.CheckForIllegalCrossThreadCalls = false;
        }


        //输出窗口
        private delegate void CB(string msg);
        private void clear_scr_Click(object sender, EventArgs e)
        {
            richTextBox1.Text = "";
        }
        public void m_output(string str)
        {
            bool flag = this.richTextBox1.InvokeRequired;
            if (flag)
            {
                CB d = new CB(m_output);
                this.Invoke(d, new object[] { str });
            }
            else
            {
                string oldStr = richTextBox1.Text;
                string newStr = str + "\r\n" + oldStr;
                if (newStr.Length > 4096)
                {
                    newStr = newStr.Substring(0, 4096);
                }
                this.richTextBox1.Text = newStr;
            }

        }
        //usb
        private void SendData2USB(byte[] str)
        {
            NewUsb.SendData2USB(str, str.Length);
        }
        private void SendData2USB(string str)
        {
            byte[] by_SendData = System.Text.Encoding.GetEncoding(54936).GetBytes(str);
            SendData2USB(by_SendData);
        }
        private void Form1_Load(object sender, EventArgs e)
        {
            comboBox1.Items.Add("USB口");
            comboBox1.SelectedIndex = 0;

            comboBox2.Items.Add("打印机状态");
            comboBox2.Items.Add("脱机状态");
            comboBox2.Items.Add("错误状态");
            comboBox2.Items.Add("纸状态");
            comboBox2.SelectedIndex = 0;


        }
        private void button1_Click(object sender, EventArgs e)
        {
            //选择哪个端口
            int Printer = comboBox1.SelectedIndex;
            if(Printer == 0)//usb
            {
                //枚举打印机
                NewUsb.FindUSBPrinter();
                RegistryKey keyUSBNUM;
                //获取设备
                string[] USBList = NewUsb.mCurrentDevicePath.ToArray();
                //枚举到设备输出
                for (int i = 0; i < NewUsb.USBPortCount; i++)
                {
                    string sSubkeyPath = "SYSTEM\\CurrentControlSet\\Control\\DeviceClasses\\{28d78fad-5a12-11d1-ae5b-0000f803a8c2}" +
                                            "\\##?#USB#" + USBList[i].Substring(8, 30) + "#{28d78fad-5a12-11d1-ae5b-0000f803a8c2}\\#\\Device Parameters";//Have Serial Number
                    keyUSBNUM = Registry.LocalMachine.OpenSubKey(sSubkeyPath);
                    int sValue = (int)keyUSBNUM.GetValue("Port Number");
                    string scValue = Convert.ToString(sValue);
                    if (keyUSBNUM != null)
                    {
                        //打开成功
                        m_output("USB" + scValue + USBList[i].Substring(0));
                        m_output("选择usb端口成功");
                    }
                    else
                    {
                        m_output("keyUSBNUM为空，识别不到设备");
                        m_output("USB" + USBList[i].Substring(0));
                    }
                }
            }
            
        }

        private void button2_Click(object sender, EventArgs e)
        {
            int Printer = comboBox1.SelectedIndex;
            if(Printer == 0)
            {
                NewUsb.FindUSBPrinter();
                for (int i = 0; i < NewUsb.USBPortCount; i++)
                {
                    if (NewUsb.LinkUSB(i))
                    {
                        
                        string FilePath = "test1.txt";
                        StreamReader readstring = new StreamReader(FilePath, System.Text.Encoding.Default);
                        string myfile;
                        myfile = readstring.ReadToEnd();
                        readstring.Close();
                        myfile = myfile.Replace(" ", "");
                        byte[] buffer = new byte[myfile.Length / 2];
                        for (int J = 0; J < myfile.Length; J += 2)
                        {
                            buffer[J / 2] = (byte)Convert.ToByte(myfile.Substring(J, 2), 16);
                        }
                        SendData2USB(buffer);
                        NewUsb.CloseUSBPort();
                        m_output("usb口打印测试页");
                        

                    }
                }
            }

        }
        private byte[] received;
        private bool WaitOne = false;
        private void button3_Click(object sender, EventArgs e)
        {
            //选择哪个端口
            int Printer = comboBox1.SelectedIndex;
            if (Printer == 0)
            {
                byte[] tspl = { 0x1B, 0x21, 0x3F, 0x0d, 0x0a };
                NewUsb.FindUSBPrinter();
                //查询第一次
                for (int k = 0; k < NewUsb.USBPortCount; k++)
                {

                    if (NewUsb.LinkUSB(k))
                    {
                        SendData2USB(tspl);
                        NewUsb.ReadDataFmUSB(ref received);
                        if (received != null)
                        {
                            switch (received[0])
                            {
                                //以下是标签查询返传指令
                                case 0x00:
                                    richTextBox1.Text = "";
                                    m_output("正常待机");
                                    break;
                                case 0x41:
                                    richTextBox1.Text = "";
                                    m_output("开盖");
                                    break;
                                case 0x04:
                                    richTextBox1.Text = "";
                                    m_output("缺纸");
                                    break;
                                case 0x01:
                                    richTextBox1.Text = "";
                                    m_output("开盖");
                                    break;
                                case 0x45:
                                    richTextBox1.Text = "";
                                    m_output("开盖、缺纸");
                                    break;
                                case 0x0D:
                                    richTextBox1.Text = "";
                                    m_output("开盖、缺纸、无碳带");
                                    break;
                                case 0x5:
                                    richTextBox1.Text = "";
                                    m_output("开盖、缺纸");
                                    break;
                                case 0x0C:
                                    richTextBox1.Text = "";
                                    m_output("缺纸、无碳带");
                                    break;
                                case 0x09:
                                    richTextBox1.Text = "";
                                    m_output("开盖、无碳带");
                                    break;
                                case 0x08:
                                    richTextBox1.Text = "";
                                    m_output("未装碳带");
                                    break;
                                case 0x10:
                                    richTextBox1.Text = "";
                                    m_output("暂停打印");
                                    break;
                                case 0x80:
                                    richTextBox1.Text = "";
                                    m_output("打印头过热");
                                    break;
                                default:
                                    richTextBox1.Text = "";
                                    m_output("未知");
                                    break;
                            }
                        }
                        else
                        {
                            richTextBox1.Text = "";
                            m_output("未知");
                        }
                    }
                }
            }
        }

        private void button4_Click(object sender, EventArgs e)
        {
            richTextBox1.Text = "";
        }

        private void button5_Click(object sender, EventArgs e)
        {

            OpenFileDialog ofd = new OpenFileDialog();//新建打开文件对话框
            ofd.InitialDirectory = Environment.GetFolderPath(Environment.SpecialFolder.Personal);//设置初始文件目录
            ofd.Filter = "所有文件(*.*)|*.*";//设置打开文件类型
            if (ofd.ShowDialog(this) == DialogResult.OK)
            {
                string FileName = ofd.FileName;//FileName就是要打开的文件路径
                //下边可以添加用户代码 
                textBox1.Text = FileName;
            }
            
        }
        Thread thread;
        private void PrinterData()
        {
            string FileNameA = textBox1.Text;
            if (FileNameA == "")
            {
                m_output("文件不能为空");
                thread.Abort();//终止线程
                return;
            }
            int Printer = comboBox1.SelectedIndex;
            if (Printer == 0)
            {
                NewUsb.FindUSBPrinter();
                for (int i = 0; i < NewUsb.USBPortCount; i++)
                {
                    if (NewUsb.LinkUSB(i))
                    {
                        byte[] binchar = new byte[] { };
                        int file_len;
                        string FileName = textBox1.Text;
                        FileStream fileStream = new FileStream(FileName, FileMode.Open);
                        //读取二进制文件
                        BinaryReader br = new BinaryReader(fileStream);
                        file_len = (int)fileStream.Length;

                        binchar = br.ReadBytes(file_len);

                        List<byte[]> result = new List<byte[]>();
                        int size = 3072;//每次发3K
                        int length = binchar.Length;
                        int count = length / size;
                        int r = length % size;


                        for (int j = 0; j < count; j++)
                        {
                            byte[] newbyte = new byte[size];
                            newbyte = binchar.Skip(size * j).Take(size).ToArray();// SplitArray(superbyte, size*i, size * i+ size);
                            result.Add(newbyte);
                            SendData2USB(newbyte);
                            Thread.Sleep(1000);//每1秒发3K数据
                        }
                        if (r != 0)
                        {
                            byte[] newbyte = new byte[r];
                            newbyte = binchar.Skip(length - r).Take(r).ToArray();
                            result.Add(newbyte);
                            SendData2USB(newbyte);
                            Thread.Sleep(200);
                        }
                        //SplitList(binchar, 5120);
                        //SendData2USB(binchar);
                        NewUsb.CloseUSBPort();
                        Thread.Sleep(200);
                        thread.Abort();//终止线程
                    }
                    else
                    {
                        m_output("usb通讯失败");
                        thread.Abort();//终止线程
                    }
                }
            }
           
        }
        private void button6_Click(object sender, EventArgs e)
        {

            if (this.thread != null)
                this.thread.Abort();

            ThreadStart threadStart = new ThreadStart(PrinterData);
            this.thread = new Thread(threadStart);
            thread.Start();
        }

        private void button7_Click(object sender, EventArgs e)
        {
            int Printer = comboBox1.SelectedIndex;
            if (Printer == 0)
            {
                NewUsb.FindUSBPrinter();
                for (int i = 0; i < NewUsb.USBPortCount; i++)
                {
                    if (NewUsb.LinkUSB(i))
                    {
                        /*
                        string FilePath = "test2.txt";
                        StreamReader readstring = new StreamReader(FilePath, System.Text.Encoding.Default);
                        string myfile;
                        myfile = readstring.ReadToEnd();
                        readstring.Close();
                        myfile = myfile.Replace(" ", "");
                        byte[] buffer = new byte[myfile.Length / 2];
                        for (int J = 0; J < myfile.Length; J += 2)
                        {
                            buffer[J / 2] = (byte)Convert.ToByte(myfile.Substring(J, 2), 16);
                        }
                        SendData2USB(buffer);
                        NewUsb.CloseUSBPort();
                        m_output("usb口打印测试页");
                        */
                        SendData2USB("SIZE 128 mm,150 mm\r\n");//标签尺寸
                        SendData2USB("GAP 10 mm\r\n");//间距为0
                        SendData2USB("CLS\r\n");//清空缓冲区
                        SendData2USB("DENSITY 5\r\n");//打印浓度
                        int bos1 = 40;
                        int bos2 = 110;
                        int bos3 = 1220;
                        int bos4 = 1390;
                        string cmd = "BOX ";
                        for (int j = 0; j < 4; j++)
                        {
                            bos1 -= 10;
                            string bos1_1 = bos1.ToString();
                            cmd = cmd + bos1_1 + ",";
                            bos2 -= 10;
                            string bos2_2 = bos2.ToString();
                            cmd = cmd + bos2_2 + ",";
                            bos3 += 10;
                            string bos3_3 = bos3.ToString();
                            cmd = cmd + bos3_3 + ",";
                            bos4 += 10;
                            string bos4_4 = bos4.ToString();
                            cmd = cmd + bos4_4 + ",2\r\n";
                            if (j < 3)
                            {
                                cmd += "BOX ";
                            }

                        }
                        cmd += "ERASE 3,70,1255,10\r\n";
                        cmd += "ERASE 320,70,630,25\r\n";

                        string text = "TEXT 0,";
                        int y = 30;
                        int textmode = 6;
                        for (int k = 0; k < 5; k++)
                        {
                            y += 50;
                            string yy = y.ToString();
                            text += yy + ",";
                            textmode -= 1;
                            string textmode_1 = textmode.ToString();
                            text += "\"" + textmode_1 + "\"" + ",";
                            text += "0,1,1,\"ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKL1234567890\"\r\n";

                            if (k < 4)
                            {
                                text += "TEXT 0,";
                            }

                        }

                        cmd = cmd + text;

                        string barcode = "BARCODE ";
                        int b_x = 80;
                        int b_y = 220;
                        for (int s = 0; s < 2; s++)
                        {
                            string b_x1 = b_x.ToString();
                            barcode = barcode + b_x1 + ",";
                            b_y += 140;
                            string b_y1 = b_y.ToString();
                            barcode = barcode + b_y1 + ",";
                            barcode += "\"39\",86,1,0,3,9,\"ABCD\"\r\n";
                            if (s < 1)
                            {
                                barcode += "BARCODE ";
                            }
                        }

                        string barcode_1 = "BARCODE ";
                        int b_xx = 900;
                        int b_yy = 220;
                        for (int s1 = 0; s1 < 2; s1++)
                        {
                            string b_xx1 = b_xx.ToString();
                            barcode_1 = barcode_1 + b_xx1 + ",";
                            b_yy += 140;
                            string b_yy1 = b_yy.ToString();
                            barcode_1 = barcode_1 + b_yy1 + ",";
                            barcode_1 += "\"39\",86,1,0,3,9,\"A935\"\r\n";
                            if (s1 < 1)
                            {
                                barcode_1 += "BARCODE ";
                            }
                        }

                        cmd = cmd + barcode + barcode_1;

                        string box = "BOX ";
                        int box_x = 395;
                        int box_y = 335;
                        int box_w = 875;
                        int box_h = 755;
                        for (int bx = 0; bx < 7; bx++)
                        {
                            box_x += 25;
                            string box_x1 = box_x.ToString();
                            box = box + box_x1 + ",";

                            box_y += 25;
                            string box_y1 = box_y.ToString();
                            box = box + box_y1 + ",";

                            box_w -= 25;
                            string box_w1 = box_w.ToString();
                            box = box + box_w1 + ",";

                            box_h -= 25;
                            string box_h1 = box_h.ToString();
                            box = box + box_h1 + "," + "4\r\n";
                            if (bx < 6)
                            {
                                box += "BOX ";
                            }

                        }
                        cmd = cmd + box;
                        cmd += "TEXT 60,660,\"4\",0,1,1,\"S4D6  0001\"\r\n";
                        cmd += "BAR 0,750,1350,200\r\n";

                        string erase = "ERASE ";
                        int erase_x = 0;
                        int erase_y = 750;
                        for (int er = 0; er < 14; er++)
                        {
                            string erase_x1 = erase_x.ToString();
                            erase = erase + erase_x1 + ",";
                            if (er % 2 == 0)
                            {
                                erase_y = 850;
                            }
                            else
                            {
                                erase_y = 750;
                            }
                            string erase_y1 = erase_y.ToString();
                            erase = erase + erase_y1 + "," + "110,100\r\n";
                            erase_x += 110;
                            if (er < 13)
                            {
                                erase += "ERASE ";
                            }
                        }
                        cmd = cmd + erase;

                        cmd += "BAR 110,1100,1050,300\r\n";
                        cmd += "ERASE 110,1300,1050,20\r\n";
                        cmd += "ERASE 110,1370,1050,20\r\n";
                        cmd += "ERASE 350,1400,600,40\r\n";
                        cmd += "ERASE 3,1420,1255,40\r\n";

                        cmd += "PRINT 1\r\n";
                        SendData2USB(cmd);
                        cmd = "";
                        m_output("打印测试页");
                    }
                }
            }
        }

        private void button8_Click(object sender, EventArgs e)
        {
            int Printer = comboBox1.SelectedIndex;
            if (Printer == 0)
            {
                byte[] tspl = { 0x7E, 0x21, 0x54 };
                NewUsb.FindUSBPrinter();
                //查询第一次
                for (int k = 0; k < NewUsb.USBPortCount; k++)
                {

                    if (NewUsb.LinkUSB(k))
                    {
                        SendData2USB(tspl);
                        NewUsb.ReadDataFmUSB(ref received);
                        if (received != null)
                        {
                            string model = System.Text.Encoding.Default.GetString(received);
                            m_output(model);
                        }

                    }
                }
            }
        }

        private void button9_Click(object sender, EventArgs e)
        {
            int status = comboBox2.SelectedIndex;
            if(status == 0)
            {
                byte[] esc = { 0x10, 0x04, 0x01};
                NewUsb.FindUSBPrinter();
                //查询第一次
                for (int k = 0; k < NewUsb.USBPortCount; k++)
                {

                    if (NewUsb.LinkUSB(k))
                    {
                        SendData2USB(esc);
                        NewUsb.ReadDataFmUSB(ref received);
                        if (received != null)
                        {
                            switch (received[0])
                            {

                                case 0x16:
                                    richTextBox1.Text = "";
                                    m_output("正常联机");
                                    break;
                                case 0x1E:
                                    richTextBox1.Text = "";
                                    m_output("脱机");
                                    break;
                                case 0x12:
                                    richTextBox1.Text = "";
                                    m_output("联机、钱箱打开");
                                    break;
                                case 0x1A:
                                    richTextBox1.Text = "";
                                    m_output("脱机、钱箱打开");
                                    break;
                                default:
                                    richTextBox1.Text = "";
                                    m_output("未知");
                                    break;
                            }
                        }
                        else
                        {
                            richTextBox1.Text = "";
                            m_output("获取打印机状态失败");
                        }
                    }
                }
            }
            if(status == 1)
            {
                byte[] esc = { 0x10, 0x04, 0x02};
                NewUsb.FindUSBPrinter();
                //查询第一次
                for (int k = 0; k < NewUsb.USBPortCount; k++)
                {

                    if (NewUsb.LinkUSB(k))
                    {
                        SendData2USB(esc);
                        NewUsb.ReadDataFmUSB(ref received);
                        if (received != null)
                        {
                            switch (received[0])
                            {

                                case 0x12:
                                    richTextBox1.Text = "";
                                    m_output("正常联机");
                                    break;
                                case 0x16:
                                    richTextBox1.Text = "";
                                    m_output("有纸、开盖");
                                    break;
                                case 0x32:
                                    richTextBox1.Text = "";
                                    m_output("缺纸、合盖");
                                    break;
                                case 0x36:
                                    richTextBox1.Text = "";
                                    m_output("缺纸、开盖");
                                    break;
                                case 0x52:
                                    richTextBox1.Text = "";
                                    m_output("有错误状态");
                                    break;
                                default:
                                    m_output("未知");
                                    break;
                            }
                        }
                        else
                        {
                            richTextBox1.Text = "";
                            m_output("获取打印机状态失败");
                        }
                    }
                }
            }
            if(status == 2)
            {
                byte[] esc = { 0x10, 0x04, 0x03};
                NewUsb.FindUSBPrinter();
                //查询第一次
                for (int k = 0; k < NewUsb.USBPortCount; k++)
                {

                    if (NewUsb.LinkUSB(k))
                    {
                        SendData2USB(esc);
                        NewUsb.ReadDataFmUSB(ref received);
                        if (received != null)
                        {
                            switch (received[0])
                            {
                                case 0x16:
                                    m_output("无错误状态");
                                    break;
                                case 0x56:
                                    m_output("过热保护");
                                    break;
                                case 0x1E:
                                    m_output("切刀错误");//无不可恢复错误
                                    break;
                                case 0x3E:
                                    m_output("切刀错误");//有不可恢复错误
                                    break;
                                default:
                                    m_output("未知");
                                    break;
                            }
                        }
                        else
                        {
                            richTextBox1.Text = "";
                            m_output("获取打印机状态失败");
                        }
                    }
                }
            }
            if(status == 3)
            {
                byte[] esc = {0x10,0x04,0x04};
                NewUsb.FindUSBPrinter();
                //查询第一次
                for (int k = 0; k < NewUsb.USBPortCount; k++)
                {

                    if (NewUsb.LinkUSB(k))
                    {
                        SendData2USB(esc);
                        NewUsb.ReadDataFmUSB(ref received);
                        if (received != null)
                        {
                            switch (received[0])
                            {
                                case 0x12:
                                    m_output("有纸");
                                    break;
                                case 0x7E:
                                    m_output("纸尽");
                                    break;
                                default:
                                    m_output("未知");
                                    break;
                            }
                        }
                        else
                        {
                            richTextBox1.Text = "";
                            m_output("获取打印机状态失败");
                        }
                    }
                }
            }
            
        }

        private void button10_Click(object sender, EventArgs e)
        {
            int Printer = comboBox1.SelectedIndex;
            if (Printer == 0)
            {
                byte[] tspl = { 0x1D, 0x49, 0x42 };
                NewUsb.FindUSBPrinter();
                //查询第一次
                for (int k = 0; k < NewUsb.USBPortCount; k++)
                {

                    if (NewUsb.LinkUSB(k))
                    {
                        SendData2USB(tspl);
                        NewUsb.ReadDataFmUSB(ref received);
                        if (received != null)
                        {
                            string model = System.Text.Encoding.Default.GetString(received);
                            m_output(model);
                        }

                    }
                }
            }
        }

        private void button11_Click(object sender, EventArgs e)
        {
            int Printer = comboBox1.SelectedIndex;
            if (Printer == 0)
            {
                byte[] tspl = { 0x1D, 0x49, 0x43 };
                NewUsb.FindUSBPrinter();
                //查询第一次
                for (int k = 0; k < NewUsb.USBPortCount; k++)
                {

                    if (NewUsb.LinkUSB(k))
                    {
                        SendData2USB(tspl);
                        NewUsb.ReadDataFmUSB(ref received);
                        if (received != null)
                        {
                            string model = System.Text.Encoding.Default.GetString(received);
                            m_output(model);
                        }

                    }
                }
            }
        }
    }
}
