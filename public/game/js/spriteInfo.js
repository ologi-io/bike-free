(function (global) {
	var sprites = {
		'skier' : {
			$imageFile : '/game/sprite-characters.png',
			parts : {
				blank : [ 0, 0, 0, 0 ],
				east : [ 0, 0, 27, 34 ],
				esEast : [ 27, 0, 27, 34 ],
				sEast : [ 54, 0, 18, 34 ],
				south : [ 72, 0, 20, 34 ],
				sWest : [ 54, 37, 21, 34 ],
				wsWest : [ 27, 37, 27, 34 ],
				west : [ 0, 37, 27, 34 ],
				hit : [ 0, 78, 31, 31 ],
				jumping : [ 92, 0, 26, 34 ],
				somersault1 : [ 118, 0, 32, 34 ],
				somersault2 : [ 148, 0, 32, 34 ]
			},
			hitBoxes: {
				0: [ 7, 20, 27, 34 ]
			},
			id : 'player',
			hitBehaviour: {}
		},
		'smallTree' : {
			$imageFile : '/game/skifree-objects.png',
			parts : {
				main : [ 0, 28, 30, 34 ]
			},
			hitBoxes: {
				0: [ 0, 18, 30, 34 ]
			},
			hitBehaviour: {}
		},
		'tallTree' : {
			$imageFile : '/game/skifree-objects.png',
			parts : {
				main : [ 95, 66, 32, 64 ]
			},
			zIndexesOccupied : [0, 1],
			hitBoxes: {
				0: [0, 54, 32, 64],
				1: [0, 10, 32, 54]
			},
			hitBehaviour: {}
		},
		'thickSnow' : {
			$imageFile : '/game/skifree-objects.png',
			parts : {
				main : [ 143, 53, 43, 10 ]
			},
			hitBehaviour: {},
			under: true
		},
		'rock' : {
			$imageFile : '/game/skifree-objects.png',
			parts : {
				main : [ 30, 52, 23, 11 ]
			},
			hitBehaviour: {}
		},
		'monster' : {
			$imageFile : '/game/sprite-characters.png',
			parts : {
				sEast1 : [ 64, 112, 26, 43 ],
				sEast2 : [ 90, 112, 32, 43 ],
				sWest1 : [ 64, 158, 26, 43 ],
				sWest2 : [ 90, 158, 32, 43 ],
				eating1 : [ 122, 112, 34, 43 ],
				eating2 : [ 157, 112, 31, 43 ],
				eating3 : [ 188, 112, 31, 43 ],
				eating4 : [ 219, 108, 28, 46 ],
				eating5 : [ 235, 162, 33, 37 ]
			},
			hitBehaviour: {}
		},
		'jump' : {
			$imageFile : '/game/skifree-objects.png',
			parts : {
				main : [ 109, 45, 34, 17 ]
			},
			hitBehaviour: {},
			under: true
		},
		'signStart' : {
			$imageFile : '/game/skifree-objects.png',
			parts : {
				main : [ 260, 103, 42, 27 ]
			},
			hitBehaviour: {}
		},
		'snowboarder' : {
			$imageFile : '/game/sprite-characters.png',
			parts : {
				sEast : [ 73, 226, 20, 32 ],
				sWest : [ 95, 226, 26, 32 ]
			},
			hitBehaviour: {}
		},
		'emptyChairLift': {
			$imageFile : '/game/skifree-objects.png',
			parts: {
				main : [ 92, 136, 26, 30 ]
			},
			zIndexesOccupied : [1],
		}
	};

	function monsterHitsTreeBehaviour(monster) {
		monster.deleteOnNextCycle();
	}

	sprites.monster.hitBehaviour.tree = monsterHitsTreeBehaviour;

	function treeHitsMonsterBehaviour(tree, monster) {
		monster.deleteOnNextCycle();
	}

	sprites.smallTree.hitBehaviour.monster = treeHitsMonsterBehaviour;
	sprites.tallTree.hitBehaviour.monster = treeHitsMonsterBehaviour;

	function skierHitsTreeBehaviour(skier, tree) {
		skier.hasHitObstacle(tree);
	}

	function treeHitsSkierBehaviour(tree, skier) {
		skier.hasHitObstacle(tree);
	}

	sprites.smallTree.hitBehaviour.skier = treeHitsSkierBehaviour;
	sprites.tallTree.hitBehaviour.skier = treeHitsSkierBehaviour;

	function rockHitsSkierBehaviour(rock, skier) {
		skier.hasHitObstacle(rock);
	}

	sprites.rock.hitBehaviour.skier = rockHitsSkierBehaviour;

	function skierHitsJumpBehaviour(skier, jump) {
		skier.hasHitJump(jump);
	}

	function jumpHitsSkierBehaviour(jump, skier) {
		skier.hasHitJump(jump);
	}

	sprites.jump.hitBehaviour.skier = jumpHitsSkierBehaviour;

	// Really not a fan of this behaviour.
	function skierHitsThickSnowBehaviour(skier, thickSnow) {
		// Need to implement this properly
		skier.setSpeed(2);
		setTimeout(function() {
			skier.resetSpeed();
		}, 700);
	}

	function thickSnowHitsSkierBehaviour(thickSnow, skier) {
		// Need to implement this properly
		skier.setSpeed(1);
		setTimeout(function() {
			skier.resetSpeed();
		}, 500);
	}

	sprites.thickSnow.hitBehaviour.skier = thickSnowHitsSkierBehaviour;

	function snowboarderHitsSkierBehaviour(snowboarder, skier) {
		skier.hasHitObstacle(snowboarder);
	}

	sprites.snowboarder.hitBehaviour.skier = snowboarderHitsSkierBehaviour;

	global.spriteInfo = sprites;
})( this );


if (typeof module !== 'undefined') {
	module.exports = this.spriteInfo;
}