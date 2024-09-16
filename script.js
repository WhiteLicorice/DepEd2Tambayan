// ==UserScript==
// @name         DepEd2Tambayan
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Scrape PDF modules from DepEd Tambayan in one click.
// @author       Rene Andre Bedonia Jocsing
// @icon         https://external-content.duckduckgo.com/ip3/depedtambayan.net.ico
// @match        https://depedtambayan.net/*
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// ==/UserScript==

(function () {
    'use strict';

    // Add menu entry to Tampermonkey for cleaner UI
    GM_registerMenuCommand("Scrape PDF", function(MouseEvent) {
        runScriptPipeline();
    }, {
        accessKey: "f",
        autoClose: true
    });

    (async function() {
        await waitForContainer();

        const canvasBar = document.querySelector('.pdfemb-toolbar');

        // Create a floating button element
        const floatingButton = document.createElement("button");
        //floatingButton.class.append('pdfemb-download');
        floatingButton.textContent = "DOWNLOAD";
        floatingButton.style.position = "absolute";
        floatingButton.style.top = "0";
        floatingButton.style.right = "20px";
        floatingButton.style.zIndex = "9999";

        // Attach a click event listener to the button
        floatingButton.addEventListener("click", runScriptPipeline);
        floatingButton.addEventListener("click", () => {
            floatingButton.disabled = true; // Disable the button
            floatingButton.textContent = "CONGRATS!";
        });

        // Append the button to the body of the page
        canvasBar.appendChild(floatingButton);

    })();

    async function runScriptPipeline() {
    try {
        // Wait until the container div is loaded
        await waitForContainer();

        const images = [];
        let hasMorePages = true;

        let pageNumber = 1;
        while (hasMorePages) {
            // Capture the image from the current page
            const image = await capturePageImage(pageNumber);
            if (image) {
                images.push(image);
            }

            // Check if there are more pages to navigate
            hasMorePages = await navigateToNextPage();
            pageNumber++;
        }

        if (images.length === 0) {
            alert("No pages found to scrape. Wait for them to load?");
            return;
        }

        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add each canvas image to the PDF
        images.forEach((imgDataUrl, index) => {
            if (index > 0) {
                doc.addPage(); // Add a new page after the first one
            }
            // TODO: Need to fetch image dimensions dynamically, but this seems to work fine for now
            doc.addImage(imgDataUrl, 'JPEG', 0, 0, 180, 240);
        });

        // Get the filename from the entry-title class
        const titleElement = document.querySelector('.entry-title');
        const filename = titleElement ? titleElement.textContent.trim().toUpperCase().replace(/\s+/g, '_') : 'MODULE';

        // Save the generated PDF
        doc.save(`${filename}.pdf`);

    } catch (err) {
        console.error('Error creating PDF:', err);
    }
}

    async function waitForContainer() {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                const container = document.querySelector('.pdfemb-pagescontainer.grab-to-pan-grab');
                if (container) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1000); // Check every 1 second
        });
    }

    async function capturePageImage(pageNumber) {
        const container = document.querySelector('.pdfemb-pagescontainer.grab-to-pan-grab');
        if (!container) {
            console.error('Container div not found.');
            return null;
        }

        const div = container.querySelector(`.pdfemb-inner-div.pdfemb-page${pageNumber}`);
        if (!div) {
            console.error('No .pdfemb-inner-div found.');
            return null;
        }

        const canvas = div.querySelector('.pdfemb-the-canvas');
        if (!canvas || !isCanvasRendered(canvas)) {
            console.warn('Canvas not rendered or found.');
            return null;
        }

        return await getCanvasDataUrl(canvas);
    }

    function isCanvasRendered(canvas) {
        return canvas.width > 0 && canvas.height > 0;
    }

    function getCanvasDataUrl(canvas) {
        const dataUrl = canvas.toDataURL('image/jpeg');
        return dataUrl
    }

    async function navigateToNextPage() {
        const nextButton = document.querySelector('.pdfemb-next');
        if (!nextButton) {
            console.warn('Next button not found.');
            return false; // No more pages to navigate
        }

        const isDisabled = nextButton.classList.contains('pdfemb-btndisabled');
        if (isDisabled) {
            return false; // No more pages to navigate
        }

        // Click the next button and wait for the next page to load
        nextButton.click();
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for a short time to allow the next page to load

        return true;
    }

})();
