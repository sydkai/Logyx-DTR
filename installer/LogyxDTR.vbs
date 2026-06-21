Set sh = CreateObject("Wscript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
installDir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = installDir
sh.Run """" & installDir & "\nodejs\node.exe"" """ & installDir & "\launcher.js""", 0, False
