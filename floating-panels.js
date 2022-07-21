class FloatingPanel {
  constructor() {
    this.dom = null;
    this.content = null;
  }
  create() {
    const panel = this.dom = document.createElement('div');
    panel.className = 'floating-panel';
    
    const bg = document.createElement('div');
    bg.className = 'floating-panel-background';
    bg.addEventListener('click', () => {
      this.hide();
    });
    
    const content = this.domContentElement = document.createElement('div');
    content.className = 'floating-panel-content';
    if (this.content)
      content.append(this.content);
      
    panel.append(bg, content);
  }
  showBelowElement(elem) {
    if (this.dom && this.dom.parentNode)
      this.hide();
    this.create();
    const {offsetTop, offsetLeft, offsetWidth, offsetHeight} = elem;
    const content = this.domContentElement;
    let x = offsetLeft;
    let y = offsetTop + offsetHeight;
    this.show(x, y);
  }
  show(x, y) {
    document.body.appendChild(this.dom);
    const content = this.domContentElement;
    content.style.top = y + 'px';
    content.style.left = x + 'px';
  }
  hide() {
    this.dom.parentNode.removeChild(this.dom);
  }
}