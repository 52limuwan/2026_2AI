object Form1: TForm1
  Left = 258
  Top = 106
  Width = 696
  Height = 480
  Caption = 'Form1'
  Color = clBtnFace
  Font.Charset = DEFAULT_CHARSET
  Font.Color = clWindowText
  Font.Height = -11
  Font.Name = 'MS Sans Serif'
  Font.Style = []
  OldCreateOrder = False
  OnClose = FormClose
  PixelsPerInch = 96
  TextHeight = 13
  object Button1: TButton
    Left = 16
    Top = 24
    Width = 75
    Height = 25
    Caption = 'About'
    TabOrder = 0
    OnClick = Button1Click
  end
  object Button2: TButton
    Left = 16
    Top = 80
    Width = 75
    Height = 25
    Caption = 'Print'
    TabOrder = 1
    OnClick = Button2Click
  end
  object edCarNo: TEdit
    Left = 232
    Top = 104
    Width = 121
    Height = 21
    TabOrder = 2
    Text = 'bb-1234'
  end
  object edRoomNo: TEdit
    Left = 232
    Top = 144
    Width = 121
    Height = 21
    TabOrder = 3
    Text = 'xyz'
  end
end
