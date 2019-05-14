const GAME_WIDTH = 1000;
const GAME_HEIGHT = 500;

Boot = function (game) { };

Boot.prototype = {
	preload: function () {
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
        game.scale.updateLayout(true);

        game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.renderer.renderSession.roundPixels = true;
        Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);
        game.scale.refresh();

		game.stage.backgroundColor = '#0';
		game.load.image('loading', 'assets/loading.png');
		game.load.image('loading2', 'assets/loading2.png');
	},
	create: function() {
		this.game.state.start('Load');
	}
};

Load = function (game) { };

Load.prototype = {
	preload: function () {
        var w = GAME_WIDTH;
        var h = GAME_HEIGHT;
	    this.label2 = game.add.text(Math.floor(w/2)+0.5, Math.floor(h/2)-15+0.5, 'loading...', { font: '30px Arial', fill: '#fff' });
		this.label2.anchor.setTo(0.5, 0.5);

		this.preloading2 = game.add.sprite(w/2, h/2+15, 'loading2');
		this.preloading2.x -= this.preloading2.width/2;
		this.preloading = game.add.sprite(w/2, h/2+19, 'loading');
		this.preloading.x -= this.preloading.width/2;
        game.load.setPreloadSprite(this.preloading);

        game.load.tilemap('level_01', 'assets/level_01.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.image('platform_tiles', 'assets/platform_tiles.png');

        game.load.image('wall', 'assets/brick.png');
        game.load.image('coin', 'assets/heart.png');
        game.load.image('enemy', 'assets/spikes.png');
        game.load.image('dust', 'assets/dust.png');
        game.load.image('exp', 'assets/exp.png');
        if (!game.device.desktop) {
			game.load.image('right', 'assets/right.png');
            game.load.image('left', 'assets/left.png');
            game.load.image('jump', 'assets/up.png');
		}
		
        game.load.spritesheet('kitty', 'assets/kitty.png', 8, 8);

        game.load.audio('dead', 'assets/dead.wav');
        game.load.audio('dust', 'assets/dust.wav');
        game.load.audio('coin', 'assets/coin.wav');
        game.load.audio('jump', 'assets/jump.wav');
        game.load.audio('music', 'assets/music.mp3');
    },
	create: function () {
        this.label2.text = "Press Any Key To Play";
        this.preloading2.visible = false;
        this.preloading.visible = false;

        game.input.keyboard.onDownCallback = this.advance;
    },
    advance: function() {
        game.input.keyboard.onDownCallback = undefined;
        game.state.start('main');
    },
    update: function () {
        if (game.input.activePointer.isDown) {
            this.advance();
        }
    }
}

var mainState = {
    preload: function() {
    },
    create: function() {
        game.stage.backgroundColor = "#0";
        game.physics.startSystem(Phaser.Physics.ARCADE);
        game.world.enableBody = true;

		this.deadSound = game.add.audio('dead', 0.1);
		this.jumpSound = game.add.audio('jump', 0.1);
		this.dustSound = game.add.audio('dust', 0.1);
        this.coinSound = game.add.audio('coin', 0.1);
        this.musicLoop = game.add.audio('music', 0.1, true);
        this.musicLoop.play();
        
        this.cursor = game.input.keyboard.createCursorKeys();
        this.wasd = {
            up: game.input.keyboard.addKey(Phaser.Keyboard.W),
            down: game.input.keyboard.addKey(Phaser.Keyboard.S),
            left: game.input.keyboard.addKey(Phaser.Keyboard.A),
            right: game.input.keyboard.addKey(Phaser.Keyboard.D),
          };
        game.input.keyboard.addKeyCapture([Phaser.Keyboard.SPACEBAR]);

        this.player = game.add.sprite(100, 100, 'kitty');
        this.player.body.gravity.y = 600;
        this.player.animations.add('idle', [5, 5, 6, 6, 5], 5, true);
        this.player.animations.add('run', [0, 1, 2, 3], 8, true);
        this.player.body.setSize(6.5, 6.5, 0, 3);
        this.player.smoothing = false;
        this.player.anchor.setTo(0.5, 0.5);
        game.physics.enable(this.player);

        this.playerDead = false;
        this.coinsTotal = 20;
        this.coinsCollected = 0;

        this.currentLevel = 2;
        this.totalLevels = 2;

        this.loadLevel();
        this.setParticles();

        this.spawnPlayer();

        this.scoreString = 'Hearts : ';
        this.scoreText = game.add.text(10, 8, this.scoreString + this.coinsCollected, { font: '18px Arial', fill: '#fff' });
        this.endingText = game.add.text(420, 245, "Happy Mothers Day!", { font: '18px Arial', fill: '#fff' });
        this.endingText.visible = false;

		if (!game.device.desktop) {
            this.addMobileInputs();
        }
    },
    update: function() {
        game.physics.arcade.collide(this.player, this.walls);
        game.physics.arcade.overlap(this.player, this.coins, this.takeCoin, null, this);
        game.physics.arcade.overlap(this.player, this.enemies, this.spawnPlayer, null, this);

        this.inputs();
        this.exp.forEachAlive(function(p){
			p.alpha = game.math.clamp(p.lifespan / 100, 0, 1);
        }, this);
    },

    inputs: function() {
        if (this.cursor.left.isDown || this.wasd.left.isDown || this.moveLeft) {
            this.player.body.velocity.x = -200;
            if (this.player.scale.x > 0) {
                this.player.scale.x *= -1;
            }
            if (!this.player.body.touching.down) {
                this.player.frame = 4;
            } else { 
                this.player.animations.play('run');
            }
        }
        else if (this.cursor.right.isDown || this.wasd.right.isDown || this.moveRight) {
            this.player.body.velocity.x = 200;
            if (this.player.scale.x < 0) {
                this.player.scale.x *= -1;
            }
            if (!this.player.body.touching.down) {
                this.player.frame = 4;
            } else { 
                this.player.animations.play('run');
            }
        }
        else  {
            this.player.body.velocity.x = 0;
        }

        if (this.player.body.velocity.x == 0) {
            this.player.animations.play('idle');
        }

        if (this.player.body.touching.down && this.player.y > 100) {			
			if (this.hasJumped) {
				this.dustSound.play();
				this.dust.x = this.player.x;
				this.dust.y = this.player.y+10;
				this.dust.start(true, 220, null, 8);
			}

			this.hasJumped = false;
        }
        if (this.cursor.up.isDown || this.wasd.up.isDown || this.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
			this.jumpPlayer();
        }
    },
	jumpPlayer: function() {
        if (this.gameOver) {
            return;
        }
		if (this.player.body.touching.down && !this.player.body.touching.up){// && this.player.y > 100) {
			game.sound.mute = false;
			this.hasJumped = true;
			this.jumpSound.play();
            this.player.body.velocity.y = -220;
            var a = this.player.angle + 90;
            var tween = game.add.tween(this.player).to({angle: a}, 100).start();
            tween.onComplete.add(this.rotateComplete, this);
		}
    },
    rotateComplete: function() {
        this.player.angle = 0
    },
    spawnPlayer: function() {
        if (this.playerDead) {
            this.exp.x = this.player.x;
            this.exp.y = this.player.y + 10;
            this.exp.start(true, 300, null, 20);

            this.shakeEffect(this.walls);
            this.shakeEffect(this.enemies);
            this.deadSound.play();
        }

		this.player.scale.setTo(0, 0);
		game.add.tween(this.player.scale).to({x:3, y:3}, 300).start();
		this.player.reset(100, 100);
		
		this.hasJumped = true;
		this.playerDead = true;

		this.moveLeft = false;
		this.moveRight = false;
    },
    getLevel: function() {
        if (this.currentLevel > this.totalLevels) {
            this.gameOver = true;
            this.endingText.visible = true;
            return [
                '                                              ',
                'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'x                                            x',
                'x                                            x',
                'x                                            x',
                'x           xxxxxxxxxxxxxxxxxxxxxx           x',
                'xxxxxxxxxxx x                    x xx    xxxxx',
                'x           x         o o        x           x',
                'x           x        o   o       x           x',
                'x           x         o o        x           x',
                'x           x          o         x      xxxxxx',
                'x           x                    x           x',
                'xxxxxxxxxxx x                    x xxxx      x',
                'x           xxxxxxxxxxxxxxxxxxxxxx           x',
                'x                                            x',
                'x    x         xxxx            xxx           x',
                'x                                            x',
                'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx!!!xxxx',
            ];
        }
        else if (this.currentLevel == 1) {
            return [
                '                                              ',
                'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'x                                            x',
                'x                 o                          x',
                'x         o                   o             ox',
                'x     oooooo                     o x        ox',
                'xxxxxxxxxxxxxxxx!!!!  xxoooxxxxxxxxxx    xxxxx',
                'x                      xxxxx        o        x',
                'x                 ooo         o     xxx      x',
                'xo  o             xxxxxx      o             ox',
                'xo     o   xx!!!xx              xxxxx   xxxxxx',
                'xo                      xxx        oo        x',
                'xxxxxxxx!!!xxxxxxxxxxxx    o      xxxxx o    x',
                'x   o o                  xxxxx          o    x',
                'x  o   o        oo              o       o    x',
                'x   oxo        xxxx            xxx    o o o  x',
                'x    o                  o  o  o         o    x',
                'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx!!!xxxx',
            ];
        } else if (this.currentLevel == 2) {
            return [
                '                                              ',
                'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'x                                            x',
                'x                 o                          x',
                'x         o                   o             ox',
                'x     o                       o x           ox',
                'xxxxxxxxxxxxxxxx!!!!xxxxoooxxxxxxxxxx    xxxxx',
                'x                      xxxxx        o        x',
                'x                 ooo         o     xxx      x',
                'xo  o             xxxxxx      o             ox',
                'xo     o   xxxx              xxxxx      xxxxxx',
                'xo                      xxx        oo        x',
                'xxxxxxxxxxxxxxxxxxxxxxx    o      xxxxx o    x',
                'x   o o                  xxxxx          o    x',
                'x  o   o        oo              o       o    x',
                'x   oxo        xxxx            xxx    o o o  x',
                'x    o                  o  o  o         o    x',
                'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx!!!xxxx',
            ];
        }
    },
    loadLevel: function() {
        if (this.walls != undefined)
        {
            this.walls.destroy();
            this.coins.destroy();
            this.enemies.destroy();
        }
        this.walls = game.add.group();
        this.coins = game.add.group();
        this.enemies = game.add.group();

        this.coinsCollected = 0;
        var level = this.getLevel();

        this.coinsTotal = 0;
        for (var i = 0; i < level.length; ++i) {
            for (var j = 0; j < level[i].length; ++ j) {
                var x = 30 + 20*j;
                var y = 30 + 20*i;
                if (level[i][j] == 'x') {
                    var wall = game.add.sprite(x, y, 'wall');
                    wall.scale.setTo(2.5, 2.5);
                    wall.smoothing = false;
                    this.walls.add(wall);
                    wall.body.immovable = true;
                }
                else if ( level[i][j] == 'o') {
                    var coin = game.add.sprite(x + 10, y + 10, 'coin');
                    coin.smoothing = false;
                    this.coins.add(coin);
                    this.coinsTotal += 1;
                }
                else if ( level[i][j] == '!') {
                    var enemy = game.add.sprite(x, y, 'enemy');
                    enemy.scale.setTo(2.5, 2.5);
                    enemy.smoothing = false;
                    this.enemies.add(enemy);
                }
            }
        }

        // animate coins spawning
        this.coins.forEachAlive(function(e){
			e.isTaken = false;
			e.scale.setTo(0,0);
			e.anchor.setTo(0.5);
			game.add.tween(e.scale).to({x:2.5, y:2.5}, 200).start();
        }, this);

        /*this.map = game.add.tilemap('level_01');
        this.map.addTilesetImage('platform_tiles', 'platform_tiles');
        //this.map.setCollisionBetween(1, 24);

        this.layer = this.map.createLayer('Level');
        this.layer.scale.setTo(2.5, 2.5);
        this.layer.cameraOffset.setTo(30, 50);
        this.layer.debug = true;
        this.layer.resizeWorld();*/
    },
    takeCoin: function(player, coin) {
		coin.body.enable = false;
		game.add.tween(coin.scale).to({x:0}, 150).start();
        game.add.tween(coin).to({y:50}, 150).start();
        this.coinSound.play();
        this.coinsCollected += 1;
        this.scoreText.text = this.scoreString + this.coinsCollected;
        if (this.coinsCollected == this.coinsTotal) {
            this.currentLevel += 1;
            this.loadLevel();
            this.shakeEffect(this.walls);
            this.shakeEffect(this.enemies);
        }
    },

    setParticles: function() {
        this.dust = game.add.emitter(0, 0, 20);
        this.dust.makeParticles('dust');
        this.dust.setYSpeed(-10, 75);
        this.dust.setXSpeed(-100, 100);
        this.dust.gravity = 0;

        this.exp = game.add.emitter(0, 0, 20);
        this.exp.makeParticles('exp');
        this.exp.setYSpeed(-150, 150);
        this.exp.setXSpeed(-150, 150);
        this.exp.gravity = 0;
    },
    shakeEffect: function(g) {
        var move = 5;
        var time = 20;
        game.add.tween(g)
        .to({y:"-"+move}, time).to({y:"+"+move*2}, time*2).to({y:"-"+move}, time)
        .to({y:"-"+move}, time).to({y:"+"+move*2}, time*2).to({y:"-"+move}, time)
        .to({y:"-"+move/2}, time).to({y:"+"+move}, time*2).to({y:"-"+move/2}, time)
        .start();

        game.add.tween(g)
        .to({x:"-"+move}, time).to({x:"+"+move*2}, time*2).to({x:"-"+move}, time)
        .to({x:"-"+move}, time).to({x:"+"+move*2}, time*2).to({x:"-"+move}, time)
        .to({x:"-"+move/2}, time).to({x:"+"+move}, time*2).to({x:"-"+move/2}, time)
        .start();
    },
    addMobileInputs: function() {
		this.jumpButton = game.add.sprite(GAME_WIDTH - 100, GAME_HEIGHT - 100, 'jump');
		this.jumpButton.inputEnabled = true;
		this.jumpButton.events.onInputDown.add(this.jumpPlayer, this);
		this.jumpButton.alpha = 0.5;

		this.moveLeft = false;
		this.moveRight = false;

		this.leftButton = game.add.sprite(10, GAME_HEIGHT - 100, 'left');
		this.leftButton.inputEnabled = true;
		this.leftButton.events.onInputOver.add(function(){this.moveLeft=true;}, this);
		this.leftButton.events.onInputOut.add(function(){this.moveLeft=false;}, this);
		this.leftButton.events.onInputDown.add(function(){this.moveLeft=true;}, this);
		this.leftButton.events.onInputUp.add(function(){this.moveLeft=false;}, this);
		this.leftButton.alpha = 0.5;

		this.rightButton = game.add.sprite(110, GAME_HEIGHT - 100, 'right');
		this.rightButton.inputEnabled = true;
		this.rightButton.events.onInputOver.add(function(){this.moveRight=true;}, this);
		this.rightButton.events.onInputOut.add(function(){this.moveRight=false;}, this);
		this.rightButton.events.onInputDown.add(function(){this.moveRight=true;}, this);
		this.rightButton.events.onInputUp.add(function(){this.moveRight=false;}, this);
		this.rightButton.alpha = 0.5;
	},
    restart: function() {
        game.state.start('main');
    },
    render: function() {
        //game.debug.bodyInfo(this.player, 32, 320);
    }
};

var game = new Phaser.Game(GAME_WIDTH, GAME_HEIGHT, Phaser.AUTO, 'ld29', null, false, false);
game.state.add('main', mainState);
game.state.add('Boot', Boot);
game.state.add('Load', Load);
game.state.start('Boot');
