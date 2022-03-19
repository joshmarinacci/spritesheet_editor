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

class Cubey:
    def __init__(self, x, y, w, h):
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.dv = 0
        self.alive = True
        self.standing = False

    def intersects(self, rect):
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

class Wall:
    def __init__(self, x, typ):
        self.x = x
        self.y = 40-6
        self.w = 5
        self.h = 5
        self.type = typ

def make_walls(walls):
    walls.append(Wall(50,SPIKE))
    walls.append(Wall(70,BLOCK))
    walls.append(Wall(90,SPIKE))


thumby.display.setFPS(60)

cubey = Cubey(5.0,5.0,5,5)
cubey.alive = True
cubey.dv = 0
gravity = 0.15 # pixels per tick
jump_power = -3 #vertical pixels, single impulse
scroll_speed = 0.4  #pixels per tick

count = 0
floor = thumby.display.height - 5


def draw_cubey(c):
    thumby.display.blit(cubey_bitmap, math.trunc(c.x),math.trunc(c.y),c.w,c.h, -1,0,0)

def draw_wall(c):
    if c.type == SPIKE:
        thumby.display.blit(spike_bitmap, math.trunc(c.x),math.trunc(c.y),c.w,c.h, -1,0,0)
    if c.type == BLOCK:
        thumby.display.blit(block_bitmap, math.trunc(c.x),math.trunc(c.y),c.w,c.h, -1,0,0)

walls = []
make_walls(walls)

while(cubey.alive):
    count = count + 1

    # jump
    if thumby.buttonA.pressed() and cubey.standing:
        cubey.standing = False
        cubey.dv += jump_power

    # apply gravity
    cubey.dv += gravity
    cubey.y += cubey.dv

    # stop at floor
    if cubey.y >= floor:
        cubey.y = floor -1
        cubey.dv = 0
        cubey.standing = True

    # scroll walls
    for wall in walls:
        wall.x -= scroll_speed
        if wall.x < -20:
            wall.x += 100

    thumby.display.fill(1)
    for wall in walls:
        draw_wall(wall)
    draw_cubey(cubey)
    thumby.display.update()

thumby.display.fill(0) # Fill canvas to black
thumby.display.drawText("ded",10,10,1)
thumby.display.update()
