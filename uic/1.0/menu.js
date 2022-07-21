var uic = uic || {};


(function(){

  uic.FontIcon = class {
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

  uic.MenuItem = class {
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
      this.menu = menu || new uic.Menu(); // creates a menu if none is set
      this.menu.parentItem = this;
      this.parentMenu = null;

    }

    create() {

      if (typeof this.onshow === 'function')
        this.onshow(this);

      let $menuitem = this.$components =  $('<li>').addClass('menuitem');
      let $button = $('<button>').append($('<span>', {class: 'menuitem-text'}).text(this.text));

      if (typeof (this.shortcut === 'string')) {
        $button.append($('<span>', {class: 'menuitem-shortcut'}).text(this.shortcut));
      }

      if (this.type === 'separator')
        return $menuitem.append($('<hr>'));

      $menuitem.append($button);

      if (this.icon instanceof uic.FontIcon) {
        $button.append(this.icon._create());
        this._containsIcon = true;
      }

      if (this.type === 'checkbox') {
        $menuitem.addClass('checkbox');
        $button.on('mouseup', () => {
          this.checked = !this.checked;
        });
      } else if (this.type === 'radio') {
        $menuitem.addClass('radio');
        $button.on('mouseup', () => {
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
        $menuitem.addClass('checked');

      if (this.defaultItem)
        $button.addClass('default-item');

      $button.attr('disabled', !!this.disabled);

      if (this.menu.isEmpty() && !this.disabled) {
        $button.on('click', e => {
          if (typeof this.onclick == 'function')
            this.onclick(this, e);

          this.parentMenu.hide(true);

          e.preventDefault();
          e.stopImmediatePropagation();
        });
      }

      $button.on('mousedown mouseup contextmenu', e => {
        e.preventDefault();
        e.stopImmediatePropagation();
      });

      if (!this.menu.isEmpty()) {
        $menuitem.addClass('has-menuitems');
      }

      return $menuitem;
    }
  };

  uic.Menu = class {

    constructor({ onshow } = {}) {
      this.items = [];
      this.$components = null;
      this.parentItem = null;
      this.onshow = onshow || null;
    }

    isEmpty() {
      return this.items.length == 0;
    }

    add() {
      for (var item of arguments) {
        if (!(item instanceof uic.MenuItem))
          item = new uic.MenuItem(item);
        item.parentMenu = this;
        this.items.push(item);
      }
      return this;
    }

    addSeparator() {
      this.add({type: 'separator'});
    }

    bulkAdd(items) {
      for (var item of items) {
        if (!(item instanceof uic.MenuItem))
          item = new uic.MenuItem(item);
        item.parentMenu = this;
        this.items.push(item);
      }
      return this;
    }

    create() {

      let $ul = this.$components = $('<ul>').addClass('menu');

      this.items.forEach(item => {
        item._active = false;
        let $li = item.create();
        if (item._containsIcon) {
          $ul.addClass('menu-contains-icons');
        }
        let timeout = null;

        $ul.on('mouseover', e => {
          e.stopPropagation();
        });

        $ul.on('contextmenu', e => {
          e.preventDefault();
          e.stopImmediatePropagation();
        });

        $li.on('mouseover', (e) => {
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

        $li.on('mouseout', () => {
          clearTimeout(timeout);
        });

        $ul.append($li);
      });

      return $ul;
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

      this.create();

      let menuElement = this.$components[0];

      this.$components.css({
        position: 'absolute',
        visibility: 'hidden',
        display: 'block'
      });

      $('body').append(this.$components);


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

      this.$components.css({
        top: viewport.scrollTop + y,
        left: viewport.scrollLeft + x,
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

      let menuElement = this.create()[0];
      $('body').append(menuElement);

      this.$components.css({
        position: 'absolute',
        visibility: 'hidden',
        display: 'block'
      });

      let menuRect = menuElement.getBoundingClientRect();
      let elemRect = elem.getBoundingClientRect();

      x = elemRect.left + elemRect.width;
      y = elemRect.top;

      if (x + menuRect.width > viewport.clientWidth) {
        x = elemRect.left - menuRect.width;
        if (x < 0) {
          x = 0;
        }
      }

      if (y + menuRect.height > viewport.clientHeight) {
        y = elemRect.top + elemRect.height - menuRect.height;
        if (y < 0)
          y = viewport.clientHeight - menuRect.height;
      }

      this.$components.css({
        top: viewport.scrollTop + y,
        left: viewport.scrollLeft + x,
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

      let menuElement = this.create()[0];
      $('body').append(menuElement);

      this.$components.css({
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


      this.$components.css({
        top: viewport.scrollTop + y,
        left: viewport.scrollLeft + x,
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
      if (this.parentItem && this.parentItem.parentMenu)
        this.parentItem.parentMenu._active = true;
      if (this.$components) this.$components.remove();
      if (closeAll && this.parentItem) {
        this.parentItem.parentMenu.hide();
      }

      this.removeListeners();

      if (typeof this.onhide === 'function')
        this.onhide(this);
    }

    deactivateItems() {
      for (let item of this.items) {
        if (item._active)
          item.menu.hide();
        item._active = false;
        item.$components.removeClass('active');
      }
    }

    activateItem(item) {
      if (typeof item === 'number')
        item = this.items[item];
      if (!item)
        return;
      item._active = true;
      item.$components.addClass('active');
      if (!item.menu.isEmpty()) {
        item.menu.showAroundElement(item.$components[0]);
        this._active = false;
      }
    }

    blurItems() {
      this.deactivateItems();
      for (let item of this.items) {
        if (item._focused) {
          item.$components.removeClass('focus').children().first().blur();
          item._focused = false;
        }
      }
    }

    focusItem(item) {
      item._focused = true;
      item.$components.addClass('focus').children().first().focus();
    }

    handleEvent(e) {

      if (e.type === 'mousedown') {
        if (!this.$components[0].contains(e.target)) {
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
      } else if (e.type === 'wheel' || e.type === 'scroll') {
        if (!this.$components[0].contains(e.target)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      } else if (e.type === 'blur' || e.type === 'resize') {
        this.hide();
      }

    }
  };



  uic.ContextMenu = class extends uic.Menu {
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
  };



  uic.DropdownMenu = class extends uic.Menu {

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
  };

  uic.Menubar = class MenuBar {
    constructor(parent) {
      this.$parent = $(parent);
      this.items = [];
    }

    add(item) {
      this.items.push(item);
    }

    bulkAdd(items) {
      this.items.push(...items);
    }

    create() {

      const $components = this.$components = $('<div>')
        .addClass('menubar');

      const $ul = $('<ul>').appendTo($components);

      this.items.forEach(item => {

        const $li = $('<li>').appendTo($ul);
        const $btn = $('<button>', {text: item.text})
          .appendTo($li);

        item.menu.context = $btn[0];

        $btn.click((e) => {
          e.preventDefault();
          e.stopPropagation();

          $btn.toggleClass('active');
          if ($btn.hasClass('active')) {
            this._active = true;
            item.menu.open(e);
          } else {
            this._active = false;
            item.menu.close(e);
          }
        });

        $btn.on('mouseover', (e) => {
          if (!$btn.hasClass('active') && $ul.find('> li > button.active').length) {
            this.items.forEach((item) => {
              item.menu.close(e);
            });
            $ul.find('.active').removeClass('active');
            item.menu.open(e);
            $btn.addClass('active');
          }
        });

        function deactivate() {
          $ul.find('.active').removeClass('active');
          this._active = false;
        }

        item.menu.onhide = deactivate;

      });

      //window.addEventListener('keydown', this);

      this.$parent.empty().append($components);

    }

    //handleEvent(e) {
    //  if (this._active && e.type === 'keydown') {
    //    if (e.key === 'ArrowRight') {
    //      const $active = this.$components.find('.active');
    //      const $next = $active.next() || this.components.first();
    //      $active.removeClass('active');
    //
    //    }
    //  }
    //}
  }


}());
