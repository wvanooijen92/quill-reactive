
if(typeof QuillDrafts === "undefined") {
  // Persistent ReactiveDict makes drafts save over page reloads.
  // However, two tabs in the same browser will be sharing the same data!
  // QuillDrafts = new PersistentReactiveDict('QuillDrafts');
}

textChangesListener = function(delta, source) {
  console.log(delta);
  console.log(source);

  if (source === 'user') {
    var oldDelta = new Delta(_.extend({}, this.tmpl.quillEditor.oldDelta));
    this.tmpl.quillEditor.oldDelta = this.tmpl.quillEditor.oldDelta.compose(delta);
    var opts = this.tmpl.data;
    var collection = Mongo.Collection.get(opts.collection);
    var doc = collection.findOne({_id: opts.docId});

    // Check for other new content besides the last keystroke
    var editorContents = this.tmpl.quillEditor.getContents();
    if(oldDelta.compose(delta).diff(editorContents).ops.length > 0) {
      console.log('ja');
      updateDelta = oldDelta.diff(editorContents);
    } else {
      updateDelta = delta;
    }
    Meteor.call("updateQuill", opts.collection, opts.docId, opts.field, updateDelta, editorContents);
  }
};

Template.quillReactive.onCreated(function() {
  var tmpl = this;
  tmpl.quillEditor = {};
});

Template.quillReactive.onRendered(function() {

  var tmpl = this;
  // var authorId = Meteor.user().username;
  console.log(Quill);
  tmpl.quillEditor = new Quill('#editor-' + tmpl.data.docId, {
    modules: {
      'authorship': {
        authorId: "anonymousUser", // should be authorId
        enabled: true
      },
      'toolbar': {
        container: '#toolbar'
      },
      'link-tooltip': true,
      'image-tooltip' : true,
      'video-tooltip' : true,
      'formula-tooltip' : true
    },
    theme: 'snow'
  });

  tmpl.quillEditor.tmpl = tmpl;

  // var previousDraft = QuillDrafts.get(tmpl.data.collection + "-" + tmpl.data.docId + "-" + tmpl.data.field);
  // if(previousDraft && previousDraft.draft && previousDraft.draft.ops.length > 0) {
  //   tmpl.quillEditor.oldDelta = new Delta(previousDraft.oldDelta);
  //   var draftDelta = tmpl.quillEditor.oldDelta.compose(previousDraft.draft);
  //   tmpl.quillEditor.setContents(draftDelta);
  // } else {
    tmpl.quillEditor.oldDelta = tmpl.quillEditor.getContents();
  // }

  // Fix link tooltip from getting stuck
  tmpl.$('.ql-container').mousedown(function(e) {
    if(!($(e.target).is('a'))) {
      $('.ql-tooltip.ql-link-tooltip:not(.editing)').css('left', '-10000px');
    }
  });

  var authorship = tmpl.quillEditor.getModule('authorship');
  var fieldDelta = tmpl.data.field + "Delta";
  var collection = Mongo.Collection.get(tmpl.data.collection);
  var blankObj = {};

  blankObj[tmpl.data.field] = "";
  blankObj[tmpl.data.fieldDelta] = new Delta();


  Tracker.autorun(function() {
    var doc = collection.findOne({_id:tmpl.data.docId});
    if(!doc) {
      return;
    }

    if(!doc[tmpl.data.field]) {
      collection.update({_id: tmpl.data.docId}, {$set: blankObj})
    }

    var remoteContents = doc[fieldDelta];
    if(!remoteContents) {
      remoteContents = new Delta();
    }else{
      remoteContents = new Delta(remoteContents);
    }

    /*
    * Notes for Joe:
    *
    * */

    console.log(doc);
    console.log(remoteContents);
    console.log(tmpl.quillEditor.oldDelta);

    var oldContents = tmpl.quillEditor.oldDelta;
    var remoteChanges = oldContents.diff(remoteContents);
    var editorContents = tmpl.quillEditor.getContents();
    // console.log(editorContents, remoteChanges, oldContents)
    var diff = editorContents.diff(remoteContents);
    var localChanges = oldContents.diff(editorContents);

    if(diff.ops.length > 0) {
      // Make updates, but don't overwrite work in progress in editor
      tmpl.quillEditor.updateContents(localChanges.transform(remoteChanges, 0));
    }

    tmpl.quillEditor.oldDelta = oldContents.compose(remoteChanges);


    // No "diff" means that this user made the last save, and there's nothing to update

    // Save our server update as a reference point for future changes
    // var unsavedChanges = tmpl.quillEditor.oldDelta.diff(editorContents)
    // QuillDrafts.set(tmpl.data.collection + "-" + tmpl.data.docId + "-" + tmpl.data.field, {
    //   draft: unsavedChanges,
    //   oldDelta: tmpl.quillEditor.oldDelta
    // });
    // if(unsavedChanges.ops.length > 0) {
    //   Session.set("quillHasUnsavedChanges", true);
    // } else {
    //   Session.set("quillHasUnsavedChanges", false);
    // }
  });

  // tmpl.quillEditor.on('text-change', function(delta, source) {
  //   var unsavedChanges = tmpl.quillEditor.oldDelta.diff(tmpl.quillEditor.getContents());
    // QuillDrafts.set(tmpl.data.collection + "-" + tmpl.data.docId + "-" + tmpl.data.field, {
    //   draft: unsavedChanges,
    //   oldDelta: tmpl.quillEditor.oldDelta,
    // });
  //   if(unsavedChanges.ops.length > 0) {
  //     Session.set("unsavedChanges", true);
  //   } else {
  //     Session.set("unsavedChanges", false);
  //   }
  // });

  // If you want to save on every change, use the text-change event below. We're using a save button
  Tracker.autorun(function() {
    if(Session.get("liveEditing") && Meteor.status().connected) {
      tmpl.quillEditor.on('text-change', textChangesListener);
    } else {
      tmpl.quillEditor.removeListener("text-change", textChangesListener);
    }
  });
});

