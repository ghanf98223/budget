# 帳本（PWA）

這個目錄包含一個簡單的 Progressive Web App（PWA）。已包含：

- `index.html`、`manifest.json`、`sw.js`、`offline.html` 以及 `icons/`。

部署到 GitHub Pages：

1. 在 GitHub 建立一個新的 repository（例如 `buget`）。
2. 把本地程式碼推到遠端：

```bash
git init
git add .
git commit -m "Initial PWA site"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

3. Workflow 會在每次 push 到 `main`（或 `master`）時自動打包並部署到 GitHub Pages。等待 Actions 完成，然後在 GitHub Repo 的 Settings > Pages 檢查部署網址。

備註：如果你想使用自訂網域，請新增 `CNAME` 檔案到專案根目錄，並在 GitHub Pages 設定中加上你的網域。
