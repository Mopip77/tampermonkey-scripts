// ==UserScript==
// @name         Gemini Prompt Injector
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Injects prompt from URL parameters into Gemini input field
// @author       mopip77
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/Mopip77/tampermonkey-scripts/main/gemini/prompt_injector.user.js
// @downloadURL  https://raw.githubusercontent.com/Mopip77/tampermonkey-scripts/main/gemini/prompt_injector.user.js
// ==/UserScript==

(function () {
    'use strict';

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

        waitForElement(inputSelector).then(inputDiv => {
            // Need to wait a bit for the editor to be fully ready/interactive
            setTimeout(() => {
                inputDiv.focus();

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
