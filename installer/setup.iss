; Inno Setup script for Logyx DTR
; Right-click -> Compile to build the installer

#define MyAppName "Logyx DTR"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Logyx"
#define MyAppURL "http://localhost:3001"
#define MyAppExeName "start.bat"

[Setup]
AppId={{B8F4A3D2-1C5E-4F7A-9B3D-6E2C8A0F1D4E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName=C:\Logyx DTR
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=.
OutputBaseFilename=LogyxDTR-Setup
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
DisableProgramGroupPage=yes
CloseApplications=no
SetupIconFile=app.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: checkedonce

[Files]
; Bundled Node.js runtime
Source: "nodejs\*"; DestDir: "{app}\nodejs"; Flags: ignoreversion recursesubdirs createallsubdirs

; Client build
Source: "..\client\dist\*"; DestDir: "{app}\client\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Server files
Source: "..\server\*.json"; DestDir: "{app}\server"; Flags: ignoreversion
Source: "..\server\index.js"; DestDir: "{app}\server"; Flags: ignoreversion
Source: "..\server\controllers\*"; DestDir: "{app}\server\controllers"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\db\*"; DestDir: "{app}\server\db"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\lib\*"; DestDir: "{app}\server\lib"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\middleware\*"; DestDir: "{app}\server\middleware"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\routes\*"; DestDir: "{app}\server\routes"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\scripts\*"; DestDir: "{app}\server\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs

; Server node_modules (pre-installed, no internet needed)
Source: "..\server\node_modules\*"; DestDir: "{app}\server\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

; Data
Source: "..\data\*"; DestDir: "{app}\data"; Flags: ignoreversion recursesubdirs createallsubdirs

; Launcher
Source: "start.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "app.ico"; DestDir: "{app}"; Flags: ignoreversion

; Electron standalone shell
Source: "electron\main.js"; DestDir: "{app}\electron"; Flags: ignoreversion
Source: "electron\package.json"; DestDir: "{app}\electron"; Flags: ignoreversion
Source: "electron\runtime\*"; DestDir: "{app}\electron\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs

; Production .env
Source: "..\server\.env"; DestDir: "{app}\server"; Flags: ignoreversion
Source: "..\server\.env.example"; DestDir: "{app}\server"; Flags: ignoreversion

[Run]
; Seed default admin account and employees
Filename: "{cmd}"; Parameters: "/c ""{app}\nodejs\node.exe"" ""{app}\server\db\seed.js"""; StatusMsg: "Creating default admin account..."; Flags: runhidden

; Create desktop shortcut
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Tasks: desktopicon; Flags: nowait postinstall skipifsilent; WorkingDir: {app}

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\app.ico"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon; IconFilename: "{app}\app.ico"

[UninstallDelete]
Type: filesandordirs; Name: "{app}\nodejs"
Type: filesandordirs; Name: "{app}\electron"
Type: filesandordirs; Name: "{app}\server\node_modules"
Type: dirifempty; Name: "{app}"
