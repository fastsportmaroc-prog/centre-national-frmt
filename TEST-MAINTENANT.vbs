Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\USER\tennis-center"
sh.Run "cmd /c npm install", 1, True
sh.Run "cmd /k title FRMT SERVEUR && cd /d C:\Users\USER\tennis-center && npm run dev", 1, False
WScript.Sleep 8000
sh.Run "http://localhost:3000/auth/login", 1, False
