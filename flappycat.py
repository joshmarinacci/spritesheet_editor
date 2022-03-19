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

cat = Rect(5,5,5,5)

columns = []

for i in range(10):
    h = random.randint(4,20)
    gap = random.randint(8,20)
    columns.append(Rect(80+i*15,0,5,h))
    columns.append(Rect(80+i*15,h+gap,5,40))

count = 0
alive = True
while(alive):
    count = count + 1
    thumby.display.fill(0) # Fill canvas to black
    #thumby.display.drawFilledRectangle(cat.x,cat.y,cat.w,cat.h,1) # draw white rect
    sprite.x = cat.x
    sprite.y = cat.y
    thumby.display.drawSprite(sprite)
    if thumby.buttonA.pressed():
        if count % 2 == 0:
            cat.y = cat.y + 1
    if thumby.buttonB.pressed():
        if count % 2 == 0:
            cat.y = cat.y - 1
    if cat.y < 0:
        cat.y = 0
    if cat.y > 39-5:
        cat.y = 39-5
    if count % 30 == 0:
        sprite.setFrame(sprite.getFrame()+1)
    for c in columns:
        thumby.display.drawFilledRectangle(c.x, c.y, c.w, c.h, 1)
        if count % 10 == 0:
            c.x = c.x - 1
            if c.x < -10:
                c.x = 80
        if c.intersects(cat):
            print("died")
            alive = False

        #    if count % 120 == 0:
        #print("adding column")
        #columns.append(Rect(80,0,5,5))

    thumby.display.update()



thumby.display.fill(0) # Fill canvas to black
thumby.display.drawText("ded",10,10,1)
thumby.display.update()
