var webui = webui || {};


(function(){


  function element(nodeName, attributes, ...children) {
    const node = document.createElement(nodeName);

    if (attributes) {
      for (let attr of Object.keys(attributes)) {
        node.setAttribute(attr, attributes[attr]);
      }
    }

    for (let child of children) {
      node.append(child);
    }

    return node;
  }


  class FontIcon {
    constructor(iconCode, fontFamily, color) {
      this.code = iconCode;
      this.fontFamily = fontFamily;
      this.color = color;
    }

    _create() {
      let span = this.components = document.createElement('span');
      span.className = 'menuitem-fonticon';
      span.innerHTML = `&#${this.code};`;
      if (this.fontFamily)
        span.style.fontFamily = this.fontFamily;
      if (this.color)
        span.style.color = this.color;
      return span;
    }
  };

  class MenuItem {
    constructor(options = {}) {

      if (options === 'separator')
        options = {type: 'separator'};

      let { type, text, defaultItem, disabled, checked, group, shortcut,
            onclick, onshow, menu, fontIconCode, icon } = options;

      // basic properties
      this.type = type || 'command';
      this.text = text || '';
      this.defaultItem = !!defaultItem;
      this.disabled = !!disabled;
      this.group = group;
      this.icon = fontIconCode ? new UI.FontIcon(fontIconCode) : icon;
      this.shortcut = shortcut;

      // event handlers
      this.onclick = onclick || null;
      this.onshow = onshow || null;

      // checkboxes
      this.checked = checked;


      // cache the relations between this item and its parent and child
      // to use later to open and close menus
      this.menu = menu || new Menu(); // creates a menu if none is set
      this.menu.parentItem = this;
      this.parentMenu = null;

    }

    create() {

      if (typeof this.onshow === 'function')
        this.onshow(this);

      let menuitem = this.$components = element('li');
      menuitem.classList.add('menuitem');

      let button = element('button');
      button.appendChild(element('span', {class: 'menuitem-text'}, this.text));

      if (typeof this.shortcut === 'string') {
        button.appendChild(element('span', {class: 'menuitem-shortcut'}, this.shortcut));
      }

      if (this.type === 'separator')
        return menuitem.appendChild(element('hr'));

      menuitem.appendChild(button);

      if (this.icon instanceof FontIcon) {
        button.appendChild(this.icon._create());
        this._containsIcon = true;
      }

      if (this.type === 'checkbox') {
        menuitem.classList.add('checkbox');
        button.addEventListener('mouseup', () => {
          this.checked = !this.checked;
        });
      } else if (this.type === 'radio') {
        menuitem.classList.add('radio');
        button.addEventListener('mouseup', () => {
          if (this.parentMenu && this.parentMenu.items) {
            this.parentMenu.items.forEach(item => {
              if (item.type === 'radio' && item.group === this.group) {
                item.checked = false;
              }
            });
            this.checked = true;
          }
        });
      }

      if (this.checked)
        menuitem.classList.add('checked');

      if (this.defaultItem)
        button.classList.add('default-item');

      button.disabled = !!this.disabled;

      if (this.menu.isEmpty() && !this.disabled) {
        button.addEventListener('click', e => {
          if (typeof this.onclick == 'function')
            this.onclick(this, e);

          this.parentMenu.hide(true);

          e.preventDefault();
          e.stopImmediatePropagation();
        });
      }

      function preventdef(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }

      button.addEventListener('mousedown', preventdef);
      button.addEventListener('moudeup', preventdef);
      button.addEventListener('contextmenu', preventdef);

      if (!this.menu.isEmpty()) {
        menuitem.classList.add('has-menuitems');
      }

      return menuitem;
    }
  };

  class Menu {

    constructor({ onshow } = {}) {
      this.items = [];
      this.$components = null;
      this.parentItem = null;
      this.onshow = onshow || null;
    }

    isEmpty() {
      return this.items.length == 0;
    }

    append(text, onclick, options = {}) {
      if (typeof onclick === 'object' && onclick !== null)
        options = onclick;
      else
        options.onclick = onclick;

      options.text = text;

      const item = new MenuItem(options);
      item.parentMenu = this;
      this.items.push(item);
      return this;
    }

    appendSeparator() {
      const item = new MenuItem({type: 'separator'});
      this.items.push(item);
      return this;
    }

    bulkAdd(items) {
      for (var item of items) {
        if (!(item instanceof MenuItem))
          item = new MenuItem(item);
        item.parentMenu = this;
        this.items.push(item);
      }
      return this;
    }

    create() {

      let ul = this.$components = element('ul', {class: 'menu'});

      this.items.forEach(item => {
        item._active = false;
        let li = item.create();
        if (item._containsIcon) {
          ul.classList.add('menu-contains-icons');
        }
        let timeout = null;

        ul.addEventListener('mouseover', e => {
          e.stopPropagation();
        });

        ul.addEventListener('contextmenu', e => {
          e.preventDefault();
          e.stopImmediatePropagation();
        });

        li.addEventListener('mouseover', (e) => {
          if (item._active)
            return;
          e.stopPropagation();
          this._active = true;
          this._focused = true;
          this.deactivateItems();
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            this.activateItem(item);
          }, 300);
        });

        li.addEventListener('mouseout', () => {
          clearTimeout(timeout);
        });

        ul.appendChild(li);
      });

      return ul;
    }

    lockScrolling() {
      let sx = window.scrollX;
      let sy = window.scrollY;
      this._scrollPosition = [sx, sy];
      window.addEventListener('scroll', this);
    }

    unlockScrolling() {
      window.removeEventListener('scroll', this);
    }

    addListeners() {
      window.addEventListener('mousedown', this);
      window.addEventListener('keydown', this);
      window.addEventListener('wheel', this, true);
      if (!this.__debug__) {
        window.addEventListener('blur', this);
        window.addEventListener('resize', this);
      }

    }

    removeListeners() {
      window.removeEventListener('mousedown', this);
      window.removeEventListener('keydown', this);
      window.removeEventListener('wheel', this, true);
      if (!this.__debug__) {
        window.removeEventListener('blur', this);
        window.removeEventListener('resize', this);
      }
    }

    show(x, y) {

      if (this.onshow)
        this.onshow(this);

      let menuElement = this.create();

      Object.assign(this.$components.style, {
        position: 'absolute',
        visibility: 'hidden',
        display: 'block'
      });

      document.body.appendChild(this.$components);


      let { width, height } = menuElement.getBoundingClientRect(),
          viewport = document.documentElement;

      if (height > viewport.clientHeight) {
        // if the menu is bigger than the viewport
        y = 0;
      }
      else if (y + height > viewport.clientHeight) {
        // if the bottom of the menu goes off the bottom of the viewport
        if (y - height >= 0)
          y -= height; // and it fits when open above y
        else // both tries failed
          y = viewport.clientHeight - height;
      }

      if (x >= viewport.clientWidth - width) {
        x = viewport.clientWidth - width;
      }

      Object.assign(this.$components.style, {
        top: viewport.scrollTop + y + 'px',
        left: viewport.scrollLeft + x + 'px',
        visibility: 'visible'
      });

      this.addListeners();
      this._active = true;

    }

    // show the menu aligned with the given element
    showAroundElement(elem) {


      if (this.onshow)
        this.onshow(this);

      let viewport = document.documentElement,
          x = 0, y = 0;

      let menuElement = this.create();
      document.querySelector('body').appendChild(menuElement);

      Object.assign(this.$components.style, {
        position: 'absolute',
        visibility: 'hidden',
        display: 'block'
      });

      let menuRect = menuElement.getBoundingClientRect();
      let elemRect = elem.getBoundingClientRect();
      
      const menuStyles = window.getComputedStyle(menuElement)
      const menuTopPadding = parseInt(menuStyles.paddingTop);
      const menuBottomPadding = parseInt(menuStyles.paddingBottom);

      x = elemRect.left + elemRect.width;
      y = elemRect.top - menuTopPadding;

      if (x + menuRect.width > viewport.clientWidth) {
        x = elemRect.left - menuRect.width;
        if (x < 0) {
          x = 0;
        }
      }

      if (y + menuRect.height > viewport.clientHeight) {
        y = elemRect.top + elemRect.height - menuRect.height + menuBottomPadding;
        if (y < 0)
          y = viewport.clientHeight - menuRect.height;
      }

      Object.assign(this.$components.style, {
        top: viewport.scrollTop + y + 'px',
        left: viewport.scrollLeft + x + 'px',
        visibility: 'visible'
      });

      this.addListeners();
      this._active = true;
    }

    showBellowElement(elem) {


      if (this.onshow)
        this.onshow(this);

      let viewport = document.documentElement,
          x = 0, y = 0;

      let menuElement = this.create();
      document.body.appendChild(menuElement);

      Object.assign(this.$components.style, {
        position: 'absolute',
        visibility: 'hidden',
        display: 'block'
      });

      let menuRect = menuElement.getBoundingClientRect();
      let elemRect = elem.getBoundingClientRect();

      x = elemRect.left;
      y = elemRect.bottom;


      if (y + menuRect.height > viewport.clientHeight)
        y = elemRect.top - menuRect.height;

      if (y < 0) {
        y = viewport.clientHeight - menuRect.height;
      }

      if (elemRect.left + menuRect.width > viewport.clientWidth) {
        x = elemRect.right - menuRect.width;
        if (x < 0) {
          x = 0;
        }
      }


      Object.assign(this.$components.style, {
        top: viewport.scrollTop + y + 'px',
        left: viewport.scrollLeft + x + 'px',
        visibility: 'visible'
      });

      this.addListeners();
      this._active = true;
    }

    hide(closeAll) {
      this._active = false;
      for (let item of this.items) {
        if (item.menu._active)
          item.menu.hide();
      }
      if (this.parentItem && this.parentItem.parentMenu) {
        this.parentItem.parentMenu._active = true;
        if (closeAll) {
          this.parentItem.parentMenu.hide(true);
        }
      }
      if (this.$components) this.$components.remove();

      this.removeListeners();

      if (typeof this.onhide === 'function')
        this.onhide(this);
    }

    deactivateItems() {
      for (let item of this.items) {
        if (item._active)
          item.menu.hide();
        item._active = false;
        item.$components.classList.remove('active');
      }
    }

    activateItem(item) {
      if (typeof item === 'number')
        item = this.items[item];
      if (!item)
        return;
      item._active = true;
      item.$components.classList.add('active');
      if (!item.menu.isEmpty()) {
        item.menu.showAroundElement(item.$components);
        this._active = false;
      }
    }

    blurItems() {
      this.deactivateItems();
      for (let item of this.items) {
        if (item._focused) {
          item.$components.classList.remove('focus');
          item.$components.firstChild.blur();
          item._focused = false;
        }
      }
    }

    focusItem(item) {
      item._focused = true;
      item.$components.classList.add('focus');
      item.$components.firstChild.focus();
    }

    handleEvent(e) {

      if (e.type === 'mousedown') {
        if (!this.$components.contains(e.target)) {
          this.hide();
        }
      } else if (e.type === 'keydown' && this._active) {
        if (e.key === 'Enter') {
          let focus = this.items.find(item => item._focused);
          if (focus) {
            this.activateItem(focus);
          }
        }
        else if (e.key === 'Escape') {
          this.hide();
          e.preventDefault();
          e.stopPropagation();
        }
        else if (e.key === 'ArrowLeft' && this.parentItem) {
          this.hide();
          e.preventDefault();
          e.stopPropagation();
        }
        else if (e.key === 'ArrowUp') {
          let buttons = this.items.filter(item => item.type !== 'separator');
          let i = buttons.findIndex(item => item._focused),
              f = i - 1;
          if (i <= 0)
            f = buttons.length - 1;
          this.blurItems();
          this.focusItem(buttons[f]);
          e.preventDefault();
          e.stopPropagation();
        }
        else if (e.key === 'ArrowDown') {
          let buttons = this.items.filter(item => item.type !== 'separator');
          let i = buttons.findIndex(item => item._focused),
              f = i + 1;
          if (i < 0 || i >= buttons.length - 1)
            f = 0;
          this.blurItems();
          this.focusItem(buttons[f]);
          e.preventDefault();
          e.stopPropagation();
        }
        else if (e.key === 'ArrowRight') {
          let focus = this.items.find(item => item._focused);
          if (focus && focus.menu) {
            this.activateItem(focus);
            focus.menu.activateItem(0);
          }
          e.preventDefault();
          e.stopPropagation();
        }
      } else if (e.type === 'wheel') {
        const c = this.$components;
        if (!c.contains(e.target) || // if wheel is not on target
            (c.scrollTop <= 0 && e.deltaY < 0) || // or scrolling up when reached top
            (c.scrollTop >= c.scrollHeight - c.clientHeight && e.deltaY > 0)) { // or scrolling down past bottom
          e.preventDefault(); //block action
          e.stopImmediatePropagation();
        }
      } else if (e.type === 'scroll') {
        const c = this.$components;
        if (!c.contains(e.target)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      } else if (e.type === 'blur' || e.type === 'resize') {
        this.hide();
      }

    }
  }


  class ContextMenu extends Menu {
    constructor() {
      super();
      this.context = null;
    }

    setContext(element) {
      this.context = element;
      this.context.addEventListener('contextmenu', e => {
        this.show(e.clientX, e.clientY);
        e.preventDefault();
        e.stopImmediatePropagation();
      });
    }
  }

  class DropdownMenu extends Menu {

    constructor(context) {
      super();
      this.alignment = 'bottom-left';
      this.context = context;
      this.init();
    }

    init() {

      let open = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        this.showBellowElement(this.context);

        window.addEventListener('keydown', this);
        window.addEventListener('mousedown', close);
      };

      let close = () => {
        this.hide();
        window.removeEventListener('keydown', this);
        window.removeEventListener('mousedown', close);
      };

      if (this.context)
        this.context.addEventListener('click', open);

      this.open = open;
      this.close = close;
    }

    setContext(ctx) {
      this.context = ctx;
      this.context.addEventListener('click', this.open);
    }
  }
  
  Object.assign(webui, {
    FontIcon,
    MenuItem,
    Menu,
    ContextMenu,
    DropdownMenu
  });

  //class MenuBar {
  //  constructor(parent) {
  //    this.$parent = $(parent);
  //    this.items = [];
  //  }
