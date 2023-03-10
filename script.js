"use strict";


/** 2色のグレーで構成された格子パターンを描画する
 * @param {HTMLCanvasElement} canvas
 * @returns {void}
 */
const drawSquarePattern = (canvas) => {
    const width = canvas.width;
    const height = canvas.height;
    const blockWidth = 16;
    const blockHeight = 16;
    const darkGray = '#888';
    const brightGray = '#bbb';
    const ctx = canvas.getContext('2d');
    let startWithDarkColor = true;
    let currentColor = darkGray;
    for (let y = 0; y < height; y += blockHeight) {
        if (startWithDarkColor) {
            currentColor = darkGray;
        } else {
            currentColor = brightGray;
        }
        startWithDarkColor = !startWithDarkColor;
        for (let x = 0; x < width; x += blockWidth) {
            ctx.fillStyle = currentColor;
            ctx.fillRect(x, y, x + blockWidth, y + blockHeight);
            if (currentColor == darkGray) {
                currentColor = brightGray;
            } else {
                currentColor = darkGray;
            }
        }
    }
};

class ShowElementAsFullScreenUtil {
    /** 
     * @param {HTMLElement} appRoot
     * @param {HTMLElement} fullscreenRoot
     */
    constructor(appRoot, fullscreenRoot) {
        this.appRoot = appRoot;
        this.fullscreenRoot = fullscreenRoot;
    }

    /**
     * @param {HTMLElement} element 
     */
    async showAsync(element) {
        return new Promise((resolve, reject) => {
            const originalParentElement = element.parentElement;
            this.fullscreenRoot.appendChild(element);
            const currentWidth = element.offsetWidth;
            const currentHeight = element.offsetHeight;
            const ratio = currentHeight / currentWidth;
            const originalWidth = element.style.widows;
            const originalHeight = element.style.height;
            element.style.height = `${100}vh`;
            element.style.width  = `${100 / ratio}vh`;
            const originalPosition = element.style.position;
            element.style.position = "absolute";
            const originalDisplay = this.appRoot.style.display;
            this.appRoot.style.display = "none";
            this.fullscreenRoot.style.display = "block";

            const onclickhandler = (ev) => {
                originalParentElement.appendChild(element);
                element.removeEventListener('click', onclickhandler);
                element.style.width = originalWidth;
                element.style.height = originalHeight;
                element.style.position = originalPosition;
                this.appRoot.style.display = originalDisplay;
                this.fullscreenRoot.style.display = "none";
                resolve("OK");
            }
            element.addEventListener('click', onclickhandler);
        });
    }
}





