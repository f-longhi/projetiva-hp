
  // special searches are processed here

  //before a search is submited, its keywords are analysed
  // by registered functions. if one of them can handle these
  // keywords it may return a |true| value to indicate it has
  // done all what's needed.
  // it can also return a string as a response to the user.
  // that string will replace the search field value and will
  // work as if the function returned |true|
  // if it returns any other value it is assumed that the
  // function could not handle the query and we can follow to
  // the next registered handler.

  let searchProcessors = [

    // directly visit urls instead of searching them
    query => {
      let urlre = /^((http|https):\/{2})?[\w\-]+\.[\w\-]+(\.[\w\-]+)*(\/[\w\-+%]*)*(\?[\w\-+%&]*)?(#[\w\-+%/]*)?$/;
      let m;

      if (m = urlre.exec(query)) {
        if (m[1] !== 'http://' && m[1] !== 'https://')
          query = 'http://' + query;
        location.assign(query);
        return true;
      }

      return false;
    }

  ];
