/* CheckList needs jQuery and jQuery UI */

/*exported CheckList*/
class CheckList {
  constructor($parent, items = []) {
    this.$parent = $parent;
    this.items = items;
  }

  indexedSort(arr, idxarr) {
    let narr = [];
    for (let idx of idxarr)
      narr.push(arr[idx]);
    for (let i = 0; i < arr.length; i++)
      arr[i] = narr[i];
  }

  update() {
    const $list = $('<ul>', {class: 'checklist'});

    if (this.items.length === 0) {
      $list.append($('<span>', {
        class: 'checklist-empty-label',
        text: 'Ainda não há tarefas nesta lista'
      }));
    }

    this.items.forEach((item, index) => {
      const $item = $('<li>', {class: 'checkitem'});

      const $handle = $('<span>', {class: 'checkitem-handle'});

      const $checkboxWrapper = $('<label>', {class: 'custom-checkbox'});
      const $checkbox = $('<span>', {class: 'checkbox'});
      const $realCheckbox = $('<input>', {type: 'checkbox', checked: item.done});
      $checkboxWrapper.append($realCheckbox, $checkbox);

      $realCheckbox.change((e) => {
        item.done = e.target.checked;
        this.onlistupdate();
      });

      const $text = $('<span>', {class: 'checkitem-text'});
      $text.text(item.text);

      const $actions = $('<span>', {class: 'checkitem-actions'});

      const $delete = $('<button>', {class: 'checkitem-action'});
      $delete.html('&#xe15b');
      $delete.click((e) => {
        this.items.splice(index, 1);
        e.preventDefault();
        this.onlistupdate();
        this.update();
      });
      $actions.append($delete);

      $item.append($handle, $checkboxWrapper, $text, $actions);
      $item.attr('data-index', index);
      $list.append($item);
    });
    
    $list.sortable({
      axis: 'y',
      containment: 'parent',
      handle: '.checkitem-handle',
      items: 'li',
      tolerance: 'pointer'
    });
    
    $list.on('sortstop', () => {
      const order = $list.sortable('toArray', { attribute: 'data-index' });
      this.indexedSort(this.items, order);
      this.onlistupdate();
      this.update();
    });
    
    this.$parent.empty().append($list);
  }
}
