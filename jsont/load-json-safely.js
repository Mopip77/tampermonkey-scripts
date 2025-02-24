// ==UserScript==
// @name         JSON Online Editor - Safe JSON Paste
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Safely handle JSON paste with big numbers in JSON Online Editor
// @author       mopip77
// @match        https://www.jsont.run
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/mopip77/tampermonkey-scripts/main/jsont/load-json-safely.js
// @downloadURL  https://raw.githubusercontent.com/mopip77/tampermonkey-scripts/main/jsont/load-json-safely.js
// ==/UserScript==

(function () {
  "use strict";

  const style = `
.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal {
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    animation: modalFadeIn 0.2s ease-out;
}

.modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 8px;
}

.modal-content {
    color: #6B7280;
    margin-bottom: 24px;
    line-height: 1.5;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-primary {
    background: #2563EB;
    color: white;
    border: none;
}

.btn-primary:hover {
    background: #1D4ED8;
}

.btn-secondary {
    background: white;
    color: #374151;
    border: 1px solid #D1D5DB;
}

.btn-secondary:hover {
    background: #F3F4F6;
}

@keyframes modalFadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}`;

  // 添加样式到文档
  const styleSheet = document.createElement("style");
  styleSheet.textContent = style;
  document.head.appendChild(styleSheet);

  function isBigNumber(value) {
    return (
      typeof value === "number" &&
      (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER)
    );
  }

  function hasBigNumber(json) {
    if (typeof json !== "object" || json === null) return false;
    for (const key in json) {
      if (
        isBigNumber(json[key]) ||
        (typeof json[key] === "object" && hasBigNumber(json[key]))
      ) {
        return true;
      }
    }
    return false;
  }

  function convertBigNumbersToString(json) {
    if (typeof json !== "object" || json === null) return json;
    for (const key in json) {
      if (isBigNumber(json[key])) {
        json[key] = json[key].toString();
      } else if (typeof json[key] === "object") {
        convertBigNumbersToString(json[key]);
      }
    }
    return json;
  }

  function convertBigNumbersInJsonString(jsonString) {
    // 使用 JSON 解析器的位置来追踪，确保只替换值位置的数字
    let inString = false;
    let result = "";
    let numBuffer = "";

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];

      // 处理字符串
      if (char === '"' && jsonString[i - 1] !== "\\") {
        inString = !inString;
        result += char;
        continue;
      }

      if (inString) {
        result += char;
        continue;
      }

      // 处理数字
      if (/[\d-]/.test(char)) {
        numBuffer += char;
      } else {
        if (numBuffer) {
          const num = Number(numBuffer);
          result += isBigNumber(num) ? `"${numBuffer}"` : numBuffer;
          numBuffer = "";
        }
        result += char;
      }
    }

    // 处理最后可能剩余的数字
    if (numBuffer) {
      const num = Number(numBuffer);
      result += isBigNumber(num) ? `"${numBuffer}"` : numBuffer;
    }

    return result;
  }

  // 创建模态对话框
  function createModal(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "overlay";

      const modal = document.createElement("div");
      modal.className = "modal";

      modal.innerHTML = `
                <div class="modal-title">确认操作</div>
                <div class="modal-content">${message}</div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-action="cancel">取消</button>
                    <button class="btn btn-primary" data-action="confirm">确认</button>
                </div>
            `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const handleClick = (e) => {
        const action = e.target.dataset.action;
        if (action) {
          overlay.remove();
          resolve(action === "confirm");
        }
      };

      modal.addEventListener("click", handleClick);
    });
  }

  // 修改 paste 事件处理函数
  window.addEventListener("paste", async function (event) {
    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData("text");
    
    if (event.target?.tagName === 'TEXTAREA') {
        // 如果是 textarea 说明是文本视图，使用 monaco-editor
        // 这里不处理，直接返回
        console.log("Textarea detected, no action taken.");
        return;
    }

    console.log("Pasted data:", event);

    try {
      const json = JSON.parse(pastedData);
      if (hasBigNumber(json)) {
        event.preventDefault();
        event.stopPropagation(); // 阻止事件传播
        const confirmed = await createModal(
          "JSON 中存在 big number，可能导致精度损失，是否转化成字符串后解析？"
        );
        if (confirmed) {
          console.log("Converting big numbers to strings...");
          const convertedJsonString = convertBigNumbersInJsonString(pastedData);
          const convertedJson = JSON.parse(convertedJsonString);
          console.log("Converted JSON:", convertedJson);
          document.execCommand(
            "insertText",
            false,
            JSON.stringify(convertedJson, null, 2)
          );
        } else {
          document.execCommand("insertText", false, pastedData);
        }
      }
    } catch (e) {
      console.log("Invalid JSON pasted, no action taken.");
    }
  }, { capture: true }); // 使用捕获阶段
})();
