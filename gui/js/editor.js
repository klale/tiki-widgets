define([
    'jquery', 
    'underscore',
    'backbone',
    'vkbeautify',
    'highlight',
    './base',
    './tools',
    './win',    
    './form'
], function($, _, Backbone, vkbeautify, highlight, base, tools, win, form) {


    var api = {};

    function escapeHTML(html) {
        var tagsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        };
        return html.replace(/[&<>]/g, function(tag) {
            return tagsToReplace[tag] || tag;
        });
    }
    function unescapeHTML(html) {
        var tagsToReplace = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>'
        };
        return html.replace(/&amp;|&lt;|&gt;/g, function(tag) {
            return tagsToReplace[tag] || tag;
        });
    }

    function pasteHtmlAtCaret(html) {
        var sel, range;
        if (window.getSelection) {
            // IE9 and non-IE
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();

                // Range.createContextualFragment() would be useful here but is
                // non-standard and not supported in all browsers (IE9, for one)
                var el = document.createElement("div");
                el.innerHTML = html;
                var frag = document.createDocumentFragment(), node, lastNode;
                while ( (node = el.firstChild) ) {
                    lastNode = frag.appendChild(node);
                }
                range.insertNode(frag);

                // Preserve the selection
                if (lastNode) {
                    range = range.cloneRange();
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        } else if (document.selection && document.selection.type != "Control") {
            // IE < 9
            document.selection.createRange().pasteHTML(html);
        }
    }




    /**
    * Add this to a div to allow dropping files on it.
    * A div will be inserted where drop occurs, representing the not-yet-uploaded
    * file. Just like dropping an attachment to an email message. The div
    * can be moved around within this DropUpload container element. 
    *
    * This class is can be extended to customize behavior when dropping different file 
    * types etc.
    *
    * Editorjs (my ACM5 wysiwyg) will use a DropUpload.
    *
    * Adding a dropupload 
    */
    // api.FileDropper = Backbone.View.extend({
    //     className: 'dropupload',
    //     attributes: {
    //         'ondragover': "return false"
    //     },
    //     events: {
    //         // 'dragover': 'onDragOver',
    //         'drop': 'onDrop',
    //     },
    //     
    //     initialize: function(config) {
    //         if(config.el) {
    //             $(config.el).attr(this.attributes).addClass(this.className);
    //         }
    //     },
    //     render: function() {
    //         return this;
    //     },
    //     
    //     onDragOver: function(e) {
    //         e.preventDefault(); 
    //         return false;
    //     },
    //     // createSpaceholder: function(file) {
    //     //     var id = base.randhex(32),
    //     //         name = file.name,
    //     //         extension = name.substr(name.lastIndexOf('.')+1),
    //     //         isImage = file.type.substr(0,6) == 'image/';
    //     //     
    //     //     // Create a space-holder element
    //     //     var el = $(''+
    //     //         '<div id="'+id+'" class="file new '+extension+'" contenteditable="false" draggable="true">'+
    //     //             '<div class="icon">&nbsp;</div>'+
    //     //             '<div class="name">'+name+'</div>'+
    //     //         '</div>');
    //     //     
    //     //     // The space-holder el has a reference to its file object
    //     //     el.data('file', file);
    //     //     
    //     //     // If it's an image, load it client-side
    //     //     if(isImage) {
    //     //         // var fileReader = new FileReader();
    //     //         // $(fileReader).on('load', function() {
    //     //         //     el.attr('src', fileReader.result)
    //     //         // });
    //     //         // fileReader.readAsDataURL(file);
    //     //         el.addClass('image');
    //     //         el.find('.icon').append('<img draggable="false"/>');
    //     //         if(window.webkitURL)
    //     //             var url = window.webkitURL.createObjectURL(file)
    //     //         else
    //     //             var url = window.createObjectURL(file)
    //     //         el.find('img').attr('src', url)
    //     //     }
    //     //     return el;
    //     // },
    //     // onDrop: function(e) {
    //     //     // Prevent the default behavior of opening a dropped file
    //     //     e.preventDefault();
    //     //     
    //     //     // Get all dropped files
    //     //     var files = e.originalEvent.dataTransfer.files;
    //     //     
    //     //     // Create an space-holder+file object for each file
    //     //     var elements = _.map(files, function(file) {
    //     //         return this.createSpaceholder(file);
    //     //     }, this);
    //     // 
    //     //     // Re-trigger the origial "drop" event, with the spaceholders added.
    //     //     var ev = _.extend({}, e, {elements: elements});
    //     //     this.trigger('drop', ev);
    //     // }
    //     onDrop: function(e) {
    //         // Prevent the default behavior of opening a dropped file
    //         e.preventDefault();
    //         
    //         // Get all dropped files
    //         var files = e.originalEvent.dataTransfer.files;
    //     
    //         // Re-trigger the origial "drop" event, with the spaceholders added.
    //         var ev = _.extend({}, e, {files: files});
    //         this.trigger('drop', ev);
    //     }    
    // });


    api.Quicklook = win.Window.extend({
        className: 'gui-win editor-quicklook',
        _template: _.template(''+
            '<header><div class="title">Quicklook</div></header>'+
            '<div class="content"></div>'+
            '<footer>'+
                '<div class="buttons">'+
                    '<button class="close">Close</button>'+
                '</div>'+
            '</footer>'+
            '<div class="resize"></div>'
        ),
        template: _.template2(''+
            '<img src="${obj.preview || obj.path}"/>'
        ),        
        events: {
            'keydown': '_onKeyDown',
            'click .buttons .close': 'close',         
        },
        mixins: [base.ChildView],
    
        initialize: function(config) {
            win.Window.prototype.initialize.call(this, config);
            this.file = config.file;
            this.fileview = config.fileview;
        
            _.bindAll(this, 'onImgLoad');
        },
        render: function() {
            win.Window.prototype.render.call(this);            
            return this;
        },
        renderContent: function() {
            var img = $(this.template(this.file.attributes));
            img.on('load', this.onImgLoad)
            this.$('>.content').empty().append(img);
        },
        onImgLoad: function(e) {
            var img = $(e.target)
            this.$el.height(img.height()+115);
            this.$el.width(img.width()+45);        
            this.center()
        },


        _onKeyDown: function(e) {
            if(e.which == base.keys.ESC || e.which == base.keys.SPACE) {
                this.close();       
                // Stop the ESC here
                e.stopPropagation();
                e.preventDefault();  // <-- important! prevent hammering of keydown events!
            }
            else if(base.isArrowKey(e)) {
                this.fileview.$el.trigger(e);
                // e.stopPropagation();
            }
        },
    });


    api.FileView = Backbone.View.extend({

        className: 'fileview',
        attributes: {
            contenteditable: 'false',
            tabindex: '-1'
        },
        itemTemplate: _.template2(''+
            '<div id="${obj.id}" class="file ${obj.extension}">'+
                '<div class="icon">&nbsp;</div>'+
                '<div class="name">${obj.name}</div>'+
            '</div>'
        ),
        quicklookTemplate: _.template2(''+
            '<div class="fileview-quicklook"><img src="${obj.preview || obj.path}"/></div>'
        ),
        events: {
            'keydown': 'onKeyDown',
            'mousedown': 'onMouseDown'
        },
    
        onMouseDown: function(e) {
            this.el.focus();
        
            var sel = window.getSelection();
            sel.removeAllRanges();
        },
        onKeyDown: function(e) {
            if(e.which == base.keys.SPACE) {
                var el = this.selectable.getSelected().filter(':last');
                var file = this.files.get(el.attr('id'));
                this.quicklook(file);
                e.preventDefault();
            }
        },
        initialize: function(config) {
            config = config || {}
            console.log('Createing a new FileView with: ', config.models)
            // this.files = new (Backbone.Collection.extend({}))(config.models);
            this.files = new Backbone.Collection(config.models);        
            this.files.on('add', this.onFileAdd, this);
            if(config.el) 
                $(config.el).attr(this.attributes);

            // Add a Selectable
            this.selectable = new tools.Selectable({
                el: this.el,
                selectables: '.file'
            });
            this.selectable.on('change', this.onSelectableChange, this);
            // Todo: this feels leeky
            this.$el.data('view', this);

        },
        onSelectableChange: function(e){
            var el = this.selectable.getSelected().filter(':first');
            var file = this.files.get(el.attr('id'))
            var attrs = file.attributes,
                preview = attrs.preview || attrs.path
            if(preview && this._quicklook && this._quicklook.$el.is(':visible')) {
                this._quicklook.$('img').attr('src', preview);
            }
        },
        quicklook: function(file) {
            if(this._quicklook) {
                this._quicklook.close();
                this._quicklook = null;
            } else {
                // this._quicklook = $(this.quicklookTemplate(file.attributes));
                if(!this._quicklook) {
                    this._quicklook = new api.Quicklook({file: file, fileview: this})
                    this._quicklook.on('close', function() { this._quicklook = null; this.el.focus(); }, this);
                }
                this._quicklook.show()

                this._quicklook.$el.css({
                    width: 700,
                    height: 600
                });
                this._quicklook.center();            
                this._quicklook.el.focus();
            }
        
        },
        onFileAdd: function(file) {
            var el = this.renderOne(file);
            el.addClass('new');
            this.$el.append(el);
        },
        render: function() {
            this.$el.empty();
            console.log('RENDER FILEVIEW', this.files.length)
            this.files.each(function(file) {
                this.$el.append(this.renderOne(file));
            }, this);
            return this;
        },
        renderOne: function(file) {
            var el = $(this.itemTemplate(file.toJSON())),
                thumbnail = file.get('thumbnail'),
                isImage = file.get('type').substr(0,6) == 'image/';
        
            if(isImage) 
                el.addClass('image');
        
            if(thumbnail) {
                el.find('.icon').empty().append('<img draggable="false"/>');
                el.find('img').attr('src', thumbnail);
            }
            else if(isImage && file.file) {
                el.find('.icon').append('<img draggable="false"/>');
                if(window.webkitURL)
                    var url = window.webkitURL.createObjectURL(file.file);
                else
                    var url = window.createObjectURL(file.file);
                el.find('img').attr('src', url);
            }
            return el;
        },
        getNewFiles: function() {
            return _.compact(this.files.map(function(file) {
                if(file.file)
                    return {
                        name: file.id+'.'+file.get('extension'),
                        file: file.file
                    }
            }));
        }

    });

    /*

    <section>
        <h2>Foobar</h2>
        <p>Lorem ipsum</p>
        <div class="codeview python">
            def foo:
                return 'Foo'
        </div>
    
        <pre>
            <code class="python">
                def foo:
                    return 'Foo'
            </code>
        </pre>
                
        <p>Lorem ipsum</p>

    */
    api.CodeView = Backbone.View.extend({
        className: 'codeview',
        attributes: {
            // tabindex: '-1',
            contenteditable: 'false'
        },
        events: {
            // 'focus': 'onFocus',
            // 'focusleave': 'onBlur',
            'mousedown': 'onMouseDown',
            'mouseup': 'onMouseDown',        
            'keydown': 'onKeyDown',
            'mouseup': 'saveRange'
        },
        mixins: [tools.InterceptPaste],
    
        onMouseDown: function(e) {
            e.stopPropagation();
        },
        onKeyDown: function(e) {
            this.saveRange();
            if(e.which == base.keys.ENTER && e.shiftKey) {
                var p = $('<p>&nbps;</p>').insertAfter(this.$el);
                // Move cursor to the new div
            
                $.Range(p).select().collapse();
                e.preventDefault();
            }
        },
        onPaste: function(e) {
            // this.insertText(e.data);
            this.range.collapse()
            var textnode = document.createTextNode(e.data)
        
            this.range.deleteContents();
            this.range.insertNode(textnode)
            $.Range(textnode).select()
            this.range.collapse();

            var sel = window.getSelection();
            sel.removeAllRanges()
            sel.addRange(this.range)
        },   
        saveRange: function() {
            this.range = $.Range.current().range.cloneRange();
            window.curr = this.range;        
        },    
        initialize: function(config) {
            tools.InterceptPaste.initialize.call(this);
            this.lang = config.lang;
            this.value = config.value;
            // this._mode = config.mode || 'pretty';
            this.config = config;
            if(config.el) {
                if(!this.value)
                    this.value = $(config.el).html().trim();
                if(!this.lang)
                    this.lang = $(config.el).attr('data-lang') || 'text';                
            }
        
            _.bindAll(this, 'onFocus', 'onBlur');
        
        
            this.on('paste', this.onPaste, this);
            this.$el.attr('data-lang', this.lang);
            // this.$el.on('focus', this.onFocus);
            // Todo: leaks?
            this.$el.data('view', this);
        },
    
        render: function() {
            var code = $('<pre></pre>').addClass(this.lang);
            code.attr({
                'contenteditable': 'true',
            })
            code.on('focus', this.onFocus);
            code.on('blur', this.onBlur)
            this.$el.empty().append(code);
        
        
            if(this._mode === undefined) {
                var mode = this.config.mode || 'pretty';
                if(mode == 'pretty')
                    this.pretty()
                else
                    this.raw()
            }
            return this;
        },
        pretty: function() {
            if(this._mode == 'pretty')
                return
            this._mode = 'pretty';
        
            if(this.lang == 'text')
                // Plain text, nothing to make pretty
                return

            var html = this.value;

            if(this.lang == 'xml') 
                html = vkbeautify.xml(html);
        
            html = highlight.highlight(this.lang, html).value;
            this.$('>pre')[0].innerHTML = html;
        },
        raw: function() {

            if(this._mode == 'raw') return;
            this._mode = 'raw';
            this.$('>pre').text(this.value.trim());
        },
        onFocus: function() {
            this.raw();
        },
        onBlur: function(e, data) {
            this.setValue(this.$('>pre').getPreText());
            this.pretty();
        }
    });





    api.Editor = Backbone.View.extend({
        className: 'gui-editor',
        typeName: 'editor',
        template: _.template(''+
            '<div class="toolbar">'+
                '<ul>'+
                    '<li><button class="section">Section</button></li>' +
                    '<li><button class="p">P</button></li>' +
                    '<li><button class="b">B</button></li>' +                
                    '<li><button class="a">A</button></li>' +                
                    '<li><button class="h1">H1</button></li>' +
                    '<li><button class="h2">H2</button></li>' +
                    '<li><button class="h3">H3</button></li>' +                
                    '<li><button class="ul">UL</button></li>' +
                    '<li><select class="code"></select></li>' +
                    '<li><button class="viewsource">View source</button></li>' +
                '</ul>'+
            '</div>'+
            '<div class="clear">'+
                '<div class="right">'+
                    '<pre class="html prettyprint lang-html"></pre>'+
                '</div>'+
                '<div class="left">'+
                    '<div class="pane" contenteditable="true"></div>'+
                '</div>'+
            '</div>'
        ),
        attributes: {
            'tabindex': 0,
        },
        events: {
            'click .toolbar .section': 'onToolbarSectionClick',
            'click .toolbar .p': 'onToolbarPClick',
            'click .toolbar .b': 'onToolbarBClick',
            'click .toolbar .a': 'onToolbarAClick',                
            'change .toolbar .code': 'onToolbarCodeChange',        
            'click .toolbar .h1': 'onToolbarH1Click',
            'click .toolbar .h2': 'onToolbarH2Click',        
            'click .toolbar .h3': 'onToolbarH3Click',                
            'click .toolbar .ul': 'onToolbarULClick',
            'click .toolbar .viewsource': 'onToolbarViewSourceClick',
            'mousedown .pane': 'onMouseDown',
            'mouseup .pane': 'onMouseUp',
            'mousemove .pane': 'onMouseMove',
            'keyup': 'onKeyUp',
            'keydown': 'onKeyDown',
            'dragstart': 'onDragStart',
            'drop': 'onDrop'
        },
        mixins: [tools.InterceptPaste],


        onDragStart: function(e) {        
            this._dragging = e.target;
        },
        onDrop: function(e) {
            if(this._dragging && this._dragging.parentNode != e.target && e.target != this._dragging) {
                console.log('MOVE TO: ', $(e.target).closest('p')[0], e.target)
            
                // $(this._dragging).appendTo($(e.target).closest('p'))
                this.addElFromDropEvent(e, this._dragging);
            }
            this._dragging = null;
        },
    
        updateHighlight: function() {
            var code = $(this.range.commonAncestorContainer.parentNode).closest('code');
            if(code[0]) {
                co
            }
        },
    
        // addElFromDropEvent: function(e, elements) {
        //     // Handle a drop event
        //     var target = $(e.target),
        //         files = target.closest('div.files');
        //     if(files[0]) {
        //         files.append(elements)
        //     }
        //     else {
        //         // Add a new <p class="files"> right after container that was dropped on
        //         var droppedOn = target.parentsUntil('section').slice(-1)[0]
        //         var container = $('<div class="files"></p>');
        //         container.append(elements)            
        // 
        //         if(droppedOn) 
        //             container.insertAfter(droppedOn)
        //         else
        //             container.appendTo(target.closest('section'))
        // 
        //     }
        //     
        // 
        // },
        onToolbarCodeChange: function(e) {
            var lang = e.target.options[e.target.selectedIndex].value;
            if(lang) {
                var el = $(this.range.commonAncestorContainer.parentNode);
                var val = el.html().trim().replace(/<br>/g, '\n')
                // debugger
                var codeview = new api.CodeView({value: unescapeHTML(val), mode: 'pretty', lang: lang});
            
                el.replaceWith(codeview.render().el);
                // $.Range(pre.find('code')).select();
                e.target.selectedIndex = 0;
            }
        },

        initialize: function(config) {
            if(config.el) {
                $(config.el).attr(this.attributes).addClass(this.className);
                // this.html = $(config.el).html();
                config.value = $(config.el).html().trim();
            }
            tools.InterceptPaste.initialize.call(this);
            
            // A dict of dicts of file metadata used by FileViews if any.
            this.files = config.files;

            this.on('paste', this.onPaste, this);
        },
        render: function() {
            this.$el.html(this.template());
            this.$('.pane').html(this.value);

            new tools.Float({el: this.$('.toolbar')});
        
            // Populate code combo
            var langs = ['bash', 'xml', 'python', 'sql', 'javascript'],
                combo = this.$('select.code');
            combo.append('<option>--Code--</option>');
            _.each(langs, function(lang) {
                combo.append('<option value="'+lang+'">'+lang+'</option>');
            });
        
            // Create a FileDropper
            this.fileDropper = new tools.FileDropper({el: this.$('.pane')})
            this.fileDropper.on('drop', this.onFileDropperDrop, this)
        
            // find and render all .fileview elements
            var editor = this;
            console.log('EDITOR .files', editor.files)
            this.$('.fileview').each(function() {
                var ids = JSON.parse(this.innerHTML);
                var models = _.compact(_.map(ids, function(id) { 
                    return editor.files[id]; 
                }));
                var fileview = new api.FileView({
                    el: this, 
                    models: models});
                fileview.render();
            });
        
            this.$('.codeview').each(function() {
                var codeview = new api.CodeView({
                    value: $(this).getPreText(), 
                    lang: $(this).attr('data-lang')
                });
                $(this).replaceWith(codeview.render().el);
                // codeview.pretty();
            });
        
            return this;
        },
        onFileDropperDrop: function(e) {
            // User dropped local files from the OS
            // this.addElFromDropEvent(e, e.elements);
            var target = $(e.target),
                fileview = target.closest('div.fileview');
        
            // Create models
            var models = _.map(e.files, function(file) {
                var m = new Backbone.Model({
                    id: base.randhex(32),
                    name: file.name,
                    type: file.type,
                    extension: file.name.substr(file.name.lastIndexOf('.')+1)
                });
                m.file = file;
                return m;
            });


            // Add to dom
            if(fileview[0]) {
                fileview.data('view').files.add(models)
            }
            else {
                // Add a new <p class="files"> right after container that was dropped on
                var droppedOn = target.parentsUntil('section').slice(-1)[0]
                var fileview = new api.FileView();
                fileview.render();
                fileview.files.add(models);

                if(droppedOn) 
                    fileview.$el.insertAfter(droppedOn)
                else if(target.is('p'))
                    fileview.$el.insertAfter(target)
                else
                    fileview.$el.appendTo(target.closest('section'))

            }        
        },
        getNewFiles: function() {
            return this.$('.pane').find('.fileview').map(function() {
                return $(this).data('view').getNewFiles();
            });
        },
        getValue: function() {
            // Create a clone of the whole loot
            var pane = this.$('.pane').clone(true);
        
            // Replace markup generated by views with just the raw value
            pane.find('.fileview').each(function() {
                // Remove irrelevant functional attributes
                $(this).removeAttr('contenteditable').removeAttr('tabindex');
                var ids = $(this).data('view').files.map(function(f) { return f.id });
                var json = JSON.stringify(ids);
                $(this).html(json);
            });
        
            pane.find('.codeview').each(function() {
                $(this).html($(this).data('view').getValue());
            });
        
            // Return the cleaned-up html
            return pane.html().trim();
        },
        onPaste: function(e) {
            // var data = e.data.replace(/\n/g, '<br/>');
        
            this.insertText(e.data);        
        },
        _insertNode: function(node, options) {
            options = options || {};
            // 1. Clear current range
            var curr = $.Range.current();
            curr.range.deleteContents();
        
            // 2. Insert the node
            curr.range.insertNode(node);
        
            // 3. Clone the current range and move cursor to after <br>
            r2 = curr.range.cloneRange();
            r2.setStartAfter(options.lastNode || node);
            r2.collapse(true);
        
            // 4. Add the new cloned range to the dom
            var sel = window.getSelection();
            sel.removeAllRanges()
            sel.addRange(r2)        
        
        },
        insertText: function(text) {
            var lines = text.split('\n'),
                frag = document.createDocumentFragment();
            for(var i=0; i<lines.length; i++) {
                var textnode = document.createTextNode(lines[i]);
                frag.appendChild(textnode);
                if(i<lines.length-1)
                    frag.appendChild(document.createElement('br'));
            }
        
            // var node = document.createTextNode(text);
            this._insertNode(frag, {lastNode: textnode});
        },
        insertHTML: function(html) {
            // 1. Create a dom node and 
            var node = $(html)[0];
        
            // 2. Clear current range
            var curr = $.Range.current();
            curr.range.deleteContents();
        
            // 3. Insert the br
            curr.range.insertNode(node);
        
            // 4. Clone the current range and move cursor to after <br>
            r2 = curr.range.cloneRange();
            r2.setStartAfter(node);
            r2.collapse(true);
        
            // 5. Add the new cloned range to the dom
            var sel = window.getSelection();
            sel.removeAllRanges()
            sel.addRange(r2)        
        },
        updateSourcePane: function() {
            var pane = this.$('.pane');
            if(pane.is(':visible')) {
                var html = this.$('.pane').html();
                html = vkbeautify.xml(html);
                // html = escape(html);
                html = highlight.highlight('xml', html).value;
                this.$('.html').html(html);
            }
        },
        onMouseDown: function(e) {
        },
        onMouseMove: function(e) {
        },
        onMouseUp: function(e) {
            this.saveRange()
            this.updateSourcePane();
        },
        onKeyUp: function() {
            this.saveRange()
            this.updateSourcePane();
        },
        moveCaretTo: function(el) {
            this.range.setStartBefore(el.firstChild);
            this.range.collapse(true);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.range);
        
        },
        onKeyDown: function(e) {
            if(e.which == base.keys.TAB) {
                var parent = this.getParent(),
                    next = $(parent).next();
                this.moveCaretTo(next[0]);
                e.preventDefault();
            }
            else if(e.which == base.keys.ENTER && (e.ctrlKey || e.metaKey)) {
                this.addNewSection(e.shiftKey)
            }
            else if(e.which == base.keys.ENTER && e.shiftKey) {
                this.insertHTML('<br/>');
                e.preventDefault();            
            }
        
            if(e.which == base.keys.ENTER) {
                e.stopPropagation();
            }
        },
    
        saveRange: function() {
            this.range = $.Range.current().range.cloneRange();
            window.curr = this.range;        
        },
        getParent: function() {
            var common = this.range.commonAncestorContainer;
            if(common.nodeType == 3)
                return common.parentNode;
            else
                return common;
        },
        getCurrentSection: function() {
            // find first section, within .pane
            if(this.range)
                return $(this.range.commonAncestorContainer).closest('section', this.el)[0];
        },

        addNewSection: function(before) {
            // Create a new section element
            var newsection = $('<section><h2>Section title</h2><p>Text</p></section>');
            var section = this.getCurrentSection();
        
            // Insert it
            if(section && before) 
                newsection.insertBefore(section);
            else if(section)
                newsection.insertAfter(section);
            else 
                this.$('.pane').append(newsection)
        
            // Select its h2
            $.Range(newsection.find('h2')).select();        
        },

    
        // ============
        // = Commands =
        // ============
        formatBlock: function(tagname) {
            var el = this.range.commonAncestorContainer.parentNode;
            document.execCommand('formatBlock', false, tagname);
        },
        formatInline: function(tagname) {
            var text = this.range.toString();
            this.range.extractContents();
            var el = $(document.createElement(tagname)).html(text);
            this.range.insertNode(el[0]);
        
        },
        formatLink: function() {
            var url = this.range.toString();
            this.range.extractContents();
            var a = $('<a>').attr('href', url).html(url)

            this.range.insertNode(a[0]);
        },
        onToolbarSectionClick: function(e) {
            this.addNewSection();
        },    
        onToolbarPClick: function(e) {
            this.formatBlock('p');
        },    
        onToolbarBClick: function(e) {
            this.formatInline('strong');
        },    
        onToolbarAClick: function(e) {
            this.formatLink();
        },    
        onToolbarH1Click: function(e) {
            this.formatBlock('h1');
        },
        onToolbarH2Click: function(e) {
            this.formatBlock('h2');
        },
        onToolbarH3Click: function(e) {
            this.formatBlock('h3');
        },    
        onToolbarULClick: function(e) {
            // this.formatBlock('ul');
            // document.execCommand('insertunorderedlist', false);
        
            var node = $(this.getParent()),
                ul = $('<ul><li></li></ul>'),
                li = ul.children('li');
        
            ul.children('li').html(node.html())
            node.remove();
            this.insertHTML(ul);
            this.moveCaretTo(li[0])
        
        
        },    
        onToolbarViewSourceClick: function(e) {
            if($('pre.html').is(':visible')) {
                // hide source
                this.$('.left').width('100%')
                this.$('pre.html').hide();
            }
            else {
                // show source
                this.$('.left, .right').width('50%');
                this.$('pre.html').show();            
            }

        }
    
    }, {
        createFromElement: function(el) {
            return form.createFromElement(this, el);        
        }
    });



    return api; 
});
