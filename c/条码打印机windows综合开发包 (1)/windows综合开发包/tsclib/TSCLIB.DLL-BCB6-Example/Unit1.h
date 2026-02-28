//---------------------------------------------------------------------------

#ifndef Unit1H
#define Unit1H
//---------------------------------------------------------------------------
#include <Classes.hpp>
#include <Controls.hpp>
#include <StdCtrls.hpp>
#include <Forms.hpp>
//---------------------------------------------------------------------------
class TForm1 : public TForm
{
__published:	// IDE-managed Components
        TButton *Button1;
    TButton *Button2;
    TEdit *edCarNo;
    TEdit *edRoomNo;
    void __fastcall FormClose(TObject *Sender, TCloseAction &Action);
    void __fastcall Button1Click(TObject *Sender);
    void __fastcall Button2Click(TObject *Sender);
private:	// User declarations
    HINSTANCE     hInst;

    //dll Function Define
    int CALLBACK (*about)(void);
    int CALLBACK (*openport)(AnsiString PrinterName);
    int CALLBACK (*closeport)(void);
    int CALLBACK (*sendcommand)(AnsiString Command);
    int CALLBACK (*setup)(AnsiString a,AnsiString b,AnsiString c,AnsiString d,AnsiString e,AnsiString f,AnsiString g);
    int CALLBACK (*clearbuffer)(void);
    int CALLBACK (*barcode)(AnsiString a,AnsiString b,AnsiString c,AnsiString d,AnsiString e,AnsiString f,AnsiString g,AnsiString h,AnsiString I);
    int CALLBACK (*printerfont)(AnsiString a,AnsiString b,AnsiString c,AnsiString d,AnsiString e,AnsiString f,AnsiString g);
    int CALLBACK (*windowsfont)(AnsiString a,AnsiString b,AnsiString c,AnsiString d,AnsiString e,AnsiString f,AnsiString g,AnsiString h,AnsiString i);
public:		// User declarations
        __fastcall TForm1(TComponent* Owner);
};
//---------------------------------------------------------------------------
extern PACKAGE TForm1 *Form1;
//---------------------------------------------------------------------------
#endif
