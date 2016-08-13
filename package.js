Package.describe({
  name: 'wvanooijen92:quill-reactive',
  version: '0.0.9',
  summary: 'Helpers for QuillJS rich text (WYSIWYG) editor, with live editing similar to Google Docs or Etherpad',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/wwanooijen92/quill-reactive',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});
Npm.depends({
    quill : "1.0.0-beta.11"
});
Package.onUse(function(api) {
  api.versionsFrom('METEOR@1.4');
  api.use("templating", "client");
  api.use('mongo', 'server');
  api.use('session','client');
  api.use('wvanooijen92:meteorquill@0.0.1');

  api.use('jonlachlan:ottypes-rich-text@0.0.1');
  api.use('robertlowe:persistent-reactive-dict@0.1.2');
  api.use('dburles:mongo-collection-instances@0.3.5');
  api.addFiles('templates/quill-reactive.html', 'client');
  api.addFiles('templates/quill-reactive.js', 'client');
  api.addFiles('collections/quill-stack.js', 'server');
  api.addFiles('methods/update-quill.js', 'server');
  api.addFiles('methods/update-quill-client.js', 'client');
  api.export('QuillDrafts', 'client');
  api.export('QuillStacks', 'server')
});