document.addEventListener("DOMContentLoaded", () => {
    window.debug = {};

    // NOTE: media constraints is set in VideoSouce.js
    //
    // const webcamConstraints = {
    //     video: {
    //         width: { min: 1280 },
    //         height: { min: 720 },
    //         frameRate: { min: 24 }
    //     }
    // };

    const poseDetectorInitOpts = {
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`;
    }};

    const poseDetectionOpts = {
      // Lite = 1, Full = 2
      modelComplexity: 1,
      smoothLandmarks: true,
      // Generate segmentation mask or not
      enableSegmentation: true,
      smoothSegmentation: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };

    /** @type {HTMLParagraphElement} */
    const performanceStatusTextElem = document.querySelector('p#performanceStatus');
    
    /** @type {HTMLSelectElement} */
    const deviceSelectElem = document.querySelector('select#videoSourceDeviceSelect');

    /** @type {HTMLButtonElement} */
    const startButton = document.querySelector('button#startButton');
    /** @type {HTMLButtonElement} */
    const stopButton = document.querySelector('button#stopButton');

    // /** @type {HTMLImageElement} */
    // const sampleBgImageElem = document.querySelector('img#sampleBgImage');

    /** @type {HTMLButtonElement} */
    const fullscreenButtonElem = document.querySelector('button#fullscreenButton');

    /** @type {HTMLButtonElement} */
    const takeBackgroundImageButtonElem = document.querySelector('button#takeBackgroundImageButton');

    /** @type {HTMLCanvasElement} */
    const backgroundImageCanvasElem = document.querySelector('canvas#backgroundImageCanvas');

    /** @type {HTMLButtonElement} */
    const resetBackgroundButtonElem = document.querySelector('button#resetBackgroundButton');

    /** @type {HTMLDivElement} */
    const resultCanvasContainerElem = document.querySelector('div#resultCanvasContainer');

    /** @type {HTMLCanvasElement} */
    const targetVideoFrameCanvasElem = document.querySelector('canvas#targetVideoFrame');

    /** @type {HTMLDetailsElement} */
    const debugCanvasContainerElem = document.querySelector('details#debugCanvasContainer');

    /** @type {HTMLInputElement} */
    const useDilateAreaForMaskCheckboxElem = document.querySelector('input#useDilateAreaForMaskCheckbox');

    /** @type {HTMLInputElement} */
    const forceHideOnNoDetectionCheckboxElem = document.querySelector('input#forceHideOnNoDetectionCheckbox');

    /** @type {HTMLProgressElement} */
    const loadingProgressbarElem = document.querySelector('progress#loadingProgressbar');

    /** @type {HTMLInputElement} */
    const noUpdateDetectedAreaModeCheckboxElem = document.querySelector('input#noUpdateDetectedAreaModeCheckbox');

    /** @type {HTMLInputElement} */
    const minDetectionConfidenceInputElem = document.querySelector('input#minDetectionConfidenceInput');

    /** @type {HTMLInputElement} */
    const minTrackingConfidenceInputElem = document.querySelector('input#minTrackingConfidenceInput');

    /** @type {HTMLElement} */
    const minDetectionConfidenceValueTextElem = document.querySelector('#minDetectionConfidenceValueText');
    
    /** @type {HTMLElement} */
    const minTrackingConfidenceValueTextElem = document.querySelector('#minTrackingConfidenceValueText');

    /** @type {HTMLInputElement} */
    const maskExpansionLevelInputElem = document.querySelector('input#maskExpansionLevelInput');

    /** @type {HTMLElement} */
    const maskExpansionLevelValueTextElem = document.querySelector('#maskExpansionLevelValueText');

    // Elapsed time in msec
    let elapsedTime_msec = 0;

    // Counter of pose estimation exeuction
    let poseestimationCounter = 0;

    let latencyPerformanceCounterStart = 0;
    let latestLatencyPerformanceCounter = 0;

    // Update counter
    setInterval(() => {
        elapsedTime_msec += 1000;
        let posefps = poseestimationCounter / (elapsedTime_msec / 1000);
        let s = `Pose estimation FPS: ${(posefps).toFixed(2)}`;
        s += `, Latency [msec]: ${(latestLatencyPerformanceCounter).toFixed(2)}`;
        performanceStatusTextElem.textContent = s;
    }, 1000);

    /** @type {HTMLDivElement} */
    const debugMaskBitmapCanvasContainerElem = document.querySelector('#debugMaskBitmapCanvasContainer');
    /** @type {HTMLDivElement} */
    const debugMaskWorkspaceCanvasContainerElem = document.querySelector('#debugMaskWorkspaceCanvasContainer');

    /** @type {HTMLParagraphElement} */
    const detectionStatusTextElem = document.querySelector('p#detectionStatusText');

    /** @type {HTMLDivElement} */
    const fullscreenContainerElem = document.querySelector('div#fullscreenContainer');

    /** @type {HTMLDivElement} */
    const appContainerElem = document.querySelector('div#appContainer');


    const maskUtil = new MaskUtil();
    maskUtil.resultFrameCanvas.style.width = "480px";
    maskUtil.resultFrameCanvas.style.height = "280px";
    resultCanvasContainerElem.appendChild(maskUtil.resultFrameCanvas);

    maskUtil.maskBitmapCanvas.style.width = "480px";
    maskUtil.maskBitmapCanvas.style.height = "280px";
    debugMaskBitmapCanvasContainerElem.appendChild(maskUtil.maskBitmapCanvas);
    
    maskUtil.maskWorkspaceCanvas.style.width = "480px";
    maskUtil.maskWorkspaceCanvas.style.height = "280px";
    debugMaskWorkspaceCanvasContainerElem.appendChild(maskUtil.maskWorkspaceCanvas);

    /** @type {Pose} */
    const poseDetector = new Pose(poseDetectorInitOpts);
    window.debug.poseDetector = poseDetector;
    let poseDetectorIsRunning = false;

    const poseOnResults = (results) => {
        window.debug.latestResults = results;
        poseestimationCounter += 1;

        try {
            if (results.segmentationMask) {
                detectionStatusTextElem.textContent = "検出 / Detected.";
                maskUtil.setBackground(targetVideoFrameCanvasElem);
                maskUtil.dilateAreaArg = 1.0 - maskExpansionLevelInputElem.valueAsNumber;
                if (noUpdateDetectedAreaModeCheckboxElem.checked) {
                    maskUtil.generateImage_2(results.segmentationMask, useDilateAreaForMaskCheckboxElem.checked);
                } else {
                    maskUtil.generateImage(results.segmentationMask, useDilateAreaForMaskCheckboxElem.checked);
                }
            
            } else {
                detectionStatusTextElem.textContent = "検出なし！ / Not detected.";

                if (forceHideOnNoDetectionCheckboxElem.checked) {
                    maskUtil.forceHide();
                } else {
                    maskUtil.setAsResult(targetVideoFrameCanvasElem);
                }
            }
            
            if (loadingProgressbarElem.style.display != "none") {
                loadingProgressbarElem.style.display = "none";
            }

        } catch (err) {
            console.error(err);
            console.error(results);
        }

        latestLatencyPerformanceCounter = performance.now() - latencyPerformanceCounterStart;

        poseDetectorIsRunning = false;
    };

    // Call setOptions() needed even if you desire 'default' settings.
    poseDetector.setOptions(poseDetectionOpts);
    poseDetector.onResults(poseOnResults);

    const videoSourceWrapper = new VideoSource();


    const updateVideoSourceDeviceList = () => {
        const previousSelectedIndex = deviceSelectElem.selectedIndex;
        console.debug(`prevseleInd=${previousSelectedIndex}`);
        navigator.mediaDevices.enumerateDevices()
            .then((list) => {
                Array.from(deviceSelectElem.children).forEach((child) => {
                    deviceSelectElem.removeChild(child);
                });
                const videoDevices = list.filter((device) => device.kind == "videoinput");
                videoDevices.forEach((device, index) => {
                    let somethingId = "";
                    if (device.groupId) {
                        somethingId = device.groupId;
                    } else {
                        somethingId = device.deviceId;
                    }
                    const label = `#${index} ${device.label} [${somethingId}]`;
                    const optionElem = document.createElement('option');
                    optionElem.textContent = label;
                    deviceSelectElem.appendChild(optionElem);
                    // console.debug(device, optionElem);
                });

                if (previousSelectedIndex >= 0) {
                    const newSelectedIndex = Math.min(previousSelectedIndex, deviceSelectElem.children.length);
                    deviceSelectElem.selectedIndex = newSelectedIndex;
                }
            })
            .catch((err) => {
                console.error(`Error in enumerateDevices():`, err);
            });
    };

    const getCurrentSelectedSourceDeivceGroupId = () => {
        if (deviceSelectElem.children.length < 1) {
            return null;
        }
        const selectedIndex = deviceSelectElem.selectedIndex;
        const selectedElem = deviceSelectElem.children[selectedIndex];
        const deviceText = selectedElem.textContent;
        const deviceGroupId = deviceText.match(/.+\[(.*)\]$/)[1];
        if (deviceGroupId == "") {
            return null;
        } else {
            return deviceGroupId;
        }
    };


    /**
     * 
     * @param {HTMLVideoElement} videoElem 
     */
    const updateCanvasContent = (videoElem) => {
        /** @type {MediaStream} */
        const stream = videoSourceWrapper.currentMediaStream;

        const videoWidth = stream.getVideoTracks()[0].getSettings().width;
        const videoHeight = stream.getVideoTracks()[0].getSettings().height;

        const ctx = targetVideoFrameCanvasElem.getContext('2d');
        ctx.resetTransform();
        ctx.clearRect(0, 0, targetVideoFrameCanvasElem.width, targetVideoFrameCanvasElem.height);

        if (videoWidth > videoHeight) {
            // Landscape video

            ctx.drawImage(videoElem, 0, 0, targetVideoFrameCanvasElem.width, targetVideoFrameCanvasElem.height);
    
        } else {
            // Portrait video

            const drawHeight = targetVideoFrameCanvasElem.height;
            const drawWidth = Math.floor(drawHeight / videoHeight * videoWidth);
            const ctx = targetVideoFrameCanvasElem.getContext('2d');
            ctx.drawImage(videoElem, 0, 0, drawWidth, drawHeight);
            ctx.translate(drawWidth / 2, drawHeight / 2);
            ctx.rotate(90 * Math.PI / 180);
            ctx.translate(-drawWidth / 2, -drawHeight / 2);
        }

    };


    const startVideoPlayback = () => {
        // console.debug("webcamConstraints", webcamConstraints);

        videoSourceWrapper.stop();

        {
            const availableConstraints = navigator.mediaDevices.getSupportedConstraints();
            if (availableConstraints.groupId) {
                videoSourceWrapper.setDeviceGroupdId(getCurrentSelectedSourceDeivceGroupId());
            } else {
                videoSourceWrapper.setDeviceId(getCurrentSelectedSourceDeivceGroupId());
            }
        }

        videoSourceWrapper.startAsync()
            .then(async (videoElement) => {

                maskUtil.setSize(videoElement.width, videoElement.height);
                maskUtil.setMaskPattern(backgroundImageCanvasElem);

                updateVideoSourceDeviceList();

                // Reset counters
                elapsedTime_msec = 0;
                poseestimationCounter = 0;

                videoSourceWrapper.setCallback(async () => {
                    
                    if (poseDetector && !poseDetectorIsRunning) {

                        updateCanvasContent(videoElement);

                        latencyPerformanceCounterStart = performance.now();
                        poseDetectorIsRunning = true;
                        await poseDetector.send({image: targetVideoFrameCanvasElem});
                    }
                });
            })
            .catch(async (err) => {
                const modalDialog = new ModalDialog();
                modalDialog.setText(`Error in VideoSource.startAsync()\n:${err}`);
                await modalDialog.showAsync();
                updateVideoSourceDeviceList();
            });
    };


    updateVideoSourceDeviceList();


    startButton.addEventListener('click', () => {
        loadingProgressbarElem.style.display = "block";
        startVideoPlayback();
    });


    fullscreenButtonElem.addEventListener('click', async () => {
        const outputFrameElem = maskUtil.resultFrameCanvas;
        const util = new ShowElementAsFullScreenUtil(appContainerElem, fullscreenContainerElem);
        await util.showAsync(outputFrameElem);
    });

    takeBackgroundImageButtonElem.addEventListener('click', async () => {
        if (videoSourceWrapper.isPlaying()) {
            const modalDialog = new ModalDialog();
            modalDialog.setText("カメラの画角から離れて！！\n準備ができたら OK を押してください。\nPress OK, and take a photo.");
            await modalDialog.showAsync();

            const width = backgroundImageCanvasElem.width;
            const height = backgroundImageCanvasElem.height;
            const ctx = backgroundImageCanvasElem.getContext('2d');
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(videoSourceWrapper.getVideoElement(), 0, 0, width, height);

            maskUtil.setMaskPattern(backgroundImageCanvasElem);
        }
    });

    stopButton.addEventListener('click', () => {
        videoSourceWrapper.stop();
        updateVideoSourceDeviceList();
    });

    resetBackgroundButtonElem.addEventListener('click', () => {
        drawSquarePattern(backgroundImageCanvasElem);
        maskUtil.setMaskPattern(backgroundImageCanvasElem);
    });

    const thresholdInputCallback = () => {
        minDetectionConfidenceValueTextElem.textContent = `(${(minDetectionConfidenceInputElem.valueAsNumber.toFixed(2))})`;
        minTrackingConfidenceValueTextElem.textContent = `(${(minTrackingConfidenceInputElem.valueAsNumber.toFixed(2))})`;
    };

    const thrsholdsChangedCallback = () => {
        poseDetectionOpts.minDetectionConfidence = minDetectionConfidenceInputElem.valueAsNumber;
        poseDetectionOpts.minTrackingConfidence = minTrackingConfidenceInputElem.valueAsNumber;
        poseDetector.setOptions(poseDetectionOpts);
    };

    minDetectionConfidenceInputElem.addEventListener('input', (ev) => thresholdInputCallback());
    minTrackingConfidenceInputElem.addEventListener('input', (ev) => thresholdInputCallback());

    minDetectionConfidenceInputElem.addEventListener('change', () => { thresholdInputCallback(); thrsholdsChangedCallback(); });
    minTrackingConfidenceInputElem.addEventListener('change', () => { thresholdInputCallback(); thrsholdsChangedCallback(); });

    const maskExpansionLeveChangedCallback = () => {
        maskExpansionLevelValueText.textContent = `(${maskExpansionLevelInputElem.valueAsNumber.toFixed(2)})`;
    };
    maskExpansionLevelInputElem.addEventListener('input', () => maskExpansionLeveChangedCallback());

    // Draw default background image
    drawSquarePattern(backgroundImageCanvasElem);
    maskUtil.setMaskPattern(backgroundImageCanvasElem);

    // Update thresholds
    thresholdInputCallback();
    thrsholdsChangedCallback();
    maskExpansionLeveChangedCallback();
});
