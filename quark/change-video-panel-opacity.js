// ==UserScript==
// @name         夸克视频工具栏透明度调整
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  调整夸克视频工具栏的背景透明度
// @author       You
// @match        https://pan.quark.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/Mopip77/tampermonkey-scripts/main/quark/change-video-panel-opacity.js
// @downloadURL  https://raw.githubusercontent.com/Mopip77/tampermonkey-scripts/main/quark/change-video-panel-opacity.js
// ==/UserScript==

(function() {
    'use strict';
    
    // 使用 GM_addStyle 添加样式
    GM_addStyle(`
        #videoRef {
            background-color: rgba(34, 34, 34, 0.45) !important;
        }
    `);
})();

