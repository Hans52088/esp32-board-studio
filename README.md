# 光點工房 · ESP32 看板設定器

**版本：v1.2.0 · 作者：WHY · 更新日期：2026-11-23**

[更新紀錄](CHANGELOG.md)

線上使用：[開啟看板設定器](https://hans52088.github.io/esp32-board-studio/)

無須安裝、無須後端的繁體中文網頁，適用單片 64×32 HUB75 LED 面板與經典 ESP32。開啟 `index.html` 即可使用，也可直接放上 GitHub Pages。沒有第三方 CDN、追蹤或外部字型依賴。

## 放到 GitHub Pages

1. 在 GitHub 新增一個儲存庫。
2. 將本資料夾內的 `index.html`、`style.css`、`app.js`、`firmware.js`、`release.js`、`.nojekyll` 與本說明上傳到儲存庫最上層。
3. 進入儲存庫 Settings → Pages，選擇 Deploy from a branch。
4. Branch 選擇 `main`，資料夾選 `/ (root)`，按 Save。
5. 待 GitHub 完成部署後，開啟 Pages 顯示的網站網址。

若以其他資料夾或分支部署，選擇實際放置 `index.html` 的位置。此儲存庫已包含可直接部署的靜態網頁。

## 網頁操作

- 設定連線與硬體、開機畫面、一般訊息、公告、門鈴、日期與休眠。
- 上下排可個別設定文字及顏色。每種畫面可設定同步閃爍及亮／滅毫秒數。
- 長文字依實際字型寬度判斷是否捲動。日期使用 Font2，其他文字使用 `efontTW_16`。
- 右側可切換預覽畫面，暫停、重播。預覽持續示範，不依顯示時間跳轉，也不模擬真實 RF 訊號或完整日程。
- 填入 Blynk Template ID、Template 名稱、Auth Token 與 Wi-Fi 名稱，按「下載完整程式碼 .ino」。無密碼網路的 Wi-Fi 密碼可以留空。
- 可檢視與複製程式碼；瀏覽器不支援剪貼簿時可手動複製。
- 設定匯出 JSON 會排除 Auth Token 與 Wi-Fi 密碼；匯入後請重新填入這兩項。重新整理不保留輸入內容。
- 下載的 `.ino` 會包含使用者填入的連線資料，請保存在自己的裝置，不要放進公開的網站儲存庫。

## 上傳 ESP32

1. 安裝 Arduino IDE 與 Espressif ESP32 開發板支援，選擇實際的 ESP32 開發板及連接埠。
2. 透過函式庫管理員安裝：
   - Blynk
   - ESP32 HUB75 LED MATRIX PANEL DMA Display（提供 `ESP32-HUB75-MatrixPanel-I2S-DMA.h`）
   - LovyanGFX（需提供 `lgfx::fonts::efontTW_16`）
   - rc-switch（提供 `RCSwitch.h`）
3. 開啟 `LedBoard.ino`，Arduino IDE 提示時建立同名 `LedBoard` 資料夾。
4. 依網站「接線與七步教學」接好下列 GPIO 與獨立 5V 面板電源，再核對 RF 模組 DATA GPIO。
5. 編譯並上傳；Serial Monitor 設為 115200。

RF 選項避免使用原看板的 HUB75 預設接線腳位，但仍須核對實際開發板、面板接線與所用函式庫版本。GPIO 34–39 僅可輸入，適合做 RF 接收；部分腳位可能未引出。

## Blynk V1 指令

| 指令 | 行為 |
| --- | --- |
| `上排/下排` | 顯示一般訊息，達指定時間後回到日期 |
| `公告:上排/下排` 或 `公告：上排/下排` | 立即公告，並替換之後排程使用的公告 |
| `取消公告` | 清除公告，停止立即與排程播放 |
| `setdate` | 回到日期，暫停自動公告排程，直到收到新公告或一般訊息 |
| `test red`、`test green`、`test blue`、`test white` | 全屏測試，收到其他文字指令後離開 |

以第一個 `/` 分隔上下排。V1 文字輸入元件應使用字串型資料流。

## 行為說明

- 優先順序：門鈴 > 全屏測試 > 開機 > 公告 > 日期／一般訊息。
- 收到 V1 文字指令會結束尚未播放完成的開機畫面。
- RF 分為嗅探與指定模式：嗅探接受所有成功解碼的非零碼；指定模式比對清單，最多 32 組，任一碼符合即觸發相同門鈴畫面。只支援 rc-switch 能解碼的發射器。
- 門鈴再次觸發會重啟顯示及閃爍計時，結束後回到當時應顯示的畫面。一般訊息與公告的期限仍繼續計時。
- 預設公告在排程時間播放；只有透過 V1 收到的新公告會立即播放。
- 排程每日從指定時間起算，依裝置時區運作；深夜期間略過。若顯示分鐘等於間隔，排程會連續播放。
- 排程與夜間休眠都需 NTP 成功同步後啟用。尚未同步時日期顯示 `--/--/--`／`時間同步`；門鈴及一般訊息仍可工作。
- 夜間只熄滅日期待命畫面。手動一般訊息、立即公告、開機、門鈴與測試仍顯示。
- 日期／排程依固定 UTC 時差運作，不自動切換夏令時間。
- 使用無長時間等待的 Wi-Fi／Blynk 重連流程；Blynk 連線嘗試最多等待 50ms，門鈴實際刷新仍受網路函式與幀間隔影響。
- 每次重開機載入網頁匯出時的初始值；Blynk 指令不會寫入永久儲存。
- 此網頁為韌體產生器，不是直接控制裝置的遠端管理介面。

## 預覽與驗證限制

LED 預覽以瀏覽器系統中文字型繪製到 64×32 像素緩衝區，再模擬 LED 光點；字形、寬度及亮度與實體 `efontTW_16` 不會完全一致。繁體字型也不保證收錄所有罕用字。

程式使用與原始看板相同的函式庫介面，未在實體 ESP32／面板上驗證；仍需以你的函式庫版本編譯並實測接線、供電、字形與 RF 接收。

## 檔案結構

- `release.js`：版本、作者、日期與網站更新紀錄的共用資料來源
- `CHANGELOG.md`：版本更新紀錄
- `index.html`：頁面與說明
- `style.css`：響應式版面
- `app.js`：設定表單、驗證、LED 預覽、設定匯入／匯出、程式碼產生
- `firmware.js`：完整 Arduino 韌體範本，使用 `@設定鍵名@` 佔位符

所有網頁檔案必須保留在同一層。修改產生器時，需確認設定鍵與韌體佔位符相符。


## 新手接線與組裝

網站底部提供完整的七步教學，可直接開啟 [接線與組裝教學](https://hans52088.github.io/esp32-board-studio/#assembly)。適用 ESP32-WROOM-32 開發板（GPIO 16、17 可用）及標準 64×32、1/16 掃描 HUB75 面板。其他掃描率、特殊晶片、ESP32-S3 或 WROVER 接線需另行調整。

| 面板 INPUT 訊號 | ESP32 GPIO |
| --- | --- |
| R1 / G1 / B1 | 25 / 26 / 27 |
| R2 / G2 / B2 | 14 / 12 / 13 |
| A / B / C / D | 23 / 19 / 5 / 17 |
| LAT (STB) / OE / CLK | 4 / 15 / 16 |
| GND | GND，與面板電源負極共地 |
| E（若有） | 不接，此配置使用 −1；該位置若標 GND 則接 GND |
| 接收器 DATA | 預設 GPIO 34，可從網頁更改 |

匯出的程式會明確設定 `HUB75_I2S_CFG::i2s_pins`，與此表一致；以訊號標示判斷，不能把 GPIO 編號當成開發板實體排針順序。

1. 準備開發板、面板、排線、USB 資料線及依面板滿載需求選用的穩壓 5V 電源。
2. 斷電後按表接面板 INPUT；使用有 3.3V 轉 5V 邏輯緩衝的合適 HUB75 轉接板可改善輸入電位相容性。
3. 面板由獨立電源 +5V / GND 供電，ESP32 由 USB 供電，所有 GND 共地。此方式不把面板 +5V 同時接 ESP32 VIN，避免回灌；勿用 ESP32 3V3 或小電流板載電源供應面板。
4. 接收器 VCC 依模組規格供電，DATA 必須是 ESP32 可接受的 3.3V 邏輯；若為 5V 訊號要先轉換。模組腳位順序不能假設。
5. 安裝 esp32 by Espressif Systems 與上列函式庫（包含 Adafruit GFX Library）；Blynk 建立自己的 ESP32 / Wi-Fi Template、裝置及 String 型 V1 資料流，取得自己的 ID 與 Token。
6. 在網頁填入連線資料及畫面設定，下載 `LedBoard.ino`，編譯上傳。測試 V1 文字與紅綠藍畫面。
7. 啟用 RF 嗅探，Serial Monitor 設 115200，逐個讀取門鈴數字；換成指定模式並輸入清單，再下載上傳。

GPIO 5、12、15 涉及開機設定，外部電路不可在啟動時強制拉到錯誤電位；GPIO 34–39 只能輸入且沒有內部上拉／下拉。面板／接收器的實際型號、電源電壓與掃描方式請先核對。

## 多組 RF 碼範例與設定檔相容性

門鈴 → RF 觸發模式 → 指定模式，在清單輸入（示例需換成實測值）：

```text
12345678
87654321
13572468
```

支援換行、空白、半形或全形逗號及分號分隔。每組須為 1–4294967295 的十進位整數；同值自動合併，最多 32 組不同碼。不使用 0 代表嗅探，請直接選模式；指定模式沒有碼值不能匯出。各碼共用同一套門鈴顯示設定，修改後需重新上傳 ESP32。

設定檔匯出格式為 version 2，保留讀取 version 1 的相容性。舊版 `rfCode: 0` 轉成嗅探；舊版非零 RF 碼轉成指定模式的一筆清單。

接線參考：[HUB75 函式庫](https://github.com/mrcodetastic/ESP32-HUB75-MatrixPanel-DMA#2-wiring-the-esp32-to-an-led-matrix-panel)、[Espressif GPIO 說明](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/gpio.html)、[Adafruit 面板供電](https://learn.adafruit.com/32x16-32x32-rgb-led-matrix/powering)。

## 版本維護

每次發布請更新 `release.js` 的 version、date 與 history，以及 `index.html` 資源網址的版本參數、README 和 CHANGELOG。網站頁首、頁尾、更新紀錄、匯出程式中的 `BOARD_STUDIO_VERSION`／`BOARD_STUDIO_AUTHOR`／`BOARD_STUDIO_RELEASE_DATE`，以及設定檔的 generator 資訊，均使用 `release.js` 的版本資料。

設定檔的 `version: 2` 表示資料格式，不是網站版本，僅在設定檔結構需要升級時變更。作者固定為 WHY。
