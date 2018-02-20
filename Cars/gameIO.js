var requestFrame = (window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
	function(callback) {
		window.setTimeout(callback, 1000 / 60);
	}
);
var fps = {
	startTime: 0,
	frameNumber: 0,
	getFPS: function() {
		this.frameNumber++;
		var d = new Date().getTime(),
			currentTime = (d - this.startTime) / 1000,
			result = Math.floor((this.frameNumber / currentTime));
		if (currentTime > 1) {
			this.startTime = new Date().getTime();
			this.frameNumber = 0;
		}
		return result;
	}
};

function gameIO() {

	// Rendering Portion

	var game = {
		renderers: [],
		scenes: [],
		particles: []
	};
	game.gamepad = function() {
		var gamepads = [];
		if (navigator.getGamepads !== undefined)
			gamepads = navigator.getGamepads();
		for (var i = 0; i < gamepads.length; i++) {
			if (gamepads[i] !== undefined)
				return gamepads[i];
		}
		return null;
	}
	game.gamepadControl = function() {
		var gamepad = {
			buttons: [],
			axes: []
		};
		for (var i = 0; i < 16; i++)
			gamepad.buttons.push({
				pressed: false
			});
		return gamepad;
	}
	game.mouse = function(renderer) {
		var mouse = new game.Vector2(0, 0);
		mouse.renderer = renderer || undefined;
		mouse.clicking = false;
		mouse.changed = false;
		mouse.moved = false;
		window.addEventListener("mousemove", function(event) {
			mouse.x = event.clientX;
			mouse.y = event.clientY;
			mouse.moved = true;
			if (mouse.renderer !== undefined) {
				mouse.x = Math.max(Math.min((mouse.x - mouse.renderer.c.width / 2 - mouse.renderer.left) * mouse.renderer.ratio, 1920 / 2), -1920 / 2);
				mouse.y = Math.max(Math.min((mouse.y - mouse.renderer.c.height / 2 - mouse.renderer.top) * mouse.renderer.ratio, 1080 / 2), -1080 / 2);
			}
		});
		window.addEventListener("mousedown", function(event) {
			mouse.clicking = true;
			mouse.changed = true;
		});
		window.addEventListener("mouseup", function(event) {
			mouse.clicking = false;
			mouse.changed = true;
		});
		mouse.fromRenderer = function(renderer) {
			this.x = (this.x - renderer.c.width / 2 - renderer.left) * renderer.ratio / 2;
			this.y = (this.y - renderer.c.height / 2 - renderer.top) * renderer.ratio / 2;
		}
		mouse.isCollidingWithRectangle = function(rectangle) {
			if (renderer === undefined)
				return false;
			if (this.x < rectangle.position.x + rectangle.width / 2 &&
				this.x > rectangle.position.x - rectangle.width / 2 &&
				this.y < rectangle.position.y + rectangle.height / 2 &&
				this.y > rectangle.position.y - rectangle.height / 2)
				return true;
			return false;
		}
		return mouse;
	};
	game.touch = function() {
		var touches = [];
		window.addEventListener("touchmove", function(event) {
			event.preventDefault();
			while (event.targetTouches.length > touches.length)
				touches.push(new game.Vector2(0, 0));
			while (event.targetTouches.length < touches.length)
				touches.splice(0, 1);
			for (var i = 0; i < event.targetTouches.length; i++) {
				touches[i].x = event.targetTouches[i].pageX;
				touches[i].y = event.targetTouches[i].pageY;
			}
		});
		window.addEventListener("touchend", function(event) {
			while (event.targetTouches.length < touches.length)
				touches.splice(0, 1);
		});
		window.addEventListener("touchstart", function(event) {
			event.preventDefault();
			for (var i = 0; i < event.targetTouches.length; i++) {
				if ((event.targetTouches[i].pageX - game.renderers[0].c.width / 2 - game.renderers[0].left) * game.renderers[0].ratio / 2 > 0) {
					controls.key_w = true;
				}
			}
		});
		return touches;
	}
	game.renderer = function(canvas) {
		if (canvas === undefined) {
			canvas = document.createElement("canvas");
			canvas.style.position = "absolute";
			document.body.appendChild(canvas);
			document.body.style.margin = "0";
			document.body.style.padding = "0";
			document.body.style.overflow = "hidden";
		}
		game.renderers.push({
			ctx: canvas.getContext('2d'),
			c: canvas,
			clearScreen: true,
			top: 0,
			left: 0,
			leftOfScreen: 0,
			rightOfScreen: 0,
			topOfScreen: 0,
			bottomOfScreen: 0,
			position: new game.Vector2(0, 0),
			ratio: 1,
			render: function(scene) {
				this.ctx.setTransform(1, 0, 0, 1, 0, 0);
				if (this.clearScreen)
					this.clear();
				this.ctx.translate(-this.position.x / this.ratio + this.c.width / 2, -this.position.y / this.ratio + this.c.height / 2);
				scene.render(this.ctx, this.ratio * scene.camera.ratio, 1);
			},
			clear: function() {
				this.ctx.setTransform(1, 0, 0, 1, 0, 0);
				this.ctx.clearRect(0, 0, this.c.width, this.c.height);
			}
		});
		game.renderers[game.renderers.length - 1].ctx.imageSmoothingEnabled = false;
		game.resize();
		game.resize();
		return game.renderers[game.renderers.length - 1];
	};
	game.socket = function(ip, onmessage, onopen, onclose, onerror) {
		if (ip === undefined)
			return null;
		var socket = new WebSocket(ip);
		socket.onmessage = onmessage || function() {};
		socket.onopen = onopen || function() {};
		socket.onclose = onclose || function() {};
		socket.onerror = onerror || function() {};
		return socket;
	};
	game.resize = function() {
		var renderSize = 1;
		game.renderers.forEach(function(renderer) {
			if (document.body.clientWidth / renderer.c.width <= document.body.clientHeight / renderer.c.height) {
				renderer.c.height = document.body.clientHeight;
				renderer.c.width = renderer.c.height * 16 / 9;
				renderer.ratio = 1080 / renderer.c.height;
				renderer.c.style.height = "100%";
				renderer.c.style.width = document.body.clientHeight / renderer.c.height * renderer.c.width + 2;
				renderer.c.style.top = "0";
				renderer.top = 0;
				renderer.c.style.left = document.body.clientWidth / 2 - (document.body.clientHeight / renderer.c.height * renderer.c.width) / 2 - 1 + "px";
				renderer.left = document.body.clientWidth / 2 - (document.body.clientHeight / renderer.c.height * renderer.c.width) / 2 - 1;
			} else {
				renderer.c.width = document.body.clientWidth;
				renderer.c.height = renderer.c.width * 9 / 16;
				renderer.ratio = 1920 / renderer.c.width;
				renderer.c.style.width = "100%";
				renderer.c.style.height = document.body.clientWidth / renderer.c.width * renderer.c.height;
				renderer.c.style.left = "0";
				renderer.left = 0;
				renderer.c.style.top = document.body.clientHeight / 2 - (document.body.clientWidth / renderer.c.width * renderer.c.height) / 2 + "px";
				renderer.top = document.body.clientHeight / 2 - (document.body.clientWidth / renderer.c.width * renderer.c.height) / 2;
			}
			renderer.leftOfScreen = -1920 / 2 - ((document.body.clientWidth - renderer.c.width) / 2 * renderer.ratio);
			renderer.topOfScreen = -1080 / 2 - ((document.body.clientHeight - renderer.c.height) / 2 * renderer.ratio);
			renderer.rightOfScreen = -renderer.leftOfScreen;
			renderer.bottomOfScreen = -renderer.topOfScreen;
			renderer.c.width /= renderSize;
			renderer.c.height /= renderSize;
			renderer.ratio *= renderSize;
			renderer.ctx.imageSmoothingEnabled = false;
		});
	};
	window.addEventListener('resize', game.resize, false);
	game.object = function() {
		return {
			position: new game.Vector2(),
			size: 1,
			opacity: 1,
			rotation: 0,
			type: "object",
			parent: null,
			objects: [],
			belowObjects: [],
			add: function(object) {
				if (object.parent != null) {
					console.log("You can only have 1 parent per object");
					return;
				}
				object.parent = this;
				this.objects.push(object);
			},
			addBelow: function(object) {
				if (object.parent != null) {
					console.log("You can only have 1 parent per object");
					return;
				}
				object.parent = this;
				this.belowObjects.unshift(object);
			},
			remove: function(object) {
				while (this.objects.indexOf(object) != -1) {
					this.objects.splice(this.objects.indexOf(object), 1);
					object.parent = null;
				}
				while (this.belowObjects.indexOf(object) != -1) {
					this.belowObjects.splice(this.belowObjects.indexOf(object), 1);
					object.parent = null;
				}
			},
			render: function(ctx, ratio, opacity) {
				if (this.parent.type !== undefined && this.parent.type == "scene" && !game.visualIsClose(this))
					return;
				this.opacity = Math.min(Math.max(0, this.opacity), 1);
				opacity = Math.min(Math.max(0, opacity), 1);
				var size = this.size;
				opacity = this.opacity * opacity;
				ctx.globalAlpha = opacity;
				ctx.translate(this.position.x / ratio, this.position.y / ratio);
				ctx.rotate(this.rotation);
				this.belowObjects.forEach(function(object) {
					object.render(ctx, ratio / size, opacity);
				});
				this.renderSpecific(ctx, ratio / this.size);
				this.objects.forEach(function(object) {
					object.render(ctx, ratio / size, opacity);
				});
				ctx.rotate(-this.rotation);
				ctx.translate(-this.position.x / ratio, -this.position.y / ratio);
			},
			renderSpecific: function(ctx, ratio) {
				return;
			}
		}
	}
	game.image = function(image, x, y, width, height, opacity) {
		var element = new game.object();
		element.image = image || null;
		element.position = new game.Vector2(x || 0, y || 0);
		element.width = width || 100;
		element.height = height || 100;
		element.opacity = opacity || 1;
		element.type = "image";
		element.renderSpecific = function(ctx, ratio) {
			ctx.drawImage(this.image, -this.width / 2 / ratio, -this.height / 2 / ratio, this.width / ratio, this.height / ratio);
		}
		return element;
	}
	game.text = function(text, x, y, fillStyle, font, fontSize, otherParams, opacity) {
		var element = new game.object();
		element.text = text || "";
		element.position = new game.Vector2(x || 0, y || 0);
		element.fillStyle = fillStyle || "#000";
		element.font = font || "Arial";
		element.fontSize = fontSize || 30;
		element.otherParams = otherParams || "";
		element.opacity = opacity || 1;
		element.type = "text";
		element.renderSpecific = function(ctx, ratio) {
			ctx.font = this.otherParams + " " + this.fontSize / ratio + "px " + this.font;
			var width = ctx.measureText(this.text).width;
			ctx.fillStyle = this.fillStyle;
			ctx.fillText(this.text, Math.floor(-width / 2), this.fontSize / 3 / ratio);
		}
		return element;
	}
	game.Vector2 = function(x, y) {
		return {
			x: x,
			y: y,
			clone: function() {
				return new game.Vector2(this.x, this.y);
			}
		};
	}
	game.Vector3 = function(x, y, z) {
		return {
			x: x,
			y: y,
			z: z,
			clone: function() {
				return new game.Vector3(this.x, this.y, this.z);
			}
		};
	}
	game.Vector4 = function(x, y, z, w) {
		return {
			x: x,
			y: y,
			z: z,
			w: w,
			clone: function() {
				return new game.Vector4(this.x, this.y, this.z, this.w);
			}
		};
	}
	game.controls = function() {
		return {
			up: false,
			down: false,
			left: false,
			right: false,
			space: false,
			shift: false,
			changed: false,
			clone: function() {
				var a = new game.controls();
				a.up = this.up;
				a.down = this.down;
				a.left = this.left;
				a.right = this.right;
				a.space = this.space;
				a.shift = this.shift;
				return a;
			}
		};
	}
	game.multiplayerControls = function() {
		return {
			key_up: false,
			key_down: false,
			key_left: false,
			key_right: false,
			key_w: false,
			key_s: false,
			key_a: false,
			key_d: false,
			space: false,
			shift: false,
			changed: false
		};
	}
	game.keyboard = function(control) {

		control = control || new game.controls();
		control.changedKeys = [];

		function down(e) {
			var changed = false;
			if (e.keyCode == 37 || e.keyCode == 65) {
				if (!control.left) {
					changed = true;
					control.left = true;
					control.changedKeys.push("left");
				}
			} else if (e.keyCode == 38 || e.keyCode == 87) {
				if (!control.up) {
					changed = true;
					control.up = true;
					control.changedKeys.push("up");
				}
			} else if (e.keyCode == 39 || e.keyCode == 68) {
				if (!control.right) {
					changed = true;
					control.right = true;
					control.changedKeys.push("right");
				}
			} else if (e.keyCode == 40 || e.keyCode == 83) {
				if (!control.down) {
					changed = true;
					control.down = true;
					control.changedKeys.push("down");
				}
			} else if (e.keyCode == 32) {
				if (!control.space) {
					changed = true;
					control.space = true;
					control.changedKeys.push("space");
				}
			} else if (e.keyCode == 16) {
				if (!control.shift) {
					changed = true;
					control.shift = true;
					control.changedKeys.push("shift");
				}
			}
			control.changed = changed;
		}

		window.addEventListener('keydown', down, false);

		function up(e) {
			if (e.keyCode == 37 || e.keyCode == 65) {
				control.left = false;
				control.changedKeys.push("left");
			} else if (e.keyCode == 38 || e.keyCode == 87) {
				control.up = false;
				control.changedKeys.push("up");
			} else if (e.keyCode == 39 || e.keyCode == 68) {
				control.right = false;
				control.changedKeys.push("right");
			} else if (e.keyCode == 40 || e.keyCode == 83) {
				control.down = false;
				control.changedKeys.push("down");
			} else if (e.keyCode == 32) {
				control.space = false;
				control.changedKeys.push("space");
			} else if (e.keyCode == 16) {
				control.shift = false;
				control.changedKeys.push("shift");
			}
			control.changed = true;
		}

		window.addEventListener('keyup', up, false);

		return control;

	}
	game.multiplayerKeyboard = function(control) {

		control = control || new game.controls();

		function down(e) {
			var changed = false;
			if (e.keyCode == 65) {
				if (!control.key_a) {
					changed = true;
					control.key_a = true;
				}
			} else if (e.keyCode == 37) {
				if (!control.key_left) {
					changed = true;
					control.key_left = true;
				}
			} else if (e.keyCode == 87) {
				if (!control.key_w) {
					changed = true;
					control.key_w = true;
				}
			} else if (e.keyCode == 38) {
				if (!control.key_up) {
					changed = true;
					control.key_up = true;
				}
			} else if (e.keyCode == 68) {
				if (!control.key_d) {
					changed = true;
					control.key_d = true;
				}
			} else if (e.keyCode == 39) {
				if (!control.key_right) {
					changed = true;
					control.key_right = true;
				}
			} else if (e.keyCode == 83) {
				if (!control.key_s) {
					changed = true;
					control.key_s = true;
				}
			} else if (e.keyCode == 40) {
				if (!control.key_down) {
					changed = true;
					control.key_down = true;
				}
			} else if (e.keyCode == 32) {
				if (!control.space) {
					changed = true;
					control.space = true;
				}
			} else if (e.keyCode == 16) {
				if (!control.shift) {
					changed = true;
					control.shift = true;
				}
			}
			control.changed = changed;
		}

		window.addEventListener('keydown', down, false);

		function up(e) {
			if (e.keyCode == 37)
				control.key_left = false;
			else if (e.keyCode == 65)
				control.key_a = false;
			else if (e.keyCode == 38)
				control.key_up = false;
			else if (e.keyCode == 87)
				control.key_w = false;
			else if (e.keyCode == 39)
				control.key_right = false;
			else if (e.keyCode == 68)
				control.key_d = false;
			else if (e.keyCode == 40)
				control.key_down = false;
			else if (e.keyCode == 83)
				control.key_s = false;
			else if (e.keyCode == 32)
				control.space = false;
			else if (e.keyCode == 16)
				control.shift = false;
			control.changed = true;
		}

		window.addEventListener('keyup', up, false);

		return control;

	}
	game.rectangle = function(x, y, width, height, color, opacity) {
		var element = new game.object();
		element.position = new game.Vector2(x || 0, y || 0);
		element.width = width || 100;
		element.height = height || 100;
		element.color = color || "#000000";
		element.opacity = opacity || 1;
		element.type = "rectangle";
		element.renderSpecific = function(ctx, ratio) {
			ctx.fillStyle = this.color;
			ctx.fillRect(-this.width * this.size / 2 / ratio, -this.height * this.size / 2 / ratio, this.width * this.size / ratio, this.height * this.size / ratio);
		}
		return element;
	}
	game.roundRectangle = function(x, y, width, height, radius, color) {
		var element = new game.object();
		element.position = new game.Vector2(x || 0, y || 0);
		element.width = width || 100;
		element.height = height || 100;
		element.color = color || "#000000";
		element.radius = radius || 0;
		element.type = "roundRectangle";
		element.renderSpecific = function(ctx, ratio) {
			ctx.fillStyle = this.color;
			ctx.beginPath();
			ctx.moveTo(-this.width * this.size / 2 / ratio, (-this.height + this.radius * 2) * this.size / 2 / ratio);
			ctx.arc(0, 0, this.radius * this.size / ratio, 0, Math.PI / 2);
			ctx.lineTo(0, 0);
			ctx.closePath();
			ctx.fill();
		}
		return element;
	}
	game.blurredRectangle = function(x, y, width, height, color, blurRadius, opacity) {
		x = x || 0;
		y = y || 0;
		width = width || 100;
		height = height || 100;
		color = color || "#000000";
		blurRadius = blurRadius || 3;
		opacity = opacity || 1;
		var canvas = document.createElement('canvas');
		canvas.width = width + blurRadius * 4;
		canvas.height = height + blurRadius * 4;
		var ctx = canvas.getContext('2d');
		ctx.fillStyle = color;
		ctx.filter = 'blur( ' + blurRadius + 'px )';
		ctx.globalAlpha = opacity;
		ctx.fillRect(blurRadius * 2, blurRadius * 2, width, height);
		return new game.image(canvas, x, y, width, height);
	}
	game.polygon = function(x, y, points, color) {
		var element = new game.object();
		element.position = new game.Vector2(x || 0, y || 0);
		element.points = points || [
			new game.Vector2(-50, 40),
			new game.Vector2(0, -40),
			new game.Vector2(50, 40)
		]
		element.color = color || "#000000";
		element.type = "polygon";
		element.renderSpecific = function(ctx, ratio) {
			ctx.fillStyle = this.color;
			ctx.beginPath();
			ctx.moveTo(this.points[0].x / ratio, this.points[0].y / ratio);
			for (var i = 1; i < this.points.length; i++) {
				ctx.lineTo(this.points[i].x / ratio, this.points[i].y / ratio);
			}
			ctx.closePath();
			ctx.fill();
		}
		return element;
	}
	game.circle = function(x, y, radius, color) {
		var element = new game.object();
		element.position = new game.Vector2(x || 0, y || 0);
		element.radius = radius || 100;
		element.color = color || "#000000";
		element.type = "circle";
		element.renderSpecific = function(ctx, ratio) {
			ctx.fillStyle = this.color;
			ctx.beginPath();
			ctx.arc(0, 0, this.radius * this.size / ratio, 0, 2 * Math.PI);
			ctx.closePath();
			ctx.fill();
		}
		return element;
	}
	game.arc = function(x, y, radius, color, angle, lineWidth) {
		var element = new game.object();
		element.position = new game.Vector2(x || 0, y || 0);
		element.radius = radius || 100;
		element.color = color || "#000000";
		element.angle = angle || Math.PI;
		element.lineWidth = lineWidth || 5;
		element.type = "arc";
		element.renderSpecific = function(ctx, ratio) {
			ctx.strokeStyle = this.color;
			ctx.lineWidth = this.lineWidth / ratio;
			ctx.beginPath();
			ctx.arc(0, 0, this.radius * this.size / ratio, 0, this.angle);
			ctx.stroke();
		}
		return element;
	}
	game.blurredCircle = function(x, y, radius, color, blurRadius) {
		x = x || 0;
		y = y || 0;
		radius = radius || 100;
		color = color || "#000000";
		blurRadius = blurRadius || 3;
		var canvas = document.createElement('canvas');
		canvas.width = radius * 2 + blurRadius * 4;
		canvas.height = radius * 2 + blurRadius * 4;
		var ctx = canvas.getContext('2d');
		ctx.fillStyle = color;
		ctx.filter = 'blur( ' + blurRadius + 'px )';
		ctx.beginPath();
		ctx.arc(radius + blurRadius * 2, radius + blurRadius * 2, radius, 0, 2 * Math.PI);
		ctx.closePath();
		ctx.fill();
		return new game.image(canvas, x, y, radius * 2, radius * 2.3);
	}
	game.particle = function(x, y, size, color, turn, opacityFade, xVelocity, yVelocity, initialOpacity) {
		var obj = new game.rectangle(x, y, size, size, color, 0.7);
		obj.turn = turn || (Math.floor(Math.random() * 2) - 0.5) * 0.2;
		obj.opacityFade = opacityFade || 1;
		obj.rotation = Math.random() * Math.PI * 2;
		obj.velocity = new game.Vector2(xVelocity || 0, yVelocity || 0);
		obj.opacity = initialOpacity || 1;
		obj.type = "particle";
		obj.update = function(dt) {
			obj.rotation += obj.turn * dt;
			obj.width -= 0.2 * dt;
			obj.height -= 0.2 * dt;
			obj.opacity -= 0.02 * dt * obj.opacityFade;
			obj.position.x += obj.velocity.x * dt;
			obj.position.y += obj.velocity.y * dt;
			if (obj.opacity <= 0 && game.particles.indexOf(obj) != -1) {
				game.particles.splice(game.particles.indexOf(obj), 1);
				if (obj.parent != null)
					obj.parent.remove(obj);
			}
		}
		game.particles.push(obj);
		return obj;
	}
	game.scene = function() {
		var element = new game.object();
		element.type = "scene";
		element.camera = {
			position: new game.Vector2(0, 0),
			ratio: 1,
			rotation: 0
		}
		element.render = function(ctx, ratio, opacity) {
			ratio /= this.size;
			this.opacity = Math.min(Math.max(0, this.opacity), 1);
			ctx.globalAlpha = this.opacity * opacity;
			ctx.translate(-this.camera.position.x / ratio, -this.camera.position.y / ratio);
			ctx.rotate(-this.camera.rotation);
			this.belowObjects.forEach(function(object) {
				object.render(ctx, ratio, opacity);
			});
			this.objects.forEach(function(object) {
				object.render(ctx, ratio, opacity);
			});
			ctx.rotate(this.camera.rotation);
			ctx.translate(this.camera.position.x / ratio, this.camera.position.y / ratio);
		}
		game.scenes.push(element);
		return element;
	}

	// Networking Portion

	game.me = {
		id: -1,
		score: 0,
		visual: {
			position: new game.Vector2(0, 0)
		},
		new: {
			position: new game.Vector2(0, 0)
		},
		old: {
			position: new game.Vector2(0, 0)
		}
	};
	game.ws = {
		readyState: -1,
		send: function() {},
		close: function() {}
	};
	game.connecting = false;
	game.currentPackets = [];

	game.createSocket = function(serveraddr) {
		if (game.connecting)
			return;
		game.connecting = true;
		game.ws.close();

		function open() {
			game.connecting = false;
		}
		game.ws = new game.socket(serveraddr, game.messageEvent, open);
		game.ws.binaryType = "arraybuffer";
	}

	game.serverDetails = {
		lastFrame: Date.now(),
		thisFrame: Date.now(),
		dt: 1,
		ticksSincePacket: 0
	};

	game.clientDetails = {
		lastFrame: Date.now(),
		thisFrame: Date.now(),
		dt: 1
	};

	game.toBuffer = function(string) {
		var buf = new ArrayBuffer(string.length);
		var bufView = new Uint8Array(buf);
		for (var i = 0, strLen = string.length; i < strLen; i++) {
			bufView[i] = string.charCodeAt(i);
		}
		return buf;
	}

	game.fromBuffer = function(buffer) {
		try {
			return String.fromCharCode.apply(null, new Uint8Array(buffer));
		} catch (e) {}
	}

	game.selfExists = function() {
		for (var i = 0; i < game.objects.length; i++) {
			if (game.objects[i].id == game.me.id) {
				return true;
			}
		}
		if (game.ws.readyState == 1) {
			game.ws.send(game.toBuffer(JSON.stringify([{
				type: "getID"
			}])));
		}
	}

	game.notUpdatedIsClose = function(object) {
		if (Math.abs(game.me.new.position.x - object.new.position.x) < 1920 / 2 + 1600 && Math.abs(game.me.new.position.y - object.new.position.y) < 1080 / 2 + 1600)
			return true;
	}

	game.visualIsClose = function(object) {
		return true;
	}

	game.lerp = function(initialValue, newValue) {
		if (game.serverDetails.ticksSincePacket > game.serverDetails.dt + 1)
			return newValue;
		return (newValue - initialValue) / game.serverDetails.dt * game.serverDetails.ticksSincePacket + initialValue;
	}

	game.getObj = function(id) {
		for (var i = 0; i < game.objects.length; i++) {
			if (game.objects[i].id == id) {
				return game.objects[i];
			}
		}
		return null;
	}

	game.askForObj = function(id) {
		if (game.ws.readyState == 1)
			game.ws.send(game.toBuffer(JSON.stringify([{
				type: "getObject",
				object: {
					id: id
				}
			}])));
	}
	
	game.packetFunctions = {
		"setID": function(packet) {
			for (var i = 0; i < game.objects.length; i++) {
				if (game.objects[i].id == packet.id) {
					game.me = game.objects[i];
				}
			}
		},
		// Add
		"x": function(packet) {
			if (game.getObj(packet.i) != null) {
				return null;
			}
			var obj = {
				new: {
					position: new game.Vector2(packet.x, packet.y),
					rotation: packet.a
				},
				old: {
					position: new game.Vector2(packet.x, packet.y),
					rotation: packet.a
				},
				id: packet.i,
				ticksAsleep: 0,
				visual: new game.object(),
				type: packet.b,
				needsUpdate: packet.n
			};
			game.types[packet.b].create(obj, packet);
			obj.visual.position.x = obj.new.position.x;
			obj.visual.position.y = obj.new.position.y;
			obj.visual.rotation = obj.new.rotation;
			game.objects.push(obj);
			return;
		},
		// Update
		"y": function(packet) {
			if (game.getObj(packet.i) == null) {
				game.askForObj(packet.i);
				return;
			}
			var obj = game.getObj(packet.i);
			obj.ticksAsleep = 0;
			obj.old.position = obj.visual.position.clone();
			obj.old.rotation = obj.visual.rotation;
			obj.new.position = new game.Vector2(packet.x, packet.y);
			obj.new.rotation = packet.a;
			if (Math.abs(obj.old.rotation - obj.new.rotation) > Math.PI) {
				if (obj.old.rotation > obj.new.rotation)
					obj.old.rotation -= Math.PI * 2;
				else
					obj.old.rotation += Math.PI * 2;
			}
			game.usedIDs.push(obj.id);
			game.types[obj.type].updatePacket(obj, packet);
		},
		// Remove
		"z": function(packet) {
			for (var i = 0; i < game.objects.length; i++) {
				if (game.objects[i].id == packet.i) {
					game.types[game.objects[i].type].remove(game.objects[i]);
					if (game.objects[i].visual.parent != null)
						game.objects[i].visual.parent.remove(game.objects[i].visual);
					game.objects.splice(i, 1);
				}
			}
		}
	};
	game.addPacketType = function( type, func ) {
        game.packetFunctions[ type ] = func;
    }
	game.types = [];
	game.objects = [];
	game.usedIDs = [];

	game.messageEvent = function(message) {
		game.serverDetails.thisFrame = Date.now();
		game.serverDetails.dt = Math.max(Math.min((game.serverDetails.thisFrame - game.serverDetails.lastFrame) / 16, 10), 5);
		game.serverDetails.lastFrame = game.serverDetails.thisFrame;
		try {
			var packets = JSON.parse(game.fromBuffer(message.data));
			for (var i = 0; i < packets.length; i++) {
				var packet = packets[i];
				game.packetFunctions[packet.t](packet);
			}
			game.particles.forEach(function(particle) {
				particle.update(1);
			});
			game.serverDetails.ticksSincePacket = 0;
			for (var i = 0; i < game.objects.length; i++) {
				game.objects[i].ticksAsleep++;
				if (game.usedIDs.indexOf(game.objects[i].id) == -1) {
					game.objects[i].old.position.x = game.objects[i].visual.position.x;
					game.objects[i].old.position.y = game.objects[i].visual.position.y;
					game.objects[i].old.rotation = game.objects[i].visual.rotation;
				}
				if (((game.objects[i].needsUpdate && (game.objects[i].ticksAsleep >= 12 && (game.objects[i].old.position.x == game.objects[i].new.position.x && game.objects[i].old.position.y == game.objects[i].new.position.y && game.objects[i].old.rotation == game.objects[i].new.rotation))) || (!game.objects[i].needsUpdate && game.objects[i].ticksAsleep >= 120 && !game.notUpdatedIsClose(game.objects[i]))) && game.usedIDs.indexOf(game.objects[i].id) == -1) {
					game.types[game.objects[i].type].remove(game.objects[i]);
					if (game.objects[i].visual.parent != null)
						game.objects[i].visual.parent.remove(game.objects[i].visual);
					game.objects.splice(i, 1);
				}
			}
			game.usedIDs = [];
			game.selfExists();
		} catch (e) {}
	}
	game.update = function() {
		var currentFPS = fps.getFPS();
		game.serverDetails.ticksSincePacket += 1 / (currentFPS / 60);
		for (var i = 0; i < game.objects.length; i++) {
			var obj = game.objects[i];
			obj.visual.rotation = game.lerp(obj.old.rotation, obj.new.rotation);
			obj.visual.position.x = game.lerp(obj.old.position.x, obj.new.position.x);
			obj.visual.position.y = game.lerp(obj.old.position.y, obj.new.position.y);
			game.types[obj.type].tickUpdate(obj);
		}
		game.clientDetails.thisTick = Date.now();
		var dt = (game.clientDetails.thisTick - game.clientDetails.lastTick) / 16.67;
		game.clientDetails.lastTick = game.clientDetails.thisTick;
		game.particles.forEach(function(particle) {
			particle.update(dt);
		});
		if (game.ws.readyState == 1 && game.currentPackets.length > 0) {
			game.ws.send(game.toBuffer(JSON.stringify(game.currentPackets)));
			game.currentPackets = [];
		}
	}
	game.addType = function(type, create, tickUpdate, updatePacket, remove) {
		game.types[type] = {
			create: create,
			tickUpdate: tickUpdate || function(obj) {},
			updatePacket: updatePacket || function(obj, packet) {},
			remove: remove || function(obj) {}
		};
	}
	return game;
}