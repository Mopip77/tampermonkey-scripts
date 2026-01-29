// ==UserScript==
// @name         Gemini Prompt Injector
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Injects prompt from URL parameters or local HTTP server into Gemini input field
// @author       mopip77
// @match        https://gemini.google.com/app?*
// @match        https://gemini.google.com/app#*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/Mopip77/tampermonkey-scripts/main/gemini/prompt_injector.user.js
// @downloadURL  https://raw.githubusercontent.com/Mopip77/tampermonkey-scripts/main/gemini/prompt_injector.user.js
// ==/UserScript==

(function () {
    'use strict';

    const ANIMATION_DURATION_KEY = 'animation_duration_ms';
    const DEFAULT_DURATION = 5000;

    function getAnimationDuration() {
        return GM_getValue(ANIMATION_DURATION_KEY, DEFAULT_DURATION);
    }

    GM_registerMenuCommand('配置动画时长', () => {
        const current = getAnimationDuration();
        const input = prompt(`请输入动画时长（毫秒）（当前：${current}）：`, current);
        if (input !== null) {
            const val = parseInt(input, 10);
            if (!isNaN(val) && val > 0) {
                GM_setValue(ANIMATION_DURATION_KEY, val);
                if (confirm(`时长已设置为 ${val} 毫秒。是否重新加载页面以应用更改？`)) {
                    window.location.reload();
                }
            } else {
                alert('输入无效。请输入一个正整数。');
            }
        }
    });

    const animate_duration_ms = getAnimationDuration();

    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    function getHashParam(param) {
        const hash = window.location.hash;
        if (!hash || hash.length <= 1) return null;
        const hashParams = new URLSearchParams(hash.substring(1));
        return hashParams.get(param);
    }

    function getParam(param) {
        return getQueryParam(param) || getHashParam(param);
    }

    const DEFAULT_PROMPT_PORT = 18232;

    function fetchFromLocalServer(port) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `http://127.0.0.1:${port}/`,
                timeout: 3000,
                onload: (response) => {
                    if (response.responseText) {
                        resolve(response.responseText);
                    } else {
                        reject(new Error('Empty response from local server'));
                    }
                },
                onerror: () => reject(new Error('Cannot connect to local prompt server')),
                ontimeout: () => reject(new Error('Local prompt server timed out'))
            });
        });
    }

    function injectPrompt() {
        const portParam = getParam('port');
        const useServer = portParam !== null;
        const promptText = useServer ? null : (getParam('prompt') || getParam('q') || getParam('text'));
        if (!promptText && !useServer) return;
        const port = useServer ? (parseInt(portParam, 10) || DEFAULT_PROMPT_PORT) : 0;

        // Selector for the Gemini input area (contenteditable div)
        // Note: Class names might change, so we try a few common patterns or generic attributes
        const inputSelector = '.ql-editor, [contenteditable="true"]';

        const waitForElement = (selector) => {
            return new Promise(resolve => {
                if (document.querySelector(selector)) {
                    return resolve(document.querySelector(selector));
                }

                const observer = new MutationObserver(mutations => {
                    if (document.querySelector(selector)) {
                        resolve(document.querySelector(selector));
                        observer.disconnect();
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        };

        // Inject styles for the running lights effect
        const styleId = 'gemini-injector-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes gemini-border-flow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .gemini-injector-active {
                    position: relative !important;
                    /* Create a gradient border using background-clip */
                    border: 3px solid transparent !important;
                    /* border-radius: inherit !important; -- Let's just use the element's own radius by not overriding it, 
                       or explicitly set inherit if we want to be sure to follow parent but here we are modifying the element itself 
                       so removing it allows the existing class to rule. */
                    
                    background-image: linear-gradient(var(--md-sys-color-surface-container-lowest, #fff), var(--md-sys-color-surface-container-lowest, #fff)), 
                                      linear-gradient(90deg, #4285F4, #9B72CB, #D96570, #F4B400, #0F9D58, #4285F4);
                    background-origin: border-box;
                    background-clip: padding-box, border-box;
                    background-size: 100% 100%, 400% 400%;
                    animation: gemini-border-flow 3s ease infinite;
                    box-shadow: 0 0 15px rgba(66, 133, 244, 0.3);
                    transition: all 0.3s ease;
                    
                    /* Ensure we don't mess up the layout if the original had a specific display */
                    /* display: block; -- risky if it's flex */
                }
            `;
            document.head.appendChild(style);
        }

        waitForElement(inputSelector).then(async inputDiv => {
            // Need to wait a bit for the editor to be fully ready/interactive
            await new Promise(r => setTimeout(r, 1000));

            let textToInject = promptText;
            if (useServer) {
                try {
                    textToInject = await fetchFromLocalServer(port);
                } catch (e) {
                    console.error('Gemini Prompt Injector:', e.message);
                    return;
                }
                if (!textToInject) {
                    console.warn('Gemini Prompt Injector: empty response from server.');
                    return;
                }
            }

            inputDiv.focus();

            // Find the main container (the rounded white box)
            // We look for 'input-area-v2' specifically as identified, or fallback to walking up
            let container = inputDiv.closest('input-area-v2');

            if (!container) {
                // Fallback heuristic: find the first parent with a substantial border radius and background
                let current = inputDiv.parentElement;
                while (current && current !== document.body) {
                    const style = window.getComputedStyle(current);
                    if (parseInt(style.borderRadius) > 20 && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
                        container = current;
                        break;
                    }
                    current = current.parentElement;
                }
            }

            const targetElement = container || inputDiv;

            if (targetElement.dataset.geminiInjected === 'true') {
                console.log('Gemini Prompt Injector: Already injected, skipping.');
                return;
            }
            targetElement.dataset.geminiInjected = 'true';

            // Apply the running lights effect
            targetElement.classList.add('gemini-injector-active');

            setTimeout(() => {
                targetElement.classList.remove('gemini-injector-active');
            }, animate_duration_ms);

            document.execCommand('insertText', false, textToInject + '\n\n----------------\n\n');

            console.log('Gemini Prompt Injector: Text injected.');
        });
    }

    // Run on load
    injectPrompt();

    // Listen for navigation events if Gemini is a SPA that doesn't reload full page
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            injectPrompt();
        }
    }).observe(document, { subtree: true, childList: true });

})();
