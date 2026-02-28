using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;

namespace TSCLIB_DLL_IN_C_Sharp
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            //TSCLIB_DLL.about();                                                                 //Show the DLL version
            TSCLIB_DLL.openport("TSC TTP-344M Plus");                                           //Open specified printer driver
            TSCLIB_DLL.setup("100", "63.5", "4", "8", "0", "0", "0");                           //Setup the media size and sensor type info
            TSCLIB_DLL.clearbuffer();                                                           //Clear image buffer
            TSCLIB_DLL.barcode("100", "100", "128", "100", "1", "0", "2", "2", "Barcode Test"); //Drawing barcode
            TSCLIB_DLL.printerfont("100", "250", "3", "0", "1", "1", "Print Font Test");        //Drawing printer font
            TSCLIB_DLL.windowsfont(100, 300, 24, 0, 0, 0, "ARIAL", "Windows Arial Font Test");  //Draw windows font
            TSCLIB_DLL.downloadpcx("UL.PCX", "UL.PCX");                                         //Download PCX file into printer
            TSCLIB_DLL.sendcommand("PUTPCX 100,400,\"UL.PCX\"");                                //Drawing PCX graphic
            TSCLIB_DLL.printlabel("1", "1");                                                    //Print labels
            TSCLIB_DLL.closeport();                                                             //Close specified printer driver 
            
        }
    }
}