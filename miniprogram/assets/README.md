# Assets 资源目录

## 默认头像

### 方案1：使用 base64 SVG（推荐，已集成）

代码中已使用 base64 编码的 SVG 默认头像：
```javascript
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0E4RTZDRiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lrqI8L3RleHQ+PC9zdmc+'
```

这会显示一个绿色背景的"客"字头像。

### 方案2：放置 PNG 文件（可选）

如需使用 PNG 文件，请按以下步骤操作：

1. 准备一个 100x100 或 200x200 的默认头像图片
2. 命名为 `default-avatar.png`
3. 放置到此目录：`miniprogram/assets/default-avatar.png`
4. 修改 `utils/order-status.js` 中的 `DEFAULT_AVATAR` 常量：

```javascript
const DEFAULT_AVATAR = '/assets/default-avatar.png'
```

## 其他资源

可以将其他静态资源（图片、图标等）放置在此目录。

