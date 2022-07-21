const {Menu, ContextMenu, DropdownMenu} = uic;

Menu.prototype.__debug__ = true;

const colmn = new Menu();

colmn.append('Friends', {type: 'checkbox'});
colmn.append('Animals', {type: 'checkbox', checked: true});
colmn.append('Trees', {type: 'checkbox'});

const accessctrl = new Menu();

accessctrl.append('Private', {type: 'radio', checked: true});
accessctrl.append('Public', {type: 'radio'});

const rndmenu = new Menu();
for (let i =0; i<10; i++) {
  rndmenu.append(`Item ${i}`);
}

const ctx = new ContextMenu();

ctx.append('Like', () => alert('liked'));
ctx.append('Share', () => alert('shared'));
ctx.append('Comment', () => alert('unable to comment'));
ctx.appendSeparator();
ctx.append('Save');
ctx.append('Save to collection', {menu: colmn});
ctx.appendSeparator();
ctx.append('Access control', {menu: accessctrl});
ctx.append('Another menu', {menu: rndmenu});

ctx.setContext(document.querySelector('#menu-context'));
