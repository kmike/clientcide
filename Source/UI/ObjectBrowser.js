/*
---

script: ObjectBrowser.js

description: Creates a tree view of any javascript object.

license: MIT-Style License

reqiures:
- Core/Class.Extras
- Core/Element.Event
- More/Hash.Extras
- More/Element.Shortcuts
- /dbug

provides:
- ObjectBrowser

...
*/

var ObjectBrowser = new Class({
	Implements: [Options, Events],
	options: {
//	onLeafClick: $empty,
		onBranchClick: function(data){
			this.showLevel(data.path?data.path+'.'+data.key:data.key, data.nodePath);
		},
		initPath: '',
		buildOnInit: true,
		data: {},
		excludeKeys: [],
		includeKeys: []
	},
	initialize: function(container, options){
		this.container = document.id(container);
		this.setOptions(options);
		this.data = $H(this.options.data);
		this.levels = {};
		this.elements = {};
		if (this.options.buildOnInit) this.showLevel(this.options.initPath, this.container);
	},
	toElement: function(){
		return this.container;
	},
	//gets a member of the object by path; eg "fruits.apples.green" will return the value at that path.
	//path - the string path
	//parent - (boolean) if true, will return the parent of the item found ( in the example above, fruits.apples)
	getMemberByPath: function(path, parent){
		if (path === "" || path == "top") return this.data.getClean();
		var h = parent?$H(parent):this.data;
		return h.getFromPath(path);
	},
	//replaceMemberByPath will set the location at the path to the value passed in
	replaceMemberByPath: function(path, value){
		if (path === "" || path == "top") return this.data = $H(value);
		var parentObj = this.getMemberByPath( path, true );
		parentObj[path.split(".").pop()] = value;
		return this.data;
	},
	//gets the path for a given dom node.
	getPathByNode: function(el) {
		return $H(this.elements).keyOf(el);
	},
	//validates that a key is a valid node value
	//against options.includeKeys and options.excludeKeys
	validLevel: function(key){
		return (!this.options.excludeKeys.contains(key) && 
			 (!this.options.includeKeys.length || this.options.includeKeys.contains(key)));
	},
	//builds a level into the interface given a path
	buildLevel:function(path) {
		//if the path ends in a dot, remove it
		if (path.test(".$")) path = path.substring(0, path.length);
		//get the corresponding level for the path
		var level = this.getMemberByPath(path);
		//if the path already has been built, return
		if (this.levels[path]) return this.levels[path];
		//create the section
		var section = new Element('ul');
		switch($type(level)) {
			case "function":
					this.buildNode(level, "function()", section, path, true);
				break;
			case "string": case "number":
					this.buildNode(level, null, section, path, true);
				break;
			case "array":
				level.each(function(node, index){
					this.buildNode(node, index, section, path, ["string", "function"].contains($type(node)));
				}.bind(this));
				break;
			default:
				$H(level).each(function(value, key){
					var db = false;
					if (key == "element_dimensions") db = true;
					if (db) dbug.log(key);
					if (this.validLevel(key)) {
						if (db) dbug.log('is valid level');
						var isLeaf;
						if ($type(value) == "object") {
							isLeaf = false;
							$each(value, function(v, k){
								if (this.validLevel(k)) {
									if (db) dbug.log('not a leaf!');
									isLeaf = false;
								} else {
									isLeaf = true;
								}
							}, this);
							if (isLeaf) value = false;
						}
						if (db) dbug.log(value, key, section, path, $chk(isLeaf)?isLeaf:null);
						this.buildNode(value, key, section, path, $chk(isLeaf)?isLeaf:null);
					}
				}, this);
		}
		//set the resulting DOM element to the levels map
		this.levels[path] = section;
		//return the section
		return section;
	},
	//gets the parent node for an element
	getParentFromPath: function(path){
		return this.elements[(path || "top")+'NODE'];
	},
	//displays a level given a path
	//if the level hasn't been built yet,
	//the level is built and then injected
	//into the target using the given method
	//example:
	//showLevel("fruit.apples", "fruit", "injectInside");
	//note that target and method are set to the parent path and injectInside by default
	showLevel: function(path, target, method){
		target = target || path;
		if (! this.elements[path]) 
			this.elements[path] = this.buildLevel(path)[method||"inject"](this.elements[target]||this.container);
		else this.elements[path].toggle();
		dbug.log('toggle class');
		this.elements[path].getParent().toggleClass('collapsed');
		return this;
	},
	//builds a node given the arguments:
	//value - the value of the node
	//key - the key of the node
	//section - the container where this node goes; typically a section generated by buildLevel
	//path - the path to this node
	//leaf - boolean; true if this is a leaf node
	//note: if the key or the value is an empty string, leaf will be set to true.
	buildNode: function(value, key, section, path, leaf){
		if (key==="" || value==="") leaf = true;
		if (!this.validLevel(key)) return null;
		var nodePath = (path?path+'.'+key:key)+'NODE';
		var lnk = this.buildLink((leaf)?value||key:$chk(key)?key:value, leaf);
		var li = new Element('li').addClass((leaf)?'leaf':'branch collapsed').adopt(lnk).inject(section);
		lnk.addEvent('click', function(e){
			e.stopPropagation();
			if (leaf) {
				this.fireEvent('onLeafClick', {
					li: li, 
					key: key, 
					value: value, 
					path: path,
					nodePath: nodePath,
					event: e
				});
			} else {
				this.fireEvent('onBranchClick', {
					li: li, 
					key: key, 
					value: value, 
					path: path,
					nodePath: nodePath,
					event: e
				});
			}							
		}.bind(this));
		this.elements[nodePath] = li;
		return li;
	},
	//builds a link for a given key
	buildLink: function(key) {
		if ($type(key) == "function") {
			key = key.toString();
			key = key.substring(0, key.indexOf("{")+1)+"...";
		}
		return new Element('a', {
			href: "javascript: void(0);"
		}).set('html', key);
	}
});