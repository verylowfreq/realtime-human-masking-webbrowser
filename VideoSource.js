
class VideoSource {
    constructor() {
        /** 利用するVideo要素 
         * @type {HTMLVideoElement} */
        this.videoElem = document.createElement('video');

        /** 現在ストリームしているMediaStream
         * @type {MediaStream} */
        this.currentMediaStream = null;

        /** フレームレートの設定値
         * @type {number} */
        this.targetFrameInterval_msec = Math.floor(1000 / 30);

        /** フレーム更新時のコールバック。引数にVideo要素が与えられる */
        this.onNewFrameCallback = null;

        /** メディアデバイス要求時の制約
         *  @type {object} */
        this.mediaConstraints = {
            video: {
                width: 1280,
                height:720
            }
        };

        /** @type {number} */
        this.intervalTimerHandle = null;

        /** @type {bool} */
        this.__isPlaying = false;
    }

    getVideoElement() {
        return this.videoElem;
    }

    isPlaying() {
        return this.__isPlaying;
    }

    setCallback(callback) {
        this.onNewFrameCallback = callback;
    }

    startAsync() {
        return new Promise((resolve, reject) => {
            this.stop();
            navigator.mediaDevices.getUserMedia(this.mediaConstraints)
                .then((stream) => {
                    this.currentMediaStream = stream;
                    this.videoElem.srcObject = stream;
                    /** @type {MediaStreamTrack} */
                    const videoTrack = this.currentMediaStream.getVideoTracks()[0];
                    this.videoElem.width = videoTrack.getSettings().width;
                    this.videoElem.height = videoTrack.getSettings().height;
                    this.videoElem.play();

                    this.intervalTimerHandle = setInterval(() => this.onNewFrame(), this.targetFrameInterval_msec);
                    this.__isPlaying = true;
                    resolve(this.videoElem);
                })
                .catch((err) => {

                    reject(err);
                });
        });
    }

    stop() {
        if (this.intervalTimerHandle != null) {
            clearInterval(this.intervalTimerHandle);
            this.intervalTimerHandle = null;
        }
        if (this.videoElem) {
            this.videoElem.pause();
        }
        if (this.currentMediaStream) {
            this.currentMediaStream.getVideoTracks()[0].stop();
            this.currentMediaStream = null;
        }
        this.__isPlaying = false;
    }

    onNewFrame() {
        if (this.onNewFrameCallback) {
            this.onNewFrameCallback(this.videoElem);
        }
    }

    setDeviceGroupdId(newGroupId) {
        delete this.mediaConstraints.video.deviceId;
        if (!newGroupId) {
            delete this.mediaConstraints.video.groupId;
        } else {
            this.mediaConstraints.video.groupId = newGroupId;
        }
    }

    setDeviceId(newDeviceId) {
        delete this.mediaConstraints.video.groupId;
        if (!newDeviceId) {
            delete this.mediaConstraints.video.deviceId;
        } else {
            this.mediaConstraints.video.deviceId = newDeviceId;
        }
    }
    /**
     * @param {string} newGroupId 
     */
    // async changeSourceByGroupId(newGroupId) {
    //     this.stop();
    //     // this.mediaConstraints.video.groupId = newGroupId;
    //     this.setDeviceGroupdId(newGroupId);
    //     await this.startAsync();
    // }

    async getVideoDeviceListAsync() {
        return new Promise((resolve, reject) => {
            navigator.mediaDevices.enumerateDevices()
                .then((devices) => {
                    resolve(devices);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}
