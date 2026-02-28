using System;
using System.Linq;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;
using WinCESDK;

namespace SimpleDemoDll
{
    public partial class Form1 : Form
    {
        private const string version = "V1.00E";
        private const string date = "2013/08/30";

        public Bluetooth BT = new Bluetooth();
        public WiFi IP = new WiFi();

        public Form1()
        {
            InitializeComponent();
        }

        private void menuAbout_Click(object sender, EventArgs e)
        {
            MessageBox.Show(String.Format("Version: {0}\r\nDate: {1}", version, date), "Info", MessageBoxButtons.OK, MessageBoxIcon.Asterisk, MessageBoxDefaultButton.Button1); 
        }

        private void btnBtConnect_Click(object sender, EventArgs e)
        {
            string comport = comboBox1.Text;
            BT.openport(comport);

        }

        private void btnWiFiConnect_Click(object sender, EventArgs e)
        {
            string ipaddress = textBox1.Text;
            IP.openport(ipaddress, 9100);

        }

        private void menuExit_Click(object sender, EventArgs e)
        {
            BT.closeport();
            IP.closeport();

        }

        private void btnDemo1_Click(object sender, EventArgs e)
        {

            BT.setup(100,60,2,5,0,0,0);
            BT.clearbuffer();
            BT.printerfont(100,30,"3",0,1,1,"TSC TEST");
            BT.barcode(100,70,"128",100,1,0,2,1,"1234567");
            BT.sendcommand("BOX 50,0,300,250,5\n");
            //BT.downloadfile("/My Documents/WINCE/UL.PCX", "QQ.PCX");
            //BT.sendcommand("PUTPCX 100,150,\"QQ.PCX\"\n");
            BT.printlabel(1,1);
            
        }

        private void btnDemo2_Click(object sender, EventArgs e)
        {

            BT.closeport();
           
        }

        private void btnDemo3_Click(object sender, EventArgs e)
        {
            IP.setup(100, 90, 2, 5, 0, 0, 0);
            IP.clearbuffer();
            IP.printerfont(100, 30, "3", 0, 1, 1, "TSC TEST");
            IP.barcode(100, 70, "128", 100, 1, 0, 2, 1, "1234567");
            IP.sendcommand("BOX 50,0,300,250,5\n");
            //IP.downloadfile("/My Documents/WINCE/UL.PCX", "QQ.PCX");
            //IP.sendcommand("PUTPCX 100,150,\"QQ.PCX\"\n");
            IP.printlabel(1, 1);


        }

        private void btnDemo4_Click(object sender, EventArgs e)
        {
            IP.closeport();
           
        }

        private void tabPageBluetooth_Click(object sender, EventArgs e)
        {

        }

        private void textIP_TextChanged(object sender, EventArgs e)
        {

        }



        

    }
}