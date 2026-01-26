// ==UserScript==
// @name         Gemini Prompt Injector
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Injects prompt from URL parameters into Gemini input field
// @author       mopip77
// @match        https://gemini.google.com/app?*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
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

    function injectPrompt() {
        const promptText = getQueryParam('prompt') || getQueryParam('q') || getQueryParam('text');
        if (!promptText) return;

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

        waitForElement(inputSelector).then(inputDiv => {
            // Need to wait a bit for the editor to be fully ready/interactive
            setTimeout(() => {
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

                // Apply the running lights effect
                targetElement.classList.add('gemini-injector-active');
                
                // Remove the effect on blur or user interaction if desired, 
                // but for now we keep it to highlight the injection. 
                // Alternatively, remove it after a timeout.
                setTimeout(() => {
                    targetElement.classList.remove('gemini-injector-active');
                }, animate_duration_ms); // Remove after 5 seconds

                // Use execCommand to insert text to ensure it plays nice with the editor's internal state
                // This is deprecated but often the most reliable way for rich text editors vs .innerText
                // Alternatively, we can try to find the React/Angular/internal props if this fails
                document.execCommand('insertText', false, promptText + '\n\n----------------\n\n');

                console.log('Gemini Prompt Injector: Text injected.');

                // Optional: clean URL
                // const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                // window.history.replaceState({path: newUrl}, '', newUrl);

            }, 1000); // Slight delay to ensure editor initialization
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