//
  //  add(item) {
  //    this.items.push(item);
  //  }
//
  //  bulkAdd(items) {
  //    this.items.push(...items);
  //  }
//
  //  create() {
//
  //    const $components = this.$components = $('<div>')
  //      .addClass('menubar');
//
  //    const $ul = $('<ul>').appendTo($components);
//
  //    this.items.forEach(item => {
//
  //      const $li = $('<li>').appendTo($ul);
  //      const $btn = $('<button>', {text: item.text})
  //        .appendTo($li);
//
  //      item.menu.context = $btn[0];
//
  //      $btn.click((e) => {
  //        e.preventDefault();
  //        e.stopPropagation();
//
  //        $btn.toggleClass('active');
  //        if ($btn.hasClass('active')) {
  //          this._active = true;
  //          item.menu.open(e);
  //        } else {
  //          this._active = false;
  //          item.menu.close(e);
  //        }
  //      });
//
  //      $btn.on('mouseover', (e) => {
  //        if (!$btn.hasClass('active') && $ul.find('> li > button.active').length) {
  //          this.items.forEach((item) => {
  //            item.menu.close(e);
  //          });
  //          $ul.find('.active').removeClass('active');
  //          item.menu.open(e);
  //          $btn.addClass('active');
  //        }
  //      });
//
  //      function deactivate() {
  //        $ul.find('.active').removeClass('active');
  //        this._active = false;
  //      }
//
  //      item.menu.onhide = deactivate;
//
  //    });
//
  //    //window.addEventListener('keydown', this);
//
  //    this.$parent.empty().append($components);
//
  //  }

  //}


}());
