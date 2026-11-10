; Inno Setup Script for StreamLab - Virtual IP Camera Simulator
; Creates a single StreamLab-Setup-1.0.0.exe installer for Windows

#define MyAppName "StreamLab"
#define MyAppVersion "1.0.10"
#define MyAppPublisher "StreamLab Open Source"
#define MyAppURL "https://github.com/botonetics/streamlab"
#define MyAppExeName "StreamLab.exe"

[Setup]
AppId={{E65B932A-23B7-4CD5-8EF2-A62E2E6941F4}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
; "PrivilegesRequiredOverridesAllowed=dialog" allows users to choose "Install for all users" or "Install for me only"
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=..\dist-installer
OutputBaseFilename=StreamLab-Setup-{#MyAppVersion}
SetupIconFile=..\streamlab.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startupicon"; Description: "Start StreamLab automatically when Windows starts"; GroupDescription: "Windows Integration:"; Flags: unchecked

[Files]
Source: "..\dist\StreamLab\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\streamlab.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\streamlab.ico"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: startupicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\backend\streamlab.db*"
Type: filesandordirs; Name: "{app}\__pycache__"
