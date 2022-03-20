import time
import thumby
import math
import random

# BITMAP: width: 5, height: 5
spike_bitmap = bytearray([15,3,0,3,15])
# BITMAP: width: 5, height: 5
block_bitmap = bytearray([0,0,4,0,0])
# BITMAP: width: 5, height: 5
cubey_bitmap = bytearray([0,10,8,10,0])

gravity = 0.05 # pixels per tick
jump_power = -1.23 #vertical pixels, single impulse
scroll_speed = 0.5  #pixels per tick

class AABB:
    def __init__(self, x,y,w,h):
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.empty = False

class Cubey:
    def __init__(self, x, y, w, h):
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.dv = 0
        self.alive = True
        self.standing = False

    def reset(self):
        self.alive =  True
        self.dv = 0
        self.x = 5
        self.y = 5

    def draw(self):
        thumby.display.blit(cubey_bitmap, math.trunc(self.x),math.trunc(self.y),self.w,self.h, -1,0,0)

    def check_input(self):
        if thumby.buttonA.pressed() and self.standing:
            self.standing = False
            self.dv += jump_power

    def update(self):
        # apply gravity
        self.dv += gravity
        self.y += self.dv

    def intersects(self, rect):
        if rect.empty:
            return False
        if rect.x + rect.w < self.x:
            return False
        if rect.y + rect.h < self.y:
            return False
        if rect.x > self.x + self.w:
            return False
        if rect.y > self.y + self.h:
            return False
        return True



SPIKE = 5
BLOCK = 6

def draw_rect(rect):
    if rect.empty:
        return
    thumby.display.drawRectangle(math.trunc(rect.x),math.trunc(rect.y),rect.w,rect.h,0)

class Wall:
    def __init__(self, x, typ):
        self.x = x
        self.y = 40-6
        self.w = 5
        self.h = 5
        self.type = typ
        self.collision = AABB(self.x+1,self.y,3,1)
        self.dead = AABB(self.x,self.y+2,4,3)
        if self.type == SPIKE:
            self.collision = AABB(self.x+3,self.y,0,0)
            self.dead = AABB(self.x+1,self.y+2,1,3)
            self.collision.empty = True
    def draw(self):
        bm = spike_bitmap
        if self.type == BLOCK:
            bm = block_bitmap
        thumby.display.blit(bm, math.trunc(self.x),math.trunc(self.y),self.w,self.h, -1,0,0)
        #draw_rect(self.collision)
        #draw_rect(self.dead)
    def update(self):
        self.x -= scroll_speed
        if self.x < -20:
            self.x += 200
        self.collision.x = self.x+1
        self.collision.y = self.y
        self.dead.x = self.x
        self.dead.y = self.y+2



def make_row(walls,str,y):
    for i, ch in enumerate(list(str)):
        if ch == "-":
            continue
        x = 40+i*5
        if ch == "^":
            w = Wall(x,SPIKE)
            w.y = y
            walls.append(w)
        if ch == 'X':
            w = Wall(x,BLOCK)
            w.y = y
            walls.append(w)

# level editor - is air X is block ^ is spike

def make_walls(walls):
    make_row(walls,"-----------------------------------X",19)
    make_row(walls,"------------------------------X----X",24)
    make_row(walls,"-------------------------X----X----X",29)
    make_row(walls,"----^----^----^^----X^^^^X^^^^X^^^^X",34)

thumby.display.setFPS(60)
cubey = Cubey(5.0,5.0,5,5)
count = 0
floor = thumby.display.height - 5

walls = []

# if collision box hit, then push up
# if hurt box hit, then die

def reset_game():
    cubey.reset()
    make_walls(walls)

walls = []
reset_game()

while(cubey.alive):
    count = count + 1

    # jump
    cubey.check_input()
    cubey.update()

    # stop at floor
    if cubey.y >= floor:
        cubey.y = floor -1
        cubey.dv = 0
        cubey.standing = True

    # scroll walls
    for wall in walls:
        wall.update()

    # if cubey hits block from above, stop it there
    for wall in walls:
        if cubey.intersects(wall.collision):
            cubey.y = wall.collision.y-cubey.h
            cubey.dv = 0
            cubey.standing = True
            continue
        if cubey.intersects(wall.dead):
            walls = []
            reset_game()

    thumby.display.fill(1)
    for wall in walls:
        wall.draw()
    cubey.draw()
    thumby.display.update()

thumby.display.fill(0) # Fill canvas to black
thumby.display.drawText("ded",10,10,1)
thumby.display.update()
