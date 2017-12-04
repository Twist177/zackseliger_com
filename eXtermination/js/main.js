//scenes
var manager = new SceneManager();

var characters = new Collection();
var weapons = new Collection();
var bullets = new Collection();
var tiles = new Collection();

var stage = 1;
var money = 0;

function main() {
	FRAME.clearScreen();
	timestep.tick();
	mouse.update();
	
	characters.objects.sort(function(a, b) {
		if (a.y > b.y) return 1;
		else return -1;
	});
	
	manager.update(timestep.realTime);
	manager.render();
	
	requestFrame(main);
}

window.onload = function() {
	weapon = new Gun();
	player = new Player(0, 0);
	floor = new FloorRect(0, 0);
	
	manager.addScene("shop", new ShopScene(manager));
	manager.addScene("fight", new FightScene(manager));
	manager.change("shop");
	
	FRAME.width = GAME_WIDTH;
	FRAME.height = GAME_HEIGHT;
	
	main();
}