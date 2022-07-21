/* exported ReportView */

var uic = (function(uic={}){

  uic.ReportView = class ReportView {
    constructor(parent, options) {
      this.data = options.data || [];
      this.select = options.select || [];

      this.$parent = $(parent);
      this.$container = null;
      this.sortProperty = options.sortProperty || null;
      this.sortMode = options.sortMode || 'natural';
      this.dateTimeFormat = options.dateTimeFormat || new Intl.DateTimeFormat();
      this.numberFormat = options.numberFormat || new Intl.NumberFormat();
      this.alignNumbersToRight = typeof options.alignNumbersToRight === 'boolean' ?
        options.alignNumbersToRight : true;

      this.update();
    }

    setHeader(idx, key, title, options={}) {
      let obj = Object.assign({key, title}, options);
      this.select[idx] = obj;
    }

    addHeader(key, title, options) {
      this.setHeader(this.select.length, key, title, options);
    }

    orderBy(key, descending=false) {
      this.sortProperty = key;
      this.sortMode = descending? 'descending':'ascending';
    }

    // This function is used to sort elements in the array.
    sortFunction(a, b) {
      let ap = a[this.sortProperty],
          bp = b[this.sortProperty];
      if (this.sortMode === 'descending') {
        ap = b[this.sortProperty];
        bp = a[this.sortProperty];
      }

      if (typeof ap === 'string')
        return ap.localeCompare(bp);
      else if (typeof ap === 'boolean')
        return ap ? 1 : -1;
      else
        return ap - bp;
    }

    format(item, dataType) {
      let type = dataType;
      if (!type) {
        type = typeof item;
        if (type === 'object' && item instanceof Date)
          type = 'date';
      }
      if (item == null)
        return '';
      if (type === 'number')
        return this.numberFormat.format(item);
      if (type === 'date')
        return this.dateTimeFormat.format(item);
      return String(item);
    }

    _getSorted() {
      // if a property is given for sorting,
      // sort the data using the |sortFunction| method
      if (this.sortProperty &&
          typeof this.sortFunction === 'function') {
        return this.data.sort(this.sortFunction.bind(this));
      } else {
        return this.data;
      }
    }

    update() {

      if (!Array.isArray(this.data))
        throw new TypeError("ReportView.data must be of type Array");

      let data = this._getSorted();

      // cache the container
      let $list = this.$container = $('<div>').addClass('uic-report');

      // here we have our list items
      // they are put before the headers to make it easier to display
      // the elements correctly
      let $listItemsWrapper = $('<div>').addClass('uic-report-list');
      $list.append($listItemsWrapper);

      // make it easier to access our item elements
      // this is used by the selection mechanism
      this.$items = $listItemsWrapper;

      // here we have our headers container
      let $li = $('<div>')
        .addClass('uic-report-header');

      // if there's no data to display our journey ends here
      if (!data || !data.length)
        return;

      // select the keys to display
      let keys = [];
      if (this.select)
        keys = this.select.map(header => header.key);


      let headerXOffset = 0;

      // this element indicates to the user where the resized element will be
      // when you stop dragging
      let $resizerGuide = $('<div>', {
        class: 'uic-resizeguide',
        css: { display: 'none' }
      });

      // -- HEADERS ---
      keys.forEach((key, index) => {
        let colOptions = this.select && this.select[index] || {};
        let $item = $('<span>' + (colOptions.title || key) + '</span>');
        $item.addClass('uic-report-cell uic-report-header-cell');
        if (this.sortProperty === key) {
          $item.addClass(this.sortMode);
        }
        $item.css('width', colOptions.width || 200);
        $item.attr('title', colOptions.title || key);
        headerXOffset += (colOptions.width || 200);
        $item.click(() => {
          if (this.sortProperty !== key) {
            this.sortProperty = key;
            this.sortMode = 'ascending';
          } else {
            this.sortMode = this.sortMode === 'ascending' ?
              'descending' : 'ascending';
          }
          this.update();
        });
        let $resizer = $('<div>', { class: 'uic-report-column-resize' });
        let sx, dx, offx;
        let resize = (e) => {
          dx = e.clientX - sx;
          $resizerGuide.css('left', sx - offx + dx);
        };
        let stopResize = (e) => {
          dx = e.clientX - sx;
          if (typeof colOptions.width !== 'number')
            colOptions.width = 200;
          colOptions.width += dx;
          window.removeEventListener('mousemove', resize);
          window.removeEventListener('mouseup', stopResize);
          this.update();
        };
        $resizer.on('mousedown', (e) => {
          let { left } = e.target.getBoundingClientRect();
          sx = e.clientX;
          offx = e.clientX - left + 5;
          window.addEventListener('mousemove', resize);
          window.addEventListener('mouseup', stopResize);
          e.preventDefault();
          $resizerGuide.css('left', sx - offx).show();
        });
        $item.append($resizer);
        $li.append($item);
      });


      $list.append($li);

      $list.append($resizerGuide);

      // -- BODY --
      data.forEach((entry, index) => {

        let $li = $('<div>')
          .addClass('uic-report-item');

        // iterate over each column to build our cells
        keys.forEach((key, index) => {

          // custom column attributes
          let colOptions = this.select && this.select[index] || {};

          // each value goes through a |format| function.
          // each column may have its own custom formatting, but is not
          // required to. in case there is no specific formatting function
          // the instance-scoped |format| function is used
          let val = typeof colOptions.format === 'function' ?
            colOptions.format(entry[key]) :
            this.format(entry[key], colOptions.dataType);

          let $item = $('<span>')
            .text(val)
            .addClass('uic-report-cell')
            .css('width', colOptions.width || 200)
            .appendTo($li);

          // number cells have special alignment
          if (this.alignNumbersToRight && (colOptions.dataType === 'number' ||
              typeof entry[key] === 'number'))
            $item.addClass('numberCell');

        });


        $li.on('contextmenu', () => {
          if (!$li.hasClass('selected'))
            this.selectItem(index);
        });

        $li.on('click', (e) => {
          this.$container.trigger('itemclick', [entry]);
          if (e.shiftKey && this._activeItemIndex != null) {
            if (this._activeItemWasSelected)
              this.selectRange(this._activeItemIndex, index, e.ctrlKey);
            else
              this.clearRange(this._activeItemIndex, index, e.ctrlKey);
          } else {
            this._activeItemWasSelected = this.selectItem(index, e.ctrlKey, true);
            this._activeItemIndex = index;
          }
          e.preventDefault();
        });

        $li.on('mousedown', e=> {
          e.preventDefault();
        });

        $listItemsWrapper.append($li);

      });

      $listItemsWrapper.click(e => {
        if (e.target == $listItemsWrapper[0])
          this.clearSelection();
        e.preventDefault();
      });

      this.$parent.empty().append($list);

      $list.on('mousedown', e => {
        e.preventDefault();
      });

    }

     clearSelection(silent) {
      this.$items.find('.selected').removeClass('selected');
      if (!silent)
        this.$items.trigger('select', [ this.getSelection() ]);
    }

    selectItem(n, keep, toggle) {
      if (!keep)
        this.clearSelection(true);
      let action = toggle ? 'toggleClass' : 'addClass';
      let $elem = this.$items.children().eq(n);
      $elem[action]('selected');
      this.$items.trigger('select', [ this.getSelection() ]);
      return $elem.hasClass('selected');
    }

    selectRange(s, e, keep) {
      if (!keep)
        this.clearSelection(true);
      let i = s < e ? s : e;
      let j = s > e ? s : e;
      let children = this.$items.children();
      for (; i <= j; i++)
        children.eq(i).addClass('selected');
      this.$items.trigger('select', [ this.getSelection() ]);
    }

    clearRange(s, e, keep) {
      if (!keep)
        this.clearSelection(true);
      let i = s < e ? s : e;
      let j = s > e ? s : e;
      let children = this.$items.children();
      for (; i <= j; i++)
        children.eq(i).removeClass('selected');
      this.$items.trigger('select', [ this.getSelection() ]);
    }

    getSelection() {
      let selectedItems = [];
      let elems = this.$items.children();
      for (let i = 0; i < elems.length; i++) {
        if (elems.eq(i).hasClass('selected'))
          selectedItems.push(this.data[i]);
      }
      return selectedItems;
    }
  }

  return uic;

})(uic);
