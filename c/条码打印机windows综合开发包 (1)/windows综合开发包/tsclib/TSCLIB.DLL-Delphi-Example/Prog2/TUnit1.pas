unit TUnit1;

interface

uses
  Windows, Messages, SysUtils, Variants, Classes, Graphics, Controls, Forms,
  Dialogs, StdCtrls, ExtCtrls, Buttons;

type
  TForm1 = class(TForm)
    BitBtn1: TBitBtn;
    Label11: TLabel;
    Edit1: TEdit;
    Label17: TLabel;
    Edit2: TEdit;
    Label19: TLabel;
    Edit4: TEdit;
    Label18: TLabel;
    Edit3: TEdit;
    Edit6: TEdit;
    Label21: TLabel;
    Label23: TLabel;
    Edit7: TEdit;
    Label22: TLabel;
    Label24: TLabel;
    Edit9: TEdit;
    Edit8: TEdit;
    Edit10: TEdit;
    Label25: TLabel;
    Edit15: TEdit;
    Label30: TLabel;
    Edit14: TEdit;
    Label29: TLabel;
    Edit11: TEdit;
    Label26: TLabel;
    Edit13: TEdit;
    Label28: TLabel;
    Edit12: TEdit;
    Label27: TLabel;
    Label20: TLabel;
    Edit5: TEdit;
    RadioGroup2: TRadioGroup;
    procedure BitBtn1Click(Sender: TObject);
    procedure RadioGroup2Click(Sender: TObject);
  private
    { Private declarations }
  public
    { Public declarations }
  end;

var
  Form1: TForm1;


  Procedure openport(PrinterName:PChar);stdcall;far;external 'c:\tsclib.dll';
  Procedure closeport;external 'c:\tsclib.dll';
  procedure sendcommand(Command:PChar);stdcall;far;external 'c:\tsclib.dll';
  procedure setup(LabelWidth,LabelHeight,Speed,Density,Sensor,Vertical,Offset:PChar);stdcall;far;external 'C:\tsclib.dll';
  procedure downloadpcx(Filename,ImageName:pchar);stdcall;far;external 'c:\tsclib.dll';
  procedure barcode(X,Y,CodeType,Height,Readable,Rotation,Narrow,Wide,Code:string); stdcall; far; external 'c:\tsclib.dll';
  procedure printerfont(X, Y, FontName, Rotation, Xmul, Ymul, Content:string);stdcall;far; external 'c:\tsclib.dll';
  procedure clearbuffer; external 'c:\tsclib.dll';
  procedure printlabel(NumberOfSet, NumberOfCopoy:pchar);stdcall; far; external 'c:\tsclib.dll';
  procedure formfeed;external 'c:\tsclib.dll';
  procedure nobackfeed; external 'c:\tsclib.dll'
  procedure windowsfont (X, Y, FontHeight, Rotation, FontStyle,FontUnderline : integer; FaceName,TextContect:pchar);stdcall;far;external 'c:\tsclib.dll';

  implementation

{$R *.dfm}

procedure TForm1.BitBtn1Click(Sender: TObject);
Var aa,bb,cc,dd,ee,ff : pchar ;
    A1,A2,A3,a4,a5,A8 : Integer ;
    a11,a12,a13,a14,a15  : Integer ;
begin
   a1 := StrToInt(Edit1.Text) ;    // X
   a2 := StrToInt(Edit2.Text) ;    // Y
   a3 := StrToInt(Edit3.Text) ;    // 條碼高
   a4 := StrToInt(Edit4.Text) ;    // 行距
   a5 := StrToInt(Edit4.Text) ;    // 行距
   a8 := StrToInt(Edit8.Text) ;    // 增加條碼Y 值微調
   ee := Pchar(Edit6.text) ;
   //----------------------------//
   a12 := StrToInt(Edit12.Text) ;    // X
   a13 := StrToInt(Edit13.Text) ;    // Y
   a15 := StrToInt(Edit15.Text) ;    // 條碼高
   a14 := StrToInt(Edit14.Text) ;    // 行距


  openport('TSC CLEVER TTP-243');
  clearbuffer;
//  nobackfeed() ;
    while not Eof do Begin
      if RadioGroup2.ItemIndex = 0 then
         setup('60','40','2',ee,'0','2','0')
      else
         setup('40','25','3',ee,'0','2','0');
      aa := Pchar('財產名稱:'+'TEST1');
      bb := Pchar('存放地點:'+'TEST2');
      CC := Pchar('存放位置:'+'TEST3');
      ff := Pchar('AA1234567');
      if RadioGroup2.ItemIndex = 0 then
         begin
           windowsfont(a1,a2+a5,a3,0,2,0,'標楷體',aa) ;
           windowsfont(a1,a2+(a4*2),a3,0,2,0,'標楷體',bb) ;
           windowsfont(a1,a2+(a4*3),a3,0,2,0,'標楷體',cc) ;
           barcode(Trim(Edit7.Text),IntToStr(a2+(a3*4)+A8),'25',Trim(Edit9.Text),'0','0',Edit10.Text,Edit11.Text,'AA1234567'+' ') ;
           windowsfont(a12,a13+(a14*3),a15,0,2,0,'標楷體',ff) ;
           printlabel('1','1');
         end
      else begin
        windowsfont(a1,a2+a5,a3,0,2,0,'標楷體',aa) ;
        windowsfont(a1,a2+(a4*2),a3,0,2,0,'標楷體',bb) ;
        windowsfont(a1,a2+(a4*3),a3,0,2,0,'標楷體',cc) ;
        barcode(Trim(Edit1.Text),IntToStr(a2+(a3*4)+A8),'25',Trim(Edit9.Text),'0','0',Edit10.Text,Edit11.Text,'AA1234567'+' ') ;
        windowsfont(a12,a13+(a14*3),a15,0,2,0,'標楷體',ff) ;
        printlabel('1','1');
      end;
      nobackfeed() ;
      clearbuffer;
      Next ;
    end;
  closeport;
end;

procedure TForm1.RadioGroup2Click(Sender: TObject);
begin
  if RadioGroup2.ItemIndex = 0 then
     begin
       Edit1.Text := '170' ;
       Edit2.Text := '55' ;
       Edit4.Text := '40' ;
       Edit3.Text := '30' ;
       Edit7.Text := '265' ;
       Edit9.Text := '35' ;
       Edit8.Text := '48' ;
    Edit10.Text := '3' ;
    Edit11.Text := '4' ;
    Edit12.Text := '290' ;
    Edit13.Text := '220' ;
    Edit14.Text := '16' ;
    Edit15.Text := '35' ;
     end
  else begin
    Edit1.Text := '245' ;
    Edit2.Text := '35' ;
    Edit4.Text := '25' ;
    Edit3.Text := '22' ;
    Edit9.Text := '25' ;
    Edit7.Text := '300' ;
    Edit8.Text := '15' ;
    Edit10.Text := '3' ;
    Edit11.Text := '2' ;
    Edit12.Text := '320' ;
    Edit13.Text := '140' ;
    Edit14.Text := '10' ;
    Edit15.Text := '25' ;
  end;
end;

end.
