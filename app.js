let app = (function(app){

  'use strict';
  
  app.preferences = {
    showProfileSelectionWidget: false
  };

  const {Dialog} = uic;

  function sortArrayByIndexes(arr, idxarr) {
    let narr = [];
    for (let idx of idxarr)
      narr.push(arr[idx]);
    return narr;
  }

  class BadInputError extends Error {}
  class JSONSyntaxError extends Error {}

  class Link {

    // label is used for backwards compatibility only
    constructor({ title, label, url } = {}) {
      if (!url)
        throw new BadInputError('Link URL missing');

      url = this.addProtocolIfNone(url);

      this.type = 'link';
      this.title = title || label || url;
      this.url = url;
    }

    addProtocolIfNone(url) {
      if (/^(https?:|file:|\.\.?\/)/.test(url))
        return url;
      return 'http://' + url;
    }
  }

  class Note {
    constructor({ title, label, content } = {}) {
      this.type = 'note';
      this.title = title || label || '';
      this.content = content || '';
    }
  }

  class TaskList {
    constructor({ tasks } = {}) {
      this.tasks = Array.isArray(tasks) ? tasks : [];
    }

    addTask(str) {
      this.tasks.push({
        text: str,
        done: false
      });
    }

    removeTask(index) {
      this.tasks.splice(index, 1);
    }

    markDone(index) {
      let task = this.tasks[index];
      if (task) task.done = true;
    }

    getCompletionRatio() {
      return this.tasks.filter(task => task.done).length / this.tasks.length;
    }

    getNextPending() {
      return this.tasks.find(task => !task.done);
    }
  }

  class Project {
    constructor({ title, done, total, status, tasks, useTasksAsProgress } = {}) {
      this.title = title;
      this.done = Number(done) || 0;
      this.total = Number(total) || 0;
      this.status = status || '';
      this.tasks = new TaskList(tasks);
      this.useTasksAsProgress = !!useTasksAsProgress;
    }

    get readableStatus() {
      return this.status
        .replace(/%n/g, this.done)
        .replace(/%t/g, this.total)
        .replace(/%r/g, this.total - this.done);
    }
  }


  class Theme {
    constructor(themeProperties = {}) {
      Object.assign(this, this.defaultValues, themeProperties);
    }
  }

  Theme.prototype.defaultValues = {
    backgroundColor: '#34a5e2',
    backgroundImage: 'default.jpg',
    backgroundPosition: '50% 50%',
    backgroundBlendMode: 'normal',
    itemColor: '#fff',
    itemBackgroundColor: '#16dc00b0',
    searchBackgroundColor: '#16dc00b0'
  };

  class Profile {
    constructor({ theme, links, projects } = {}) {
      this.theme = new Theme(theme);
      this.links = [];
      this.projects = [];

      if (links) {
        for (let link of links) {
          if (link.type === 'note') {
            this.links.push(new Note(link));
          } else {
            this.links.push(new Link(link));
          }
        }
      }

      if (projects) {
        for (let project of projects) {
          this.projects.push(new Project(project));
        }
      }
    }
  }

  class SearchBox {

    constructor() {
      this._handlers = [];
      this.create();
      this._addListeners();
    }

    create() {
      this.$searchForm = $('<form>', {
        id: 'searchForm',
        action: 'https://duckduckgo.com/'
      });

      this.$searchField = $('<input>', {
        id: 'searchField',
        name: 'q',
        type: 'text',
        value: '',
        placeholder: uiStrings.searchbox_search_placeholder
      });

      this.$searchIcon = $('<span>', { class: 'searchIcon' });

      return this.$searchForm.append(this.$searchIcon, this.$searchField);

    }

    _addListeners() {
      this.$searchForm.on('submit', e => {
        let query = this.$searchField.val();

        for (let handle of this._handlers) {
          let res = handle(query);
          if (res === true) {
            e.preventDefault();
            break;
          } else if (typeof res === 'string') {
            $s.val(res);
            e.preventDefault();
            break;
          }
        }
      });
    }

    addProxy(fn) {
      this._handlers.push(fn);
    }

  }

  class TaskListManager {
    constructor($parent, taskList) {
      this.$parent = $parent;
      this.taskList = taskList;
    }

    create(focusOnTaskInput) {

      const $tasklist = $('<div>').addClass('tasklist');

      let $wrapper = $('<div>', {class: 'checklist'}).appendTo($tasklist);

      this.taskList.tasks.forEach((task, taskIndex) => {

        let $task = $('<div>', {class: 'checkitem'})
          .attr('data-index', taskIndex);
        if (task.done)
          $task.addClass('taskState_done');

        let $handle = $('<span>', {
          'class': 'checkitem-handle'
        });

        const $customCheck = $('<label>').addClass('custom-checkbox');
        $('<input>', {type: 'checkbox', checked: task.done})
          .change(e => {
            task.done = e.target.checked;
            this.create();
          })
          .appendTo($customCheck);
        $('<span>').appendTo($customCheck);

        let $taskName = $('<span>', {
          class: 'checkitem-text',
          text: task.text
        }).click(() => {
          task.done = !task.done;
          this.create();
        });

        let $taskActions = $('<span>', {class: 'taskActions'});

        $('<button>', {html: '&#xe5cd;'})
          .addClass('material-icons')
          .click(() => {
            this.taskList.removeTask(taskIndex);
            this.create();
          })
          .appendTo($taskActions);

        $task
          .append($handle, $customCheck, $taskName, $taskActions)
          .appendTo($wrapper);

      });

      $wrapper.sortable({
        items: '.checkitem',
        handle: '.checkitem-handle',
        tolerance: 'pointer',
        axis: 'y',
        containment: 'parent',
        cursor: 's-resize'
      });

      $wrapper.on('sortstop', () => {
        let newOrder = $wrapper.sortable('toArray', { attribute: 'data-index' });
        this.taskList.tasks = sortArrayByIndexes(this.taskList.tasks, newOrder);
        this.create();
      });

      let $taskInput = $('<input>', {placeholder: uiStrings.tasklist_tasktext_placeholder})
        .addClass('gInput fullWidth')
        .keyup((e) => {
          let v = e.target.value;
          if (e.key === 'Enter' && v) {
            this.taskList.addTask(v);
            this.create(true);
          }
          e.preventDefault();
        })
        .appendTo($tasklist);


      this.$parent.empty().append($tasklist);

      if (focusOnTaskInput) $taskInput.focus();

    }
  }
  
  class LocalStorageProfilePersistanceAdapter {
    constructor() {
      // nothing to it
    }
    
    save() {
      // save profile data to local storage
    }
    
    load() {
      // load profile data from local storage
    }
  }
  
  class ProfileManager {
    constructor() {
      this._profiles = [];
    }
      
    // this is not a good profile manager as it takes care
    // of persisting data by its own means. a good approach
    // would leave data persistence to another module.

    get _activeProfileIndex() {
      let index = Number(localStorage.getItem('projetivahp.activeProfileIndex'));
      // must set |activeProfileIndex| to 0 if no valid index is found
      if (isNaN(index) || index < 0 || index >= this._profiles.length) {
        localStorage.setItem('projetivahp.activeProfileIndex', 0);
        return 0;
      } else {
        return index;
      }
    }
    
    set _activeProfileIndex(index) {
      let newIndex = Number(index) || 0;
      if (newIndex >= this._profiles.length)
        newIndex = 0;
      localStorage.setItem('projetivahp.activeProfileIndex', newIndex);
    }
    
    get activeProfile() {
      // the active profile index will always point to a profile if any exists
      // so if there is not a profile object at that index, we create one.
      // It acts just like |createIfNone|
      return this._profiles[this._activeProfileIndex] || this.create();
    }
    
    // creates a profile, adds it to the list of profiles
    // and returns the newly created profile object
    create() {
      let profile = new Profile();
      this._profiles.push(profile);
      this._activeProfileIndex = this._profiles.length - 1;
      this.saveProfiles();
      return profile;
    }

    // creates a profile if the list of profiles is empty
    createIfNone() {
      if (this._profiles.length === 0)
        this.create();
    }

    fromJSON(profilesJSON) {
      let profiles;
      try {
        profiles = JSON.parse(profilesJSON);
      } catch (e) {
        if (e instanceof SyntaxError)
          throw new JSONSyntaxError(); // distinguish between json
            //parsing errors and js syntax errors
        else throw e;
      }
      return profiles.map(profile => new Profile(profile));
    }

    // saves all profiles as JSON to localStorage
    saveProfiles() {
      let profilesJSON = JSON.stringify(this._profiles);
      localStorage.setItem('projetivahp.profiles', profilesJSON);
    }

    // gets all profiles stored in localStorage
    getProfiles() {
      let profilesJSON = localStorage.getItem('projetivahp.profiles') || '[]';
      return this.fromJSON(profilesJSON);
    }

    // profiles are cached in memory, so to use them we need to
    // first retrieve them from localStorage, cache them and then check if one is needed
    open() {
      this._profiles = this.getProfiles();
      this.applyActiveProfile();
    }

    switch() {
      let len = this._profiles.length;
      let next = this._activeProfileIndex + 1;
      if (next === len) {
        next = 0;
      }
      this._activeProfileIndex = next;
      this.applyActiveProfile();
    }

    applyActiveProfile() {
      mainScene(this.activeProfile);
      this.saveProfiles();
    }

    deleteActiveProfile() {
      this._profiles.splice(this._activeProfileIndex, 1);
      this.createIfNone();
      this.saveProfiles();
      this._activeProfileIndex++;
    }
    
    //remove(profileIndex) {
    //  if (!profileIndex || profileIndex < 0 || profileIndex > this._profiles.length - 1)
    //    return false;
    //  this._profiles.splice(profileIndex, 1);
    //  this.onprofilemodified();
    //}
    //
    //onprofilemodified() {}
    //onprofilechanged() {}
  }


 // Profile manager: our app supports multiple profiles!
  const profiles = new ProfileManager();

  function fileNameFromDate(date) {
    return String(date.getFullYear()) +
           String(date.getMonth() + 1).padStart(2, '0') +
           String(date.getDate()).padStart(2, '0') + '-' +
           String(date.getHours()).padStart(2, '0') +
           String(date.getMinutes()).padStart(2, '0') +
           String(date.getSeconds()).padStart(2, '0');
  }

  function backupToJSON() {
    let data = JSON.stringify(profiles._profiles);
    let dataBlob = new Blob([ data ], { type: 'application/json' });
    FileManager.saveBlob(dataBlob, `projetiva-backup-${fileNameFromDate(new Date())}.json`);
  }

  function importFromJSON() {
    FileManager.open().then(JSONData => {

      try {
        profiles._profiles = profiles.fromJSON(JSONData);
        profiles.createIfNone();
        profiles.applyActiveProfile();
      } catch(e) {
        const errorPfx = uiStrings.import_error;
        if (e instanceof BadInputError ||
            e instanceof JSONSyntaxError) {
          Dialog.message(uiStrings.import_error_corrupted_file, { title: errorPfx });
        } else {
          Dialog.message(`[${ e.name }] ${e.message}`, { title: errorPfx });
        }
      }

    });
  }

  showdown.setFlavor('vanilla');
  function markdownToHTML(str) {
    return (new showdown.Converter()).makeHtml(str);
  }

  // atalhos de teclado

  window.addEventListener('keydown', e => {

    // pra facilitar a leitura vamos dar nome aos bois,
    // cada tecla importante terá aqui uma variável pra usar no lugar
    // do número dela
    // TODO: update to event.key
    const Key_F1 = 112;
    const Key_F2 = 113;
    const Key_F3 = 114;
    const Key_F7 = 118;

    if (e.keyCode === Key_F1) {// F1 muda de perfil
      profiles.switch();
      e.preventDefault(); // vamos substituir a função de F1
        //portanto é preciso cancelar a ação padrão da tecla
    } else if (e.keyCode === Key_F2) { // F2 cria um novo perfil
      // mas antes a gente pede se o cara tem certeza do que tá fazendo
      Dialog.yesNo(uiStrings.new_profile_confirmation_message).then(yes => {
        if (yes) { // se ele tem certeza, beleza
          profiles.create();
          profiles.applyActiveProfile();
        } // senão não se faz nada
      });
      e.preventDefault();

      // os textos dos diálogos tão em um arquivo separado. é uma variável normal
      // que guarda cada texto. assim, se precisar trocar algum texto ou traduzir,
      // tá tudo junto num lugar só.
    } else if (e.keyCode === Key_F3) { // F3 exclui o perfil ativo no momento
      Dialog.yesNo(uiStrings.delete_profile_confirmation_message).then(yes => {
        if (yes) { // novamente a confirmação
          profiles.deleteActiveProfile();
          profiles.applyActiveProfile();
        }
      });
      e.preventDefault();
    } else if (e.keyCode === Key_F7) {
      editTheme(profiles.activeProfile.theme);
      e.preventDefault();
    }

  });

  // ----------- projects

  class ProgressBar {
    constructor(progress) {
      this.$thumb = $('<div>')
        .addClass('progressBarThumb')
        .css('width', progress);

      this.$track = $('<div>')
      .addClass('progressBarTrack');

      this.$components = $('<div>')
        .addClass('progressBar')
        .append(this.$track, this.$thumb);

      return this.$components;
    }
  }

  function getPercentageString(ratio) {
    return Math.round(ratio * 100) + '%';
  }



  function drawProjectList(projectList) {
    let $ul = $('<ul>', { id: 'projectList' });
    projectList.forEach((project, i) => {

      let $project = $('<div>')
        .addClass('project');

      let completionRatio,
          statusText = project.readableStatus || '&nbsp;';

      if (project.tasks && project.useTasksAsProgress) {
        completionRatio = project.tasks.getCompletionRatio();
      } else {
        completionRatio = project.done / project.total;
      }

      if (project.useTasksAsProgress) {
        let next = project.tasks.getNextPending();
        if (next && next.text) {
          statusText = next.text;
        } else {
          statusText = uiStrings.project_finished;
        }
      }

      let percent = getPercentageString(completionRatio);


      let $status = $('<span>')
        .addClass('projectStatusText')
        .html(statusText);
      let $title = $('<div>')
        .addClass('projectTitle')
        .html(project.title || '');
      let $progress = $('<span>')
        .addClass('projectProgress')
        .html(percent);

      let $progressBar = new ProgressBar(percent);


      $project
        .attr('data-index', i)
        .append($title, $progressBar, $('<div>').addClass('projectStatus').append($status, $progress))
        .appendTo($ul)
        .click(e => {
          editProject(project);
          e.preventDefault();
        });

      let contextmenu = new webui.ContextMenu();
      contextmenu.append(uiStrings.contextmenu_edit, () => {
          editProject(project);
      });
      contextmenu.append(uiStrings.contextmenu_remove, () => {
        profiles.activeProfile.projects.splice(i, 1);
        profiles.applyActiveProfile();
      });

      contextmenu.setContext($project[0]);

    });

    $ul.sortable({
      tolerance: 'pointer'
    });

    $ul.on('sortstop', () => {
      let newOrder = $ul.sortable('toArray', { attribute: 'data-index' });
      profiles.activeProfile.projects = sortArrayByIndexes(profiles.activeProfile.projects, newOrder);
      profiles.applyActiveProfile();
    });

    return $ul;

  }


  // Aqui são criados os links que aparecem abaixo da barra de pesquisa

  function createIndex(list) {
    let $ul = $('<ul>', { id: 'fastAccessLinks' });

    list.forEach((item, i) => {
      let $li = $('<li>');

      let $link = $('<a>')
        .html(item.title);

      if (item.type == 'note') {
        $li.addClass('linkToNote');
        $link.attr('href', '#');
        $link.click(e => {
          viewNote(item);
          e.preventDefault();
        });

        // BEGIN note context menu
        let context = new webui.ContextMenu();
        context.append(uiStrings.contextmenu_edit, () => {
          editNote(item);
        });
        context.append(uiStrings.contextmenu_remove, () => {
          profiles.activeProfile.links.splice(i, 1);
          profiles.applyActiveProfile();
        });
        context.setContext($link[0]);
        // END note context menu


      } else {
        $link.attr('href', item.url);

        // BEGIN link context menu
        let context = new webui.ContextMenu();
        context.append(uiStrings.contextmenu_edit, () => {
          editShortcut(item);
        });
        context.append(uiStrings.contextmenu_remove, () => {
          profiles.activeProfile.links.splice(i, 1);
          profiles.applyActiveProfile();
        });
        context.setContext($link[0]);
        // END note context menu
      }

      $li
        .append($link)
        .appendTo($ul);

      $li.attr('data-index', i);
    });

    $ul.sortable({
      items: '> li:not(.addLink)',
      tolerance: 'pointer'
    });

    $ul.on('sortstop', () => {
      let newOrder = $ul.sortable('toArray', { attribute: 'data-index' });
      profiles.activeProfile.links = sortArrayByIndexes(profiles.activeProfile.links, newOrder);
      profiles.applyActiveProfile();
    });


    // code for the extra "add link" button
    let $addLinkLi = $('<li>').addClass('addLink');
    let $addLinkAnchor = $('<a>').attr('href', '#').click(e => {
      e.preventDefault();
    });

    let addItemMenu  = new webui.DropdownMenu();
    addItemMenu.append(uiStrings.menu_action_addlink, () => addShortcut());
    addItemMenu.append(uiStrings.menu_action_addnote, () => addNote());
    addItemMenu.append(uiStrings.menu_action_addproject, () => addProject());
    addItemMenu.setContext($addLinkAnchor[0]);

    $ul.append($addLinkLi.append($addLinkAnchor));

    return $ul;
  }

  function addFileExtensionIfNone(str) {
    if (!/\w\.\w/.test(str))
      return str + '.jpg';
    return str;
  }

  function applyTheme(theme) {
    let themeVariables = '';
    // we know the property names from the defaultTheme.
    // If a property is not defined on the theme, the default value will be applied
    for (let variable of Object.keys(theme)) {
      let value = theme[variable];

      if (variable === 'backgroundImage') {
        if (value && !/^(file|https?)\:\/\//.test(value))
          value = './wallpapers/' + addFileExtensionIfNone(value);
        value = `url(${value})`;
      }

      themeVariables += `--${variable}:${value};`;
    }
    $('body').attr('style', themeVariables);

  }

  function mainScene(profile) {

    let { theme, links, projects } = profile;

    applyTheme(theme || {});
    let searchbox = new SearchBox();
    let $links = createIndex(links || []);
    let $projects = drawProjectList(projects || []);

    let $searchFormContainer = $('<section>', { id: 'searchFormContainer' });
    let $searchBar = $('<section>', { id: 'searchBar' });
    let $fastAccessContainer = $('<section>', { id: 'fastAccess' });
    let $projectListContainer = $('<section>', { id: 'projectListContainer'});

    $searchFormContainer.append(searchbox.$searchForm);
    $fastAccessContainer.append($links);
    $searchBar.append($searchFormContainer, $fastAccessContainer);
    $projectListContainer.append($projects);

    searchProcessors.forEach(s => searchbox.addProxy(s));

    $('main').empty().append($searchBar, $projectListContainer);

  }







  function askShortcutInfo(model) {
    return new Promise((resolve) => {

      let title = model == null ?
        uiStrings.editlinkdg_dgnew_windowtitle :
        uiStrings.editlinkdg_dgedit_windowtitle;

      if (model == null)
        model = { url: '', title: '' };

      let $label = $('<input>')
        .addClass('gInput blockInput')
        .attr('type', 'text')
        .attr('placeholder', uiStrings.editlinkdg_title_placeholder)
        .val(model.title);

      let $url = $('<input>')
        .addClass('gInput blockInput')
        .attr('type', 'text')
        .attr('placeholder', uiStrings.editlinkdg_url_placeholder)
        .val(model.url);

      let $errorMsg = $('<div>')
        .addClass('dialogErrorMessage')
        .hide();

      function doResolve(e) {
        let title = $label.val();
        let url = $url.val().trim();
        if (url) {
          resolve(new Link({ url, title }));
          shortcutDialog.hide();
        } else {
          $errorMsg.html(uiStrings.editlinkdg_error_missingurl).show();
        }
        e.preventDefault();
      }

      let $content = $('<form>')
        .append($label, $url, $errorMsg)
        .on('submit', doResolve);

      let $confirm = $('<button>')
        .addClass('gButton gDefaultButton')
        .html(uiStrings.dg_action_done)
        .click(doResolve);

      let $cancel = $('<button>')
        .addClass('gButton')
        .html(uiStrings.dg_action_cancel)
        .click(() => {
          shortcutDialog.hide();
          resolve(null);
        });

      let $buttons = $(document.createDocumentFragment()).append($cancel, $confirm);

      let shortcutDialog = new Dialog({
        title,
        $content,
        $buttons,
        width: 500
      });

      shortcutDialog.show();

    });
  }

  function addShortcut() {
    askShortcutInfo().then(result => {
      if (result) {
        profiles.activeProfile.links.push(result);
        profiles.applyActiveProfile();
      }
    });
  }

  function editShortcut(shortcut) {
    askShortcutInfo(shortcut).then(result => {
      if (result) {
        shortcut.url = result.url;
        shortcut.title = result.title;
        profiles.applyActiveProfile();
      }
    });
  }


  function askProjectInfo(model) {
    return new Promise((resolve) => {

      if (model == null)
        model = { title: '', status: '', done: '0', total: '100',
          tasks: new TaskList(), useTasksAsProgress: false };

      let $title = $('<input>')
        .addClass('gInput blockInput titleInput')
        .attr('type', 'text')
        .attr('placeholder', uiStrings.editprojectdg_name_placeholder)
        .val(model.title);

      let $status = $('<input>')
        .addClass('gInput blockInput')
        .attr('type', 'text')
        .attr('placeholder', uiStrings.editprojectdg_status_placeholder)
        .val(model.status);

      let $done = $('<input>')
        .addClass('gInput')
        .attr('type', 'number')
        .val(model.done);

      let $total = $('<input>')
        .addClass('gInput')
        .attr('type', 'number')
        .val(model.total);

      let $spacer = $('<div>').addClass('spacer');

      let $progress = $('<div>')
        .append(uiStrings.editprojectdg_progress, $done, uiStrings.editprojectdg_of, $total);

      let $errorMsg = $('<div>')
        .addClass('dialogErrorMessage')
        .hide();

      function doResolve(e) {

        let done = Number($done.val()),
            total = Number($total.val());

        if (isNaN(done) || isNaN(total)) {
          $errorMsg.html(uiStrings.editprojectdg_error_nan)
            .show();
        } else {
          // make sure total is > 0
          total = Math.max(total, 0);

          // trim done so it keeps valid
          done = Math.min(total, Math.max(0, done));


          let output = new Project({
            title: $title.val() || uiStrings.editprojectdg_untitled,
            status: $status.val(),
            done,
            total,
            tasks: model.tasks,
            useTasksAsProgress: $taskListProgressCheck[0].checked
          });
          resolve(output);
        }

        e.preventDefault();
      }

      let $content = $('<form>')
        .append($title, $status, $spacer, $progress, $errorMsg)
        .on('submit', doResolve);

      let $confirm = $('<button>')
        .addClass('gButton gDefaultButton')
        .html(uiStrings.dg_action_done)
        .click(doResolve);

      let $cancel = $('<button>')
        .addClass('gButton')
        .html(uiStrings.dg_action_cancel)
        .click(() => {
          resolve(null);
        });

      let $buttons = $('<div>', { class: 'buttonBar' }).append($cancel, $confirm);

      let $taskListProgressLabel = $('<label>');
      let $taskListProgressCheck = $('<input>', {
        type: 'checkbox',
        checked: model.useTasksAsProgress
      });

      $content.append($('<div>', {class: 'spacer'}));

      $taskListProgressLabel.append(
        $('<span>').addClass('custom-checkbox').append(
          $taskListProgressCheck,
          $('<span>'),
          ' '
        ),
        uiStrings.tasklist_usetaskprogress_label
      ).appendTo($content);


      let $taskList = $('<div>', {class: 'taskListWrapper'});

      $('<h1>', {text: uiStrings.tasklist_label}).appendTo($taskList);

      new TaskListManager($('<div>').appendTo($taskList), model.tasks).create();

      let $page = $('<section>', { 'class': 'page' })
        .append($content, $taskList, $buttons);

      $('main').empty().append($page);


    });
  }

  function addProject() {
    askProjectInfo().then(result => {
      if (result) {
        profiles.activeProfile.projects.push(result);
      }
      profiles.applyActiveProfile();
    });
  }

  function editProject(project) {
    askProjectInfo(project).then(result => {
      if (result) {
        Object.assign(project, result);
      }
      profiles.applyActiveProfile();
    }).catch(console.log);
  }



  class ThemeEditor extends Dialog {
    constructor(theme) {
      super();

      this.theme = theme;
      this.title = uiStrings.themeeditor_windowtitle;

      const $components = $('<div>');

      this.themeProperties.forEach(property => {
        const $label = $('<label>').text(uiStrings.theme_properties[property.name]);
        const $input = this._createValueInput(property);
        $components.append($label.append($input));
      });




      this.$content = $components;

      let $done = $('<button>')
        .addClass('gButton gDefaultButton')
        .html(uiStrings.dg_action_done)
        .click(() => {
          this.hide();
        });

      this.$buttons = $done;
      this.show();
      this.$wrapper.css('background-color', 'transparent');

      this.$wrapper.click((e) => {
        let win = this.$wrapper.find('.dialogWindow')[0];
        if (!win.contains(e.target)) {
          this.$wrapper.css('opacity', 0.2);
        } else {
          this.$wrapper.css('opacity', 1.0);
        }
      });

    }

    _createValueInput(property) {
      let propertyValue = this.theme[property.name];

      let $input;

      if (property.type == 'select') {
        $input = $('<select>');
        property.options.forEach(option => {
          $input.append($('<option>').html(option).val(option));
        });
      } else {
        $input = $('<input>');
      }

      $input
        .addClass('gInput blockInput')
        .change(e => {
          this.theme[property.name] = e.target.value;
          profiles.applyActiveProfile();
        })
        .val(propertyValue);

      return $input;

    }
  }

  ThemeEditor.prototype.themeProperties = [{
      name: 'backgroundColor',
      type: 'color'
    }, {
      name: 'itemColor',
      type: 'color'
    }, {
      name: 'itemBackgroundColor',
      type: 'color'
    }, {
      name: 'searchBackgroundColor',
      type: 'color'
    }, {
      name: 'backgroundImage',
      type: 'text'
    }, {
      name: 'backgroundPosition',
      type: 'text'
    }, {
      name: 'backgroundBlendMode',
      type: 'select',
      options: [
        'color',
        'color-burn',
        'color-dodge',
        'darken',
        'difference',
        'exclusion',
        'hard-light',
        'hue',
        'lighten',
        'luminosity',
        'multiply',
        'normal',
        'overlay'
      ]
    }];


  function editTheme(theme) {
    new ThemeEditor(theme);
  }






  function addNote() {
    let freshNote = {
      title: '',
      content: ''
    };

    askNoteInfo(freshNote).then(note => {
      if (note) {
        profiles.activeProfile.links.push(new Note(note));
        profiles.applyActiveProfile();
        viewNote(note);
      }
    });

  }

  function editNote(note) {
    askNoteInfo(note).then(editedNote => {
      if (editedNote) {
        profiles.applyActiveProfile();
      }
      viewNote(note);
    });
  }


  function viewNote(note) {

    let $done = $('<button>')
      .addClass('gButton gDefaultButton')
      .html(uiStrings.dg_action_close)
      .click(() => {
        dialog.hide();
      });

    let $edit = $('<button>')
      .addClass('gButton')
      .html(uiStrings.dg_action_edit)
      .click(() => {
        editNote(note);
        dialog.hide();
      });

    let $buttons = $(document.createDocumentFragment())
      .append($edit, $done);

    let $noteContent = $('<div>')
      .addClass('note')
      .html(markdownToHTML(note.content));
    let dialog = new Dialog({
      title: note.title,
      $buttons: $buttons,
      $content: $noteContent,
      width: 530
    });
    dialog.show();
  }

  function askNoteInfo(note) {
    return new Promise(resolve => {

      if (!note)
        note = { label: '', content: '' };

      let $done = $('<button>')
        .addClass('gButton gDefaultButton')
        .html(uiStrings.dg_action_done)
        .click(() => {
          note.title = $noteTitle.val();
          note.content = $noteEditor.val();
          resolve(note);
          dialog.hide();
        });

      let $cancel = $('<button>')
        .addClass('gButton')
        .html(uiStrings.dg_action_cancel)
        .click(() => {
          resolve(null);
          dialog.hide();
        });

      let $buttons = $(document.createDocumentFragment())
        .append($cancel, $done);

      let $noteTitle = $('<input>')
        .addClass('gInput blockInput')
        .attr('placeholder', uiStrings.editnotedg_notetitle_placeholder)
        .val(note.title);
      let $noteEditor = $('<textarea>')
        .addClass('gInput blockInput codeInput')
        .css('resize', 'vertical')
        .attr('rows', 8)
        .attr('spellcheck', 'false')
        .attr('placeholder', uiStrings.editnotedg_notecontent_placeholder)
        .val(note.content);

      let dialog = new Dialog({
        title: uiStrings.editnotedg_dialog_title,
        $buttons: $buttons,
        $content: $('<div>').append($noteTitle, $noteEditor),
        width: 550
      });
      dialog.show();
    });

  }
  
  
  // Toolbar
  
  class ToolbarItem {
    constructor({icon, text, action}) {
      this.icon = icon;
      this.text = text;
      this.action = action;
      this.dom = null;
    }
    create() {
      const dom = this.dom = document.createElement('div');
      dom.className = 'toolbar-item';
      if (this.icon) {
        const icon = document.createElement('span');
        icon.className = 'toolbar-item-icon';
        icon.textContent = this.icon;
        dom.append(icon);  
      }
      if (this.text) {
        const text= document.createElement('span');
        text.className = 'toolbar-item-text';
        text.textContent = this.text;
        dom.append(text);
      }
      if (typeof this.action === 'function') {
        dom.addEventListener('click', () => this.action());
      }
      return dom;
    }
    setText(str) {
      const txt = this.dom.querySelector('.toolbar-item-text');
      txt.textContent = str;
    }
  }
  
  class Toolbar {
    constructor(parentElement) {
      this.parentElement = parentElement;
      this.items = [];
      this.dom = null;
    }
    create() {
      const dom = this.dom = document.createElement('div');
      dom.className = 'toolbar';
      for (let item of this.items) {
        dom.appendChild(item.create());
      }
      this.parentElement.appendChild(dom);
    }
    append(item) {
      if (!(item instanceof ToolbarItem))
        throw new TypeError('Toolbar.append: argument 1 is not a ToolbarItem');
      this.items.push(item);
    }
  }


  function format12Hour(date) {
    const hour = String((date.getHours() % 12) || 12);
    const minute = String(date.getMinutes()).padStart(2, "0");
    const ampm = date.getHours() >= 12 ? 'pm' : 'am';
    return `${hour}:${minute}${ampm}`;
  }
  
  window.fh = format12Hour;

  $(document).ready(() => {

    profiles.open();
    
    const toolbar = new Toolbar(document.body);
    const settingsMenuControl = new ToolbarItem({icon: 'settings'});
    
    
    //const calendarPanel = new FloatingPanel();
    //calendarPanel.content = document.createElement('div');
    //
    //const today = new Date();
    //const calendarwg = new CalendarWidget(calendarPanel.content, {
    //  year: today.getFullYear(),
    //  month: today.getMonth()
    //});
    //calendarwg.create();
    //
    //const calendarAction = () => {
    //  calendarPanel.showBelowElement(calendarControl.dom);
    //};
    //const calendarControl = new ToolbarItem({text: format12Hour(new Date()), action: calendarAction});
    //setInterval(() => {
    //  calendarControl.setText(format12Hour(new Date()));
    //}, 1000);
    //
    toolbar.append(settingsMenuControl); // settings
    if (app.preferences.showProfileSelectionWidget) {
      toolbar.append(new ToolbarItem({icon: '\uE7FD'})); // person  
    }
    
    //toolbar.append(calendarControl); // calendar
    toolbar.create();
    
    const menu = new webui.DropdownMenu();

    menu.append(uiStrings.menu_action_edit_theme, () => {
      editTheme(profiles.activeProfile.theme);
    });
    menu.appendSeparator();
    menu.append(uiStrings.menu_action_backup_profiles, backupToJSON);
    menu.append(uiStrings.menu_action_restore_profiles, importFromJSON);
    menu.appendSeparator();
    menu.append(uiStrings.menu_action_gethelp,  () => {
      window.open('help.html');
    });

    menu.setContext(settingsMenuControl.dom);
    
    

  });

  app.profiles = profiles;

  return app;

}({}));
