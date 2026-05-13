## תנאים מוקדמים
- התקינו את [Git](https://git-scm.com/downloads/win)
- התקינו את [NET Framework.](https://dotnet.microsoft.com/en-us/download)
- התקינו את [VS Code](https://code.visualstudio.com/download)
  - התקינו את ההרחבה [#C](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp)
  - התקינו את ההרחבה [SQLite Viewer](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer)
- התחברו ל-Git בעזרת הרצת הפקודות:
```
git config --global user.name _
git config --global user.email _
```
- התקינו TypeScript בעזרת הרצת הפקודות:
```
powershell -c "irm bun.sh/install.ps1 | iex"
bun add -g typescript
```
- תנו לתוכנה גישה לפורט הרצוי (במקרה שלנו, פורט 5000) בעזרת פתיחת שורת המשימות כמנהל והרצת הפקודה:
```
netsh http add urlacl url=http://*:5000/ user=Everyone & netsh advfirewall firewall add rule name="_" dir=in action=allow protocol=TCP localport=5000
```

## יצירת פרוייקט חדש
- בחלק העליון של העמוד, לחצו על הכפתור הירוק עליו כתוב "Use this template" ואז על "Create a new Repository", בחרו שם לפרוייקט ולחצו "Create repository".
- נשבט את הפרוייקט החדש שיצרנו בכך שנעתיק את כתובת האתר שלו, נפתח את ה-Command Pallate ב-VS Code, נבחר באפשרות "git: Clone" ונדביק את הכתובת שהעתקנו.

## הרצת הפרוייקט
פתחו את הפרוייקט ב-VS Code והריצו בעזרת הפקודה:
```
dotnet run
```
