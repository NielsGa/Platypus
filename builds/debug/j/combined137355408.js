(function(){
  var platformer = {};

  PBS = this.PBS || {};
  PBS.KIDS = this.PBS.KIDS || {};
  PBS.KIDS.platformer = platformer;

platformer.classes = {};

/*--------------------------------------------------
 *   Game - ../engine/game.js
 */
/**
# CLASS game
This class is used to create the `platformer.game` object. The `game` object handles loading [[Scene]]s and transitions between scenes. It also accepts external events and passes them on to the current scene.

## Methods
- **constructor** - Creates an object from the game class.
  > @param definition (object) - Collection of settings from config.json.
  > @param onFinishedLoading (function) - An optional function to run once the game has begun.
- **tick** - Called by the CreateJS ticker. This calls tick on the scene.
  > @param deltaT (number) - The time passed since the last tick.
- **loadScene** - Loads a scene. If there's a transition, performs the transition.
  > @param sceneId (string) - The scene to load.
  > @param transition (string) - What type of transition to make. Currently there are: 'fade-to-black' and 'instant'
- **loadNextScene** - Sets the currentScene to the specified scene. Called by loadScene, shouldn't be called on its own.
  > @param sceneId (string) - The scene to load.
- **completeSceneTransition** - Ends the transition and destroys the old scene. Called when the scene effect is finished.
- **addEventListener** - Adding event listeners to the specified element and assigning callback functions.
  > @param element (DOM element) - The element to add the eventListener to.
  > @param event (DOM events) - The event to listen for.
  > @param callback (function) - The function to call when the event occurs.
- **destroy** - Destroys the object so that it's ready to garbage collect.

## Helper Function
- **bindEvent** - Returns a function which takes in an event and calls the callback function passing it the eventId and the event.
  > @param eventId (string) - The id of the event we're binding to.
  > @param callback (function) - The function to call.
*/

platformer.classes.game = (function(){
	var bindEvent = function(eventId, callback){return function(event){callback(eventId, event);};};
	var game      = function (definition, onFinishedLoading){
		var innerRootElement = document.createElement('div'),
		outerRootElement = null;

		this.currentScene = undefined;
		this.tickContent = {
			deltaT: 0,
			count: 0
		};
		this.settings = definition;
		
		if(document.getElementById(definition.global.rootElement || "root")){
			outerRootElement = document.getElementById(definition.global.rootElement || "root");
		} else {
			outerRootElement = document.createElement('div');
			outerRootElement.id = definition.global.rootElement || "root";
			document.getElementsByTagName('body')[0].appendChild(outerRootElement);
		}
		for (var i in definition.supports){
			if(definition.supports[i]){
				outerRootElement.className += ' supports-' + i;
			}
		}
		
		innerRootElement.id = 'inner-' + outerRootElement.id;
		outerRootElement.appendChild(innerRootElement);
		this.rootElement = innerRootElement;
		this.containerElement = outerRootElement;
		
		this.loadScene(definition.global.initialScene);

		// Send the following events along to the scene to handle as necessary:
		var self = this,
		callback = function(eventId, event){
			self.currentScene.trigger(eventId, event);
//			if(event.metaKey && event.keyCode == 37){ //This causes an accidental cmd key press to send the browser back a page while playing and hitting the left arrow button.
				event.preventDefault(); // this may be too aggressive - if problems arise, we may need to limit this to certain key combos that get in the way of gameplay.
//			}
		};
		this.bindings = [];
		this.addEventListener(window, 'keydown', callback);
		this.addEventListener(window, 'keyup',   callback);

		// If aspect ratio of game area should be maintained on resizing, create new callback to handle it
		if(definition.global.aspectRatio){
			callback = function(eventId, event){
				var element = innerRootElement;
				var ratio   = definition.global.aspectRatio;
				var newW    = outerRootElement.offsetWidth;
				var newH    = outerRootElement.offsetHeight;
				if(definition.global.maxWidth && (definition.global.maxWidth < newW)){
					newW = definition.global.maxWidth;
				}
				var bodyRatio = newW / newH;
				if (bodyRatio > ratio)
				{  //Width is too wide
					element.style.height = newH + 'px';
				    newW = newH * ratio;
				    element.style.width = newW + 'px';
				} else {  //Height is too tall
					element.style.width = newW + 'px';
				    newH = newW / ratio;
				    element.style.height = newH + 'px';
				}
				if(definition.global.resizeFont){
					outerRootElement.style.fontSize = Math.round(newW / 100) + 'px';
				}
				element.style.marginTop = '-' + Math.round(newH / 2) + 'px';
				element.style.marginLeft = '-' + Math.round(newW / 2) + 'px';
				element.style.top = '50%';
				element.style.left = '50%';
				self.currentScene.trigger(eventId, event);
			};
			callback('resize');
		} else if(definition.global.resizeFont) {
			callback = function(eventId, event){
				outerRootElement.style.fontSize = parseInt(self.rootElement.offsetWidth / 100) + 'px';
				self.currentScene.trigger(eventId, event);
			};
			callback('resize');
		}
		this.addEventListener(window, 'orientationchange', callback);
		this.addEventListener(window, 'resize',            callback);
		
		if(onFinishedLoading){
			onFinishedLoading(this);
		}
	};
	var proto = game.prototype;
	
	proto.tick = function(deltaT){
		this.tickContent.deltaT = deltaT;
		this.tickContent.count += 1;
		
		if(this.currentScene){
			this.currentScene.trigger('tick', this.tickContent);
		}
	};
	
	proto.loadScene = function(sceneId, transition, persistantData){
		var self = this;
		this.inTransition = true;
		this.leavingScene = this.currentScene;
		switch(transition){
		case 'fade-to-black':
			var element = document.createElement('div');
			this.rootElement.appendChild(element);
			element.style.width = '100%';
			element.style.height = '100%';
			element.style.position = 'absolute';
			element.style.zIndex = '12';
			element.style.opacity = '0';
			element.style.background = '#000';
			new createjs.Tween(element.style).to({opacity:0}, 500).to({opacity:1}, 500).call(function(t){
				self.loadNextScene(sceneId, persistantData);
				self.completeSceneTransition();
			}).wait(500).to({opacity:0}, 500).call(function(t){
				self.rootElement.removeChild(element);
				element = undefined;
			});
			break;
		case 'instant':
		default:
			this.loadNextScene(sceneId, persistantData);
			this.completeSceneTransition();
		}
	};
	
	proto.loadNextScene = function(sceneId, persistantData){
		var scene = null;
		
		if(typeof sceneId === 'string'){
			scene = this.settings.scenes[sceneId];
		} else {
			scene = sceneId;
		}
		
		this.currentScene = new platformer.classes.scene(scene, this.rootElement);
		
		this.currentScene.trigger('scene-loaded', persistantData);
		console.log('Scene loaded: ' + sceneId); //putting a console log here, because Android seems to hang if I do not. Need to test more Android devices.
		
	};
	
	proto.completeSceneTransition = function(){
		this.inTransition = false;
		if(this.leavingScene){
			this.leavingScene.destroy();
			this.leavingScene = false;
		}
	};
	
	proto.addEventListener = function(element, event, callback){
		this.bindings[event] = {element: element, callback: bindEvent(event, callback)};
		element.addEventListener(event, this.bindings[event].callback, true);
	};
	
	proto.destroy = function ()
	{
		for (var binding in this.bindings){
			element.removeEventListener(this.bindings[binding].element, this.bindings[binding].callback, true);
		}
		this.bindings.length = 0;
	};
	
	return game;
})();


/*--------------------------------------------------
 *   ComponentFactory - ../engine/factory.js
 */
/*
 * This file includes a few helper functions to handle component code that is repeated across multiple components.
 */
(function (ns){
	ns.components = {};
	
	ns.createComponentClass = function(componentDefinition){
		var component = function(owner, definition){
			var func = null;
			
			this.owner = owner;
			this.listeners = [];
			this.type = componentDefinition.id;
			
			if(componentDefinition.events){
				for(func in componentDefinition.events){
					this.addListener(func);
				}
			}
			
			if (this.constructor){
				this.constructor(definition);
			}
		},
		func  = null,
		proto = component.prototype;
		
		// Have to copy rather than replace so definition is not corrupted
		proto.constructor = componentDefinition.constructor;
		if(componentDefinition.events){
			for(func in componentDefinition.events){
				proto[func] = componentDefinition.events[func];
			}
		}
		for(func in componentDefinition.methods){
			if(func === 'destroy'){
				proto['___' + func] = componentDefinition.methods[func];
			} else {
				proto[func] = componentDefinition.methods[func];
			}
		}

		proto.toString = function(){
			return "[component " + this.type + "]";
		};

		// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
		proto.destroy = function(){
			this.removeListeners(this.listeners);
			if(this.___destroy){
				this.___destroy();
			}
		};
		
		proto.setProperty = function(property, value){
			this[property] = value;
		};

		proto.addListeners = function(messageIds){
			for(var message in messageIds) this.addListener(messageIds[message]);
		};
	
		proto.removeListeners = function(listeners){
			if(!listeners){
				listeners = this.listeners;
			}
			for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
		};
		
		proto.addListener = function(messageId, callback){
			var self = this,
			func = callback || function(value, debug){
				self[messageId](value, debug);
			};
			this.owner.bind(messageId, func);
			this.listeners[messageId] = func;
		};
	
		proto.removeListener = function(boundMessageId, callback){
			this.owner.unbind(boundMessageId, callback);
		};
		
		ns.components[componentDefinition.id] = component;
	};
})(platformer);


/*--------------------------------------------------
 *   Entity - ../engine/entity.js
 */
/**
# CLASS entity
The Entity object acts as a container for components, facilitates communication between components and other game objects, and includes properties set by components to maintain a current state. The entity object serves as the foundation for most of the game objects in the Platformer engine.

## Messages

### Local Broadcasts:
- **load** - The entity triggers `load` on itself once all the properties and components have been attached, notifying the components that all their peer components are ready for messages.

## Methods
- **[constructor]** - Returns a new Entity object based on the definitions provided.
  > @param definition (object) - Base definition for the entity, includes properties and components as shown below under "JSON definition".
  > @param instanceDefinition (object) - Specific instance definition including properties that override the base definition properties.
  > @return entity - returns the new entity made up of the provided components. 
- **addComponent** - Attaches the provided component to the entity.
  > @param component (object) - Must be an object that functions as a [[Component]].
  > @return component - Returns the same object that was submitted.
- **removeComponent** - Removes the mentioned component from the entity.
  > @param component (object) - Must be a [[Component]] attached to the entity.
  > @return component|false - Returns the same object that was submitted if removal was successful; otherwise returns false (the component was not found attached to the entity).
- **bind** - Used by components to bind handler functions to triggered events on the entity. 
  > @param event (string) - This is the message for which the component is listening.
  > @param func (function) - This is the function that will be run when the message is triggered.
- **toString** - Returns a string describing the entity.
  > @return string - Returns the entity type as a string of the form "[entity entity-type]".
- **trigger** - This method is used by both internal components and external entities to trigger messages on this entity. When triggered, entity checks through bound handlers to run component functions as appropriate.
  > @param event (variant) - This is the message(s) to process. This can be a string, an object containing an "event" property (and optionally a "message" property, overriding the value below), or an array of the same.
  > @param value (variant) - This is a message object or other value to pass along to component functions.
  > @param debug (boolean) - This flags whether to output message contents and subscriber information to the console during game development. A "value" object parameter (above) will also set this flag if value.debug is set to true.
  > @return integer - The number of handlers for the triggered message: this is useful for determining whether the entity cares about a given message.
- **triggerEvent** - This method is used by both internal components and external entities to trigger messages on this entity. When triggered, entity checks through bound handlers to run component functions as appropriate.
  > @param event (string) - This is the message to process.
  > @param value (variant) - This is a message object or other value to pass along to component functions.
  > @param debug (boolean) - This flags whether to output message contents and subscriber information to the console during game development. A "value" object parameter (above) will also set this flag if value.debug is set to true.
  > @return integer - The number of handlers for the triggered message: this is useful for determining whether the entity cares about a given message.
- **unbind** - Used by components to unbind handler functions on the entity, typically called when a component is removed from the entity.
  > @param event (string) - This is the message the component is currently listening to.
  > @param func (function) - This is the function that was attached to the message.
- **getMessageIds** - This method returns all the messages that this entity is concerned about.
  > @return Array - An array of strings listing all the messages for which this entity has handlers.
- **destroy** - This method removes all components from the entity.

## JSON Definition:
    {
      "id": "entity-id",
      // "entity-id" becomes `entity.type` once the entity is created.
      
      "components": [
      // This array lists one or more component definition objects
      
        {"type": "example-component"}
        // The component objects must include a "type" property corresponding to a component to load, but may also include additional properties to customize the component in a particular way for this entity.
      ],
      
      "properties": [
      // This array lists properties that will be attached directly to this entity.
      
        "x": 240
        // For example, `x` becomes `entity.x` on the new entity.
      ],
      
      "filters": {
      // Filters are only used by top level entities loaded by the scene and are not used by the entity directly. They determine whether an entity should be loaded on a particular browser according to browser settings.
      
        "includes": ["touch"],
        // Optional. This filter specifies that this entity should be loaded on browsers/devices that support a touch interface. More than one setting can be added to the array.

        "excludes": ["multitouch"]
        // Optional. This filter specifies that this entity should not be loaded on browsers/devices that do not support a multitouch interface. More than one setting can be added to the array.
      }
    }
*/
platformer.classes.entity = (function(){
	var entity = function (definition, instanceDefinition){
		var self             = this,
		index                = undefined,
		componentDefinition  = undefined,
		def                  = definition || {},
		componentDefinitions = def.components || [],
		defaultProperties    = def.properties || {},
		instance             = instanceDefinition || {},
		instanceProperties   = instance.properties || {};
		
		self.components = [];
		self.messages   = [];
		self.loopCheck  = [];
		self.type = def.id;

		for (index in defaultProperties){ // This takes the list of properties in the JSON definition and appends them directly to the object.
			self[index] = defaultProperties[index];
		}
		for (index in instanceProperties){ // This takes the list of options for this particular instance and appends them directly to the object.
			self[index] = instanceProperties[index];
		}
		
		if(!self.state){
			self.state = {}; //starts with no state information. This expands with boolean value properties entered by various logic components.
		}
		self.lastState = {}; //This is used to determine if the state of the entity has changed.
		
		for (index in componentDefinitions){
			componentDefinition = componentDefinitions[index];
			if(platformer.components[componentDefinition.type]){
				self.addComponent(new platformer.components[componentDefinition.type](self, componentDefinition));
			} else {
				console.warn("Component '" + componentDefinition.type + "' is not defined.", componentDefinition);
			}
		}
		
		self.trigger('load');
	};
	var proto = entity.prototype;
	
	proto.toString = function(){
		return "[entity " + this.type + "]";
	};
	
	proto.addComponent = function(component){
	    this.components.push(component);
	    return component;
	};
	
	proto.removeComponent = function(component){
	    for (var index in this.components){
		    if(this.components[index] === component){
		    	this.components.splice(index, 1);
		    	component.destroy();
			    return component;
		    }
	    }
	    return false;
	};
	
	proto.bind = function(event, func){
		if(!this.messages[event]) this.messages[event] = [];
		this.messages[event].push(func);
	};
	
	proto.unbind = function(event, func){
		if(!this.messages[event]) this.messages[event] = [];
		for (var x in this.messages[event]){
			if(this.messages[event][x] === func){
				this.messages[event].splice(x,1);
				break;
			}
		}
	};
	
	// This handles multiple event structures: "", [], and {}
	proto.trigger = function(events, message, debug){
		var i = 0, count = 0;
		
		if(typeof events === 'string') {
			return this.triggerEvent(events, message, debug);
		} else if (events.length) {
			for (; i < events.length; i++){
				count += this.trigger(events[i], message, debug);
			}
			return count;
		} else if (events.event) {
			return this.triggerEvent(events.event, events.message || message, debug);
		} else {
			console.warn('Event incorrectly formatted: must be string, array, or object containing an "event" property.');
			return 0;
		}
	};
	
	// This handles string events only
	proto.triggerEvent = function(event, value, debug){
		var i = 0;
		if(this.debug || debug || (value && value.debug)){
			if(this.messages[event] && this.messages[event].length){
				console.log('Entity "' + this.type + '": Event "' + event + '" has ' + this.messages[event].length + ' subscriber' + ((this.messages[event].length>1)?'s':'') + '.', value);
			} else {
				console.warn('Entity "' + this.type + '": Event "' + event + '" has no subscribers.', value);
			}
		}
		for (i = 0; i < this.loopCheck.length; i++){
			if(this.loopCheck[i] === event){
				throw "Endless loop detected for '" + event + "'.";
			}
		}
		i = 0;
		this.loopCheck.push(event);
		if(this.messages[event]){
			for (i = 0; i < this.messages[event].length; i++){
				this.messages[event][i](value, debug);
			}
		}
		this.loopCheck.length = this.loopCheck.length - 1; 
		return i;
	};
	
	proto.getMessageIds = function(){
		var events = [];
		for (var event in this.messages){
			events.push(event);
		}
		return events;
	};
	
	proto.destroy = function(){
		for (var x in this.components) {
			this.components[x].destroy();
		}
		this.components.length = 0;
	};
	
	return entity;
})();


/*--------------------------------------------------
 *   Scene - ../engine/scene.js
 */
/**
# CLASS scene
This class is instantiated by [[Game]] and contains one or more entities as layers. Each layer [[Entity]] handles a unique aspect of the scene. For example, one layer might contain the game world, while another layer contains the game interface. Generally there is only a single scene loaded at any given moment.

## Messages

### Child Broadcasts:
- **[Messages specified in definition]** - Listens for messages and on receiving them, re-triggers them on each entity layer.
  > @param message (object) - sends the message object received by the original message.

## Methods
- **[constructor]** - Creates an object from the scene class and passes in a scene definition containing a list of layers to load and a DOM element where the scene will take place.
  > @param definition (object) - Base definition for the scene, including one or more layers with both properties, filters, and components as shown below under "JSON definition".
  > @param rootElement (DOM element) - DOM element where scene displays layers.
  > @return scene - returns the new scene composed of the provided layers.
- **trigger** - This method is used by external objects to trigger messages on the layers as well as internal entities broadcasting messages across the scope of the scene.
  > @param messageId (string) - This is the message to process.
  > @param value (variant) - This is a message object or other value to pass along to component functions.
- **destroy** - This method destroys all the layers in the scene.

## JSON Definition:
    {
      "layers":[
      // Required array listing the entities that should be loaded as scene layers. These can be actual entity JSON definitions as shown in [[Entity]] or references to entities by using the following specification.

        {
          "type": "entity-id",
          // This value maps to an entity definition with a matching "id" value as shown in [[Entity]] and will load that definition.
          
          "properties":{"x": 400}
          // Optional. If properties are passed in this reference, they override the entity definition's properties of the same name.
        }
      ]
    }
*/
platformer.classes.scene = (function(){
	var scene = function(definition, rootElement){
		var layers = definition.layers,
		supportedLayer = true,
		layerDefinition = false,
		properties = false,
		messages = null;
		
		this.storedMessages = [];
		
		this.rootElement = rootElement;
		this.layers = [];
		for(var layer in layers){
			layerDefinition = layers[layer];
			properties = {rootElement: this.rootElement, parent: this};
			if (layerDefinition.properties){
				for(i in layerDefinition.properties){
					properties[i] = layerDefinition.properties[i];
				}
			}

			if(layerDefinition.type){ // this layer should be loaded from an entity definition rather than this instance
				layerDefinition = platformer.settings.entities[layerDefinition.type];
			}
			
			supportedLayer = true;
			if(layerDefinition.filter){
				if(layerDefinition.filter.includes){
					supportedLayer = false;
					for(var filter in layerDefinition.filter.includes){
						if(platformer.settings.supports[layerDefinition.filter.includes[filter]]){
							supportedLayer = true;
						}
					}
				}
				if(layerDefinition.filter.excludes){
					for(var filter in layerDefinition.filter.excludes){
						if(platformer.settings.supports[layerDefinition.filter.excludes[filter]]){
							supportedLayer = false;
						}
					}
				}
			}
			if (supportedLayer){
				this.layers.push(new platformer.classes.entity(layerDefinition, {
					properties: properties
				}));
			}
		}
		// This allows the layer to gather messages that are triggered as it is loading and deliver them to all the layers once all the layers are in place.
		messages = this.storedMessages;
		this.storedMessages = false;
		for(var i = 0; i < messages.length; i++){
			this.trigger(messages[i].message, messages[i].value);
		}
		messages.length = 0;
		
		this.time = new Date().getTime();
		this.timeElapsed = {
			name: '',
			time: 0
		};
	};
	var proto = scene.prototype;
	
	proto.trigger = function(eventId, event){
		var time = 0;
		
		if(this.storedMessages){
			this.storedMessages.push({
				message: eventId,
				value: event
			});
		} else {
			if(eventId === 'tick'){
				time = new Date().getTime();
				this.timeElapsed.name = 'Non-Engine';
				this.timeElapsed.time = time - this.time;
				this.trigger('time-elapsed', this.timeElapsed);
				this.time = time;
			}
			for(var layer in this.layers){
				this.layers[layer].trigger(eventId, event);
			}
			if(eventId === 'tick'){
				time = new Date().getTime();
				this.timeElapsed.name = 'Engine Total';
				this.timeElapsed.time = time - this.time;
				this.trigger('time-elapsed', this.timeElapsed);
				this.time = time;
			}
		}
	};
	
	proto.destroy = function(){
		for(var layer in this.layers){
			this.layers[layer].destroy();
		}
		this.layers.length = 0;
	};
	
	return scene;
})();


/*--------------------------------------------------
 *   Collision-Shape - ../engine/collision-shape.js
 */
/**
# CLASS collision-shape
This class defines a collision shape, which defines the 'space' an entity occupies in the collision system. Currently only rectangle shapes can be created (some code exists for right-triangles and circles, but the precise collision checking needed for these is not in place). Collision shapes include an axis-aligned bounding box (AABB) that tightly wraps the shape. The AABB is used for initial collision checks.

## Fields
- **offset** (number []) - An array of length 2 that holds the x and y offset of the collision shape from the owner entity's location.
- **x** (number) - The x position of the shape. The x is always located in the center of the object.
- **y** (number) - The y position of the shape. The y is always located in the center of the object.
- **prevX** (number) - The previous x position of the shape.
- **prevY** (number) - The previous y position of the shape.
- **type** (string) - The type of shape this is. Currently 'rectangle' is the default and only valid type.
- **subType** (string) - **Not Used** Only used for triangles, specifies which corner the right angle is in. Can be: tl, tr, bl, br.
- **points** (number [][]) - Points describing the shape. These points should describe the shape so that the center of the AABB will be at (0,0). For rectangles and circles you only need two points, a top-left and bottom-right. For triangles, you need three. The first should be the right angle, and it should proceed clockwise from there.
- **aABB** (object) - The AABB for this shape.
- **prevAABB** (object) - The previous location of the AABB for this shape.

## Methods
- **constructor** - Creates an object from the collisionShape class.
  > @param ownerLocation (number []) - An array [x,y] of the position.
  > @param type (string) - The type of shape this is. Currently 'rectangle' is the default and only valid type.
  > @param points (number [][]) - Points describing the shape. These points should describe the shape so that the center of the AABB will be at (0,0). For rectangles and circles you only need two points, a top-left and bottom-right. For triangles, you need three. The first should be the right angle, and it should proceed clockwise from there.
  > @param offset (number []) - An array of length 2 that holds the x and y offset of the shape from the owner's location.
- **update** - Updates the location of the shape and AABB. The position you send should be that of the owner, the offset of the shape is added inside the function.
  > @param ownerX (number) - The x position of the owner.
  > @param ownerY (number) - The y position of the owner.
- **reset** - Resets the location of the shape and AABBs so that the current and previous position are the same. The position you send should be that of the owner, the offset of the shape is added inside the function.
  > @param ownerX (number) - The x position of the owner.
  > @param ownerY (number) - The y position of the owner.
- **getXY** - Returns an array containing the position of the shape.
  > @return number [] - An array [x,y] of the position.
- **getX** - Returns the x position of the shape.
  > @return number - The x position.
- **getY** - Return the y position of the shape.
  > @return number - The y position.
- **getPrevXY** - Returns the previous position of the shape.
  > @return number [] - An array [x,y] of the previous position.
- **getPrevX** - Returns the previous x position of the shape.
  > @return number - The previous x position.
- **getPrevY** - Returns the previous y position of the shape.
  > @return number - The previous x position.
- **getAABB** - Returns the AABB of the shape.
  > @return AABB object - The AABB of the shape.
- **getPreviousAABB** - Returns the previous AABB of the shape.
  > @return AABB object - The previous AABB of the shape.
- **getXOffset** - Returns the x offset of the shape.
  > @return number - The x offset.
- **getYOffset** - Returns the y offset of the shape.
  > @return number - The y offset.
- **destroy** - Destroys the shape so that it can be memory collected safely.
*/

platformer.classes.collisionShape = (function(){
	var collisionShape = function(ownerLocation, type, points, offset){
		this.offset = offset || [0,0];
		this.x = ownerLocation[0] + this.offset[0];
		this.y = ownerLocation[1] + this.offset[1];
		this.prevX = this.x;
		this.prevY = this.y;
		this.type = type || 'rectangle';
		this.subType = '';
		this.points = points; //Points should distributed so that the center of the AABB is at (0,0).
		this.aABB = undefined;
		this.prevAABB = undefined;
		
		var width = 0;
		var height = 0; 
		switch (this.type)
		{
		case 'rectangle': //need TL and BR points
		case 'circle': //need TL and BR points
			width = this.points[1][0] - this.points[0][0];
			height = this.points[1][1] - this.points[0][1];
			break;
		case 'triangle': //Need three points, start with the right angle corner and go clockwise.
			if (this.points[0][1] == this.points[1][1] && this.points[0][0] == this.points[2][0])
			{
				if (this.points[0][0] < this.points[1][0])
				{
					//TOP LEFT CORNER IS RIGHT
					this.subType = 'tl';
					width = this.points[1][0] - this.points[0][0];
					height = this.points[2][1] - this.points[0][1];
				} else {
					//BOTTOM RIGHT CORNER IS RIGHT
					this.subType = 'br';
					width = this.points[0][0] - this.points[1][0];
					height = this.points[0][1] - this.points[2][1];
				}
				
			} else if (this.points[0][1] == this.points[2][1] && this.points[0][0] == this.points[1][0]) {
				if (this.points[0][1] < this.points[1][1])
				{
					//TOP RIGHT CORNER IS RIGHT
					this.subType = 'tr';
					width = this.points[0][0] - this.points[2][0];
					height = this.points[1][1] - this.points[0][1];
				} else {
					//BOTTOM LEFT CORNER IS RIGHT
					this.subType = 'bl';
					width = this.points[2][0] - this.points[0][0];
					height = this.points[0][1] - this.points[1][1];
				}
			} 
		}
		
		this.aABB     = new platformer.classes.aABB(this.x, this.y, width, height);
		this.prevAABB = new platformer.classes.aABB(this.x, this.y, width, height);
	};
	var proto = collisionShape.prototype;
	
	proto.update = function(ownerX, ownerY){
		var swap = this.prevAABB; 
		this.prevAABB = this.aABB;
		this.aABB     = swap;
		this.prevX = this.x;
		this.prevY = this.y;
		this.x = ownerX + this.offset[0];
		this.y = ownerY + this.offset[1];
		this.aABB.move(this.x, this.y);
	};
	
	proto.reset = function (ownerX, ownerY) {
		this.prevX = ownerX + this.offset[0];
		this.prevY = ownerY + this.offset[1];
		this.x = ownerX + this.offset[0];
		this.y = ownerY + this.offset[1];
		this.prevAABB.move(this.x, this.y);
		this.aABB.move(this.x, this.y);
	};
	
	proto.getXY = function () {
		return [this.x, this.y];
	};
	
	proto.getX = function () {
		return this.x;
	};
	
	proto.getY = function () {
		return this.y;
	};
	
	proto.getPrevXY = function () {
		return [this.prevX, this.prevY];
	};
	
	proto.getPrevX = function () {
		return this.prevX;
	};
	
	proto.getPrevY = function () {
		return this.prevY;
	};

	proto.getAABB = function(){
		return this.aABB;
	};
	
	proto.getPreviousAABB = function(){
		return this.prevAABB;
	};
	
	proto.getXOffset = function(){
		return this.offset[0];
	};
	
	proto.getYOffset = function(){
		return this.offset[1];
	};
	
	proto.destroy = function(){
		this.aABB = undefined;
		this.points = undefined;
	};
	
	return collisionShape;
})();


/*--------------------------------------------------
 *   AABB - ../engine/aabb.js
 */
/**
# CLASS aabb
This class defines an axis-aligned bounding box (AABB) which is used during the collision process to determine if two objects are colliding. This is used in a few places including [[Collision-Basic]] and [[Collision-Shape]].

## Fields
- **x** (number) - The x position of the AABB. The x is always located in the center of the object.
- **y** (number) - The y position of the AABB. The y is always located in the center of the object.
- **width** (number) - The width of the AABB.
- **height** (number) - The height of the AABB.
- **halfWidth** (number) - Half the width of the AABB.
- **halfHeight** (number) - Half the height of the AABB.
- **left** (number) - The x-position of the left edge of the AABB.
- **right** (number) - The x-position of the right edge of the AABB.
- **top** (number) - The y-position of the top edge of the AABB.
- **bottom** (number) - The y-position of the bottom edge of the AABB.


## Methods
- **constructor** - Creates an object from the aabb class.
  > @param x (number) - The x position of the AABB. The x is always located in the center of the object.
  > @param y (number) - The y position of the AABB. The y is always located in the center of the object.
  > @param width (number) - The width of the AABB.
  > @param height (number) - The height of the AABB.
  > @return aabb (object) - Returns the new aabb object.
- **setAll** - Sets all of the fields in the AABB.
  > @param x (number) - The x position of the AABB. The x is always located in the center of the object.
  > @param y (number) - The y position of the AABB. The y is always located in the center of the object.
  > @param width (number) - The width of the AABB.
  > @param height (number) - The height of the AABB.
- **reset** - Resets all the values in the AABB so that the AABB can be reused.
- **include** - Changes the size and position of the bounding box so that it contains the current area and the area described in the incoming AABB.
  > @param aabb (object) - The AABB who's area will be included in the area of the current AABB.
- **move** - Moves the AABB to the specified location.
  > @param x (number) - The new x position of the AABB.
  > @param y (number) - The new y position of the AABB.
- **getCopy** - Creates a new AABB with the same fields as this object.
  > @return aabb (object) - Returns the new AABB object.
*/

platformer.classes.aABB = (function(){
	var aABB = function(x, y, width, height){
		this.empty = true;
		this.setAll(x, y, width, height);
	};
	var proto = aABB.prototype;
	
	proto.setAll = function(x, y, width, height){
		this.empty = false;
		this.x = x;
		this.y = y;
		this.width  = width || 0;
		this.height = height || 0;
		this.halfWidth = this.width / 2;
		this.halfHeight = this.height / 2;
		if(typeof x === 'undefined'){
			this.empty = true;
		} else {
			this.left = -this.halfWidth + this.x;
			this.right = this.halfWidth + this.x;
		}
		if(typeof y === 'undefined'){
			this.empty = true;
		} else {
			this.top = -this.halfHeight + this.y;
			this.bottom = this.halfHeight + this.y;
		}
		return this;
	};
	
	proto.set = function(aabb){
		this.empty = false;
		this.x = aabb.x;
		this.y = aabb.y;
		this.width  = aabb.width;
		this.height = aabb.height;
		this.halfWidth = aabb.halfWidth;
		this.halfHeight = aabb.halfHeight;
		this.left = aabb.left;
		this.right = aabb.right;
		this.top = aabb.top;
		this.bottom = aabb.bottom;
		return this;
	};
	
	proto.reset = function(){
		this.empty = true;
		return this;
	};
	
	proto.include = function(aabb){
		if(this.empty){
			this.setAll(aabb.x, aabb.y, aabb.width, aabb.height);
		} else {
			if(this.left > aabb.left){
				this.left = aabb.left;
			}
			if(this.right < aabb.right){
				this.right = aabb.right;
			}
			if(this.top > aabb.top){
				this.top = aabb.top;
			}
			if(this.bottom < aabb.bottom){
				this.bottom = aabb.bottom;
			}
			
			this.width      = this.right  - this.left;
			this.height     = this.bottom - this.top;
			this.halfWidth  = this.width / 2;
			this.halfHeight = this.height / 2;
			this.x          = this.left + this.halfWidth;
			this.y          = this.top  + this.halfHeight;
		}
	};
	
	proto.move = function(x, y){
		this.moveX(x);
		this.moveY(y);
		return this;
	};

	proto.moveX = function(x){
		this.x = x;
		this.left   = -this.halfWidth + this.x;
		this.right  = this.halfWidth + this.x;
		return this;
	};

	proto.moveY = function(y){
		this.y = y;
		this.top    = -this.halfHeight + this.y;
		this.bottom = this.halfHeight + this.y;
		return this;
	};

	proto.getCopy = function(){
		return new aABB(this.x, this.y, this.width, this.height);
	};

	proto.matches = function(x, y, width, height){
		return !((this.x !== x) || (this.y !== y) || (this.width !== width) || (this.height !== height));
	};

	proto.contains = function(aabb){
		return !((aabb.top < this.top) || (aabb.bottom > this.bottom) || (aabb.left < this.left) || (aabb.right > this.right));
	};
	
	proto.intersects = function(aabb){
		return !((aabb.bottom < this.top) || (aabb.top > this.bottom) || (aabb.right < this.left) || (aabb.left > this.right));
	};
	
	return aABB;
})();

platformer.components = {};

/*--------------------------------------------------
 *   asset-loader - ../engine/components/asset-loader.js
 */
/**
# COMPONENT **asset-loader**
This component loads a list of assets, wrapping PreloadJS functionality into a game engine component. Settings and files are pulled from the information provided in config.js, with the expectation that this component will exist on the initial loading screen.

## Dependencies
- [[PreloadJS]] - Requires the PreloadJS library to load a list of assets.

## Messages

### Listens for:
- **load** - On receiving this event, the asset loader begins downloading the list of assets.

### Local Broadcasts:
- **fileload** - This message is broadcast when an asset has been loaded.
  > @param complete (Boolean) - Whether this is the final asset to be loaded.
  > @param total (Number) - The total number of assets being loaded.
  > @param progress (Number) - The number of assets finished loading.
  > @param fraction (Number) - Value of (progress / total) provided for convenience.
- **complete** - This message is triggered when the asset loader is finished loading assets.

## JSON Definition
    {
      "type": "asset-loader",
      
      "useXHR": true
      // Whether to use XHR for asset downloading. The default is `true`.
    }
*/
(function(){
	return platformer.createComponentClass({
		id: 'asset-loader',
		
		constructor: function(definition){
			this.useXHR = true;

			if(definition.useXHR === false){
				this.useXHR = false;
			}
			
			this.message = {
				complete: false,
				total: 0,
				progress: 0,
				fraction: 0
			};
		},

		events: {// These are messages that this component listens for
		    "load": function(){
		    	var self = this,
		    	checkPush = function(asset, list){
		    		var i = 0,
		    		found = false;
		    		for(i in list){
		    			if(list[i].id === asset.id){
		    				found = true;
		    				break;
		    			}
		    		}
		    		if(!found){
		    			list.push(asset);
		    		}
		    	},
		    	loader     = new createjs.LoadQueue(this.useXHR),
		    	loadAssets = [],
		    	optimizeImages = platformer.settings.global.nativeAssetResolution || 0, //assets designed for this resolution
		    	scale = platformer.settings.scale = optimizeImages?Math.min(1, Math.max(window.screen.width, window.screen.height) * (window.devicePixelRatio || 1) / optimizeImages):1,
//		    	scale = platformer.settings.scale = optimizeImages?Math.min(1, Math.max(window.innerWidth, window.innerHeight) * window.devicePixelRatio / optimizeImages):1,
		    	scaleImage = function(img, columns, rows){
		    		var r          = rows    || 1,
		    		c              = columns || 1,
		    		imgWidth       = Math.ceil((img.width  / c) * scale) * c,
		    		imgHeight      = Math.ceil((img.height / r) * scale) * r,
		    		element        = document.createElement('canvas'),
		    		ctx            = element.getContext('2d');
		    		element.width  = imgWidth;
		    		element.height = imgHeight;
		    		element.scaleX = imgWidth  / img.width;
		    		element.scaleY = imgHeight / img.height;
		    		ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, imgWidth, imgHeight);
		    		return element;
		    	};
		    	
		    	loader.addEventListener('fileload', function (event) {
		    		var item = event.item,
		    		data     = item.data,
		    		result   = item.tag;
		    		
		    		if(event.item.type == "image"){
		    			if(optimizeImages && (scale !== 1)){
		    				if(data){
		    					result = scaleImage(result, data.columns, data.rows);
		    				} else {
		    					result = scaleImage(result);
		    				}
		    			}
		    		}
		    		
		    		platformer.assets[event.item.id] = result;
		    		
		    		self.message.progress += 1;
		    		self.message.fraction = self.message.progress/self.message.total;
		    		if(self.message.progress === self.message.total){
		    			self.message.complete = true;
		    		}
	    			self.owner.trigger('fileload', self.message);
		    	});
		    	
		    	loader.addEventListener('complete', function (event) {
	    			self.owner.trigger('complete');
		    	});
		    	
		    	for(var i in platformer.settings.assets){
		    		if(typeof platformer.settings.assets[i].src === 'string'){
		    			checkPush(platformer.settings.assets[i], loadAssets);
		    		} else {
		    			for(var j in platformer.settings.assets[i].src){
		    				if(platformer.settings.aspects[j] && platformer.settings.assets[i].src[j]){
		    					if(typeof platformer.settings.assets[i].src[j] === 'string'){
		    						platformer.settings.assets[i].src  = platformer.settings.assets[i].src[j];
		    						checkPush(platformer.settings.assets[i], loadAssets);
		    					} else {
		    						platformer.settings.assets[i].data    = platformer.settings.assets[i].src[j].data || platformer.settings.assets[i].data;
		    						platformer.settings.assets[i].assetId = platformer.settings.assets[i].src[j].assetId;
		    						platformer.settings.assets[i].src     = platformer.settings.assets[i].src[j].src;
		    						checkPush({
		    							id:  platformer.settings.assets[i].assetId || platformer.settings.assets[i].id,
		    							src: platformer.settings.assets[i].src
		    						}, loadAssets);
		    					}
		    					break;
		    				}
		    			}
		    			if(typeof platformer.settings.assets[i].src !== 'string'){
		    				if(platformer.settings.assets[i].src['default']){
		    					if(typeof platformer.settings.assets[i].src['default'] === 'string'){
		    						platformer.settings.assets[i].src  = platformer.settings.assets[i].src['default'];
		    						checkPush(platformer.settings.assets[i], loadAssets);
		    					} else {
		    						platformer.settings.assets[i].data    = platformer.settings.assets[i].src['default'].data || platformer.settings.assets[i].data;
		    						platformer.settings.assets[i].assetId = platformer.settings.assets[i].src['default'].assetId;
		    						platformer.settings.assets[i].src     = platformer.settings.assets[i].src['default'].src;
		    						checkPush({
		    							id:  platformer.settings.assets[i].assetId || platformer.settings.assets[i].id,
		    							src: platformer.settings.assets[i].src
		    						}, loadAssets);
		    					}
		    				} else {
		    					console.warn('Asset has no valid source for this browser.', platformer.settings.assets[i]);
		    				}
		    			}
		    		}
		    	}

		    	// Allow iOS 5- to play HTML5 audio using SoundJS by overriding the isSupported check. (Otherwise there is no audio support for iOS 5-.)
		    	createjs.HTMLAudioPlugin.isSupported = function () {
		    		createjs.HTMLAudioPlugin.generateCapabilities();
		    		var t = createjs.HTMLAudioPlugin.tag;
		    		if (t == null || createjs.HTMLAudioPlugin.capabilities == null) {
		    			return false;
		    		}
		    		return true;
		    	};
//		    	createjs.Sound.initializeDefaultPlugins();
		    	createjs.Sound.registerPlugins([createjs.HTMLAudioPlugin]);

		    	self.message.total = loadAssets.length;
		    	loader.installPlugin(createjs.Sound);
		    	loader.loadManifest(loadAssets);
		    	platformer.assets = [];
		    }
		}
		
	});
})();


/*--------------------------------------------------
 *   enable-ios-audio - ../engine/components/enable-ios-audio.js
 */
/**
# COMPONENT **enable-ios-audio**
This component enables JavaScript-triggered audio play-back on iOS devices by overlaying an invisible `div` across the game area that, when touched, causes the audio track to play, giving it necessary permissions for further programmatic play-back. Once touched, it removes itself as a component from the entity as well as removes the layer `div` DOM element.

## Dependencies:
- [createjs.SoundJS] [link1] - This component requires the SoundJS library to be included for audio functionality.
- **rootElement** property (on entity) - This component requires a DOM element which it uses to overlay the touchable audio-instantiation layer `div`.

## JSON Definition:
    {
      "type": "enable-ios-audio",
      
      "audioId": "combined"
      // Required. The SoundJS audio id for the audio clip to be enabled for future play-back.
    }

[link1]: http://www.createjs.com/Docs/SoundJS/module_SoundJS.html
*/
platformer.components['enable-ios-audio'] = (function(){
	var iOSAudioEnabled = false,
//	console = {log:function(txt){document.title += txt;}},
	component = function(owner, definition){
		var self = this;
		this.owner = owner;
		
		if(!iOSAudioEnabled){
			this.touchOverlay = document.createElement('div');
			this.touchOverlay.style.width    = '100%';
			this.touchOverlay.style.height   = '100%';
			this.touchOverlay.style.position = 'absolute';
			this.touchOverlay.style.zIndex   = '20';
			this.owner.rootElement.appendChild(this.touchOverlay);
			enableIOSAudio(this.touchOverlay, definition.audioId, function(){
				self.removeComponent();
			});
		} else {
			this.removeComponent();
		}
	},
	enableIOSAudio  = function(element, audioId, functionCallback){
		var callback = false,
	    click        = false;
		
//		document.title = '';
		iOSAudioEnabled = true;
		click = function(e){
			var audio = createjs.Sound.play(audioId),
			forceStop = function () {
			    audio.removeEventListener('succeeded', forceStop);
			    audio.pause();
//			    console.log('g');
			},
			progress  = function () {
			    audio.removeEventListener('ready', progress);
//			    console.log('h');
			    if (callback) callback();
			};
//		    console.log('a');
			
			if(audio.playState !== 'playFailed'){
//			    console.log('b(' + audio.playState + ')');
				audio.stop();
			} else {
//			    console.log('c(' + audio.playState + ')');
				audio.addEventListener('succeeded', forceStop);
			    audio.addEventListener('ready', progress);

			    try {
					audio.play();
//				    console.log('d(' + audio.playState + ')');
			    } catch (e) {
//				    console.log('e');
			    	callback = function () {
					    console.log('i');
			    		callback = false;
			    		audio.play();
			    	};
			    }
			}
			element.removeEventListener('touchstart', click, false);
			if(functionCallback){
//			    console.log('f');
				functionCallback();
			}
		};
		element.addEventListener('touchstart', click, false);
	},
	proto = component.prototype;
	
	proto.removeComponent = function(){
		this.owner.removeComponent(this);
	};
	
	proto.destroy = function(){
		if(this.touchOverlay){
			this.owner.rootElement.removeChild(this.touchOverlay);
		}
		this.touchOverlay = undefined;
	};
	
	return component;
})();


/*--------------------------------------------------
 *   handler-controller - ../engine/components/handler-controller.js
 */
/**
# COMPONENT **handler-controller**
This component handles capturing and relaying input information to the entities that care about it. It takes mouse, keyboard, and custom input messages. State messages are sent immediately to the entities when they are received, the 'handler-controller' message is sent to demarcate ticks.

## Dependencies
- **Needs a 'tick' or 'check-inputs' call** - This component doesn't need a specific component, but it does require a 'tick' or 'check-inputs' call to function. It's usually used as a component of an action-layer.

## Messages

### Listens for:
- **child-entity-added** - Called when a new entity has been added and should be considered for addition to the handler. If the entity has a 'handle-controller' message id it's added to the list of entities. Once an entity is added to the handler-controller 'controller-load' is called on the entity. If an entity has a control map that includes non-keyboard inputs, we add listeners for those and update functions to alert the entity when they happen. 
  > @param entity (Object) - The entity that is being considered for addition to the handler.
- **tick, check-inputs** - Sends a 'handle-controller' message to all the entities the component is handling. If an entity does not handle the message, it's removed it from the entity list.
  > @param resp (object) - An object containing deltaT which is the time passed since the last tick. 
- **keydown** - Sends a message to the handled entities 'key:' + the key id + ":down". 
  > @param event (DOM event) - The DOM event that triggered the keydown event. 
 - **keyup** - Sends a message to the handled entities 'key:' + the key id + ":up".
  > @param event (DOM event) - The DOM event that triggered the keyup event. 

### Child Broadcasts:
- **handle-controller** - Sent to entities on each tick to handle whatever they need to regarding controls.
  > @param resp (object) - An object containing a deltaT variable that is the time that's passed since the last tick.
- **controller-load** - Sent to entities when they are added to the handler-controller.
- **key:keyid:up** - Message sent to an entity when a key goes from down to up.
  > @param event (DOM event) - The DOM event that triggered the keyup event. 
- **key:keyid:down** - Message sent to an entity when a key goes from up to down.
  > @param event (DOM event) - The DOM event that triggered the keydown event. 
- **custom:up and custom:down messages** - Messages created when an entity has a control map with non-keyboard input. The handler creates these message when it adds the entity and then fires them on the entity when the input is received.
  > @param value (object) - A message object sent by the custom message.

## JSON Definition
    {
      "type": "handler-controller",
    }
*/

platformer.components['handler-controller'] = (function(){
	var relayUpDown = function(event, self){
		return function(value){
			if (value.released){
				event += ':up';
			} else if (value.pressed){
				event += ':down';
			}
			for (var x = 0; x < self.entities.length; x++) {
				self.entities[x].trigger(event, value);
			}
		}; 
	};
	var relay = function(event, self){
		return function(value){
			for (var x = 0; x < self.entities.length; x++) {
				self.entities[x].trigger(event, value);
			}
		}; 
	};
	
	var keyMap = { //Note: if this list is changed, be sure to update https://git.pbs.org/html5-platformer-engine/pages/Handler-Controller-Key-List
		kc0:   'unknown',         
		kc8:   'backspace',
		kc9:   'tab',
		kc12:  'numpad-5-shift',
		kc13:  'enter',
		kc16:  'shift',
		kc17:  'ctrl',
		kc18:  'alt',
		kc19:  'pause',
		kc20:  'caps-lock',
		kc27:  'esc',
		kc32:  'space',
		kc33:  'page-up',
		kc34:  'page-down',
		kc35:  'end',
		kc36:  'home',
		kc37:  'left-arrow',
		kc38:  'up-arrow',
		kc39:  'right-arrow',
		kc40:  'down-arrow',
		kc42:  'numpad-multiply',
		kc43:  'numpad-add',
		kc44:  'print-screen',
		kc45:  'insert',
		kc46:  'delete',
		kc47:  'numpad-division',
		kc48:  '0',
		kc49:  '1',
		kc50:  '2',
		kc51:  '3',
		kc52:  '4',
		kc53:  '5',
		kc54:  '6',
		kc55:  '7',
		kc56:  '8',
		kc57:  '9',
		kc59:  'semicolon',
		kc61:  'equals',
		kc65:  'a',
		kc66:  'b',
		kc67:  'c',
		kc68:  'd',
		kc69:  'e',
		kc70:  'f',
		kc71:  'g',
		kc72:  'h',
		kc73:  'i',
		kc74:  'j',
		kc75:  'k',
		kc76:  'l',
		kc77:  'm',
		kc78:  'n',
		kc79:  'o',
		kc80:  'p',
		kc81:  'q',
		kc82:  'r',
		kc83:  's',
		kc84:  't',
		kc85:  'u',
		kc86:  'v',
		kc87:  'w',
		kc88:  'x',
		kc89:  'y',
		kc90:  'z',
		kc91:  'left-windows-start',
		kc92:  'right-windows-start',
		kc93:  'windows-menu',
		kc96:  'back-quote',
		kc106: 'numpad-multiply',
		kc107: 'numpad-add',
		kc109: 'numpad-minus',
		kc110: 'numpad-period',
		kc111: 'numpad-division',
		kc112: 'f1',
		kc113: 'f2',
		kc114: 'f3',
		kc115: 'f4',
		kc116: 'f5',
		kc117: 'f6',
		kc118: 'f7',
		kc119: 'f8',
		kc120: 'f9',
		kc121: 'f10',
		kc122: 'f11',
		kc123: 'f12',
		kc144: 'num-lock',
		kc145: 'scroll-lock',
		kc186: 'semicolon',
		kc187: 'equals',
		kc188: 'comma',
		kc189: 'hyphen',
		kc190: 'period',
		kc191: 'forward-slash',
		kc192: 'back-quote',
		kc219: 'open-bracket',
		kc220: 'back-slash',
		kc221: 'close-bracket',
		kc222: 'quote'
	};
	var component = function(owner, definition){
		this.owner = owner;
		this.entities = [];
		
		// Messages that this component listens for
		this.listeners = [];
		
		this.addListeners(['tick', 'child-entity-added', 'child-entity-updated', 'check-inputs', 'keydown', 'keyup']);
		
		this.timeElapsed = {
				name: 'Controller',
				time: 0
			};
	};
	var proto = component.prototype; 

	proto['keydown'] = function(event){
		for (var x = 0; x < this.entities.length; x++)
		{
			this.entities[x].trigger('key:' + (keyMap['kc' + event.keyCode] || ('key-code-' + event.keyCode)) + ':down', event);
		}
	}; 
	
	proto['keyup'] = function(event){
		for (var x = 0; x < this.entities.length; x++)
		{
			this.entities[x].trigger('key:' + (keyMap['kc' + event.keyCode] || ('key-code-' + event.keyCode)) + ':up', event);
		}
	};
	
	proto['tick'] = proto['check-inputs'] = function(resp){
		var time    = new Date().getTime();

		for (var x = this.entities.length - 1; x > -1; x--)
		{
			if(!this.entities[x].trigger('handle-controller', resp)) {
				this.entities.splice(x, 1);
			}
		}
		
		this.timeElapsed.time = new Date().getTime() - time;
		platformer.game.currentScene.trigger('time-elapsed', this.timeElapsed);
	};

	proto['child-entity-added'] = proto['child-entity-updated'] = function(entity){
		var messageIds = entity.getMessageIds(),
		alreadyHere = false; 
		
		for (var x = 0; x < messageIds.length; x++){
			if (messageIds[x] == 'handle-controller'){
				for (var j = 0; j < this.entities.length; j++){
					if(this.entities[j] == entity){
						alreadyHere = true;
						break;
					}
				}
				
				if(!alreadyHere){
					// Check for custom input messages that should be relayed from scene.
					if(entity.controlMap){
						for(var y in entity.controlMap){
							if((y.indexOf('key:') < 0) && (y.indexOf('mouse:') < 0)){
								if(!this[y]){
									this.addListeners([y, y + ':up', y + ':down']);
									this[y]           = relayUpDown(y,     this);
									this[y + ':up']   = relay(y + ':up',   this);
									this[y + ':down'] = relay(y + ':down', this);
								}
							}
						}
					}
					
					this.entities.push(entity);
					entity.trigger('controller-load');
				}
				break;
			}
		}
	};

	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
		this.entities.length = 0;
		this.owner = undefined;
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/
	
	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   tiled-loader - ../engine/components/tiled-loader.js
 */
/**
# COMPONENT **tiled-loader**
This component is attached to a top-level entity (loaded by the [[Scene]]) and, once its peer components are loaded, ingests a JSON file exported from the [Tiled map editor] [link1] and creates the tile maps and entities. Once it has finished loading the map, it removes itself from the list of components on the entity.

## Dependencies:
- Component [[Entity-Container]] (on entity's parent) - This component uses `entity.addEntity()` on the entity, provided by `entity-container`.
- Entity **collision-layer** - Used to create map entities corresponding with Tiled collision layers.
- Entity **render-layer** - Used to create map entities corresponding with Tiled render layers.
- Entity **tile-layer** - Used to create map entities corresponding with Tiled collision and render layers.

## Messages

### Listens for:
- **scene-loaded** - On receiving this message, the component commences loading the Tiled map JSON definition. Once finished, it removes itself from the entity's list of components.

### Local Broadcasts:
- **world-loaded** - Once finished loading the map, this message is triggered on the entity to notify other components of completion.
  > @param message.width (number) - The width of the world in world units.
  > @param message.height (number) - The height of the world in world units.
  > @param message.camera ([[Entity]]) - If a camera property is found on one of the loaded entities, this property will point to the entity on load that a world camera should focus on.

## JSON Definition:
    {
      "type": "tiled-loader",
      
      "level": "level-4",
      // Required. Specifies the JSON level to load. This may also be an array of strings to load level sections in sequence (horizontally). Be aware that the Tiled maps must use the same tilesets and have the same height for this to function correctly.
      
      "unitsPerPixel": 10,
      // Optional. Sets how many world units in width and height correspond to a single pixel in the Tiled map. Default is 1: One pixel is one world unit.
      
      "images": ["spritesheet-1", "spritesheet-2"],
      // Optional. If specified, the referenced images are used as the game spritesheets instead of the images referenced in the Tiled map. This is useful for using different or better quality art from the art used in creating the Tiled map.
      
      "imagesScale": 5,
      // Optional. If images are set above, this property sets the scale of the art relative to world coordinates. Defaults to the value set in "unitsPerPixel".
      
      "zStep": 500,
      // Optional. Adds step number to each additional Tiled layer to maintain z-order. Defaults to 1000.
      
      "separateTiles": true,
      // Optional. Keeps the tile maps in separate render layers. Default is 'false' to for better optimization.
      
      "entityPositionX": "center",
      // Optional. Can be "left", "right", or "center". Defines where entities registered X position should be when spawned. Default is "center".

      "entityPositionY": "center"
      // Optional. Can be "top", "bottom", or "center". Defines where entities registered Y position should be when spawned. Default is "bottom".
    }

[link1]: http://www.mapeditor.org/
*/
(function(){
	var numSort = function(a,b){return a - b;},
	shuffle = function(o){
	    for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	    return o;
	},
	mergeData = function(data1, oldWidth, data2, width, height){
		var x = 0,
		y     = 0,
		combined = data1.slice();
		
		for (y=height-1; y >= 0; y--) {
			for (x=y*width, z=0; x < (y+1)*width; x++, z++){
				combined.splice(((y+1)*oldWidth) + z, 0, data2[x]);
			}
		}
		
		return combined;
	},
	mergeObjects  = function(obj1s, width, obj2s){
		var i = 0,
		list  = obj1s.slice(),
		obj   = null;
		
		for (; i < obj2s.length; i++){
			obj = {};
			for (j in obj2s[i]){
				obj[j] = obj2s[i][j];
			}
			obj.x += width;
			list.push(obj);
		}
		
		return list;
	},
	mergeSegment  = function(segment, level){
		var i = 0,
		j     = 0;

		level.height     = segment.height;
		level.tilewidth  = segment.tilewidth;
		level.tileheight = segment.tileheight;
		for (; i < segment.layers.length; i++){
			if (!level.layers[i]){
				level.layers[i] = {};
				for (j in segment.layers[i]){
					level.layers[i][j] = segment.layers[i][j];
				}
			} else {
				if(level.layers[i].data && segment.layers[i].data) {
					level.layers[i].data = mergeData(level.layers[i].data, level.width, segment.layers[i].data, segment.width, level.height);
					level.layers[i].width += segment.width;
				} else if (level.layers[i].objects && segment.layers[i].objects) {
					level.layers[i].objects = mergeObjects(level.layers[i].objects, level.width * level.tilewidth, segment.layers[i].objects);
				}
			}
		}
		level.width += segment.width;
		for(i in segment){
			if(!level[i]){
				level[i] = segment[i];
			}
		}
	},
	calculateGroups = function(level){
		var i    = 0,
		j        = 0,
		k        = 0,
		min      = 0,
		max      = 0,
		multiplier = 0,
		skill    = 0,
		endThis  = false,
		lastInt  = 0,
		copy     = null,
		copySk   = null,
		groups   = [],
		choices  = level.choose,
		length   = level.sections.length,
		remove   = length - choices,
		removals = [];

		for(j = 0; j < remove; j++){
			removals[j] = +j;
		}
		
		if(level.skills){
			copy = level.skills.slice().sort(numSort);
			min = 0;
			for(j = 0; j < choices; j++){
				min += copy[j];
			}
			max = 0;
			for(j = 1; j <= choices; j++){
				max += copy[length - j];
			}
			multiplier = (1 / (max - min));
		}
		
		while (!endThis) {
			copy = level.sections.slice();
			copySk = level.skills.slice();
			skill = 0;
			for(j = remove - 1; j >= 0; j--){
				copy.splice(removals[j], 1);
				copySk.splice(removals[j], 1);
			}
			for(j = 0; j < copySk.length; j++){
				skill += copySk[j];
			}
			groups.push({
				levels: copy,
				skill: (skill - min) * multiplier
			});
			
			endThis = true;
			lastInt = length;
			for(j = remove - 1; j >= 0; j--){
				if(removals[j] !== lastInt - 1){
					removals[j] += 1;
					endThis = false;
					k = 0;
					for (i = j + 1; i < remove; i++){
						k += 1;
						removals[i] = removals[j] + k;
					}
					break;
				} else {
					lastInt = removals[j];
				}
			}
		}
		
		return groups;
	},
	mergeLevels   = function(levels, skill){
		var i  = 0,
		j      = 0,
		levelDefinitions = platformer.settings.levels,
		level  = {
			height: 0,
			width:  0,
			layers: []
		},
		groups = null,
		group = null,
		abs = Math.abs;
		
		for (; i < levels.length; i++){
			if(typeof levels[i] === 'string') {
				mergeSegment(levelDefinitions[levels[i]], level);
			} else {
				if(!levels[i].calculatedGroups){
					levels[i].calculatedGroups = calculateGroups(levels[i]);
				}
				groups = levels[i].calculatedGroups.slice().sort(function(a,b){
					return abs(skill - a.skill) - abs(skill - b.skill);
				});
					
				group = groups[Math.floor(Math.random() * groups.length / 3)]; //3 is arbitrary at the moment.
				
				shuffle(group.levels);
				for (j = 0; j < group.levels.length; j++) {
					mergeSegment(levelDefinitions[group.levels[j]], level);
				}
			}
		}
		return level;
	};
	
	return platformer.createComponentClass({
		id: 'tiled-loader',
		
		constructor: function(definition){
			this.entities     = [];
			this.layerZ       = 0;
			this.followEntity = false;

			this.level = this.owner.level || definition.level;

			this.unitsPerPixel = this.owner.unitsPerPixel || definition.unitsPerPixel || 1;
			this.images        = this.owner.images        || definition.images        || false;
			this.imagesScale   = this.owner.imagesScale   || definition.imagesScale   || this.unitsPerPixel;
			this.layerZStep    = this.owner.zStep         || definition.zStep         || 1000;
			this.separateTiles = this.owner.separateTiles || definition.separateTiles || false;
			this.entityPositionX = this.owner.entityPositionX || definition.entityPositionX || 'center';
			this.entityPositionY = this.owner.entityPositionY || definition.entityPositionY || 'bottom';
		},
		
		events: {
			"scene-loaded": function(persistentData){
				var skill = 0, 
				actionLayer = 0,
				layer = false;

				if(persistentData){ //TODO: enable local storage method in a better way than this
					skill = persistentData.skill || +(window.localStorage.getItem('skill') || 0);
				}
				
				//format level appropriately
				if(typeof this.level === 'string'){
					this.level = platformer.settings.levels[this.level];
				} else {
					this.level = mergeLevels(this.level, skill);
				}
				
				for(; actionLayer < this.level.layers.length; actionLayer++){
					layer = this.setupLayer(this.level.layers[actionLayer], this.level, layer);
					if (this.separateTiles){
						layer = false;
					}
				}

				this.owner.trigger('world-loaded', {
					width:  this.level.width  * this.level.tilewidth  * this.unitsPerPixel,
					height: this.level.height * this.level.tileheight * this.unitsPerPixel,
					camera: this.followEntity
				});
				this.owner.removeComponent(this);
			}
		},
		
		methods: {
			setupLayer: function(layer, level, combineRenderLayer){
				var self       = this,
				images         = self.images || [],
				tilesets       = level.tilesets,
				tileWidth      = level.tilewidth,
				tileHeight     = level.tileheight,
				widthOffset    = 0,
				heightOffset   = 0,
				tileTypes      = (tilesets[tilesets.length - 1].imagewidth / tileWidth) * (tilesets[tilesets.length - 1].imageheight / tileHeight) + tilesets[tilesets.length - 1].firstgid,
				x              = 0,
				y              = 0,
				obj            = 0,
				entity         = undefined,
				entityType     = '',
				tileset        = undefined,
				properties     = undefined,
				layerCollides  = true,
				numberProperty = false,
				createLayer = function(entityKind){
					var width      = layer.width,
					height         = layer.height,
					tileDefinition = undefined,
					importAnimation= undefined,
					importCollision= undefined,
					importRender   = undefined,
					renderTiles    = false,
					tileset        = null,
					jumpthroughs   = null,
					index          = 0;
					
					//TODO: a bit of a hack to copy an object instead of overwrite values
					tileDefinition  = JSON.parse(JSON.stringify(platformer.settings.entities[entityKind]));

					importAnimation = {};
					importCollision = [];
					importRender    = [];
					
					if(entityKind === 'collision-layer'){
						jumpthroughs = [];
						for (var x = 0; x < tilesets.length; x++){
							tileset = tilesets[x];
							if(tileset.tileproperties){
								for (var y in tileset.tileproperties){
									if(tileset.tileproperties[y].jumpThrough){
										jumpthroughs.push(tileset.firstgid + +y - 1);
									}
								}
							}
						}
					}

					tileDefinition.properties            = tileDefinition.properties || {};
					tileDefinition.properties.width      = tileWidth  * width  * self.unitsPerPixel;
					tileDefinition.properties.height     = tileHeight * height * self.unitsPerPixel;
					tileDefinition.properties.columns    = width;
					tileDefinition.properties.rows       = height;
					tileDefinition.properties.tileWidth  = tileWidth  * self.unitsPerPixel;
					tileDefinition.properties.tileHeight = tileHeight * self.unitsPerPixel;
					tileDefinition.properties.scaleX     = self.imagesScale;
					tileDefinition.properties.scaleY     = self.imagesScale;
					tileDefinition.properties.layerZ     = self.layerZ;
					tileDefinition.properties.z    		 = self.layerZ;
					
					
					for (x = 0; x < tileTypes; x++){
						importAnimation['tile' + x] = x;
					}
					for (x = 0; x < width; x++){
						importCollision[x] = [];
						importRender[x]    = [];
						for (y = 0; y < height; y++){
							index = +layer.data[x + y * width] - 1;
							importRender[x][y] = 'tile' + index;
							if(jumpthroughs){
								for (var z = 0; z < jumpthroughs.length; z++){
									if(jumpthroughs[z] === (0x0fffffff & index)){
										index = -2;
									}
									break;
								}
							}
							importCollision[x][y] = index;
						}
					}
					for (x = 0; x < tileDefinition.components.length; x++){
						if(tileDefinition.components[x].type === 'render-tiles'){
							renderTiles = tileDefinition.components[x]; 
						}
						if(tileDefinition.components[x].spriteSheet == 'import'){
							tileDefinition.components[x].spriteSheet = {
								images: images,
								frames: {
									width:  tileWidth * self.unitsPerPixel / self.imagesScale,
									height: tileHeight * self.unitsPerPixel / self.imagesScale//,
//									regX: (tileWidth * self.unitsPerPixel / self.imagesScale) / 2,
			//						regY: (tileHeight * self.unitsPerPixel / self.imagesScale) / 2
								},
								animations: importAnimation
							};
						}
						if(tileDefinition.components[x].collisionMap == 'import'){
							tileDefinition.components[x].collisionMap = importCollision;
						}
						if(tileDefinition.components[x].imageMap == 'import'){
							tileDefinition.components[x].imageMap = importRender;
						}
					}
					self.layerZ += self.layerZStep;
					
					if((entityKind === 'render-layer') && combineRenderLayer){
						combineRenderLayer.trigger('add-tiles', renderTiles);
						return combineRenderLayer; 
					} else {
						return self.owner.addEntity(new platformer.classes.entity(tileDefinition, {properties:{}})); 
					}
				};

				if(images.length == 0){
					for (x = 0; x < tilesets.length; x++){
						if(platformer.assets[tilesets[x].name]){ // Prefer to have name in tiled match image id in game
							images.push(platformer.assets[tilesets[x].name]);
						} else {
							images.push(tilesets[x].image);
						}
					}
				} else {
					images = images.slice(); //so we do not overwrite settings array
					for (x = 0; x < images.length; x++){
						if(platformer.assets[images[x]]){
							images[x] = platformer.assets[images[x]];
						}
					}
				}
				
				if(layer.type == 'tilelayer'){
					// First determine which type of entity this layer should behave as:
					entity = 'render-layer'; // default
					if(layer.properties && layer.properties.entity){
						entity = layer.properties.entity;
					} else { // If not explicitly defined, try using the name of the layer
						switch(layer.name){
						case "collision":
							entity = 'collision-layer';
							break;
						case "action":
							entity = 'tile-layer';
							for (x = 0; x < level.layers.length; x++){
								if(level.layers[x].name === 'collision' || (level.layers[x].properties && level.layers[x].properties.entity === 'collision-layer')){
									layerCollides = false;
								}
							}
							if(!layerCollides){
								entity = 'render-layer';
							}
							break;
						}
					}
					
					if(entity === 'tile-layer'){
						createLayer('collision-layer');
						return createLayer('render-layer', combineRenderLayer);
					} else {
						return createLayer(entity, combineRenderLayer);
					}
				} else if(layer.type == 'objectgroup'){
					for (obj = 0; obj < layer.objects.length; obj++){
						entity = layer.objects[obj];
						for (x = 0; x < tilesets.length; x++){
							if(tilesets[x].firstgid > entity.gid){
								break;
							} else {
								tileset = tilesets[x];
							}
						}
						
						// Check Tiled data to find this object's type
						entityType = '';
						if(entity.type !== ''){
							entityType = entity.type;
						} else if(tileset.tileproperties[entity.gid - tileset.firstgid]){
							if(tileset.tileproperties[entity.gid - tileset.firstgid].entity){
								entityType = tileset.tileproperties[entity.gid - tileset.firstgid].entity;
							} else if (tileset.tileproperties[entity.gid - tileset.firstgid].type){
								entityType = tileset.tileproperties[entity.gid - tileset.firstgid].type;
							}
						}
						
						if(entityType !== ''){
							properties = {};
							//Copy properties from Tiled

							if(tileset.tileproperties && tileset.tileproperties[entity.gid - tileset.firstgid]){
								for (x in tileset.tileproperties[entity.gid - tileset.firstgid]){
									//This is going to assume that if you pass in something that starts with a number, it is a number and converts it to one.
									numberProperty = parseFloat(tileset.tileproperties[entity.gid - tileset.firstgid][x]);
									if (numberProperty == 0 || (!!numberProperty)) {
										properties[x] = numberProperty;
									} else if(tileset.tileproperties[entity.gid - tileset.firstgid][x] == 'true') {
										properties[x] = true;
									} else if(tileset.tileproperties[entity.gid - tileset.firstgid][x] == 'false') {
										properties[x] = false;
									} else {
										properties[x] = tileset.tileproperties[entity.gid - tileset.firstgid][x];
									}
								}
							}
							
							for (x in entity.properties){
								//This is going to assume that if you pass in something that starts with a number, it is a number and converts it to one.
							    numberProperty = parseFloat(entity.properties[x]);
								if (numberProperty == 0 || (!!numberProperty))
								{
									properties[x] = numberProperty;
								} else if(entity.properties[x] == 'true') {
									properties[x] = true;
								} else if(entity.properties[x] == 'false') {
									properties[x] = false;
								} else {
									properties[x] = entity.properties[x];
								}
							}
							widthOffset  = properties.width  = (entity.width  || tileWidth)  * this.unitsPerPixel;
							heightOffset = properties.height = (entity.height || tileHeight) * this.unitsPerPixel;
							if (entityType && platformer.settings.entities[entityType] && platformer.settings.entities[entityType].properties) {
								properties.width  = platformer.settings.entities[entityType].properties.width  || properties.width;
								properties.height = platformer.settings.entities[entityType].properties.height || properties.height;
							}

							properties.x = entity.x * this.unitsPerPixel;
							if(this.entityPositionX === 'left'){
								properties.regX = 0;
							} else if(this.entityPositionX === 'center'){
								properties.regX = properties.width / 2;
								properties.x += widthOffset / 2;
							} else if(this.entityPositionX === 'right'){
								properties.regX = properties.width;
								properties.x += widthOffset;
							}

							properties.y = entity.y * this.unitsPerPixel;
							if(typeof entity.gid === 'undefined'){
								properties.y += properties.height;
							}
							if(this.entityPositionY === 'bottom'){
								properties.regY = properties.height;
							} else if(this.entityPositionY === 'center'){
								properties.regY = properties.height / 2;
								properties.y -= heightOffset / 2;
							} else if(this.entityPositionY === 'top'){
								properties.regY = 0;
								properties.y -= heightOffset;
							}

							properties.scaleX = this.imagesScale;//this.unitsPerPixel;
							properties.scaleY = this.imagesScale;//this.unitsPerPixel;
							properties.layerZ = this.layerZ;
							
							//Setting the z value. All values are getting added to the layerZ value.
							if (properties.z) {
								properties.z += this.layerZ;
							} else if (entityType && platformer.settings.entities[entityType] && platformer.settings.entities[entityType].properties && platformer.settings.entities[entityType].properties.z) {
								properties.z = this.layerZ + platformer.settings.entities[entityType].properties.z;
							} else {
								properties.z = this.layerZ;
							}
							
							properties.parent = this.owner;
							entity = this.owner.addEntity(new platformer.classes.entity(platformer.settings.entities[entityType], {properties:properties}));
							if(entity){
								if(entity.camera){
									this.followEntity = {entity: entity, mode: entity.camera}; //used by camera
								}
							}
						}
					}
					this.layerZ += this.layerZStep;
					return false;
				}
			},
			
			"destroy": function(){
				this.entities.length = 0;
			}
		}
	});
})();


/*--------------------------------------------------
 *   handler-render-createjs - ../engine/components/handler-render-createjs.js
 */
/**
# COMPONENT **handler-render-createjs**
A component that handles updating rendering for components that are rendering via createjs. Each tick it calls all the entities that accept 'handle-render' messages.

## Dependencies
- **Needs a 'tick' or 'render' call** - This component doesn't need a specific component, but it does require a 'tick' or 'render' call to function. It's usually used as a component of an action-layer.
- [createjs.EaselJS][link1] - This component requires the EaselJS library to be included for canvas functionality.

## Messages

### Listens for:
- **child-entity-added** - Called when a new entity has been added to the parent and should be considered for addition to the handler. If the entity has a 'handle-render' or 'handle-render-load' message id it's added to the list of entities. Entities are sent a reference to the stage that we're rendering to, so they can add their display objects to it. 
  > @param entity (Object) - The entity that is being considered for addition to the handler.
- **tick, render** - Sends a 'handle-render' message to all the entities the component is handling. If an entity does not handle the message, it's removed it from the entity list. This function also sorts the display objects in the stage according to their z value. We detect when new objects are added by keeping track of the first element. If it changes the list gets resorted. Finally the whole stage is updated by CreateJS.
  > @param resp (object) - An object containing deltaT which is the time passed since the last tick. 
- **camera-update** - Called when the camera moves in the world, or if the window is resized. This function sets the canvas size and the stage transform.
  > @param cameraInfo (object) - An object containing the camera information. 


### Child Broadcasts:
- **handle-render** - Sent to entities to run their render for the tick.
  > @param object (object) - An object containing a deltaT variable that is the time that's passed since the last tick.
- **handle-render-load** - Sent to entities when they are added to the handler. Sends along the stage object so the entity can add its display objects. It also sends the parent DOM element of the canvas.
  > @param object.stage ([createjs.Stage][link2]) - The createjs stage object.
  > @param object.parentElement (object) - The DOM parent element of the canvas. 

## JSON Definition
    {
      "type": "handler-render-createjs"
    }
    
[link1]: http://www.createjs.com/Docs/EaselJS/module_EaselJS.html
[link2]: http://createjs.com/Docs/EaselJS/Stage.html
*/
(function(){

	return platformer.createComponentClass({

		id: "handler-render-createjs",
		
		constructor: function(definition){
			this.entities = [];
			
			this.canvas = this.owner.canvas = document.createElement('canvas');
			if(this.owner.element){
				this.owner.element.appendChild(this.canvas);
			} else {
				this.owner.rootElement.appendChild(this.canvas);
				this.owner.element = this.canvas; 
			}
			
			this.stage = new createjs.Stage(this.canvas);
			
			if(definition.autoClear !== true){
				this.stage.autoClear = false; //since most tile maps are re-painted every time, the canvas does not require clearing.
			}
			
			this.camera = {
				left: 0,
				top: 0,
				width: 0,
				height: 0,
				buffer: definition.buffer || 0
			};
			this.lastChild = undefined;
			
			this.timeElapsed = {
				name: 'Render',
				time: 0
			};
			
			this.renderMessage = {
				deltaT: 0,
				stage:  this.stage
			};
		},
		
		events:{
			"child-entity-added": function(entity){
				var self = this,
				messageIds = entity.getMessageIds(); 
				
				for (var x = 0; x < messageIds.length; x++)
				{
					if ((messageIds[x] == 'handle-render') || (messageIds[x] == 'handle-render-load')){
						this.entities.push(entity);
						entity.trigger('handle-render-load', {
							stage: self.stage,
							parentElement: self.owner.rootElement
						});
						break;
					}
				}
			},
			"pause-render": function(resp){
				if(resp && resp.time){
					this.paused = resp.time;
				} else {
					this.paused = -1;
				}
			},
			"unpause-render": function(){
				this.paused = 0;
			},
			"tick": function(resp){
				var lastIndex = 0,
				child   = undefined,
				time    = new Date().getTime(),
				message = this.renderMessage;
				
				message.deltaT = resp.deltaT;

				if(this.paused > 0){
					this.paused -= resp.deltaT;
					if(this.paused < 0){
						this.paused = 0;
					}
				}

				for (var x = this.entities.length - 1; x > -1; x--){
					if(!this.entities[x].trigger('handle-render', message)) {
						this.entities.splice(x, 1);
					}
				}
				for (var x = this.stage.children.length - 1; x > -1; x--){
					child = this.stage.children[x];
					if (child.hidden) {
						if(child.visible) child.visible = false;
					} else if(child.name !== 'entity-managed'){
						if((child.x >= this.camera.x - this.camera.buffer) && (child.x <= this.camera.x + this.camera.width + this.camera.buffer) && (child.y >= this.camera.y - this.camera.buffer) && (child.y <= this.camera.y + this.camera.height + this.camera.buffer)){
							if(!child.visible) child.visible = true;
						} else {
							if(child.visible) child.visible = false;
						}
					}
					
					if(child.visible){
						if (child.paused && !this.paused){
							child.paused = false;
						} else if (this.paused) {
							child.paused = true;
						}
					}
					
					if(!child.scaleX || !child.scaleY || (this.children && !this.children.length)){
						console.log ('uh oh', child);
//						this.cacheCanvas || this.children.length;
	//					return !!(this.visible && this.alpha > 0 && this.scaleX != 0 && this.scaleY != 0 && hasContent);
					}
				}

				lastIndex = this.stage.getNumChildren() - 1; //checked here, since handle-render could add a child
				if (this.stage.getChildAt(lastIndex) !== this.lastChild) {
					this.stage.sortChildren(function(a, b) {
						return a.z - b.z;
					});
					this.lastChild = this.stage.getChildAt(lastIndex);
				}
				
				this.timeElapsed.name = 'Render-Prep';
				this.timeElapsed.time = new Date().getTime() - time;
				platformer.game.currentScene.trigger('time-elapsed', this.timeElapsed);
				time += this.timeElapsed.time;

				this.stage.update();
				this.timeElapsed.name = 'Render';
				this.timeElapsed.time = new Date().getTime() - time;
				platformer.game.currentScene.trigger('time-elapsed', this.timeElapsed);
			},
			"camera-update": function(cameraInfo){
				var dpr = (window.devicePixelRatio || 1);
				
				this.camera.x = cameraInfo.viewportLeft;
				this.camera.y = cameraInfo.viewportTop;
				this.camera.width = cameraInfo.viewportWidth;
				this.camera.height = cameraInfo.viewportHeight;
				if(!this.camera.buffer){
					this.camera.buffer = this.camera.width / 12; // sets a default buffer based on the size of the world units if the buffer was not explicitly set.
				}
				
				this.canvas.width  = this.canvas.offsetWidth * dpr;
				this.canvas.height = this.canvas.offsetHeight * dpr;
				this.stage.setTransform(-cameraInfo.viewportLeft * cameraInfo.scaleX * dpr, -cameraInfo.viewportTop * cameraInfo.scaleY * dpr, cameraInfo.scaleX * dpr, cameraInfo.scaleY * dpr);
			}
		},
		methods:{
			destroy: function(){
				this.stage = undefined;
				this.owner.rootElement.removeChild(this.canvas);
				this.owner.element = null;
				this.canvas = undefined;
				this.entities.length = 0;
			}
		}
	});
})();


/*--------------------------------------------------
 *   handler-render-dom - ../engine/components/handler-render-dom.js
 */
/**
# COMPONENT **handler-render-dom**
A component that handles the rendering of DOM elements. It creates a div element that it then shares with entities to add themselves too. It then alerts these entities when they should load and update their rendering.

## Dependencies
- **Needs a 'tick' or 'render' call** - This component doesn't need a specific component, but it does require a 'tick' or 'render' call to function. It's usually used as a component of an action-layer.

## Messages

### Listens for:
- **child-entity-added** - Called when a new entity has been added and should be considered for addition to the handler. If the entity has a 'handle-render' or 'handle-render-load' message id it's added to the list of entities. Also the 'handle-render-load' message is called immediately.
  > @param entity (Object) - The entity that is being considered for addition to the handler.
- **tick, render** - Sends a 'handle-render' message to all the entities the component is handling. If an entity does not handle the message, it's removed it from the entity list.
  > @param resp (object) - An object containing deltaT which is the time passed since the last tick. 

### Child Broadcasts:
- **handle-render-load** - Sent to an entity that has been added to the handler. Passes the entity a div element that it can add itself to.
  > @param obj.element (Object) - An object containing a DOM element that the entity should add child elements to.
- **handle-render** - Sent to entities to have them prepare to be rendered.
  > @param object - An object containing a deltaT variable that is the time that's passed since the last tick.

## JSON Definition
    {
      "type": "handler-render-dom",

      "className": "top-band",
      //Optional. Any standard properties of the element can be set by listing property names and their values. "className" is one example, but other element properties can be specified in the same way.
      
      "onmousedown": "turn-green",
      //Optional. If specified properties begin with "on", it is assumed that the property is an event handler and the listed value is broadcast as a message on the entity where the message object is the event handler's event object.
    }
*/

platformer.components['handler-render-dom'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		this.entities = [];
		
		// Messages that this component listens for
		this.listeners = [];
		this.addListeners(['tick', 'child-entity-added', 'render']);
		
		this.element = this.owner.element = document.createElement('div');
		this.owner.rootElement.appendChild(this.element);
		this.owner.element = this.element;

		for(var i in definition){
			if(i === 'style'){
				for(var j in definition[i]){
					this.element.style[j] = definition[i][j]; 
				}
			} else if(i !== 'type'){
				if(i.indexOf('on') === 0){
					this.element[i] = createFunction(definition[i], this.owner);
				} else {
					this.element[i] = definition[i];
				}
			}
		}

	},
	proto = component.prototype; 

	proto['child-entity-added'] = function(entity){
		var self = this,
		messageIds = entity.getMessageIds(); 
		
		for (var x = 0; x < messageIds.length; x++)
		{
			if ((messageIds[x] == 'handle-render') || (messageIds[x] == 'handle-render-load')){
				this.entities.push(entity);
				entity.trigger('handle-render-load', {
					element: self.element
				});
				break;
			}
		}
	};
	
	proto['tick'] = proto['render'] = function(resp){
		for (var x = this.entities.length - 1; x > -1; x--)
		{
			if(!this.entities[x].trigger('handle-render', resp))
			{
				this.entities.splice(x, 1);
			}
			
		}
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
		this.owner.rootElement.removeChild(this.element);
		this.owner.element = null;
		this.element = undefined;
		this.entities.length = 0;
		this.owner = undefined;
	};
	
	/*********************************************************************************************************
	 * The stuff below here can be left alone. 
	 *********************************************************************************************************/
	
	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   handler-ai - ../engine/components/handler-ai.js
 */
/**
# COMPONENT **handler-ai**
A component that handles updating ai components. Each tick it calls all the entities that accept 'handle-ai' messages.

## Dependencies
- **Needs a 'tick' call** - This component doesn't need a specific component, but it does require a 'tick' call to function. It's usually used as a component of an action-layer.

## Messages

### Listens for:
- **child-entity-added** - Called when a new entity has been added and should be considered for addition to the handler. If the entity has a 'handle-ai' message id it's added to the list of entities. 
  > @param entity (Object) - The entity that is being considered for addition to the handler.
- **tick** - Sends a 'handle-ai' message to all the entities the component is handling. If an entity does not handle the message, it's removed it from the entity list.
  > @param obj (object) - An object containing deltaT which is the time passed since the last tick. 

### Child Broadcasts:
- **handle-ai** - Sent to entities to run their ai for the tick.
  > @param object - An object containing a deltaT variable that is the time that's passed since the last tick.

## JSON Definition
    {
      "type": "handler-ai",
    }
*/

platformer.components['handler-ai'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		this.entities = [];
		
		// Messages that this component listens for
		this.listeners = [];
		this.addListeners(['child-entity-added', 'tick']);  
		
	};
	var proto = component.prototype; 

	proto['child-entity-added'] = function(entity){
		var self = this,
		messageIds = entity.getMessageIds(); 
		
		for (var x = 0; x < messageIds.length; x++)
		{
			if (messageIds[x] == 'handle-ai')
			{
				this.entities.push(entity);
				break;
			}
		}
	};

	proto['tick'] = function(obj){
		for (var x = this.entities.length - 1; x > -1; x--)
		{
			if(!this.entities[x].trigger('handle-ai', obj))
			{
				this.entities.splice(x, 1);
			}
		}
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/
	
	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   handler-logic - ../engine/components/handler-logic.js
 */
/**
# COMPONENT **handler-logic**
A component that handles updating logic components. Each tick it calls all the entities that accept 'handle-logic' messages.

## Dependencies
- **Needs a 'tick' or 'logic' call** - This component doesn't need a specific component, but it does require a 'tick' or 'logic' call to function. It's usually used as a component of an action-layer.

## Messages

### Listens for:
- **child-entity-added** - Called when a new entity has been added and should be considered for addition to the handler. If the entity has a 'handle-logic' message id it's added to the list of entities. 
  > @param entity (Object) - The entity that is being considered for addition to the handler.
- **tick** - Sends a 'handle-logic' message to all the entities the component is handling. If an entity does not handle the message, it's removed it from the entity list.
  > @param resp (object) - An object containing deltaT which is the time passed since the last tick. 
- **pause-logic** - `handle-logic` messages cease to be triggered on each tick
  > @param resp.time (number) - If set, this will pause the logic for this number of milliseconds. If not set, logic is paused until an `unpause-logic` message is triggered. 
- **unpause-logic** - `handle-logic` messages begin firing each tick.
- **camera-update** - Changes the active logic area when the camera location changes.
  > @param resp.viewportLeft (number) - The left side of the camera viewport in world units. 
  > @param resp.viewportTop (number) - The top side of the camera viewport in world units. 
  > @param resp.viewportWidth (number) - The width of the camera viewport in world units. 
  > @param resp.viewportHeight (number) - The height of the camera viewport in world units. 

### Child Broadcasts:
- **handle-logic** - Sent to entities to run their logic.
  > @param object - An object containing a deltaT variable that is the time that's passed since the last tick.

## JSON Definition
    {
      "type": "handler-logic",
      
      "buffer": 10
      //If a camera is used, this defines the buffer around the viewport where logic should be active.
    }
*/

(function(){
	var updateState = function(entity){
		var state = null,
		changed   = false;
		
		for (state in entity.state){
			if (entity.state[state] !== entity.lastState[state]){
				entity.lastState[state] = entity.state[state];
				changed = true;
			}
		}
		
		return changed;
	};

	return platformer.createComponentClass({
		id: "handler-logic",
	
		constructor: function(definition){
			this.entities = [];
			this.activeEntities = this.entities;
			
			this.paused = 0;
			this.stepLength    = definition.stepLength || 30;//15;
			this.leftoverTime = 0;
			this.maximumStepsPerTick = 10; //Math.ceil(500 / this.stepLength);
			this.camera = {
				left: 0,
				top: 0,
				width: 0,
				height: 0,
				buffer: definition.buffer || 0,
				active: false
			};
			this.message = {
				deltaT: this.stepLength,
				tick: null,
				camera: this.camera,
				movers: this.activeEntities
			};
			this.timeElapsed = {
				name: 'Logic',
				time: 0
			};
		},
		
		events:{
			"child-entity-added": function(entity){
				var messageIds = entity.getMessageIds(); 
				
				for (var x = 0; x < messageIds.length; x++)
				{
					if (messageIds[x] == 'handle-logic'){
						this.entities.push(entity);
						this.updateNeeded = this.camera.active;
						break;
					}
				}
			},

			"pause-logic": function(resp){
				if(resp && resp.time){
					this.paused = resp.time;
				} else {
					this.paused = -1;
				}
//				console.log('paused-logic');
			},
			"unpause-logic": function(){
				this.paused = 0;
			},

			"camera-update": function(camera){
				this.camera.left = camera.viewportLeft;
				this.camera.top = camera.viewportTop;
				this.camera.width = camera.viewportWidth;
				this.camera.height = camera.viewportHeight;
				if(!this.camera.buffer){
					this.camera.buffer = this.camera.width / 10; // sets a default buffer based on the size of the world units if the buffer was not explicitly set.
				}
				this.camera.active = true;
				
				this.updateNeeded = true;
			},

			"tick": function(resp){
				var cycles = 0,
				child   = undefined,
				time    = new Date().getTime();
				
				this.leftoverTime += resp.deltaT;
				cycles = Math.floor(this.leftoverTime / this.stepLength) || 1;
		
				// This makes the frames smoother, but adds variance into the calculations
		//		this.message.deltaT = this.leftoverTime / cycles;
		//		this.leftoverTime = 0;
				
				// This makes the frames more exact, but varying step numbers between ticks can cause movement to be jerky
				this.message.deltaT = Math.min(this.leftoverTime, this.stepLength);
				this.leftoverTime = Math.max(this.leftoverTime - (cycles * this.stepLength), 0);
		
				if(this.paused > 0){
					this.paused -= resp.deltaT;
					if(this.paused < 0){
						this.paused = 0;
					}
				}
				
				if(!this.paused) {
					if(!this.message.tick){
						this.message.tick = resp;
					}
					
					//if(this.updateNeeded){//causes blocks to fall through dirt - not sure the connection here, so leaving out this optimization for now. - DDD
						if(this.activeEntities === this.entities){
							this.message.movers = this.activeEntities = [];
						}
						
						this.activeEntities.length = 0;
						for (var j = this.entities.length - 1; j > -1; j--) {
							child = this.entities[j];
							if(child.alwaysOn || (typeof child.x === 'undefined') || ((child.x >= this.camera.left - this.camera.buffer) && (child.x <= this.camera.left + this.camera.width + this.camera.buffer) && (child.y >= this.camera.top - this.camera.buffer) && (child.y <= this.camera.top + this.camera.height + this.camera.buffer))){
								this.activeEntities[this.activeEntities.length] = child;
							}
						}
					//}
					
					//Prevents game lockdown when processing takes longer than time alotted.
					cycles = Math.min(cycles, this.maximumStepsPerTick);
					
					for(var i = 0; i < cycles; i++){
						for (var j = this.activeEntities.length - 1; j > -1; j--) {
							child = this.activeEntities[j];
							if(child.triggerEvent('handle-logic', this.message)){
								if(updateState(child)){
									child.trigger('logical-state', child.state);
								}
								child.checkCollision = true;
							} else {
								for (var k = this.entities.length - 1; k > -1; k--) {
								    if(this.entities[k] === this.activeEntities[j]){
								    	this.entities.splice(k, 1);
								    	this.updateNeeded = this.camera.active;
								    	break;
								    }
								}
							}
						}
						this.timeElapsed.name = 'Logic';
						this.timeElapsed.time = new Date().getTime() - time;
						platformer.game.currentScene.trigger('time-elapsed', this.timeElapsed);
						time += this.timeElapsed.time;
						
						this.owner.trigger('check-collision-group', this.message); // If a collision group is attached, make sure collision is processed on each logic tick.
						this.timeElapsed.name = 'Collision';
						this.timeElapsed.time = new Date().getTime() - time;
						platformer.game.currentScene.trigger('time-elapsed', this.timeElapsed);
						time += this.timeElapsed.time;
					}
				}
				
				this.timeElapsed.time = new Date().getTime() - time;
				platformer.game.currentScene.trigger('time-elapsed', this.timeElapsed);
			}
		}
	});
})();


/*--------------------------------------------------
 *   camera - ../engine/components/camera.js
 */
/**
# COMPONENT **camera**
This component controls the game camera deciding where and how it should move. The camera also broadcasts messages when the window resizes or its orientation changes.

## Dependencies:
- **rootElement** property (on entity) - This component requires a DOM element which it uses as the "window" determining the camera's aspect ratio and size.

## Messages

### Listens for:
- **tick, camera** - On a `tick` or `camera` step message, the camera updates its location according to its current state.
  > @param message.deltaT - If necessary, the current camera update function may require the length of the tick to adjust movement rate.
- **follow** - On receiving this message, the camera begins following the requested object.
  > @param message.mode (string) - Required. Can be "locked", "forward", "bounding", or "static". "static" suspends following, but the other three settings require that the entity parameter be defined. Also set the bounding area parameters if sending "bounding" as the following method and the movement parameters if sending "forward" as the following method.
  > @param message.entity ([[Entity]]) - The entity that the camera should commence following.
  > @param message.top (number) - The top of a bounding box following an entity.
  > @param message.left (number) - The left of a bounding box following an entity.
  > @param message.width (number) - The width of a bounding box following an entity.
  > @param message.height (number) - The height of a bounding box following an entity.
  > @param message.movementX (number) - Movement multiplier for focusing the camera ahead of a moving entity in the horizontal direction.
  > @param message.movementY (number) - Movement multiplier for focusing the camera ahead of a moving entity in the vertical direction.
  > @param message.offsetX (number) - How far to offset the camera from the entity horizontally.
  > @param message.offsetY (number) - How far to offset the camera from the entity vertically.
  > @param message.time (number) - How many milliseconds to follow the entity.
- **resize, orientationchange** - The camera listens for these events passed along from [[Game]] (who receives them from `window`). It adjusts the camera viewport according to the new size and position of the window.
- **world-loaded** - On receiving this message, the camera updates its world location and size as necessary. An example of this message is triggered by the [[Tiled-Loader]] component.
  > @param message.width (number) - Optional. The width of the loaded world.
  > @param message.height (number) - Optional. The height of the loaded world.
  > @param message.camera ([[Entity]]) - Optional. An entity that the camera should follow in the loaded world.
- **child-entity-added** - If children entities are listening for a `camera-update` message, they are added to an internal list.
  > @param message ([[Entity]]} - Expects an entity as the message object to determine whether to trigger `camera-update` on it.
- **child-entity-removed** - If children are removed from the entity, they are also removed from this component.
  > @param message ([[Entity]]} - Expects an entity as the message object to determine the entity to remove from its list.

### Child Broadcasts:
- **camera-update** - This component fires this message when the position of the camera in the world has changed.
  > @param message.viewportTop (number) - The top of the camera viewport in world coordinates.
  > @param message.viewportLeft (number) - The left of the camera viewport in world coordinates.
  > @param message.viewportWidth (number) - The width of the camera viewport in world coordinates.
  > @param message.viewportHeight (number) - The height of the camera viewport in world coordinates.
  > @param message.scaleX (number) - Number of window pixels that comprise a single world coordinate on the x-axis.
  > @param message.scaleY (number) - Number of window pixels that comprise a single world coordinate on the y-axis.

### Local Broadcasts:
- **camera-update** - This component fires this message when the position of the camera in the world has changed or if the window has been resized.
  > @param message.viewportTop (number) - The top of the camera viewport in world coordinates.
  > @param message.viewportLeft (number) - The left of the camera viewport in world coordinates.
  > @param message.viewportWidth (number) - The width of the camera viewport in world coordinates.
  > @param message.viewportHeight (number) - The height of the camera viewport in world coordinates.
  > @param message.scaleX (number) - Number of window pixels that comprise a single world coordinate on the x-axis.
  > @param message.scaleY (number) - Number of window pixels that comprise a single world coordinate on the y-axis.

## JSON Definition:
    {
      "type": "camera",
      
      "top": 100,
      // Optional number specifying top of viewport in world coordinates
      
      "left": 100,
      // Optional number specifying left of viewport in world coordinates
      
      "width": 100,
      // Optional number specifying width of viewport in world coordinates
      
      "height": 100,
      // Optional number specifying height of viewport in world coordinates
      
      "stretch": true,
      // Optional boolean value that determines whether the camera should stretch the world viewport when window is resized. Defaults to false which maintains the proper aspect ratio.
      
      "scaleWidth": 480,
      // Optional. Sets the size in window coordinates at which the world zoom should snap to a larger multiple of pixel size (1,2, 3, etc). This is useful for maintaining a specific game pixel viewport width on pixel art games so pixels use multiples rather than smooth scaling. Default is 0 which causes smooth scaling of the game world in a resizing viewport.
      
      "transitionX": 400,
      // Optional. Sets how quickly the camera should pan to a new position in the horizontal direction. Default is 400.
      
      "transitionY": 400,
      // Optional. Sets how quickly the camera should pan to a new position in the vertical direction. Default is 600.
      
      "threshold": 3,
      // Optional. Sets how many units the followed entity can move before the camera will re-center. Default is 1.
    }
*/
(function(){
	var resize = function (self){
		
		//The dimensions of the camera in the window
		self.window.viewportTop = self.element.offsetTop;
		self.window.viewportLeft = self.element.offsetLeft;
		self.window.viewportWidth = self.element.offsetWidth || self.worldWidth;
		self.window.viewportHeight = self.element.offsetHeight || self.worldHeight;

		if(self.scaleWidth){
			self.world.viewportWidth = self.window.viewportWidth / Math.ceil(self.window.viewportWidth / self.scaleWidth);
		}
		
		if(!self.stretch || self.scaleWidth){
			self.world.viewportHeight = self.window.viewportHeight * self.world.viewportWidth / self.window.viewportWidth;
		}
		
		self.worldPerWindowUnitWidth  = self.world.viewportWidth / self.window.viewportWidth;
		self.worldPerWindowUnitHeight = self.world.viewportHeight / self.window.viewportHeight;
		self.windowPerWorldUnitWidth  = self.window.viewportWidth / self.world.viewportWidth;
		self.windowPerWorldUnitHeight = self.window.viewportHeight/ self.world.viewportHeight;
		
		self.windowResized = true;
	};

	return platformer.createComponentClass({
		id: 'camera',
		constructor: function(definition){
			this.entities = [];

			// on resize should the view be stretched or should the world's initial aspect ratio be maintained?
			this.stretch = definition.stretch || false;
			this.transitionX = definition.transitionX || definition.transition || 400;
			this.transitionY = definition.transitionY || definition.transition || 600;
			this.threshold = definition.threshold || 1;
			this.element = null;
	
			//The dimensions of the camera in the window
			this.window = {
				viewportTop:    0,
				viewportLeft:   0,
				viewportWidth:  0,
				viewportHeight: 0
			};
			
			//The dimensions of the camera in the game world
			this.world = {
				viewportWidth:       definition.width       || 0,
				viewportHeight:      definition.height      || 0,
				viewportLeft:        definition.left        || 0,
				viewportTop:         definition.top         || 0
			};
			
			this.message = { //defined here so it can be reused
				viewportWidth:  0,
				viewportHeight: 0,
				viewportLeft:   0,
				viewportTop:    0,
				scaleX: 0,
				scaleY: 0
			};
	
			// on resize should the game snap to certain sizes or should it be fluid?
			// 0 == fluid scaling
			// set the windowWidth multiple that triggers zooming in
			this.scaleWidth = definition.scaleWidth || 0;
			
			// The dimensions of the entire world
			this.worldWidth  = definition.worldWidth  || definition.width       || 0;
			this.worldHeight = definition.worldHeight || definition.height      || 0;
			
			this.following = undefined;
			this.state = 'static';//'roaming';
			
			//FOLLOW MODE VARIABLES
			
			//--Bounding
			this.bBBorderX = 0;
			this.bBBorderY = 0;
			this.bBInnerWidth = 0;
			this.bBInnerHeight = 0;
			this.setBoundingArea();
			
			//Forward Follow
			this.lastLeft = this.world.viewportLeft;
			this.lastTop = this.world.viewportTop;
			this.forwardX = 0;
			this.forwardY = 0;
			this.averageOffsetX = 0;
			this.averageOffsetY = 0;
			this.offsetX = 0;
			this.offsetY = 0;
			this.forwardFollower = {
				x: this.lastLeft,
				y: this.lastTop
			};
			
			this.lastFollow = {
				entity: null,
				mode: null,
				offsetX: 0,
				offsetY: 0,
				begin: 0
			};
			
			this.direction = true;
			this.stationary = false;
			
			this.newChild = false;
		},
		events: {
			"load": function(){
				this.element = this.owner.canvas || this.owner.element || this.owner.rootElement;
				this.resize();
			},
			"child-entity-added": function(entity){
				var messageIds = entity.getMessageIds(); 
				
				for (var x = 0; x < messageIds.length; x++)
				{
					if (messageIds[x] == 'camera-update') {
						this.entities.push(entity);
						this.newChild = true;
						
						if(this.worldWidth || this.worldHeight){
							entity.trigger('world-loaded', {
								width: this.worldWidth,
								height: this.worldHeight
							});
						}

						break;
					}
				}
			},
			"child-entity-removed": function(entity){
				var x = 0;

				for (x in this.entities) {
					if(this.entities[x] === entity){
						this.entities.splice(x, 1);
						break;
					}
				}
			},
			"world-loaded": function(values){
				this.worldWidth   = this.owner.worldWidth  = values.width;
				this.worldHeight  = this.owner.worldHeight = values.height;
				if(values.camera){
					this.follow(values.camera);
				}
				for (var x = this.entities.length - 1; x > -1; x--) {
					this.entities[x].trigger('world-loaded', values);
				}
			},
			"tick": function(resp){
				var broadcastUpdate = this.newChild;
				
				this.newChild = false;
				
				switch (this.state)
				{
				case 'following':
					broadcastUpdate = this.followingFunction(this.following, resp.deltaT);
					break;
				case 'static':
				default:
					break;
				}
				
				if(broadcastUpdate || this.windowResized){
					this.stationary = false;
					
					this.message.viewportLeft   = this.world.viewportLeft;
					this.message.viewportTop    = this.world.viewportTop;
					this.message.viewportWidth  = this.world.viewportWidth;
					this.message.viewportHeight = this.world.viewportHeight;
					this.message.scaleX         = this.windowPerWorldUnitWidth;
					this.message.scaleY         = this.windowPerWorldUnitHeight;

					this.windowResized = false;
					this.owner.trigger('camera-update', this.message);

					if(broadcastUpdate){
						for (var x = this.entities.length - 1; x > -1; x--)
						{
							if(!this.entities[x].trigger('camera-update', this.message)){
								this.entities.splice(x, 1);
							}
						}
					}
				} else if (!this.stationary){
					this.owner.trigger('camera-stationary', this.message);
					this.stationary = true;
				}
				
				if(this.lastFollow.begin){
					if(this.lastFollow.begin < new Date().getTime()){
						this.follow(this.lastFollow);
					}
				}
			},
			"resize": function(){
				resize(this);
			},
			"orientationchange": function(){
				resize(this);
			},
			"follow": function (def){
				if (def.time){ //save current follow
					if(!this.lastFollow.begin){
						this.lastFollow.entity = this.following;
						this.lastFollow.mode   = this.mode;
						this.lastFollow.offsetX = this.offsetX;
						this.lastFollow.offsetY = this.offsetY;
					}
					this.lastFollow.begin  = new Date().getTime() + def.time;
				} else {
					if(this.lastFollow.begin){
						this.lastFollow.begin = 0;
					}
				}
				
				this.mode = def.mode;
				
				switch (def.mode) {
				case 'locked':
					this.state = 'following';
					this.following = def.entity;
					this.followingFunction = this.lockedFollow;
					this.offsetX = def.offsetX || 0;
					this.offsetY = def.offsetY || 0;
					break;
				case 'forward':
					this.state = 'following';
					this.followFocused = false;
					this.following = def.entity;
					this.lastLeft  = def.entity.x;
					this.lastTop   = def.entity.y;
					this.forwardX  = def.movementX || (this.transitionX / 10);
					this.forwardY  = def.movementY || 0;
					this.averageOffsetX = 0;
					this.averageOffsetY = 0;
					this.offsetX = def.offsetX || 0;
					this.offsetY = def.offsetY || 0;
					this.followingFunction = this.forwardFollow;
					break;
				case 'bounding':
					this.state = 'following';
					this.following = def.entity;
					this.offsetX = def.offsetX || 0;
					this.offsetY = def.offsetY || 0;
					this.setBoundingArea(def.top, def.left, def.width, def.height);
					this.followingFunction = this.boundingFollow;
					break;
				case 'static':
				default:
					this.state = 'static';
					this.following = undefined;
					this.followingFunction = undefined;
					break;
				}
				
				if(def.begin){ // get rid of last follow
					def.begin = 0;
				}

			}
		},
		
		methods: {
			move: function (newLeft, newTop){
				var moved = this.moveLeft(newLeft);
				moved = this.moveTop(newTop) || moved;
				return moved;
			},
			
			moveLeft: function (newLeft){
				if(Math.abs(this.world.viewportLeft - newLeft) > this.threshold){
					if (this.worldWidth < this.world.viewportWidth){
						this.world.viewportLeft = (this.worldWidth - this.world.viewportWidth) / 2;
					} else if (this.worldWidth && (newLeft + this.world.viewportWidth > this.worldWidth)) {
						this.world.viewportLeft = this.worldWidth - this.world.viewportWidth;
					} else if (this.worldWidth && (newLeft < 0)) {
						this.world.viewportLeft = 0; 
					} else {
						this.world.viewportLeft = newLeft;
					}
					return true;
				}
				return false;
			},
			
			moveTop: function (newTop) {
				if(Math.abs(this.world.viewportTop - newTop) > this.threshold){
					if (this.worldHeight < this.world.viewportHeight){
						this.world.viewportTop = (this.worldHeight - this.world.viewportHeight) / 2;
					} else if (this.worldHeight && (newTop + this.world.viewportHeight > this.worldHeight)) {
						this.world.viewportTop = this.worldHeight - this.world.viewportHeight;
					} else if (this.worldHeight && (newTop < 0)) {
						this.world.viewportTop = 0; 
					} else {
						this.world.viewportTop = newTop;
//						console.log(newTop + ',' + this.world.viewportHeight + ',' + this.worldHeight);
					}
					return true;
				}
				return false;
			},
			
			lockedFollow: function (entity, time, slowdown){
				var newLeft = entity.x - (this.world.viewportWidth / 2),
				newTop      = entity.y - (this.world.viewportHeight / 2),
				ratioX      = (this.transitionX?Math.min(time / this.transitionX, 1):1),
				iratioX     = 1 - ratioX,
				ratioY      = (this.transitionY?Math.min(time / this.transitionY, 1):1),
				iratioY     = 1 - ratioY

				return this.move(ratioX * newLeft + iratioX * this.world.viewportLeft, ratioY * newTop + iratioY * this.world.viewportTop);
			},
			
			forwardFollow: function (entity, time){
				var ff = this.forwardFollower,
				standardizeTimeDistance = 15 / time, //This allows the camera to pan appropriately on slower devices or longer ticks
				moved  = false,
				x = entity.x + this.offsetX,
				y = entity.y + this.offsetY;
				
				if(this.followFocused && (this.lastLeft === x) && (this.lastTop === y)){
//					ff.x = this.world.viewportLeft + (this.world.viewportWidth  / 2); 
//					ff.y = this.world.viewportTop  + (this.world.viewportHeight / 2); 

					return this.lockedFollow(ff, time);
				} else {
					// span over last 10 ticks to prevent jerkiness
					this.averageOffsetX *= 0.9;
					this.averageOffsetY *= 0.9;
					this.averageOffsetX += 0.1 * (x - this.lastLeft) * standardizeTimeDistance;
					this.averageOffsetY += 0.1 * (y - this.lastTop)  * standardizeTimeDistance;

					if (Math.abs(this.averageOffsetX) > (this.world.viewportWidth / (this.forwardX * 2))){
						this.averageOffsetX = 0;
					}
					if (Math.abs(this.averageOffsetY) > (this.world.viewportHeight / (this.forwardY * 2))){
						this.averageOffsetY = 0;
					}
					
					ff.x = this.averageOffsetX * this.forwardX + x;
					ff.y = this.averageOffsetY * this.forwardY + y;
					
					this.lastLeft = x;
					this.lastTop  = y;
					
					moved = this.lockedFollow(ff, time);

					if(!this.followFocused && !moved){
						this.followFocused = true;
					}
					
					return moved;
				}
				
				
			},
			
			setBoundingArea: function (top, left, width, height){
				this.bBBorderY = (typeof top !== 'undefined') ? top : this.world.viewportHeight  * 0.25;
				this.bBBorderX = (typeof left !== 'undefined') ? left : this.world.viewportWidth * 0.4;
				this.bBInnerWidth = (typeof width !== 'undefined') ? width : this.world.viewportWidth - (2 * this.bBBorderX);
				this.bBInnerHeight = (typeof height !== 'undefined') ? height : this.world.viewportHeight - (2 * this.bBBorderY);
			},
			
			boundingFollow: function (entity, time){
				var newLeft = null,
				newTop      = null,
				ratioX      = (this.transitionX?Math.min(time / this.transitionX, 1):1),
				iratioX     = 1 - ratioX,
				ratioY      = (this.transitionY?Math.min(time / this.transitionY, 1):1),
				iratioY     = 1 - ratioY;
				
				if (entity.x > this.world.viewportLeft + this.bBBorderX + this.bBInnerWidth){
					newLeft = entity.x -(this.bBBorderX + this.bBInnerWidth);
				} else if (entity.x < this.world.viewportLeft + this.bBBorderX) {
					newLeft = entity.x - this.bBBorderX;
				}
				
				if (entity.y > this.world.viewportTop + this.bBBorderY + this.bBInnerHeight){
					newTop = entity.y - (this.bBBorderY + this.bBInnerHeight);
				} else if (entity.y < this.world.viewportTop + this.bBBorderY) {
					newTop = entity.y - this.bBBorderY;
				}
				
				if (typeof newLeft !== 'null'){
					newLeft = this.moveLeft(ratioX * newLeft + iratioX * this.world.viewportLeft);
				}
				
				if (typeof newTop !== 'null'){
					newTop = this.moveTop(ratioY * newTop + iratioY * this.world.viewportTop);
				}
				
				return newLeft || newTop;
			},
			
			windowToWorld: function (sCoords){
				var wCoords = [];
				wCoords[0] = Math.round((sCoords[0] - this.window.viewportLeft) * this.worldPerWindowUnitWidth);
				wCoords[1] = Math.round((sCoords[1] - this.window.viewportTop)  * this.worldPerWindowUnitHeight);
				return wCoords; 
			},
			
			worldToWindow: function (wCoords){
				var sCoords = [];
				sCoords[0] = Math.round((wCoords[0] * this.windowPerWorldUnitWidth) + this.window.viewportLeft);
				sCoords[1] = Math.round((wCoords[1] * this.windowPerWorldUnitHeight) + this.window.viewportTop);
				return sCoords;
			},
			
			destroy: function(){
				this.entities.length = 0;
			}
		}
	});
})();


/*--------------------------------------------------
 *   collision-group - ../engine/components/collision-group.js
 */
/**
# COMPONENT **collision-group**
This component checks for collisions between entities in its group which typically have either a [[Collision-Tiles]] component for tile maps or a [[Collision-Basic]] component for other entities. It uses `entity-container` component messages if triggered to add to its collision list and also listens for explicit add/remove messages (useful in the absence of an `entity-container` component).

## Dependencies:
- [[Handler-Logic]] (on entity) - At the top-most layer, the logic handler triggers `check-collision-group` causing this component to test collisions on all children entities.

## Messages

### Listens for:
- **child-entity-added, add-collision-entity** - On receiving this message, the component checks the entity to determine whether it listens for collision messages. If so, the entity is added to the collision group.
  > @param message ([[Entity]] object) - The entity to be added.
- **child-entity-removed, remove-collision-entity** - On receiving this message, the component looks for the entity in its collision group and removes it.
  > @param message ([[Entity]] object) - The entity to be removed.
- **check-collision-group** - This message causes the component to go through the entities and check for collisions.
  > @param message.camera (object) - Optional. Specifies a region in which to check for collisions. Expects the camera object to contain the following properties: top, left, width, height, and buffer.
- **relocate-group** - This message causes the collision group to trigger `relocate-entity` on entities in the collision group.
  > @param message.x (number) - Required. The new x coordinate.
  > @param message.y (number) - Required. The new y coordinate.
- **relocate-entity** - When this message is triggered, the collision group updates its record of the owner's last (x, y) coordinate.

### Child Broadcasts
- **prepare-for-collision** - This message is triggered on collision entities to make sure their axis-aligned bounding box is prepared for collision testing.
- **relocate-entity** - This message is triggered on an entity that has been repositioned due to a solid collision.
- **hit-by-[collision-types specified in collision entities' definitions]** - When an entity collides with an entity of a listed collision-type, this message is triggered on the entity.
  > @param message.entity ([[Entity]]) - The entity with which the collision occurred.
  > @param message.type (string) - The collision type of the other entity.
  > @param message.shape ([[CollisionShape]]) - This is the shape of the other entity that caused the collision.
  > @param message.x (number) - Returns -1, 0, or 1 indicating on which side of this entity the collision occurred: left, neither, or right respectively.
  > @param message.y (number) - Returns -1, 0, or 1 indicating on which side of this entity the collision occurred: top, neither, or bottom respectively.

## JSON Definition:
    {
      "type": "collision-group"
      // This component has no customizable properties.
    }
*/
platformer.components['collision-group'] = (function(){
	//set here to make them reusable objects
	var tempAABB = new platformer.classes.aABB(),
	tempArray1   = [],
	tempArray2   = [],
	tempArray3   = [],
	tempArray4   = [],
	tempArray5   = [],
	emptyArray   = [],
	preciseColls = [],
	diff         = null,
	triggerMessage = {
		entity: null,
		type:   null,
		shape:  null,
		x: 0,
		y: 0,
		hitType: null,
		myType: null
	},
	entityCollisionMessage = {
		x: null,
		y: null,
		aABB: null,
		shape: null,
		thisType: null,
		thatType: null
	},
	tileCollisionMessage = {
		x: null,
		y: null,
		aABB: null,
		shape: null,
		thisType: null,
		thatType: null
	},
	xyPair = {
		x: 0,
		y: 0,
		xMomentum: 0,
		yMomentum: 0,
		relative: false
	},
	
	triggerCollisionMessages = function(entity, collision, x, y, hitType){
		var otherEntity = collision.entity;

		triggerMessage.entity = collision.entity;

		triggerMessage.type   = collision.thatType;
		triggerMessage.myType = collision.thisType;
		triggerMessage.shape  = otherEntity.shape;
		triggerMessage.x      = x;
		triggerMessage.y      = y;
		triggerMessage.hitType= hitType;
		entity.trigger('hit-by-' + collision.thatType, triggerMessage);
		
		triggerMessage.entity = entity;
		triggerMessage.type   = collision.thisType;
		triggerMessage.myType = collision.thatType;
		triggerMessage.shape  = entity.shape;
		triggerMessage.x      = -x;
		triggerMessage.y      = -y;
		otherEntity.trigger('hit-by-' + collision.thisType, triggerMessage);
	},
	triggerTileCollisionMessage = function(entity, shape, x, y, myType){
		triggerMessage.entity = null;
		triggerMessage.type   = 'tiles';
		triggerMessage.myType = myType;
		triggerMessage.shape  = shape;
		triggerMessage.x      = x;
		triggerMessage.y      = y;
		triggerMessage.hitType= 'solid';
		entity.trigger('hit-by-tiles', triggerMessage);
	},
	AABBCollisionX = function (boxX, boxY)
	{
		if(boxX.left   >=  boxY.right)  return false;
		if(boxX.right  <=  boxY.left)   return false;
		return true;
	},
	AABBCollisionY = function (boxX, boxY)
	{
		if(boxX.top    >=  boxY.bottom) return false;
		if(boxX.bottom <=  boxY.top)    return false;
		return true;
	},
	AABBCollision = function (boxX, boxY)
	{
		if(boxX.left   >=  boxY.right)  return false;
		if(boxX.right  <=  boxY.left)   return false;
		if(boxX.top    >=  boxY.bottom) return false;
		if(boxX.bottom <=  boxY.top)    return false;
		return true;
	},
	shapeCollision = function(shapeA, shapeB){
		return true;
	},
	preciseCollision = function (entityA, entityB){
		var i = 0,
		j     = 0,
		aabb  = undefined,
		shapesA = entityA.shapes || entityA.getShapes(),
		shapesB = entityB.shapes || entityB.getShapes();
		
		if((shapesA.length > 1) || (shapesB.length > 1)){
			for (i = 0; i < shapesA.length; i++){
				aabb = shapesA[i].getAABB();
				for (j = 0; j < shapesB.length; j++){
					if((AABBCollision(aabb, shapesB[j].getAABB())) && (shapeCollision(shapesA[i], shapesB[j]))){
						return true; //TODO: return all true instances instead of just the first one in case they need to be resolved in unique ways - DDD
					}
				}
			}
			return false;
		} else {
			return shapeCollision(shapesA[0], shapesB[0]);
		}
	},
	preciseCollisions = function (entities, entity, originalY){
		var shapes = entity.shapes || entity.getShapes();
			aabb   = shapes[0].getAABB();
		
//		preciseColls = [];
		preciseColls.length = 0;
		
		if(originalY){
			for(var i = 0; i < entities.length; i++){
				if(AABBCollisionX(entities[i].getAABB(), aabb) && AABBCollisionY(entities[i].getPreviousAABB(), aabb)){
					preciseColls[preciseColls.length] = entities[i];
				}
			}
		} else {
			for(var i = 0; i < entities.length; i++){
				if(preciseCollision(entities[i], entity, originalY)){
					preciseColls[preciseColls.length] = entities[i];
				}
			}
		}
		
		if (preciseColls.length){
			return preciseColls;
		} else {
			return false;
		}
	},
	checkDirection = function(position, xDirection, yDirection, thisAABB, thatAABB){
		var value = null;
		if (xDirection > 0) {
			value = thatAABB.left - thisAABB.halfWidth;
			if(position !== null){
				value = Math.min(position, value);
			}
		} else if (xDirection < 0) {
			value = thatAABB.right + thisAABB.halfWidth;
			if(position !== null){
				value = Math.max(position, value);
			}
		} else if (yDirection > 0) {
			value = thatAABB.top - thisAABB.halfHeight;
			if(position !== null){
				value = Math.min(position, value);
			}
		} else if (yDirection < 0) {
			value = thatAABB.bottom + thisAABB.halfHeight;
			if(position !== null){
				value = Math.max(position, value);
			}
		}
		return value;
	},
	checkAgainst = function(thisEntity, thisAABB, thatEntity, thatAABB, xDirection, yDirection, collision, group, thisCollisionType, thatCollisionType){
		var position  = null,
		lastPosition  = null,
		groupPosition = null,
		x = (xDirection?1:null),
		y = (yDirection?1:null),
		collidingEntities = null,
		i        = 0;
		
		if(AABBCollision(thisAABB, thatAABB)){
			if(group){
				collidingEntities = preciseCollisions(group, thatEntity, xDirection);
				if(collidingEntities){
					for(i = 0; i < collidingEntities.length; i++){
						position = checkDirection(position, xDirection, yDirection, collidingEntities[i].getAABB(), thatAABB);
						if (position !== lastPosition){
							if (xDirection > 0) {
								groupPosition = position - (collidingEntities[i].getAABB().x - thisAABB.x);
							} else if (xDirection < 0) {
								groupPosition = position - (collidingEntities[i].getAABB().x - thisAABB.x);
							} else if (yDirection > 0) {
								groupPosition = position - (collidingEntities[i].getAABB().y - thisAABB.y);
							} else if (yDirection < 0) {
								groupPosition = position - (collidingEntities[i].getAABB().y - thisAABB.y);
							}
						}
						lastPosition = position;
					}
					position = groupPosition;
				}
			} else if (preciseCollision(thisEntity, thatEntity)) {
				position = checkDirection(position, xDirection, yDirection, thisAABB, thatAABB);
			}

			if(position !== null){
				if ((collision.aABB === null) || (((xDirection > 0) && (position < collision.x)) || ((yDirection > 0) && (position < collision.y))) || (((xDirection < 0) && (position > collision.x)) || ((yDirection < 0) && (position > collision.y)))) {
					collision.x = position * x;
					collision.y = position * y;
					collision.aABB = thatAABB;
					collision.shape = thatEntity.shapes?thatEntity.shapes[0]:null;
					collision.entity = thatEntity;
					collision.thisType = thisCollisionType;
					collision.thatType = thatCollisionType;
				}
			}
			return collision;
		}
	},
	component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];
		
		this.addListeners([
		    'child-entity-added',    'add-collision-entity',
		    'child-entity-removed',  'remove-collision-entity',
		    'check-collision-group', 'relocate-group', 'relocate-entity'
		]);  
		//this.toResolve = [];
		
		var self = this;
		this.owner.getCollisionGroup = function(){
			return self.solidEntities;
		};
		this.owner.getCollisionGroupAABB = function(){
			return self.getAABB();
		};
		this.owner.getPreviousCollisionGroupAABB = function(){
			return self.getPreviousAABB();
		};
		
		this.entitiesByType = {};
		this.solidEntities = [];
		this.solidEntitiesLive = [];
		this.softEntities = [];
		this.softEntitiesLive = [];
		this.allEntities = [];
		this.allEntitiesLive = [];
		this.groupsLive = [];
		this.entitiesByTypeLive = {};
		this.terrain = undefined;
		this.aabb     = new platformer.classes.aABB(this.owner.x, this.owner.y);
		this.prevAABB = new platformer.classes.aABB(this.owner.x, this.owner.y);
		this.lastX = this.owner.getPreviousX?this.owner.getPreviousX():this.owner.x;
		this.lastY = this.owner.getPreviousY?this.owner.getPreviousY():this.owner.y;
		this.xMomentum = 0;
		this.yMomentum = 0;
		
		this.updateLiveList = true;
		this.cameraLogicAABB = new platformer.classes.aABB(0, 0);
		this.cameraCollisionAABB = new platformer.classes.aABB(0, 0);
		
		//defined here so we aren't continually recreating new arrays
		this.collisionGroups = [];
		
		this.groupCollisionMessage = {
			entities: this.entitiesByTypeLive,
			terrain: null,
			deltaT: null,
			tick: null,
			camera: null
		};
		
		this.timeElapsed = {
			name: 'Col',
			time: 0
		};
	};
	var proto = component.prototype; 

	proto['child-entity-added'] = proto['add-collision-entity'] = function(entity){
		var i = 0,
		types = entity.collisionTypes,
		solid = false,
		soft  = false;
		
		if ((entity.type == 'tile-layer') || (entity.type == 'collision-layer')) { //TODO: probably should have these reference a required function on the obj, rather than an explicit type list since new collision entity map types could be created - DDD
			this.terrain = entity;
			this.groupCollisionMessage.terrain = entity;
			this.updateLiveList = true;
		} else {
			if(types){
				for(; i < types.length; i++){
					if(!this.entitiesByType[types[i]]){
						this.entitiesByType[types[i]] = [];
						this.entitiesByTypeLive[types[i]] = [];
					}
					this.entitiesByType[types[i]][this.entitiesByType[types[i]].length] = entity;
					if(entity.solidCollisions[types[i]].length && !entity.immobile){
						solid = true;
					}
					if(entity.softCollisions[types[i]].length){
						soft = true;
					}
				}
				if(solid && !entity.immobile){
					this.solidEntities[this.solidEntities.length] = entity;
				}
				if(soft){
					this.softEntities[this.softEntities.length] = entity;
				}
//				if(entity.jumpThrough){ // Need to do jumpthrough last, since everything else needs to check against it's original position
					this.allEntities[this.allEntities.length] = entity;
//				} else {
//					this.allEntities.splice(0, 0, entity);
//				}
				this.updateLiveList = true;
			}
		}
	};
	
	proto['child-entity-removed'] = proto['remove-collision-entity'] = function(entity){
		var x = 0,
		i     = 0,
		j	  = 0,
		types = entity.collisionTypes,
		solid = false,
		soft  = false;

		if (types)
		{
			for(; i < types.length; i++){
				for (x in this.entitiesByType[types[i]]) {
					if(this.entitiesByType[types[i]][x] === entity){
						this.entitiesByType[types[i]].splice(x, 1);
						break;
					}
				}
				if(entity.solidCollisions[types[i]].length){
					solid = true;
				}
				if(entity.softCollisions[types[i]].length){
					soft = true;
				}
			}
			
			if(solid){
				for (x in this.solidEntities) {
					if(this.solidEntities[x] === entity){
						this.solidEntities.splice(x, 1);
						break;
					}
				}
			}
	
			if(soft){
				for (x in this.softEntities) {
					if(this.softEntities[x] === entity){
						this.softEntities.splice(x, 1);
						break;
					}
				}
			}
			
			for (j = 0; j < this.allEntities.length; j++)
			{
				if (this.allEntities[j] === entity)
				{
					this.allEntities.splice(j,1);
					break;
				}
			}
			this.updateLiveList = true;
		}
		
	};
	
	proto['check-collision-group'] = function(resp){
		var entitiesLive = null,
		time = new Date().getTime();
		
		if(resp.camera){
			this.checkCamera(resp.camera);
		}/*
		if(resp.movers){
			this.checkMovers(resp.camera, resp.movers);
		}*/

		this.timeElapsed.name = 'Col-Cam';
		this.timeElapsed.time = new Date().getTime() - time;
		platformer.game.currentScene.trigger('time-elapsed', this.timeElapsed);
		time += this.timeElapsed.time;

//		this.tester = 0;
		if(this.owner.x && this.owner.y){ // is this collision group attached to a collision entity?
			if (resp.entities){
				entitiesLive = this.entitiesByTypeLive; //save to reattach later so entities live grouping is not corrupted 
				this.entitiesByTypeLive = resp.entities;
			}
			if (resp.terrain && (this.terrain !== resp.terrain)){
				this.terrain = resp.terrain;
			}
			
			var goalX = this.owner.x - this.lastX,
			goalY     = this.owner.y - this.lastY;

			this.owner.x = this.lastX;
			this.owner.y = this.lastY;

			this.owner.triggerEvent('prepare-for-collision');

			if(this.allEntitiesLive.length > 1){
				this.checkGroupCollisions(resp);
				this.prepareCollisions(resp);
				this.checkSolidCollisions(resp, false);
				this.resolveNonCollisions(resp);
			}
	
			this.aabb.reset();
			this.aabb.include(this.owner.getAABB());
			for (var x = 0; x < this.solidEntitiesLive.length; x++){
				this.aabb.include(this.solidEntitiesLive[x].getCollisionGroupAABB?this.solidEntitiesLive[x].getCollisionGroupAABB():this.solidEntitiesLive[x].getAABB());
			}
	
			this.prevAABB.setAll(this.aabb.x, this.aabb.y, this.aabb.width, this.aabb.height);
			this.aabb.move(this.aabb.x + goalX, this.aabb.y + goalY);
	
//			if(test) console.log('set: ' + this.aabb.y);
			
			this.checkSoftCollisions(resp);
			
			if (resp.entities){
				this.entitiesByTypeLive = entitiesLive; //from above so entities live grouping is not corrupted 
			}
		} else {
//			this.tester = 0;

			this.checkGroupCollisions(resp);

			this.timeElapsed.name = 'Col-Group';
			this.timeElapsed.time = new Date().getTime() - time;
			platformer.game.currentScene.trigger('time-elapsed', this.timeElapsed);
			time += this.timeElapsed.time;

			this.prepareCollisions(resp);

			this.timeElapsed.name = 'Col-Prep';
			this.timeElapsed.time = new Date().getTime() - time;
			platformer.game.currentScene.trigger('time-elapsed', this.timeElapsed);
			time += this.timeElapsed.time;

			this.checkSolidCollisions(resp, true);

			this.timeElapsed.name = 'Col-Solid';
			this.timeElapsed.time = new Date().getTime() - time;
			platformer.game.currentScene.trigger('time-elapsed', this.timeElapsed);
			time += this.timeElapsed.time;

			this.resolveNonCollisions(resp);

			this.timeElapsed.name = 'Col-None';
			this.timeElapsed.time = new Date().getTime() - time;
			platformer.game.currentScene.trigger('time-elapsed', this.timeElapsed);
			time += this.timeElapsed.time;

			this.checkSoftCollisions(resp);

			this.timeElapsed.name = 'Col-Soft';
			this.timeElapsed.time = new Date().getTime() - time;
			platformer.game.currentScene.trigger('time-elapsed', this.timeElapsed);
			time += this.timeElapsed.time;

		}
	};
	
	proto.getAABB = function(){
		return this.aabb;
//		if(test) console.log('get: ' + this.aabb.y);
	};

	proto.getPreviousAABB = function(){
		return this.prevAABB;
	};

	proto.checkCamera = function(camera, movers){
		var i  = 0,
		j      = 0,
		length = 0,
		list   = null,
		all    = null,
		softs  = null,
		solids = null,
		groups = null,
		width  = camera.width,
		height = camera.height,
		x      = camera.left + width  / 2,
		y      = camera.top  + height / 2,
		buffer = camera.buffer * 2,
		entities = undefined,
		entity = undefined,
		check  = AABBCollision,
		aabbLogic     = this.cameraLogicAABB,
		aabbCollision = this.cameraCollisionAABB,
		types = null,
		createdGroupList = false;
		
		// store buffered size since the actual width x height is not used below.
		width += buffer * 2;
		height += buffer * 2;
		
		if(this.updateLiveList || !aabbLogic.matches(x, y, width, height)){
			
			aabbLogic.setAll(x, y, width, height);
			
			if(this.updateLiveList || !aabbCollision.contains(aabbLogic)){ //if the camera has not moved beyond the original buffer, we do not continue these calculations
				this.updateLiveList = false;

				all = this.allEntitiesLive;
				all.length = 0;
				
				solids = this.solidEntitiesLive;
				solids.length = 0;
				
				softs = this.softEntitiesLive;
				softs.length = 0;

				groups = this.groupsLive;
				groups.length = 0;
				createdGroupList = true;

				length = this.allEntities.length;// console.log(length);
				for (i = 0; i < length; i++){
					entity = this.allEntities[i];
					if(entity.checkCollision || check(entity.getAABB(), aabbLogic)){
						all[all.length] = entity;

						types = entity.collisionTypes;
						if(entity !== this.owner){
							if(!entity.immobile){
								for (j = 0; j < types.length; j++) {
									if(entity.solidCollisions[types[j]].length){
										solids[solids.length] = entity;
										break;
									}
								}
							}
							
							if(entity.getCollisionGroup){
								if(entity.getCollisionGroup().length > 1){
									groups[groups.length] = entity;
								}
							}
						}
						for (j = 0; j < types.length; j++) {
							if(entity.softCollisions[types[j]].length){
								softs[softs.length] = entity;
								break;
							}
						}
					} 
				}
				
				// add buffer again to capture stationary entities along the border that may be collided against 
				aabbCollision.setAll(x, y, width + buffer, height + buffer);
				
				for (i in this.entitiesByType){
					entities = this.entitiesByType[i];
					list = this.entitiesByTypeLive[i];
					list.length = 0;
					length = entities.length;
					for (j = 0; j < length; j++){
						entity = entities[j];
						if(entity.alwaysOn || check(entity.getAABB(), aabbCollision)){
							list[list.length] = entity;
						}
					}
				}
			}
		}
		
		if(!createdGroupList){ //If the camera has not moved, the groupings still need to be checked and updated.
			groups = this.groupsLive;
			groups.length = 0;

			length = this.allEntitiesLive.length;// console.log(length);
			for (i = 0; i < length; i++){
				entity = this.allEntitiesLive[i];
				if(entity !== this.owner){
					if(entity.getCollisionGroup){
						if(entity.getCollisionGroup().length > 1){
							groups[groups.length] = entity;
						}
					}
				}
			}
		}
	};

	proto.checkGroupCollisions = function (resp){
		var groups = this.groupsLive;
		if(groups.length > 0){
			this.groupCollisionMessage.deltaT = resp.deltaT;
			this.groupCollisionMessage.tick = resp.tick;
			this.groupCollisionMessage.camera = resp.camera;
			
			// values inherited from primary world collision group
			if(resp.terrain){
				this.groupCollisionMessage.terrain = resp.terrain;
			}
			if(resp.entities){
				this.groupCollisionMessage.entities = resp.entities;
			}
	
			for (var x = 0; x < groups.length; x++){
				groups[x].trigger('check-collision-group', this.groupCollisionMessage);
				groups[x].collisionUnresolved = true;
			}

			this.resolveCollisionList(groups, true, false, resp);
		}
	};

	proto.prepareCollisions = function (resp) {
		var entity = null;
		for (var x = this.allEntitiesLive.length - 1; x > -1; x--) {
			entity = this.allEntitiesLive[x];
			entity.collisionUnresolved = true;
			if(entity !== this.owner){
				entity.triggerEvent('prepare-for-collision', resp);
			}
		}
	};

	proto.resolveNonCollisions = function (resp) {
		var entity = null,
		xy         = xyPair;

		xy.relative = false;
		xy.xMomentum = 0;
		xy.yMomentum = 0;
		
		for (var x = this.allEntitiesLive.length - 1; x > -1; x--) {
			entity = this.allEntitiesLive[x];
			if(entity.collisionUnresolved){
				xy.x = entity.x;
				xy.y = entity.y;
				entity.trigger('relocate-entity', xy);
			}
		}
	};
	
	proto.checkSolidCollisions = function (resp, finalMovement){
		this.resolveCollisionList(this.solidEntitiesLive, false, finalMovement);
	};
	
	proto.resolveCollisionList = function(entities, group, finalMovement, resp){
		for (var x = entities.length - 1; x > -1; x--){
//		for (var x = 0; x < entities.length; x++){
			if(entities[x].collisionUnresolved){
				this.checkSolidEntityCollision(entities[x], group, finalMovement, resp);
				entities[x].collisionUnresolved = false;
			}
		}
	};
	
	proto.checkSolidEntityCollision = function(ent, groupCheck, finalMovement, resp){
		var i     = 0,
		y         = 0,
		z         = 0,
		initialX  = 0,
		initialY  = 0,
		xy        = xyPair,
		sweepAABB = tempAABB,
		collisionType = null,
		collisionGroup = ((groupCheck && ent.getCollisionGroup)?ent.getCollisionGroup():null),
		checkAABBCollision = AABBCollision,
		currentAABB  = null,
		previousAABB = null,
		otherEntity  = null,
		include      = false,
		potentialTiles = tempArray1,
		potentialsEntities = tempArray2,
		thatTypes    = tempArray3,
		thisTypes    = tempArray4,
		thisTileTypes= tempArray5,
		aabbOffsetX  = 0,
		aabbOffsetY  = 0,
		finalX       = null,
		finalY       = null,
		finalQ       = null,
		otherAABB    = null;
		
		potentialTiles.length = 0;
		potentialsEntities.length = 0;
		thatTypes.length = 0;
		thisTypes.length = 0;
		thisTileTypes.length = 0;

		if(groupCheck){
			currentAABB  = ent.getCollisionGroupAABB();
			previousAABB = ent.getPreviousCollisionGroupAABB();
			
			sweepAABB.reset();
			sweepAABB.include(currentAABB);
			sweepAABB.include(previousAABB);

			if(!ent.jumpThrough || (currentAABB.y < previousAABB.y)){
				for(; i < ent.collisionTypes.length; i++){
					collisionType = ent.collisionTypes[i];
					
					for (y = 0; y < ent.solidCollisions[collisionType].length; y++) {
						if(this.entitiesByTypeLive[ent.solidCollisions[collisionType][y]]){
							for(z = 0; z < this.entitiesByTypeLive[ent.solidCollisions[collisionType][y]].length; z++){
								include = true;
								otherEntity = this.entitiesByTypeLive[ent.solidCollisions[collisionType][y]][z];
								otherAABB = otherEntity.collisionUnresolved?otherEntity.getPreviousAABB(ent.solidCollisions[collisionType][y]):otherEntity.getAABB(ent.solidCollisions[collisionType][y]);
								if(collisionGroup){
									for(var i in collisionGroup){
										if(otherEntity === collisionGroup[i]){
											include = false;
										}
									}
								} else if (otherEntity === ent){
									include = false;
								} else if (otherEntity.jumpThrough && (previousAABB.bottom > otherAABB.top)) {
									include = false;
								} else if (ent.jumpThrough && (otherAABB.bottom > previousAABB.top)) {
									include = false;
								}
								if(include && (checkAABBCollision(sweepAABB, otherAABB))) {
									potentialsEntities[potentialsEntities.length] = otherEntity;
									otherEntity.currentCollisionType = ent.solidCollisions[collisionType][y]; //used for messaging later on
								}
							}
						} else if (this.terrain && (ent.solidCollisions[collisionType][y] === 'tiles')){
							potentialTiles = this.terrain.getTiles(sweepAABB, previousAABB);
						}
					}
				}
			}

			initialX  = previousAABB.x;//ent.getPreviousX();
			initialY  = previousAABB.y;//ent.getPreviousY();
			
			finalX = this.linearMovement(ent, 'x', previousAABB, currentAABB, groupCheck, collisionGroup, potentialTiles, potentialsEntities, null, null, null, resp);
			previousAABB.moveX(finalX);
			finalY = this.linearMovement(ent, 'y', previousAABB, currentAABB, groupCheck, collisionGroup, potentialTiles, potentialsEntities, null, null, null, resp);

			xy.relative = false;
			xy.xMomentum = currentAABB.x - finalX;
			xy.yMomentum = currentAABB.y - finalY;
			xy.x = finalX - initialX;
			xy.y = finalY - initialY;
			ent.trigger('relocate-group', xy);
		} else {
			for(; i < ent.collisionTypes.length; i++){
				collisionType = ent.collisionTypes[i];

				currentAABB  = ent.getAABB(collisionType);
				previousAABB = ent.getPreviousAABB(collisionType);

				if(!ent.jumpThrough || (currentAABB.y < previousAABB.y)){ //TODO: shouldn't do this here. Need to extend jumpthrough to handle different directions and forward motion - DDD

					sweepAABB.reset();
					sweepAABB.include(currentAABB);
					sweepAABB.include(previousAABB);

					for (y = 0; y < ent.solidCollisions[collisionType].length; y++) {
						if(this.entitiesByTypeLive[ent.solidCollisions[collisionType][y]]){
							for(z = 0; z < this.entitiesByTypeLive[ent.solidCollisions[collisionType][y]].length; z++){
								include = true;
								otherEntity = this.entitiesByTypeLive[ent.solidCollisions[collisionType][y]][z];
								otherAABB = otherEntity.collisionUnresolved?otherEntity.getPreviousAABB(ent.solidCollisions[collisionType][y]):otherEntity.getAABB(ent.solidCollisions[collisionType][y]);
								if (otherEntity === ent){
									include = false;
								} else if (otherEntity.jumpThrough && (previousAABB.bottom > otherAABB.top)) {
									include = false;
								} else if (ent.jumpThrough && (otherAABB.bottom > previousAABB.top)) { // This will allow platforms to hit something solid sideways if it runs into them from the side even though originally they were above the top. - DDD
									include = false;
								}
								if(include && (checkAABBCollision(sweepAABB, otherAABB))) {
									potentialsEntities[potentialsEntities.length] = otherEntity;
									thisTypes[thisTypes.length] = collisionType;
									thatTypes[thatTypes.length] = ent.solidCollisions[collisionType][y];
									//otherEntity.currentCollisionType = ent.solidCollisions[collisionType][y]; //used for messaging later on
								}
							}
						} else if (this.terrain && (ent.solidCollisions[collisionType][y] === 'tiles')){
							potentialTiles = this.terrain.getTiles(sweepAABB, previousAABB);
							for(z = 0; z < potentialTiles.length; z++){
								thisTileTypes[thisTileTypes.length] = collisionType;
							}
						}
					}
				}
			}

			diff = null;
			for(i = 0; i < ent.collisionTypes.length; i++){
				collisionType = ent.collisionTypes[i];
				currentAABB  = ent.getAABB(collisionType); //<-- do this inside lienar movement
				previousAABB = ent.getPreviousAABB(collisionType); //ditto
				initialX  = previousAABB.x;//ent.getPreviousX();
				aabbOffsetX = initialX - ent.getPreviousX(collisionType);//previousAABB.x - initialX;
				finalQ = this.linearDifference(ent, 'x', previousAABB, currentAABB, initialX, potentialTiles, potentialsEntities, thisTypes, thatTypes, thisTileTypes);
				if(finalQ !== false){
					finalX = finalQ;
					xy.x = finalX - aabbOffsetX;
					if(finalMovement){
						xy.xMomentum = 0;
					} else {
						xy.xMomentum = currentAABB.x - finalX;
					}
				}
			}

			diff = null;
			for(i = 0; i < ent.collisionTypes.length; i++){
				collisionType = ent.collisionTypes[i];
				currentAABB  = ent.getAABB(collisionType);
				previousAABB = ent.getPreviousAABB(collisionType);
				previousAABB.moveX(finalX);
				initialY  = previousAABB.y;//ent.getPreviousY();
				aabbOffsetY = initialY - ent.getPreviousY(collisionType);//previousAABB.y - initialY;
				finalQ = this.linearDifference(ent, 'y', previousAABB, currentAABB, initialY, potentialTiles, potentialsEntities, thisTypes, thatTypes, thisTileTypes);
				if(finalQ !== false){
					finalY = finalQ;
					xy.y = finalY - aabbOffsetY;
					if(finalMovement){
						xy.yMomentum = 0;
					} else {
						xy.yMomentum = currentAABB.y - finalY;
					}
				}
			}

			xy.relative = false;
			ent.trigger('relocate-entity', xy);
		}
	};
	
	proto.linearDifference = function(ent, axis, previousAABB, currentAABB, initial, potentialTiles, potentialsEntities, thisTypes, thatTypes, thisTileTypes){
		var finalPoint      = this.linearMovement(ent, axis, previousAABB, currentAABB, false, false, potentialTiles, potentialsEntities, thisTypes, thatTypes, thisTileTypes);
		
		if((diff !== null) && (Math.abs(finalPoint - initial) > diff)){
			return false;
		} else {
			diff = Math.abs(finalPoint - initial);
			return finalPoint;
		}
	};
	
	proto.linearMovement = function (ent, axis, previousAABB, currentAABB, groupCheck, collisionGroup, tiles, entities, thisCollisionTypes, thatCollisionTypes, tileCollisionTypes)	{
		var xStep        = 0,
		yStep            = 0,
		initialPoint     = previousAABB[axis],
		goalPoint        = currentAABB[axis],
		step             = (initialPoint < goalPoint) ? 1 : -1,
		tileCollision    = tileCollisionMessage,
		entityCollision  = entityCollisionMessage;
		
		tileCollision.aABB = null;
		tileCollision.x    = null;
		tileCollision.y    = null;
		entityCollision.aABB = null;
		entityCollision.x  = null;
		entityCollision.y  = null;

		if(tiles.length || entities.length) {
			if(collisionGroup){
				for(var i in collisionGroup){
					collisionGroup[i][axis] += goalPoint - initialPoint;
					collisionGroup[i].triggerEvent('prepare-for-collision');
				}
			}
			
			if(axis === 'x'){
				previousAABB.moveX(goalPoint);
				xStep = step;
			} else if(axis === 'y'){
				previousAABB.moveY(goalPoint);
				yStep = step;
			}
			
			//CHECK AGAINST TILES
			for (var t = 0; t < tiles.length; t++) {
				checkAgainst(ent, previousAABB, tiles[t], tiles[t].shapes[0].getAABB(), xStep, yStep, tileCollision, collisionGroup, (tileCollisionTypes || emptyArray)[t]);
			}
			
			//CHECK AGAINST SOLID ENTITIES
			for (var u = 0; u < entities.length; u++) {
				checkAgainst(ent, previousAABB, entities[u], entities[u].collisionUnresolved?entities[u].getPreviousAABB(entities[u].currentCollisionType):entities[u].getAABB(entities[u].currentCollisionType), xStep, yStep, entityCollision, collisionGroup, (thisCollisionTypes || emptyArray)[u], (thatCollisionTypes || emptyArray)[u]);
			}
			
			if((entityCollision[axis] !== null) && (((step > 0) && (!tileCollision.aABB || (entityCollision[axis] < tileCollision[axis]))) || ((step < 0) && (!tileCollision.aABB || (entityCollision[axis] > tileCollision[axis]))))){
				if(!groupCheck){
					triggerCollisionMessages(ent, entityCollision, xStep, yStep, 'solid');
				}
					
				if(((entityCollision[axis] > initialPoint) && (step > 0)) || ((entityCollision[axis] < initialPoint) && (step < 0))){
					return entityCollision[axis];
				} else {
					return initialPoint;
				}
			} else if(tileCollision.aABB){
				if(!groupCheck){
					triggerTileCollisionMessage(ent, tileCollision.shape, xStep, yStep, tileCollision.thisType);
				}

				if(((tileCollision[axis] > initialPoint) && (step > 0)) || ((tileCollision[axis] < initialPoint) && (step < 0))){
					return tileCollision[axis];
				} else {
					return initialPoint;
				}
			}
		}
		
		return goalPoint;
	};
	
	proto.checkSoftCollisions = function (resp)	{
		var otherEntity = undefined,
		ent = undefined,
		message = triggerMessage,
		i   = 0,
		x   = 0,
		y   = 0,
		z   = 0,
		checkAABBCollision = AABBCollision,
		softCollisions = null,
		otherEntities  = null,
		otherCollisionType = null;

		message.x = 0;
		message.y = 0;
		
		for(x = 0; x < this.softEntitiesLive.length; x++){
			ent = this.softEntitiesLive[x];
			for (i = 0; i < ent.collisionTypes.length; i++){
				softCollisions = ent.softCollisions[ent.collisionTypes[i]];
				for (y = 0; y < softCollisions.length; y++){
					otherCollisionType = softCollisions[y];
					otherEntities = this.entitiesByTypeLive[otherCollisionType]; 
					if(otherEntities){
						for(z = 0; z < otherEntities.length; z++){
							otherEntity = otherEntities[z];
							if((otherEntity !== ent) && (checkAABBCollision(ent.getAABB(ent.collisionTypes[i]), otherEntity.getAABB(otherCollisionType)))) {
								if (preciseCollision(ent, otherEntity)){
									message.entity = otherEntity;
									message.type   = otherCollisionType;
									message.myType = ent.collisionTypes[i];
									message.shape  = otherEntity.shape;
									message.hitType= 'soft';
									ent.trigger('hit-by-' + otherCollisionType, message);
									message.debug = false;
								}
							}
						}
					}
				}
			}
		}
	};
	
	proto['relocate-group'] = function(resp){
		var xy = xyPair;
		this.xMomentum = resp.xMomentum;
		this.yMomentum = resp.yMomentum;
		xy.x = resp.x;
		xy.y = resp.y;
		xy.xMomentum = 0;
		xy.yMomentum = 0;
		xy.relative = true;
		for (var i = 0; i < this.solidEntities.length; i++){
			this.solidEntities[i].trigger('relocate-entity', xy);
		}
		this.aabb.reset();
		for (var x = 0; x < this.solidEntities.length; x++){
			this.aabb.include(((this.solidEntities[x] !== this.owner) && this.solidEntities[x].getCollisionGroupAABB)?this.solidEntities[x].getCollisionGroupAABB():this.solidEntities[x].getAABB());
		}
//		if(test) console.log('rlc: ' + this.aabb.y);
		this.resolveMomentum();
	};
	
//	var test = false;
	
	proto['relocate-entity'] = function(resp){
		this.lastX = this.owner.x;
		this.lastY = this.owner.y;
		
/*		if(test || (this.allEntitiesLive.length > 1)){
			test = true;
			console.log('r0' + this.tester + ': ' + this.lastY + ': ' + this.allEntitiesLive.length);
			this.tester += 1;
		}*/
	};
	
	proto.resolveMomentum = function(){
		for (var x = 0; x < this.solidEntities.length; x++){
			this.solidEntities[x].trigger('resolve-momentum');
			this.solidEntities[x].x += this.xMomentum;
			this.solidEntities[x].y += this.yMomentum;
		}
		this.xMomentum = 0;
		this.yMomentum = 0;
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
		this.solidEntities.length = 0;
		this.softEntities.length = 0;
		for (var i in this.entitiesByType){
			this.entitiesByType[i].length = 0;
		}
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/
	
	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();













/*--------------------------------------------------
 *   audio - ../engine/components/audio.js
 */
/**
# COMPONENT **audio**
This component plays audio. Audio is played in one of two ways, by triggering specific messages defined in the audio component definition or using an audio map which plays sounds when the entity enters specified states (like render-animation).

## Dependencies:
- [createjs.SoundJS] [link1] - This component requires the SoundJS library to be included for audio functionality.
- [[Handler-Render]] (on entity's parent) - This component listens for a render "tick" message in order to stop audio clips that have a play length set.

## Messages

### Listens for:
- **handle-render** - On each `handle-render` message, this component checks its list of playing audio clips and stops any clips whose play length has been reached.
  > @param message.deltaT (number) - uses the value of deltaT (time since last `handle-render`) to track progess of the audio clip and stop clip if play length has been reached.
- **audio-mute-toggle** - On receiving this message, the audio will mute if unmuted, and unmute if muted.
  > @param message (string) - If a message is included, a string is expected that specifies an audio id, and that particular sound instance is toggled. Otherwise all audio is toggled from mute to unmute or vice versa.
- **audio-mute** - On receiving this message all audio will mute, or a particular sound instance will mute if an id is specified.
  > @param message (string) - If a message is included, a string is expected that specifies an audio id, and that particular sound instance is muted.
- **audio-unmute** - On receiving this message all audio will unmute, or a particular sound instance will unmute if an id is specified.
  > @param message (string) - If a message is included, a string is expected that specifies an audio id, and that particular sound instance is unmuted.
- **audio-stop** - On receiving this message all audio will stop playing.
- **logical-state** - This component listens for logical state changes and tests the current state of the entity against the audio map. If a match is found, the matching audio clip is played.
  > @param message (object) - Required. Lists various states of the entity as boolean values. For example: {jumping: false, walking: true}. This component retains its own list of states and updates them as `logical-state` messages are received, allowing multiple logical components to broadcast state messages.
- **[Messages specified in definition]** - Listens for additional messages and on receiving them, begins playing corresponding audio clips. Audio play message can optionally include several parameters, many of which correspond with [SoundJS play parameters] [link2].
  > @param message.interrupt (string) - Optional. Can be "any", "early", "late", or "none". Determines how to handle the audio when it's already playing but a new play request is received. Default is "any".
  > @param message.delay (integer) - Optional. Time in milliseconds to wait before playing audio once the message is received. Default is 0.
  > @param message.offset (integer) - Optional. Time in milliseconds determining where in the audio clip to begin playback. Default is 0.
  > @param message.length (integer) - Optional. Time in milliseconds to play audio before stopping it. If 0 or not specified, play continues to the end of the audio clip.
  > @param message.loop (integer) - Optional. Determines how many more times to play the audio clip once it finishes. Set to -1 for an infinite loop. Default is 0.
  > @param message.volume (float) - Optional. Used to specify how loud to play audio on a range from 0 (mute) to 1 (full volume). Default is 1.
  > @param message.pan (float) - Optional. Used to specify the pan of audio on a range of -1 (left) to 1 (right). Default is 0.
  > @param message.next (string) - Optional. Used to specify the next audio clip to play once this one is complete.

## JSON Definition:
    {
      "type": "audio",
      
      "audioMap":{
      // Required. Use the audioMap property object to map messages triggered with audio clips to play. At least one audio mapping should be included for audio to play.
      
        "message-triggered": "audio-id",
        // This simple form is useful to listen for "message-triggered" and play "audio-id" using default audio properties.
        
        "another-message": {
        // To specify audio properties, instead of mapping the message to an audio id string, map it to an object with one or more of the properties shown below. Many of these properties directly correspond to [SoundJS play parameters] (http://www.createjs.com/Docs/SoundJS/SoundJS.html#method_play).
        
          "sound": "another-audio-id",
          // Required. This is the audio clip to play when "another-message" is triggered.
          
          "interrupt": "none",
          // Optional. Can be "any", "early", "late", or "none". Determines how to handle the audio when it's already playing but a new play request is received. Default is "any".
          
          "delay": 500,
          // Optional. Time in milliseconds to wait before playing audio once the message is received. Default is 0.
          
          "offset": 1500,
          // Optional. Time in milliseconds determining where in the audio clip to begin playback. Default is 0.
          
          "length": 2500,
          // Optional. Time in milliseconds to play audio before stopping it. If 0 or not specified, play continues to the end of the audio clip.

          "loop": 4,
          // Optional. Determines how many more times to play the audio clip once it finishes. Set to -1 for an infinite loop. Default is 0.
          
          "volume": 0.75,
          // Optional. Used to specify how loud to play audio on a range from 0 (mute) to 1 (full volume). Default is 1.
          
          "pan": -0.25,
          // Optional. Used to specify the pan of audio on a range of -1 (left) to 1 (right). Default is 0.

          "next": ["audio-id"]
          // Optional. Used to specify a list of audio clips to play once this one is finished.
        }
      }
    }

[link1]: http://www.createjs.com/Docs/SoundJS/module_SoundJS.html
[link2]: http://www.createjs.com/Docs/SoundJS/SoundJS.html#method_play
*/
platformer.components['audio'] = (function(){
	var defaultSettings = {
		interrupt: createjs.Sound.INTERRUPT_ANY, //INTERRUPT_ANY, INTERRUPT_EARLY, INTERRUPT_LATE, or INTERRUPT_NONE
		delay:     0,
		offset:    0,
		loop:      0,
		volume:    1,
		pan:       0,
		length:    0,
		next:      false
	},
	stop = {
		stop: true,
		playthrough: true
	},
	playSound = function(soundDefinition){
		var sound = '',
		attributes = undefined,
		instance = null;
		if(typeof soundDefinition === 'string'){
			sound      = soundDefinition;
			attributes = {};
		} else {
			sound      = soundDefinition.sound;
			attributes = soundDefinition;
		}
		if(platformer.settings.assets[sound].data){
			for(var item in platformer.settings.assets[sound].data){
				attributes[item] = attributes[item] || platformer.settings.assets[sound].data[item];
			}
		}
		if(platformer.settings.assets[sound].assetId){
			sound = platformer.settings.assets[sound].assetId;
		}
		return function(value){
			var self = this,
			audio = undefined,
			next = false,
			length    = 0;
			
			value = value || attributes;
			if(value && value.stop){
				if(instance) {
					if(value.playthrough){
						instance.remainingLoops = 0;
					} else {
						instance.stop();
						for (var i in self.activeAudioClips){
							if (self.activeAudioClips[i] === instance){
								self.activeAudioClips.splice(i,1);
								break;
							}
						}
					}
				}
			} else {
				if(value){
					var interrupt = value.interrupt || attributes.interrupt || defaultSettings.interrupt,
					delay         = value.delay     || attributes.delay  || defaultSettings.delay,
					offset        = value.offset    || attributes.offset || defaultSettings.offset,
					loop          = value.loop      || attributes.loop   || defaultSettings.loop,
					volume        = (typeof value.volume !== 'undefined')? value.volume: ((typeof attributes.volume !== 'undefined')? attributes.volume: defaultSettings.volume),
					pan           = value.pan       || attributes.pan    || defaultSettings.pan,
					length        = value.length    || attributes.length || defaultSettings.length;
					
					next          = value.next      || attributes.next   || defaultSettings.next;
					
					audio = instance = createjs.Sound.play(sound, interrupt, delay, offset, loop, volume, pan);
					
				} else {
					audio = instance = createjs.Sound.play(sound, defaultSettings.interrupt, defaultSettings.delay, defaultSettings.offset, defaultSettings.loop, defaultSettings.volume, defaultSettings.pan);
				}

				if(next){
					audio.addEventListener('complete', function(){
						if((typeof next === 'string') || !next.length){
							self.owner.trigger(next);
						} else {
							var arr = next.slice();
							arr.splice(0,1);
							if(arr.length > 0){
								(playSound(next[0])).call(self, {'next': arr});
//								self.owner.trigger(next[0], {'next': arr});
							} else {
								(playSound(next[0])).call(self);
//								self.owner.trigger(next[0]);
							}
						}

						for (var i in self.activeAudioClips){
							if (self.activeAudioClips[i] === audio){
								self.activeAudioClips.splice(i,1);
								break;
							}
						}
					});
				} else {
					audio.addEventListener('complete', function(){
						for (var i in self.activeAudioClips){
							if (self.activeAudioClips[i] === audio){
								self.activeAudioClips.splice(i,1);
								break;
							}
						}
					});
				}

				if(audio.playState === 'playFailed'){
					if(this.owner.debug){
						console.warn('Unable to play "' + sound + '".', audio);
					}
				} else {
					if(length){ // Length is specified so we need to turn off the sound at some point.
						this.timedAudioClips.push({length: length, progress: 0, audio: audio, next: next});
					}
					this.activeAudioClips.push(audio);
				}
			}
		};
	},
	createTest = function(testStates, audio){
		var states = testStates.replace(/ /g, '').split(',');
		if(testStates === 'default'){
			return function(state){
				return testStates;
			};
		} else {
			return function(state){
				for(var i = 0; i < states.length; i++){
					if(!state[states[i]]){
						return false;
					}
				}
				return testStates;
			};
		}
	},
	component = function(owner, definition){
		this.owner = owner;
		this.timedAudioClips = [];
		this.activeAudioClips = [];		

		// Messages that this component listens for
		this.listeners = [];
		this.addListeners(['handle-render', 'audio-mute-toggle', 'audio-mute', 'audio-unmute', 'audio-stop', 'logical-state']);

		this.state = {};
		this.stateChange = false;
		this.currentState = false;

		this.forcePlaythrough = this.owner.forcePlaythrough || definition.forcePlaythrough;
		if(typeof this.forcePlaythrough !== 'boolean') {
			this.forcePlaythrough = true;
		}
		
		if(definition.audioMap){
			this.checkStates = [];
			for (var key in definition.audioMap){
				this.addListener(key);
				this[key] = playSound(definition.audioMap[key]);
				this.checkStates.push(createTest(key, definition.audioMap[key]));
			}
		}
	};
	var proto = component.prototype;
	
	proto['handle-render'] = function(resp){
		if (this.destroyMe && this.timedAudioClips.length == 0)
		{
			this.timedAudioClips = undefined;
			this.removeListeners(this.listeners);
		} else {
			var i     = 0,
			audioClip = undefined;
			newArray  = undefined;
			if(this.timedAudioClips.length){
				newArray = this.timedAudioClips;
				this.timedAudioClips = [];
				for (i in newArray){
					audioClip = newArray[i];
					audioClip.progress += resp.deltaT;
					if(audioClip.progress >= audioClip.length){
						audioClip.audio.stop();
						if(audioClip.next){
							if((typeof audioClip.next === 'string') || !audioClip.next.length){
								this.owner.trigger(audioClip.next);
							} else {
								var arr = audioClip.next.slice();
								arr.splice(0,1);
								if(arr.length > 0){
									(playSound(audioClip.next[0])).call(this, {'next': arr});
//									this.owner.trigger(audioClip.next[0], {'next': arr});
								} else {
									(playSound(audioClip.next[0])).call(this);
//									this.owner.trigger(audioClip.next[0]);
								}
							}
						}
					} else {
						this.timedAudioClips.push(audioClip);
					}
				}
//				this.timedAudioClips = newArray;
			}

			i = 0;
			if(this.stateChange){
				if(this.checkStates){
					if(this.currentState){
						stop.playthrough = this.forcePlaythrough;
						this[this.currentState](stop);
					}
					this.currentState = false;
					for(; i < this.checkStates.length; i++){
						audioClip = this.checkStates[i](this.state);
						if(audioClip){
							this.currentState = audioClip;
							this[this.currentState]();
							break;
						}
					}
				}
				this.stateChange = false;
			}
			
//			if(this.currentState){
//				this[this.currentState]();
//			}
		}
	};

	proto['logical-state'] = function(state){
		for(var i in state){
			if(this.state[i] !== state[i]){
				this.stateChange = true;
				this.state[i] = state[i];
			}
		}
	};
	
	proto['audio-mute-toggle'] = function(){
		createjs.Sound.setMute(!createjs.Sound.getMute());
	};
	
	proto['audio-stop'] = function(){
		for (var i in this.activeAudioClips){
			this.activeAudioClips[i].stop();
		}
		this.activeAudioClips.length = 0;
		this.timedAudioClips.length = 0;
	};

	proto['audio-mute'] = function(){
		createjs.Sound.setMute(true);
	};
	
	proto['audio-unmute'] = function(){
		createjs.Sound.setMute(false);
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		//Handling things in 'render'
		this.destroyMe = true;
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   broadcast-events - ../engine/components/broadcast-events.js
 */
/**
# COMPONENT **broadcast-events**
This component listens for specified local entity messages and re-broadcasts them on itself, its parent entity, or at the game level.
> **Note:** Make sure that this component is never set up to receive and broadcast identical messages or an infinite loop will result, since it will receive the same message it sent.

## Dependencies:
- [[Entity-Container]] (on entity's parent) - This component can broadcast messages to its parent; `this.parent` is commonly specified by being a member of an entity container.

## Messages

### Listens for:
- **[Messages specified in definition]** - Listens for specified messages and on receiving them, re-triggers them as new messages.
  > @param message (object) - accepts a message object that it will include in the new message to be triggered.

### Local Broadcasts:
- **[Messages specified in definition]** - Listens for specified messages and on receiving them, re-triggers them as new messages on the entity.
  > @param message (object) - sends the message object received by the original message.

### Parent Broadcasts:
- **[Messages specified in definition]** - Listens for specified messages and on receiving them, re-triggers them as new messages on the entity's parent if one exists.
  > @param message (object) - sends the message object received by the original message.

### Game Broadcasts:
- **[Messages specified in definition]** - Listens for specified messages and on receiving them, re-triggers them as new messages at the top game level.
  > @param message (object) - sends the message object received by the original message.

## JSON Definition:
    {
      "type": "broadcast-events",
      
      // One of the following event mappings must be specified: "events", "parentEvents", or "renameEvents".
      
      "events": {
      // Optional: Maps local messages to trigger global game messages. At least one of the following mappings should be included.
        
        "local-message-1": "global-game-message",
        // On receiving "local-message-1", triggers "global-game-message" at the game level.
        
        "local-message-2": ["multiple", "messages", "to-trigger"]
        // On receiving "local-message-2", triggers each message in the array in sequence at the game level.
      }
      
      "parentEvents": {
      // Optional: Maps local messages to trigger messages on the entity's parent. At least one of the following mappings should be included.
        
        "local-message-3": "parent-message",
        // On receiving "local-message-3", triggers "parent-message" on the entity's parent.
        
        "local-message-4": ["multiple", "messages", "to-trigger"]
        // On receiving "local-message-4", triggers each message in the array in sequence on the entity's parent.
      }
      
      "renameEvents": {
      // Optional: Maps local messages to trigger alternative messages on the entity itself. This can be useful as a basic fill-in for a logic component to translate an outgoing message from one component into an incoming message for another. At least one of the following mappings should be included.
        
        "local-message-5": "another-local-message",
        // On receiving "local-message-5", triggers "another-local-message" on the entity itself.
        
        "local-message-6": ["multiple", "messages", "to-trigger"]
        // On receiving "local-message-6", triggers each message in the array in sequence on the entity itself.
      }
    }
*/
platformer.components['broadcast-events'] = (function(){
	var gameBroadcast = function(event){
		if(typeof event === 'string'){
			return function(value, debug){
				platformer.game.currentScene.trigger(event, value, debug);
			};
		} else {
			return function(value, debug){
				for (var e in event){
					platformer.game.currentScene.trigger(event[e], value, debug);
				}
			};
		}
	};
	
	var parentBroadcast = function(event){
		if(typeof event === 'string'){
			return function(value, debug){
				if(this.owner.parent)
				{
					this.owner.parent.trigger(event, value, debug);
				}
				
			};
		} else {
			return function(value, debug){
				for (var e in event){
					this.owner.parent.trigger(event[e], value, debug);
				}
			};
		}
	};
	
	var entityBroadcast = function(event){
		if(typeof event === 'string'){
			return function(value, debug){
				this.owner.trigger(event, value, debug);
			};
		} else {
			return function(value, debug){
				for (var e in event){
					this.owner.trigger(event[e], value, debug);
				}
			};
		}
	};
	
	var component = function(owner, definition){
		this.owner = owner;

		// Messages that this component listens for and then broadcasts to all layers.
		this.listeners = [];
		if(definition.events){
			for(var event in definition.events){
				this[event] = gameBroadcast(definition.events[event]);
				this.addListener(event);
			}
		}
		
		if(definition.parentEvents){
			for(var event in definition.parentEvents){
				this[event] = parentBroadcast(definition.parentEvents[event]);
				this.addListener(event);
			}
		}
		
		// Messages that this component listens for and then triggers on itself as a renamed message - useful as a logic place-holder for simple entities.
		if(definition.renameEvents){
			for(var event in definition.renameEvents){
				this[event] = entityBroadcast(definition.renameEvents[event]);
				this.addListener(event);
			}
		}
	};
	var proto = component.prototype;
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   change-scene - ../engine/components/change-scene.js
 */
/**
# COMPONENT **change-scene**
This component allows the entity to initiate a change from the current scene to another scene.

## Messages

### Listens for:
- **new-scene** - On receiving this message, a new scene is loaded according to provided parameters or previously determined component settings.
  > @param message.scene (string) - This is a label corresponding with a predefined scene.
  > @param message.transition (string) - This can be "instant" or "fade-to-black". Defaults to an instant transition.
  > @param message.persistentData (object) - Any JavaScript value(s) that should be passed to the next scene via the "scene-loaded" call.
- **set-scene** - On receiving this message, a scene value is stored, waiting for a `new-scene` to make the transition.
  > @param scene (string) - This is a label corresponding with a predefined scene.
- **set-persistent-scene-data** - On receiving this message, persistent data is stored, waiting for a `new-scene` to make the transition.
  > @param persistentData (object) - Any JavaScript value(s) that should be passed to the next scene via the "scene-loaded" call.

## JSON Definition:
    {
      "type": "change-scene",
      
      "scene": "scene-menu",
      // Optional (but must be provided by a "change-scene" parameter if not defined here). This causes the "new-scene" trigger to load this scene.
      
      "transition": "fade-to-black",
      // Optional. This can be "instant" or "fade-to-black". Defaults to an "instant" transition.
      
      "persistentData": {"runningScore": 1400}
      // Optional. An object containing key/value pairs of information that should be passed into the new scene on the new scenes "scene-loaded" call.
    }
*/
(function(){
	return platformer.createComponentClass({
		id: 'change-scene',
		
		constructor: function(definition){
			this.scene = this.owner.scene || definition.scene;
			this.transition = this.owner.transition || definition.transition || 'instant';
			this.persistentData = {};
			
			if(definition.message){
				this.addListener(definition.message);
				this[definition.message] = this['new-scene'];
			}
		},

		events: {
			"new-scene": function(response){
				var resp   = response || this,
				scene      = resp.scene || this.scene,
				transition = resp.transition || this.transition;
				data 	   = resp.persistentData || this.persistentData;
			
				platformer.game.loadScene(scene, transition, data);
			},
			"set-scene": function(scene){
				this.scene = scene;
			},
			"set-persistent-scene-data": function(dataObj){
				for (var x in dataObj)
				{
					this.persistentData[x] = dataObj[x];    
				}
			}
		}
	});
})();


/*--------------------------------------------------
 *   destroy-me - ../engine/components/destroy-me.js
 */
/**
# COMPONENT **destroy-me**
This component will cause the entity to remove itself from its parent upon receiving a given message.

## Dependencies:
- [[Entity-Container]] (on entity's parent) - This component requires the entity to have `entity.parent` defined as the entity containing this entity. This is commonly provided by an [[Entity-Container]] on the parent entity.

## Messages

### Listens for:
- **destroy-me** - On receiving this message, the component removes this entity from the parent, which typically destroys the entity.
- **[Message specified in definition]** - An alternative message can be specified in the JSON definition that will also cause the entity's removal.

## JSON Definition:
    {
      "type": "destroy-me",
      
      "message": "hit-by-wrench",
      // Optional: If specified, this message will cause the entity to be removed in addition to a "destroy-me" message.
      
      "delay": 250
      // Optional: Time in milliseconds before entity should be destroyed. If not defined, it is instantaneous.
    }

*/
platformer.components['destroy-me'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];
		this.addListeners(['destroy-me']);
		
		if(definition.message){
			this.addListener(definition.message);
			this[definition.message] = this['destroy-me'];
		}
		
		this.destroyed = false;
		this.delay = definition.delay || 0;
	};
	var proto = component.prototype;
	
	proto['destroy-me'] = function(){
		var self = this;
		if(!this.destroyed){
			setTimeout(function(){
				self.owner.parent.removeEntity(self.owner);
			}, this.delay);
		}
		this.destroyed = true;
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   dom-element - ../engine/components/dom-element.js
 */
/**
# COMPONENT **dom-element**
This component creates a DOM element associated with the entity. In addition to allowing for CSS styling, the element can also perform as a controller accepting click and touch inputs and triggering associated messages on the entity.

## Dependencies:
- [[Handler-Render-Dom]] (on entity's parent) - This component listens for a render "handle-render-load" message with a DOM element to setup and display the element.

## Messages

### Listens for:
- **handle-render-load** - This event provides the parent DOM element that this component will require for displaying its DOM element.
  > @param message.element (DOM element) - Required. Provides the render component with the necessary DOM element parent.
- **handle-render** - On each `handle-render` message, this component checks to see if there has been a change in the state of the entity. If so (and updateClassName is set to true in the JSON definition) it updates its className accordingly.
- **logical-state** - This component listens for logical state changes and updates its local record of states.
  > @param message (object) - Required. Lists various states of the entity as boolean values. For example: {jumping: false, walking: true}. This component retains its own list of states and updates them as `logical-state` messages are received, allowing multiple logical components to broadcast state messages.
- **update-content** - This message updates the innerHTML of the DOM element.
  > @param message.text (string) - Required. The text that should replace the DOM element's innerHTML.
- **set-parent** - This message appends the element to the provided parent element.
  > @param parent (DOM Element) - Required. The DOM Element that this element should be appended to.
- **set-attribute** - This message updates an attribute of the DOM element.
  > @param message.attribute (string) - Required. The attribute that is to be changed.
  > @param message.value (string) - Required. The value the changed attribute should have.
- **set-style** - This message updates the style of the DOM element.
  > @param message.attribute (string) - Required. The CSS attribute that is to be changed.
  > @param message.value (string) - Required. The value the changed CSS attribute should have.

### Local Broadcasts:
- **[Messages specified in definition]** - Element event handlers will trigger messages as defined in the JSON definition.
  > @param message (DOM Event object) - When messages are triggered on the entity, the associated message object is the DOM Event object that was provided to the originating DOM Event handler.

## JSON Definition
    {
      "type": "dom-element",

      "element": "div",
      //Required. Sets what type of DOM element should be created.
      
      "innerHTML": "Hi!",
      //Optional. Sets the DOM element's inner text or HTML.
      
      "className": "top-band",
      //Optional. Any standard properties of the element can be set by listing property names and their values. "className" is one example, but other element properties can be specified in the same way.
      
      "updateClassName": true,
      //Optional. Specifies whether the className of the DOM element should be updated to reflect the entity's logical state. This setting will cause the className to equal its setting above followed by a space-delimited list of its `true` valued state names.
      
      "onmousedown": "turn-green",
      //Optional. If specified properties begin with "on", it is assumed that the property is an event handler and the listed value is broadcast as a message on the entity where the message object is the event handler's event object.

      "onmouseup": ["turn-red", "shout"]
      //Optional. In addition to the event syntax above, an Array of strings may be provided, causing multiple messages to be triggered in the order listed.
    }
*/
(function(){
	var createFunction = function(message, entity){
		if(typeof message === 'string'){
			return function(e){
				entity.trigger(message, e);
				e.preventDefault();
			};
		} else {
			return function(e){
				for (var i = 0; i < message.length; i++){
					entity.trigger(message[i], e);
				}
				e.preventDefault();
			};
		}
	};
	
	return platformer.createComponentClass({
		id: 'dom-element',
		constructor: function(definition){
			var elementType = definition.element   || 'div';
			
			this.updateClassName = definition.updateClassName || false;
			this.className = '';
			this.states = {};
			this.stateChange = false;
			
			this.element = document.createElement(elementType);
			if(!this.owner.element){
				this.owner.element = this.element;
			}
			this.element.ondragstart = function() {return false;}; //prevent element dragging by default
	
			if(definition.parent){
				this.parentElement = document.getElementById(definition.parent);
				this.parentElement.appendChild(this.element);
			}
			
			for(var i in definition){
				if(i === 'style'){
					for(var j in definition[i]){
						this.element.style[j] = definition[i][j]; 
					}
				} else if((i !== 'type') && (i !== 'element') && (i !== 'parent') && (i !== 'updateClassName') && (i !== 'attributes') && (i !== 'messageMap')){
					if(i.indexOf('on') === 0){
						this.element[i] = createFunction(definition[i], this.owner);
					} else {
						this.element[i] = definition[i];
						if(i == 'className'){
							this.className = definition[i];
						}
					}
				}
			}
			
			if(this.owner.className){
				this.className = this.element.className = this.owner.className;
			}
			if(this.owner.innerHTML){
				this.element.innerHTML = this.owner.innerHTML;
			}
			
			if(definition.messageMap)
			{
				for (var j = 0 ; j < definition.messageMap.length; j++)
				{
					if (this[definition.messageMap[j][0]] && definition.messageMap[j][1])
					{
						this[definition.messageMap[j][1]] = this[definition.messageMap[j][0]];
						this.addListener(definition.messageMap[j][1]);
					}
				}
			}
		},
		events:{
			"handle-render-load": function(resp){
				if(resp.element){
					if(!this.parentElement){
						this.parentElement = resp.element;
						this.parentElement.appendChild(this.element);
					}
		
					if(this.owner.entities){
						var message = {};
						for (var item in resp){
							message[item] = resp[item];
						}
						message.element = this.element;
						for (var entity in this.owner.entities){
							this.owner.entities[entity].trigger('handle-render-load', message);
						}
					}
				}
			},
			
			"set-parent": function(element){
				if(this.parentElement){
					this.parentElement.removeChild(this.element);
				}
				this.parentElement = element;
				this.parentElement.appendChild(this.element);
			},
			
			"handle-render": function(resp){
				var i     = 0,
				className = this.className;
				
				if(this.stateChange && this.updateClassName){
					for(i in this.states){
						if(this.states[i]){
							className += ' ' + i;
						}
					}
					this.element.className = className;
					this.stateChange = false;
				}
			},
			
			"set-attribute": function(resp){
				this.element.setAttribute(resp.attribute, resp.value);
			},
			
			"set-style": function(resp){
				this.element.style[resp.attribute] = resp.value;
			},
			
			"update-content": function(resp){
				if(resp && (typeof resp.text == 'string') && (resp.text !== this.element.innerHTML)){
					this.element.innerHTML = resp.text;
				}
			},
		
			"logical-state": function(state){
				for(var i in state){
					if(this.states[i] !== state[i]){
						this.stateChange = true;
						this.states[i] = state[i];
					}
				}
			}
		},
		methods: {
			destroy: function(){
				if(this.parentElement){
					this.parentElement.removeChild(this.element);
					this.parentElement = undefined;
				}
				if(this.owner.element === this.element){
					this.owner.element = undefined;
				}
				this.element = undefined;
			}
		}
	});
})();


/*--------------------------------------------------
 *   entity-container - ../engine/components/entity-container.js
 */
/**
# COMPONENT **entity-container**
This component allows the entity to contain child entities. It will add several methods to the entity to manage adding and removing entities.

## Messages

### Listens for:
- **load** - This component waits until all other entity components are loaded before it begins adding children entities. This allows other entity components to listen to entity-added messages and handle them if necessary.
- **add-entity** - This message will added the given entity to this component's list of entities.
  > @param message ([[Entity]] object) - Required. This is the entity to be added as a child.
- **remove-entity** - On receiving this message, the provided entity will be removed from the list of child entities.
  > @param message ([[Entity]] object) - Required. The entity to remove.
- **[Messages specified in definition]** - Listens for specified messages and on receiving them, re-triggers them on child entities.
  > @param message (object) - accepts a message object that it will include in the new message to be triggered.

### Local Broadcasts:
- **child-entity-added** - This message is triggered when a new entity has been added to the list of children entities.
  > @param message ([[Entity]] object) - The entity that was just added.
- **child-entity-removed** - This message is triggered when an entity has been removed from the list of children entities.
  > @param message ([[Entity]] object) - The entity that was just removed.

### Child Broadcasts:
- **peer-entity-added** - This message is triggered when a new entity has been added to the parent's list of children entities.
  > @param message ([[Entity]] object) - The entity that was just added.
- **peer-entity-removed** - This message is triggered when an entity has been removed from the parent's list of children entities.
  > @param message ([[Entity]] object) - The entity that was just removed.
- **[Messages specified in definition]** - Listens for specified messages and on receiving them, re-triggers them on child entities.
  > @param message (object) - sends the message object received by the original message.

## Methods:
- **AddEntity** -  This method will add the provided entity to this component's list of entities.
  > @param entity ([[Entity]] object) - Required. This is the entity to be added as a child.
  > @return entity ([[Entity]] object) - Returns the entity that was just added.
- **removeEntity** - This method will remove the provided entity from the list of child entities.
  > @param message ([[Entity]] object) - Required. The entity to remove.
  > @return entity ([[Entity]] object | false) - Returns the entity that was just removed. If the entity was not foudn as a child, `false` is returned, indicated that the provided entity was not a child of this entity.

## JSON Definition:
    {
      "type": "entity-container",
      
      "entities": [{"type": "hero"}, {"type": "tile"}],
      // Optional. "entities" is an Array listing entity definitions to specify entities that should be added as children when this component loads.
      
      "childEvents": ["tokens-flying", "rules-updated"]
      // Optional. "childEvents" lists messages that are triggered on the entity and should be triggered on the children as well.
    }
*/
platformer.components['entity-container'] = (function(){
	var childBroadcast = function(event){
		if(typeof event === 'string'){
			return function(value, debug){
				for (var x = 0; x < this.entities.length; x++)
				{
					this.entities[x].trigger(event, value, debug);
				}
			};
		} else {
			return function(value, debug){
				for (var e in event){
					for (var x = 0; x < this.entities.length; x++)
					{
						this.entities[x].trigger(event[e], value, debug);
					}
				}
			};
		}
	},
	component = function(owner, definition){
		var self = this;

		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];
		this.addListeners(['load', 'add-entity', 'remove-entity']);

		this.entities = [];
		this.definedEntities = definition.entities; //saving for load message
		
		this.owner.entities     = self.entities;
		this.owner.addEntity    = function(entity){return self.addEntity(entity);};
		this.owner.removeEntity = function(entity){return self.removeEntity(entity);};
		
		if(definition.childEvents){
			for(var event in definition.childEvents){
				this[definition.childEvents[event]] = childBroadcast(definition.childEvents[event]);
				this.addListener(definition.childEvents[event]);
			}
		}
	},
	proto = component.prototype;
	
	proto['load'] = function(){
		// putting this here so all other components will have been loaded and can listen for "entity-added" calls.
		var i    = 0,
		j        = 0,
		k        = 0,
		entities = this.definedEntities,
		definition = null;
		
		this.definedEntities = false;
		
		if(entities){
			for (i = 0; i < entities.length; i++)
			{
				definition = {properties:{parent: this.owner}};
				for (j in entities[i]){
					if (j === 'properties'){
						for (k in entities[i].properties){
							definition.properties[k] = entities[i].properties[k];
						}
					} else {
						definition[j] = entities[i][j];
					}
				}

				this.addEntity(new platformer.classes.entity(entities[i].id?entities[i]:platformer.settings.entities[entities[i].type], definition));
			}
		}
	};
	
	proto.addEntity = proto['add-entity'] = function (entity) {   
		entity.parent = this.owner;
		entity.trigger('adopted');
		for (var x = 0; x < this.entities.length; x++)
		{
			entity.trigger('peer-entity-added', this.entities[x]);
		}
		
		for (var x = 0; x < this.entities.length; x++)
		{
			this.entities[x].trigger('peer-entity-added', entity);
		}
		this.entities.push(entity);
		this.owner.trigger('child-entity-added', entity);
		return entity;
	};
	
	proto.removeEntity = proto['remove-entity'] = function (entity) {
		for (var x = 0; x < this.entities.length; x++){
		    if(this.entities[x] === entity){
				for (var y = 0; y < this.entities.length; y++){
					if(x !== y){
						this.entities[y].trigger('peer-entity-removed', entity);
					}
				}
		    	entity.parent = null;
		    	this.entities.splice(x, 1);
				this.owner.trigger('child-entity-removed', entity);
		    	entity.destroy();
			    return entity;
		    }
	    }
	    return false;
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
		for (var i in this.entities){
			this.entities[i].destroy();
		}
		this.entities.length = 0;
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   entity-controller - ../engine/components/entity-controller.js
 */
/**
# COMPONENT **entity-controller**
This component listens for input messages triggered on the entity and updates the state of any controller inputs it is listening for. It then broadcasts messages on the entity corresponding to the input it received.

## Dependencies:
- [[Handler-Controller]] (on entity's parent) - This component listens for a controller "tick" message in order to trigger messages regarding the state of its inputs.

## Messages

### Listens for:
- **handle-controller** - On each `handle-controller` message, this component checks its list of actions and if any of their states are currently true or were true on the last call, that action message is triggered.
- **mousedown** - This message triggers a new message on the entity that includes what button on the mouse was pressed: "mouse:left-button:down", "mouse:middle-button:down", or "mouse:right-button:down".
  > @param message.event (DOM Event object) - This event object is passed along with the new message.
- **mouseup** - This message triggers a new message on the entity that includes what button on the mouse was released: "mouse:left-button:up", "mouse:middle-button:up", or "mouse:right-button:up".
  > @param message.event (DOM Event object) - This event object is passed along with the new message.
- **mousemove** - Updates mouse action states with whether the mouse is currently over the entity.
  > @param message.over (boolean) - Whether the mouse is over the input entity.
- **[Messages specified in definition]** - Listens for additional messages and on receiving them, sets the appropriate state and broadcasts the associated message on the next `handle-controller` message. These messages come in pairs and typically have the form of "keyname:up" and "keyname:down" specifying the current state of the input.
  
### Local Broadcasts:
- **mouse:mouse-left:down, mouse:mouse-left:up, mouse:mouse-middle:down, mouse:mouse-middle:up, mouse:mouse-right:down, mouse:mouse-right:up** - This component triggers the state of mouse inputs on the entity if a render component of the entity accepts mouse input (for example [[Render-Animation]]).
  > @param message (DOM Event object) - The original mouse event object is passed along with the control message.
- **[Messages specified in definition]** - Broadcasts active states using the JSON-defined message on each `handle-controller` message. Active states include `pressed` being true or `released` being true. If both of these states are false, the message is not broadcasted.
  > @param message.pressed (boolean) - Whether the current input is active.
  > @param message.released (boolean) - Whether the current input was active last tick but is no longer active.
  > @param message.triggered (boolean) - Whether the current input is active but was not active last tick.
  > @param message.over (boolean) - Whether the mouse was over the entity when pressed, released, or triggered. This value is always false for non-mouse input messages.

## JSON Definition:
    {
      "type": "entity-controller",
      
      "controlMap":{
      // Required. Use the controlMap property object to map inputs to messages that should be triggered. At least one control mapping should be included. The following are a few examples:
      
        "key:x": "run-left",
        // This causes an "x" keypress to fire "run-left" on the entity. For a full listing of key names, check out the `handler-controller` component.
        
        "button-pressed": "throw-block",
        // custom input messages can be fired on this entity from other entities, allowing for on-screen input buttons to run through the same controller channel as other inputs.
        
        "mouse:left-button"
        // The controller can also handle mouse events on the entity if the entity's render component triggers mouse events on the entity (for example, the `render-animation` component).
      }
    }
*/
platformer.components['entity-controller'] = (function(){
	var state = function(event, trigger){
	    this.event = event;
	    this.trigger = trigger;
	    this.filters = false;
		this.current = false;
		this.last    = false;
		this.state   = false;
		this.stateSummary = {
			pressed:   false,
			released:  false,
			triggered: false,
			over:      false
		};
	},
	mouseMap = ['left-button', 'middle-button', 'right-button'],
	createUpHandler = function(state){
		if(state.length){
			return function(value){
				for (var i = 0; i < state.length; i++){
					state[i].state = false;
				}
			};
		} else {
			return function(value){
				state.state = false;
			};
		}
	},
	createDownHandler = function(state){
		if(state.length){
			return function(value){
				for (var i = 0; i < state.length; i++){
					state[i].current = true;
					state[i].state   = true;
					if(value && (typeof (value.over) !== 'undefined')) state[i].over = value.over;
				}
			};
		} else {
			return function(value){
				state.current = true;
				state.state   = true;
				if(value && (typeof (value.over) !== 'undefined')) state.over = value.over;
			};
		}
	},
	addActionState = function(actionList, action, trigger, requiredState){
		var actionState = actionList[action]; // If there's already a state storage object for this action, reuse it: there are multiple keys mapped to the same action.
		if(!actionState){                                // Otherwise create a new state storage object
			actionState = actionList[action] = new state(action, trigger);
		}
		if(requiredState){
			actionState.setFilter(requiredState);
		}
		return actionState;
	},
	component = function(owner, definition){
		var i       = 0,
		j           = 0,
		k           = 0,
		key         = '',
		actionState = undefined,
		self        = this,
		trigger     = function(event, obj){
			self.owner.trigger(event, obj);
		};
		
		this.type   = 'entity-controller';
		this.owner  = owner;
		
		// Messages that this component listens for
		this.listeners = [];
		this.addListeners(['handle-controller', 'mousedown', 'mouseup', 'mousemove']);
		
		if(definition && definition.controlMap){
			this.owner.controlMap = definition.controlMap; // this is used and expected by the handler-controller to handle messages not covered by key and mouse inputs.
			this.actions  = {};
			for(key in definition.controlMap){
				if(typeof definition.controlMap[key] === 'string'){
					actionState = addActionState(this.actions, definition.controlMap[key], trigger);
				} else {
					actionState = [];
					if(definition.controlMap[key].length){
						for (i = 0; i < definition.controlMap[key].length; i++){
							actionState[i] = addActionState(this.actions, definition.controlMap[key][i], trigger);
						}
					} else {
						k = 0;
						for (j in definition.controlMap[key]){
							if(typeof definition.controlMap[key][j] === 'string'){
								actionState[k] = addActionState(this.actions, definition.controlMap[key][j], trigger, j);
								k += 1;
							} else {
								for (i = 0; i < definition.controlMap[key][j].length; i++){
									actionState[k] = addActionState(this.actions, definition.controlMap[key][j][i], trigger, j);
									k += 1;
								}
							}
						}
					}
				}
				this[key + ':up']   = createUpHandler(actionState);
				this[key + ':down'] = createDownHandler(actionState);
				this.addListener(key + ':up');
				this.addListener(key + ':down');
			}
		}
	},
	stateProto = state.prototype,
	proto      = component.prototype;
	
	stateProto.update = function(){
		var i = 0;
		
		if(this.current || this.last){
			this.stateSummary.pressed   = this.current;
			this.stateSummary.released  = !this.current && this.last;
			this.stateSummary.triggered = this.current && !this.last;
			this.stateSummary.over      = this.over;
			if(this.filters){
				for(; i < this.filters.length; i++){
					if(this.stateSummary[this.filters[i]]){
						this.trigger(this.event, this.stateSummary);
					}
				}
			} else {
				this.trigger(this.event, this.stateSummary);
			}
		}
		
		this.last    = this.current;
		this.current = this.state;
	};
	
	stateProto.setFilter = function(filter){
		if(!this.filters){
			this.filters = [filter];
		} else {
			this.filters.push(filter);
		}
		return this;
	};

	stateProto.isPressed = function(){
		return this.current;
	};
	
	stateProto.isTriggered = function(){
		return this.current && !this.last;
	};

	stateProto.isReleased = function(){
		return !this.current && this.last;
	};
	
	proto['handle-controller'] = function(){
		var action    = '';
		
		if(this.actions){
			for (action in this.actions){
				this.actions[action].update();
			}
		}
	};
	
	// The following translate CreateJS mouse and touch events into messages that this controller can handle in a systematic way
	
	proto['mousedown'] = function(value){
		this.owner.trigger('mouse:' + mouseMap[value.event.button || 0] + ':down', value.event);
	}; 
		
	proto['mouseup'] = function(value){
		this.owner.trigger('mouse:' + mouseMap[value.event.button || 0] + ':up', value.event);
	};
	
	proto['mousemove'] = function(value){
		if(this.actions['mouse:left-button'] && (this.actions['mouse:left-button'].over !== value.over))     this.actions['mouse:left-button'].over = value.over;
		if(this.actions['mouse:middle-button'] && (this.actions['mouse:middle-button'].over !== value.over)) this.actions['mouse:middle-button'].over = value.over;
		if(this.actions['mouse:right-button'] && (this.actions['mouse:right-button'].over !== value.over))   this.actions['mouse:right-button'].over = value.over;
	};
/*
	proto['mouseover'] = function(value){
		this.owner.trigger('mouse:' + mouseMap[value.event.button] + ':over', value.event);
	};

	proto['mouseout'] = function(value){
		this.owner.trigger('mouse:' + mouseMap[value.event.button] + ':out', value.event);
	};
*/
	
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   fullscreen - ../engine/components/fullscreen.js
 */
/**
# COMPONENT **fullscreen**
This component listens for "toggle-fullscreen" messages to toggle the game's container to full-screen and back.

Note: This component connects to the browser's fullscreen API if available. It also sets a "full-screen" class on the game container that should be styled in CSS for proper behavior.

## Dependencies:
- [[Render-Animation]] (component on entity) - This component listens for the "animation-complete" event triggered by render-animation.

## Messages:

### Listens for:
- **toggle-fullscreen** - On receiving this message, the component will go fullscreen if not already in fullscreen mode, and vice-versa.

## JSON Definition:
    {
      "type": "fullscreen"
    }
*/

//TODO: Ideally this should be set up to work for any given element, not just the game container. - DDD
(function(){
	var enabled = false,
	element = null,
	turnOffFullScreen = function(){
		enabled = false;
		element.className = element.className.replace(/ full-screen/g, '');
		platformer.game.bindings['resize'].callback();
	},
	toggleFullscreen = function(){
		if(enabled){
			if(document.webkitExitFullscreen){
				document.webkitExitFullscreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.exitFullscreen) {
				document.exitFullscreen();
			}
			turnOffFullScreen();
		} else {
			enabled = true;
			element.className += ' full-screen';
			if(element.webkitRequestFullscreen){
				if(!platformer.settings.supports.safari || platformer.settings.supports.chrome){ //Safari doesn't allow all keyboard input in fullscreen which breaks game input - DDD 5/27/2013
					element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
				}
			} else if (element.mozRequestFullScreen) {
				element.mozRequestFullScreen();
			} else if (element.requestFullscreen) {
				element.requestFullscreen(); // Opera
			}
			platformer.game.bindings['resize'].callback();
		}
	};
	document.addEventListener('fullscreenchange', function(e){
		if(!document.fullscreenElement){
			turnOffFullScreen();
		}
	});
	document.addEventListener('webkitfullscreenchange', function(e){
		if(!document.webkitFullscreenElement){
			turnOffFullScreen();
		}
	});
	document.addEventListener('mozfullscreenchange', function(e){
		if(!document.mozFullScreenElement){
			turnOffFullScreen();
		}
	});
	
	return platformer.createComponentClass({
		id: 'fullscreen',
		constructor: function(definition){
			if (!element) {
				element = platformer.game.containerElement;
			}
		},
		events:{
			"toggle-fullscreen": toggleFullscreen
		}
	});
	
})();


/*--------------------------------------------------
 *   render-debug - ../engine/components/render-debug.js
 */
/**
# COMPONENT **render-debug**
This component is attached to entities that will appear in the game world. It serves two purposes. First, it displays a rectangle that indicates location of the object. By default it uses the specified position and dimensions of the object (in grey), if the object has a collision component it will display the AABB of the collision shape (in pink). If the entity has a [[Logic-Carrier]] component and is/was carrying an object, a green rectangle will be drawn showing the collision group. The render-debug component also allows the user to click on an object and it will print the object in the debug console. 

## Dependencies
- [[Handler-Render]] (on entity's parent) - This component listens for a render "handle-render" and "handle-render-load" message to setup and display the content.

## Messages

### Listens for:
- **handle-render** - Repositions the pieces of the component in preparation for rendering
- **handle-render-load** - The visual components are set up and added to the stage. Setting up mouse input stuff. The click-to-print-to-console functionality is set up too. 
  > @param resp.stage ([createjs.Stage][link1]) - This is the stage on which the component will be displayed.

### Local Broadcasts:
- **mousedown** - Render-debug captures this message and uses it and then passes it on to the rest of the object in case it needs to do something else with it.
  > @param event (event object) - The event from Javascript.
  > @param over (boolean) - Whether the mouse is over the object or not.
  > @param x (number) - The x-location of the mouse in stage coordinates.
  > @param y (number) - The y-location of the mouse in stage coordinates.
  > @param entity ([[Entity]]) - The entity clicked on.  
- **mouseup** - Render-debug captures this message and uses it and then passes it on to the rest of the object in case it needs to do something else with it.
  > @param event (event object) - The event from Javascript.
  > @param over (boolean) - Whether the mouse is over the object or not.
  > @param x (number) - The x-location of the mouse in stage coordinates.
  > @param y (number) - The y-location of the mouse in stage coordinates.
  > @param entity ([[Entity]]) - The entity clicked on.  
- **mousemove** - Render-debug captures this message and uses it and then passes it on to the rest of the object in case it needs to do something else with it.
  > @param event (event object) - The event from Javascript.
  > @param over (boolean) - Whether the mouse is over the object or not.
  > @param x (number) - The x-location of the mouse in stage coordinates.
  > @param y (number) - The y-location of the mouse in stage coordinates.
  > @param entity ([[Entity]]) - The entity clicked on.  

## JSON Definition
    {
      "type": "render-debug",
      "acceptInput": {
      	//Optional - What types of input the object should take.
      	"hover": false;
      	"click": false; 
      }, 
      "regX": 0,
      //Optional - The X offset from X position for the displayed shape. If you're using the AABB this is set automatically.
      "regY": 0
      //Optional - The Y offset from Y position for the displayed shape. If you're using the AABB this is set automatically.
    }
    
[link1]: http://createjs.com/Docs/EaselJS/Stage.html
*/


platformer.components['render-debug'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		if(definition.acceptInput){
			this.hover = definition.acceptInput.hover || false;
			this.click = definition.acceptInput.click || false;
		} else {
			this.hover = false;
			this.click = false;
		}
		
		this.regX = definition.regX || 0;
		this.regY = definition.regY || 0;
		this.stage = undefined;
		//this.txt = undefined;
		this.shape = undefined;
		
		// Messages that this component listens for
		this.listeners = [];
		this.addListeners(['handle-render', 'handle-render-load']);
	};
	var proto = component.prototype;

	proto['handle-render-load'] = function(resp){
		var self = this,
		x        = this.owner.x      = this.owner.x || 0,
		y        = this.owner.y      = this.owner.y || 0,
		z        = this.owner.z      = this.owner.z || 0,
		width    = this.owner.width  = this.owner.width  || 300,
		height   = this.owner.height = this.owner.height || 100,
		comps    = platformer.settings.entities[this.owner.type]?(platformer.settings.entities[this.owner.type].components || []):[],
		components = [],
		over     = false;
		
		for (var i in comps) components[i] = comps[i].type;
		
		this.stage = resp.stage;
		
		/*
		this.txt   = new createjs.Text(this.owner.type + '\n(' + components.join(', ') + ')');
		this.txt.x = x + width / 2;
		this.txt.y = y + height / 2;
		this.txt.z = z;
		this.txt.textAlign = "center";
		this.txt.textBaseline = "middle";
		*/
		
		if(this.owner.getAABB){
			var aabb   = this.owner.getAABB();
			width      = this.initialWidth  = aabb.width;
			height     = this.initialHeight = aabb.height;
			this.shape = new createjs.Shape((new createjs.Graphics()).beginFill("rgba(255,0,255,0.1)").setStrokeStyle(3).beginStroke("#f0f").rect(0, 0, width, height));
			this.regX  = width  / 2;
			this.regY  = height / 2;
		} else {
			this.shape = new createjs.Shape((new createjs.Graphics()).beginFill("rgba(0,0,0,0.1)").beginStroke("#880").rect(0, 0, width, height));
		}
		this.shape.z = z + 10000;
		this.stage.addChild(this.shape);
		//this.stage.addChild(this.txt);
		
		// The following appends necessary information to displayed objects to allow them to receive touches and clicks
		if(this.click && createjs.Touch.isSupported()){
			createjs.Touch.enable(this.stage);
		}

		this.shape.onPress     = function(event) {
			if(this.click){
				self.owner.trigger('mousedown', {
					event: event.nativeEvent,
					over: over,
					x: event.stageX,
					y: event.stageY,
					entity: self.owner
				});
				event.onMouseUp = function(event){
					self.owner.trigger('mouseup', {
						event: event.nativeEvent,
						over: over,
						x: event.stageX,
						y: event.stageY,
						entity: self.owner
					});
				};
				event.onMouseMove = function(event){
					self.owner.trigger('mousemove', {
						event: event.nativeEvent,
						over: over,
						x: event.stageX,
						y: event.stageY,
						entity: self.owner
					});
				};
			}
			if(event.nativeEvent.button == 2){
				console.log('This Entity:', self.owner);
			}
		};
		if(this.click){
			this.shape.onMouseOut  = function(){over = false;};
			this.shape.onMouseOver = function(){over = true;};
		}
		if(this.hover){
			this.stage.enableMouseOver();
			this.shape.onMouseOut  = function(event){
				over = false;
				self.owner.trigger('mouseout', {
					event: event.nativeEvent,
					over: over,
					x: event.stageX,
					y: event.stageY,
					entity: self.owner
				});
			};
			this.shape.onMouseOver = function(event){
				over = true;
				self.owner.trigger('mouseover', {
					event: event.nativeEvent,
					over: over,
					x: event.stageX,
					y: event.stageY,
					entity: self.owner
				});
			};
		}

		if(!platformer.settings.debug){
			this.owner.removeComponent(this);
		}
	};
	
	proto['handle-render'] = function(){
		if(this.owner.getAABB){
			var aabb   = this.owner.getAABB();
			this.shape.scaleX = aabb.width / this.initialWidth;
			this.shape.scaleY = aabb.height / this.initialHeight;
			this.shape.x = aabb.x - aabb.halfWidth;
			this.shape.y = aabb.y - aabb.halfHeight;
			this.shape.z = this.owner.z;
			this.shape.z += 10000;
			/*
			this.txt.x = aabb.x;
			this.txt.y = aabb.y;
			this.txt.z = this.owner.z;
			*/
		} else {
			this.shape.x = this.owner.x	- this.regX;
			this.shape.y = this.owner.y	- this.regY;
			this.shape.z = this.owner.z;
			this.shape.z += 10000;
			/*
			this.txt.x = this.owner.x	- this.regX + (this.owner.width / 2);
			this.txt.y = this.owner.y 	- this.regY + (this.owner.height / 2);
			this.txt.z = this.owner.z;
			*/
		}
		if(this.owner.getCollisionGroupAABB){
			var aabb = this.owner.getCollisionGroupAABB();
			if(!this.groupShape){
				this.groupShape = new createjs.Shape((new createjs.Graphics()).beginFill("rgba(0,255,0,0.1)").setStrokeStyle(3).beginStroke("#0f0").rect(0, 0, aabb.width, aabb.height));
				this.groupShapeInitialWidth  = aabb.width;
				this.groupShapeInitialHeight = aabb.height;
				this.stage.addChild(this.groupShape);
			}
			this.groupShape.scaleX = aabb.width  / this.groupShapeInitialWidth;
			this.groupShape.scaleY = aabb.height / this.groupShapeInitialHeight;
			this.groupShape.x      = aabb.x      - aabb.halfWidth;
			this.groupShape.y      = aabb.y      - aabb.halfHeight;
		}
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.stage.removeChild(this.shape);
		//this.stage.removeChild(this.txt);
		this.shape = undefined;
		//this.txt = undefined;
		this.stage = undefined;
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/
	
	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   render-tiles - ../engine/components/render-tiles.js
 */
/**
# COMPONENT **render-tiles**
This component handles rendering tile map backgrounds. When rendering the background, this component figures out what tiles are being displayed as caches them so they are rendered as one image rather than individually. As the camera moves, the cache is updated by blitting the relevant part of the old cached image into the new cached image and then rendering the tiles that have shifted into the camera's view into the cache.

## Dependencies:
- [createjs.EaselJS][link1] - This component requires the EaselJS library to be included for canvas functionality.
- [[Handler-Render-Createjs]] (on entity's parent) - This component listens for a render "handle-render-load" message to setup and display the content. This component is removed from the Handler-Render-Createjs list after the first tick because it doesn't possess a handle-render function. Instead it uses the camera-update function to update itself.

## Messages

### Listens for:
- **handle-render-load** - This event is triggered before `handle-render` and provides the CreateJS stage that this component will require to display. In this case it compiles the array of tiles that make up the map and adds the tilesToRender displayObject to the stage.
  > @param message.stage ([createjs.Stage][link2]) - Required. Provides the render component with the CreateJS drawing [Stage][link2].
- **camera-update** - Triggered when the camera moves, this function updates which tiles need to be rendered and caches the image.
  > @param camera (object) - Required. Provides information about the camera.

## JSON Definition
    {
      "type": "render-animation",
      "spritesheet": 
      //Required - The spritesheet for all the tile images.
      "imageMap" : [],
      //Required - This is a two dimensional array of the spritesheet indexes that describe the map that you're rendering.
	  "scaleX" : 1,
	  //Optional - The x-scale the tilemap is being displayed at. Defaults to 1.
	  "scaleY"  : 1,
	  //Optional - The y-scale the tilemap is being displayed at. Defaults to 1.
	  "tileWidth"  : 32,
	  //Optional - The the width in pixels of a tile. Defaults to 10.
	  "tileHeight"  : 32,
	  //Optional - The the height in pixels of a tile. Defaults to 10.
	  "buffer"  : 32
	  //Optional - The amount of space in pixels around the edge of the camera that we include in the buffered image. Is multiplied by the scaleX to get the actual buffersize. Defaults to the tileWidth.
    }
    
[link1]: http://www.createjs.com/Docs/EaselJS/module_EaselJS.html
[link2]: http://createjs.com/Docs/EaselJS/Stage.html
*/
(function(){
	var initializeCanvasConservation = function(displayObject){ //To make CreateJS Display Object have better canvas conservation.
		var canvas = [document.createElement("canvas"), document.createElement("canvas")],
		current    = 0;
		
		if(!displayObject.___cache){ //make sure this is only set up once
			displayObject.___cache = displayObject.cache;
			
			displayObject.cache = function(x, y, width, height, scale) {
				current = 1 - current;
				this.cacheCanvas = canvas[current];
				this.___cache(x, y, width, height, scale);
			};
		}
		
		return displayObject;
	},
	transform = {
		x: 1,
		y: 1,
		t: -1,
		r: 0
	},
	transformCheck = function(value){
		var v = +(value.substring(4)),
		resp  = transform,
		a = !!(0x20000000 & v),
		b = !!(0x40000000 & v),
		c = !!(0x80000000 & v);
		
		resp.t = 0x0fffffff & v;
		resp.x = 1;
		resp.y = 1;
		resp.r = 0;

		if(a || b || c){
			if(a && b && c){
				resp.x = -1;
				resp.r = 90;
			} else if (a && c){
				resp.r = 90;
			} else if (b && c){
				resp.r = 180;
			} else if (a && b){
				resp.r = 270;
			} else if (a){
				resp.y = -1;
				resp.r = 90;
			} else if (b){
				resp.y = -1;
			} else if (c){
				resp.x = -1;
			}
		}
		return resp;
	};

	return platformer.createComponentClass({
		
		id: 'render-tiles', 
		
		constructor: function(definition){
			var x = 0,
			images = definition.spriteSheet.images.slice(),
			spriteSheet = null,
			scaleX = 1,
			scaleY = 1;
			
			if(images[0] && (typeof images[0] === 'string')){
				images = images.slice(); //so we do not overwrite settings array
				for (x = 0; x < images.length; x++){
					if(platformer.assets[images[x]]){
						images[x] = platformer.assets[images[x]];
					}
				}
			}
	
			spriteSheet = {
				images: images,
				frames: definition.spriteSheet.frames,
				animations: definition.spriteSheet.animations
			};
			scaleX = spriteSheet.images[0].scaleX || 1;
			scaleY = spriteSheet.images[0].scaleY || 1;
	
			if((scaleX !== 1) || (scaleY !== 1)){
				spriteSheet.frames = {
					width: spriteSheet.frames.width * scaleX,	
					height: spriteSheet.frames.height * scaleY,	
					regX: spriteSheet.frames.regX * scaleX,	
					regY: spriteSheet.frames.regY * scaleY
				};
			}
	
			this.controllerEvents = undefined;
			this.spriteSheet   = new createjs.SpriteSheet(spriteSheet);
			this.imageMap      = definition.imageMap   || [];
			this.tiles         = {};
			this.tilesToRender = undefined;
			this.scaleX        = ((definition.scaleX || 1) * (this.owner.scaleX || 1)) / scaleX;
			this.scaleY        = ((definition.scaleY || 1) * (this.owner.scaleY || 1)) / scaleY;
			this.tileWidth     = definition.tileWidth  || (this.owner.tileWidth / this.scaleX)  || 10;
			this.tileHeight    = definition.tileHeight || (this.owner.tileHeight / this.scaleY) || 10;
			
			// temp values
			this.worldWidth    = this.tilesWidth    = this.tileWidth;
			this.worldHeight   = this.tilesHeight   = this.tileHeight;
			
			
			var buffer = (definition.buffer || (this.tileWidth * 3 / 4)) * this.scaleX;
			this.camera = {
				x: -buffer - 1, //to force camera update
				y: -buffer - 1,
				buffer: buffer
			};
			this.cache = {
				minX: -1,
				minY: -1,
				maxX: -1,
				maxY: -1
			};
			
			this.doubleBuffer = [null, null];
			this.currentBuffer = 0;
		},

		events: {// These are messages that this component listens for
			"handle-render-load": function(resp){
				var x = 0,
				y     = 0,
				stage = this.stage = resp.stage,
				index = '',
				imgMapDefinition = this.imageMap,
				newImgMap = [];
				
				this.tilesToRender = initializeCanvasConservation(new createjs.Container());
				this.tilesToRender.name = 'entity-managed'; //its visibility is self-managed
				
				for(x = 0; x < imgMapDefinition.length; x++){
					newImgMap[x] = [];
					for (y = 0; y < imgMapDefinition[x].length; y++){
						newImgMap[x][y] = index = imgMapDefinition[x][y];
						if(!this.tiles[index]){
							this.tiles[index] = this.createTile(index);
						}
					}
				}
				this.imageMap = newImgMap;
				
				this.tilesWidth  = x * this.tileWidth;
				this.tilesHeight = y * this.tileHeight;
				
				this.tilesToRender.scaleX = this.scaleX;
				this.tilesToRender.scaleY = this.scaleY;
				this.tilesToRender.z = this.owner.z;
		
				stage.addChild(this.tilesToRender);
			},
	
			"add-tiles": function(definition){
				var x = 0,
				y     = 0,
				map   = definition.imageMap,
				index = '',
				newIndex = 0;
				
				if(map){
					for(x = 0; x < this.imageMap.length; x++){
						for (y = 0; y < this.imageMap[x].length; y++){
							newIndex = map[x][y];
							index = this.imageMap[x][y];
							if(this.tiles[index]){
								delete this.tiles[index];
							}
							index = this.imageMap[x][y] += ' ' + newIndex;
							if(!this.tiles[index]){
								this.tiles[index] = this.createTile(index);
							}
						}
					}
				}
			},

			"world-loaded": function(dimensions){
				this.worldWidth  = dimensions.width;
				this.worldHeight = dimensions.height;
			},

			"camera-update": function(camera){
				var x  = 0,
				y      = 0,
				buffer = this.camera.buffer,
				cache  = this.cache,
				context= null,
				canvas = null,
				width  = 0,
				height = 0,
				maxX   = 0,
				maxY   = 0,
				minX   = 0,
				minY   = 0,
				camL   = this.convertCamera(camera.viewportLeft, this.worldWidth, this.tilesWidth, camera.viewportWidth),
				camT   = this.convertCamera(camera.viewportTop, this.worldHeight, this.tilesHeight, camera.viewportHeight),
				vpL    = Math.floor(camL / this.tileWidth)  * this.tileWidth,
				vpT    = Math.floor(camT / this.tileHeight) * this.tileHeight,
				tile   = null;
				
				this.tilesToRender.x = camera.viewportLeft - camL;
				this.tilesToRender.y = camera.viewportTop  - camT;
						
				if (((Math.abs(this.camera.x - vpL) > buffer) || (Math.abs(this.camera.y - vpT) > buffer)) && (this.imageMap.length > 0)){
					this.camera.x = vpL;
					this.camera.y = vpT;
					
					//only attempt to draw children that are relevant
					maxX = Math.min(Math.ceil((vpL + camera.viewportWidth + buffer) / (this.tileWidth * this.scaleX)), this.imageMap.length) - 1;
					minX = Math.max(Math.floor((vpL - buffer) / (this.tileWidth * this.scaleX)), 0);
					maxY = Math.min(Math.ceil((vpT + camera.viewportHeight + buffer) / (this.tileHeight * this.scaleY)), this.imageMap[0].length) - 1;
					minY = Math.max(Math.floor((vpT - buffer) / (this.tileHeight * this.scaleY)), 0);
		
					if((maxY > cache.maxY) || (minY < cache.minY) || (maxX > cache.maxX) || (minX < cache.minX)){
						if(this.tilesToRender.cacheCanvas){
							canvas = this.tilesToRender.cacheCanvas;
							this.tilesToRender.uncache();
						}
						
						this.tilesToRender.removeChildAt(0);
						this.tilesToRender.cache(minX * this.tileWidth, minY * this.tileHeight, (maxX - minX + 1) * this.tileWidth, (maxY - minY + 1) * this.tileHeight, 1);
						
						for(x = minX; x <= maxX; x++){
							for (y = minY; y <= maxY; y++){
								if((y > cache.maxY) || (y < cache.minY) || (x > cache.maxX) || (x < cache.minX)){
									tile = this.tiles[this.imageMap[x][y]];
									this.tilesToRender.removeChildAt(0); // Leaves one child in the display object so createjs will render the cached image.
									this.tilesToRender.addChild(tile);
									tile.x = (x + 0.5) * this.tileWidth;
									tile.y = (y + 0.5) * this.tileHeight;
									this.tilesToRender.updateCache('source-over');
								}
							}
						}
		
						if(canvas){
							context = this.tilesToRender.cacheCanvas.getContext('2d');
							width   = (cache.maxX - cache.minX + 1) * this.tileWidth;
							height  = (cache.maxY - cache.minY + 1) * this.tileHeight;
							context.drawImage(canvas, 0, 0, width, height, (cache.minX - minX) * this.tileWidth, (cache.minY - minY) * this.tileHeight, width, height);
							cache.minX = minX;
							cache.minY = minY;
							cache.maxX = maxX;
							cache.maxY = maxY;
						}
					}
				}
			}
		},
	
		methods:{
			convertCamera: function(distance, worldDistance, tileDistance, viewportDistance){
				if((worldDistance / this.scaleX) == tileDistance){
					return distance;
				} else {
					return distance * (tileDistance - viewportDistance) / ((worldDistance / this.scaleX) - viewportDistance);
				}
			},
			
			createTile: function(imageName){
				var i = 1,
				imageArray = imageName.split(' '),
				mergedTile = null,
				tile  = new createjs.BitmapAnimation(this.spriteSheet),
				layer = transformCheck(imageArray[0]);
				
				tile.x = 0;
				tile.y = 0;
				tile.regX = this.tileWidth / 2;
				tile.regY = this.tileHeight / 2;
				tile.scaleX = layer.x;
				tile.scaleY = layer.y;
				tile.rotation = layer.r;
				tile.gotoAndStop('tile' + layer.t);
				
				for (; i < imageArray.length; i++){
					if(imageArray[i] !== 'tile-1'){
						if(!mergedTile){
							mergedTile = new createjs.Container();
							mergedTile.addChild(tile);
							mergedTile.cache(-this.tileWidth/2,-this.tileHeight/2,this.tileWidth,this.tileHeight,1);
							
//							document.getElementsByTagName('body')[0].appendChild(mergedTile.cacheCanvas);
//							mergedTile.cacheCanvas.setAttribute('title', imageName + ': ' + mergedTile._cacheOffsetX + 'x' + mergedTile._cacheOffsetY + ', ' + mergedTile.cacheCanvas.width + 'x' + mergedTile.cacheCanvas.height + ', ' + mergedTile._cacheScale + ', ' + mergedTile.cacheID + ', ' + !!mergedTile.filters);
							//console.log(imageName);
						}
						layer = transformCheck(imageArray[i]);
						tile.scaleX = layer.x;
						tile.scaleY = layer.y;
						tile.rotation = layer.r;
						tile.gotoAndStop('tile' + layer.t);
						mergedTile.updateCache('source-over');
					}
				}

				if(mergedTile){
					return mergedTile;
				} else {
					tile.cache(0,0,this.tileWidth,this.tileHeight,1);
					return tile;
				}
			},
			
			destroy: function(){
				this.tilesToRender.removeAllChildren();
				this.stage.removeChild(this.tilesToRender);
				this.imageMap.length = 0;
				this.tiles = undefined;
				this.camera = undefined;
				this.stage = undefined;
				this.tilesToRender = undefined;
			}
		}
	});
})();


/*--------------------------------------------------
 *   render-animation - ../engine/components/render-animation.js
 */
/**
# COMPONENT **render-animation**
This component is attached to entities that will appear in the game world. It renders an animated image. It listens for messages triggered on the entity or changes in the logical state of the entity to play a corresponding animation.

## Dependencies:
- [createjs.EaselJS][link1] - This component requires the EaselJS library to be included for canvas animation functionality.
- [[Handler-Render]] (on entity's parent) - This component listens for a render "handle-render" and "handle-render-load" message to setup and display the content.

## Messages

### Listens for:
- **handle-render-load** - This event is triggered when the entity is added to the render handler before 'handle-render' is called. It adds the animation to the Stage and sets up the mouse input if necessary.
  > @param message.stage ([createjs.Stage][link2]) - Required. Provides the render component with the CreateJS drawing [Stage][link2].
- **handle-render** - On each `handle-render` message, this component checks to see if there has been a change in the state of the entity. If so, it updates its animation play-back accordingly.
- **logical-state** - This component listens for logical state changes and tests the current state of the entity against the animation map. If a match is found, the matching animation is played. Has some reserved values used for special functionality.
  > @param message (object) - Required. Lists various states of the entity as boolean values. For example: {jumping: false, walking: true}. This component retains its own list of states and updates them as `logical-state` messages are received, allowing multiple logical components to broadcast state messages. Reserved values: 'orientation' and 'hidden'. Orientation is used to set the angle value in the object, the angle value will be interpreted differently based on what the 'rotate', 'mirror', and 'flip' properties are set to. Hidden determines whether the animation is rendered.
- **[Messages specified in definition]** - Listens for additional messages and on receiving them, begins playing the corresponding animations.

### Local Broadcasts:
- **mousedown** - Render-debug captures this message and uses it and then passes it on to the rest of the object in case it needs to do something else with it.
  > @param event (event object) - The event from Javascript.
  > @param over (boolean) - Whether the mouse is over the object or not.
  > @param x (number) - The x-location of the mouse in stage coordinates.
  > @param y (number) - The y-location of the mouse in stage coordinates.
  > @param entity ([[Entity]]) - The entity clicked on.  
- **mouseup** - Render-debug captures this message and uses it and then passes it on to the rest of the object in case it needs to do something else with it.
  > @param event (event object) - The event from Javascript.
  > @param over (boolean) - Whether the mouse is over the object or not.
  > @param x (number) - The x-location of the mouse in stage coordinates.
  > @param y (number) - The y-location of the mouse in stage coordinates.
  > @param entity ([[Entity]]) - The entity clicked on.  
- **mousemove** - Render-debug captures this message and uses it and then passes it on to the rest of the object in case it needs to do something else with it.
  > @param event (event object) - The event from Javascript.
  > @param over (boolean) - Whether the mouse is over the object or not.
  > @param x (number) - The x-location of the mouse in stage coordinates.
  > @param y (number) - The y-location of the mouse in stage coordinates.
  > @param entity ([[Entity]]) - The entity clicked on.  

## JSON Definition
    {
      "type": "render-animation",

      "animationMap":{
      //Optional. If the animation sequence will change, this is required. This defines a mapping from either triggered messages or one or more states for which to choose a new animation to play. The list is processed from top to bottom, so the most important actions should be listed first (for example, a jumping animation might take precedence over an idle animation).
      
          "standing": "default-animation"
          // On receiving a "standing" message, or a "logical-state" where message.standing == true, the "default" animation will begin playing.
          
          "ground,moving": "walking",
          // Comma separated values have a special meaning when evaluating "logical-state" messages. The above example will cause the "walking" animation to play ONLY if the entity's state includes both "moving" and "ground" equal to true.
          
          "ground,striking": "swing!",
          // Putting an exclamation after an animation name causes this animation to complete before going to the next animation. This is useful for animations that would look poorly if interrupted.

          "default": "default-animation",
          // Optional. "default" is a special property that matches all states. If none of the above states are valid for the entity, it will use the default animation listed here.
      }  

      "spriteSheet": {
      //Required. Defines an EaselJS sprite sheet to use for rendering. See http://www.createjs.com/Docs/EaselJS/SpriteSheet.html for the full specification.

	      "images": ["example0", "example1"],
	      //Required: An array of ids of the images from the asset list in config.js.
	      
	      "frames": {
	      //Required: The dimensions of the frames on the image and how to offset them around the entity position. The image is automatically cut up into pieces based on the dimensions. 
	      	"width":  100,
			"height": 100,
			"regY":   100,
			"regX":   50
	      },
	      
	      "animations":{
	      //Required: The list of animation ids and the frames that make up that animation. The frequency determines how long each frame plays. There are other possible parameters. Additional parameters and formatting info can be found in createJS.
			"default-animation":[2],
			"walking": {"frames": [0, 1, 2], "frequency": 4},
			"swing": {"frames": [3, 4, 5], "frequency": 4}
		  }
      }
      
      "acceptInput": {
      	//Optional - What types of input the object should take.
      	"hover": false;
      	"click": false; 
      }, 
      
      "scaleX": 1,
      //Optional - The X scaling factor for the image. Will default to 1.
      
      "scaleY": 1
      //Optional - The Y scaling factor for the image. Will default to 1.
      "rotate": false,
      //Optional - Whether this object can be rotated. It's rotational angle is set by sending an orientation value in the logical state.
      "mirror": true,
      //Optional - Whether this object can be mirrored over X. To mirror it over X set the orientation value in the logical state to be great than 90 but less than 270.
      "flip": false,
      //Optional - Whether this object can be flipped over Y. To flip it over Y set the orientation value in the logical state to be great than 180.
      "hidden": false
      //Optional - Whether this object is visible or not. To change the hidden value dynamically add a 'hidden' property to the logical state object and set it to true or false.
    }
    
[link1]: http://www.createjs.com/Docs/EaselJS/module_EaselJS.html
[link2]: http://createjs.com/Docs/EaselJS/Stage.html
*/
(function(){
	var changeState = function(state){
		return function(value){
			if(this.currentAnimation !== state){
				if(this.animationFinished || (this.lastState >= -1)){
					this.currentAnimation = state;
					this.lastState = -1;
					this.animationFinished = false;
					this.anim.gotoAndPlay(state);
				} else {
					this.waitingAnimation = state;
					this.waitingState = -1;
				}
			}
		};
	},
	createTest = function(testStates, animation){
		var states = testStates.replace(/ /g, '').split(',');
		if(testStates === 'default'){
			return function(state){
				return animation;
			};
		} else {
			return function(state){
				for(var i = 0; i < states.length; i++){
					if(!state[states[i]]){
						return false;
					}
				}
				return animation;
			};
		}
	};
	
	return platformer.createComponentClass({
		
		id: 'render-animation',
		
		constructor: function(definition){
			var spriteSheet = {
				images: definition.spriteSheet.images.slice(),
				frames: definition.spriteSheet.frames,
				animations: definition.spriteSheet.animations
			},
			self = this,
			x = 0,
			animation = '',
			lastAnimation = '',
			map = definition.animationMap;
			
			this.rotate = definition.rotate || false;
			this.mirror = definition.mirror || false;
			this.flip   = definition.flip   || false;
			this.hidden   = definition.hidden   || false;
			
			if(definition.acceptInput){
				this.hover = definition.acceptInput.hover || false;
				this.click = definition.acceptInput.click || false;
				this.touch = definition.acceptInput.touch || false;
			} else {
				this.hover = false;
				this.click = false;
				this.touch = false;
			}
			
			this.followThroughs = {};
			
			if(!map){ // create animation map if none exists
				map = {};
				for (x in spriteSheet.animations){
					map[x] = x;
				}
			}
			
			this.checkStates = [];
			for(var i in map){
				this.addListener(i);
				animation = map[i];
				
				if(animation[animation.length - 1] === '!'){
					animation = animation.substring(0, animation.length - 1);
					this.followThroughs[animation] = true;
				} else {
					this.followThroughs[animation] = false;
				}
				
				this[i] = changeState(animation);
				this.checkStates.push(createTest(i, animation));
			}
			lastAnimation = animation;
			
			this.stage = undefined;
			for (x = 0; x < spriteSheet.images.length; x++){
				spriteSheet.images[x] = platformer.assets[spriteSheet.images[x]];
			}
			var scaleX = spriteSheet.images[0].scaleX || 1,
			scaleY     = spriteSheet.images[0].scaleY || 1;
			if((scaleX !== 1) || (scaleY !== 1)){
				spriteSheet.frames = {
					width: spriteSheet.frames.width * scaleX,	
					height: spriteSheet.frames.height * scaleY,	
					regX: spriteSheet.frames.regX * scaleX,	
					regY: spriteSheet.frames.regY * scaleY
				};
			}
			spriteSheet = new createjs.SpriteSheet(spriteSheet);
			this.anim = new createjs.BitmapAnimation(spriteSheet);
			this.anim.onAnimationEnd = function(animationInstance, lastAnimation){
				self.owner.trigger('animation-ended', lastAnimation);
				if(self.waitingAnimation){
					self.currentAnimation = self.waitingAnimation;
					self.waitingAnimation = false;
					self.lastState = self.waitingState;
					
					self.animationFinished = false;
					self.anim.gotoAndPlay(self.currentAnimation);
				} else {
					self.animationFinished = true;
				}
			};
			this.anim.hidden = this.hidden;
			this.currentAnimation = map['default'] || lastAnimation;
			this.forcePlaythrough = this.owner.forcePlaythrough || definition.forcePlaythrough || false;
			this.scaleX = this.anim.scaleX = ((definition.scaleX || 1) * (this.owner.scaleX || 1)) / scaleX;
			this.scaleY = this.anim.scaleY = ((definition.scaleY || 1) * (this.owner.scaleY || 1)) / scaleY;
			this.state = {};
			this.stateChange = false;
			this.waitingAnimation = false;
			this.waitingState = 0;
			this.playWaiting = false;
			this.animationFinished = false;
			if(this.currentAnimation){
				this.anim.gotoAndPlay(this.currentAnimation);
			}
		},
		
		events: {
			"handle-render-load": function(obj){
				var self = this,
				over     = false;
				
				this.stage = obj.stage;
				if(!this.stage){
					return;
				}
				this.stage.addChild(this.anim);
				
				// The following appends necessary information to displayed objects to allow them to receive touches and clicks
				if(this.click || this.touch){
					if(this.touch && createjs.Touch.isSupported()){
						createjs.Touch.enable(this.stage);
					}

					this.anim.onPress     = function(event) {
						self.owner.trigger('mousedown', {
							//debug: true,
							event: event.nativeEvent,
							over: over,
							x: event.stageX,
							y: event.stageY,
							entity: self.owner
						});
						event.onMouseUp = function(event){
							self.owner.trigger('mouseup', {
								//debug: true,
								event: event.nativeEvent,
								over: over,
								x: event.stageX,
								y: event.stageY,
								entity: self.owner
							});
						};
						event.onMouseMove = function(event){
							self.owner.trigger('mousemove', {
								event: event.nativeEvent,
								over: over,
								x: event.stageX,
								y: event.stageY,
								entity: self.owner
							});
						};
					};
					this.anim.onMouseOut  = function(){over = false;};
					this.anim.onMouseOver = function(){over = true;};
				}
				if(this.hover){
					this.stage.enableMouseOver();
					this.anim.onMouseOut  = function(event){
						over = false;
						self.owner.trigger('mouseout', {
							event: event.nativeEvent,
							over: over,
							x: event.stageX,
							y: event.stageY,
							entity: self.owner
						});
					};
					this.anim.onMouseOver = function(event){
						over = true;
						self.owner.trigger('mouseover', {
							event: event.nativeEvent,
							over: over,
							x: event.stageX,
							y: event.stageY,
							entity: self.owner
						});
					};
				}
			},
			
			"handle-render": function(resp){
				var testCase = false, i = 0,
				angle = null;
				
				if(!this.stage) { //In case this component was added after handler-render is initiated
					this['handle-render-load'](resp);
					if(!this.stage){
						console.warn('No CreateJS Stage, removing render component from "' + this.owner.type + '".');
						this.owner.removeComponent(this);
						return;
					}
				}
				
				this.anim.x = this.owner.x;
				this.anim.y = this.owner.y;
				this.anim.z = this.owner.z;
				
				//Special case affecting rotation of the animation
				if(this.rotate || this.mirror || this.flip){
					angle = ((this.owner.orientation * 180) / Math.PI + 360) % 360;
					
					if(this.rotate){
						this.anim.rotation = angle;
					}
					
					if(this.mirror){
						if((angle > 90) && (angle < 270)){
							this.anim.scaleX = -this.scaleX;
						} else {
							this.anim.scaleX = this.scaleX;
						}
					}
					
					if(this.flip){
						if(angle > 180){
							this.anim.scaleY = this.scaleY;
						} else {
							this.anim.scaleY = -this.scaleY;
						}
					}
				}
				
				if(this.stateChange){
					if(this.checkStates){
						for(; i < this.checkStates.length; i++){
							testCase = this.checkStates[i](this.state);
							if(testCase){
								if(this.currentAnimation !== testCase){
									if(!this.followThroughs[this.currentAnimation] && (!this.forcePlaythrough || (this.animationFinished || (this.lastState >= +i)))){
										this.currentAnimation = testCase;
										this.lastState = +i;
										this.animationFinished = false;
										this.anim.gotoAndPlay(testCase);
									} else {
										this.waitingAnimation = testCase;
										this.waitingState = +i;
									}
								} else if(this.waitingAnimation && !this.followThroughs[this.currentAnimation]) {// keep animating this animation since this animation has already overlapped the waiting animation.
									this.waitingAnimation = false;
								}
								break;
							}
						}
					}
					this.stateChange = false;
				}
			},
			
			"logical-state": function(state){
				for(var i in state){
					if(this.state[i] !== state[i]){
						this.stateChange = true;
						this.state[i] = state[i];
						
						if(i === 'hidden') {
							this.hidden = state[i];
							this.anim.hidden = this.hidden;
						}
					}
				}
			}			
		},
		
		methods: {
			destroy: function(){
				if (this.stage){
					this.stage.removeChild(this.anim);
					this.stage = undefined;
				}
				this.followThroughs = null;
				this.anim = undefined;
			}
		}
	});
})();


/*--------------------------------------------------
 *   render-image - ../engine/components/render-image.js
 */
/**
# COMPONENT **render-image**
This component is attached to entities that will appear in the game world. It renders a static image. It can render a whole image or a portion of a larger images depending on the definition.

## Dependencies
- [[Handler-Render]] (on entity's parent) - This component listens for a render "handle-render" and "handle-render-load" message to setup and display the content.

## Messages

### Listens for:
- **handle-render** - Repositions the image in preparation for rendering
- **handle-render-load** - The image added to the stage. Setting up the mouse input stuff.
  > @param obj.stage ([createjs.Stage][link1]) - This is the stage on which the component will be displayed.
- **logical-state** - This component listens for logical state changes. Handles orientation of the object and visibility.
  > @param message (object) - Required. Lists parameters and their values. For example: {hidden: false, orientation: 90}. Accepted parameters: 'orientation' and 'hidden'. Orientation is used to set the angle value in the object, the angle value will be interpreted differently based on what the 'rotate', 'mirror', and 'flip' properties are set to. Hidden determines whether the image is rendered.

### Local Broadcasts:
- **mousedown** - Render-debug captures this message and uses it and then passes it on to the rest of the object in case it needs to do something else with it.
  > @param event (event object) - The event from Javascript.
  > @param over (boolean) - Whether the mouse is over the object or not.
  > @param x (number) - The x-location of the mouse in stage coordinates.
  > @param y (number) - The y-location of the mouse in stage coordinates.
  > @param entity ([[Entity]]) - The entity clicked on.  
- **mouseup** - Render-debug captures this message and uses it and then passes it on to the rest of the object in case it needs to do something else with it.
  > @param event (event object) - The event from Javascript.
  > @param over (boolean) - Whether the mouse is over the object or not.
  > @param x (number) - The x-location of the mouse in stage coordinates.
  > @param y (number) - The y-location of the mouse in stage coordinates.
  > @param entity ([[Entity]]) - The entity clicked on.  
- **mousemove** - Render-debug captures this message and uses it and then passes it on to the rest of the object in case it needs to do something else with it.
  > @param event (event object) - The event from Javascript.
  > @param over (boolean) - Whether the mouse is over the object or not.
  > @param x (number) - The x-location of the mouse in stage coordinates.
  > @param y (number) - The y-location of the mouse in stage coordinates.
  > @param entity ([[Entity]]) - The entity clicked on.  

## JSON Definition
    {
      "type": "render-image",
      "image": "example",
      //Required: The id of the image from the asset list in config.js.
      "source": {
      //Optional - The portion of the image you are going to use.
		"width":  100,
		"height": 100,
		"y": 100,
		"x": 100   
      },
      "acceptInput": {
      	//Optional - What types of input the object should take.
      	"hover": false;
      	"click": false; 
      }, 
      "regX": 0,
      //Optional - The X offset from X position for the image.
      "regY": 0,
      //Optional - The Y offset from Y position for the image.
      "scaleX": 1,
      //Optional - The X scaling factor for the image.  Will default to 1.
      "scaleY": 1
      //Optional - The Y scaling factor for the image.  Will default to 1.
      "rotate": false,
      //Optional - Whether this object can be rotated. It's rotational angle is set by sending an orientation value in the logical state.
      "mirror": true,
      //Optional - Whether this object can be mirrored over X. To mirror it over X set the orientation value in the logical state to be great than 90 but less than 270.
      "flip": false,
      //Optional - Whether this object can be flipped over Y. To flip it over Y set the orientation value in the logical state to be great than 180.
      "hidden": false
      //Optional - Whether this object is visible or not. To change the hidden value dynamically add a 'hidden' property to the logical state object and set it to true or false.
    }
    
[link1]: http://createjs.com/Docs/EaselJS/Stage.html
*/

platformer.components['render-image'] = (function(){
	var component = function(owner, definition){
		var image = definition.image,
		source    = definition.source;
		
		this.owner = owner;
		this.rotate = definition.rotate || false;
		this.mirror = definition.mirror || false;
		this.flip   = definition.flip   || false;
		this.hidden   = definition.hidden   || false;
		
		this.state = {};
		
		if(definition.acceptInput){
			this.hover = definition.acceptInput.hover || false;
			this.click = definition.acceptInput.click || false;
		} else {
			this.hover = false;
			this.click = false;
		}
		
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['handle-render-load', 'handle-render', 'logical-state']);
		this.stage = undefined;
		this.image = new createjs.Bitmap(platformer.assets[image]);
		var scaleX = platformer.assets[image].scaleX || 1,
		scaleY     = platformer.assets[image].scaleY || 1;
		if(source){
			source.x = source.x || 0;
			source.y = source.y || 0;
			this.image.sourceRect = new createjs.Rectangle(source.x * scaleX, source.y * scaleY, source.width * scaleX, source.height * scaleY);
		}
		this.image.hidden = this.hidden;
		this.image.regX   = (definition.regX || 0) * scaleX;
		this.image.regY   = (definition.regY || 0) * scaleY;
		this.image.scaleX = ((definition.scaleX || 1) * (this.owner.scaleX || 1)) / scaleX;
		this.image.scaleY = ((definition.scaleY || 1) * (this.owner.scaleY || 1)) / scaleY;
	};
	var proto = component.prototype;
	
	proto['handle-render-load'] = function(obj){
		var self = this,
		over     = false;
		
		this.stage = obj.stage;
		this.stage.addChild(this.image);
		
		// The following appends necessary information to displayed objects to allow them to receive touches and clicks
		if(this.click){
			if(createjs.Touch.isSupported()){
				createjs.Touch.enable(this.stage);
			}

			this.image.onPress     = function(event) {
				self.owner.trigger('mousedown', {
					//debug: true,
					event: event.nativeEvent,
					over: over,
					x: event.stageX,
					y: event.stageY,
					entity: self.owner
				});
				event.onMouseUp = function(event){
					self.owner.trigger('mouseup', {
						//debug: true,
						event: event.nativeEvent,
						over: over,
						x: event.stageX,
						y: event.stageY,
						entity: self.owner
					});
				};
				event.onMouseMove = function(event){
					self.owner.trigger('mousemove', {
						event: event.nativeEvent,
						over: over,
						x: event.stageX,
						y: event.stageY,
						entity: self.owner
					});
				};
			};
			this.image.onMouseOut  = function(){over = false;};
			this.image.onMouseOver = function(){over = true;};
		}
		if(this.hover){
			this.stage.enableMouseOver();
			this.image.onMouseOut  = function(event){
				over = false;
				self.owner.trigger('mouseout', {
					event: event.nativeEvent,
					over: over,
					x: event.stageX,
					y: event.stageY,
					entity: self.owner
				});
			};
			this.image.onMouseOver = function(event){
				over = true;
				self.owner.trigger('mouseover', {
					event: event.nativeEvent,
					over: over,
					x: event.stageX,
					y: event.stageY,
					entity: self.owner
				});
			};
		}
	};
	
	proto['handle-render'] = function(obj){
		var angle = null;
		if(this.rotate || this.mirror || this.flip){
			angle = ((this.owner.orientation * 180) / Math.PI + 360) % 360;
			
			if(this.rotate){
				this.image.rotation = angle;
			}
			
			if(this.mirror){
				if((angle > 90) && (angle < 270)){
					this.image.scaleX = -this.scaleX;
				} else {
					this.image.scaleX = this.scaleX;
				}
			}
			
			if(this.flip){
				if(angle > 180){
					this.image.scaleY = this.scaleY;
				} else {
					this.image.scaleY = -this.scaleY;
				}
			}
		}
		
		this.image.x = this.owner.x;
		this.image.y = this.owner.y;
		this.image.z = this.owner.z;
	};
	
	proto['logical-state'] = function(state){
		for(var i in state){
			if(this.state[i] !== state[i]){
				this.state[i] = state[i];
				
				if(i === 'hidden') {
					this.hidden = state[i];
					this.image.hidden = this.hidden;
				}
			}
		}
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.stage.removeChild(this.image);
		this.stage = undefined;
		this.image = undefined;
		this.removeListeners(this.listeners);
		this.owner = undefined;
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   logic-button - ../engine/components/logic-button.js
 */
/**
# COMPONENT **logic-button**
This component handles the pressed/released state of a button according to input. It can be set as a toggle button or a simple press-and-release button.

## Dependencies:
- [[Handler-Logic]] (on entity's parent) - This component listens for a logic tick message to maintain and update its state.

## Messages

### Listens for:
- **handle-logic** - On a `tick` logic message, the component updates its current state and broadcasts its logical state to the entity.
- **pressed** - on receiving this message, the state of the button is set to "pressed".
- **released** - on receiving this message, the state of the button is set to "released".
- **mousedown** - on receiving this message, the state of the button is set to "pressed". Note that this component will not listen for "mousedown" if the component is in toggle mode.
- **mouseup** - on receiving this message, the state of the button is set to "released" unless in toggle mode, in which case it toggles between "pressed" and "released".

### Local Broadcasts:
- **logical-state** - this component will trigger this message with both "pressed" and "released" properties denoting its state. Both of these work in tandem and never equal each other.
  > @param message.pressed (boolean) - whether the button is in a pressed state.
  > @param message.released (boolean) - whether the button is in a released state.

## JSON Definition:
    {
      "type": "logic-button",
      
      "toggle": true,
      // Optional. Determines whether this button should behave as a toggle. Defaults to "false".
      
      "state": "pressed",
      // Optional. Specifies starting state of button; typically only useful for toggle buttons. Defaults to "released".
    }
*/
platformer.components['logic-button'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];
		
		// Create state object to send with messages here so it's not recreated each time.
		this.state = this.owner.state;
		this.state.released = true;
		this.state.pressed  = false;
		this.stateChange = '';

		if(definition.state === 'pressed'){
			this.pressed();
		}

		if(definition.toggle){
			this.toggle = true;
			this.addListener('mouseup');
		} else {
			this.addListeners(['mousedown','mouseup']);
		}
		
		this.addListeners(['handle-logic', 'pressed', 'released']);
	};
	var proto = component.prototype;
	
	proto['mousedown'] = proto['pressed'] = function(){
		this.stateChange = 'pressed';
	};
	
	proto['mouseup'] = function(){
		if(this.toggle){
			if(this.state.pressed){
				this.released();
			} else {
				this.pressed();
			}
		} else {
			this.released();
		}
	};
	
	proto['released'] = function(){
		this.stateChange = 'released';
	};
	
	proto['handle-logic'] = function(resp){
		if(this.state.released && (this.stateChange === 'pressed')){
			this.stateChange = '';
			this.state.pressed = true;
			this.state.released = false;
		}
		if(this.state.pressed && (this.stateChange === 'released')){
			this.stateChange = '';
			this.state.pressed = false;
			this.state.released = true;
		}
	};

	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
		this.state = undefined;
		this.owner = undefined;
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   logic-carrier - ../engine/components/logic-carrier.js
 */
/**
# COMPONENT **logic-carrier**
This component allows this entity carry other entities with which it collides. Entities that this component should carry need to have a [[Logic-Portable]] component attached to notify this entity that they are portable.

## Dependencies:
- [[Collision-Group]] - This component will attach a [[Collision-Group]] to this entity if it does not already have this component. `logic-carrier` uses a collision group to resolve its portable peers' collisions with itself before other world collisions are handled.
- [[Logic-Portable]] (on portable peer entity) - This component listens for 'carry-me' and 'release-me', commonly triggered by [[Logic-Portable]] on a colliding peer entity.

## Messages

### Listens for:
- **load** - On receiving this message, the component ensures that it has a peer collision group component, and adds one if not.
- **carry-me** - On receiving this message, the component triggers `add-collision-entity` on the entity to add the peer entity to its collision group.
  > @param message.entity ([[Entity]]) - Required. The peer entity requesting to be carried.
- **release-me** - On receiving this message, the component triggers `remove-collision-entity` on the entity to remove the peer entity from its collision group.
  > @param message.entity ([[Entity]]) - Required. The peer entity requesting to be released.

### Local Broadcasts
- **add-collision-entity** - On receiving a `carry-me` message, this component triggers this message to add the portable peer to the collision group.
  > @param message ([[Entity]]) - The entity being added to the collision group.
- **remove-collision-entity** - On receiving a `release-me` message, this component triggers this message to remove the portable peer to the collision group.
  > @param message ([[Entity]]) - The entity being removed from the collision group.

## JSON Definition:
    {
      "type": "logic-carrier"
      // This component has no customizable properties.
    }
*/
platformer.components['logic-carrier'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['load', 'carry-me', 'release-me']);
		
	};
	var proto = component.prototype;
	
	proto['load'] = function(resp){
		if(!this.owner.trigger('add-collision-entity', this.owner)){
			// This message wasn't handled, so add a collision-group component and try again!
			this.owner.addComponent(new platformer.components['collision-group'](this.owner, {}));
			this.owner.trigger('add-collision-entity', this.owner);
		}
	};
	
	proto['carry-me'] = function(resp){
		this.owner.trigger('add-collision-entity', resp.entity);
	};
	
	proto['release-me'] = function(resp){
		this.owner.trigger('remove-collision-entity', resp.entity);
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   logic-directional-movement - ../engine/components/logic-directional-movement.js
 */
/**
# COMPONENT **logic-directional-movement**
This component changes the (x, y) position of an object according to its current speed and heading. It maintains its own heading information independent of other components allowing it to be used simultaneously with other logic components like [[Logic-Pushable]] and [[Logic-Gravity]]. It accepts directional messages that can stand alone, or come from a mapped controller, in which case it checks the `pressed` value of the message before changing its course accordingly.

## Dependencies:
- [[handler-logic]] (on entity's parent) - This component listens for a logic tick message to maintain and update its location.

## Messages

### Listens for:
- **handle-logic** - On a `tick` logic message, the component updates its location according to its current state.
  > @param message.deltaT - To determine how far to move the entity, the component checks the length of the tick.
- **[directional message]** - Directional messages include `go-down`, `go-south`, `go-down-left`, `go-southwest`, `go-left`, `go-west`, `go-up-left`, `go-northwest`, `go-up`, `go-north`, `go-up-right`, `go-northeast`, `go-right`, `go-east`, `go-down-right`, and `go-southeast`. On receiving one of these messages, the entity adjusts its movement orientation.
  > @param message.pressed (boolean) - Optional. If `message` is included, the component checks the value of `pressed`: true causes movement in the triggered direction, false turns off movement in that direction. Note that if no message is included, the only way to stop movement in a particular direction is to trigger `stop` on the entity before progressing in a new orientation. This allows triggering `up` and `left` in sequence to cause `up-left` movement on the entity.
- **stop** - Stops motion in all directions until movement messages are again received.
  > @param message.pressed (boolean) - Optional. If `message` is included, the component checks the value of `pressed`: a value of false will not stop the entity.

### Local Broadcasts:
- **logical-state** - this component will trigger this message when its movement or direction changes. Note that directions are not mutually exclusive: adjacent directions can both be true, establishing that the entity is facing a diagonal direction.
  > @param message.moving (boolean) - whether the entity is in motion.
  > @param message.left (boolean)   - whether the entity is facing left.
  > @param message.right (boolean)  - whether the entity is facing right.
  > @param message.up (boolean)     - whether the entity is facing up.
  > @param message.down (boolean)   - whether the entity is facing down.

## JSON Definition:
    {
      "type": "logic-directional-movement",
      
      "speed": 4.5
      // Optional. Defines the distance in world units that the entity should be moved per millisecond. Defaults to 0.3.
    }
*/
(function(){
	var processDirection = function(direction){
		return function (state){
			if(state){
				this[direction] = (state.pressed !== false);
//				this.stopped = !state.pressed;
			} else {
				this[direction] = true;
//				this.stopped = false;
			}
		};
	},
	getAngle = function(x, y){
		var m = Math.sqrt(x * x + y * y),
		a     = 0;

		if (m != 0){
			a = Math.acos(x / m);
			if (y < 0){
				a = (Math.PI * 2) - a;
			}
		}
		return a;
	};
	
	return platformer.createComponentClass({
		id: 'logic-directional-movement',
		
		constructor: function(definition){
			var self = this;
			
			this.speed = definition.speed || .3;
			
			this.boost = false;
			this.paused = false;
			
			if(definition.pause || definition.boost){
				if(typeof definition.pause === 'string'){
					this.pausers = [definition.pause];
				} else {
					this.pausers = definition.pause;
				}
				this.addListener('logical-state');
				this['logical-state'] = function(state){
					var paused = false;
					if(definition.pause){
						for(var i = 0; i < self.pausers.length; i++){
							paused = paused || state[self.pausers[i]];
						}
						this.paused = paused;
					}
					
					if(definition.boost){
						if(self.boost){
							if(state[definition.boost] === false){
								self.boost = false;
							}
						} else if(state[definition.boost] === true){
							self.boost = true;
						}
					}
				};
			}

			this.state = this.owner.state;
			this.state.moving = false;
			this.state.left = false;
			this.state.right = false;
			this.state.up = false;
			this.state.down = false;

			this.owner.orientation = 0;
			
			this.moving = false;
			this.left = false;
			this.right = false;
			this.up = false;
			this.down = false;
			this.upLeft = false;
			this.upRight = false;
			this.downLeft = false;
			this.downRight = false;
			this.facing = 'right';
		},
		events:{
			"handle-logic": function(resp){
				var vX    = 0,
				vY        = 0,
				up        = this.up        || this.upLeft || this.downLeft,
				upLeft    = this.upLeft    || (this.up   && this.left),
				left      = this.left      || this.upLeft || this.downLeft,
				downLeft  = this.downLeft  || (this.down && this.left),
				down      = this.down      || this.downLeft || this.downRight,
				downRight = this.downRight || (this.down && this.right),
				right     = this.right     || this.upRight || this.downRight,
				upRight   = this.upRight   || (this.up   && this.right),
				orientation = 0;
				
				if (up && down){
					this.moving = false;
				} else if (left && right) {
					this.moving = false;
				} else if (upLeft) {
					vX = -this.speed / 1.414;
					vY = -this.speed / 1.414;
					this.moving = true;
					this.facing = 'up-left';
				} else if (upRight) {
					vY = -this.speed / 1.414;
					vX =  this.speed / 1.414;
					this.moving = true;
					this.facing = 'up-right';
				} else if (downLeft) {
					vY =  this.speed / 1.414;
					vX = -this.speed / 1.414;
					this.moving = true;
					this.facing = 'down-left';
				} else if (downRight) {
					vY =  this.speed / 1.414;
					vX =  this.speed / 1.414;
					this.moving = true;
					this.facing = 'down-right';
				} else if(left)	{
					vX = -this.speed;
					this.moving = true;
					this.facing = 'left';
				} else if (right) {
					vX =  this.speed;
					this.moving = true;
					this.facing = 'right';
				} else if (up) {
					vY = -this.speed;
					this.moving = true;
					this.facing = 'up';
				} else if (down) {
					vY =  this.speed;
					this.moving = true;
					this.facing = 'down';
				} else {
					this.moving = false;
					
					// This is to retain the entity's direction even if there is no movement. There's probably a better way to do this since this is a bit of a retrofit. - DDD
					switch(this.facing){
					case 'up': up = true; break;
					case 'down': down = true; break;
					case 'left': left = true; break;
					case 'right': right = true; break;
					case 'up-left': up = true; left = true; break;
					case 'up-right': up = true; right = true; break;
					case 'down-left': down = true; left = true; break;
					case 'down-right': right = true; right = true; break;
					}
				}
				
				if(this.moving){
					if(!this.paused){
						if(this.boost) {
							vX *= 1.5;
							vY *= 1.5;
						}

						this.owner.x += (vX * resp.deltaT);
						this.owner.y += (vY * resp.deltaT);
					}
					
					orientation = getAngle(vX, vY);
					if(this.owner.orientation !== orientation){
						this.owner.orientation = orientation;
					}
				}
				
				//TODO: possibly remove the separation of this.state.direction and this.direction to just use state?
				if(this.state.moving !== this.moving){
					this.state.moving = this.moving;
				}
				if(this.state.up !== up){
					this.state.up = up;
				}
				if(this.state.right !== right){
					this.state.right = right;
				}
				if(this.state.down !== down){
					this.state.down = down;
				}
				if(this.state.left !== left){
					this.state.left = left;
				}
			},
			
			"go-down": processDirection('down'),
			"go-south": processDirection('down'),
			"go-down-left": processDirection('downLeft'),
			"go-southwest": processDirection('downLeft'),
			"go-left": processDirection('left'),
			"go-west": processDirection('left'),
			"go-up-left": processDirection('upLeft'),
			"go-northwest": processDirection('upLeft'),
			"go-up": processDirection('up'),
			"go-north": processDirection('up'),
			"go-up-right": processDirection('upRight'),
			"go-northeast": processDirection('upRight'),
			"go-right": processDirection('right'),
			"go-east": processDirection('right'),
			"go-down-right": processDirection('downRight'),
			"go-southeast": processDirection('downRight'),

			"stop": function(state){
				if(!state || (state.pressed !== false)){
					this.left = false;
					this.right = false;
					this.up = false;
					this.down = false;
					this.upLeft = false;
					this.upRight = false;
					this.downLeft = false;
					this.downRight = false;
				}
			},
			
			"accelerate": function(velocity) {
				this.speed = velocity;
			}
		}
	});
})();


/*--------------------------------------------------
 *   logic-gravity - ../engine/components/logic-gravity.js
 */
/**
# COMPONENT **logic-gravity**
A component that causes the object to move according to a specified gravity.

## Dependencies
- [[Handler-Logic]] (on entity's parent) - This component listens for a "handle-logic" message. It then moves the entity according to the gravitational forces.
- [[Collision-Basic]] (on entity) - Not required if this object doesn't collide with things. This component listens for the message 'hit-solid' from the collision-basic component.

## Messages

### Listens for:
- **handle-logic** - Accelerates and moves the objects according to the set gravity. Objects will not move faster than the max velocity set. Though max velocity only limits the portion of the velocity maintained by the gravity component.
  > @param resp.deltaT (number) - The time since the last tick.
- **hit-solid** - Received when we collide with an object that is solid to the entity. We stop the movement in the direction of that object.
  > @param collisionInfo.x (number) - Either 1,0, or -1. 1 if we're colliding with an object on our right. -1 if on our left. 0 if not at all. 
  > @param collisionInfo.y (number) - Either 1,0, or -1. 1 if we're colliding with an object on our bottom. -1 if on our top. 0 if not at all.
- **glide** - Changes the maximum gravitational velocity.
  > @param message.maxVelocity, message.maxVelocityX, message.maxVelocityY (number) - The new maximum velocity the entity should have due to gravity.
  > @param message.duration, message.durationX, message.durationY (number) - Time in milliseconds to make the transition form current velocity to the maximum velocity.
  > @param message.acceleration, message.accelerationX, message.acclerationY (number) - How quickly to transition to new maximum velocity.
- **gravitate** - Changes the gravitational acceleration.
  > @param message.gravity, message.gravityX, message.gravityY (number) - Sets the new gravitational pull on the entity.
- **hover** - Causes gravitational affect on the entity's velocity to cease.
  > @param message.pressed (boolean) - Optional. If `message` is included, the component checks the value of `pressed`: a value of false will not stop gravity.
- **fall** - Causes the gravitational affect on the entity's velocity to continue.
  > @param message.pressed (boolean) - Optional. If `message` is included, the component checks the value of `pressed`: a value of false will not start gravity.
 

## JSON Definition
    {
      "type": "logic-pushable",
      "velocityX" : 0,
      //Optional - The starting x velocity of the entity. Defaults to 0.
	  "velocityY" : 0,
	  //Optional - The starting y velocity of the entity. Defaults to 0.
	  "maxVelocityX" : 3,
	  //Optional - The max x velocity attributed to the entity by gravity. Defaults to 3.
	  "maxVelocityY" : 3, 
	  //Optional - The max y velocity attributed to the entity by gravity. Defaults to 3.
	  "maxVelocity" : 3, 
	  //Optional - The max velocity attributed to the entity by gravity in both x and y. This is superseded by the specific maxVelocityX and maxVelocityY values. Defaults to 3.
	  "xGravity" : 0,
	  //Optional - The gravitational acceleration in units/millisecond that the entity moves in x. Defaults to 0.
	  "yGravity" : .01,
	  //Optional - The gravitational acceleration in units/millisecond that the entity moves in y. Defaults to .01.
	  "gravity" : 0
	  //Optional - The gravitational acceleration in units/millisecond that the entity moves in y. This is superseded by the specific yGravity. Defaults to .01.
    }
*/

(function(){
	return platformer.createComponentClass({
		id: 'logic-gravity',
		
		constructor: function(definition){
			this.vY = definition.gravity || definition.yGravity || .01;
			this.vX = definition.xGravity || 0;
			
			this.maxVelocity = definition.maxVelocity || 0;
			this.newMaxX = this.maxVelocityX = definition.maxVelocityX || this.maxVelocity;
			this.newMaxY = this.maxVelocityY = definition.maxVelocityY || this.maxVelocity;
			this.accelerationX = 0;
			this.accelerationY = 0;
			this.durationX = 0;
			this.durationY = 0;
			
			if(typeof this.owner.dx !== 'number'){
				this.owner.dx = 0;
			}
			if(typeof this.owner.dy !== 'number'){
				this.owner.dy = 0;
			}
			
			this.state = this.owner.state;
			
			this.hovering = this.state.hovering = this.state.hovering || false;
			this.falling  = this.state.falling  = this.state.falling  || false;
			this.grounded = this.state.grounded = this.state.grounded || !this.falling;
		},
		
		events:{
			"handle-logic": function(resp){
				var deltaT = resp.deltaT;
				
				if(!this.hovering){
					if(this.newMaxX !== this.maxVelocityX){
						if(this.durationX - deltaT > 0){
							this.maxVelocityX += (this.newMaxX - this.maxVelocityX) * (deltaT / this.durationX);
							this.durationX -= deltaT;
						} else if(this.accelerationX){
							if(this.newMaxX > this.maxVelocityX){
								if(this.owner.dx > this.maxVelocityX) {
									this.maxVelocityX = this.owner.dx;
								}
								this.maxVelocityX = Math.min(this.maxVelocityX + (this.accelerationX * resp.deltaT), this.newMaxX);
							} else {
								if(this.owner.dx < this.maxVelocityX) {
									this.maxVelocityX = this.owner.dx;
								}
								this.maxVelocityX = Math.max(this.maxVelocityX - (this.accelerationX * resp.deltaT), this.newMaxX);
							}
						} else {
							this.maxVelocityX = this.newMaxX;
							this.durationX = 0;
						}
					}
					
					if(this.newMaxY !== this.maxVelocityY){
						if(this.durationY - deltaT > 0){
							this.maxVelocityY += (this.newMaxY - this.maxVelocityY) * (deltaT / this.durationY);
							this.durationY -= deltaT;
						} else if(this.accelerationY){
							if(this.newMaxY > this.maxVelocityY){
								if(this.owner.dy > this.maxVelocityY) {
									this.maxVelocityY = this.owner.dy;
								}
								this.maxVelocityY = Math.min(this.maxVelocityY + (this.accelerationY * resp.deltaT), this.newMaxY);
							} else {
								if(this.owner.dy < this.maxVelocityY) {
									this.maxVelocityY = this.owner.dy;
								}
								this.maxVelocityY = Math.max(this.maxVelocityY - (this.accelerationY * resp.deltaT), this.newMaxY);
							}
						} else {
							this.maxVelocityY = this.newMaxY;
							this.durationY = 0;
						}
					}
					
					this.owner.dx += this.vX * deltaT;
					this.owner.dy += this.vY * deltaT;
					
					if(this.vX && this.maxVelocityX && (this.owner.dx > this.maxVelocityX)){
						this.owner.dx = this.maxVelocityX;
					}
					if(this.vY && this.maxVelocityY && (this.owner.dy > this.maxVelocityY)){
						this.owner.dy = this.maxVelocityY;
					}
				}
				
				if(this.state.hovering !== this.hovering){
					this.state.hovering = this.hovering;
				}
				if(this.state.falling !== this.falling){
					this.state.falling = this.falling;
				}
				if(this.state.grounded !== this.grounded){
					this.state.grounded = this.grounded;
				}
				this.grounded = false;
				this.falling  = true;
			},
			"hit-solid": function(collisionInfo){
				if(!this.hovering){
					if(((collisionInfo.y > 0) && (this.vY > 0)) || ((collisionInfo.y < 0) && (this.vY < 0))){
						this.owner.dy = 0;
						this.falling = false;
						this.grounded = true;
					} else if(((collisionInfo.x < 0) && (this.vX < 0)) || ((collisionInfo.x > 0) && (this.vX > 0))){
						this.owner.dx = 0;
						this.falling = false;
						this.grounded = true;
					}
				}
				return true;
			},
			"glide": function(resp) {
				var max      = resp.maxVelocity || this.maxVelocity,
				duration     = resp.duration || 0,
				acceleration = resp.acceleration || 0;				
				
				this.durationX = resp.durationX || duration;
				this.durationY = resp.durationY || duration;
				
				this.accelerationX = resp.accelerationX || acceleration;
				this.accelerationY = resp.accelerationY || acceleration;
				
				this.newMaxX = resp.maxVelocityX || max || this.maxVelocityX;
				this.newMaxY = resp.maxVelocityY || max || this.maxVelocityY;
				
				if(!this.durationX && !this.accelerationX){
					this.maxVelocityX = this.newMaxX;
				}
				if(!this.durationY && !this.accelerationY){
					this.maxVelocityY = this.newMaxY;
				}
			},
			"gravitate": function(value) {
				this.vY = value.gravity || value.yGravity || 0;
				this.vX = value.xGravity || 0;
			},
			"hover": function(value){
				this.owner.dx = 0;
				this.owner.dy = 0;
				this.hovering = !value || (value.pressed !== false);
			},
			"fall": function(value){
				this.hovering = !!value && (value.pressed === false);
			}
		},
		
		methods: {
			destroy: function(){
				this.owner.dx = 0;
				this.owner.dy = 0;
			}
		}
	});
})();


/*--------------------------------------------------
 *   logic-jump - ../engine/components/logic-jump.js
 */
/**
# COMPONENT **logic-jump**
This component will cause the entity to jump with a certain amount of acceleration for a certain period of time.

## Dependencies:
- [[handler-logic]] (on entity's parent) - This component listens for a logic tick message to maintain and update its location.

## Messages

### Listens for:
- **handle-logic** - On a `tick` logic message, the component updates its location according to its current state.
- **jump** - On receiving this message, the component causes the entity's position to change according to the preset behavior.
  > @param message.pressed (boolean) - Optional. If `message` is included, the component checks the value of `pressed`: a value of false will not make it jump.
- **[Message specified in definition]** - An alternative message can be specified in the JSON definition that will also cause the jump.
  > @param message.pressed (boolean) - Optional. If `message` is included, the component checks the value of `pressed`: a value of false will not make it jump.
- **hit-solid** - On receiving this message, the component discontinues its jump velocity.
  > @param collisionInfo.x (number) - Either 1,0, or -1. Zeros out the jump velocity if acceleration is in the contrary direction.
  > @param collisionInfo.y (number) - Either 1,0, or -1. Zeros out the jump velocity if acceleration is in the contrary direction.

### Local Broadcasts:
- **just-jumped** - this component will trigger this message when it receives a "jump" message and is able to jump. This is useful for tying in a jump sound.

## JSON Definition:
    {
      "type": "logic-jump",
      
      "message": "do-action",
      // Optional: If specified, this message will cause the entity to jump on this message in addition to "jump".
      
      "accelerationX": 0.2,
      "accelerationY": -0.07,
      // Acceleration of the jump. Defaults to -4 for y, 0 for x.
      
      "time": 500
      // Optional: Time in milliseconds that the jump can continue being powered by the message input; defaults to 0 which causes instantaneous jumping behavior (and thus should have a substantially larger acceleration than applying jump acceleration over time). Defaults to 0.
    }

*/
(function(){
	return platformer.createComponentClass({
		id: 'logic-jump',
		constructor: function(definition){
			if(definition.message){
				this.addListener(definition.message);
				this[definition.message] = this['jump'];
			}
			
			this.aX = this.owner.accelerationX || definition.accelerationX || 0;
			this.aY = this.owner.accelerationY || definition.accelerationY || -4;
			if(typeof this.owner.dx !== 'number'){
				this.owner.dx = 0;
			}
			if(typeof this.owner.dy !== 'number'){
				this.owner.dy = 0;
			}
			
			this.time = definition.time || 0;
			
			this.jumpLength = 0;
			
			this.jumping = false;
			this.justJumped = false;
			this.grounded = true;
			
			this.state = this.owner.state;
			this.state.jumping    = false;
			this.state.justJumped = false;
		},
		
		events:{
			"handle-logic": function(resp){
				var deltaT   = resp.deltaT;
				
				if(this.state.justJumped !== this.justJumped){
					this.state.justJumped = this.justJumped;
				}

				if(this.justJumped){
					this.justJumped = false;
					this.jumpLength = this.time;
					this.owner.triggerEvent("just-jumped");
				}
				
				if(this.state.jumping !== this.jumping){
					this.state.jumping = this.jumping;
				}

				if(this.jumping){
					if(this.time){
						this.owner.dx += this.aX * deltaT;
						this.owner.dy += this.aY * deltaT;
						
						this.jumpLength -= deltaT;
						if(this.jumpLength < 0){
							this.jumping = false;
						}
					} else {
						this.owner.dx = this.aX;
						this.owner.dy = this.aY;

						this.jumping = false;
					}
				}
				
				this.grounded = false;
			},
			
			"jump": function(state){
				var jumping = false;
				
				if(state){
					jumping = (state.pressed !== false);
				} else {
					jumping = true;
				}

				if(!this.jumping && jumping && this.grounded){
					this.justJumped = true;
					this.jumping = true;
				} else if (this.jumping && !jumping) {
					this.jumping = false;
				}
			},
			
			"hit-solid": function(collisionInfo){
				if(!this.justJumped){
					if(collisionInfo.y){
						this.owner.dy = 0;
						if(((collisionInfo.y > 0) && (this.aY < 0)) || ((collisionInfo.y < 0) && (this.aY > 0))){
							this.jumping = false;
							this.grounded = true;
						}
					} else if(collisionInfo.x){
						this.owner.dx = 0;
						if(((collisionInfo.x < 0) && (this.aX > 0)) || ((collisionInfo.x > 0) && (this.aX < 0))){
							this.jumping = false;
							this.grounded = true;
						}
					}
				}
				return true;
			}
		}
	});
})();


/*--------------------------------------------------
 *   logic-portable - ../engine/components/logic-portable.js
 */
/**
# COMPONENT **logic-portable**
This component allows this entity to be carried by other entities with which it collides. Entities that should carry this entity need to have a [[Logic-Carrier]] component attached.

## Dependencies:
- [[Handler-Logic]] (on parent entity) - This component listens for 'handle-logic' messages to determine whether it should be carried or released each game step.
- [[Logic-Carrier]] (on peer entity) - This component triggers 'carry-me' and 'release-me' message, listened for by [[Logic-Carrier]] to handle carrying this entity.

## Messages

### Listens for:
- **handle-logic** - On receiving this message, this component triggers 'carry-me' or 'release-me' if its connection to a carrying entity has changed.
- **hit-solid** - On receiving this message, this component determines whether it is hitting its carrier or another entity. If it is hitting a new carrier, it will broadcast 'carry-me' on the next game step.
  > @param message.entity ([[Entity]]) - The entity with which the collision occurred.
  > @param message.x (number) - -1, 0, or 1 indicating on which side of this entity the collision occurred: left, neither, or right respectively.
  > @param message.y (number) - -1, 0, or 1 indicating on which side of this entity the collision occurred: top, neither, or bottom respectively.

### Peer Broadcasts
- **carry-me** - This message is triggered on a potential carrying peer, notifying the peer that this entity is portable.
  > @param message.entity ([[Entity]]) - This entity, requesting to be carried.
- **release-me** - This message is triggered on the current carrier, notifying them to release this entity.
  > @param message.entity ([[Entity]]) - This entity, requesting to be released.

## JSON Definition:
    {
      "type": "logic-portable",

      "portableDirections": {down: true}
      // This is an object specifying the directions that this portable entity can be carried on. Default is {down:true}, but "up", "down", "left", and/or "right" can be specified as object properties set to `true`.
    }
*/
platformer.components['logic-portable'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		var self = this;
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['handle-logic', 'hit-solid']);
		
		this.portableDirections = definition.portableDirections || {
			down: true //default is false, 'true' means as soon as carrier is connected downward
		};

        this.carrier      = this.lastCarrier = undefined;
        this.message      = {
        	entity: this.owner
        };
	};
	var proto = component.prototype;
	
	proto['handle-logic'] = function(resp){
		if(this.carrierConnected){
			if(this.carrier != this.lastCarrier){
				if(this.lastCarrier){
					this.lastCarrier.trigger('release-me', this.message);
				}
				this.carrier.trigger('carry-me', this.message);
			}
			
			this.carrierConnected = false;
		} else {
			if(this.carrier){
				this.carrier.trigger('release-me', this.message);
				this.carrier = undefined;
			}
		}
		this.lastCarrier = this.carrier;
	};
	
	proto['hit-solid'] = function(collisionInfo){
		if(collisionInfo.y > 0){
			this.updateCarrier(collisionInfo.entity, 'down');
		} else if(collisionInfo.y < 0){
			this.updateCarrier(collisionInfo.entity, 'up');
		} else if(collisionInfo.x < 0){
			this.updateCarrier(collisionInfo.entity, 'left');
		} else if(collisionInfo.x > 0){
			this.updateCarrier(collisionInfo.entity, 'right');
		}
	};
	
	proto.updateCarrier = function(entity, direction){
		if(this.portableDirections[direction]){
			if(entity){
				if (entity !== this.carrier){
					this.carrier = entity;
				}
				this.carrierConnected = true;
			}
		}
	};	
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   logic-pushable - ../engine/components/logic-pushable.js
 */
/**
# COMPONENT **logic-pushable**
A component that enables an entity to be pushed.

## Dependencies
- [[Handler-Logic]] (on entity's parent) - This component listens for a "handle-logic" message. It then moves the entity if it's being pushed.
- [[Collision-Basic]] (on entity) - This component listens for messages from the collision-basic component. In particular 'hit-solid' and 'push-entity' are coming from collision. 

## Messages

### Listens for:
- **handle-logic** - Checks to see if we're being pushed. If so, we get pushed. Then resets values.
  > @param resp.deltaT (number) - The time since the last tick.
- **push-entity** - Received when we collide with an object that can push us. We resolve which side we're colliding on and set up the currentPushX and currentPushY values so we'll move on the handle-logic call.
  > @param collisionInfo.x (number) - Either 1,0, or -1. 1 if we're colliding with an object on our right. -1 if on our left. 0 if not at all. 
  > @param collisionInfo.y (number) - Either 1,0, or -1. 1 if we're colliding with an object on our bottom. -1 if on our top. 0 if not at all.
- **hit-solid** - Called when the entity collides with a solid object. Stops the object from being pushed further in that direction.
  > @param collisionInfo.x (number) - Either 1,0, or -1. 1 if we're colliding with an object on our right. -1 if on our left. 0 if not at all. 
  > @param collisionInfo.y (number) - Either 1,0, or -1. 1 if we're colliding with an object on our bottom. -1 if on our top. 0 if not at all.

## JSON Definition
    {
      "type": "logic-pushable",
       "xPush" : .01,
	  //Optional - The distance per millisecond this object can be pushed in x. Defaults to .01.
	  "yPush" : .01,
	  //Optional - The distance per millisecond this object can be pushed in y. Defaults to .01.
	  "push" : .01
	  //Optional - The distance per millisecond this object can be pushed in x and y. Overwritten by the more specific values xPush and yPush. Defaults to .01.
    }
*/

platformer.components['logic-pushable'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		var self = this;
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['handle-logic', 'push-entity', 'hit-solid']);
		
		this.vX = 0; 
		this.vY = 0;
		/*
		this.maxVX = definition.maxVelocityX || definition.maxVelocity || 3;
		this.maxVY = definition.maxVelocityY || definition.maxVelocity || 3;
		*/
		this.yPush = definition.push || definition.yPush || 0;
		this.xPush = definition.push || definition.xPush || .01;
		this.currentPushX = 0;
		this.currentPushY = 0;
	};
	var proto = component.prototype;
	
	proto['handle-logic'] = function(resp){
		var deltaT = resp.deltaT;
		if(this.currentPushY){
			this.vY += (this.currentPushY / Math.abs(this.currentPushY)) * this.yPush * deltaT;
			/*
			if (this.vY > this.maxVY)
			{
				this.vY = this.maxVY;
			}
			*/
		}
		if(this.currentPushX){
			this.vX += (this.currentPushX / Math.abs(this.currentPushX)) * this.xPush * deltaT;
			/*
			if (this.vX > this.maxVX)
			{
				this.vX = this.maxVX;
			}
			*/
		}
		
		this.owner.x += (this.vX * deltaT);
		this.owner.y += (this.vY * deltaT);
		
		this.currentPushX = 0;
		this.currentPushY = 0;
		this.vX = 0;
		this.vY = 0;
	};
	
	proto['push-entity'] = function(collisionInfo){
		this.currentPushX -= (collisionInfo.x || 0);
		this.currentPushY -= (collisionInfo.y || 0);
	};
	
	proto['hit-solid'] = function(collisionInfo){
		if(((collisionInfo.y > 0) && (this.vY > 0)) || ((collisionInfo.y < 0) && (this.vY < 0))){
			this.vY = 0;
		} else if(((collisionInfo.x < 0) && (this.vX < 0)) || ((collisionInfo.x > 0) && (this.vX > 0))){
			this.vX = 0;
		}
		return true;
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
		this.owner = undefined;
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   counter - ../engine/components/counter.js
 */
/**
# COMPONENT **counter**
A simple component that keeps count of something and sends messages each time the count changes. Can also have a total. When it does it will display 'count / total'.

## Messages

### Listens for:
- **increment-count** - Increments the count by 1.
- **change-count** - Changes the count to the given value.
  > @param data.count (number) - The new count value.
- **change-total** - Changes the total to the given value.
  > @param data.total (number) - The new total value.
- **[increment-count message from definition]** - If the entity has multiple counters, you can define a message specific to each counter that will be translated into a increment-count call within the object.
- **[change-count message from definition]** - If the entity has multiple counters, you can define a message specific to each counter that will be translated into a change-count call within the object.
  > @param data.count (number) - The new count value.
- **[change-total message from definition]** - If the entity has multiple counters, you can define a message specific to each counter that will be translated into a change-total call within the object.
  > @param data.total (number) - The new total value.

### Local Broadcasts:
- **update-content** - A call used to notify other components that the count or total has changed.
  > @param number - The count.
  
## JSON Definition
    {
      "type": "counter",
      
      "countMessage" : "coin-change-count"
      //Optional - An alternate message to change-count. Used in the case that you have two counters on the same entity and want to talk to a specific one.
      
      "incrementMessage" : "coin-increment"
      //Optional - An alternate message to increment-count. Used in the case that you have two counters on the same entity and want to talk to a specific one.

      "totalMessage" : "coin-change-total"
      //Optional - An alternate message to change-total. Used in the case that you have two counters on the same entity and want to talk to a specific one.
    }
*/

platformer.components['counter'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];
		this.addListeners(['increment-count', 'change-count', 'change-total']);
		
		if(definition.incrementMessage)
		{
			this.addListener(definition.incrementMessage);
			this[definition.incrementMessage] = this['increment-count'];
		}
		if(definition.countMessage)
		{
			this.addListener(definition.countMessage);
			this[definition.countMessage] = this['change-count'];
		}
		if(definition.totalMessage)
		{
			this.addListener(definition.totalMessage);
			this[definition.totalMessage] = this['change-total'];
		}
		
		this.count = 0;
		this.total = 0;
		this.showTotal = definition.showTotal || false;
		this.output = {
			    text: ''
			};
	};
	var proto = component.prototype;
	
	proto['change-total'] = function(total){
		this.total = total;
		if(this.total)
		{
			this.output.text = this.count + "/" + this.total;
		} else {
			this.output.text = '' + this.count;
		}
		this.owner.trigger('update-content', this.output);
	};
	
	proto['change-count'] = function(count){
		this.count = count;
		if(this.total)
		{
			this.output.text = this.count + "/" + this.total;
		} else {
			this.output.text = '' + this.count;
		}
		this.owner.trigger('update-content', this.output);
	};
	
	proto['increment-count'] = function(){
		this.count++;
		if(this.total)
		{
			this.output.text = this.count + "/" + this.total;
		} else {
			this.output.text = '' + this.count;
		}
		this.owner.trigger('update-content', this.output);
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
		this.owner = undefined;
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   logic-timer - ../engine/components/logic-timer.js
 */
/**
# COMPONENT **logic-timer**
A timer that can used to trigger events. The timer can increment and decrement. It can be an interval timer, going off over and over. Has a max time which it will not exceed by default this is 1 hour.

## Dependencies
- [[Handler-Logic]] (on entity's parent) - This component listens for a "handle-logic" message to update the timer.

## Messages

### Listens for:
- **handle-logic** - Handles the update for the timer. Increments or decrements the current time. If it's hit the max it stops the timer at the max. If it hits the alarm it sets it off. Sends an update message indicating the timer's current time for other components to use.
  > @param data.deltaT (number) - The time passed since the last tick.
- **set** - Set the time.
  > @param data.time (number) - The new value for the time.
- **start** - Start the timer counting.
- **stop** - Stop the timer counting.

### Local Broadcasts:
- **[alarm message from definition]** - The definition.alarm value from the JSON definition is used as the message id. It's sent when the alarm goes off.
- **[update message from definition]** - The definition.update value from the JSON definition is used as the message id. It's sent every 'handle-logic' tick. 
  > @param message.time (number) - The current time value for the timer.

## JSON Definition
    {
      "type": "logic-timer",
      "time" : 0,
      //Optional - The starting time for the timer. Defaults to 0.
	  "alarmTime" : 10000,
	  //Optional - The time when the alarm will trigger the alarm message. Defaults to undefined, which never triggers the alarm.
	  "isInterval" : false,
	  //Optional - Whether or not the alarm fires at intervals of the alarmTime. Defaults to false.
	  "alarmMessage" : 'ding',
	  //Optional - The message sent when the alarm goes off. Defaults to ''.
	  "updateMessage" : '',
	  //Optional - The message sent when the timer updates. Defaults to ''.
	  "on" : true,
	  //Optional - Whether the alarm starts on. Defaults to true.
	  "isIncrementing" : true,
	  //Optional - Whether the timer is incrementing or decrementing. If the value is false it is decrementing. Defaults to true.
	  "maxTime" : 3600000
	  //Optional - The max value, positive or negative, that the timer will count to. At which it stops counting. Default to 3600000 which equals an hour.
    }
*/
platformer.components['logic-timer'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];
		this.addListeners(['handle-logic', 'set-timer', 'start-timer', 'stop-timer']);
		this.time = this.owner.time || definition.time ||  0;
		this.prevTime = this.time;
		this.alarmTime = this.owner.alarmTime || definition.alarmTime || undefined;
		this.isInterval = this.owner.isInterval || definition.isInterval || false;
		this.alarmMessage =  this.owner.alarmMessage || definition.alarmMessage || '';
		this.updateMessage = this.owner.updateMessage || definition.updateMessage || '';
		this.isOn = this.owner.on || definition.on || true;
		this.isIncrementing = this.owner.isIncrementing || definition.isIncrementing || true;
		this.maxTime = this.owner.maxTime || definition.maxTime || 3600000; //Max time is 1hr by default.
	};
	var proto = component.prototype;
	
	proto['handle-logic'] = function(data){
		if (this.isOn)
		{
			this.prevTime = this.time;
			this.isIncrementing ? this.time += data.deltaT : this.time -= data.deltaT;
			if (Math.abs(this.time) > this.maxTime)
			{
				//If the timer hits the max time we turn it off so we don't overflow anything.
				if (this.time > 0)
				{
					this.time = this.maxTime;
				} else if (this.time < 0) {
					this.time = -this.maxTime;
				}
				this['stop-timer']();
			}
			
			if (typeof this.alarmTime !== 'undefined')
			{
				if (this.isInterval)
				{
					if (this.isIncrementing)
					{
						if ( Math.floor(this.time / this.alarmTime) > Math.floor(this.prevTime / this.alarmTime))
						{
							this.owner.trigger(this.alarmMessage);
						}
					} else {
						if ( Math.floor(this.time / this.alarmTime) < Math.floor(this.prevTime / this.alarmTime))
						{
							this.owner.trigger(this.alarmMessage);
						}
					}
				} else {
					if (this.isIncrementing)
					{
						if (this.time > this.alarmTime && this.prevTime < this.alarmTime)
						{
							this.owner.trigger(this.alarmMessage);
						}
					} else {
						if (this.time < this.alarmTime && this.prevTime > this.alarmTime)
						{
							this.owner.trigger(this.alarmMessage);
						}
					}
	 			}
			}
		}
		this.owner.trigger(this.updateMessage, {time: this.time});
	};
	
	proto['set-timer'] = function(data){
		this.time = data.time;
	};
	
	proto['start-timer'] = function(){
		this.isOn = true;
	};
	
	proto['stop-timer'] = function(){
		this.isOn = false;
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
		this.owner = undefined;
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   logic-teleporter - ../engine/components/logic-teleporter.js
 */
/**
# COMPONENT **logic-teleporter**
This component listens for redirected collision messages and fires a message on the colliding entity to specify where the colliding entity should relocate itself.

## Dependencies:
- [[Collision-Basic]] (on entity) - This component listens for collision messages on the entity.
- [[Entity-Container]] (on entity's parent) - This component listens for new peer entities being added on its parent to find its teleport destination.

## Messages

### Listens for:
- **peer-entity-added** - This teleporter listens as other entities are added so it can recognize the entity it should teleport colliding objects to.
  > @param message (object) - expects an entity as the message object in order to determine whether it is the requested teleportation destination.
- **teleport-entity** - On receiving this message, the component will fire `teleport` on the colliding entity, sending this.destination. The colliding entity must handle the `teleport` message and relocate itself.
  > @param message.x (integer) - uses `x` to determine if collision occurred on the left (-1) or right (1) of this entity.
  > @param message.y (integer) - uses `y` to determine if collision occurred on the top (-1) or bottom (1) of this entity.
  > @param message.entity (object) - triggers a `teleport` message on `entity`.

### Peer Broadcasts:
- **teleport** - On receiving a `teleport-entity` message, if the colliding entity is colliding on the teleporter's facing side, this message is triggered on the colliding entity.
  > @param message (object) - sends the destination entity as the message object, the x and y coordinates being the most important information for the listening entity.

## JSON Definition:
    {
      "type": "logic-teleporter",
      
      "facing": "up",
      // Optional: "up", "down", "left", or "right". Will only trigger "teleport" if colliding entity collides on the facing side of this entity. If nothing is specified, all collisions fire a "teleport" message on the colliding entity.
      
      "teleportId": "Destination entity's linkId property"
      // Required: String that matches the "linkId" property of the destination entity. This destination entity is passed on a "teleport" message so teleporting entity knows where to relocate.
    }

*/
(function(){
	return platformer.createComponentClass({
        id: 'logic-teleporter',

        constructor: function(definition){
			
			this.destination = undefined;
			this.linkId = this.owner.teleportId || definition.teleportId;
			this.facing = this.owner.facing || definition.facing || false;
		
			if(this.facing){
				this.owner.state['facing-' + this.facing] = true;
			}
        },

		events: {// These are messages that this component listens for
			"peer-entity-added": function(entity){
				if(!this.destination && (entity.linkId === this.linkId)){
					this.destination = entity;
				}
			},
	
			"teleport-entity": function(collisionInfo){
				switch(this.facing){
				case 'up':
					if(collisionInfo.y < 0) {
						collisionInfo.entity.trigger('teleport', this.destination);
					}
					break;
				case 'right':
					if(collisionInfo.x > 0) {
						collisionInfo.entity.trigger('teleport', this.destination);
					}
					break;
				case 'down':
					if(collisionInfo.y > 0) {
						collisionInfo.entity.trigger('teleport', this.destination);
					}
					break;
				case 'left':
					if(collisionInfo.x < 0) {
						collisionInfo.entity.trigger('teleport', this.destination);
					}
					break;
				default:
					collisionInfo.entity.trigger('teleport', this.destination);
					break;
				}
			}
		},
		
		methods: {// These are methods that are called on the component
			"destroy": function(){
				this.destination = undefined;
			}
		}
		
	});
})();


/*--------------------------------------------------
 *   logic-portal - ../engine/components/logic-portal.js
 */
/**
# COMPONENT **logic-portal**
A component which changes the scene when activated. When the portal receives an occupied message it sends the entity in that message notifying it. This message is meant to give the entity a chance to activate the portal in the manner it wants. The portal can also be activated by simply telling it to activate.

## Dependencies
- [[Handler-Logic]] (on entity's parent) - This component listens for a "handle-logic" message it then checks to see if it should change the scene if the portal is activated.
- [[Change-Scene]] (on entity) - This component listens for the "new-scene" message that the logic-portal sends and actually handles the scene changing.
- [[Collision-Basic]] (on entity) - Not required, but if we want the 'occupied-portal' call to fire on collision you'll need to have a collision-basic component on the portal.

## Messages

### Listens for:
- **handle-logic** - Checks to see if we should change scene if the portal is activated.
- **occupied-portal** - This message takes an entity and then sends the entity a 'portal-waiting' message. The idea behind this was that you could use it with collision. When an entity gets in front of the portal the collision sends this message, we then tell the entity that collided to do whatever it needs and then it calls back to activate the portal.
  > @param message.entity (entity Object) - The entity that will receive the 'portal-waiting' message.
- **activate-portal** - This message turns the portal on. The next 'handle-logic' call will cause a change of scene.

### Local Broadcasts:
- **new-scene** - Calls the 'change-scene' component to tell it to change scenes.
  > @param object.destination (string) - The id of the scene that we want to go to.

### Peer Broadcasts:
- **portal-waiting** - Informs another object that the portal is waiting on it to send the activate message.
  > @param entity - This is the portal entity. To be used so that the object can communicate with it directly.

## JSON Definition
    {
      "type": "name-of-component",
      "destination" : "level-2"
      //Required - The destination scene to which the portal will take us. In most cases this will come into the portal from Tiled where you'll set a property on the portal you place.
    }
*/
platformer.components['logic-portal'] = (function(){ //TODO: Change the name of the component!
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['handle-logic', 'occupied-portal', 'activate-portal']);
		this.destination = this.owner.destination || definition.destination;
		this.activated = false;
		this.used = false; 
	};
	var proto = component.prototype;
	
	
	proto['handle-logic'] = function(){
		if (!this.used && this.activated)
		{
			this.owner.trigger("new-scene", {scene: this.destination});
			this.used = true;
		}
	};
	
	proto['occupied-portal'] = function(message){
		var entity = message.entity; 
		entity.trigger('portal-waiting', this.owner);
	};
	
	proto['activate-portal'] = function()
	{
		this.activated = true;
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
		this.owner = undefined;
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   collision-basic - ../engine/components/collision-basic.js
 */
/**
# COMPONENT **collision-basic**
This component causes this entity to collide with other entities. It must be part of a collision group and will receive messages when colliding with other entities in the collision group.

Multiple collision components may be added to a single entity if distinct messages should be triggered for certain collision areas on the entity or if the soft collision area is a different shape from the solid collision area. Be aware that too many additional collision areas may adversely affect performance. 

## Dependencies:
- [[Collision-Group]] (on entity's parent) - This component listens for 'prepare-for-collision', 'relocate-entity', and 'hit-by' messages, commonly triggered by [[Collision-Group]] on the parent entity.

## Messages

### Listens for:
- **collide-on** - On receiving this message, the component triggers `add-collision-entity` on the parent.
- **collide-off** - On receiving this message, the component triggers `remove-collision-entity` on the parent.
- **prepare-for-collision** - Updates the axis-aligned bounding box for this entity in preparation for collision checks.
- **relocate-entity** - This message causes the entity's x,y coordinates to update.
  > @param message.x (number) - Required. The new x coordinate.
  > @param message.y (number) - Required. The new y coordinate.
  > @param message.relative (boolean) - Optional. Determines whether the provided x,y coordinates are relative to the entity's current position. Defaults to `false`.
- **resolve-momentum** - On receiving this message, this component adds the currently stored momentum in x and y to its coordinates. 
- **hit-by-[collision-types specified in definition]** - When the entity collides with a listed collision-type, this message is received and re-triggered as a new message according to the component definition.

### Local Broadcasts
- **[Message specified in definition]** - On receiving a 'hit-by' message, custom messages are triggered on the entity corresponding with the component definition.

### Parent Broadcasts
- **add-collision-entity** - On receiving 'collide-on', this message is triggered on the parent.
- **remove-collision-entity** - On receiving 'collide-off', this message is triggered on the parent.

## JSON Definition:
    {
      "type": "collision-basic",
      
      "collisionType": "boulder",
      // Optional. Defines how this entity should be recognized by other colliding entities. Defaults to `none`.
      
      "immobile": true,
      // Optional. Defaults to `false`, but should be set to true if entity doesn't move for better optimization.
      
      "shape": {
      //Optional. Defines the shape of the collision area. Defaults to the width, height, regX, and regY properties of the entity.
      
        "type": "rectangle",
        // Optional. Defaults to "rectangle". Rectangles are currently the only supported shape.
        
        "offset": [0,-120]
        // Optional. Specifies the collision shape's position relative to the entity's x,y coordinates. Defaults to [0, 0].
        
        "points": [[-80,-120],[80, 120]]
        // Required. Specifies the top-left and bottom-right corners of the rectangle, with the center at [0,0].
      },
      
      //The following four properties are optional and can be specified instead of the more specific `shape` above. 
      "width": 160,
      // Optional. Sets the width of the collision area in world coordinates.
      
      "height": 240,
      // Optional. Sets the height of the collision area in world coordinates.
      
      "regX": 80,
      // Optional. Determines the x-axis center of the collision shape.

      "regY": 120,
      // Optional. Determines the y-axis center of the collision shape.
      
      "solidCollisions":{
      // Optional. Determines which collision types this entity should consider solid, meaning this entity should not pass through them.

        "boulder": "",
        // This specifies that this entity should not pass through other "boulder" collision-type entities.
        
        "diamond": "crack-up",
        // This specifies that this entity should not pass through "diamond" collision-type entities, but if it touches one, it triggers a "crack-up" message on the entity.

        "marble": ["flip", "dance", "crawl"]
        // This specifies that this entity should not pass through "marble" collision-type entities, but if it touches one, it triggers all three specified messages on the entity.
      },
      
      "softCollisions":{
      // Optional. Determines which collision types this entity should consider soft, meaning this entity may pass through them, but triggers collision messages on doing so.

        "water": "soaked",
        // This triggers a "soaked" message on the entity when it passes over a "water" collision-type entity.

        "lava": ["burn", "ouch"]
        // This triggers both messages on the entity when it passes over a "lava" collision-type entity.
      }
    }
*/
platformer.components['collision-basic'] = (function(){
	var twinBroadcast = function(component, funcA, funcB){
		return function (value) {
			funcA.call(component, value);
			funcB.call(component, value);
		  };
	};
	
	var entityBroadcast = function(event, solidOrSoft, collisionType){
		if(typeof event === 'string'){
			return function(value){
				if(value.myType === collisionType){
					if(value.hitType === solidOrSoft){
						this.owner.triggerEvent(event, value);
					}
				}
			};
		} else if(event.length){
			return function(value){
				if(value.myType === collisionType){
					if(value.hitType === solidOrSoft){
						for (var e in event){
							this.owner.triggerEvent(event[e], value);
						}
					}
				}
			};
		} else {
			return function(collisionInfo){
				var dx = collisionInfo.x,
				dy     = collisionInfo.y;
				
				if(collisionInfo.entity && !(dx || dy)){
					dx = collisionInfo.entity.x - this.owner.x;
					dy = collisionInfo.entity.y - this.owner.y;
				}
				
				if(collisionInfo.myType === collisionType){
					if(collisionInfo.hitType === solidOrSoft){
						if((dy > 0) && event['bottom']){
							this.owner.trigger(event['bottom'], collisionInfo);
						}
						if((dy < 0) && event['top']){
							this.owner.trigger(event['top'], collisionInfo);
						}
						if((dx > 0) && event['right']){
							this.owner.trigger(event['right'], collisionInfo);
						}
						if((dx < 0) && event['left']){
							this.owner.trigger(event['left'], collisionInfo);
						}
						if(event['all']){
							this.owner.trigger(event['all'], collisionInfo);
						}
					}
				}
			};
		}
	},
	reassignFunction = function(oldFunction, newFunction, collisionType){
		if(oldFunction){
			return function(collision){
				if(collision === collisionType){
					return newFunction(collision);
				} else {
					return oldFunction(collision);
				}
			};
		} else {
			return newFunction;
		}
	},
	component = function(owner, definition){
		this.type  = 'collision-basic';
		var x  = 0; 
		var self   = this;
		
		this.owner    = owner;
		this.immobile = this.owner.immobile = this.owner.immobile || definition.immobile || false;
		this.lastX    = this.owner.x;
		this.lastY    = this.owner.y;
		this.xMomentum= 0;
		this.yMomentum= 0;
		this.aabb     = new platformer.classes.aABB();
		this.prevAABB = new platformer.classes.aABB();
		this.relocateObj = {
								x: 0,
								y: 0,
								relative: false,
								xMomentum: 0,
								yMomentum: 0
							};

		var shapes = [];
		if(definition.shapes){
			shapes = definition.shapes;
		} else if (definition.shape) {
			shapes = [definition.shape];
		} else {
			var halfWidth  = (definition.width  || this.owner.width)  / 2;
			var halfHeight = (definition.height || this.owner.height) / 2;
			var margin = definition.margin || 0;
			var marginLeft   = definition.marginLeft   || margin;
			var marginRight  = definition.marginRight  || margin;
			var marginTop    = definition.marginTop    || margin;
			var marginBottom = definition.marginBottom || margin;
			var points = [[-halfWidth - marginLeft, -halfHeight - marginTop], [halfWidth + marginRight, halfHeight + marginBottom]];
			var offset = [(definition.regX?halfWidth-definition.regX:(this.owner.regX?halfWidth-this.owner.regX:0)) + (marginRight - marginLeft)/2, (definition.regY?halfHeight-definition.regY:(this.owner.regY?halfHeight-this.owner.regY:0)) + (marginBottom - marginTop)/2];
			shapes = [{offset: offset, points: points, shape: 'rectangle'}];
		}
		
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['collide-on',
		                   'collide-off',
		                   'prepare-for-collision', 'handle-logic', 
		                   'relocate-entity',
		                   'resolve-momentum']);
		this.shapes = [];
		this.entities = undefined;
		for (x in shapes){
			this.shapes.push(new platformer.classes.collisionShape([this.owner.x, this.owner.y], shapes[x].type, shapes[x].points, shapes[x].offset, shapes[x].radius));
			this.prevAABB.include(this.shapes[x].getAABB());
			this.aabb.include(this.shapes[x].getAABB());
		}

		this.collisionType = definition.collisionType || 'none';
		
		if(definition.jumpThrough){
			this.owner.jumpThrough = true;
		}
		
		this.owner.collisionTypes = this.owner.collisionTypes || [];
		this.owner.collisionTypes[this.owner.collisionTypes.length] = this.collisionType;

		this.owner.getAABB = reassignFunction(this.owner.getAABB, function(collisionType){
			return self.getAABB();
		}, this.collisionType);

		this.owner.getPreviousAABB = reassignFunction(this.owner.getPreviousAABB, function(collisionType){
			return self.getPreviousAABB();
		}, this.collisionType);

		this.owner.getShapes = reassignFunction(this.owner.getShapes, function(collisionType){
			return self.getShapes();
		}, this.collisionType);
			
		this.owner.getPreviousX = reassignFunction(this.owner.getPreviousX, function(collisionType){
			return self.lastX;
		}, this.collisionType);

		this.owner.getPreviousY = reassignFunction(this.owner.getPreviousY, function(collisionType){
			return self.lastY;
		}, this.collisionType);
		
		this.owner.solidCollisions = this.owner.solidCollisions || {};
		this.owner.solidCollisions[this.collisionType] = [];
		if(definition.solidCollisions){
			for(var i in definition.solidCollisions){
				this.owner.solidCollisions[this.collisionType].push(i);
				if(definition.solidCollisions[i]){
					this.addListener('hit-by-' + i);
					this['hit-by-' + i] = entityBroadcast(definition.solidCollisions[i], 'solid', this.collisionType);
				}
			}
		}

		this.owner.softCollisions = this.owner.softCollisions || {};
		this.owner.softCollisions[this.collisionType] = [];
		if(definition.softCollisions){
			for(var i in definition.softCollisions){
				this.owner.softCollisions[this.collisionType].push(i);
				if(definition.softCollisions[i]){
					if(this['hit-by-' + i]) {
						//this['hit-by-' + i + '-solid'] = this['hit-by-' + i];
						//this['hit-by-' + i + '-soft'] = entityBroadcast(definition.softCollisions[i], 'soft');
						this['hit-by-' + i] = twinBroadcast(this, this['hit-by-' + i], entityBroadcast(definition.softCollisions[i], 'soft', this.collisionType));
					} else {
						this.addListener('hit-by-' + i);
						this['hit-by-' + i] = entityBroadcast(definition.softCollisions[i], 'soft', this.collisionType);
					}
				}
			}
		}
	};
	var proto = component.prototype;
	
	proto['collide-on'] = function(){
		this.owner.parent.trigger('add-collision-entity', this.owner);
	};
	
	proto['collide-off'] = function(){
		this.owner.parent.trigger('remove-collision-entity', this.owner);
	};
	
	proto['handle-logic'] = function(){
		if(this.accelerationAbsorbed){
			this.accelerationAbsorbed = false;
		}
	};

	proto['prepare-for-collision'] = function(resp){
		this.prevAABB.set(this.aabb);
		this.aabb.reset();
		
		// absorb velocities from the last logic tick
		if(!this.accelerationAbsorbed && resp){
			this.accelerationAbsorbed = true;
			if(this.owner.dx){
				this.owner.x += this.owner.dx * (resp.deltaT || 0);
			}
			if(this.owner.dy){
				this.owner.y += this.owner.dy * (resp.deltaT || 0);
			}
		}
		
		// update shapes
		for (var x = 0; x < this.shapes.length; x++){
			this.shapes[x].update(this.owner.x, this.owner.y);
			this.aabb.include(this.shapes[x].getAABB());
		}
	};
	
	proto['relocate-entity'] = function(resp){
		if(resp.relative){
			this.owner.x = this.lastX + resp.x;
			this.owner.y = this.lastY + resp.y;
		} else {
			this.owner.x = resp.x;
			this.owner.y = resp.y;
		}

		this.aabb.reset();
		for (var x in this.shapes){
			this.shapes[x].reset(this.owner.x, this.owner.y);
			this.aabb.include(this.shapes[x].getAABB());
		}

		this.lastX = this.owner.x;
		this.lastY = this.owner.y;
		
		this.xMomentum = resp.xMomentum || 0;
		this.yMomentum = resp.yMomentum || 0;
	};
	
	proto['resolve-momentum'] = function(){
		this.owner.x += this.xMomentum;
		this.owner.y += this.yMomentum;
		this.xMomentum = 0;
		this.yMomentum = 0;
	};
	
	proto.getAABB = function(){
		return this.aabb;
	};
	
	proto.getPreviousAABB = function(){
		return this.prevAABB;
	};
	
	proto.getShapes = function(){
		var shapes = this.shapes.slice();
		
/*		if(this.entities && (this.entities.length > 1)){
			for (var x = 0; x < this.entities.length; x++){
				if(this.entities[x] !== this.owner){
					shapes = shapes.concat(this.entities[x].shapes || this.entities[x].getShapes());
				}
			}
		}*/
		return shapes;
	};

	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   collision-tiles - ../engine/components/collision-tiles.js
 */
/**
# COMPONENT **collision-tiles**
This component causes the tile-map to collide with other entities. It must be part of a collision group and will cause "hit-by-tile" messages to fire on colliding entities.

## Dependencies:
- [[Collision-Group]] (on entity's parent) - This component handles the collision state of the map for the [[Collision-Group]] component on the parent entity.
- [[CollisionShape]] object - This component uses collisionShape objects to expose individual tiles to the collision group.

## Methods

- **getTiles** - Returns all the collision tiles within the provided axis-aligned bounding box.
  > @param aabb ([[Aabb]]) - The axis-aligned bounding box for which tiles should be returned.
  > @return tiles (Array of objects) - Each returned object provides the shape [[collisionShape]] of the tile and the grid coordinates of the returned tile.
- **getAABB** - Returns the axis-aligned bounding box of the entire map.
  > @return aabb (object) - The returned object provides the top, left, width, and height of the collision map.
- **isTile** - Confirms whether a particular map grid coordinate contains a tile.
  > @param x (number) - Integer specifying the row of tiles in the collision map to check.
  > @param y (number) - Integer specifying the column of tiles in the collision map to check.
  > @return isTile (boolean) - Returns `true` if the coordinate contains a collision tile, `false` if it does not.

## JSON Definition:
    {
      "type": "collision-tiles",
      
      "collisionMap": [[-1,-1,-1], [1,-1,-1], [1,1,1]],
      // Required. A 2D array describing the tile-map with off (-1) and on (!-1) states.
      
      "tileWidth": 240,
      // Optional. The width of tiles in world coordinates. Defaults to 10.
      
      "tileHeight": 240,
      // Optional. The height of tiles in world coordinates. Defaults to 10.
    }
*/
platformer.components['collision-tiles'] = (function(){
	var component = function(owner, definition){
		var self = this;
		this.owner = owner;
		
		this.collisionMap   = definition.collisionMap  || [];
		this.platformIndex  = definition.platformIndex || -2;
		this.tileWidth      = definition.tileWidth  || this.owner.tileWidth  || 10;
		this.tileHeight     = definition.tileHeight || this.owner.tileHeight || 10;
		this.tileHalfWidth  = this.tileWidth  / 2;
		this.tileHalfHeight = this.tileHeight / 2;
		
		// Messages that this component listens for
		this.listeners = [];
		
		this.owner.getTiles = function(aabb, prevAABB){
			return self.getTiles(aabb, prevAABB);
		};
		this.owner.getAABB = function(){
			return self.getAABB();
		};
		this.owner.isTile = function(x, y){
			return self.isTile(x, y);
		};
	};
	var proto = component.prototype;

	proto.getAABB = function(){
		return {
			left: 0,
			top:  0,
			right: this.tileWidth * this.collisionMap.length,
			bottom: this.tileHeight * this.collisionMap.length[0]
		};
	};
	
	proto.isTile = function (x, y) {
		if (x >=0 && x < this.collisionMap.length && y >=0 && y < this.collisionMap[0].length && this.collisionMap[x][y] != -1){
			return true;
		} else { //If there's not a tile or we're outside the map.
			return false;
		}
	};
	
	proto.getTiles = function(aabb, prevAABB){
		var left = Math.max(Math.floor(aabb.left   / this.tileWidth),  0),
		top      = Math.max(Math.floor(aabb.top    / this.tileHeight), 0),
		right    = Math.min(Math.ceil(aabb.right   / this.tileWidth),  this.collisionMap.length),
		bottom   = Math.min(Math.ceil(aabb.bottom  / this.tileHeight), this.collisionMap[0].length),
		x        = 0,
		y        = 0,
		tiles   = [];
		
		for (x = left; x < right; x++){
			for (y = top; y < bottom; y++){
				if (this.collisionMap[x][y] != -1) {
					if(!(this.platformIndex === this.collisionMap[x][y]) || (prevAABB.bottom <= y * this.tileHeight)){
						tiles.push({ //TODO: Make some optimizations here. Remove creation of objects if possible. - DDD
							gridX: x,
							gridY: y,
							shapes: [new platformer.classes.collisionShape([x * this.tileWidth + this.tileHalfWidth, y * this.tileHeight + this.tileHalfHeight], 'rectangle', [[-this.tileHalfWidth, -this.tileHalfHeight],[this.tileHalfWidth, this.tileHalfHeight]])]
						});
					}
				}
			}
		}
		
		return tiles;
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/
	
	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   ai-pacer - ../engine/components/ai-pacer.js
 */
/**
# COMPONENT **ai-pacer**
This component acts as a simple AI that will reverse the movement direction of an object when it collides with something.

## Dependencies:
- [[Collision-Basic]] (on entity) - This component listens for collision messages on the entity.
- [[Logic-Directional-Movement]] (on entity) - This component receives triggered messages from this component and moves the entity accordingly.
- [[Handler-Ai]] (on entity's parent) - This component listens for an ai "tick" message to orderly perform its control logic.

## Messages

### Listens for:
- **handle-ai** - This AI listens for a step message triggered by its entity parent in order to perform its logic on each tick.
- **turn-around** - On receiving this message, the component will check the collision side and re-orient itself accordingly.
  > @param message.x (integer) - uses `x` to determine if collision occurred on the left (-1) or right (1) of this entity.
  > @param message.y (integer) - uses `y` to determine if collision occurred on the top (-1) or bottom (1) of this entity.

### Local Broadcasts:
- **stop** - Triggered by this component before triggering another direction.
- **go-down**, **go-left**, **go-up**, **go-right** - Triggered in response to an entity colliding from the opposing side.

## JSON Definition:
    {
      "type": "ai-pacer",
      
      "movement": "horizontal",
      // Optional: "vertical", "horizontal", or "both". If nothing is specified, entity changes direction when colliding from any direction ("both").
      
      "direction": "up"
      // Optional: "up", "right", "down", or "left". This specifies the initial direction of movement. Defaults to "up", or "left" if `movement` is horizontal.
    }
*/
(function(){
	return platformer.createComponentClass({
		id: "ai-pacer",
		
		constructor: function(definition){
			this.movement         = definition.movement  || 'both';
			this.lastDirection    = '';
			this.currentDirection = definition.direction || ((this.movement === 'horizontal')?'left':'up');
		},
		
		events: {
			"handle-ai": function(obj){
				if(this.currentDirection !== this.lastDirection){
					this.lastDirection = this.currentDirection;
					this.owner.trigger('stop');
					this.owner.trigger('go-' + this.currentDirection);
				}
			},
			
			"turn-around": function(collisionInfo){
				if ((this.movement === 'both') || (this.movement === 'horizontal')){
					if(collisionInfo.x > 0){
						this.currentDirection = 'left';
					} else if (collisionInfo.x < 0) {
						this.currentDirection = 'right';
					}
				} 
				if ((this.movement === 'both') || (this.movement === 'vertical')){
					if(collisionInfo.y > 0){
						this.currentDirection = 'up';
					} else if (collisionInfo.y < 0) {
						this.currentDirection = 'down';
					}
				} 
			}
		}
	});
})();


/*--------------------------------------------------
 *   render-gui - ../game/components/render-gui.js
 */
platformer.components['render-gui'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['handle-render', 'handle-render-load', 'logic-gem-added', 'logic-gem-collected']);
		
		this.background = undefined;
		this.stage = undefined;
		
		var spriteSheetSpec = {
			images: definition.spriteSheet.images.slice(),
			frames: definition.spriteSheet.frames,
			animations: definition.spriteSheet.animations
		};
		for (var x = 0; x < spriteSheetSpec.images.length; x++)
		{
			spriteSheetSpec.images[x] = platformer.assets[spriteSheetSpec.images[x]];
		}
		var spriteSheet = new createjs.SpriteSheet(spriteSheetSpec);
		this.background = new createjs.BitmapAnimation(spriteSheet);
		this.currentAnimation = 'default';
		this.background.scaleX = this.owner.scaleX || 1;
		this.background.scaleY = this.owner.scaleY || 1;
		if(this.currentAnimation){
			this.background.gotoAndPlay(this.currentAnimation);
		}
	};
	var proto = component.prototype;
	
	proto['handle-render-load'] = function(resp){
		this.stage = resp.stage;
		this.stage.addChild(this.background);
		this.background.x = 200;
		this.background.y = 200;
		this.background.z = this.owner.z;
	};
	
	proto['handle-render'] = function(resp){
		
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   render-counter - ../game/components/render-counter.js
 */
platformer.components['render-counter'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['handle-render', 'handle-render-load', 'refresh-count']);
		this.currentValue = 0;
		this.targetValue = 0;
		this.txt = new createjs.Text(this.currentValue.toString());
		this.txt.scaleX = definition.scaleX || this.owner.scaleX || 1;
		this.txt.scaleY = definition.scaleY || this.owner.scaleY || 1;
		this.txt.color = definition.color || '#000';
	};
	var proto = component.prototype;
	
	proto['handle-render-load'] = function(resp){
		//this.stage = resp.stage;
		this.txt.x = this.owner.x;
		this.txt.y = this.owner.y;
		this.txt.z = this.owner.z;
		this.txt.textAlign = "center";
		this.txt.textBaseline = "middle";
		resp.stage.addChild(this.txt);
	};
	
	proto['handle-render'] = function(){
		// Run loading code here
		if (this.currentValue != this.targetValue)
		{
			if (this.currentValue < this.targetValue)
			{
				this.currentValue++;
			}
			if (this.currentValue > this.targetValue)
			{
				this.currentValue--;
			}
			this.txt.text = this.currentValue;
		}
	};
	
	proto['refresh-count'] = function(data){
		this.targetValue = data;
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   render-clock - ../game/components/render-clock.js
 */
platformer.components['render-clock'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['handle-render', 'handle-render-load', 'refresh-clock']);
		this.stage = undefined;
		this.currentValue = 0;
		this.targetValue = 0;
		this.txt = new createjs.Text(this.currentValue.toString());
		this.txt.scaleX = definition.scaleX || this.owner.scaleX || 1;
		this.txt.scaleY = definition.scaleY || this.owner.scaleY || 1;
		this.txt.color = definition.color || '#000';
	};
	var proto = component.prototype;
	
	proto['handle-render-load'] = function(resp){
		this.stage = resp.stage;
		this.txt.x = this.owner.x;
		this.txt.y = this.owner.y;
		this.txt.z = this.owner.z;
		this.txt.textAlign = "center";
		this.txt.textBaseline = "middle";
		this.stage.addChild(this.txt);
	};
	
	proto['handle-render'] = function(){
		this.txt.text = Math.floor(this.time / 1000).toString() + 'sec.';
	};
	
	proto['refresh-clock'] = function(data){
		this.time = data.time;
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.stage.removeChild(this.txt);
		this.stage = undefined;
		this.txt = undefined;
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   logic-collectible-manager - ../game/components/logic-collectible-manager.js
 */
platformer.components['logic-collectible-manager'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['load', 'peer-entity-added', 'gem-collected']);
		
		this.gemsCollected = 0;
		this.gemTotal = 0;
	};
	var proto = component.prototype;
	
	proto['load'] = function(resp){
		
	};
	
	proto['peer-entity-added'] = function(entity){
		if(entity.type == 'gem')
		{
			this.gemTotal++;
			//this.owner.trigger('logic-gem-added', {total: this.gemTotal});
		}
	};
	
	proto['gem-collected'] = function(resp){
		this.gemsCollected++;
		this.owner.trigger("broadcast-gem-collected", {count:this.gemsCollected});
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   logic-hero - ../game/components/logic-hero.js
 */
(function(){

	return platformer.createComponentClass({

		id: "logic-hero",
		
		constructor: function(definition){
			var state = this.state = this.owner.state;
			state.swing = false;
			state.swingHit = false;
			
			this.teleportDestination = undefined;
			this.justTeleported = false;
		},
		
		events:{
			"handle-logic": function(){
				if (this.teleportDestination) {
					this.owner.trigger('relocate-entity', this.teleportDestination);
					this.teleportDestination = undefined;
				}
				
				this.state.swingHit = false;
				if(this.swing){
					this.state.swing = true;
					if(this.swingInstance){
						this.state.swingHit = true;
						this.owner.parent.addEntity(new platformer.classes.entity(platformer.settings.entities['pickaxe'], {
							properties: {
								x: this.owner.x + (this.state.right?1:-1) * 140,
								y: this.owner.y
							}
						}));
					}
				} else {
					this.state.swing = false;
				}
		
				this.swingInstance = false;		
			},
	
			"teleport": function (posObj) {
				this.teleportDestination = {x: posObj.x, y: posObj.y};
			},
	
			"portal-waiting": function (portal) {
				portal.trigger('activate-portal');
			},

			"key-swing": function (state) {
				if(state.pressed)
				{
					if(!this.swing){
						this.swing = true;
						this.swingInstance = true;
					}
				} else {
					this.swing = false;
				}
			}
		}
	});
})();


/*--------------------------------------------------
 *   logic-gem - ../game/components/logic-gem.js
 */
platformer.components['logic-gem'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		var self = this;
		
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['load', 'collect-gem', 'peer-entity-added']);
		
		this.manager = undefined;
	};
	var proto = component.prototype;
	
	
	proto['load'] = function(resp){
		this.owner.trigger('logical-state', {state: 'default'});
	};
	
	proto['peer-entity-added'] = function(entity){
		if(entity.type == 'collectible-manager')
		{
			this.manager = entity;
		}
	};
	
	proto['collect-gem'] = function(collisionInfo){
		if(this.manager)
		{
			this.manager.trigger('gem-collected');
		}
		this.owner.trigger('sound-collect-gem');
		this.owner.parent.removeEntity(this.owner);
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.manager = undefined;
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   logic-gui - ../game/components/logic-gui.js
 */
platformer.components['logic-gui'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['load', 'gui-gem-collected']);
	};
	var proto = component.prototype;
	
	proto['load'] = function(resp){
		this.owner.trigger('logical-state', {state: 'default'});
	};
	
	proto['gui-gem-collected'] = function(data){
		this.owner.trigger('count-gems', data.count);
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   logic-fps-counter - ../engine/components/logic-fps-counter.js
 */
/*
# COMPONENT **logic-fps-counter**
This component renders the avg FPS and other developer defined debug data to the screen. The developer defined values can be used to keep track of how long portions of code are taking to process on average. To do this, send messages to 'time-elapsed' with a 'name' and 'time' value. The name value is the label that you want displayed. The time value should be the time in ms that was spent performing that operation. These values are averaged over a number of ticks. 

## Dependencies:
- [[Handler-Logic]] (on entity) - This component listens for the 'handle-logic' message to update itself.
- [[Dom-Element]] (on entity's) - This component requires a dom element to render the text.
- [[Scene]] - This component receives 'time-elapsed' message from the Scene which are necessary for its functionality.

## Messages

### Listens for:
- **handle-logic** - A call from the [[Handler-Logic]]. This updates the information we're displaying including the FPS counter.
- **time-elapsed** - Called to give the counter the time spent doing a certain operation. The Scene sends a value named 'Engine Total' when a tick has occurs.

### Local Broadcasts:
- **update-content** - Calls the dom element to update the information that should be displayed.
  > @param counter (object) - An object with a 'text' field which contains the html for the names and times that are to be displayed.

## JSON Definition:
    {
		"type": "logic-fps-counter",
		"ticks": 45
		//Optional - The number of ticks across which we average the values. Defaults to 30.
	}
*/

platformer.components['logic-fps-counter'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];
		this.addListeners(['handle-logic', 'time-elapsed']);

		this.counter = {
			text: ''
		};
		this.times = {};
		this.timeElapsed = false;
		this.ticks = definition.ticks || 30; //number of ticks for which to take an average
		this.count = this.ticks;
	};
	var proto = component.prototype;
	
	proto['handle-logic'] = function(){
		if(!platformer.settings.debug && this.owner.parent){
			this.owner.parent.removeEntity(this.owner);
		}

		if(this.timeElapsed){ //to make sure we're not including 0's from multiple logic calls between time elapsing.
			this.timeElapsed = false;
			this.count--;
			if(!this.count){
				this.count = this.ticks;
				var text = Math.floor(createjs.Ticker.getMeasuredFPS()) + " FPS<br />";
				for(var name in this.times){
					text += '<br />' + name + ': ' + Math.round(this.times[name] / this.ticks) + 'ms';
					this.times[name] = 0;
				}
				this.counter.text = text;
				this.owner.trigger('update-content', this.counter);
			}
		}
	};
	
	proto['time-elapsed'] = function(value){
		if(value){
			if(value.name){
				if((value.name === 'Engine Total') && !this.timeElapsed){
					this.timeElapsed = true;
				}
				if (!this.times[value.name]){
					this.times[value.name] = 0;
				}
				this.times[value.name] += value.time;
			}
		}
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.counter = undefined;
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();


/*--------------------------------------------------
 *   Browser - ../engine/browser.js
 */
/**
# Function
Browser.js is one large function that is used to discover what browser is being used the capabilities of the browser. In addition to browser type, we determine whether it is mobile or desktop, whether it supports multi or single-touch, what type of audio it can play, and whether it supports canvas or not. 
All of this information is added to platformer.settings.supports and used throughout the code, including when determine which layers to display (e.g. adding a button layer for mobile devices), and in audio so that we load and play the correct sound types. 
*/
(function(){
	var uagent   = navigator.userAgent.toLowerCase(),
	    
	    myAudio  = document.createElement('audio'),
	    
	    supports = {
			canvas:      false, // determined below
			touch:       !!('ontouchstart' in window),

			// specific browsers as determined above
			iPod:      (uagent.search('ipod')    > -1),
			iPhone:    (uagent.search('iphone')  > -1),
			iPad:      (uagent.search('ipad')    > -1),
			safari:    (uagent.search('safari')  > -1),
			ie:        (uagent.search('msie')    > -1),
		    firefox:   (uagent.search('firefox') > -1),
			android:   (uagent.search('android') > -1),
			chrome:    (uagent.search('chrome')  > -1),
			silk:      (uagent.search('silk')    > -1),
			iOS:       false, //determined below
			mobile:    false, //determined below
			desktop:   false, //determined below
			multitouch:false, //determined below
			
			// audio support as determined below
			ogg:         true,
			m4a:         true,
			mp3:         true
		},
	    aspects = platformer.settings.aspects,
	    supportsAspects = {},
	    i = 0,
	    j = 0,
	    k = 0,
	    foundAspect = false,
	    listAspects = '';
	
	supports.iOS     = supports.iPod || supports.iPhone  || supports.iPad;
	supports.mobile  = supports.iOS  || supports.android || supports.silk;
	supports.desktop = !supports.mobile;
	
	//Determine multitouch:
	if(supports.touch){
		if (supports.android){
			if(parseInt(uagent.slice(uagent.indexOf("android") + 8)) > 2){
				supports.multitouch = true;
			}
		} else {
			supports.multitouch = true;
		}
	}
	
	// Determine audio support
	if ((myAudio.canPlayType) && !(!!myAudio.canPlayType && "" != myAudio.canPlayType('audio/ogg; codecs="vorbis"'))){
	    supports.ogg = false;
	    if(supports.ie || !(!!myAudio.canPlayType && "" != myAudio.canPlayType('audio/mp4'))){
	    	supports.m4a = false; //make IE use mp3's since it doesn't like the version of m4a made for mobiles
	    }
	}

	// Does the browser support canvas?
	var canvas = document.createElement('canvas');
	try	{
		supports.canvas = !!(canvas.getContext('2d')); // S60
	} catch(e) {
		supports.canvas = !!(canvas.getContext); // IE
	}
	delete canvas;

		//replace settings aspects build array with actual support of aspects
		platformer.settings.aspects = supportsAspects;
	platformer.settings.aspects = {};
	for (i in aspects){
		foundAspect = false;
		listAspects = '';
		for (j in aspects[i]){
			listAspects += ' ' + j;
			for (k in aspects[i][j]){
				if (uagent.search(aspects[i][j][k]) > -1){
					platformer.settings.aspects[j] = true;
					foundAspect = true;
					break;
				}
			}
			if(foundAspect) break;
		}
		if(!foundAspect){
			console.warn('This browser doesn\'t support any of the following: ' + listAspects);
		}
	}

	platformer.settings.supports = supports;

})();


/*--------------------------------------------------
 *   Main - ../engine/main.js
 */
/**
# Main.js
Main.js creates the game object. Main.js is called on the window 'load' event.
*/

// Clean up console logging for MSIE
(function(window){
	if(window && !window.console){
		var console = window.console = {};
		console.log = console.warn = console.error = function(){};
	}
})(window);

window.addEventListener('load', function(){
//	window.console = {log:function(txt){document.title += txt;}}; //test code for android
//	document.title = '';

	platformer.game = new platformer.classes.game(platformer.settings, function(game){});
	createjs.Ticker.useRAF = true;
	createjs.Ticker.setFPS(platformer.settings.global.fps);
	createjs.Ticker.addListener(platformer.game);
}, false);

})();