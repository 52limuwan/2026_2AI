Option Strict Off
Option Explicit On
Friend Class Form1
	Inherits System.Windows.Forms.Form
	'Declaration of Private Subroutine
    Private Declare Sub openport Lib "tsclib.dll" (ByVal PrinterName As String)
    Private Declare Sub closeport Lib "tsclib.dll" ()
    Private Declare Sub sendcommand Lib "tsclib.dll" (ByVal command_Renamed As String)
    Private Declare Sub setup Lib "tsclib.dll" (ByVal LabelWidth As String, ByVal LabelHeight As String, ByVal Speed As String, ByVal Density As String, ByVal Sensor As String, ByVal Vertical As String, ByVal Offset As String)
    Private Declare Sub downloadpcx Lib "tsclib.dll" (ByVal Filename As String, ByVal ImageName As String)
    Private Declare Sub barcode Lib "tsclib.dll" (ByVal X As String, ByVal Y As String, ByVal CodeType As String, ByVal Height_Renamed As String, ByVal Readable As String, ByVal rotation As String, ByVal Narrow As String, ByVal Wide As String, ByVal Code As String)
    Private Declare Sub printerfont Lib "tsclib.dll" (ByVal X As String, ByVal Y As String, ByVal FontName As String, ByVal rotation As String, ByVal Xmul As String, ByVal Ymul As String, ByVal Content As String)
    Private Declare Sub clearbuffer Lib "tsclib.dll" ()
    Private Declare Sub printlabel Lib "tsclib.dll" (ByVal NumberOfSet As String, ByVal NumberOfCopy As String)
    Private Declare Sub formfeed Lib "tsclib.dll" ()
    Private Declare Sub nobackfeed Lib "tsclib.dll" ()
    Private Declare Sub windowsfont Lib "tsclib.dll" (ByVal X As Short, ByVal Y As Short, ByVal fontheight_Renamed As Short, ByVal rotation As Short, ByVal fontstyle As Short, ByVal fontunderline As Short, ByVal FaceName As String, ByVal TextContent As String)
	
	Private Sub Command1_Click(ByVal eventSender As System.Object, ByVal eventArgs As System.EventArgs) Handles Command1.Click
		

        Dim B1 As String = "20080101"
        Dim WT1 As String = "TSC Printers Work with VB via DLL"

        'Connect to a printer and set up the parameters'

        Call openport("TSC TTP-2410M")
        Call setup("102", "64", "4.0", "7", "0", "2", "0")
		Call clearbuffer()
		Call sendcommand("DIRECTION 1")
		Call sendcommand("SET CUTTER OFF") ' Or the number of printout per cut'
		
		'Print a PCX graphic'
		
        Call downloadpcx(Application.StartupPath & "\UL.PCX", "UL.PCX")

        'If you need to save the graphic on the flash memory, add the following command and put Call downloadpcx and Call sendcommand("MOVE") in different VB Command button

        'Call sendcommand("MOVE")

		Call sendcommand("PUTPCX 40,40,""UL.PCX""")

        'Print a barcode'

        Call barcode("40", "300", "128", "80", "1", "0", "2", "2", B1)

		'Print a text with Windows Arial font'
		
        Call windowsfont(120, 440, 40, 0, 0, 0, "ARIAL", WT1)
		
        'The number of printout sets&copies'
		
		Call printlabel("1", "1")
		
		'Disconnect with the printer'
		
		Call closeport()
		
	End Sub
End Class