
class ModalDialog {
    constructor() {
        this.content = null;
        this.htmlNode = null;
        this.userSelect = null;

        this.setText("(Modal dialog)");
    }

    /** ダイアログの本文に文字列を指定する
     * @param {string} text 
     * @return {void}
     */
    setText(text) {
        text = text.replaceAll('\n', '<br>');
        const pElem = document.createElement('p');
        pElem.innerHTML = text;
        this.content = pElem;
    }

    /** ダイアログの本文にHTML要素を指定する
     * @param {HTMLElement} tree
     * @return {void}
     */
    setHTMLContent(tree) {
        this.content = tree;
    }


    /** 非同期でダイアログを表示する
     * @param {string[]} selects  ボタンの選択肢のリスト。デフォルトは "OK" のみ
     * @returns {Promise} resolved with selected button label.
     */
    showAsync(selects = null) {
        return new Promise((resolve, reject) => {
            const dialogElem = document.createElement('dialog');
            dialogElem.style.position = "absolute";
            dialogElem.style.top = "4em";
            const contentDivElem = document.createElement('div');
            contentDivElem.appendChild(this.content);
            dialogElem.appendChild(contentDivElem);
            const buttonsDivElem = document.createElement('div');
            if (selects == null) {
                selects = ["OK"];
            }
            const buttonCallback = (userSelectLabel) => {
                this.htmlNode.close();
                document.body.removeChild(this.htmlNode);
                this.htmlNode = null;
                this.userSelect = userSelectLabel;
                resolve(userSelectLabel);
            };
            for (let i = 0; i < selects.length; i++) {
                const buttonElem = document.createElement('button');
                buttonElem.textContent = selects[i];
                buttonElem.onclick = (ev) => { buttonCallback(ev.target.textContent); }
                buttonsDivElem.appendChild(buttonElem);
            }
            dialogElem.appendChild(buttonsDivElem);
            this.htmlNode = dialogElem;
            document.body.appendChild(dialogElem);
            dialogElem.showModal();
        });
    }
}
