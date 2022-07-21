//uic.Menu.prototype.__debug__ = true;


const shareMenu = new uic.Menu();

shareMenu.bulkAdd([
  {text: 'Facebook'},
  {text: 'Google+'},
  {text: 'Twitter'},
  {text: 'Tumblr'},
  {text: 'Instagram'},
  {text: 'Reddit'},
]);

const defaultMenuitems = [
  {text: 'Open...'},
  {text: 'Save'},
  {text: 'Save as...'},
  {type: 'separator'},
  {text: 'Reload'},
  {text: 'Back'},
  {text: 'Forward'},
  {type: 'separator'},
  {text: 'Copy link'},
  {text: 'Share', menu: shareMenu},
  {type: 'separator'},
  {text: 'Permissions'},
  {text: 'Disable for all'},
  {text: 'Properties'},
];

const mainMenu = new uic.Menubar(document.querySelector('main'));

const archiveMenu = new uic.DropdownMenu();

archiveMenu.bulkAdd(defaultMenuitems);

mainMenu.add({text: 'File', menu: archiveMenu});

window.addEventListener('load', () => {
  mainMenu.create();
});

const mainContext = new uic.ContextMenu();

mainContext.bulkAdd(defaultMenuitems);

mainContext.setContext(document.body);
