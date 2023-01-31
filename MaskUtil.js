
class MaskUtil {
    constructor() {
        this.backgroundCanvas = document.createElement('canvas');
        this.maskPatternCanvas = document.createElement('canvas');
        this.maskBitmapCanvas = document.createElement('canvas');
        this.maskWorkspaceCanvas = document.createElement('canvas');
        this.resultFrameCanvas = document.createElement('canvas');
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
            const dilated = dilateArea(this.maskBitmapCanvas);
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
            const dilated = dilateArea(this.maskBitmapCanvas);
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
