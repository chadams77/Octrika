window.OC = window.OC || {};

OC._game = function() {

    this.playing = false;

    this.G_LIMIT = 10;
    this.G_BASE = 3;
    this.G_SIZE = 1 + this.G_LIMIT * 2;

    var KEY = function(x, y, z) { // (0, 0, 0) is the center block
        if (x < -this.G_LIMIT || x > this.G_LIMIT || y < -this.G_LIMIT || y > this.G_LIMIT || z < -this.G_LIMIT || z > this.G_LIMIT) {
            return null;
        }
        return (x+50)+(y+50)*50+(z+50)*50*50;
    }.bind(this);

    this.grid = {};
    this.gridM = {};
    this.gridD = {};

    this.initGrid = function() {
        this.grid = {};
        this.gridM = {};
        this.gridD = {};
        for (var x=-this.G_BASE; x<=this.G_BASE; x++) {
            for (var y=-this.G_BASE; y<=this.G_BASE; y++) {
                for (var z=-this.G_BASE; z<=this.G_BASE; z++) {
                    this.set(KEY(x, y, z), 1 + Math.floor(Math.random()*5));
                }
            }
        }
    };

    this.setD = function(key, value) {
        if (!key) {
            return false;
        }
        this.gridD[key] = !!value;
    };

    this.getD = function(key, value) {
        if (!key) {
            return false;
        }
        return this.gridD[key] || false;
    };

    this.set = function(key, value) {
        if (!key) {
            return false;
        }
        this.grid[key] = value;
        return true;
    };

    this.get = function(key, value) {
        if (!key) {
            return null;
        }
        var ret = this.grid[key];
        if (typeof ret !== typeof 1) {
            return 0;
        }
        else {
            return ret;
        }
    };

    this.setM = function(key, value) {
        if (!key) {
            return false;
        }
        this.gridM[key] = value;
        return true;
    };

    this.getM = function(key, value) {
        if (!key) {
            return null;
        }
        return this.gridM[key] || null;
    };

    this.moveBuffer = [];

    this.move = function(keys, keyd) {
        if (!keys || !keyd) {
            return false;
        }
        this.moveBuffer.push([
            keyd,
            keys,
            this.gridM[keys],
            this.grid[keys],
            this.gridD[keys]
        ]);
        return true;
    };

    this.finishMove = function() {
        if (!this.moveBuffer) {
            return;
        }
        for (var i=0; i<this.moveBuffer.length; i++) {
            var M = this.moveBuffer[i];
            this.gridM[M[1]] = null;
            this.grid[M[1]] = null;
            this.gridD[M[1]] = null;
        }
        for (var i=0; i<this.moveBuffer.length; i++) {
            var M = this.moveBuffer[i];
            this.gridM[M[0]] = M[2];
            this.grid[M[0]] = M[3];
            this.gridD[M[0]] = M[4];
        }
        this.moveBuffer = [];

        OC.sound.play(36, .05, 5);
    }

    this.updateM = function(x, y, z, dt) {
        var key = KEY(x,y,z);
        if (!key) {
            return;
        }
        var type = this.get(key);
        var obj = this.getM(key);
        if (type > 0 && !obj) {
            // add
            obj = {};
            obj.type = type;
            obj.under = false;
            obj.mesh = new THREE.Mesh(this.cubeGeom, this.cubeMats[type-1] || this.cubeMats[0]);
            //obj.mesh.castShadow = true;
            //obj.mesh.receiveShadow = true;
            obj.mesh.position.set(x, y, z);
            OC.render.scene.add(obj.mesh);
            this.setM(key, obj);
        }
        else if (type > 0 && obj.type !== type) {
            // update
        }
        else if (type <= 0 && obj) {
            // remove
            if (!obj.destroyed) {
                OC.render.scene.remove(obj.mesh);
            }
            obj.mesh = null;
            obj.dropper = false;
            obj = null;
            this.setM(key, null);
        }

        if (obj && this.getD(key)) {
            obj.dropper = true;
            obj.t = 0.0;
            this.setD(key, false);
            if (!this.drops) {

            }
            else {
                this.drops.push({
                    x: x, y: y, z: z, clr: type,
                    obj: obj
                });
            }
        }
        else if (obj && obj.mesh) {
            if (obj.under) {
                obj.mesh.material = this.underMat;
                obj.under = false;
            }
            else {
                obj.mesh.material = this.cubeMats[type-1] || this.cubeMats[0];
            }
        }

        if (obj && obj.dropper) {
            obj.t += dt;
            obj.mesh.position.set(
                x-this.ors.x*obj.t,
                y-this.ors.y*obj.t,
                z-this.ors.z*obj.t
            );
            obj.mesh.updateMatrix();
        }
        else if (obj) {
            obj.mesh.position.set(
                x,
                y,
                z
            );
            obj.mesh.updateMatrix();
        }
    };

    this.checkDrops = function(x, y, z, dt) {

        var key = KEY(x,y,z);
        if (!key) {
            return;
        }
        var obj = this.getM(key);
        var type = this.get(key);

        if (obj && obj.dropper && type > 0) {
            for (var t=0; t<this.G_SIZE; t++) {
                var v = null;
                var key2 = KEY(x-this.ors.x*t, y-this.ors.y*t, z-this.ors.z*t);
                if ((v = this.getM(key2)) && (this.get(key2)) && !v.dropper) {
                    if ((obj.t+1) >= t) {
                        this.finishDrop(t);
                    }
                    else {
                        v.under = true;
                    }
                    break;
                }
            }
            if (this.ors.x > 0.5) {
                if ((x-obj.t) <= -this.G_BASE) {
                    this.finishDrop(Math.ceil(obj.t));
                }
            }
            else if (this.ors.y > 0.5) {
                if ((y-obj.t) <= -this.G_BASE) {
                    this.finishDrop(Math.ceil(obj.t));
                }
            }
            else if (this.ors.z > 0.5) {
                if ((z-obj.t) <= -this.G_BASE) {
                    this.finishDrop(Math.ceil(obj.t));
                }
            }
        }
    };

    this.dlist = [];
    this.recentDestroy = 0;
    this.destroy = function(key) {
        var v = this.getM(key);
        if (v) {
            if (v.mesh) {
                v.mesh.T = 0;
                this.dlist.push(v.mesh);
                v.destroyed = true;
                if (this.lost) {
                    OC.sound.play(45 - (this.recentDestroy % 30), .2, 5, this.recentDestroy/16);
                }
                else {
                    OC.sound.play(30 + this.recentDestroy, .2, 5, this.recentDestroy/16);
                }
                this.recentDestroy += 1;
            }
            this.set(key, 0);
        }
    };

    this.shouldCheckLines = 0;
    this.finishDrop = function(t) {
        if (!this.drops) {
            return;
        }
        OC.sound.play(35, .05, 5);
        for (var i=0; i<this.drops.length; i++) {
            this.drops[i].obj.dropper = false;
            this.set(KEY(this.drops[i].x, this.drops[i].y, this.drops[i].z), 0);
        }
        for (var i=0; i<this.drops.length; i++) {
            this.set(KEY(this.drops[i].x-this.ors.x*(t-1), this.drops[i].y-this.ors.y*(t-1), this.drops[i].z-this.ors.z*(t-1)), this.drops[i].clr);
        }
        this.drops = null;
        this.shouldCheckLines = 3;
    };

    this.checkLines = function() {
        if (this.shouldCheckLines !== 1) {
            if (this.shouldCheckLines > 1) {
                this.shouldCheckLines -= 1;
            }
            return;
        }
        this.shouldCheckLines = false;
        for (var x=-this.G_LIMIT; x<=this.G_LIMIT; x++) {
            for (var y=-this.G_LIMIT; y<=this.G_LIMIT; y++) {
                for (var z=-this.G_LIMIT; z<=this.G_LIMIT; z++) {
                    var countx = 0;
                    for (var k=0; k<this.G_LIMIT*3; k++) {
                        var key = KEY(x+k, y, z);
                        if (!key || !this.get(key)) {
                            break;
                        }
                        else {
                            countx += 1;
                        }
                    }
                    var county = 0;
                    for (var k=0; k<this.G_LIMIT*3; k++) {
                        var key = KEY(x, y+k, z);
                        if (!key || !this.get(key)) {
                            break;
                        }
                        else {
                            county += 1;
                        }
                    }
                    var countz = 0;
                    for (var k=0; k<this.G_LIMIT*3; k++) {
                        var key = KEY(x, y, z+k);
                        if (!key || !this.get(key)) {
                            break;
                        }
                        else {
                            countz += 1;
                        }
                    }
                    var scount = 0;
                    if (countx >= this.LINE) {
                        for (var k=0; k<countx; k++) {
                            var key = KEY(x+k, y, z);
                            this.destroy(key);
                        }
                        scount += countx;
                    }
                    if (county >= this.LINE) {
                        for (var k=0; k<county; k++) {
                            var key = KEY(x, y+k, z);
                            this.destroy(key);
                        }
                        scount += county;
                    }
                    if (countz >= this.LINE) {
                        for (var k=0; k<countz; k++) {
                            var key = KEY(x, y, k+z);
                            this.destroy(key);
                        }
                        scount += countz;
                    }
                    if (scount > 0) {
                        this.score += ((scount - this.LINE) + 1) * 1000;
                    }
                }
            }
        }        
        for (var x=-this.G_LIMIT; x<=this.G_LIMIT; x++) {
            for (var y=-this.G_LIMIT; y<=this.G_LIMIT; y++) {
                for (var z=-this.G_LIMIT; z<=this.G_LIMIT; z++) {
                    if (this.get(KEY(x,y,z)) && !this.get(KEY(x-1, y, z)) && !this.get(KEY(x+1, y, z))
                                             && !this.get(KEY(x, y-1, z)) && !this.get(KEY(x, y+1, z))
                                             && !this.get(KEY(x, y, z-1)) && !this.get(KEY(x, y, z+1))) {
                        this.score += 500;
                        this.destroy(KEY(x,y,z));
                    }
                }
            }
        }
    }

    this.createDropper = function(x, y, z, n, clr) {
        var key = KEY(x, y, z);
        if (!key || this.get(key) > 0) {
            return false;
        }
        this.set(key, clr);
        var valid = n <= 1, k=100;
        while (!valid && (k--) > 0) {
            var r = Math.random();
            if (r < (1/6)) {
                valid = valid || this.createDropper(x-1,y,z, n-1, clr);
            }
            else if (r < (2/6)) {
                valid = valid || this.createDropper(x+1,y,z, n-1, clr);
            }
            else if (r < (3/6)) {
                valid = valid || this.createDropper(x,y-1,z, n-1, clr);
            }
            else if (r < (4/6)) {
                valid = valid || this.createDropper(x,y+1,z, n-1, clr);
            }
            else if (r < (5/6)) {
                valid = valid || this.createDropper(x,y,z-1, n-1, clr);
            }
            else {
                valid = valid || this.createDropper(x,y,z+1, n-1, clr);
            }
        }
        if (!valid) {
            this.set(key, 0);
        }
        else {
            this.setD(key, true);
        }
        return valid;
    };

    this.dScore = this.score = 0;

    this.soundOn = false;

    this.init = function() {
        this.dScore = this.score = 0;
        this.bClicked = -1;
        if (!this.clickHandler) {
            this.clickHandler = function(e){
                if (!this.soundOn) {
                    OC.sound.play(31, .2, 5, 0);
                    this.soundOn = true;
                }
                if (e.type === 'touchstart') {
                    var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
                    e.pageX = touch.pageX;
                    e.pageY = touch.pageY;
                }
                this.bClicked = -1;
                for (var i=0; i<this.buttons.length; i++) {
                    var B = this.buttons[i];
                    var x = B.x - B.size * 0.5;
                    var y = B.y - B.size * 0.5;
                    if (e.pageX >= x && e.pageY >= y && e.pageX <= (x + B.size) && e.pageY <= (y + B.size)) {
                        this.bClicked = i;
                        break;
                    }
                }
                e.preventDefault();
                return false;
            }.bind(this);
            $(OC.render.c2d).on('touchstart', this.clickHandler);
            $(OC.render.c2d).on('mousedown', this.clickHandler);
        }
        if (!this.cubeGeom) {
            this.cubeGeom = new THREE.BoxBufferGeometry( 0.9, 0.9, 0.9 );
        }
        if (!this.underMat) {
            this.underMat = new THREE.MeshPhongMaterial({
              color      : new THREE.Color("rgb(255,255,255)"),
              emissive   : new THREE.Color("rgb(255,255,255)"),
              specular   : new THREE.Color("rgb(255,255,255)"),
              shininess  : 5,
              shading    : THREE.SmoothShading
            });
        }
        if (!this.cubeMats) {
            this.cubeMats = [
                new THREE.MeshPhongMaterial({
                  color      : new THREE.Color("rgb(80,80,80)"),
                  emissive   : new THREE.Color("rgb(32,32,32)"),
                  specular   : new THREE.Color("rgb(255,255,255)"),
                  shininess  : 5,
                  shading    : THREE.SmoothShading
                }),
                new THREE.MeshPhongMaterial({
                  color      : new THREE.Color("rgb(255,0,0)"),
                  emissive   : new THREE.Color("rgb(32,32,32)"),
                  specular   : new THREE.Color("rgb(255,255,255)"),
                  shininess  : 5,
                  shading    : THREE.SmoothShading
                }),
                new THREE.MeshPhongMaterial({
                  color      : new THREE.Color("rgb(0,255,0)"),
                  emissive   : new THREE.Color("rgb(32,32,32)"),
                  specular   : new THREE.Color("rgb(255,255,255)"),
                  shininess  : 5,
                  shading    : THREE.SmoothShading
                }),
                new THREE.MeshPhongMaterial({
                  color      : new THREE.Color("rgb(0,0,255)"),
                  emissive   : new THREE.Color("rgb(32,32,32)"),
                  specular   : new THREE.Color("rgb(255,255,255)"),
                  shininess  : 5,
                  shading    : THREE.SmoothShading
                }),
                new THREE.MeshPhongMaterial({
                  color      : new THREE.Color("rgb(0,255,255)"),
                  emissive   : new THREE.Color("rgb(32,32,32)"),
                  specular   : new THREE.Color("rgb(255,255,255)"),
                  shininess  : 5,
                  shading    : THREE.SmoothShading
                }),
                new THREE.MeshPhongMaterial({
                  color      : new THREE.Color("rgb(255,255,0)"),
                  emissive   : new THREE.Color("rgb(32,32,32)"),
                  specular   : new THREE.Color("rgb(255,255,255)"),
                  shininess  : 5,
                  shading    : THREE.SmoothShading
                })
            ];
        }
        if (!this.images) {
            this.images = {
                right: 'img/right.png',
                left: 'img/left.png',
                up: 'img/up.png',
                down: 'img/down.png',
                rotxy: 'img/rotxy.png',
                rotyz: 'img/rotyz.png',
            };
            for (var key in this.images) {
                var url = this.images[key];
                var img = new Image();
                img.src = url;
                this.images[key] = img;
            }
        }
    };

    this.start = function() {
        this.G_LIMIT = 8;
        this.G_BASE = 1;
        this.LINE = 4;
        this.G_SIZE = 1 + this.G_LIMIT * 2;
        this.D_SIZE = 4;

        this.ORS = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 1)
        ];
        this.ori = 0;
        this.ors = this.ORS[this.ori % this.ORS.length];

        this.initGrid();
        this.init();

        this.drops = null;
        this.score = 0;

        this.playing = true;
        this.lost = false;
    };

    this.drops = null;
    this.lost = false;
    this.drop = function() {
        this.ori += 1;
        this.ors = this.ORS[Math.floor(this.ori/3) % this.ORS.length];
        if (!this.createDropper(
            Math.floor((1-this.ors.x) * this.G_BASE * Math.random()) + this.ors.x * this.G_LIMIT,
            Math.floor((1-this.ors.y) * this.G_BASE * Math.random()) + this.ors.y * this.G_LIMIT,
            Math.floor((1-this.ors.z) * this.G_BASE * Math.random()) + this.ors.z * this.G_LIMIT,
            this.D_SIZE, 1 + ~~(Math.random()*6)
        )) {
            OC.sound.play(31, .2, 5, 0);
            OC.sound.play(30, .2, 5, 0.75);
            OC.sound.play(29, .2, 5, 1.5);
            OC.sound.play(28, .2, 5, 2.25);
            this.lost = true;
            this.lostTime = Date.timeStamp();
            for (var x=-this.G_LIMIT; x<=this.G_LIMIT; x++) {
                for (var y=-this.G_LIMIT; y<=this.G_LIMIT; y++) {
                    for (var z=-this.G_LIMIT; z<=this.G_LIMIT; z++) {
                        if (this.get(KEY(x, y, z))) {
                            this.destroy(KEY(x, y, z));
                        }
                    }
                }
            }
        };
        this.drops = [];
    };

    this.buttons = [ {}, {}, {}, {}, {}, {} ];

    this.rotatexy = function(x, y, z) {
        x -= this.dbounds[0];
        y -= this.dbounds[2];
        z -= this.dbounds[4];
        var x2 = x, y2 = y, z2 = z;
        if (this.ors.x > 0.5) {
            z2 = (this.dbounds[5]-this.dbounds[4]) - y;
            y2 = z;
        }
        else if (this.ors.y > 0.5) {
            z2 = (this.dbounds[5]-this.dbounds[4]) - x;
            x2 = z;
        }
        else if (this.ors.z > 0.5) {
            y2 = (this.dbounds[3]-this.dbounds[2]) - x;
            x2 = y;
        }
        return [x2 + this.dbounds[0], y2 + this.dbounds[2], z2 + this.dbounds[4]];
    };

    this.rotatezy = function(x, y, z) {
        x -= this.dbounds[0];
        y -= this.dbounds[2];
        z -= this.dbounds[4];
        var x2 = x, y2 = y, z2 = z;
        if (this.ors.y > 0.5) {
            z2 = (this.dbounds[5]-this.dbounds[4]) - y;
            y2 = z;
        }
        else if (this.ors.z > 0.5) {
            z2 = (this.dbounds[5]-this.dbounds[4]) - x;
            x2 = z;
        }
        else if (this.ors.x > 0.5) {
            y2 = (this.dbounds[3]-this.dbounds[2]) - x;
            x2 = y;
        }
        return [x2 + this.dbounds[0], y2 + this.dbounds[2], z2 + this.dbounds[4]];
    };

    this.newFrame = function(ctx, dt) {

        var vpw = OC.render.viewport.x, vph = OC.render.viewport.y;
        var bsize = Math.min(vpw, vph) * 0.175;

        var B = this.buttons[0];
        B.img = this.images.up;
        B.x = vpw - bsize * 1.25;
        B.y = vph - bsize * 1.75 - bsize * 0.25;

        var B = this.buttons[1];
        B.img = this.images.down;
        B.x = vpw - bsize * 1.25;
        B.y = vph - bsize * 0.25 - bsize * 0.25;

        var B = this.buttons[2];
        B.img = this.images.right;
        B.x = vpw - bsize * 0.5;
        B.y = vph - bsize * 1 - bsize * 0.25;

        var B = this.buttons[3];
        B.img = this.images.left;
        B.x = vpw - bsize * 2;
        B.y = vph - bsize * 1 - bsize * 0.25;

        var B = this.buttons[4];
        B.img = this.images.rotxy;
        B.x = bsize * 0.75;
        B.y = vph - bsize * 0.5 - bsize * 0.25;

        var B = this.buttons[5];
        B.img = this.images.rotyz;
        B.x = bsize*2;
        B.y = vph - bsize * 0.5 - bsize * 0.25;

        if (this.bClicked >= 0 && this.bClicked <= 3 && this.drops) {
            var pdir = new THREE.Vector2(0, 0);
            if (this.bClicked === 0) { pdir.x = 0; pdir.y = -1; }
            else if (this.bClicked === 1) { pdir.x = 0; pdir.y = 1; }
            else if (this.bClicked === 3) { pdir.x = -1; pdir.y = 0; }
            else if (this.bClicked === 2) { pdir.x = 1; pdir.y = 0; }
            var dir = new THREE.Vector3(0, 0, 0);
            if (this.ors.x > 0.5) {
                dir.y = -pdir.x;
                dir.z = pdir.y;
            }
            else if (this.ors.y > 0.5) {
                dir.x = pdir.y;
                dir.z = -pdir.x;
            }
            else if (this.ors.z > 0.5) {
                dir.x = -pdir.x;
                dir.y = pdir.y;
            }
            var good = true;
            for (var i=0; i<this.drops.length; i++) {
                var D = this.drops[i];
                var t = D.obj.t || 0;
                var it = Math.floor(D.obj.t || 0);
                var x = D.x-this.ors.x*it, y = D.y-this.ors.y*it, z = D.z-this.ors.z*it;
                var nx = x + dir.x, ny = y + dir.y, nz = z + dir.z;
                var nkey = KEY(nx, ny, nz);
                var obj = this.getM(nkey);
                if (!nkey || (obj && !obj.dropper)) {
                    good = false;
                    break;
                }
            }
            if (good) {
                for (var i=0; i<this.drops.length; i++) {
                    var D = this.drops[i];
                    var t = D.obj.t || 0;
                    var it = Math.floor(D.obj.t || 0);
                    var x = D.x-this.ors.x*it, y = D.y-this.ors.y*it, z = D.z-this.ors.z*it;
                    var nx = x + dir.x, ny = y + dir.y, nz = z + dir.z;
                    this.move(KEY(D.x, D.y, D.z), KEY(nx, ny, nz));
                    D.x = nx; D.y = ny; D.z = nz;
                    D.obj.t = t - it;
                }
                this.finishMove();
            }
        }

        if (this.bClicked >= 4 && this.bClicked <= 5 && this.drops && this.drops.length) {
            var pdir = new THREE.Vector2(0, 0);
            var maxx = -1000, maxy = -1000, maxz = -1000,
                minx =  1000, miny =  1000, minz =  1000;
            for (var i=0; i<this.drops.length; i++) {
                var D = this.drops[i];
                var t = D.obj.t || 0;
                var it = Math.floor(D.obj.t || 0);
                var x = D.x-this.ors.x*it, y = D.y-this.ors.y*it, z = D.z-this.ors.z*it;
                minx = Math.min(minx, x); maxx = Math.max(maxx, x);
                miny = Math.min(miny, y); maxy = Math.max(maxy, y);
                minz = Math.min(minz, z); maxz = Math.max(maxz, z);
            }
            this.dbounds = [
                minx, maxx,
                miny, maxy,
                minz, maxz
            ];
            var good = true;
            for (var i=0; i<this.drops.length; i++) {
                var D = this.drops[i];
                var t = D.obj.t || 0;
                var it = Math.floor(D.obj.t || 0);
                var x = D.x-this.ors.x*it, y = D.y-this.ors.y*it, z = D.z-this.ors.z*it;
                var r;
                if (this.bClicked === 4) {
                    r = this.rotatexy(x, y, z);
                }
                else {
                    r = this.rotatezy(x, y, z);
                }
                var nkey = KEY(r[0], r[1], r[2]);
                var obj = this.getM(nkey);
                if (!KEY(D.x, D.y, D.z) || !nkey || (obj && !obj.dropper)) {
                    good = false;
                    break;
                }   
            }
            if (good) {
                for (var i=0; i<this.drops.length; i++) {
                    var D = this.drops[i];
                    var t = D.obj.t || 0;
                    var it = Math.floor(D.obj.t || 0);
                    var x = D.x-this.ors.x*it, y = D.y-this.ors.y*it, z = D.z-this.ors.z*it;
                    var r;
                    if (this.bClicked === 4) {
                        r = this.rotatexy(x, y, z);
                    }
                    else {
                        r = this.rotatezy(x, y, z);
                    }
                    this.move(KEY(D.x, D.y, D.z), KEY(r[0], r[1], r[2]));
                    D.x = r[0]; D.y = r[1]; D.z = r[2];
                    D.obj.t = t - it;
                }
                this.finishMove();
            }
        }

        this.bClicked = -1;

        for (var i=0; i<this.buttons.length; i++) {
            var B = this.buttons[i];
            B.size = bsize;
            if (B.img && B.img.width && B.img.height) {
                ctx.drawImage(B.img, 0, 0, B.img.width, B.img.height, B.x - bsize * 0.5, B.y - bsize * 0.5, bsize, bsize);
            }
        }

        ctx.font = "15px Arial";
        ctx.fillStyle = "#aaa";
        ctx.textAlign = 'left';
        //  ctx.fillText(Math.floor(1/dt) + "fps " + this.ors.x + ',' + this.ors.y + ',' + this.ors.z, 15, 30);
        ctx.fillText(Math.floor(1/dt) + "fps", 15, 30);

        this.dScore += (this.score - this.dScore) * dt;

        ctx.font = "30px Arial";
        ctx.fillStyle = "#fff";
        ctx.textAlign = 'right';
        ctx.fillText("Score: " + Math.ceil(this.dScore), vpw-15, 15+30);

        for (var x=-this.G_LIMIT; x<=this.G_LIMIT; x++) {
            for (var y=-this.G_LIMIT; y<=this.G_LIMIT; y++) {
                for (var z=-this.G_LIMIT; z<=this.G_LIMIT; z++) {
                    this.updateM(x, y, z, dt);
                }
            }
        }

        this.checkLines();

        for (var x=-this.G_LIMIT; x<=this.G_LIMIT; x++) {
            for (var y=-this.G_LIMIT; y<=this.G_LIMIT; y++) {
                for (var z=-this.G_LIMIT; z<=this.G_LIMIT; z++) {
                    this.checkDrops(x, y, z, dt);
                }
            }
        }

        for (var i=0; i<this.dlist.length; i++) {
            var D = this.dlist[i];
            D.T += dt;
            if (D.T > 1.0) {
                OC.render.scene.remove(D);
                this.dlist.splice(i, 1);
                i --;
                continue;
            }
            else {
                var t = Math.pow(1-D.T, 3.0) + 0.001;
                D.scale.set(t, t, t);
            }
        }

        var cam = OC.render.cam;

        cam.up.set(
            cam.up.x + (this.ors.x - cam.up.x) * dt * 1.5,
            cam.up.y + (this.ors.y - cam.up.y) * dt * 1.5,
            cam.up.z + (this.ors.z - cam.up.z) * dt * 1.5
        );
        cam.lookAt(new Vec3(0, 0, 0));
        cam.updateProjectionMatrix();
        cam.updateMatrix();

        if (!this.drops && !this.shouldCheckLines) {
            this.drop();
        }
        if (this.lost && Date.timeStamp() > (this.lostTime+5)) {
            this.start();
        }

        this.recentDestroy = 0;

    }.bind(this);

};

OC.game = new OC._game();