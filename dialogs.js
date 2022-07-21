class Dialog {

  constructor(options = {}) {

    this.title = options.title || ' ';
    this.$content = $(options.$content || document.createDocumentFragment());
    this.$buttons = $(options.$buttons || document.createDocumentFragment());
    this.width = typeof options.width === 'number' ? options.width : 400;

  }

  updateComponents() {
    let $wrapper = this.$wrapper = $('<div>')
      .addClass('dialog');

    let $win = $('<div>')
      .addClass('dialogWindow')
      .css('width', this.width);
    let $title = this.title ? $('<h2>')
      .addClass('dialogCaption')
      .html(this.title) : $(document.createDocumentFragment());

    let $content = $('<div>')
      .addClass('dialogContent')
      .append(this.$content);

    let $controls = $('<div>')
      .addClass('dialogControls')
      .append(this.$buttons);

    $win.appendTo($wrapper)
      .append($title, $content, $controls);

    $win.draggable({ handle: $title });
  }

  show() {
    this.updateComponents();
    this.$wrapper.appendTo($('body'));
  }

  hide() {
    this.$wrapper.remove();
  }

  static yesNo(text) {
    return new Promise(resolve => {
      let $content = $('<div>').html(text);
      let $yes = $('<button>')
        .addClass('gButton gDefaultButton')
        .html(uiStrings.dg_action_yes)
        .click(() => {
          resolve(true);
          dialog.hide();
        });
      let $no = $('<button>')
        .addClass('gButton')
        .html(uiStrings.dg_action_no)
        .click(() => {
          resolve(false);
          dialog.hide();
        });

      let $buttons = $(document.createDocumentFragment())
        .append($yes, $no);

      let dialog = new Dialog({
        title: '',
        $content,
        $buttons
      });
      dialog.show();

    });
  }

  static message(text, options = {}) {
    return new Promise(resolve => {
      let $content = $('<div>').html(text);
      let $yes = $('<button>')
        .addClass('gButton gDefaultButton')
        .html(uiStrings.dg_action_gotit)
        .click(() => {
          resolve(true);
          dialog.hide();
        });

      let $buttons = $(document.createDocumentFragment())
        .append($yes);

      let dialog = new Dialog({
        title: options.title || '',
        $content,
        $buttons,
        width: typeof options.width === 'number' ? options.width : 400
      });
      dialog.show();

    });
  }

}

class LazyDialog {
  constructor(options) {
    this.$content = $(options.$content);
    this.$buttons = $(options.$buttons);
  }

  updateComponents() {

    let $content = $('<div>')
      .addClass('lazyDialogContent')
      .append(this.$content);

    let $buttons = $('<div>')
      .addClass('lazyDialogButtons')
      .append(this.$buttons);

    let $win = $('<div>')
      .addClass('lazyDialog')
      .append($content, $buttons);

    this.$wrapper = $win;

  }

  show() {
    this.updateComponents();
    $('body').append(this.$wrapper);
  }

  hide() {
    this.$wrapper.remove();
  }

  static yesNo(text) {
    return new Promise(resolve => {
      let $content = $('<div>').html(text);

      let $yes = $('<button>')
        .addClass('gButton')
        .html(uiStrings.dg_action_yes)
        .click(() => {
          resolve(true);
          dialog.hide();
        });

      let $no = $('<button>')
        .addClass('gButton')
        .html(uiStrings.dg_action_no)
        .click(() => {
          resolve(false);
          dialog.hide();
        });

      let $buttons = $(document.createDocumentFragment()).append($yes, $no);
      let dialog = new LazyDialog({ $content, $buttons });
      dialog.show();
    });
  }

}
