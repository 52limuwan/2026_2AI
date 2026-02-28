using System;
using System.Collections;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Security;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using System.Web.UI.WebControls.WebParts;
using System.Xml.Linq;

using System.Runtime.InteropServices;
public class TSCLIB_DLL
{
    [DllImport("TSCLIB.dll", EntryPoint = "about")]
    public static extern int about();

    [DllImport("TSCLIB.dll", EntryPoint = "openport")]
    public static extern int openport(string printername);

    [DllImport("TSCLIB.dll", EntryPoint = "barcode")]
    public static extern int barcode(string x, string y, string type,
                string height, string readable, string rotation,
                string narrow, string wide, string code);

    [DllImport("TSCLIB.dll", EntryPoint = "clearbuffer")]
    public static extern int clearbuffer();

    [DllImport("TSCLIB.dll", EntryPoint = "closeport")]
    public static extern int closeport();

    [DllImport("TSCLIB.dll", EntryPoint = "downloadpcx")]
    public static extern int downloadpcx(string filename, string image_name);

    [DllImport("TSCLIB.dll", EntryPoint = "formfeed")]
    public static extern int formfeed();

    [DllImport("TSCLIB.dll", EntryPoint = "nobackfeed")]
    public static extern int nobackfeed();

    [DllImport("TSCLIB.dll", EntryPoint = "printerfont")]
    public static extern int printerfont(string x, string y, string fonttype,
                    string rotation, string xmul, string ymul,
                    string text);

    [DllImport("TSCLIB.dll", EntryPoint = "printlabel")]
    public static extern int printlabel(string set, string copy);

    [DllImport("TSCLIB.dll", EntryPoint = "sendcommand")]
    public static extern int sendcommand(string printercommand);

    [DllImport("TSCLIB.dll", EntryPoint = "setup")]
    public static extern int setup(string width, string height,
              string speed, string density,
              string sensor, string vertical,
              string offset);

    [DllImport("TSCLIB.dll", EntryPoint = "windowsfont")]
    public static extern int windowsfont(int x, int y, int fontheight,
                    int rotation, int fontstyle, int fontunderline,
                    string szFaceName, string content);

}

namespace ASP.NET_in_VCsharp_2008
{
    public partial class _Default : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {

        }

        protected void Button1_Click(object sender, EventArgs e)
        {
            //ScriptManager.RegisterClientScriptBlock(this, this.GetType(), "msg", "alert('Hello TSCLIB.DLL')", true);
            //TSCLIB_DLL.about();                                                                 //Show the DLL version
            TSCLIB_DLL.openport("TSC TTP-245C");                                           //Open specified printer driver
            TSCLIB_DLL.setup("100", "63.5", "4", "8", "0", "0", "0");                           //Setup the media size and sensor type info
            TSCLIB_DLL.clearbuffer();                                                           //Clear image buffer
            TSCLIB_DLL.barcode("100", "100", "128", "100", "1", "0", "2", "2", "Barcode Test"); //Drawing barcode
            TSCLIB_DLL.printerfont("100", "250", "3", "0", "1", "1", "Print Font Test");        //Drawing printer font
            TSCLIB_DLL.windowsfont(100, 300, 24, 0, 0, 0, "ARIAL", "Windows Arial Font Test");  //Draw windows font
            //TSCLIB_DLL.downloadpcx("C:\\ASP.NET_in_VCsharp_2008\\ASP.NET_in_VCsharp_2008\\UL.PCX", "UL.PCX");                                         //Download PCX file into printer
            TSCLIB_DLL.downloadpcx("UL.PCX", "UL.PCX");                                         //Download PCX file into printer
            TSCLIB_DLL.sendcommand("PUTPCX 100,400,\"UL.PCX\"");                                //Drawing PCX graphic
            TSCLIB_DLL.printlabel("1", "1");                                                    //Print labels
            TSCLIB_DLL.closeport();                     
        }
    }
}