Template.quillReactive.helpers({
  liveEditing: function() {
    return Session.get("liveEditing");
  },
  connection: function() {
    var status = Meteor.status().status;
    return {
      connected: function() { return (status === "connected")},
      connecting: function() { return (status === "connecting")},
      offline: function() { return (status === "offline" || status === "waiting")}
    }
  },
  hasEdits: function() {
    // var tmpl = Template.instance();
    // var unsavedChanges = QuillDrafts.get(tmpl.data.collection + "-" + tmpl.data.docId + "-" + tmpl.data.field);
    // if(tmpl.quillEditor && unsavedChanges) {
    //   var hasEdits = (unsavedChanges && unsavedChanges.draft && unsavedChanges.draft.ops.length > 0)
    //   return (hasEdits)
    // }
  }
});


Template.quillReactive.events({
  'click .ql-save': function(e, tmpl) {
    if(!tmpl.data.field) {
      return;
    }
    var collection = Mongo.Collection.get(tmpl.data.collection);
    var fieldDelta = tmpl.data.field + "Delta";
    var fieldPrevious = tmpl.data.field + "Diff";
    var newContents = tmpl.quillEditor.getContents();
    var newHTML = tmpl.quillEditor.getHTML();
    updateObj = { $set: {}};
    updateObj.$set[fieldDelta] = newContents;
    updateObj.$set[tmpl.data.field] = newHTML;
    // updateObj.$push[tmpl.data.field + "DeltaUndoStack"] = {
    //   undo: newContents.diff(tmpl.quillEditor.oldDelta),
    //   redo: tmpl.quillEditor.oldDelta.diff(newContents)
    // }
    // This update assumes that we already have the latest contents in our editor
    collection.update({_id: tmpl.data.docId}, updateObj)
  },
  'click .ql-discard': function(e, tmpl) {
    if(!tmpl.data.field) {
      return;
    }
    alertify.confirm("Do you really want to discard your unsaved work? Text will be reverted to its last saved state.")
      .set('onok', function(closeEvent) {
        tmpl.quillEditor.setContents(editor.oldDelta);
      }
    );
  },
  'click .toggle-live-editing': function(e, tmpl) {
    Session.set("liveEditing", !Session.get("liveEditing"));
  },
  'click .ql-reconnect': function(e, tmpl) {
    Meteor.reconnect();
  }
});
