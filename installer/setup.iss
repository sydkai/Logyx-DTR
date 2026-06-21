; Logyx DTR — Standalone offline installer
; Everything is bundled: app, Node.js, SQLite database. Opens in default browser.
; End users only need: LogyxDTR-Setup.exe (no GitHub, no npm, no internet)

#define MyAppName "Logyx DTR"
#define MyAppVersion "1.2.2"
#define MyAppPublisher "Logyx Systems"
#define MyAppExeName "LogyxDTR.cmd"

[Setup]
AppId={{B8F4A3D2-1C5E-4F7A-9B3D-6E2C8A0F1D4E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Logyx DTR
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=.
OutputBaseFilename=LogyxDTR-Setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
DisableProgramGroupPage=yes
CloseApplications=no
SetupIconFile=..\client\public\icon.ico
UninstallDisplayIcon={app}\app.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: checkedonce

[Files]
; Node.js runtime (node.exe only — server backend)
Source: "nodejs\node.exe"; DestDir: "{app}\nodejs"; Flags: ignoreversion
Source: "nodejs\VERSION.txt"; DestDir: "{app}\nodejs"; Flags: ignoreversion skipifsourcedoesntexist

; React app (built offline)
Source: "..\client\dist\*"; DestDir: "{app}\client\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; SQLite database with employees, admins, and roster XLSX
Source: "..\data\logyx.db"; DestDir: "{app}\data"; Flags: ignoreversion
Source: "..\data\*.xlsx"; DestDir: "{app}\data"; Flags: ignoreversion skipifsourcedoesntexist

; Backend API
Source: "..\server\*.json"; DestDir: "{app}\server"; Flags: ignoreversion
Source: "..\server\index.js"; DestDir: "{app}\server"; Flags: ignoreversion
Source: "..\server\check.js"; DestDir: "{app}\server"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\server\controllers\*"; DestDir: "{app}\server\controllers"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\db\*"; DestDir: "{app}\server\db"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\lib\*"; DestDir: "{app}\server\lib"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\middleware\*"; DestDir: "{app}\server\middleware"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\routes\*"; DestDir: "{app}\server\routes"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\scripts\*"; DestDir: "{app}\server\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\node_modules\*"; DestDir: "{app}\server\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

; Launcher (Node server + default browser — no Electron)
Source: "launcher.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "LogyxDTR.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "LogyxDTR.cmd"; DestDir: "{app}"; Flags: ignoreversion
Source: "start.bat"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\client\public\icon.ico"; DestDir: "{app}"; DestName: "app.ico"; Flags: ignoreversion
Source: "STANDALONE-README.txt"; DestDir: "{app}"; Flags: ignoreversion

[Run]
Filename: "{cmd}"; Parameters: "/c if not exist ""{userappdata}\Logyx DTR"" mkdir ""{userappdata}\Logyx DTR"" && if not exist ""{userappdata}\Logyx DTR\logyx.db"" copy /Y ""{app}\data\logyx.db"" ""{userappdata}\Logyx DTR\logyx.db"""; StatusMsg: "Setting up local database..."; Flags: runhidden
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent; WorkingDir: {app}

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\app.ico"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon; IconFilename: "{app}\app.ico"

[UninstallDelete]
Type: filesandordirs; Name: "{app}\nodejs"
Type: filesandordirs; Name: "{app}\server\node_modules"
Type: dirifempty; Name: "{app}"
