import time
import thumby
import math
import random

thumby.display.setFPS(60)
# BITMAP: width: 16, height: 8
bitmap = bytearray([12,144,114,52,56,188,72,0,12,144,120,52,56,188,72,0])
sprite = thumby.Sprite(8, 8, bitmap, 0, 0)

class Rect:
    def __init__(self, x, y, w, h):
        self.x = x
        self.y = y
        self.w = w
        self.h = h
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

cubey = Rect(5.0,5.0,5,5)
cubey.alive = True
cubey.dv = 0.1
gravity = 0.2

count = 0
floor = thumby.display.height - 5

while(cubey.alive):
    count = count + 1

    # apply gravity
    cubey.dv += gravity
    cubey.y += cubey.dv

    # stop at floor
    if cubey.y > floor:
        cubey.y = floor

    # fill screen with white
    thumby.display.fill(1) # Fill canvas to black
    # draw cubey as black rect
    #thumby.display.drawFilledRectangle(math.trunc(cubey.x),math.trunc(cubey.y),cubey.w,cubey.h,0)
    thumby.display.drawFilledRectangle(math.trunc(cubey.x),math.trunc(cubey.y),5,5,0)

    thumby.display.update()

thumby.display.fill(0) # Fill canvas to black
thumby.display.drawText("ded",10,10,1)
thumby.display.update()
