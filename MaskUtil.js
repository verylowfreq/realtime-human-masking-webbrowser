
class MaskUtil {
    constructor() {
        this.backgroundCanvas = document.createElement('canvas');
        this.maskPatternCanvas = document.createElement('canvas');
        this.maskBitmapCanvas = document.createElement('canvas');
        this.maskWorkspaceCanvas = document.createElement('canvas');
        this.resultFrameCanvas = document.createElement('canvas');
        this.dilateAreaFunc = (canvas, arg) => this.dilateAreaFallback(canvas, arg);
        this.dilateAreaArg = {};
    }

    dilateAreaFallback(canvas, threshold) {
        const ctx = canvas.getContext('2d');

        const original = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const originalData = original.data;

        // const result = ctx.createImageData(canvas.width, canvas.height);
        // const resultData = result.data;
        const resultData = original.data;

        const bpp = 4;
        const stride = Math.floor(bpp * canvas.width);
        const width = Math.floor(canvas.width);
        const height = Math.floor(canvas.height);
        if (!threshold) {
            threshold = 0;
        }
        threshold = Math.floor(255 * Math.min(1, Math.max(0, threshold)));

        if (threshold == 0) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let startIndex = y * stride + x * bpp;
                    // let r = original.data[startIndex + 0];
                    // let g = original.data[startIndex + 1];
                    // let b = original.data[startIndex + 2];
                    let a = originalData[startIndex + 3];
                    if (a != 0) {
                        resultData[startIndex + 3] = 255;
                    }
                }
            }
        } else {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let startIndex = y * stride + x * bpp;
                    // let r = original.data[startIndex + 0];
                    // let g = original.data[startIndex + 1];
                    // let b = original.data[startIndex + 2];
                    let a = originalData[startIndex + 3];
                    // if (a != 0) {
                    if (a > threshold) {
                        resultData[startIndex + 3] = 255;
                    }
                }
            }
        }
        // return result;
        return original;
    }

    setSize(width, height) {
        this.backgroundCanvas.width = width;
        this.backgroundCanvas.height = height;
        this.maskPatternCanvas.width = width;
        this.maskPatternCanvas.height = height;
        this.maskBitmapCanvas.width = width;
        this.maskBitmapCanvas.height = height;
        this.maskWorkspaceCanvas.width = width;
        this.maskWorkspaceCanvas.height = height;
        this.resultFrameCanvas.width = width;
        this.resultFrameCanvas.height = height;
    }

    /** マスクされない部分の背景画像を設定する */
    setBackground(image) {
        const ctx = this.backgroundCanvas.getContext('2d');
        ctx.drawImage(image, 0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
    }

    /** マスクされるエリアの上書きに用いられる画像を設定する */
    setMaskPattern(image) {
        const ctx = this.maskPatternCanvas.getContext('2d');
        ctx.drawImage(image, 0, 0, this.maskPatternCanvas.width, this.maskPatternCanvas.height);
    }

    generateMaskImage() {
        const ctx = this.maskWorkspaceCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.maskWorkspaceCanvas.width, this.maskWorkspaceCanvas.height);
        // 既存の画像に上書きして描画する
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(this.maskBitmapCanvas, 0, 0, this.maskWorkspaceCanvas.width, this.maskWorkspaceCanvas.height);
        // 既存の画像との共通部分のみ描画する（既存の画像をマスクとして利用する）
        ctx.globalCompositeOperation = "source-in";
        ctx.drawImage(this.maskPatternCanvas, 0, 0, this.maskWorkspaceCanvas.width, this.maskWorkspaceCanvas.height);
    }

    /** 検出領域だけ画像を更新せず、残りは最新のフレームを利用した合成フレームを生成する
     */
    generateImage_2(mask, expandArea = false) {
        const ctx1 = this.maskBitmapCanvas.getContext('2d');
        // 検出領域のマスクを準備
        ctx1.clearRect(0, 0, this.maskBitmapCanvas.width, this.maskBitmapCanvas.height);
        ctx1.drawImage(mask, 0, 0, this.maskBitmapCanvas.width, this.maskBitmapCanvas.height);
        if (expandArea) {
            const dilated = this.dilateAreaFunc(this.maskBitmapCanvas, this.dilateAreaArg);
            ctx1.putImageData(dilated, 0, 0);
        }

        // 検出領域だけ新しいフレームに更新するような画像を生成する
        const ctx3 = this.maskWorkspaceCanvas.getContext('2d');
        ctx3.clearRect(0, 0, this.maskWorkspaceCanvas.width, this.maskWorkspaceCanvas.height);
        ctx3.globalCompositeOperation = "source-over";
        ctx3.drawImage(this.maskBitmapCanvas, 0, 0, this.maskWorkspaceCanvas.width, this.maskWorkspaceCanvas.height);
        ctx3.globalCompositeOperation = "source-out";
        ctx3.drawImage(this.backgroundCanvas, 0, 0, this.maskWorkspaceCanvas.width, this.maskWorkspaceCanvas.height);

        const ctx2 = this.resultFrameCanvas.getContext('2d');
        // 更新範囲のフレームを上書きし、更新範囲外は直前のフレームをそのまま残す
        ctx2.drawImage(this.maskWorkspaceCanvas, 0, 0, this.resultFrameCanvas.width, this.resultFrameCanvas.height);
    }

    /** 与えられたマスクをもとに、合成したフレームを生成する。固定の画像を利用
     * @param {Image}
     * @returns {void}
     */
    generateImage(mask, expandArea = false) {
        const ctx1 = this.maskBitmapCanvas.getContext('2d');
        ctx1.clearRect(0, 0, this.maskBitmapCanvas.width, this.maskBitmapCanvas.height);
        ctx1.drawImage(mask, 0, 0, this.maskBitmapCanvas.width, this.maskBitmapCanvas.height);
        if (expandArea) {
            const dilated = this.dilateAreaFunc(this.maskBitmapCanvas, this.dilateAreaArg);
            ctx1.putImageData(dilated, 0, 0);
            
            // ---- OpenCV.js (SLOW SPEED) ----
            // const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
            // let img = cv.imread(this.maskBitmapCanvas);
            // let mat2 = new cv.Mat();
            // cv.dilate(img, mat2, kernel);
            // cv.imshow(this.maskBitmapCanvas, mat2);
        }

        this.generateMaskImage();

        const ctx2 = this.resultFrameCanvas.getContext('2d');
        ctx2.drawImage(this.backgroundCanvas, 0, 0, this.resultFrameCanvas.width, this.resultFrameCanvas.height);
        ctx2.drawImage(this.maskWorkspaceCanvas, 0, 0, this.resultFrameCanvas.width, this.resultFrameCanvas.height);
    }

    /** 強制的にマスク画像にする */
    forceHide() {
        const ctx = this.resultFrameCanvas.getContext('2d');
        ctx.drawImage(this.maskPatternCanvas, 0, 0, this.resultFrameCanvas.width, this.resultFrameCanvas.height);
    }

    setAsResult(canvas) {
        const ctx2 = this.resultFrameCanvas.getContext('2d');
        ctx2.drawImage(canvas, 0, 0, this.resultFrameCanvas.width, this.resultFrameCanvas.height);
    }
}
