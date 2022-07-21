function switchTheme(themeID) {
  for (let item of document.querySelectorAll('.themed-css')) {
    item.parentNode.removeChild(item);
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `../themes/${themeID}/menu.css`;
  link.className = 'themed-css';

  document.head.appendChild(link);
}

const themesMenu = new uic.DropdownMenu();

for (let theme of [
  'purple7',
  'aquamarine',
  'slateblue',
  'informal',
  'stolen'
]) {
  themesMenu.add({text: theme, onclick: () => switchTheme(theme)});
}

mainMenu.add({text: 'Theme', menu: themesMenu});
