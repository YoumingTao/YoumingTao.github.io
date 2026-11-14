# 主页更新说明

这是可以直接放到 GitHub Pages 仓库根目录的静态网站，保留 `.nojekyll`，不需要安装依赖或运行构建。

## 页面

- `index.html`：Home 页面，包含 Biography、Research Area 和 Openings 提示框
- `publications.html`：Conference Papers 在前，Journal Papers 在后
- `grants-awards.html`：Grants & Funding、Awards & Honors
- `service.html`：Conference Service 与 Journal Service 两组

四页共用样式与导航。双击 `index.html` 也可以本地浏览；本地预览不依赖外网。

论文直接在 `publications.html` 里维护，Conference 和 Journal 各有一个列表。网页按 HTML 中的顺序显示论文，并自动生成编号、年份分隔线和左侧年份目录。

## 切页与缩放

普通点击主导航时，保留当前文档和阅读窗口，只切换该页内容、标题与页内目录，让浏览器缩放继续保持。四个独立 HTML 页面仍可直接打开；在新标签页打开链接也使用独立页面。

直接打开本地 HTML 时，地址通过 `?page=service.html` 等参数记录所选页面，浏览器前进/后退和保存书签均可使用。发布到 GitHub Pages 后，地址仍为四个独立 HTML 页面的实际路径。

添加或修改论文不需要运行任何同步脚本。保存 `publications.html` 后刷新网页即可；发布时也只需提交这一个改动文件。从其他页面点击 Publications 时也会自动读取这份 HTML。

其他三个页面（Home、Grants & Awards、Service）仍可编辑对应 HTML；编辑这些页面后运行 `node scripts/update-page-data.mjs` 同步切页内容。只调整样式时不需要更新内容缓存。

## 论文维护

打开 `publications.html`，搜索“添加新的会议论文”或“添加新的期刊论文”。复制一整段 `<li class="publication" ...> ... </li>`，粘贴在对应列表的最上面，再修改内容。例如：

```html
<li class="publication" data-year="2027">
  <div class="paper-body">
    <div class="paper-title">
      <span class="venue">ICML'27</span> 论文标题
      <a href="https://论文链接" target="_blank" rel="noopener noreferrer">[link]</a>
    </div>
    <strong>Youming Tao</strong>, 其他作者<br>
    <em>会议或期刊的完整发表信息</em>
  </div>
</li>
```

年份只在 `data-year="2027"` 填写一次。会议论文放在 Conference Papers 的列表，期刊论文放在 Journal Papers 的列表。

显示顺序完全按照 HTML 的先后顺序，程序不会重新排序。习惯新的放最上面，就把新条目放在对应列表顶部。Conference 和 Journal 分别从 1 自动编号，不填写 `value` 或手动序号。

程序根据每篇论文的 `data-year`，在相邻年份变化的位置自动画年份线，并生成目录中的年份。若同一年份分成不连续的几段，会在每一段前画线，目录仅保留该年份第一次出现的位置，以保留你安排的论文顺序。

作者加粗使用 `<strong>Youming Tao</strong>`；学生下划线使用 `<u>作者名</u>`；共一作使用 `<sup>✱</sup>`。链接继续使用普通的 `<a href="...">[link]</a>`，保留和原来相同的 HTML 写法。

会议和期刊缩写保留浅灰色标签背景和细边框，标签内文字与个人信息图标共用主题蓝色（#326da8）并加粗，例如 `<span class="venue">AIoT'26</span>`。受邀论文在标签外用方括号标注：`<span class="paper-type">[Invited Paper]</span>`，然后接论文标题。

获奖标注使用 `<br><strong class="award-note">Best Paper Award</strong>`，会自动显示为加粗的波尔多红。

保存后刷新网页即可；不用改编号、年份分隔线、目录或运行同步命令。旧版的 `data/publications.js` 已不参与论文显示。

桌面端页内目录位于个人信息卡片下方，有足够显示空间时默认展开，较长目录在内部滚动。小屏幕、矮窗口或剩余高度不足时默认折叠，点击 On this page 可展开。当前标签页会按页面记住手动开合选择，切页或调整窗口时保留；目录随滚动标记当前阅读位置。

页面默认显示按原版的 125% 放大，正文为 20px；四页共用字号、个人信息卡片和导航。顶部栏约 50px、页内目录栏约 37.5px。窗口高度不超过 675px 时，两者随页面滚动。返回顶部按钮独立保留原尺寸：桌面 40×40px、窄屏 44×44px，箭头为 20px。

全站文字以论文标题的 20px 为最小字号，包括个人信息、导航、目录、年份、注释和链接；手机端也保持这个下限。Publications 和左侧目录均先 Conference、后 Journal，各类分别编号，论文显示顺序遵循 HTML 中的排列。

Awards 每条先列奖项名称，下一行列会议全称和缩写，日期在右侧。两次国家奖学金合并为一条，标明 2×，并保留两次获奖时间。

论文的 Best Paper、Oral 与 contributed talk 标注统一为加粗的波尔多红（#800020）。Service 采用单列列表，每条记录的名称与年份分别对齐，新增记录直接追加在对应角色的列表中。会议名称统一写成“全称（缩写）”，多届会议只显示起止年份（如 2023–2027），单届只显示一个年份。持续至今的期刊审稿年份写成 `2024–present` 等形式。Service 正文中的名称和年份均使用普通文字。

## 原有文件

压缩包中的旧 Jekyll 文件已保留。当前发布以根目录四个 HTML 页面为准，`_pages/about.md` 不参与静态网页显示。
论文内容、作者、链接和个人资料均保留；原来尚未提供链接的论文仍显示原来的占位。

## 上传

解压后将本目录文件覆盖到 GitHub Pages 仓库根目录，提交并推送即可。压缩包本身不要放入仓库。
