#include <stdio.h>
#include "libtspl.h"

int main(int argc, char *argv[])
{
    int result;
    int status;

    result = openport("USB");
    // result = openport("ttyS1");
    // result = openethernet("192.168.0.100", 9100);

    if(!result)
    {
        printf("Error: can't open printer.\n");
        return -1;
    }

    status = printerstatus();
    if(status != 0)
    {
        printf("Error: printer is not ready. status=0x%x\n", status);
        return -1;
    }

    printf("Status: 0x%x\n", status);

    // printf("name: %s\n", printername());

    result = sendcommand("SIZE 76 mm, 80 mm");
    if(!result)
    {
        printf("Error: can't send command to printer.\n");
        closeport();
        return -1;
    }

    // GAP 2 间隙纸
    // sendcommand("GAP 2 mm, 0 mm");
    // GAP 0 连续纸
    sendcommand("GAP 0 mm, 0 mm");

    sendcommand("SPEED 4");
    sendcommand("DENSITY 8");
    sendcommand("DIRECTION 1");
    clearbuffer();
    barcode("100", "150", "128", "100", "1", "0", "2", "2", "Barcode Test");
    printerfont("100", "300", "3", "0", "1", "1", "Print Font Test");
    windowsfont(100, 50, 40, 0, "ARIALUNI.TTF", "にっぽんごEnglish中文한글");
    downloadpcx("UL.PCX", "UL.PCX");
    sendcommand("PUTPCX 100,400,\"UL.PCX\"");
    printlabel("1", "1");

    closeport(); 

    return 0;
}
