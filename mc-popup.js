class mcpopup {
  constructor() {
    this.components = null;
    this.items = [];
  }

  init() {
    const cmp = this.components = document.createElement('div');

    const bg = $('<div>', {
      'class': 'mcpopup-backgroud'
    });

    const ct= $('<ul>', {
      class: 'mcpopup-itemlist'
    });

    this.items.forEach(item => {
      ct.append($('<li>', {text: item.text}));
    });

    cmp.append(bg, ct);

  }

  add(text, options = {}) {
    this.items.push({
      text,
      icon: options.icon
    })
  }

  show() {
    $('body').append(this.components);
  }

  hide() {
    this.components.remove();
  }
}
