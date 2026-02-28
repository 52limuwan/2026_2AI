namespace SimpleDemoDll
{
    partial class Form1
    {
        /// <summary>
        /// 設計工具所需的變數。
        /// </summary>
        private System.ComponentModel.IContainer components = null;
        private System.Windows.Forms.MainMenu mainMenu1;

        /// <summary>
        /// 清除任何使用中的資源。
        /// </summary>
        /// <param name="disposing">如果應該處置 Managed 資源則為 true，否則為 false。</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form 設計工具產生的程式碼

        /// <summary>
        /// 此為設計工具支援所需的方法 - 請勿使用程式碼編輯器修改這個方法的內容。
        ///
        /// </summary>
        private void InitializeComponent()
        {
            this.mainMenu1 = new System.Windows.Forms.MainMenu();
            this.menuMenu = new System.Windows.Forms.MenuItem();
            this.menuAbout = new System.Windows.Forms.MenuItem();
            this.menuExit = new System.Windows.Forms.MenuItem();
            this.btnDemo1 = new System.Windows.Forms.Button();
            this.btnBtConnect = new System.Windows.Forms.Button();
            this.btnDemo2 = new System.Windows.Forms.Button();
            this.tabControlDemo = new System.Windows.Forms.TabControl();
            this.tabPageBluetooth = new System.Windows.Forms.TabPage();
            this.tabPageEthernet = new System.Windows.Forms.TabPage();
            this.btnDemo4 = new System.Windows.Forms.Button();
            this.btnWiFiConnect = new System.Windows.Forms.Button();
            this.btnDemo3 = new System.Windows.Forms.Button();
            this.comboBox1 = new System.Windows.Forms.ComboBox();
            this.textBox1 = new System.Windows.Forms.TextBox();
            this.tabControlDemo.SuspendLayout();
            this.tabPageBluetooth.SuspendLayout();
            this.tabPageEthernet.SuspendLayout();
            this.SuspendLayout();
            // 
            // mainMenu1
            // 
            this.mainMenu1.MenuItems.Add(this.menuMenu);
            // 
            // menuMenu
            // 
            this.menuMenu.MenuItems.Add(this.menuAbout);
            this.menuMenu.MenuItems.Add(this.menuExit);
            this.menuMenu.Text = "Menu";
            // 
            // menuAbout
            // 
            this.menuAbout.Text = "About";
            this.menuAbout.Click += new System.EventHandler(this.menuAbout_Click);
            // 
            // menuExit
            // 
            this.menuExit.Text = "Exit";
            this.menuExit.Click += new System.EventHandler(this.menuExit_Click);
            // 
            // btnDemo1
            // 
            this.btnDemo1.Location = new System.Drawing.Point(40, 104);
            this.btnDemo1.Name = "btnDemo1";
            this.btnDemo1.Size = new System.Drawing.Size(167, 37);
            this.btnDemo1.TabIndex = 0;
            this.btnDemo1.Text = "Print";
            this.btnDemo1.Click += new System.EventHandler(this.btnDemo1_Click);
            // 
            // btnBtConnect
            // 
            this.btnBtConnect.Location = new System.Drawing.Point(40, 59);
            this.btnBtConnect.Name = "btnBtConnect";
            this.btnBtConnect.Size = new System.Drawing.Size(167, 39);
            this.btnBtConnect.TabIndex = 1;
            this.btnBtConnect.Text = "Bluetooth Connect";
            this.btnBtConnect.Click += new System.EventHandler(this.btnBtConnect_Click);
            // 
            // btnDemo2
            // 
            this.btnDemo2.Location = new System.Drawing.Point(40, 147);
            this.btnDemo2.Name = "btnDemo2";
            this.btnDemo2.Size = new System.Drawing.Size(167, 34);
            this.btnDemo2.TabIndex = 3;
            this.btnDemo2.Text = "Close Port";
            this.btnDemo2.Click += new System.EventHandler(this.btnDemo2_Click);
            // 
            // tabControlDemo
            // 
            this.tabControlDemo.Controls.Add(this.tabPageBluetooth);
            this.tabControlDemo.Controls.Add(this.tabPageEthernet);
            this.tabControlDemo.Location = new System.Drawing.Point(0, 0);
            this.tabControlDemo.Name = "tabControlDemo";
            this.tabControlDemo.SelectedIndex = 0;
            this.tabControlDemo.Size = new System.Drawing.Size(240, 265);
            this.tabControlDemo.TabIndex = 6;
            // 
            // tabPageBluetooth
            // 
            this.tabPageBluetooth.Controls.Add(this.comboBox1);
            this.tabPageBluetooth.Controls.Add(this.btnDemo2);
            this.tabPageBluetooth.Controls.Add(this.btnBtConnect);
            this.tabPageBluetooth.Controls.Add(this.btnDemo1);
            this.tabPageBluetooth.Location = new System.Drawing.Point(0, 0);
            this.tabPageBluetooth.Name = "tabPageBluetooth";
            this.tabPageBluetooth.Size = new System.Drawing.Size(240, 242);
            this.tabPageBluetooth.Text = "Bluetooth";
            this.tabPageBluetooth.Click += new System.EventHandler(this.tabPageBluetooth_Click);
            // 
            // tabPageEthernet
            // 
            this.tabPageEthernet.Controls.Add(this.textBox1);
            this.tabPageEthernet.Controls.Add(this.btnDemo4);
            this.tabPageEthernet.Controls.Add(this.btnWiFiConnect);
            this.tabPageEthernet.Controls.Add(this.btnDemo3);
            this.tabPageEthernet.Location = new System.Drawing.Point(0, 0);
            this.tabPageEthernet.Name = "tabPageEthernet";
            this.tabPageEthernet.Size = new System.Drawing.Size(240, 242);
            this.tabPageEthernet.Text = "Wi-Fi";
            // 
            // btnDemo4
            // 
            this.btnDemo4.Location = new System.Drawing.Point(38, 152);
            this.btnDemo4.Name = "btnDemo4";
            this.btnDemo4.Size = new System.Drawing.Size(166, 34);
            this.btnDemo4.TabIndex = 7;
            this.btnDemo4.Text = "Close Port";
            this.btnDemo4.Click += new System.EventHandler(this.btnDemo4_Click);
            // 
            // btnWiFiConnect
            // 
            this.btnWiFiConnect.Location = new System.Drawing.Point(37, 64);
            this.btnWiFiConnect.Name = "btnWiFiConnect";
            this.btnWiFiConnect.Size = new System.Drawing.Size(167, 39);
            this.btnWiFiConnect.TabIndex = 5;
            this.btnWiFiConnect.Text = "Wi-Fi Connect";
            this.btnWiFiConnect.Click += new System.EventHandler(this.btnWiFiConnect_Click);
            // 
            // btnDemo3
            // 
            this.btnDemo3.Location = new System.Drawing.Point(37, 109);
            this.btnDemo3.Name = "btnDemo3";
            this.btnDemo3.Size = new System.Drawing.Size(167, 37);
            this.btnDemo3.TabIndex = 4;
            this.btnDemo3.Text = "Print";
            this.btnDemo3.Click += new System.EventHandler(this.btnDemo3_Click);
            // 
            // comboBox1
            // 
            this.comboBox1.Items.Add("COM0");
            this.comboBox1.Items.Add("COM1");
            this.comboBox1.Items.Add("COM2");
            this.comboBox1.Items.Add("COM3");
            this.comboBox1.Items.Add("COM4");
            this.comboBox1.Items.Add("COM5");
            this.comboBox1.Items.Add("COM6");
            this.comboBox1.Items.Add("COM7");
            this.comboBox1.Items.Add("COM8");
            this.comboBox1.Items.Add("COM9");
            this.comboBox1.Items.Add("COM10");
            this.comboBox1.Location = new System.Drawing.Point(40, 20);
            this.comboBox1.Name = "comboBox1";
            this.comboBox1.Size = new System.Drawing.Size(100, 22);
            this.comboBox1.TabIndex = 4;
            // 
            // textBox1
            // 
            this.textBox1.Location = new System.Drawing.Point(38, 21);
            this.textBox1.Name = "textBox1";
            this.textBox1.Size = new System.Drawing.Size(100, 21);
            this.textBox1.TabIndex = 8;
            // 
            // Form1
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(96F, 96F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Dpi;
            this.AutoScroll = true;
            this.ClientSize = new System.Drawing.Size(240, 268);
            this.Controls.Add(this.tabControlDemo);
            this.Menu = this.mainMenu1;
            this.Name = "Form1";
            this.Text = "Alpha-3R Demo";
            this.tabControlDemo.ResumeLayout(false);
            this.tabPageBluetooth.ResumeLayout(false);
            this.tabPageEthernet.ResumeLayout(false);
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.MenuItem menuMenu;
        private System.Windows.Forms.MenuItem menuAbout;
        private System.Windows.Forms.MenuItem menuExit;
        private System.Windows.Forms.Button btnDemo1;
        private System.Windows.Forms.Button btnBtConnect;
        private System.Windows.Forms.Button btnDemo2;
        private System.Windows.Forms.TabControl tabControlDemo;
        private System.Windows.Forms.TabPage tabPageBluetooth;
        private System.Windows.Forms.TabPage tabPageEthernet;
        private System.Windows.Forms.Button btnDemo4;
        private System.Windows.Forms.Button btnWiFiConnect;
        private System.Windows.Forms.Button btnDemo3;
        private System.Windows.Forms.ComboBox comboBox1;
        private System.Windows.Forms.TextBox textBox1;
    }
}

